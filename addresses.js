

(function () {
  'use strict';

  // Addresses now live in MySQL via api/addresses/*.php. This module keeps
  // the exact field names the rest of the app already uses (`address`,
  // `zip`) by mapping them to/from the API's `line1`/`pincode` here, so
  // checkout.js / order-review.js / invoice.js need no changes for that.

  let addressCache = [];
  let loadedPromise = null;

  function mapFromApi(a) {
    return {
      id: a.id,
      fullName: a.fullName,
      phone: a.phone,
      address: a.line1,
      city: a.city,
      state: a.state,
      zip: a.pincode,
      isDefault: !!a.isDefault
    };
  }

  async function refreshAddresses() {
    if (!window.MarvelAuth || !window.MarvelAuth.getCurrentUser()) {
      addressCache = [];
      return addressCache;
    }
    try {
      const data = await window.MarvelApi.request('api/addresses/list.php');
      addressCache = (data || []).map(mapFromApi);
    } catch (e) {
      addressCache = [];
    }
    return addressCache;
  }

  // Callers that need the address list must await this once per page
  // load; it's memoized so repeated calls after the first are instant.
  function ensureAddressesLoaded() {
    if (!loadedPromise) loadedPromise = refreshAddresses();
    return loadedPromise;
  }

  async function getAddresses() {
    await ensureAddressesLoaded();
    return addressCache.slice();
  }

  async function getDefaultAddress() {
    const list = await getAddresses();
    return list.find(a => a.isDefault) || list[0] || null;
  }

  async function getAddressById(id) {
    const list = await getAddresses();
    // ids coming from DOM attributes arrive as strings; DB ids are numeric.
    return list.find(a => String(a.id) === String(id)) || null;
  }

  async function upsertAddress(fields, id) {
    const body = {
      id: id || undefined,
      fullName: fields.fullName,
      phone: fields.phone,
      line1: fields.address,
      city: fields.city,
      state: fields.state,
      pincode: fields.zip,
      // First address saved automatically becomes the default, same as before.
      isDefault: id ? undefined : addressCache.length === 0
    };
    const result = await window.MarvelApi.request('api/addresses/save.php', { body });
    loadedPromise = null; // force a fresh fetch next time so isDefault/order stays correct
    await ensureAddressesLoaded();
    return await getAddressById(result.id);
  }

  async function deleteAddress(id) {
    await window.MarvelApi.request('api/addresses/delete.php', { body: { id } });
    loadedPromise = null;
    await ensureAddressesLoaded();
  }

  async function setDefaultAddress(id) {
    await window.MarvelApi.request('api/addresses/default.php', { body: { id } });
    loadedPromise = null;
    await ensureAddressesLoaded();
  }

  window.MarvelAddresses = {
    ensureAddressesLoaded,
    getAddresses,
    getDefaultAddress,
    getAddressById,
    upsertAddress,
    deleteAddress,
    setDefaultAddress
  };
})();
