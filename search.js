

(function () {
  'use strict';

  const MAX_DROPDOWN_RESULTS = 6;

  let catalogPromise = null;

  function rootPrefix() {
    return (window.MarvelShop && window.MarvelShop.rootPrefix) ? window.MarvelShop.rootPrefix() : '';
  }

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

  function normalize(str) {
    return String(str || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function matchesQuery(product, q) {
    return normalize(product.name).includes(q) ||
      normalize(product.heroName).includes(q) ||
      normalize(product.category).includes(q) ||
      normalize(product.description).includes(q);
  }

  function searchCatalog(products, rawQuery) {
    const q = normalize(rawQuery);
    if (!q) return [];
    return products.filter(p => matchesQuery(p, q));
  }


  function escapeHtml(str) {
    return (window.MarvelShop && window.MarvelShop.escapeHtml) ? window.MarvelShop.escapeHtml(str) : String(str == null ? '' : str);
  }

  function formatPrice(product) {
    if (window.MarvelShop && window.MarvelShop.formatPrice) {
      return window.MarvelShop.formatPrice(product.finalPrice != null ? product.finalPrice : product.price);
    }
    const amount = product.finalPrice != null ? product.finalPrice : product.price;
    return '$' + Number(amount).toFixed(2);
  }

  function resultMediaHtml(product) {
    if (product.image) {
      const src = (window.MarvelShop && window.MarvelShop.resolveImageSrc)
        ? window.MarvelShop.resolveImageSrc(product.image)
        : rootPrefix() + product.image;
      return `<img src="${src}" alt="${escapeHtml(product.name)}" loading="lazy">`;
    }
    return `<span class="placeholder-mark">${escapeHtml((product.heroName || '').slice(0, 2).toUpperCase())}</span>`;
  }

  function productHref(product) {
    const prefix = rootPrefix();
    const path = prefix === '' ? product.pageUrl : product.pageUrl.replace(/^pages\//, '');
    return path + '#' + encodeURIComponent(product.id);
  }

  // Same root-relative-vs-sibling logic for the search results page itself.
  function searchResultsUrl(query) {
    const prefix = rootPrefix();
    const path = prefix === '' ? 'pages/search-results.html' : 'search-results.html';
    return path + '?q=' + encodeURIComponent(query);
  }

  function resultItemHtml(product) {
    return `
      <a class="search-result-item" href="${productHref(product)}" data-product-id="${escapeHtml(product.id)}">
        <span class="search-result-media">${resultMediaHtml(product)}</span>
        <span class="search-result-info">
          <span class="search-result-name">${escapeHtml(product.name)}</span>
          <span class="search-result-meta">${escapeHtml(product.heroName)} · ${escapeHtml(product.category)}</span>
        </span>
        <span class="search-result-price">${formatPrice(product)}</span>
      </a>`;
  }

  /* -----------------------------------------------------------------
     One widget instance (desktop bar or mobile bar)
     ----------------------------------------------------------------- */
  function initWidget(widget) {
    const input = widget.querySelector('[data-search-input]');
    const dropdown = widget.querySelector('[data-search-dropdown]');
    const clearBtn = widget.querySelector('[data-search-clear]');
    if (!input || !dropdown) return;

    function closeDropdown() {
      widget.classList.remove('dropdown-open');
    }

    function openDropdown() {
      widget.classList.add('dropdown-open');
    }

    function renderLoading() {
      dropdown.innerHTML = '<div class="search-loading">Searching…</div>';
      openDropdown();
    }

    function renderResults(products, query) {
      if (!products.length) {
        dropdown.innerHTML = '<div class="search-empty">No products found.</div>';
        openDropdown();
        return;
      }
      const shown = products.slice(0, MAX_DROPDOWN_RESULTS);
      let html = '<div class="search-results-list">' + shown.map(resultItemHtml).join('') + '</div>';
      if (products.length > MAX_DROPDOWN_RESULTS) {
        html += `<a class="search-view-all" href="${searchResultsUrl(query)}">View All Results (${products.length})</a>`;
      }
      dropdown.innerHTML = html;
      openDropdown();
    }

    let requestToken = 0;

    function runSearch(rawQuery) {
      const query = rawQuery;
      widget.classList.toggle('has-query', normalize(query).length > 0);

      if (!normalize(query)) {
        closeDropdown();
        dropdown.innerHTML = '';
        return;
      }

      const token = ++requestToken;
      renderLoading();

      loadCatalog()
        .then(products => {
          if (token !== requestToken) return; // a newer keystroke already superseded this request
          const results = searchCatalog(products, query);
          renderResults(results, query);
        })
        .catch(() => {
          if (token !== requestToken) return;
          dropdown.innerHTML = '<div class="search-empty">Could not load products right now.</div>';
          openDropdown();
        });
    }

    input.addEventListener('input', () => runSearch(input.value));

    input.addEventListener('focus', () => {
      if (input.value.trim()) openDropdown();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        widget.classList.remove('has-query');
        closeDropdown();
        dropdown.innerHTML = '';
        input.blur();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        widget.classList.remove('has-query');
        closeDropdown();
        dropdown.innerHTML = '';
        input.focus();
      });
    }

    document.addEventListener('click', (e) => {
      if (!widget.contains(e.target)) closeDropdown();
    });

    // Pressing Enter jumps to the full results page.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        window.location.href = searchResultsUrl(input.value);
      }
    });
  }

  function initAllWidgets() {
    document.querySelectorAll('[data-search-widget]').forEach(initWidget);
  }

  /* -----------------------------------------------------------------
     Scroll-to + highlight a product when arriving via a search result
     link like pages/weaver-hoodies.html#weaver-hoodies-1. The target
     card is rendered asynchronously by pageProducts.js, so this polls
     briefly rather than assuming it already exists.
     ----------------------------------------------------------------- */
  function highlightFromHash() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const id = decodeURIComponent(hash.slice(1));
    if (!document.querySelector('.product-grid, #searchResultsGrid')) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const card = document.querySelector(`[data-product-id="${window.CSS && CSS.escape ? CSS.escape(id) : id}"]`);
      if (card) {
        clearInterval(timer);
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('search-highlight');
        setTimeout(() => card.classList.remove('search-highlight'), 2500);
      } else if (attempts > 40) {
        clearInterval(timer); // ~6s, give up quietly
      }
    }, 150);
  }

  /* -----------------------------------------------------------------
     Full "View All Results" grid — only present on
     pages/search-results.html (#searchResultsGrid container).
     ----------------------------------------------------------------- */
  function initSearchResultsPage() {
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';

    const heading = document.getElementById('searchResultsQuery');
    const countEl = document.getElementById('searchResultsCount');
    const emptyEl = document.getElementById('searchResultsEmpty');
    const pageInput = document.getElementById('searchResultsInput');

    if (heading) heading.textContent = query ? `"${query}"` : '';
    if (pageInput) pageInput.value = query;

    function wireInteractivity() {
      if (window.MarvelProductCard) window.MarvelProductCard.init(grid);
      if (window.MarvelWishlist && window.MarvelWishlist.initFavButtons) window.MarvelWishlist.initFavButtons(grid);
      if (window.MarvelCart && window.MarvelCart.initProductCardButtons) window.MarvelCart.initProductCardButtons(grid);
    }

    function renderCard(product) {
      if (window.MarvelProductRenderer) return window.MarvelProductRenderer.cardHtml(product);
      // Minimal fallback if the renderer script hasn't loaded for some reason.
      return resultItemHtml(product);
    }

    if (!normalize(query)) {
      grid.innerHTML = '';
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = 'No products found.'; }
      if (countEl) countEl.textContent = '';
      return;
    }

    grid.innerHTML = '<div class="search-loading">Searching…</div>';

    loadCatalog()
      .then(products => {
        const results = searchCatalog(products, query);
        if (!results.length) {
          grid.innerHTML = '';
          if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = 'No products found.'; }
          if (countEl) countEl.textContent = '0 results';
          return;
        }
        if (emptyEl) emptyEl.hidden = true;
        if (countEl) countEl.textContent = results.length + (results.length === 1 ? ' result' : ' results');
        grid.innerHTML = results.map(renderCard).join('\n');
        wireInteractivity();
      })
      .catch(() => {
        grid.innerHTML = '';
        if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = 'Could not load products right now.'; }
      });

    if (pageInput) {
      pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && pageInput.value.trim()) {
          window.location.href = 'search-results.html?q=' + encodeURIComponent(pageInput.value);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAllWidgets();
    initSearchResultsPage();
    highlightFromHash();
  });
})();
