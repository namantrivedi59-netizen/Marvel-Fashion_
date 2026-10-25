

(function () {
  'use strict';

  function init(root) {
    (root || document).querySelectorAll('.product-card').forEach(card => {
      const sizeBtns = card.querySelectorAll('.size-btn');
      sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          sizeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      const qtyValue = card.querySelector('.qty-value');
      const minusBtn = card.querySelector('.qty-minus');
      const plusBtn = card.querySelector('.qty-plus');
      if (qtyValue && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', () => {
          let val = parseInt(qtyValue.textContent, 10);
          if (val > 1) qtyValue.textContent = val - 1;
        });
        plusBtn.addEventListener('click', () => {
          let val = parseInt(qtyValue.textContent, 10);
          if (val < 10) qtyValue.textContent = val + 1;
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => init(document));

  window.MarvelProductCard = { init };
})();
