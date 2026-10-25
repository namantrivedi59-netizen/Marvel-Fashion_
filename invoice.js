

(function () {
  'use strict';

  function getOrderIdFromUrl() {
    return new URLSearchParams(window.location.search).get('orderId');
  }

  function render(order) {
    const shop = window.MarvelShop;

    document.getElementById('invoiceOrderId').textContent = shop.formatOrderCode(order.id);
    document.getElementById('invoiceDate').textContent = new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('invoiceStatus').textContent = (order.status || 'placed').toUpperCase();
    document.getElementById('invoicePaymentMethod').textContent = (order.paymentMethod || '—').toUpperCase();

    const c = order.address || {};
    document.getElementById('invoiceBillTo').innerHTML = `
      ${shop.escapeHtml(c.fullName)}<br>
      ${shop.escapeHtml(c.address)}<br>
      ${shop.escapeHtml(c.city)}, ${shop.escapeHtml(c.state)} ${shop.escapeHtml(c.zip)}<br>
      ${shop.escapeHtml(c.phone)}<br>
      ${shop.escapeHtml(c.email)}
    `;

    const rowsEl = document.getElementById('invoiceRows');
    rowsEl.innerHTML = order.items.map(item => `
      <tr>
        <td>${shop.escapeHtml(item.name)}${item.size ? ' (' + shop.escapeHtml(item.size) + ')' : ''}</td>
        <td>${shop.escapeHtml(item.heroName || '')}</td>
        <td>${item.qty}</td>
        <td>${shop.formatPrice(item.unitPrice)}</td>
        <td>${shop.formatPrice(item.lineTotal)}</td>
      </tr>
    `).join('');

    document.getElementById('invoiceSubtotal').textContent = shop.formatPrice(order.subtotal);
    document.getElementById('invoiceItemDiscount').textContent = order.discountTotal > 0 ? `-${shop.formatPrice(order.discountTotal)}` : shop.formatPrice(0);

    const couponRow = document.getElementById('invoiceCouponRow');
    if (order.couponCode && order.couponDiscount > 0) {
      couponRow.hidden = false;
      document.getElementById('invoiceCouponCode').textContent = order.couponCode;
      document.getElementById('invoiceCouponAmount').textContent = `-${shop.formatPrice(order.couponDiscount)}`;
    } else {
      couponRow.hidden = true;
    }

    document.getElementById('invoiceShipping').textContent = order.shipping === 0 ? 'Free' : shop.formatPrice(order.shipping);
    document.getElementById('invoiceTax').textContent = shop.formatPrice(order.tax);
    document.getElementById('invoiceTotal').textContent = shop.formatPrice(order.total);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('invoiceRoot');
    if (!root) return;
    if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to view this invoice.')) return;

    const orderId = getOrderIdFromUrl();
    const printBtn = document.getElementById('invoicePrintBtn');

    if (!orderId) {
      root.innerHTML = '<p class="checkout-empty">We couldn\u2019t find that invoice.</p>';
      if (printBtn) printBtn.hidden = true;
      return;
    }

    // The server enforces ownership (api/orders/get.php only returns orders
    // belonging to the logged-in session) — a 404 here means either the
    // order doesn't exist or it belongs to someone else, and either way
    // the visitor sees the same generic "not found" message.
    try {
      const order = await window.MarvelApi.request('api/orders/get.php?id=' + encodeURIComponent(orderId));
      render(order);
    } catch (e) {
      root.innerHTML = '<p class="checkout-empty">We couldn\u2019t find that invoice. It may belong to a different account or has expired.</p>';
      if (printBtn) printBtn.hidden = true;
      return;
    }

    if (printBtn) printBtn.addEventListener('click', () => window.print());
  });
})();
