
(function () {
  'use strict';

  function wireInteractivity(grid) {
    if (window.MarvelProductCard) window.MarvelProductCard.init(grid);
    if (window.MarvelWishlist && window.MarvelWishlist.initFavButtons) window.MarvelWishlist.initFavButtons(grid);
    if (window.MarvelCart && window.MarvelCart.initProductCardButtons) window.MarvelCart.initProductCardButtons(grid);
  }

  async function loadGrid(grid) {
    const hero = grid.getAttribute('data-hero');
    const category = grid.getAttribute('data-category');
    if (!hero || !category) return;

    window.MarvelProductRenderer.renderSkeletons(grid, 4);

    try {
      const products = await window.MarvelProductService.getProductsByCategory(hero, category);
      if (!products.length) {
        window.MarvelProductRenderer.renderEmpty(grid, 'No products found in this collection yet.');
        return;
      }
      window.MarvelProductRenderer.renderGrid(grid, products);
      wireInteractivity(grid);
    } catch (err) {
      console.error('MARVEL FASHION: failed to load products for', hero, category, err);
      window.MarvelProductRenderer.renderError(
        grid,
        'Could not load products right now. Please check your connection and try again.',
        () => loadGrid(grid)
      );
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.product-grid[data-hero][data-category]').forEach(loadGrid);
  });
})();
