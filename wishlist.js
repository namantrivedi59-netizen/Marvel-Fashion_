

(function () {
  'use strict';

  let wishlistIds = [];
  let wishlistProducts = [];
  let loadedPromise = null;

  function applyWishlistData(products) {
    wishlistProducts = products || [];
    wishlistIds = wishlistProducts.map(p => p.id);
    updateWishlistBadge();
  }

  async function refreshWishlist() {
    if (!window.MarvelAuth || !window.MarvelAuth.getCurrentUser()) {
      applyWishlistData([]);
      return;
    }
    try {
      const data = await window.MarvelApi.request('api/wishlist/get.php');
      applyWishlistData(data);
    } catch (e) {
      // keep whatever was last loaded on transient errors
    }
  }

  function ensureWishlistLoaded() {
    if (!loadedPromise) loadedPromise = refreshWishlist();
    return loadedPromise;
  }

  function isInWishlist(productId) {
    return wishlistIds.includes(productId);
  }

  async function addToWishlist(productId) {
    try {
      await window.MarvelApi.request('api/wishlist/add.php', { body: { productId } });
      await refreshWishlist();
      return true;
    } catch (e) {
      window.MarvelShop.showToast(e.message || 'Could not add to wishlist', 'error');
      return false;
    }
  }

  async function removeFromWishlist(productId) {
    try {
      await window.MarvelApi.request('api/wishlist/remove.php', { body: { productId } });
      await refreshWishlist();
      return true;
    } catch (e) {
      window.MarvelShop.showToast(e.message || 'Could not remove from wishlist', 'error');
      return false;
    }
  }

  async function toggleWishlist(productId) {
    const active = isInWishlist(productId);
    if (active) await removeFromWishlist(productId);
    else await addToWishlist(productId);
    return !active;
  }

  async function getWishlistProducts() {
    await ensureWishlistLoaded();
    return wishlistProducts.slice();
  }

  function updateWishlistBadge() {
    const count = wishlistIds.length;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => {
      el.textContent = count;
      el.classList.toggle('is-empty', count === 0);
    });
  }

  // Applies the current (possibly not-yet-loaded) wishlist state to any
  // heart buttons already in `root`. Safe to call before the fetch
  // resolves — it just won't find anything active yet, and gets called
  // again once ensureWishlistLoaded() resolves.
  function paintFavButtons(root) {
    (root || document).querySelectorAll('.fav-btn[data-product-id], [data-product-id] .fav-btn').forEach(btn => {
      const card = btn.closest('[data-product-id]');
      const productId = btn.getAttribute('data-product-id') || (card && card.getAttribute('data-product-id'));
      if (!productId) return;
      const active = isInWishlist(productId);
      btn.classList.toggle('active', active);
      btn.textContent = active ? '♥' : '♡';
    });
  }

  function initFavButtons(root) {
    (root || document).querySelectorAll('.fav-btn[data-product-id], [data-product-id] .fav-btn').forEach(btn => {
      const card = btn.closest('[data-product-id]');
      const productId = btn.getAttribute('data-product-id') || (card && card.getAttribute('data-product-id'));
      if (!productId) return;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to save favorites.')) return;
        btn.disabled = true;
        const nowActive = await toggleWishlist(productId);
        btn.disabled = false;
        btn.classList.toggle('active', nowActive);
        btn.textContent = nowActive ? '♥' : '♡';
        // Same MySQL-backed lookup as everywhere else, for a correct name
        // in the toast (the local generator in products.js is a stale
        // placeholder catalog, not real product data).
        const product = await window.MarvelProductService.getProductById(productId);
        if (nowActive && product) {
          window.MarvelShop.showToast(`${product.name} added to wishlist`, 'success');
          if (window.MarvelFX && window.MarvelFX.unlockAchievement) {
            window.MarvelFX.unlockAchievement('collector', 'Achievement Unlocked', 'Collector', '❤️');
          }
        } else if (product) {
          window.MarvelShop.showToast(`${product.name} removed from wishlist`);
        }
      });
    });

    // Paint current state once loaded (immediately if already cached).
    ensureWishlistLoaded().then(() => paintFavButtons(root));
  }

  /* ---------------------------------------------------------------------
     Render wishlist.html
     ------------------------------------------------------------------ */
  async function renderWishlistPage() {
    const grid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('wishlistEmpty');
    if (!grid) return; // not on the wishlist page

    const products = await getWishlistProducts();

    if (products.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;

    grid.innerHTML = products.map(p => `
      <div class="shop-card${p.stock === 'out-of-stock' ? ' is-out-of-stock' : ''}" data-product-id="${p.id}">
        <div class="shop-card-media">
          ${window.MarvelShop.productMediaHtml(p)}
          ${window.MarvelShop.stockBadgeHtml(p)}
        </div>
        <div class="shop-card-body">
          <p class="shop-card-category">${window.MarvelShop.escapeHtml(p.heroName)} · ${window.MarvelShop.escapeHtml(p.category)}</p>
          <h3 class="shop-card-name">${window.MarvelShop.escapeHtml(p.name)}</h3>
          ${window.MarvelShop.ratingHtml(p)}
          ${window.MarvelShop.priceBlockHtml(p)}
          ${window.MarvelShop.deliveryHtml(p)}
          <div class="shop-card-actions">
            <button class="btn-ghost-sm" data-remove-wishlist="${p.id}">Remove</button>
            <button class="btn-solid-sm" data-add-cart="${p.id}"${p.stock === 'out-of-stock' ? ' disabled' : ''}>${p.stock === 'out-of-stock' ? 'Out of Stock' : 'Add To Cart'}</button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-remove-wishlist]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-wishlist');
        const card = btn.closest('.shop-card');
        window.MarvelShop.showToast('Removed from wishlist');
        if (card) {
          card.classList.add('mf-removing');
          setTimeout(async () => { await removeFromWishlist(id); renderWishlistPage(); }, 300);
        } else {
          removeFromWishlist(id).then(renderWishlistPage);
        }
      });
    });

    grid.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const id = btn.getAttribute('data-add-cart');
        if (window.MarvelCart) {
          const ok = await window.MarvelCart.addToCart(id, null, 1);
          if (ok) window.MarvelShop.showToast('Added to cart', 'success');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFavButtons(document);
    renderWishlistPage();
  });

  window.MarvelWishlist = {
    ensureWishlistLoaded,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    getWishlistProducts,
    updateWishlistBadge,
    initFavButtons
  };
})();
