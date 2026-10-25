

(function () {
  'use strict';

  let catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = window.MarvelProductApi.fetchProductCatalog().catch(err => {
        
        catalogPromise = null;
        throw err;
      });
    }
    return catalogPromise;
  }

  /** @returns {Promise<Array<{key:string, name:string}>>} */
  async function getHeroes() {
    const products = await loadCatalog();
    const seen = new Map();
    products.forEach(p => {
      if (!seen.has(p.hero)) seen.set(p.hero, { key: p.hero, name: p.heroName });
    });
    return Array.from(seen.values());
  }

  /** @param {string} hero @returns {Promise<Array<Object>>} */
  async function getHeroProducts(hero) {
    const products = await loadCatalog();
    return products.filter(p => p.hero === hero);
  }

  /** @param {string} hero @param {string} category @returns {Promise<Array<Object>>} */
  async function getProductsByCategory(hero, category) {
    const products = await loadCatalog();
    return products.filter(p => p.hero === hero && p.category === category);
  }

  /** @returns {Promise<Array<Object>>} */
  async function getFeaturedProducts() {
    const products = await loadCatalog();
    return products.filter(p => p.featured);
  }

  /** @param {string} id @returns {Promise<Object|null>} */
  async function getProductById(id) {
    const products = await loadCatalog();
    return products.find(p => p.id === id) || null;
  }

  /** @param {string} query @returns {Promise<Array<Object>>} */
  async function searchProducts(query) {
    const products = await loadCatalog();
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.heroName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  window.MarvelProductService = {
    getHeroes,
    getHeroProducts,
    getProductsByCategory,
    getFeaturedProducts,
    getProductById,
    searchProducts
  };
})();
