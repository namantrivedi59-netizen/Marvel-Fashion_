
(function () {
  'use strict';

  function mediaHtml(product) {
    if (product.image) {
      return window.MarvelShop.productMediaHtml(product, { extraClass: 'product-image' });
    }
    return `<span class="placeholder-mark">${String(product.index).padStart(2, '0')}</span>`;
  }

  function sizeButtonsHtml(product) {
    return (product.sizes || [])
      .map(s => `<button class="size-btn">${window.MarvelShop.escapeHtml(s)}</button>`)
      .join('\n');
  }
  function cardHtml(product) {
    const outOfStock = product.stock === 'out-of-stock';
    const disabledAttr = outOfStock ? ' disabled' : '';
    const addLabel = outOfStock ? 'Out of Stock' : 'Add To Cart';
    const buyLabel = outOfStock ? 'Out of Stock' : 'Buy Now';

    return `
      <div class="product-card${outOfStock ? ' is-out-of-stock' : ''}" data-product-id="${product.id}">
        <div class="product-media" style="--accent-a:${product.accentA}; --accent-b:${product.accentB};">
          <button class="fav-btn" type="button" aria-label="Add to favourites">♡</button>
          ${mediaHtml(product)}
          ${window.MarvelShop.stockBadgeHtml(product)}
        </div>
        <div class="product-info">
          <div class="product-info-header">
            <div class="product-info-text">
              <h3 class="product-name">${window.MarvelShop.escapeHtml(product.name)}</h3>
              <p class="product-subtitle">${window.MarvelShop.escapeHtml(product.heroName)} Collection</p>
              ${window.MarvelShop.ratingHtml(product)}
            </div>
            ${window.MarvelShop.priceBlockHtml(product)}
          </div>
          ${window.MarvelShop.deliveryHtml(product)}
          <div class="product-sizes">
${sizeButtonsHtml(product)}
          </div>
          <div class="qty-row">
            <button class="qty-btn qty-minus">–</button>
            <span class="qty-value">1</span>
            <button class="qty-btn qty-plus">+</button>
          </div>
          <div class="product-card-actions">
            <button class="add-cart-btn"${disabledAttr}>${addLabel}</button>
            <button class="buy-now-btn"${disabledAttr}>${buyLabel}</button>
          </div>
        </div>
      </div>`;
  }

  /** Renders a whole list of products into a container element. */
  function renderGrid(container, products) {
    container.innerHTML = products.map(cardHtml).join('\n');
  }

  /** One skeleton placeholder card, shown while the API request is in flight. */
  function skeletonCardHtml() {
    return `
      <div class="product-card product-card--skeleton" aria-hidden="true">
        <div class="product-media"></div>
        <div class="product-info">
          <div class="skeleton-line skeleton-line--title"></div>
          <div class="skeleton-line skeleton-line--sub"></div>
          <div class="skeleton-line skeleton-line--price"></div>
          <div class="skeleton-line skeleton-line--wide"></div>
        </div>
      </div>`;
  }

  function renderSkeletons(container, count) {
    const n = count || 4;
    container.innerHTML = new Array(n).fill(0).map(skeletonCardHtml).join('\n');
  }

  function renderError(container, message, onRetry) {
    container.innerHTML = `
      <div class="product-grid-error">
        <p>${window.MarvelShop.escapeHtml(message || 'Could not load products right now.')}</p>
        <button type="button" class="btn btn-ghost-sm product-grid-retry">Try Again</button>
      </div>`;
    const retryBtn = container.querySelector('.product-grid-retry');
    if (retryBtn && typeof onRetry === 'function') {
      retryBtn.addEventListener('click', onRetry);
    }
  }

  function renderEmpty(container, message) {
    container.innerHTML = `<p class="checkout-empty">${window.MarvelShop.escapeHtml(message || 'No products found.')}</p>`;
  }

  window.MarvelProductRenderer = {
    cardHtml,
    renderGrid,
    renderSkeletons,
    renderError,
    renderEmpty
  };
})();
