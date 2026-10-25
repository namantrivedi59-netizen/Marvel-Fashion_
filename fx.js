

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- custom cursor ---------------- */

  function initCursor() {
    if (reduced || !isFinePointer) {
      console.info(`[MarvelCursor] Custom cursor not initialized. reduced=${reduced} isFinePointer=${isFinePointer}.` +
        (reduced ? ' prefers-reduced-motion is TRUE — check your OS/browser "reduce motion" accessibility setting or a devtools media-feature emulation override left on.' : '') +
        (!isFinePointer ? ' (hover:hover) and (pointer:fine) is FALSE — on a normal desktop mouse this should be true; check devtools device/touch emulation is off.' : ''));
      return;
    }
    console.info('[MarvelCursor] Initializing custom cursor (dot + ring).');
    document.documentElement.classList.add('mf-custom-cursor');

    const dot = document.createElement('div');
    dot.className = 'mf-cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'mf-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let ringX = window.innerWidth / 2, ringY = window.innerHeight / 2;
    let targetX = ringX, targetY = ringY;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX; targetY = e.clientY;
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });

    function loop() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    const interactiveSelector = 'a, button, .cat-btn, .btn, .product-card, .size-btn, input, .check-wrap, .toggle-password, .fav-btn';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelector)) ring.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelector)) ring.classList.remove('is-active');
    });
    document.addEventListener('mousedown', () => ring.classList.add('is-active'));
    document.addEventListener('mouseup', () => ring.classList.remove('is-active'));
  }

  /* ---------------- magnetic hover for buttons ---------------- */

  function initMagneticButtons() {
    if (reduced || !isFinePointer) return;
    const magnets = document.querySelectorAll('.cat-btn, .btn-primary, .auth-submit, .google-btn, .btn-solid-sm, .btn-ghost-sm, .buy-now-btn, .pay-method-btn, #checkoutSubmit, #confirmOrderBtn, #applyCouponBtn, #invoicePrintBtn');
    magnets.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- button ripple on click ---------------- */

  function initRipples() {
    const selector = '.btn, .cat-btn, .auth-submit, .google-btn, .add-cart-btn, .nav-logout-btn, .size-btn, .qty-btn, .fav-btn, .mf-modal-actions button, .btn-solid-sm, .btn-ghost-sm, .buy-now-btn, .pay-method-btn, .cart-qty-minus, .cart-qty-plus, [data-track], [data-reorder], #applyCouponBtn, #removeCouponBtn, #confirmOrderBtn, #invoicePrintBtn, #addNewAddressBtn, #saveAddressBtn, #cancelAddressBtn';
    document.addEventListener('click', (e) => {
      const target = e.target.closest(selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 1.4;
      ripple.className = 'mf-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      const computed = getComputedStyle(target).position;
      if (computed === 'static') target.style.position = 'relative';
      target.style.overflow = target.style.overflow || 'hidden';
      target.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* ---------------- product card 3D tilt ---------------- */

  function initCardTilt() {
    if (reduced || !isFinePointer) return;
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tiltX', `${(-py * 8).toFixed(2)}deg`);
        card.style.setProperty('--tiltY', `${(px * 8).toFixed(2)}deg`);
        card.style.transform = `rotateX(var(--tiltX)) rotateY(var(--tiltY)) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

 
  function initShopCardTilt() {
    if (reduced || !isFinePointer) return;
    document.querySelectorAll('.shop-card, .order-card, .address-card').forEach(card => {
      card.style.transformStyle = 'preserve-3d';
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * 2.5).toFixed(2)}deg) rotateY(${(px * 2.5).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------- navbar sliding indicator ---------------- */

  function initNavIndicator() {
    const list = document.querySelector('.nav-links');
    if (!list) return;
    const indicator = document.createElement('li');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    list.appendChild(indicator);

    list.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('mouseenter', () => {
        const listRect = list.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        indicator.style.left = (linkRect.left - listRect.left) + 'px';
        indicator.style.width = linkRect.width + 'px';
      });
    });
  }

  /* ---------------- text reveal (letter / word) ---------------- */

  function splitWords(el) {
    
    const link = el.querySelector(':scope > a');
    const target = link || el;

    const words = target.textContent.trim().split(/\s+/);
    target.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'rv-word';
      span.style.setProperty('--i', i);
      span.textContent = word;
      target.appendChild(span);
      target.appendChild(document.createTextNode(' '));
    });
    return words.length;
  }

  function armReveal(el, wordCount) {
    el.classList.add('reveal-armed');
    const settleTime = wordCount * 50 + 900; // matches the CSS stagger + duration
    setTimeout(() => { el.classList.add('reveal-done'); }, settleTime);
  }

  function initTextReveal() {
    const targets = document.querySelectorAll('.landing-title, .loader-title, .product-hero-title, .auth-card-heading, .profile-section-title');
    targets.forEach(el => {
      if (el.dataset.rvDone) return;
      el.dataset.rvDone = '1';
      const count = splitWords(el);
      armReveal(el, count);
    });

    document.querySelectorAll('.hero-content .hero-title').forEach(el => {
      if (el.dataset.rvDone) return;
      el.dataset.rvDone = '1';
      const count = splitWords(el);
      const parent = el.closest('.hero-content');
      if (!parent) return;

      if (parent.classList.contains('in-view')) {
        armReveal(el, count);
        return;
      }
      const mo = new MutationObserver(() => {
        if (parent.classList.contains('in-view')) {
          armReveal(el, count);
          mo.disconnect();
        }
      });
      mo.observe(parent, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ---------------- easter eggs ---------------- */

  const ACH_KEY = 'mf_achievements';

  function getAchievements() {
    const key = window.MarvelShop ? window.MarvelShop.scopedKey(ACH_KEY) : ACH_KEY;
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  }
  function unlockAchievement(id, title, name, icon) {
    const list = getAchievements();
    if (list.includes(id)) return;
    list.push(id);
    const key = window.MarvelShop ? window.MarvelShop.scopedKey(ACH_KEY) : ACH_KEY;
    localStorage.setItem(key, JSON.stringify(list));
    showAchievementToast(title, name, icon);
  }
  window.MarvelFX = window.MarvelFX || {};
  window.MarvelFX.getAchievements = getAchievements;
  window.MarvelFX.unlockAchievement = unlockAchievement;

  function showAchievementToast(title, name, icon) {
    let toast = document.getElementById('mfAchievementToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mfAchievementToast';
      toast.className = 'mf-achievement';
      toast.innerHTML = `
        <div class="mf-achievement-icon">${icon}</div>
        <div>
          <p class="mf-achievement-title">${title}</p>
          <p class="mf-achievement-name">${name}</p>
        </div>`;
      document.body.appendChild(toast);
    } else {
      toast.querySelector('.mf-achievement-icon').textContent = icon;
      toast.querySelector('.mf-achievement-title').textContent = title;
      toast.querySelector('.mf-achievement-name').textContent = name;
    }
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }

  function initKonamiCode() {
    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let progress = 0;
    document.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      progress = (key === sequence[progress]) ? progress + 1 : (key === sequence[0] ? 1 : 0);
      if (progress === sequence.length) {
        progress = 0;
        document.documentElement.style.animation = 'none';
        document.body.style.transition = 'filter 1.2s ease';
        document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        setTimeout(() => { document.body.style.filter = ''; }, 1400);
        unlockAchievement('konami', 'Achievement Unlocked', 'True Believer', '⚡');
      }
    });
  }

  function initLogoEasterEgg() {
    document.querySelectorAll('.nav-logo').forEach(logo => {
      let clicks = 0, timer = null;
      logo.style.cursor = logo.style.cursor || 'pointer';
      logo.addEventListener('click', (e) => {
        clicks++;
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, 900);
        if (clicks >= 5) {
          clicks = 0;
          e.preventDefault();
          logo.animate(
            [
              { transform: 'scale(1) rotate(0)' },
              { transform: 'scale(1.3) rotate(-8deg)' },
              { transform: 'scale(1.3) rotate(8deg)' },
              { transform: 'scale(1) rotate(0)' }
            ],
            { duration: 600, easing: 'ease-in-out' }
          );
          unlockAchievement('logo-tap', 'Achievement Unlocked', 'Secret Identity', '🕶️');
        }
      });
    });
  }

  /* ---------------- init ---------------- */

  document.addEventListener('DOMContentLoaded', () => {
    
    try { initTextReveal(); } catch (e) { console.error('MarvelFX textReveal failed:', e); }

    initCursor();
    initMagneticButtons();
    initRipples();
    initCardTilt();
    initShopCardTilt();
    initNavIndicator();
    initKonamiCode();
    initLogoEasterEgg();
  });
})();
