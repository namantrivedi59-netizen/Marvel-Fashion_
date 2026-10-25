

(function () {
  'use strict';

  // Thin wrapper around fetch() used by every PHP-backed frontend module
  // (cart, wishlist, addresses, coupons, orders, profile). Centralizes:
  //   - same-origin cookies (so the PHP session is sent)
  //   - JSON body encoding
  //   - the { success, data, message } envelope every endpoint returns
  //   - 401 handling: a protected endpoint rejecting the request means the
  //     PHP session expired/was invalidated, so we route that through
  //     MarvelAuth's existing "session expired" flow rather than each
  //     caller reinventing it.

  function rootPrefix() {
    return document.body.getAttribute('data-root') || '';
  }

  async function apiRequest(path, options) {
    options = options || {};
    const opts = Object.assign({ credentials: 'same-origin' }, options);

    if (opts.body !== undefined && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
    if (!opts.method) {
      opts.method = opts.body !== undefined ? 'POST' : 'GET';
    }
    opts.headers = Object.assign(
      opts.body !== undefined ? { 'Content-Type': 'application/json' } : {},
      opts.headers || {}
    );

    let response;
    try {
      response = await fetch(rootPrefix() + path, opts);
    } catch (networkErr) {
      throw new Error('Network error: could not reach the server.');
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseErr) {
      throw new Error('Unexpected server response.');
    }

    if (!payload.success) {
      if (response.status === 401 && window.MarvelAuth && window.MarvelAuth.handleSessionExpired) {
        window.MarvelAuth.handleSessionExpired();
      }
      const err = new Error(payload.message || 'Request failed.');
      err.status = response.status;
      throw err;
    }

    return payload.data;
  }

  window.MarvelApi = { request: apiRequest };
})();
