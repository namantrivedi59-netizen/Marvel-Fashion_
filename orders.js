

(function () {
  'use strict';

  const TRACKING_STAGES = ['Placed', 'Processing', 'Shipped', 'Out For Delivery', 'Delivered'];
  // Minutes elapsed since the order was created required to reach each stage.
  const STAGE_THRESHOLDS_MIN = [0, 1, 3, 6, 10];

  async function getOrders() {
    try {
      return await window.MarvelApi.request('api/orders/list.php');
    } catch (e) {
      window.MarvelShop.showToast(e.message || 'Could not load your orders.', 'error');
      return [];
    }
  }

  function currentStageIndex(order) {
    const elapsedMin = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
    let stage = 0;
    for (let i = STAGE_THRESHOLDS_MIN.length - 1; i >= 0; i--) {
      if (elapsedMin >= STAGE_THRESHOLDS_MIN[i]) { stage = i; break; }
    }
    return stage;
  }

  function renderTrackingTimeline(order) {
    const stageIndex = currentStageIndex(order);
    return `
      <div class="tracking-note">Simulated tracking for this demo — no real courier is connected.</div>
      <div class="tracking-timeline">
        ${TRACKING_STAGES.map((label, i) => `
          <div class="tracking-step ${i <= stageIndex ? 'done' : ''} ${i === stageIndex ? 'current' : ''}">
            <span class="tracking-dot"></span>
            <span class="tracking-label">${label}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderOrderCard(order) {
    const shop = window.MarvelShop;
    const stageIndex = currentStageIndex(order);
    const statusLabel = TRACKING_STAGES[stageIndex];
    const orderCode = shop.formatOrderCode(order.id);

    const itemsPreview = order.items.map(item => `
      <div class="order-product">
        <div class="order-product-media">
          ${shop.productMediaHtml(item, { extraClass: 'order-product-image' })}
        </div>
        <div class="order-product-info">
          <p class="order-product-hero">${shop.escapeHtml(item.heroName || '')}</p>
          <h4 class="order-product-name">${shop.escapeHtml(item.name)}</h4>
          <p class="order-product-meta">${item.size ? 'Size ' + shop.escapeHtml(item.size) + ' · ' : ''}Qty ${item.qty}</p>
        </div>
        <strong class="order-product-price">${shop.formatPrice(item.lineTotal)}</strong>
      </div>
    `).join('');

    return `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-head">
          <div>
            <p class="order-card-id">Order ${shop.escapeHtml(orderCode)}</p>
            <p class="order-card-date">${new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${shop.escapeHtml(order.paymentMethod || '')}</p>
          </div>
          <span class="order-status-badge order-status-${stageIndex}">${statusLabel}</span>
        </div>

        <div class="order-card-items">
    ${itemsPreview}
</div>
        <p class="order-card-total">Total: <strong>${shop.formatPrice(order.total)}</strong></p>

        <div class="order-card-actions">
          <button type="button" class="btn-ghost-sm" data-track="${order.id}">Track Order</button>
          <a href="invoice.html?orderId=${encodeURIComponent(order.id)}" class="btn-ghost-sm" style="text-decoration:none; text-align:center;">View Invoice</a>
          <button type="button" class="btn-solid-sm" data-reorder="${order.id}">Reorder</button>
        </div>

        <div class="order-tracking-panel" data-panel="${order.id}" hidden></div>
      </div>
    `;
  }

  async function renderOrdersPage() {
    const container = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('ordersEmpty');
    if (!container) return;

    const orders = await getOrders();

    if (orders.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;

    container.innerHTML = orders.map(renderOrderCard).join('');

    container.querySelectorAll('[data-track]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-track');
        const panel = container.querySelector(`[data-panel="${id}"]`);
        const order = orders.find(o => String(o.id) === String(id));
        if (!panel || !order) return;
        const opening = panel.hidden;
        panel.hidden = !opening;
        if (opening) panel.innerHTML = renderTrackingTimeline(order);
        btn.textContent = opening ? 'Hide Tracking' : 'Track Order';
      });
    });

    container.querySelectorAll('[data-reorder]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-reorder');
        const order = orders.find(o => String(o.id) === String(id));
        if (!order || !window.MarvelCart) return;
        btn.disabled = true;
        let addedAny = false;
        for (const item of order.items) {
          const ok = await window.MarvelCart.addToCart(item.productId, item.size, item.qty);
          if (ok) addedAny = true;
        }
        btn.disabled = false;
        if (addedAny) {
          window.MarvelShop.showToast('Items added to cart', 'success');
          setTimeout(() => { window.location.href = 'cart.html'; }, 700);
        } else {
          window.MarvelShop.showToast('Those items are no longer available');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', renderOrdersPage);

  window.MarvelOrders = { getOrders, currentStageIndex, TRACKING_STAGES };
})();
