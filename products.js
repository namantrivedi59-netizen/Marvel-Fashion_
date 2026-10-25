

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     Catalog definition — mirrors generate_pages.py's `heroes` dict.
     ------------------------------------------------------------------ */
  const HEROES = {
    weaver: {
      name: 'Spider-Man',
      tagline: 'Every Street Has A Guardian',
      accentA: '#e8283f',
      accentB: '#1c5cff',
      categories: ['Hoodies', 'T-Shirts', 'Jackets', 'Sneakers', 'Caps', 'Accessories']
    },
    storm: {
      name: 'Thor',
      tagline: 'Power Meets Style',
      accentA: '#4fc3ff',
      accentB: '#c7d0da',
      categories: ['Hoodies', 'T-Shirts', 'Jackets', 'Sweatshirts', 'Shoes', 'Accessories']
    },
    forge: {
      name: 'Iron Man',
      tagline: 'Engineered For Greatness',
      accentA: '#d4af37',
      accentB: '#ff4d2e',
      categories: ['Hoodies', 'T-Shirts', 'Jackets', 'Shoes', 'Watches', 'Accessories']
    },
    sentinel: {
      name: 'Captain America',
      tagline: 'Stand For Something',
      accentA: '#2f5fa8',
      accentB: '#c8272c',
      categories: ['Hoodies', 'Jackets', 'T-Shirts', 'Shoes', 'Caps', 'Accessories']
    },
    king: {
      name: 'Black Panther',
      tagline: 'Royalty Is A Way Of Moving',
      accentA: '#9b4de8',
      accentB: '#c4c8d1',
      categories: ['Oversized T-Shirts', 'Hoodies', 'Jackets', 'Shoes', 'Accessories']
    },
    hulk: {
      name: 'Hulk',
      tagline: 'Strongest There Is',
      accentA: '#4ade80',
      accentB: '#7c3aed',
      categories: ['Hoodies', 'T-Shirts', 'Jackets', 'Shoes', 'Accessories']
    },
    blackwidow: {
      name: 'Black Widow',
      tagline: 'Every Move, Calculated',
      accentA: '#d62246',
      accentB: '#4a4a52',
      categories: ['Hoodies', 'T-Shirts', 'Jackets', 'Shoes', 'Accessories']
    },
    hawkeye: {
      name: 'Hawkeye',
      tagline: 'Never Miss',
      accentA: '#8b5cf6',
      accentB: '#4b5563',
      categories: ['Hoodies', 'T-Shirts', 'Jackets', 'Shoes', 'Accessories']
    }
  };

  const SIZES = ['S', 'M', 'L', 'XL'];

  // Real photographed product images we have on disk, keyed by
  // "hero-categorySlug". Anything not listed here has no photo yet and
  // falls back to the gradient placeholder card (image: null).
  const REAL_IMAGES = {
    'weaver-hoodies': [
      'images/Spiderman_hoodies/spider-hoodie-01.jpg',
      'images/Spiderman_hoodies/spider-hoodie-02.jpg',
      'images/Spiderman_hoodies/spider-hoodie-03.jpg',
      'images/Spiderman_hoodies/spider-hoodie-04.jpg'
    ],
    'weaver-t-shirts': [
      'images/Spiderman_t-shirt/spider t-shit_1.jpg',
      'images/Spiderman_t-shirt/spider t-shit_2.jpg',
      'images/Spiderman_t-shirt/spider t-shit_3.jpg',
      'images/Spiderman_t-shirt/spider t-shit_4.jpg'
    ],
    'weaver-jackets': [
      'images/Spiderman_jackets/spider-jacket-01.jpg',
      'images/Spiderman_jackets/spider-jacket-02.jpg',
      'images/Spiderman_jackets/spider-jacket-03.jpg',
      'images/Spiderman_jackets/spider-jacket-04.jpg'
    ],
    'weaver-sneakers': [
      'images/Spiderman_sneakers/spider-sneaker-01.jpg',
      'images/Spiderman_sneakers/spider-sneaker-02.jpg',
      'images/Spiderman_sneakers/spider-sneaker-03.jpg',
      'images/Spiderman_sneakers/spider-sneaker-04.jpg'
    ],
    'weaver-caps': [
      'images/Spiderman_cap/spider-cap-01.jpg',
      'images/Spiderman_cap/spider-cap-02.jpg',
      'images/Spiderman_cap/spider-cap-03.jpg',
      'images/Spiderman_cap/spider-cap-04.jpg'
    ],
    'weaver-accessories': [
      'images/Spiderman_accessories/spider-accessory-01.jpg',
      'images/Spiderman_accessories/spider-accessory-02.jpg',
      'images/Spiderman_accessories/spider-accessory-03.jpg',
      'images/Spiderman_accessories/spider-accessory-04.jpg'
    ]
  };

  function slugify(text) {
    return text.toLowerCase().replace(/\s+/g, '-');
  }

  function priceFor(categoryName, index) {
    // Mirrors generate_pages.py's price formula exactly.
    const bonus = (/Jacket|Shoes/.test(categoryName)) ? 5 : 0;
    return 39 + index * 6 + bonus;
  }

  // A small, stable hash of a string — same algorithm in Python
  // (sum(ord(c) for c in s)) and here, so discount/rating/stock/delivery
  // always resolve identically whether computed by generate_pages.py at
  // build time or by this file at page-load time.
  function charSum(str) {
    let total = 0;
    for (let i = 0; i < str.length; i++) total += str.charCodeAt(i);
    return total;
  }

  function seedFor(heroKey, categoryName, index) {
    return charSum(heroKey + categoryName) + index;
  }

  function discountFor(heroKey, categoryName, index) {
    const seed = seedFor(heroKey, categoryName, index);
    return 10 + (seed % 4) * 5; // 10, 15, 20 or 25
  }

  function ratingFor(heroKey, categoryName, index) {
    const seed = seedFor(heroKey, categoryName, index);
    const rating = 3.8 + (seed % 13) * 0.1;
    return Math.round(Math.min(5, rating) * 10) / 10;
  }

  function reviewCountFor(heroKey, categoryName, index) {
    const seed = seedFor(heroKey, categoryName, index);
    return 15 + (seed % 380);
  }

  function stockFor(heroKey, categoryName, index) {
    const seed = seedFor(heroKey, categoryName, index);
    const roll = seed % 10;
    if (roll === 0) return 'out-of-stock';
    if (roll <= 2) return 'low-stock';
    return 'in-stock';
  }

  function deliveryFor(categoryName) {
    if (/Jacket|Shoes/.test(categoryName)) return '5–7 Business Days';
    if (/Cap|Watch|Accessor/.test(categoryName)) return '2–4 Business Days';
    return '3–5 Business Days';
  }

  function descriptionFor(heroName, categoryName) {
    return `Premium ${categoryName.toLowerCase()} from the ${heroName} collection. ` +
           `Engineered for everyday wear with a hero-inspired design language, ` +
           `built to move as hard as you do.`;
  }

  /* ---------------------------------------------------------------------
     Build the full catalog once, at load time.
     ------------------------------------------------------------------ */
  const PRODUCTS = [];

  Object.keys(HEROES).forEach(heroKey => {
    const hero = HEROES[heroKey];
    hero.categories.forEach(categoryName => {
      const catSlug = slugify(categoryName);
      const imageKey = `${heroKey}-${catSlug}`;
      const images = REAL_IMAGES[imageKey] || null;

      for (let i = 1; i <= 4; i++) {
        const id = `${heroKey}-${catSlug}-${i}`;
        const price = priceFor(categoryName, i);
        const discountPercent = discountFor(heroKey, categoryName, i);
        const finalPrice = Math.round(price * (100 - discountPercent)) / 100;
        const rating = ratingFor(heroKey, categoryName, i);
        const reviewCount = reviewCountFor(heroKey, categoryName, i);
        const stock = stockFor(heroKey, categoryName, i);
        const image = images ? images[i - 1] : null;
        PRODUCTS.push({
          id,
          index: i,
          hero: heroKey,
          heroName: hero.name,
          category: categoryName,
          categorySlug: catSlug,
          name: `${categoryName} — Edition ${String(i).padStart(2, '0')}`,
          image,
          // Additional gallery view(s) of this exact product, if we have
          // any — currently at most the one photo above, kept as an
          // array so a future multi-angle shoot only needs REAL_IMAGES
          // to grow, no renderer changes.
          galleryImages: image ? [image] : [],
          accentA: hero.accentA,
          accentB: hero.accentB,
          price,
          discountPercent,
          finalPrice,
          // discountPrice / reviews are the same values as finalPrice /
          // reviewCount above, just under the field names used by the
          // new fetch-based product API/service — kept alongside the
          // originals so every existing caller keeps working unchanged.
          discountPrice: finalPrice,
          rating,
          reviewCount,
          reviews: reviewCount,
          stock,
          badge: stock === 'out-of-stock' ? 'Sold Out' : (discountPercent >= 20 ? 'Sale' : (i === 4 ? 'New' : null)),
          featured: i === 1,
          newArrival: i === 4,
          delivery: deliveryFor(categoryName),
          description: descriptionFor(hero.name, categoryName),
          sizes: SIZES,
          pageUrl: `pages/${heroKey}-${catSlug}.html`
        });
      }
    });
  });

  function getAllProducts() { return PRODUCTS.slice(); }
  function getProductById(id) { return PRODUCTS.find(p => p.id === id) || null; }
  function getProductsByHero(heroKey) { return PRODUCTS.filter(p => p.hero === heroKey); }

  window.MarvelProducts = {
    HEROES,
    getAll: getAllProducts,
    getById: getProductById,
    getByHero: getProductsByHero
  };

  /* =======================================================================
     window.MarvelShop — small shared utilities used across the shop
     (wishlist.js, cart.js, checkout.js, payment.js). Centralised here so
     none of those files have to redefine localStorage/toast/format logic.
     ======================================================================= */

  // Product listing pages live one folder deeper (/pages/), so they carry
  // data-root="../" on <body>. Same convention already used by auth.js.
  function rootPrefix() {
    return document.body.getAttribute('data-root') || '';
  }

  // These keys hold per-account data (cart, wishlist, orders, addresses,
  // in-flight checkout state, achievements, profile prefs) and get
  // silently namespaced per logged-in user below. Anything NOT in this
  // list (product cache, UI-only bits) keeps behaving exactly as before.
  // Only mf_buy_now (ephemeral "Buy Now" hand-off) and mf_pending_order
  // (ephemeral checkout draft) are still real per-user localStorage data —
  // cart/wishlist/orders/addresses now live in MySQL. Achievements/theme
  // prefs are intentionally client-only and scoped too, so a guest's
  // toggles never leak into another account.
  const USER_SCOPED_KEYS = [
    'mf_buy_now', 'mf_pending_order', 'mf_achievements',
    'mf_force_reduced_motion', 'mf_email_updates'
  ];

  function currentUserScope() {
    try {
      const user = (window.MarvelAuth && window.MarvelAuth.getCurrentUser) ? window.MarvelAuth.getCurrentUser() : null;
      return user && user.id ? 'u_' + user.id : 'guest';
    } catch (e) {
      return 'guest';
    }
  }

  function scopedKey(key) {
    return USER_SCOPED_KEYS.indexOf(key) === -1 ? key : ('mf_scope_' + currentUserScope() + '__' + key);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(scopedKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(scopedKey(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('MarvelShop: failed to write', key, e);
      return false;
    }
  }

  function removeKey(key) {
    try { localStorage.removeItem(scopedKey(key)); } catch (e) { /* ignore */ }
  }

  function formatPrice(amount) {
    return '$' + Number(amount).toFixed(2);
  }

  // Server order ids are plain auto-increment integers; this recreates the
  // original "MF-XXXXXX" look across orders.js/invoice.js/payment.js
  // without needing an id-format column in the database.
  function formatOrderCode(id) {
    return 'MF-' + String(id).padStart(6, '0');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function showToast(message, type) {
    let toast = document.getElementById('shopToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'shopToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' toast--' + type : '');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // Local product photos are relative ("images/...") and need the
  // page-depth prefix; generated placeholder URLs are already absolute
  // ("https://...") and must be used as-is or the prefix would corrupt them.
  function resolveImageSrc(path) {
    if (!path) return path;
    return /^https?:\/\//i.test(path) ? path : rootPrefix() + path;
  }

  // A product's image can be null (no photo shot yet) — this returns
  // either an <img> tag or a themed placeholder block, ready to insert.
  function productMediaHtml(product, opts) {
    opts = opts || {};
    const extraClass = opts.extraClass || '';
    if (product.image) {
      return `<img src="${resolveImageSrc(product.image)}" alt="${escapeHtml(product.name)}" class="${extraClass}" loading="lazy">`;
    }
    return `<div class="media-placeholder ${extraClass}" style="--accent-a:${product.accentA}; --accent-b:${product.accentB};">
      <span class="placeholder-mark">${escapeHtml(product.heroName.slice(0, 2).toUpperCase())}</span>
    </div>`;
  }

  const STOCK_LABELS = {
    'in-stock': 'In Stock',
    'low-stock': 'Low Stock',
    'out-of-stock': 'Out of Stock'
  };

  function stockLabel(stockKey) {
    return STOCK_LABELS[stockKey] || STOCK_LABELS['in-stock'];
  }

  // Renders whole + half + empty stars for a 0–5 rating, plus review count.
  function ratingHtml(product) {
    const rating = product.rating || 0;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    const stars = '★'.repeat(full) + (half ? '⯨' : '') + '☆'.repeat(empty);
    return `<div class="rating-row" aria-label="${rating} out of 5 stars">
      <span class="rating-stars">${stars}</span>
      <span class="rating-value">${rating.toFixed(1)}</span>
      <span class="rating-count">(${product.reviewCount || 0})</span>
    </div>`;
  }

  function stockBadgeHtml(product) {
    return `<span class="stock-badge stock-badge--${product.stock}">${stockLabel(product.stock)}</span>`;
  }

  function deliveryHtml(product) {
    return `<p class="delivery-note">Estimated delivery: <strong>${escapeHtml(product.delivery)}</strong></p>`;
  }

  // Original price (struck through) + discount badge + final price.
  function priceBlockHtml(product) {
    if (!product.discountPercent) {
      return `<div class="price-block"><span class="price-final">${formatPrice(product.price)}</span></div>`;
    }
    return `<div class="price-block">
      <span class="price-original">${formatPrice(product.price)}</span>
      <span class="price-discount-badge">${product.discountPercent}% OFF</span>
      <span class="price-final">${formatPrice(product.finalPrice)}</span>
    </div>`;
  }

  window.MarvelShop = {
    rootPrefix,
    resolveImageSrc,
    readJSON,
    writeJSON,
    removeKey,
    scopedKey,
    formatPrice,
    formatOrderCode,
    escapeHtml,
    showToast,
    productMediaHtml,
    stockLabel,
    ratingHtml,
    stockBadgeHtml,
    deliveryHtml,
    priceBlockHtml
  };
})();
