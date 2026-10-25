

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.getAttribute('data-glow') !== 'true' || window.__mfAuroraActive) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = window.matchMedia('(max-width: 760px)').matches;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const enableParallax = !reduced && isFinePointer;
    const enableCursorBloom = !reduced && isFinePointer && !isSmallScreen;

    /* ---------------- build the layer ---------------- */
    const layer = document.createElement('div');
    layer.className = 'mf-glow-layer';
    layer.setAttribute('aria-hidden', 'true');

    const parallaxWrap = document.createElement('div');
    parallaxWrap.className = 'mf-glow-parallax';

    ['crimson', 'purple', 'blue', 'cyan', 'emerald'].forEach(color => {
      const blob = document.createElement('div');
      blob.className = `mf-glow-blob mf-glow-blob--${color}`;
      parallaxWrap.appendChild(blob);
    });
    layer.appendChild(parallaxWrap);
    document.body.prepend(layer);

    const grain = document.createElement('div');
    grain.className = 'mf-glow-grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.prepend(grain);

    if (!reduced && !isSmallScreen) {
      const streak = document.createElement('div');
      streak.className = 'mf-light-streak';
      streak.setAttribute('aria-hidden', 'true');
      document.body.prepend(streak);
    }

    let bloom = null;
    if (enableCursorBloom) {
      bloom = document.createElement('div');
      bloom.className = 'mf-glow-cursor';
      bloom.setAttribute('aria-hidden', 'true');
      document.body.prepend(bloom);
    }

    /* ---------------- spring-driven parallax + cursor bloom ---------------- */
    let targetX = 0, targetY = 0;
    let parX = 0, parY = 0;
    let bloomX = window.innerWidth / 2, bloomY = window.innerHeight / 2;
    let bloomCurX = bloomX, bloomCurY = bloomY;
    let pointerActive = false;

    if (enableParallax || enableCursorBloom) {
      window.addEventListener('mousemove', (e) => {
        pointerActive = true;
        if (enableParallax) {
          targetX = (e.clientX / window.innerWidth - 0.5) * 40; // quieter range than the shop pages
          targetY = (e.clientY / window.innerHeight - 0.5) * 40;
        }
        if (enableCursorBloom) {
          bloomX = e.clientX;
          bloomY = e.clientY;
          if (bloom) bloom.classList.add('is-visible');
        }
      }, { passive: true });

      window.addEventListener('mouseleave', () => {
        if (bloom) bloom.classList.remove('is-visible');
      });
    }

    function tick() {
      if (enableParallax) {
        parX += (targetX - parX) * 0.05;
        parY += (targetY - parY) * 0.05;
        parallaxWrap.style.setProperty('--mf-glow-x', parX.toFixed(2) + 'px');
        parallaxWrap.style.setProperty('--mf-glow-y', parY.toFixed(2) + 'px');
      }
      if (enableCursorBloom && pointerActive) {
        bloomCurX += (bloomX - bloomCurX) * 0.12;
        bloomCurY += (bloomY - bloomCurY) * 0.12;
        bloom.style.transform = `translate3d(${bloomCurX.toFixed(1)}px, ${bloomCurY.toFixed(1)}px, 0)`;
      }
      requestAnimationFrame(tick);
    }

    if (enableParallax || enableCursorBloom) {
      requestAnimationFrame(tick);
    }

    if (!reduced) {
      setInterval(() => {
        const gx = -(Math.random() * 40).toFixed(0);
        const gy = -(Math.random() * 40).toFixed(0);
        grain.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      }, 220);
    }
  });
})();
