

(function () {
  'use strict';

  const HISTORY_KEY = 'mf_chat_messages';
  const MAX_HISTORY = 60;
  const MAX_PRODUCT_CARDS = 4;

  function rootPrefix() {
    return (window.MarvelShop && window.MarvelShop.rootPrefix) ? window.MarvelShop.rootPrefix() : '';
  }

  function escapeHtml(str) {
    if (window.MarvelShop && window.MarvelShop.escapeHtml) return window.MarvelShop.escapeHtml(str);
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatPrice(amount) {
    if (window.MarvelShop && window.MarvelShop.formatPrice) return window.MarvelShop.formatPrice(amount);
    return '$' + Number(amount).toFixed(2);
  }

  function resolveImageSrc(path) {
    if (!path) return path;
    if (window.MarvelShop && window.MarvelShop.resolveImageSrc) return window.MarvelShop.resolveImageSrc(path);
    return /^https?:\/\//i.test(path) ? path : rootPrefix() + path;
  }

  // Same root-relative-vs-sibling logic used by search.js's productHref.
  function productHref(product) {
    const prefix = rootPrefix();
    const path = prefix === '' ? product.pageUrl : product.pageUrl.replace(/^pages\//, '');
    return path + '#' + encodeURIComponent(product.id);
  }

  function searchResultsUrl(query) {
    const prefix = rootPrefix();
    const path = prefix === '' ? 'pages/search-results.html' : 'search-results.html';
    return path + '?q=' + encodeURIComponent(query);
  }

  function normalize(str) {
    return String(str || '').toLowerCase().replace(/['']/g, '').replace(/\s+/g, ' ').trim();
  }


  let catalogPromise = null;
  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch(rootPrefix() + 'data/products.json')
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(err => {
          catalogPromise = null;
          throw err;
        });
    }
    return catalogPromise;
  }

  
  let lorePromise = null;
  function loadLore() {
    if (!lorePromise) {
      lorePromise = fetch(rootPrefix() + 'data/marvel-lore.json')
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(err => {
          lorePromise = null;
          throw err;
        });
    }
    return lorePromise;
  }


  const STOPWORDS = new Set([
    'do', 'does', 'did', 'you', 'have', 'has', 'had', 'any', 'a', 'an', 'the', 'me', 'for',
    'looking', 'show', 'shows', 'find', 'finds', 'search', 'got', 'need', 'needs', 'want',
    'wants', 'some', 'is', 'are', 'was', 'were', 'of', 'on', 'in', 'with', 'please', 'can',
    'could', 'would', 'i', 'to', 'my', 'your', 'about', 'get', 'give', 'see', 'there', 'it',
    'all', 'products', 'product', 'recommend', 'suggest', 'suggestion', 'suggestions',
    'choose', 'pick', 'decide', 'should', 'buy', 'help', 'something', 'anything', 'what', 'whats',
    'sale', 'sales', 'discount', 'discounts', 'deal', 'deals', 'offer', 'offers', 'cheap',
    'cheaper', 'clearance'
  ]);

  function meaningfulTokens(q) {
    return normalize(q).split(' ').filter(t => t && !STOPWORDS.has(t));
  }

  function productHaystack(product) {
    return normalize([product.name, product.heroName, product.category, product.description].join(' '));
  }

  function matchesQuery(product, tokens) {
    const hay = productHaystack(product);
    return tokens.every(t => hay.includes(t));
  }

 
  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch (e) { /* storage unavailable — chat still works, just not persisted */ }
  }

  
  function heroList(products) {
    const seen = new Map();
    products.forEach(p => { if (!seen.has(p.hero)) seen.set(p.hero, p.heroName); });
    return Array.from(seen.values());
  }

  function categoryList(products) {
    return Array.from(new Set(products.map(p => p.category)));
  }

  function sizeList(products) {
    const seen = new Set();
    products.forEach(p => (p.sizes || []).forEach(s => seen.add(s)));
    return Array.from(seen);
  }

  function commonDelivery(products) {
    const counts = new Map();
    products.forEach(p => counts.set(p.delivery, (counts.get(p.delivery) || 0) + 1));
    let best = null, bestCount = 0;
    counts.forEach((count, key) => { if (count > bestCount) { best = key; bestCount = count; } });
    return best || '3–5 Business Days';
  }

  function topDiscounted(products, n) {
    return products.slice().sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)).slice(0, n);
  }


  function findBestMatch(rawText, products) {
    const tokens = meaningfulTokens(rawText);
    if (!tokens.length) return null;
    let best = null, bestScore = 0;
    products.forEach(p => {
      const hay = productHaystack(p);
      const score = tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = p; }
    });
    return bestScore > 0 ? best : null;
  }

  function priceLine(p) {
    const final = p.finalPrice != null ? p.finalPrice : p.price;
    if (p.discountPercent) {
      return `${formatPrice(final)} (was ${formatPrice(p.price)}, ${p.discountPercent}% off)`;
    }
    return formatPrice(p.price);
  }

  function stockLine(p) {
    if (p.stock === 'in-stock') return 'in stock and ready to ship';
    if (p.stock === 'out-of-stock') return 'currently out of stock';
    return p.stock ? String(p.stock).replace(/-/g, ' ') : 'stock status unavailable';
  }


  function splitComparisonText(rawText) {
    let parts = rawText.split(/\s+(?:vs\.?|versus)\s+/i);
    if (parts.length < 2) {
      const m = rawText.match(/compare\s+(.+?)\s+(?:and|with|to)\s+(.+)/i);
      if (m) parts = [m[1], m[2]];
    }
    return parts.length >= 2 ? [parts[0], parts.slice(1).join(' ')] : null;
  }

  
  const JOKES = [
    "Why did the Hulk cross the road? Because someone told him not to.",
    "I asked Iron Man for a loan — he said he's a little low on Stark cash right now.",
    "Why don't scientists trust atoms? Because they make up everything.",
    "I'm reading a book about anti-gravity. It's impossible to put down.",
    "Why did Thor bring a ladder to the bar? He heard the drinks were on the house.",
    "What do you call a fish with no eyes? A fsh.",
    "Why did Cap never lose an argument? He always had the last word... and a shield."
  ];

  const GENERAL_INTENTS = [
    {
      test: /\b(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/,
      run: () => ({ text: "Hey there! 👋 I'm the Marvel Fashion Assistant. I can help you find products, check sizing or delivery info, or point you to your cart, wishlist, or orders. What are you looking for?" })
    },
    {
      test: /\b(bye|goodbye|good ?bye|good night|see you( later| soon)?|take care|farewell|catch you later)\b/,
      run: () => ({ text: "Bye for now! 👋 Thanks for stopping by MARVEL FASHION — come back anytime you want to gear up." })
    },
    {
      test: /\b(what('?s| is) your name|who are you)\b/,
      run: () => ({ text: "I'm the MARVEL FASHION Assistant — your in-store guide for finding gear, checking sizes, prices, and orders, plus a bit of Marvel trivia on the side." })
    },
    {
      test: /\b(who (made|created|built|developed) you|who is your creator|your creator)\b/,
      run: () => ({ text: "I was built by the MARVEL FASHION team to help you shop and explore Marvel trivia right here on the site." })
    },
    {
      test: /\b(how are you|how('?re| are) you doing|what'?s up|how'?s it going)\b/,
      run: () => ({ text: "I'm doing great, thanks for asking! Ready to help you find some Marvel gear — what are you in the mood for?" })
    },
    {
      test: /\b(tell me a joke|got any jokes|know any jokes|make me laugh|something funny)\b/,
      run: () => ({ text: JOKES[Math.floor(Math.random() * JOKES.length)] })
    },
    {
      test: /\b(thank|thanks|thx|appreciate)\b/,
      run: () => ({ text: "You're welcome! Let me know if there's anything else I can help you find." })
    },
    {
      test: /\b(what can you do|help me|can you help|assist|capabilities)\b/,
      run: () => ({ text: "I can help with:\n• Finding products by hero, category, or keyword\n• Prices, discounts, and stock availability\n• Sizing and delivery info\n• Featured picks, new arrivals, and best-sellers\n• Recommendations and product comparisons\n• Cart, wishlist, and checkout questions\n• Order tracking, returns, and store policies\n• Marvel characters, teams, powers, Infinity Stones, movie order, and trivia\n• General chat — greetings, jokes, small talk, and simple questions\n• Anything else — I'll do my best with general knowledge too\n\nJust ask me something, like \"Show me Iron Man hoodies\", \"What's on sale?\", or \"Who is stronger, Hulk or Thor?\"." })
    }
  ];


  const STORE_INTENTS = [
    {
      test: /\b(returns?|refunds?|exchanges?)\b/,
      run: () => ({ text: "Items can be returned or exchanged within 30 days of delivery, as long as tags are still attached. Head to My Orders and select the order you'd like to return — or I can take you there now." , suggestLink: { label: 'Go to My Orders', hrefRoot: 'pages/orders.html' } })
    },
    {
      test: /\b(track(ing)?|where is my order|order status|my orders?)\b/,
      run: () => ({ text: "You can see the status of every order — placed, shipped, or delivered — on your Orders page.", suggestLink: { label: 'View My Orders', hrefRoot: 'pages/orders.html' } })
    },
    {
      test: /\b(sizes?|sizing|fits?|measurements?)\b/,
      run: (products) => ({ text: `Most items come in sizes ${sizeList(products).join(', ')}. You can pick your size right on each product card before adding it to your cart. If something's between sizes, we generally recommend sizing up for a relaxed, streetwear fit.` })
    },
    {
      test: /\b(deliver(y|ies)?|shipping|ships?|how long)\b/,
      run: (products) => ({ text: `Standard delivery is ${commonDelivery(products)} for most items — you'll see the exact estimate on each product page before you buy.` })
    },
    {
      test: /\b(carts?|checkout|buy now)\b/,
      run: () => ({ text: "Add items to your cart from any product card with the \"Add To Cart\" button, or use \"Buy Now\" to jump straight to checkout. You can review everything — sizes, quantities, totals — on your cart page.", suggestLink: { label: 'Go to Cart', hrefRoot: 'pages/cart.html' } })
    },
    {
      test: /\b(wishlists?|favou?rites?|save for later)\b/,
      run: () => ({ text: "Tap the heart icon on any product to save it to your wishlist — you can find everything you've saved on your wishlist page.", suggestLink: { label: 'Go to Wishlist', hrefRoot: 'pages/wishlist.html' } })
    },
    {
      test: /\b(dark mode|light mode|theme)\b/,
      run: () => ({ text: "You can switch between light and dark mode any time using the sun/moon toggle in the navbar (or in the mobile menu on smaller screens)." })
    },
    {
      test: /\b(discounts?|sales?|deals?|offers?|cheap(er)?|clearance)\b/,
      run: (products, rawText) => {
        const tokens = meaningfulTokens(rawText);
        let pool = products;
        if (tokens.length) {
          const scoped = products.filter(p => matchesQuery(p, tokens));
          if (scoped.length) pool = scoped;
        }
        const picks = topDiscounted(pool, 3).filter(p => (p.discountPercent || 0) > 0);
        if (!picks.length) return { text: "I don't see any active sale items matching that right now, but check back soon — drops rotate often!" };
        return { text: "Here's what's discounted the most right now:", products: picks };
      }
    },
    {
      test: /\b(contact|humans?|real person|support team|customer service)\b/,
      run: () => ({ text: "For anything I can't help with, you'll find contact details in the footer at the bottom of the page — or use the Contact link in the navbar." })
    },
    {
      test: /\b(which heroes|what heroes|heroes do you have|hero (line|collection)s?)\b/,
      run: (products) => ({ text: `We currently carry: ${heroList(products).join(', ')}.` })
    },
    {
      test: /\b(categories|category|what do you sell|products do you have|what can i buy)\b/,
      run: (products) => ({ text: `Our categories are: ${categoryList(products).join(', ')}. Tell me a hero or category and I'll show you what we've got.` })
    },
    {
      test: /\b(price|prices|cost|costs|how much)\b/,
      run: (products, rawText) => {
        const match = findBestMatch(rawText, products);
        if (match) return { text: `${match.name} is ${priceLine(match)}.`, products: [match] };
        const values = products.map(p => p.finalPrice != null ? p.finalPrice : p.price);
        return { text: `Prices across the store range from ${formatPrice(Math.min(...values))} to ${formatPrice(Math.max(...values))}, depending on the item and any active discounts. Tell me a specific product, hero, or category and I'll give you the exact price.` };
      }
    },
    {
      test: /\b(in stock|out of stock|sold out|stock status|availab(le|ility))\b/,
      run: (products, rawText) => {
        const match = findBestMatch(rawText, products);
        if (match) return { text: `${match.name} is ${stockLine(match)}.`, products: [match] };
        const outOfStock = products.filter(p => p.stock && p.stock !== 'in-stock').length;
        return { text: outOfStock ? "Most items are in stock — a small number are temporarily unavailable. Tell me a specific product and I'll check it for you." : "Everything in the store is currently in stock!" };
      }
    },
    {
      test: /\b(featured|spotlight(ed)?|highlighted)\b/,
      run: (products) => {
        const picks = products.filter(p => p.featured).slice(0, MAX_PRODUCT_CARDS);
        if (!picks.length) return { text: "Nothing is specifically flagged as featured right now — want to see what's new or on sale instead?" };
        return { text: "Here are some of our featured picks:", products: picks };
      }
    },
    {
      test: /\b(new arrivals?|just dropped|newest (drop|items?|products?)|what'?s new|latest (drop|arrivals?))\b/,
      run: (products) => {
        const picks = products.filter(p => p.newArrival).slice(0, MAX_PRODUCT_CARDS);
        if (!picks.length) return { text: "Nothing is flagged as a brand-new arrival just this moment — check back soon, drops rotate often!" };
        return { text: "Here's what's new in the store:", products: picks };
      }
    },
    {
      test: /\b(best[- ]?sell(ing|ers?)|most popular|top rated|fan favou?rites?)\b/,
      run: (products) => {
        const picks = products.slice()
          .sort((a, b) => ((b.reviewCount || b.reviews || 0) - (a.reviewCount || a.reviews || 0)) || ((b.rating || 0) - (a.rating || 0)))
          .slice(0, MAX_PRODUCT_CARDS);
        return { text: "Our best-selling products right now:", products: picks };
      }
    },
    {
      test: /\b(recommend|suggest(ion)?s?|what should i (get|buy|choose|pick)|help me (choose|pick|decide))\b/,
      run: (products, rawText) => {
        const tokens = meaningfulTokens(rawText);
        let pool = products;
        if (tokens.length) {
          const scoped = products.filter(p => matchesQuery(p, tokens));
          if (scoped.length) pool = scoped;
        }
        const picks = pool.slice()
          .sort((a, b) => ((b.rating || 0) - (a.rating || 0)) || ((b.discountPercent || 0) - (a.discountPercent || 0)))
          .slice(0, MAX_PRODUCT_CARDS);
        if (!picks.length) return { text: "Tell me a hero, category, or vibe you're going for and I'll pick something great for you." };
        return { text: "Based on ratings and current deals, here's what I'd recommend:", products: picks };
      }
    },
    {
      test: /\b(compare|comparison|\bvs\.?\b|versus|difference between|which is better)\b/,
      run: (products, rawText) => {
        const halves = splitComparisonText(rawText);
        if (!halves) return { text: "Tell me two products to compare, like \"Thor Hoodie vs Iron Man Hoodie\" or \"compare Thor Hoodie and Iron Man Jacket\"." };
        const a = findBestMatch(halves[0], products);
        const b = findBestMatch(halves[1], products);
        if (!a || !b || a.id === b.id) {
          return { text: "I couldn't find two distinct products to compare from that — try naming them more specifically, including the hero and category." };
        }
        const cheaper = (a.finalPrice != null ? a.finalPrice : a.price) <= (b.finalPrice != null ? b.finalPrice : b.price) ? a : b;
        const higherRated = (a.rating || 0) >= (b.rating || 0) ? a : b;
        const text = [
          `${a.name}: ${priceLine(a)}, ${a.rating}★, sizes ${(a.sizes || []).join('/')}, ${stockLine(a)}.`,
          `${b.name}: ${priceLine(b)}, ${b.rating}★, sizes ${(b.sizes || []).join('/')}, ${stockLine(b)}.`,
          `${cheaper.name} is the better value on price, and ${higherRated.name} has the higher rating.`
        ].join('\n');
        return { text, products: [a, b] };
      }
    },
    {
      test: /\b(polic(y|ies)|terms|store rules)\b/,
      run: (products) => ({ text: `Quick policy summary: standard delivery is ${commonDelivery(products)}, and items can be returned or exchanged within 30 days of delivery as long as tags are still attached. Ask me specifically about returns or shipping for more detail.` })
    }
  ];


  function normalizeLoreText(str) {
    return normalize(str).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function findAllCharacterMatches(rawText, lore) {
    if (!lore || !lore.characters) return [];
    const normalized = normalizeLoreText(rawText);
    const hits = [];
    lore.characters.forEach(c => {
      const alias = (c.aliases || []).find(a => normalized.includes(normalizeLoreText(a)));
      if (alias) hits.push({ character: c, index: normalized.indexOf(normalizeLoreText(alias)) });
    });
    hits.sort((a, b) => a.index - b.index);
    const seen = new Set();
    const ordered = [];
    hits.forEach(h => {
      if (!seen.has(h.character.id)) { seen.add(h.character.id); ordered.push(h.character); }
    });
    return ordered;
  }

  function findCharacter(rawText, lore) {
    const matches = findAllCharacterMatches(rawText, lore);
    return matches.length ? matches[0] : null;
  }

  function findTeam(rawText, lore) {
    if (!lore || !lore.teams) return null;
    const normalized = normalizeLoreText(rawText);
    return lore.teams.find(t => (t.aliases || []).some(a => normalized.includes(normalizeLoreText(a)))) || null;
  }

  function findInfinityStone(rawText, lore) {
    if (!lore || !lore.infinityStones) return null;
    const normalized = normalizeLoreText(rawText);
    return lore.infinityStones.find(s =>
      normalized.includes(normalizeLoreText(s.name)) || normalized.includes(normalizeLoreText(s.color + ' stone'))
    ) || null;
  }

  const POWER_COMPARISON_RE = /\b(who('?s| is) (the )?(stronger|strongest|faster|fastest|smarter|smartest|tougher|toughest|more powerful|most powerful|better fighter)|who would win|who wins (a fight|in a fight)?|which (hero|character) is (stronger|faster|more powerful|better)|power level)\b/;
  const INFINITY_STONES_RE = /\b(infinity stones?|infinity gems?)\b/;
  const MOVIE_ORDER_RE = /\b(movie order|watch order|which (marvel )?movie( s)? should i watch|what order (should i|to) watch|where (do|should) i start( watching)?|first (marvel )?movie to watch|release order|chronological order)\b/;
  const TIMELINE_RE = /\b(mcu timeline|timeline|what phase|which phase|phases?)\b/;
  const TRIVIA_RE = /\b(trivia|fun fact|random fact|did you know|tell me a fact)\b/;

  function characterAnswer(character, normalized) {
    if (/\b(power|powers|abilit(y|ies)|can (he|she|they) do)\b/.test(normalized)) {
      return { text: `${character.name}'s powers: ${character.powers}` };
    }
    if (/\b(origin|backstory|how did .*(get|gain)|history)\b/.test(normalized)) {
      return { text: `${character.name}'s origin: ${character.origin}` };
    }
    if (TRIVIA_RE.test(normalized)) {
      return { text: character.trivia };
    }
    const nameLine = character.realName && character.realName !== character.name
      ? `${character.name} (${character.realName})`
      : character.name;
    const teamNote = character.teams && character.teams.length ? ` Part of the ${character.teams.join(' / ')}.` : '';
    return { text: `${nameLine}: ${character.origin}\n\nPowers: ${character.powers}${teamNote}` };
  }

  function tryPowerComparison(rawText, normalized, lore) {
    if (!lore || !POWER_COMPARISON_RE.test(normalized)) return null;
    const chars = findAllCharacterMatches(rawText, lore);
    if (chars.length < 2) {
      return { text: "Tell me which two characters you'd like me to compare — for example, \"who's stronger, Hulk or Thor?\"" };
    }
    const [a, b] = chars;
    const winner = (a.powerTier || 0) >= (b.powerTier || 0) ? a : b;
    const loser = winner === a ? b : a;
    const text = [
      `${a.name}: ${a.powers}`,
      `${b.name}: ${b.powers}`,
      `Going by raw power, ${winner.name} generally has the edge over ${loser.name} — though comic book power levels are famously inconsistent and depend a lot on the story, so fans debate this constantly!`
    ].join('\n\n');
    return { text };
  }

  function tryMarvelLore(rawText, normalized, lore) {
    if (!lore) return null;

    if (INFINITY_STONES_RE.test(normalized)) {
      const stone = findInfinityStone(rawText, lore);
      if (stone) return { text: `${stone.name} (${stone.color}): ${stone.power}` };
      const all = (lore.infinityStones || []).map(s => `${s.name} (${s.color}) — ${s.power}`).join('\n');
      return { text: `There are six Infinity Stones:\n${all}` };
    }

    const team = findTeam(rawText, lore);
    if (team) {
      return { text: `${team.name}: ${team.summary}\n\nNotable members: ${(team.notableMembers || []).join(', ')}.` };
    }

    if (MOVIE_ORDER_RE.test(normalized) && lore.movieOrder) {
      return { text: `${lore.movieOrder.summary}\n\n${lore.movieOrder.recommendedFirst}` };
    }

    if (TIMELINE_RE.test(normalized) && lore.movieOrder && lore.movieOrder.phaseOverview) {
      return { text: lore.movieOrder.phaseOverview.join('\n\n') };
    }

    if (TRIVIA_RE.test(normalized) && lore.trivia && lore.trivia.length) {
      const pick = lore.trivia[Math.floor(Math.random() * lore.trivia.length)];
      return { text: `Here's a Marvel fun fact: ${pick}` };
    }

    const character = findCharacter(rawText, lore);
    if (character) return characterAnswer(character, normalized);

    return null;
  }

  function tryProductSearch(rawText, products) {
    const tokens = meaningfulTokens(rawText);
    if (!tokens.length) return null;
    const results = products.filter(p => matchesQuery(p, tokens));
    if (!results.length) return null;

    
    const moreQuery = (tokens.length === 1 && results.length > MAX_PRODUCT_CARDS)
      ? rawText.trim()
      : null;

    return {
      text: results.length === 1
        ? `I found 1 match for "${rawText.trim()}":`
        : `I found ${results.length} matches for "${rawText.trim()}"${results.length > MAX_PRODUCT_CARDS ? ` — here are the top ${MAX_PRODUCT_CARDS}` : ''}:`,
      products: results.slice(0, MAX_PRODUCT_CARDS),
      moreQuery
    };
  }

  function buildAnswer(rawText, products, lore, history) {
    const normalized = normalize(rawText);

    for (const intent of STORE_INTENTS) {
      if (intent.test.test(normalized)) return intent.run(products, rawText);
    }
    const looksLikeProductQuery = /\b(show|find|search|looking for|do you have|got any|need a|want a)\b/.test(normalized) ||
      heroList(products).some(h => normalized.includes(normalize(h))) ||
      categoryList(products).some(c => normalized.includes(normalize(c)));
    if (looksLikeProductQuery) {
      const result = tryProductSearch(rawText, products);
      if (result) return result;
    }


    const powerComparison = tryPowerComparison(rawText, normalized, lore);
    if (powerComparison) return powerComparison;

    const loreAnswer = tryMarvelLore(rawText, normalized, lore);
    if (loreAnswer) return loreAnswer;

    for (const intent of GENERAL_INTENTS) {
      if (intent.test.test(normalized)) return intent.run(products, rawText);
    }

    
    return askGeneralAssistant(rawText, history);
  }

  
  const GENERAL_SYSTEM_PROMPT = `You are the AI assistant embedded in the MARVEL FASHION online store (superhero-themed streetwear: hoodies, jackets, sneakers, caps, accessories). Store-catalog questions (products, prices, sizing, delivery, cart/wishlist/orders) and core Marvel-character lore have already been answered elsewhere before a question ever reaches you, so treat yourself as a full general-purpose assistant for everything else — not a narrow store bot.

You should be comfortable helping with, among other things: science, mathematics, programming and technology, history, geography, space, business and finance, sports, movies, TV shows, anime, music, books, education, general health & fitness information, travel, cooking, general conversation, creative writing, brainstorming, jokes and fun facts, coding help, career advice, interview preparation, language translation, grammar correction, summarization, email writing, and content writing. If provided, up-to-date web search results appear below your instructions — use them for news, current events, weather, prices, scores, or anything else that changes over time or postdates your training.

Behave like a normal, capable AI assistant (similar to ChatGPT): answer naturally and conversationally, and maintain the thread of the conversation using the message history you're given. Keep replies reasonably concise (a few sentences, or a short list for step-by-step things) unless the question clearly calls for more depth.

Never say "I don't know" and stop there — always give your best, honest, helpful answer using your knowledge (and the search results below, when present). Only flag uncertainty briefly when a question genuinely depends on information you don't have and no search results were available for it, and even then still offer whatever relevant general knowledge or next step you can.`;

 
  const LIVE_INFO_PATTERN = /\b(today|tonight|tomorrow|yesterday|this week|this month|this year|right now|currently|current|latest|recent|breaking|live score|score|weather|forecast|temperature|news|headline|stock price|exchange rate|election|score of|who won|release date|coming out|box office)\b/i;

  function needsLiveInfo(rawText) {
    return LIVE_INFO_PATTERN.test(rawText);
  }

  
  async function searchWeb(query) {
    const cfg = window.MARVEL_CHATBOT_CONFIG || {};
    if (!cfg.searchApiKey || cfg.searchApiKey === 'YOUR_TAVILY_API_KEY_HERE') return null;

    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: cfg.searchApiKey,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5
        })
      });
      if (!res.ok) throw new Error('http-' + res.status);
      const data = await res.json();

      const parts = [];
      if (data.answer) parts.push(data.answer);
      (data.results || []).slice(0, 5).forEach(r => {
        if (r && r.content) parts.push(`- ${r.title}: ${r.content}`);
      });
      return parts.length ? parts.join('\n') : null;
    } catch (err) {
      return null; 
    }
  }

  async function askGeneralAssistant(rawText, history) {
    const cfg = window.MARVEL_CHATBOT_CONFIG || {};
    if (!cfg.apiKey || cfg.apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
      return {
        text: "That's outside what I can answer locally, and the store owner hasn't connected an AI key yet for general questions. (Add one in js/chatbot-config.js — get a key at console.anthropic.com.) In the meantime, I'm happy to help with MARVEL FASHION products or Marvel trivia!"
      };
    }

    let system = GENERAL_SYSTEM_PROMPT;
    if (needsLiveInfo(rawText)) {
      const searchResults = await searchWeb(rawText);
      if (searchResults) {
        system += `\n\nUp-to-date web search results for the current question:\n${searchResults}`;
      } else if (!cfg.searchApiKey || cfg.searchApiKey === 'YOUR_TAVILY_API_KEY_HERE') {
        system += `\n\nNote: this question looks like it needs live/current information, but no web search is connected (js/chatbot-config.js). Say so briefly, then still help with whatever you can from general knowledge.`;
      }
    }

    
    const priorTurns = (history || [])
      .filter(m => m && m.text && (m.role === 'user' || m.role === 'bot'))
      .slice(-12)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: cfg.model || 'claude-sonnet-5',
          max_tokens: 600,
          system,
          messages: [...priorTurns, { role: 'user', content: rawText }]
        })
      });

      if (!res.ok) throw new Error('http-' + res.status);
      const data = await res.json();
      const text = (data.content || [])
        .map(block => (block && block.type === 'text') ? block.text : '')
        .filter(Boolean)
        .join('\n')
        .trim();

      return { text: text || "I couldn't quite come up with an answer for that — could you try rephrasing?" };
    } catch (err) {
      return { text: "I couldn't reach the AI assistant just now (connection issue). Please try again in a moment — or ask me about MARVEL FASHION products or Marvel trivia in the meantime!" };
    }
  }



  /* =====================================================================
     UI
     ===================================================================== */
  const ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 18.5V6.8C4 5.25 5.25 4 6.8 4h10.4C18.75 4 20 5.25 20 6.8v7.4c0 1.55-1.25 2.8-2.8 2.8H8.5L4 21v-2.5Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.5 12 20 4.5 13 12l7 7.5L4.5 12Z"/></svg>'
  };

  function buildShellHtml() {
    return `
      <button type="button" class="mf-chat-bubble" id="mfChatBubble" aria-label="Open chat assistant" aria-expanded="false">
        <span class="mf-chat-bubble-icon mf-chat-bubble-icon--open">${ICONS.chat}</span>
        <span class="mf-chat-bubble-icon mf-chat-bubble-icon--close">${ICONS.close}</span>
      </button>
      <section class="mf-chat-panel" id="mfChatPanel" role="dialog" aria-label="Marvel Fashion chat assistant" aria-hidden="true">
        <header class="mf-chat-header" id="mfChatHeaderBar">
          <div class="mf-chat-header-info">
            <span class="mf-chat-avatar">MF</span>
            <div class="mf-chat-header-text">
              <p class="mf-chat-title">Marvel Fashion Assistant</p>
              <p class="mf-chat-subtitle"><span class="mf-chat-status-dot"></span>Online</p>
            </div>
          </div>
          <div class="mf-chat-header-actions">
            <button type="button" class="mf-chat-icon-btn" id="mfChatClear" aria-label="Clear chat" title="Clear chat">${ICONS.trash}</button>
            <button type="button" class="mf-chat-icon-btn" id="mfChatMinimize" aria-label="Minimize chat" title="Minimize">${ICONS.minimize}</button>
            <button type="button" class="mf-chat-icon-btn" id="mfChatClose" aria-label="Close chat" title="Close">${ICONS.close}</button>
          </div>
        </header>
        <div class="mf-chat-messages" id="mfChatMessages" aria-live="polite"></div>
        <form class="mf-chat-input-row" id="mfChatForm">
          <textarea class="mf-chat-input" id="mfChatInput" placeholder="Ask about products or Marvel trivia…" rows="1" aria-label="Type a message" maxlength="500"></textarea>
          <button type="submit" class="mf-chat-send" id="mfChatSend" aria-label="Send message">${ICONS.send}</button>
        </form>
      </section>`;
  }

  function formatTime(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function productCardHtml(product) {
    const media = product.image
      ? `<img src="${resolveImageSrc(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">`
      : `<span class="mf-chat-card-placeholder">${escapeHtml((product.heroName || '').slice(0, 2).toUpperCase())}</span>`;
    return `
      <a class="mf-chat-product-card" href="${productHref(product)}">
        <span class="mf-chat-product-media">${media}</span>
        <span class="mf-chat-product-info">
          <span class="mf-chat-product-name">${escapeHtml(product.name)}</span>
          <span class="mf-chat-product-meta">${escapeHtml(product.heroName)} · ${escapeHtml(product.category)}</span>
        </span>
        <span class="mf-chat-product-price">${formatPrice(product.finalPrice != null ? product.finalPrice : product.price)}</span>
      </a>`;
  }

  function messageBubbleHtml(msg) {
    const who = msg.role === 'user' ? 'mf-msg--user' : 'mf-msg--bot';
    const avatar = msg.role === 'bot' ? '<span class="mf-chat-avatar mf-chat-avatar--sm">MF</span>' : '';
    const textHtml = escapeHtml(msg.text).replace(/\n/g, '<br>');
    let extra = '';
    if (msg.products && msg.products.length) {
      extra += `<div class="mf-chat-product-list">${msg.products.map(productCardHtml).join('')}</div>`;
    }
    if (msg.moreQuery) {
      extra += `<a class="mf-chat-viewall" href="${searchResultsUrl(msg.moreQuery)}">View All Results</a>`;
    }
    if (msg.suggestLink) {
      extra += `<a class="mf-chat-viewall" href="${rootPrefix() + msg.suggestLink.hrefRoot}">${escapeHtml(msg.suggestLink.label)}</a>`;
    }
    return `
      <div class="mf-msg ${who}">
        ${avatar}
        <div class="mf-msg-bubble-wrap">
          <div class="mf-msg-bubble">${textHtml}${extra}</div>
          <span class="mf-msg-time">${formatTime(msg.time)}</span>
        </div>
      </div>`;
  }

  function typingHtml() {
    return `
      <div class="mf-msg mf-msg--bot mf-msg--typing" id="mfChatTypingRow">
        <span class="mf-chat-avatar mf-chat-avatar--sm">MF</span>
        <div class="mf-msg-bubble-wrap">
          <div class="mf-msg-bubble mf-typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
  }

  const WELCOME_MSG = {
    role: 'bot',
    text: "Hi! I'm the Marvel Fashion Assistant 🕷️. Ask me to find a product, or ask about sizing, delivery, your cart, wishlist, or orders — or ask me about Marvel itself, like \"Who is Iron Man?\" or \"Who is stronger, Hulk or Thor?\"",
    time: null
  };

  const QUICK_REPLIES = ['Show Spider-Man hoodies', "What's on sale?", 'Who is stronger, Hulk or Thor?', 'What are the Infinity Stones?'];

  function initChatbot() {
    const root = document.getElementById('mfChatbot');
    if (!root) return;
    root.innerHTML = buildShellHtml();

    const bubble = document.getElementById('mfChatBubble');
    const panel = document.getElementById('mfChatPanel');
    const headerBar = document.getElementById('mfChatHeaderBar');
    const closeBtn = document.getElementById('mfChatClose');
    const minimizeBtn = document.getElementById('mfChatMinimize');
    const clearBtn = document.getElementById('mfChatClear');
    const messagesEl = document.getElementById('mfChatMessages');
    const form = document.getElementById('mfChatForm');
    const input = document.getElementById('mfChatInput');

    let messages = loadHistory();
    let isOpen = false;
    let isMinimized = false;

    function scrollToBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderMessages() {
      const list = messages.length ? messages : [WELCOME_MSG];
      messagesEl.innerHTML = list.map(messageBubbleHtml).join('') +
        (messages.length ? '' : quickRepliesHtml());
      wireQuickReplies();
      scrollToBottom();
    }

    function quickRepliesHtml() {
      return `<div class="mf-chat-quick-replies">${QUICK_REPLIES.map(q => `<button type="button" class="mf-chat-quick-reply">${escapeHtml(q)}</button>`).join('')}</div>`;
    }

    function wireQuickReplies() {
      messagesEl.querySelectorAll('.mf-chat-quick-reply').forEach(btn => {
        btn.addEventListener('click', () => sendMessage(btn.textContent));
      });
    }

    function setOpen(open) {
      isOpen = open;
      bubble.setAttribute('aria-expanded', String(open));
      panel.setAttribute('aria-hidden', String(!open));
      panel.classList.toggle('is-open', open);
      root.classList.toggle('mf-chatbot--open', open);
      if (open) {
        isMinimized = false;
        panel.classList.remove('is-minimized');
        renderMessages();
        setTimeout(() => input && input.focus(), 260);
      }
    }

    function setMinimized(min) {
      isMinimized = min;
      panel.classList.toggle('is-minimized', min);
    }

    bubble.addEventListener('click', () => setOpen(!isOpen));
    closeBtn.addEventListener('click', () => setOpen(false));
    minimizeBtn.addEventListener('click', () => setMinimized(!isMinimized));
    headerBar.addEventListener('click', (e) => {
      if (isMinimized && !e.target.closest('.mf-chat-header-actions')) setMinimized(false);
    });

    clearBtn.addEventListener('click', () => {
      messages = [];
      saveHistory(messages);
      renderMessages();
    });

    function pushMessage(msg) {
      messages.push(Object.assign({ time: Date.now() }, msg));
      saveHistory(messages);
    }

    function showTyping() {
      messagesEl.insertAdjacentHTML('beforeend', typingHtml());
      scrollToBottom();
    }

    function hideTyping() {
      const row = document.getElementById('mfChatTypingRow');
      if (row) row.remove();
    }

    function sendMessage(rawText) {
      const text = String(rawText || '').trim();
      if (!text) return;

      pushMessage({ role: 'user', text });
      renderMessages();
      input.value = '';
      autoGrow();

      showTyping();
      const delay = 380 + Math.min(700, text.length * 12);
      setTimeout(() => {
        hideTyping();
        Promise.all([
          loadCatalog(),
          loadLore().catch(() => null) // lore is an enhancement — if it fails, shopping chat still works
        ])
          .then(([products, lore]) => buildAnswer(text, products, lore, messages.slice(0, -1)))
          .catch(() => ({ text: "I couldn't load the product catalog just now — please try again in a moment." }))
          .then(answer => {
            pushMessage(Object.assign({ role: 'bot' }, answer));
            renderMessages();
          });
      }, delay);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    }
    input.addEventListener('input', autoGrow);

    
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
      const observer = new MutationObserver(() => {
        root.classList.toggle('mf-chatbot--suppressed', mobileMenu.classList.contains('open'));
      });
      observer.observe(mobileMenu, { attributes: true, attributeFilter: ['class'] });
    }

    renderMessages();
  }

  document.addEventListener('DOMContentLoaded', initChatbot);
})();
