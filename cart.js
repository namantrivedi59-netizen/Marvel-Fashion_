

(function () {
  'use strict';

  const BUY_NOW_KEY = 'mf_buy_now'; // ephemeral single-item checkout intent only;
                                     // re-validated against MySQL at order time, so
                                     // it never has to be "real" persisted cart data.

  function lineKey(productId, size) {
    return `${productId}::${size || 'onesize'}`;
  }

  /* ---------------------------------------------------------------------
     Server-backed cart state
     ------------------------------------------------------------------ */
  let cartLines = [];   // [{ productId, size, qty, product }] — product is server-truth
  let cartTotals = { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 };
  let loadedPromise = null;

  function applyCartData(data) {
    cartLines = (data && data.lines) || [];
    cartTotals = (data && data.totals) || { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 };
    updateCartBadge();
  }

  async function refreshCart() {
    if (!window.MarvelAuth || !window.MarvelAuth.getCurrentUser()) {
      applyCartData(null);
      return;
    }
    try {
      const data = await window.MarvelApi.request('api/cart/get.php');
      applyCartData(data);
    } catch (e) {
      // Session expired is already handled by MarvelApi/MarvelAuth; for any
      // other hiccup, leave whatever was last successfully loaded in place
      // rather than blanking the cart out from under the user.
    }
  }

  // Every page that needs cart contents before it can render (cart.html,
  // checkout.html) must await this once; it's memoized so later calls are
  // instant and don't refetch.
  function ensureCartLoaded() {
    if (!loadedPromise) loadedPromise = refreshCart();
    return loadedPromise;
  }

  async function addToCart(productId, size, qty) {
    qty = qty || 1;
    try {
      const data = await window.MarvelApi.request('api/cart/add.php', {
        body: { productId, size: size || '', qty }
      });
      applyCartData(data);
      return true;
    } catch (e) {
      window.MarvelShop.showToast(e.message || 'Could not add to cart', 'error');
      return false;
    }
  }

  async function removeFromCart(productId, size) {
    try {
      const data = await window.MarvelApi.request('api/cart/remove.php', {
        body: { productId, size: size || '' }
      });
      applyCartData(data);
    } catch (e) {
      window.MarvelShop.showToast(e.message || 'Could not remove item', 'error');
    }
  }

  async function updateQty(productId, size, qty) {
    qty = Math.max(1, Math.min(10, qty));
    try {
      const data = await window.MarvelApi.request('api/cart/update.php', {
        body: { productId, size: size || '', qty }
      });
      applyCartData(data);
    } catch (e) {
      window.MarvelShop.showToast(e.message || 'Could not update quantity', 'error');
    }
  }

  async function clearCart() {
    try {
      const data = await window.MarvelApi.request('api/cart/clear.php', { body: {} });
      applyCartData(data);
    } catch (e) {
      applyCartData(null); // clear locally even if the request failed (e.g. order just placed)
    }
  }

  function getCartCount() {
    return cartLines.reduce((sum, l) => sum + l.qty, 0);
  }

  function getResolvedCartLines() {
    return cartLines.slice();
  }

  // lines' product.finalPrice/price already came from the server (via
  // api/cart/get.php), so this is a display-only recomputation — the
  // authoritative total is always (re)computed server-side by
  // api/coupons/validate.php and api/orders/create.php at checkout time.
  function getCartTotals(lines) {
    if (!lines) return Object.assign({}, cartTotals);
    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
    const discountedSubtotal = lines.reduce((sum, l) => sum + l.product.finalPrice * l.qty, 0);
    const discount = Math.round((subtotal - discountedSubtotal) * 100) / 100;
    const shipping = discountedSubtotal > 0 ? (discountedSubtotal >= 150 ? 0 : 12) : 0;
    const tax = Math.round(discountedSubtotal * 0.08 * 100) / 100;
    const total = Math.round((discountedSubtotal + shipping + tax) * 100) / 100;
    return { subtotal, discount, shipping, tax, total };
  }

  /* ---------------------------------------------------------------------
     Buy Now — ephemeral hand-off to checkout.html?mode=buynow only
     ------------------------------------------------------------------ */
  async function setBuyNow(productId, size, qty) {
    // Same rationale as getCheckoutLines() above — check real MySQL stock,
    // not the local generator's placeholder data.
    const product = await window.MarvelProductService.getProductById(productId);
    if (!product || product.stock === 'out-of-stock') return false;
    window.MarvelShop.writeJSON(BUY_NOW_KEY, { productId, size: size || null, qty: qty || 1 });
    return true;
  }
  function getBuyNow() {
    return window.MarvelShop.readJSON(BUY_NOW_KEY, null);
  }
  function clearBuyNow() {
    window.MarvelShop.removeKey(BUY_NOW_KEY);
  }

  function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.classList.toggle('is-empty', count === 0);
    });
  }

  function initProductCardButtons(root) {
    (root || document).querySelectorAll('[data-product-id]').forEach(card => {
      const productId = card.getAttribute('data-product-id');

      const addBtn = card.querySelector('.add-cart-btn');
      const buyBtn = card.querySelector('.buy-now-btn');
      const sizeBtns = card.querySelectorAll('.size-btn');
      const qtyValueEl = card.querySelector('.qty-value');

      function currentSize() {
        const active = card.querySelector('.size-btn.active');
        return active ? active.textContent.trim() : null;
      }
      function currentQty() {
        return qtyValueEl ? parseInt(qtyValueEl.textContent, 10) || 1 : 1;
      }

      if (addBtn) {
        addBtn.addEventListener('click', async () => {
          if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to add items to your cart.')) return;
          if (sizeBtns.length && !currentSize()) {
            window.MarvelShop.showToast('Please select a size first');
            return;
          }
          addBtn.disabled = true;
          const ok = await addToCart(productId, currentSize(), currentQty());
          addBtn.disabled = false;
          if (ok) window.MarvelShop.showToast('Added to cart', 'success');
        });
      }

      if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
          if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to buy this item.')) return;
          if (sizeBtns.length && !currentSize()) {
            window.MarvelShop.showToast('Please select a size first');
            return;
          }
          buyBtn.disabled = true;
          const ok = await setBuyNow(productId, currentSize(), currentQty());
          buyBtn.disabled = false;
          if (!ok) {
            window.MarvelShop.showToast('This item is out of stock');
            return;
          }
          window.location.href = window.MarvelShop.rootPrefix() + 'pages/checkout.html?mode=buynow';
        });
      }
    });
  }

  /* ---------------------------------------------------------------------
     Render cart.html
     ------------------------------------------------------------------ */
  function renderCartPage() {
    const list = document.getElementById('cartLines');
    const emptyState = document.getElementById('cartEmpty');
    const summaryEl = document.getElementById('cartSummary');
    if (!list) return; // not on the cart page

    const lines = getResolvedCartLines();

    if (lines.length === 0) {
      list.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      if (summaryEl) summaryEl.hidden = true;
      return;
    }
    if (emptyState) emptyState.hidden = true;
    if (summaryEl) summaryEl.hidden = false;

    const shop = window.MarvelShop;

    list.innerHTML = lines.map(l => `
      <div class="cart-line" data-line-key="${lineKey(l.productId, l.size)}">
        <div class="cart-line-media">${shop.productMediaHtml(l.product)}</div>
        <div class="cart-line-body">
          <p class="cart-line-hero">${shop.escapeHtml(l.product.heroName)}</p>
          <h3 class="cart-line-name">${shop.escapeHtml(l.product.name)}</h3>
          ${l.size ? `<p class="cart-line-size">Size: ${shop.escapeHtml(l.size)}</p>` : ''}
          ${shop.ratingHtml(l.product)}
          ${shop.stockBadgeHtml(l.product)}
          ${shop.deliveryHtml(l.product)}
          <div class="cart-line-qty">
            <button class="qty-btn cart-qty-minus" aria-label="Decrease quantity">–</button>
            <span class="qty-value">${l.qty}</span>
            <button class="qty-btn cart-qty-plus" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-line-side">
          <div class="price-block price-block--inline">
            <span class="price-original">${shop.formatPrice(l.product.price * l.qty)}</span>
            <span class="price-discount-badge">${l.product.discountPercent}% OFF</span>
          </div>
          <p class="cart-line-price">${shop.formatPrice(l.product.finalPrice * l.qty)}</p>
          <button class="cart-line-remove" aria-label="Remove item">Remove</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.cart-line').forEach(lineEl => {
      const key = lineEl.getAttribute('data-line-key');
      const line = lines.find(l => lineKey(l.productId, l.size) === key);
      if (!line) return;

      lineEl.querySelector('.cart-qty-minus').addEventListener('click', async () => {
        const qv = list.querySelector(`[data-line-key="${key}"] .qty-value`);
        await updateQty(line.productId, line.size, line.qty - 1);
        renderCartPage();
        const newQv = list.querySelector(`[data-line-key="${key}"] .qty-value`);
        if (newQv) { newQv.classList.remove('mf-pop'); void newQv.offsetWidth; newQv.classList.add('mf-pop'); }
      });
      lineEl.querySelector('.cart-qty-plus').addEventListener('click', async () => {
        await updateQty(line.productId, line.size, line.qty + 1);
        renderCartPage();
        const qv = list.querySelector(`[data-line-key="${key}"] .qty-value`);
        if (qv) { qv.classList.remove('mf-pop'); void qv.offsetWidth; qv.classList.add('mf-pop'); }
      });
      lineEl.querySelector('.cart-line-remove').addEventListener('click', () => {
        lineEl.classList.add('mf-removing');
        window.MarvelShop.showToast('Removed from cart');
        setTimeout(async () => {
          await removeFromCart(line.productId, line.size);
          renderCartPage();
        }, 300);
      });
    });

    const totals = getCartTotals(lines);
    if (summaryEl) {
      summaryEl.querySelector('[data-subtotal]').textContent = shop.formatPrice(totals.subtotal);
      const discountEl = summaryEl.querySelector('[data-discount]');
      if (discountEl) discountEl.textContent = totals.discount > 0 ? `-${shop.formatPrice(totals.discount)}` : shop.formatPrice(0);
      summaryEl.querySelector('[data-shipping]').textContent = totals.shipping === 0 ? 'Free' : shop.formatPrice(totals.shipping);
      summaryEl.querySelector('[data-tax]').textContent = shop.formatPrice(totals.tax);
      summaryEl.querySelector('[data-total]').textContent = shop.formatPrice(totals.total);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initProductCardButtons(document); // listeners don't need cart data loaded first
    await ensureCartLoaded();
    renderCartPage();

    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (getResolvedCartLines().length === 0) {
          window.MarvelShop.showToast('Your cart is empty');
          return;
        }
        if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to checkout.')) return;
        window.location.href = 'checkout.html?mode=cart';
      });
    }
  });

  window.MarvelCart = {
    ensureCartLoaded,
    refreshCart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    getResolvedCartLines,
    getCartTotals,
    getCartCount,
    updateCartBadge,
    setBuyNow,
    getBuyNow,
    clearBuyNow,
    initProductCardButtons
  };
})();
