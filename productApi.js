

(function () {
  'use strict';

  // Product data now lives in MySQL, served through the PHP API. Falls back
  // to the static JSON snapshot only if the API is unreachable, so the site
  // still renders (e.g. during local development without XAMPP running).
  const ENDPOINT = 'api/products/list.php';
  const FALLBACK_ENDPOINT = 'data/products.json';

  function rootPrefix() {
    return (window.MarvelShop && window.MarvelShop.rootPrefix) ? window.MarvelShop.rootPrefix() : '';
  }

  async function fetchJsonArray(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('Failed to load product catalog (HTTP ' + response.status + ')');
    }
    const data = await response.json();
    return data;
  }

  /**
   * Fetches the full product catalog from the PHP/MySQL API.
   * @returns {Promise<Array<Object>>}
   * @throws {Error} on network failure or a non-OK HTTP response.
   */
  async function fetchProductCatalog() {
    const url = rootPrefix() + ENDPOINT;
    try {
      const payload = await fetchJsonArray(url);
      if (payload && payload.success && Array.isArray(payload.data)) {
        return payload.data;
      }
      throw new Error((payload && payload.message) || 'Product catalog response had an unexpected shape.');
    } catch (apiErr) {
      // API unreachable (e.g. Apache/MySQL not running yet) — fall back to
      // the bundled JSON snapshot rather than breaking the whole site.
      console.warn('Product API unavailable, falling back to data/products.json:', apiErr.message);
      try {
        const fallback = await fetchJsonArray(rootPrefix() + FALLBACK_ENDPOINT);
        if (!Array.isArray(fallback)) {
          throw new Error('Fallback product catalog response had an unexpected shape.');
        }
        return fallback;
      } catch (fallbackErr) {
        throw new Error('Network error while loading products: ' + fallbackErr.message);
      }
    }
  }

  window.MarvelProductApi = { fetchProductCatalog };
})();
