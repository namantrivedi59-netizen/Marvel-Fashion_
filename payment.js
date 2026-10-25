

(function () {
  'use strict';

  const PENDING_ORDER_KEY = 'mf_pending_order';

  function formatOrderCode(id) {
    return window.MarvelShop.formatOrderCode(id);
  }

  /* ---------------------------------------------------------------------
     payment.html
     ------------------------------------------------------------------ */
  function initPaymentPage() {
    const recapEl = document.getElementById('paymentRecap');
    if (!recapEl) return; // not on payment page
    if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to pay for your order.')) return;

    const shop = window.MarvelShop;
    const pendingOrder = shop.readJSON(PENDING_ORDER_KEY, null);

    if (!pendingOrder || !pendingOrder.items || pendingOrder.items.length === 0) {
      recapEl.innerHTML = '<p class="checkout-empty">No order to pay for. Please checkout again.</p>';
      const payBtn = document.getElementById('paySubmit');
      if (payBtn) payBtn.disabled = true;
      return;
    }

    // finalTotals is set by order-review.js and already has any coupon
    // layered in. Older pending orders (or a direct reload skipping that
    // page) won't have it yet, so fall back to the un-couponed totals.
    const totals = pendingOrder.finalTotals || Object.assign({}, pendingOrder.totals, { couponDiscount: 0 });

    // Recap of what's being paid for.
    recapEl.innerHTML = pendingOrder.items.map(item => `
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

    const totalsBox = document.getElementById('paymentTotals');
    if (totalsBox) {
      totalsBox.querySelector('[data-subtotal]').textContent = shop.formatPrice(totals.subtotal);
      const discountEl = totalsBox.querySelector('[data-discount]');
      if (discountEl) discountEl.textContent = totals.discount > 0 ? `-${shop.formatPrice(totals.discount)}` : shop.formatPrice(0);
      totalsBox.querySelector('[data-shipping]').textContent = totals.shipping === 0 ? 'Free' : shop.formatPrice(totals.shipping);
      totalsBox.querySelector('[data-tax]').textContent = shop.formatPrice(totals.tax);
      totalsBox.querySelector('[data-total]').textContent = shop.formatPrice(totals.total);

      const couponRow = document.getElementById('paymentCouponRow');
      if (couponRow) {
        if (pendingOrder.coupon && totals.couponDiscount > 0) {
          couponRow.hidden = false;
          couponRow.querySelector('[data-coupon-code]').textContent = pendingOrder.coupon.code;
          couponRow.querySelector('[data-coupon-amount]').textContent = `-${shop.formatPrice(totals.couponDiscount)}`;
        } else {
          couponRow.hidden = true;
        }
      }
    }

    /* ---------------- payment method tabs ---------------- */
    const methodBtns = document.querySelectorAll('.pay-method-btn');
    const panels = {
      card: document.getElementById('payPanelCard'),
      upi: document.getElementById('payPanelUpi'),
      netbanking: document.getElementById('payPanelNetbanking'),
      cod: document.getElementById('payPanelCod')
    };
    let activeMethod = 'card';

    function setMethod(method) {
      activeMethod = method;
      methodBtns.forEach(b => b.classList.toggle('active', b.dataset.method === method));
      Object.keys(panels).forEach(key => {
        if (panels[key]) panels[key].hidden = key !== method;
      });
    }
    methodBtns.forEach(btn => {
      btn.addEventListener('click', () => setMethod(btn.dataset.method));
    });
    setMethod('card');

    /* ---------------- card number formatting (visual only) ---------------- */
    const cardNumberInput = document.getElementById('payCardNumber');
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', () => {
        const digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
        cardNumberInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
      });
    }
    const expiryInput = document.getElementById('payCardExpiry');
    if (expiryInput) {
      expiryInput.addEventListener('input', () => {
        let digits = expiryInput.value.replace(/\D/g, '').slice(0, 4);
        if (digits.length >= 3) digits = digits.slice(0, 2) + '/' + digits.slice(2);
        expiryInput.value = digits;
      });
    }

    /* ---------------- submit / place order ---------------- */
    let submitting = false; // guards against double-click / double-submit
    const form = document.getElementById('paymentForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting) return; // a request is already in flight

      if (activeMethod === 'card') {
        const number = (cardNumberInput.value || '').replace(/\s/g, '');
        const holder = document.getElementById('payCardHolder').value.trim();
        const expiry = expiryInput.value.trim();
        const cvv = document.getElementById('payCardCvv').value.trim();

        if (number.length < 15 || number.length > 16) {
          shop.showToast('Enter a valid card number.', 'error');
          return;
        }
        if (!holder) {
          shop.showToast('Enter the name on the card.', 'error');
          return;
        }
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
          shop.showToast('Enter expiry as MM/YY.', 'error');
          return;
        }
        if (!/^\d{3,4}$/.test(cvv)) {
          shop.showToast('Enter a valid CVV.', 'error');
          return;
        }
      }

      if (activeMethod === 'upi') {
        const upiId = document.getElementById('payUpiId').value.trim();
        if (!/^[\w.\-]+@[\w.\-]+$/.test(upiId)) {
          shop.showToast('Enter a valid UPI ID (e.g. name@bank).', 'error');
          return;
        }
      }

      if (activeMethod === 'netbanking') {
        const bank = document.getElementById('payBankSelect').value;
        if (!bank) {
          shop.showToast('Select your bank to continue.', 'error');
          return;
        }
      }

      // Card / UPI / Net Banking / COD — all "succeed" here since there is
      // no real payment gateway. This is a UI-only checkout flow. The
      // order itself, however, is real: it's created server-side below.
      await finalizeOrder(pendingOrder, activeMethod);
    });

    async function finalizeOrder(order, method) {
      submitting = true;
      const payBtn = document.getElementById('paySubmit');
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.classList.add('is-loading');
        payBtn.textContent = 'Processing...';
      }

      const body = {
        addressId: order.addressId,
        paymentMethod: method,
        email: order.customer.email,
        couponCode: order.coupon ? order.coupon.code : ''
      };
      if (order.mode === 'buynow') {
        const item = order.items[0];
        body.buyNow = { productId: item.productId, size: item.size, qty: item.qty };
      }

      try {
        const data = await window.MarvelApi.request('api/orders/create.php', { body });

        // Clean up whichever source this order came from. The server
        // already cleared the DB cart / decremented stock atomically —
        // this just brings the client-side cache in sync.
        if (order.mode === 'buynow') {
          window.MarvelCart.clearBuyNow();
        } else {
          await window.MarvelCart.refreshCart();
        }
        shop.removeKey(PENDING_ORDER_KEY);

        setTimeout(() => {
          window.location.href = 'success.html?orderId=' + encodeURIComponent(data.orderId);
        }, 900);
      } catch (err) {
        submitting = false;
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.classList.remove('is-loading');
          payBtn.textContent = 'Place Order';
        }
        shop.showToast(err.message || 'Could not place your order. Please try again.', 'error');
      }
    }
  }

  /* ---------------------------------------------------------------------
     success.html — loads the just-placed order from the server, never
     from localStorage, so a refresh or a shared link always shows real
     (and only the owner's) data.
     ------------------------------------------------------------------ */
  async function initSuccessPage() {
    const box = document.getElementById('successOrderId');
    if (!box) return; // not on success page

    const shop = window.MarvelShop;
    const orderId = new URLSearchParams(window.location.search).get('orderId');

    if (!orderId) {
      box.textContent = '—';
      const sub = document.getElementById('successSubtext');
      if (sub) sub.textContent = 'We couldn\u2019t find your recent order. If you just paid, check your orders on your profile page.';
      return;
    }

    try {
      const order = await window.MarvelApi.request('api/orders/get.php?id=' + encodeURIComponent(orderId));
      box.textContent = formatOrderCode(order.id);

      const itemsEl = document.getElementById('successItems');
      if (itemsEl) {
        itemsEl.innerHTML = order.items.map(item => `
          <li>${shop.escapeHtml(item.name)} ${item.size ? '(' + shop.escapeHtml(item.size) + ')' : ''} × ${item.qty}</li>
        `).join('');
      }

      const totalEl = document.getElementById('successTotal');
      if (totalEl) totalEl.textContent = shop.formatPrice(order.total);
    } catch (err) {
      box.textContent = '—';
      const sub = document.getElementById('successSubtext');
      if (sub) sub.textContent = 'We couldn\u2019t find that order.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPaymentPage();
    initSuccessPage();
  });

  window.MarvelPayment = { formatOrderCode };
})();
