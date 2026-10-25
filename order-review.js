

(function () {
  'use strict';

  const PENDING_ORDER_KEY = 'mf_pending_order';

  function loadPendingOrder() {
    return window.MarvelShop.readJSON(PENDING_ORDER_KEY, null);
  }
  function savePendingOrder(order) {
    window.MarvelShop.writeJSON(PENDING_ORDER_KEY, order);
  }

  function renderAddress(order) {
    const box = document.getElementById('reviewAddress');
    if (!box) return;
    const c = order.customer;
    const shop = window.MarvelShop;
    box.innerHTML = `
      <p class="address-card-name">${shop.escapeHtml(c.fullName)}</p>
      <p class="address-card-line">${shop.escapeHtml(c.address)}, ${shop.escapeHtml(c.city)}, ${shop.escapeHtml(c.state)} ${shop.escapeHtml(c.zip)}</p>
      <p class="address-card-line">${shop.escapeHtml(c.phone)} · ${shop.escapeHtml(c.email)}</p>
    `;
  }

  function renderItems(order) {
    const box = document.getElementById('reviewItems');
    if (!box) return;
    const shop = window.MarvelShop;

    box.innerHTML = order.items.map(item => `
      <div class="checkout-item">
        <div class="checkout-item-media">
          ${item.image
            ? `<img src="${shop.resolveImageSrc(item.image)}" alt="${shop.escapeHtml(item.name)}">`
            : `<div class="media-placeholder" style="--accent-a:${item.accentA}; --accent-b:${item.accentB};"><span class="placeholder-mark">${shop.escapeHtml(item.heroName.slice(0,2).toUpperCase())}</span></div>`}
        </div>
        <div class="checkout-item-body">
          <p class="checkout-item-hero">${shop.escapeHtml(item.heroName)}</p>
          <h4 class="checkout-item-name">${shop.escapeHtml(item.name)}</h4>
          <p class="checkout-item-meta">${item.size ? 'Size ' + shop.escapeHtml(item.size) + ' · ' : ''}Qty ${item.qty}</p>
        </div>
        <p class="checkout-item-price">${shop.formatPrice((item.finalPrice != null ? item.finalPrice : item.price) * item.qty)}</p>
      </div>
    `).join('');
  }

  function renderTotals(order) {
    const shop = window.MarvelShop;
    const totals = window.MarvelCoupons.computeFinalTotals(order.totals, order.coupon);
    const box = document.getElementById('reviewTotals');

    box.querySelector('[data-subtotal]').textContent = shop.formatPrice(totals.subtotal);
    box.querySelector('[data-discount]').textContent = totals.discount > 0 ? `-${shop.formatPrice(totals.discount)}` : shop.formatPrice(0);
    box.querySelector('[data-shipping]').textContent = totals.shipping === 0 ? 'Free' : shop.formatPrice(totals.shipping);
    box.querySelector('[data-tax]').textContent = shop.formatPrice(totals.tax);
    box.querySelector('[data-total]').textContent = shop.formatPrice(totals.total);

    const couponRow = document.getElementById('couponSummaryRow');
    if (order.coupon && totals.couponDiscount > 0) {
      couponRow.hidden = false;
      couponRow.querySelector('[data-coupon-code]').textContent = order.coupon.code;
      couponRow.querySelector('[data-coupon-amount]').textContent = `-${shop.formatPrice(totals.couponDiscount)}`;
    } else {
      couponRow.hidden = true;
    }
    return totals;
  }

  function renderCouponState(order) {
    const appliedBox = document.getElementById('couponApplied');
    const appliedText = document.getElementById('couponAppliedText');
    const input = document.getElementById('couponInput');
    const applyBtn = document.getElementById('applyCouponBtn');

    if (order.coupon) {
      appliedBox.hidden = false;
      appliedText.textContent = `"${order.coupon.code}" applied — -${window.MarvelShop.formatPrice(order.coupon.discount)}`;
      input.value = order.coupon.code;
      input.disabled = true;
      applyBtn.disabled = true;
    } else {
      appliedBox.hidden = true;
      input.disabled = false;
      applyBtn.disabled = false;
    }
  }

  function initCoupon(order) {
    const input = document.getElementById('couponInput');
    const applyBtn = document.getElementById('applyCouponBtn');
    const removeBtn = document.getElementById('removeCouponBtn');
    const errorEl = document.getElementById('couponError');

    applyBtn.addEventListener('click', async () => {
      errorEl.classList.remove('show');
      errorEl.textContent = '';
      applyBtn.disabled = true;
      applyBtn.classList.add('is-loading');

      // Coupon math is always validated server-side — this call goes
      // straight to api/coupons/validate.php with the exact line items
      // being reviewed (works for both cart and buy-now checkouts).
      const lines = order.items.map(i => ({ productId: i.productId, size: i.size, qty: i.qty }));
      const result = await window.MarvelCoupons.validateCoupon(input.value, lines);

      applyBtn.classList.remove('is-loading');
      applyBtn.disabled = false;

      if (!result.valid) {
        errorEl.textContent = result.message;
        errorEl.classList.add('show');
        return;
      }

      order.coupon = {
        code: result.code,
        discount: result.discount,
        serverShipping: result.serverShipping,
        serverTax: result.serverTax,
        serverTotal: result.serverTotal
      };
      savePendingOrder(order);
      renderCouponState(order);
      renderTotals(order);
      window.MarvelShop.showToast(result.message, 'success');
    });

    removeBtn.addEventListener('click', () => {
      order.coupon = null;
      savePendingOrder(order);
      renderCouponState(order);
      renderTotals(order);
      window.MarvelShop.showToast('Coupon removed');
    });
  }

  function initConfirm(order) {
    const btn = document.getElementById('confirmOrderBtn');
    btn.addEventListener('click', () => {
      // Persist the final totals (with coupon layered in) onto the order
      // itself, so payment.js sends exactly what was shown here. The
      // actual order total is still recomputed authoritatively by
      // api/orders/create.php — this is only what gets displayed.
      order.finalTotals = window.MarvelCoupons.computeFinalTotals(order.totals, order.coupon);
      savePendingOrder(order);
      window.location.href = 'payment.html';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('reviewItems')) return; // not on this page
    if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to continue your order.')) return;

    const order = loadPendingOrder();
    if (!order || !order.items || order.items.length === 0) {
      window.location.href = 'cart.html';
      return;
    }

    if (order.coupon === undefined) order.coupon = null;

    renderAddress(order);
    renderItems(order);
    renderTotals(order);
    renderCouponState(order);
    initCoupon(order);
    initConfirm(order);
  });
})();
