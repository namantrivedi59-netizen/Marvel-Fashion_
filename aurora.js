

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const onHomepage = document.body.getAttribute('data-glow') === 'true';
    if (!onHomepage) return; // internal pages now use js/liquid-bg.js instead

    // Let hero-glow.js know this page already has the full aurora effect
    // running, so it doesn't also inject its own (quieter) duplicate layer.
    window.__mfAuroraActive = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = window.matchMedia('(max-width: 760px)').matches;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const enableParallax = !reduced && isFinePointer;
    const enableCursorBloom = !reduced && isFinePointer && !isSmallScreen;
    const enableBlobReactivity = !reduced && isFinePointer;

    /* ---------------- build the layer ---------------- */
    const layer = document.createElement('div');
    layer.className = 'mf-aurora-layer';
    layer.setAttribute('aria-hidden', 'true');

    const farWrap = document.createElement('div');
    farWrap.className = 'mf-aurora-depth mf-aurora-depth--far';
    const nearWrap = document.createElement('div');
    nearWrap.className = 'mf-aurora-depth mf-aurora-depth--near';

    // Far layer: bigger, slower-feeling colors. Near layer: the rest.
    const farColors = ['purple', 'blue', 'emerald'];
    const nearColors = ['indigo', 'cyan', 'pink'];

    const blobs = [];
    farColors.forEach(color => {
      const blob = document.createElement('div');
      blob.className = `mf-aurora-blob mf-aurora-blob--${color}`;
      farWrap.appendChild(blob);
      blobs.push(blob);
    });
    nearColors.forEach(color => {
      const blob = document.createElement('div');
      blob.className = `mf-aurora-blob mf-aurora-blob--${color}`;
      nearWrap.appendChild(blob);
      blobs.push(blob);
    });

    layer.appendChild(farWrap);
    layer.appendChild(nearWrap);
    document.body.prepend(layer);

    if (!reduced && !isSmallScreen) {
      const beamWrap = document.createElement('div');
      beamWrap.className = 'mf-aurora-layer';
      beamWrap.style.zIndex = '1';
      beamWrap.setAttribute('aria-hidden', 'true');
      [1, 2, 3].forEach(n => {
        const beam = document.createElement('div');
        beam.className = `mf-aurora-beam mf-aurora-beam--${n}`;
        beamWrap.appendChild(beam);
      });
      document.body.prepend(beamWrap);
    }

    const vignette = document.createElement('div');
    vignette.className = 'mf-aurora-vignette';
    vignette.setAttribute('aria-hidden', 'true');
    document.body.prepend(vignette);

    const grain = document.createElement('div');
    grain.className = 'mf-grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.prepend(grain);

    let bloom = null;
    if (enableCursorBloom) {
      bloom = document.createElement('div');
      bloom.className = 'mf-cursor-bloom';
      bloom.setAttribute('aria-hidden', 'true');
      document.body.prepend(bloom);
    }

    /* ---------------- spring-driven parallax (two depths) ---------------- */
    let targetX = 0, targetY = 0;
    let parX = 0, parY = 0;         // far layer (slower response)
    let parXNear = 0, parYNear = 0; // near layer (faster response = more depth)
    let bloomX = window.innerWidth / 2, bloomY = window.innerHeight / 2;
    let bloomCurX = bloomX, bloomCurY = bloomY;
    let cursorX = -9999, cursorY = -9999;
    let pointerActive = false;

    if (enableParallax || enableCursorBloom || enableBlobReactivity) {
      window.addEventListener('mousemove', (e) => {
        pointerActive = true;
        cursorX = e.clientX;
        cursorY = e.clientY;
        if (enableParallax) {
          targetX = (e.clientX / window.innerWidth - 0.5) * 50;
          targetY = (e.clientY / window.innerHeight - 0.5) * 50;
        }
        if (enableCursorBloom) {
          bloomX = e.clientX;
          bloomY = e.clientY;
          if (bloom) bloom.classList.add('is-visible');
        }
      }, { passive: true });

      window.addEventListener('mouseleave', () => {
        cursorX = -9999; cursorY = -9999;
        if (bloom) bloom.classList.remove('is-visible');
      });
    }

    // Track each blob's current "boost" (0..1) so it eases in/out with
    // its own spring rather than snapping when the cursor enters/leaves
    // its influence radius.
    const blobState = blobs.map(() => ({ boost: 0 }));
    const INFLUENCE_RADIUS = 340; // px

    function updateBlobReactivity() {
      blobs.forEach((blob, i) => {
        const rect = blob.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(cursorX - cx, cursorY - cy);
        const target = dist < INFLUENCE_RADIUS ? (1 - dist / INFLUENCE_RADIUS) : 0;

        const state = blobState[i];
        state.boost += (target - state.boost) * 0.08; // spring ease, never snaps

        if (state.boost > 0.02) {
          blob.classList.add('mf-near-cursor');
          blob.style.setProperty('--mf-glow-boost', state.boost.toFixed(3));
        } else {
          blob.classList.remove('mf-near-cursor');
          blob.style.removeProperty('--mf-glow-boost');
        }
      });
    }

    function tick() {
      if (enableParallax) {
        parX += (targetX - parX) * 0.05;
        parY += (targetY - parY) * 0.05;
        parXNear += (targetX * 1.8 - parXNear) * 0.07; // near layer moves further = depth
        parYNear += (targetY * 1.8 - parYNear) * 0.07;
        farWrap.style.setProperty('--mf-par-x', parX.toFixed(2) + 'px');
        farWrap.style.setProperty('--mf-par-y', parY.toFixed(2) + 'px');
        nearWrap.style.setProperty('--mf-par-x-near', parXNear.toFixed(2) + 'px');
        nearWrap.style.setProperty('--mf-par-y-near', parYNear.toFixed(2) + 'px');
      }
      if (enableCursorBloom && pointerActive) {
        bloomCurX += (bloomX - bloomCurX) * 0.16;
        bloomCurY += (bloomY - bloomCurY) * 0.16;
        bloom.style.transform = `translate3d(${bloomCurX.toFixed(1)}px, ${bloomCurY.toFixed(1)}px, 0)`;
      }
      if (enableBlobReactivity) {
        updateBlobReactivity();
      }
      requestAnimationFrame(tick);
    }

    if (enableParallax || enableCursorBloom || enableBlobReactivity) {
      requestAnimationFrame(tick);
    }

    /* ---------------- periodic grain "flicker" (cheap, not per-frame) ---------------- */
    if (!reduced) {
      setInterval(() => {
        const gx = -(Math.random() * 40).toFixed(0);
        const gy = -(Math.random() * 40).toFixed(0);
        grain.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      }, 180);
    }
  });
})();
