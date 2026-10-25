

(function () {
  'use strict';

  const MOTION_KEY = 'mf_force_reduced_motion';
  const EMAIL_PREF_KEY = 'mf_email_updates';

  // Client-only UI preferences (not business data) — explicitly fine to
  // keep in localStorage per the migration spec. Everything else on this
  // page (account details, wishlist, order history) now comes from the
  // PHP/MySQL API.
  const ACHIEVEMENT_CATALOG = [
    { id: 'welcome-hero', icon: '🎉', title: 'Welcome, Hero', desc: 'Created your account.' },
    { id: 'collector', icon: '❤️', title: 'Collector', desc: 'Favorited your first item.' },
    { id: 'logo-tap', icon: '🕶️', title: 'Secret Identity', desc: 'Clicked the logo 5 times fast.' },
    { id: 'konami', icon: '⚡', title: 'True Believer', desc: 'Entered the secret code.' }
  ];

  async function renderAccount(user) {
    const first = user.fullName.split(' ')[0];
    const initials = user.fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

    document.getElementById('profileAvatar').textContent = initials || 'MF';
    document.getElementById('profileName').textContent = user.fullName;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('tileName').textContent = user.fullName;
    document.getElementById('tileEmail').textContent = user.email;

    let since = '—';
    try {
      const profile = await window.MarvelApi.request('api/profile/get.php');
      if (profile && profile.memberSince) {
        since = new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
    } catch (e) { /* leave as em dash */ }
    document.getElementById('tileSince').textContent = since;

    void first; // reserved for future personalization
  }

  async function renderWishlist() {
    const container = document.getElementById('wishlistContainer');
    const products = window.MarvelWishlist ? await window.MarvelWishlist.getWishlistProducts() : [];

    if (!products.length) {
      container.innerHTML = '<div class="wishlist-empty">Your wishlist is empty. Tap the heart icon on any product to save it here.</div>';
      return;
    }

    container.innerHTML = '<div class="wishlist-grid"></div>';
    const grid = container.querySelector('.wishlist-grid');

    products.forEach((product) => {
      const card = document.createElement('div');
      card.className = 'wishlist-item';
      card.innerHTML = `
        <button type="button" class="wishlist-remove" aria-label="Remove from wishlist">✕</button>
        <h4>${escapeHtml(product.name)}</h4>
        <p>${escapeHtml(product.heroName)}</p>
        <p>$${product.price.toFixed(2)}</p>`;
      card.querySelector('.wishlist-remove').addEventListener('click', async () => {
        await window.MarvelWishlist.removeFromWishlist(product.id);
        renderWishlist();
      });
      grid.appendChild(card);
    });
  }

  async function renderOrderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;

    let orders = [];
    try {
      orders = await window.MarvelApi.request('api/orders/list.php');
    } catch (e) { /* show empty state below */ }

    if (!orders.length) {
      container.innerHTML = '<div class="history-empty">No purchases yet. Your orders will appear here after checkout.</div>';
      return;
    }

    const shop = window.MarvelShop;
    const recent = orders.slice(0, 3);
    container.innerHTML = recent.map(order => `
      <div class="wishlist-item" style="margin-bottom: 14px;">
        <h4>Order ${escapeHtml(shop.formatOrderCode(order.id))}</h4>
        <p>${new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${escapeHtml(order.paymentMethod || '')}</p>
        <p>${order.items.map(i => escapeHtml(i.name) + ' × ' + i.qty).join(', ')}</p>
        <p>$${order.total.toFixed(2)}</p>
        <div style="display:flex; gap:14px; margin-top:8px;">
          <a href="pages/orders.html" style="font-size:0.78rem; text-decoration:underline;">Track</a>
          <a href="pages/invoice.html?orderId=${encodeURIComponent(order.id)}" style="font-size:0.78rem; text-decoration:underline;">Invoice</a>
        </div>
      </div>
    `).join('') + `
      <a href="pages/orders.html" class="btn-ghost-sm" style="display:inline-block; margin-top: 8px; text-decoration:none; text-align:center; padding: 10px 22px;">View All Orders (${orders.length})</a>
    `;
  }

  function renderAchievements() {
    const container = document.getElementById('achievementsContainer');
    const unlocked = (window.MarvelFX && window.MarvelFX.getAchievements) ? window.MarvelFX.getAchievements() : [];

    container.innerHTML = '';
    ACHIEVEMENT_CATALOG.forEach(item => {
      const isUnlocked = unlocked.includes(item.id);
      const card = document.createElement('div');
      card.className = 'achievement-card' + (isUnlocked ? ' unlocked' : '');
      card.innerHTML = `
        <div class="icon">${item.icon}</div>
        <h4>${isUnlocked ? item.title : '???'}</h4>
        <p>${isUnlocked ? item.desc : 'Locked — keep exploring.'}</p>`;
      container.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setupSettings() {
    const motionToggle = document.getElementById('reduceMotionToggle');
    const emailToggle = document.getElementById('emailUpdatesToggle');

    const motionOn = localStorage.getItem(window.MarvelShop.scopedKey(MOTION_KEY)) === '1';
    motionToggle.classList.toggle('on', motionOn);
    motionToggle.setAttribute('aria-pressed', String(motionOn));
    if (motionOn) document.documentElement.classList.add('force-reduced-motion');

    motionToggle.addEventListener('click', () => {
      const nowOn = !motionToggle.classList.contains('on');
      motionToggle.classList.toggle('on', nowOn);
      motionToggle.setAttribute('aria-pressed', String(nowOn));
      localStorage.setItem(window.MarvelShop.scopedKey(MOTION_KEY), nowOn ? '1' : '0');
      document.documentElement.classList.toggle('force-reduced-motion', nowOn);
    });

    const emailOn = localStorage.getItem(window.MarvelShop.scopedKey(EMAIL_PREF_KEY)) !== '0';
    emailToggle.classList.toggle('on', emailOn);
    emailToggle.setAttribute('aria-pressed', String(emailOn));

    emailToggle.addEventListener('click', () => {
      const nowOn = !emailToggle.classList.contains('on');
      emailToggle.classList.toggle('on', nowOn);
      emailToggle.setAttribute('aria-pressed', String(nowOn));
      localStorage.setItem(window.MarvelShop.scopedKey(EMAIL_PREF_KEY), nowOn ? '1' : '0');
    });
  }

  function setupSidebarNav() {
    const links = document.querySelectorAll('.profile-nav a[href^="#"]:not(.logout-trigger)');
    const sections = Array.from(links).map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

    links.forEach(link => {
      link.addEventListener('click', () => {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = '#' + entry.target.id;
          links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === id));
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => io.observe(s));
  }

  function setupLogout() {
    const trigger = document.getElementById('profileLogoutTrigger');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.MarvelAuth) window.MarvelAuth.requestLogout('index.html');
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = window.MarvelAuth ? window.MarvelAuth.getCurrentUser() : null;
    if (!user) return;
    setupLogout();

    const steps = [renderAccount, renderWishlist, renderOrderHistory, renderAchievements, setupSettings, setupSidebarNav];
    for (const step of steps) {
      try {
        await (step === renderAccount ? step(user) : step());
      } catch (e) {
        console.error('[profile] ' + step.name + ' failed:', e);
      }
    }
  });
})();
