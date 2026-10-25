

(function () {
  'use strict';

  const PENDING_ORDER_KEY = 'mf_pending_order'; // ephemeral draft only — the real order
                                                 // is created server-side at payment time.

  async function getCheckoutLines() {
    const buyNow = window.MarvelCart.getBuyNow();
    if (buyNow) {
      // Product data must come from the real MySQL-backed catalog (via
      // MarvelProductService), not the local deterministic generator in
      // products.js — that generator produces placeholder names/prices
      // that can drift from the real product, which would show wrong
      // info at checkout even though the final charge is still
      // recalculated correctly server-side at order time.
      const product = await window.MarvelProductService.getProductById(buyNow.productId);
      if (product) {
        return {
          mode: 'buynow',
          lines: [{ productId: buyNow.productId, size: buyNow.size, qty: buyNow.qty, product }]
        };
      }
    }
    await window.MarvelCart.ensureCartLoaded();
    return { mode: 'cart', lines: window.MarvelCart.getResolvedCartLines() };
  }

  function renderOrderSummary(lines) {
    const listEl = document.getElementById('checkoutItems');
    if (!listEl) return;
    const shop = window.MarvelShop;

    if (lines.length === 0) {
      listEl.innerHTML = '<p class="checkout-empty">There is nothing to check out yet.</p>';
      return;
    }

    listEl.innerHTML = lines.map(l => `
      <div class="checkout-item">
        <div class="checkout-item-media">${shop.productMediaHtml(l.product)}</div>
        <div class="checkout-item-body">
          <p class="checkout-item-hero">${shop.escapeHtml(l.product.heroName)}</p>
          <h4 class="checkout-item-name">${shop.escapeHtml(l.product.name)}</h4>
          <p class="checkout-item-meta">
            ${l.size ? 'Size ' + shop.escapeHtml(l.size) + ' · ' : ''}Qty ${l.qty}
          </p>
        </div>
        <p class="checkout-item-price">${shop.formatPrice(l.product.finalPrice * l.qty)}</p>
      </div>
    `).join('');
  }

  function renderTotals(lines) {
    const totals = window.MarvelCart.getCartTotals(lines);
    const shop = window.MarvelShop;
    const box = document.getElementById('checkoutTotals');
    if (!box) return totals;
    box.querySelector('[data-subtotal]').textContent = shop.formatPrice(totals.subtotal);
    const discountEl = box.querySelector('[data-discount]');
    if (discountEl) discountEl.textContent = totals.discount > 0 ? `-${shop.formatPrice(totals.discount)}` : shop.formatPrice(0);
    box.querySelector('[data-shipping]').textContent = totals.shipping === 0 ? 'Free' : shop.formatPrice(totals.shipping);
    box.querySelector('[data-tax]').textContent = shop.formatPrice(totals.tax);
    box.querySelector('[data-total]').textContent = shop.formatPrice(totals.total);
    return totals;
  }

  function setFieldError(input, errorEl, message) {
    if (errorEl) { errorEl.textContent = message; errorEl.classList.add('show'); }
    if (input) { const shell = input.closest('.input-shell, .form-group'); if (shell) shell.classList.add('has-error'); }
  }
  function clearFieldError(input, errorEl) {
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
    if (input) { const shell = input.closest('.input-shell, .form-group'); if (shell) shell.classList.remove('has-error'); }
  }

  /* ---------------------------------------------------------------------
     Saved Addresses (server-backed via MarvelAddresses)
     ------------------------------------------------------------------ */
  let selectedAddressId = null;

  async function renderAddressList() {
    const listEl = document.getElementById('addressList');
    const emptyNote = document.getElementById('addressEmptyNote');
    if (!listEl) return;

    const addresses = await window.MarvelAddresses.getAddresses();
    emptyNote.hidden = addresses.length > 0;

    if (!selectedAddressId) {
      const def = await window.MarvelAddresses.getDefaultAddress();
      if (def) selectedAddressId = def.id;
    }

    listEl.innerHTML = addresses.map(a => `
      <label class="address-card ${String(a.id) === String(selectedAddressId) ? 'selected' : ''}" data-address-id="${a.id}">
        <input type="radio" name="savedAddress" value="${a.id}" ${String(a.id) === String(selectedAddressId) ? 'checked' : ''}>
        <div class="address-card-body">
          <p class="address-card-name">${window.MarvelShop.escapeHtml(a.fullName)} ${a.isDefault ? '<span class="address-default-tag">Default</span>' : ''}</p>
          <p class="address-card-line">${window.MarvelShop.escapeHtml(a.address)}, ${window.MarvelShop.escapeHtml(a.city)}, ${window.MarvelShop.escapeHtml(a.state)} ${window.MarvelShop.escapeHtml(a.zip)}</p>
          <p class="address-card-line">${window.MarvelShop.escapeHtml(a.phone)}</p>
        </div>
        <div class="address-card-actions">
          <button type="button" class="address-edit-btn" data-edit="${a.id}">Edit</button>
          <button type="button" class="address-delete-btn" data-delete="${a.id}">Delete</button>
        </div>
      </label>
    `).join('');

    listEl.querySelectorAll('.address-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.address-edit-btn') || e.target.closest('.address-delete-btn')) return;
        selectedAddressId = card.getAttribute('data-address-id');
        clearFieldError(null, document.getElementById('checkout_selectionError'));
        renderAddressList();
      });
    });
    listEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddressForm(btn.getAttribute('data-edit'));
      });
    });
    listEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete');
        await window.MarvelAddresses.deleteAddress(id);
        if (String(selectedAddressId) === String(id)) selectedAddressId = null;
        await renderAddressList();
        window.MarvelShop.showToast('Address removed');
      });
    });
  }

  async function openAddressForm(editId) {
    const form = document.getElementById('addressForm');
    form.hidden = false;
    document.getElementById('addressForm_editId').value = editId || '';

    if (editId) {
      const a = await window.MarvelAddresses.getAddressById(editId);
      if (a) {
        document.getElementById('checkout_fullName').value = a.fullName;
        document.getElementById('checkout_phone').value = a.phone;
        document.getElementById('checkout_address').value = a.address;
        document.getElementById('checkout_city').value = a.city;
        document.getElementById('checkout_state').value = a.state;
        document.getElementById('checkout_zip').value = a.zip;
      }
    } else {
      ['fullName', 'phone', 'address', 'city', 'state', 'zip'].forEach(name => {
        document.getElementById('checkout_' + name).value = '';
      });
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeAddressForm() {
    document.getElementById('addressForm').hidden = true;
  }

  function initAddressForm() {
    document.getElementById('addNewAddressBtn').addEventListener('click', () => openAddressForm(null));
    document.getElementById('cancelAddressBtn').addEventListener('click', closeAddressForm);

    document.getElementById('addressForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const fields = ['fullName', 'phone', 'address', 'city', 'state', 'zip'];
      let valid = true;
      const values = {};

      fields.forEach(name => {
        const input = document.getElementById('checkout_' + name);
        const errorEl = document.getElementById('checkout_' + name + 'Error');
        clearFieldError(input, errorEl);
        const value = input.value.trim();
        values[name] = value;
        if (!value) {
          setFieldError(input, errorEl, 'This field is required.');
          valid = false;
        }
      });

      const phoneInput = document.getElementById('checkout_phone');
      const phoneError = document.getElementById('checkout_phoneError');
      if (values.phone && !/^[\d\s+()-]{7,}$/.test(values.phone)) {
        setFieldError(phoneInput, phoneError, 'Enter a valid phone number.');
        valid = false;
      }

      if (!valid) return;

      const submitBtn = document.getElementById('addressForm').querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const editId = document.getElementById('addressForm_editId').value || null;
      try {
        const saved = await window.MarvelAddresses.upsertAddress(values, editId);
        selectedAddressId = saved.id;
        closeAddressForm();
        await renderAddressList();
        window.MarvelShop.showToast(editId ? 'Address updated' : 'Address saved', 'success');
      } catch (err) {
        window.MarvelShop.showToast(err.message || 'Could not save address', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------------------
     Continue → build pending order → order-review.html
     ------------------------------------------------------------------ */
  function initContinueButton(lines, mode) {
    const btn = document.getElementById('checkoutSubmit');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (lines.length === 0) {
        window.MarvelShop.showToast('Your order is empty.');
        return;
      }

      const emailInput = document.getElementById('checkout_email');
      const emailError = document.getElementById('checkout_emailError');
      clearFieldError(emailInput, emailError);
      const email = emailInput.value.trim();

      let valid = true;
      if (!email) {
        setFieldError(emailInput, emailError, 'Email is required.');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError(emailInput, emailError, 'Enter a valid email address.');
        valid = false;
      }

      const selectionError = document.getElementById('checkout_selectionError');
      clearFieldError(null, selectionError);
      const address = selectedAddressId ? await window.MarvelAddresses.getAddressById(selectedAddressId) : null;
      if (!address) {
        setFieldError(null, selectionError, 'Select a saved address or add a new one to continue.');
        valid = false;
      }

      if (!valid) return;

      const totals = window.MarvelCart.getCartTotals(lines);

      const pendingOrder = {
        mode,
        addressId: address.id, // used by payment.js to call api/orders/create.php
        customer: {
          email,
          fullName: address.fullName,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state: address.state,
          zip: address.zip
        },
        items: lines.map(l => ({
          productId: l.productId,
          name: l.product.name,
          heroName: l.product.heroName,
          image: l.product.image,
          accentA: l.product.accentA,
          accentB: l.product.accentB,
          size: l.size,
          qty: l.qty,
          price: l.product.price,
          finalPrice: l.product.finalPrice
        })),
        totals,
        createdAt: new Date().toISOString()
      };

      window.MarvelShop.writeJSON(PENDING_ORDER_KEY, pendingOrder);
      window.location.href = 'order-review.html';
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('checkoutItems')) return; // not on checkout page
    if (window.MarvelAuth && !window.MarvelAuth.requireLogin('Please log in to checkout.')) return;

    const { mode, lines } = await getCheckoutLines();
    renderOrderSummary(lines);
    renderTotals(lines);
    await renderAddressList();
    initAddressForm();
    initContinueButton(lines, mode);

    if (lines.length === 0) {
      const submitBtn = document.getElementById('checkoutSubmit');
      if (submitBtn) submitBtn.disabled = true;
    }
  });

  window.MarvelCheckout = { getCheckoutLines, PENDING_ORDER_KEY };
})();
