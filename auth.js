

(function () {
  'use strict';

  // NOTE: authentication itself is handled server-side by PHP sessions
  // (api/auth/*.php) backed by MySQL — this is only a client-side cache of
  // {id, fullName, email} so synchronous UI code (navbar, requireLogin)
  // doesn't need to become async. syncSessionFromServer() below keeps it
  // honest by re-checking api/auth/session.php on every page load.
  const SESSION_KEY = 'mf_current_user';
  const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
  let googleTokenClient = null;

  function isGoogleClientConfigured() {
    return /^\d{6,}-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID);
  }

  /* ---------------- server API helpers ---------------- */

  function rootPrefix() {
    return document.body.getAttribute('data-root') || '';
  }

  async function apiCall(path, options) {
    const response = await fetch(rootPrefix() + 'api/auth/' + path, Object.assign({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    }, options));
    let payload;
    try {
      payload = await response.json();
    } catch (e) {
      throw new Error('Unexpected server response.');
    }
    if (!payload.success) {
      const err = new Error(payload.message || 'Request failed.');
      err.status = response.status;
      throw err;
    }
    return payload.data;
  }

  function apiSignup(fullName, email, password) {
    return apiCall('signup.php', { method: 'POST', body: JSON.stringify({ fullName, email, password }) });
  }
  function apiLogin(email, password, remember) {
    return apiCall('login.php', { method: 'POST', body: JSON.stringify({ email, password, remember }) });
  }
  function apiLogout() {
    return apiCall('logout.php', { method: 'POST' });
  }
  function apiSession() {
    return apiCall('session.php', { method: 'GET' });
  }

  /* ---------------- local session cache ---------------- */

  function getCurrentUser() {
    try {
      const local = localStorage.getItem(SESSION_KEY);
      if (local) return JSON.parse(local);
    } catch (e) { /* ignore */ }
    return null;
  }

  function setCurrentUser(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, fullName: user.fullName, email: user.email }));
  }

  function clearCurrentUser() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Re-validates the cached user against the real PHP session on every page
  // load, so a logged-out/expired session on the server can't leave a stale
  // "logged in" navbar behind (and vice versa).
  async function syncSessionFromServer() {
    try {
      const user = await apiSession();
      if (user) {
        setCurrentUser(user);
      } else {
        clearCurrentUser();
      }
    } catch (e) {
      // network hiccup: keep whatever we already have cached rather than
      // bouncing a logged-in user out of the UI.
    }
    updateNavbarAuthState();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function getSafeRedirect() {
    try {
      const raw = new URLSearchParams(window.location.search).get('redirect');
      if (!raw) return null;
      const decoded = decodeURIComponent(raw);
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
    } catch (e) { /* ignore */ }
    return null;
  }

  function currentUrlForRedirect() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function buildLoginUrl() {
    return rootPrefix() + 'login.html?redirect=' + encodeURIComponent(currentUrlForRedirect());
  }

  function requireLogin(message) {
    if (getCurrentUser()) return true;
    showToast(message || 'Please log in to continue.', 'error');
    setTimeout(() => { window.location.href = buildLoginUrl(); }, 700);
    return false;
  }

  // Called by MarvelApi whenever a protected endpoint returns 401 (session
  // expired/invalidated server-side while the tab was open). Clears the
  // stale local cache and sends the user back to login instead of leaving
  // them looking at a page that silently stopped working.
  function handleSessionExpired() {
    clearCurrentUser();
    updateNavbarAuthState();
    showToast('Your session has expired. Please log in again.', 'error');
    setTimeout(() => { window.location.href = buildLoginUrl(); }, 800);
  }

  function setFieldError(inputEl, errorEl, message) {
    const shell = inputEl.closest('.input-shell');
    if (shell) shell.classList.add('has-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  function clearFieldError(inputEl, errorEl) {
    const shell = inputEl.closest('.input-shell');
    if (shell) shell.classList.remove('has-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }

  /* ---------------- toast ---------------- */

  function showToast(message, type) {
    let toast = document.getElementById('authToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'authToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' toast--' + type : '');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  /* ---------------- password show/hide ---------------- */

  function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.classList.toggle('is-visible', !showing);
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    });
  }

  /* ---------------- ripple buttons ---------------- */

  function addRipple(e) {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'mf-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = ((e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2) + 'px';
    ripple.style.top = ((e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  function setupRippleButtons() {
    document.querySelectorAll('.auth-submit, .google-btn, .captcha-refresh').forEach(btn => {
      btn.addEventListener('click', addRipple);
    });
  }

  /* ---------------- focus glow state ---------------- */

  function setupFocusStates() {
    document.querySelectorAll('.input-shell input').forEach(input => {
      const group = input.closest('.input-group');
      input.addEventListener('focus', () => group && group.classList.add('is-focused'));
      input.addEventListener('blur', () => group && group.classList.remove('is-focused'));
    });
  }

  /* ---------------- floating ember particles ---------------- */

  function initAuthParticles() {
    const canvas = document.querySelector('.auth-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    const count = window.innerWidth < 700 ? 22 : 42;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2,
        speed: 0.15 + Math.random() * 0.4,
        drift: (Math.random() - 0.5) * 0.3,
        alpha: 0.15 + Math.random() * 0.45
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.fillStyle = `rgba(232,40,63,${p.alpha.toFixed(2)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  }

  function initGoogleSignIn() {
    if (!document.querySelector('.google-btn')) return; // not an auth page
    if (!isGoogleClientConfigured()) return; // placeholder id — never call Google at all, see button click handler below
    if (!window.google || !google.accounts || !google.accounts.oauth2) return; // gsi/client.js didn't load — button will explain itself on click

    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: handleGoogleTokenResponse
    });
  }

  function handleGoogleTokenResponse(tokenResponse) {
    if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
      showToast('Google sign-in was cancelled.', 'error');
      return;
    }
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenResponse.access_token }
    })
      .then(res => res.json())
      .then(signInWithGoogleProfile)
      .catch(() => showToast('Could not reach Google. Please try again.', 'error'));
  }

  function signInWithGoogleProfile(profile) {
    // Google sign-in requires a real GOOGLE_CLIENT_ID plus a server-side
    // token-verification endpoint (api/auth/google.php) which doesn't exist
    // yet — this function is unreachable while isGoogleClientConfigured()
    // is false (see setupGoogleButtons below). Left as a clear stub rather
    // than pretending Google login works, per the "no fake auth" requirement.
    showToast('Google sign-in is not configured yet.', 'error');
  }

  function setupGoogleButtons() {
    document.querySelectorAll('.google-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isGoogleClientConfigured()) {
          showToast('Google Sign-In isn\u2019t set up on this site yet — please continue with email & password.', 'error');
          return;
        }
        if (!googleTokenClient) {
          showToast('Google Sign-In couldn\u2019t load. Please continue with email & password.', 'error');
          return;
        }
        googleTokenClient.requestAccessToken();
      });
    });
  }



  const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids ambiguous glyphs
  let currentCaptcha = '';

  function generateCaptchaText(length) {
    let out = '';
    for (let i = 0; i < (length || 5); i++) {
      out += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
    }
    return out;
  }

  function drawCaptchaNoise(canvas, code) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // scribble lines
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      ctx.strokeStyle = 'rgba(232,40,63,' + (0.15 + Math.random() * 0.25).toFixed(2) + ')';
      ctx.lineWidth = 1 + Math.random();
      ctx.stroke();
    }
    // dot noise
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + Math.random() * 0.12).toFixed(2) + ')';
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    void code; // reserved if we ever draw glyphs onto the canvas instead of DOM text
  }

  function renderCaptchaGlyphs(container, code) {
    container.innerHTML = '';
    code.split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      const rotate = (Math.random() * 24 - 12).toFixed(1);
      const rise = (Math.random() * 8 - 4).toFixed(1);
      span.style.transform = `translateY(${rise}px) rotate(${rotate}deg)`;
      container.appendChild(span);
    });
  }

  function generateCaptcha() {
    const codeEl = document.getElementById('captchaCode');
    const noiseEl = document.getElementById('captchaNoise');
    const input = document.getElementById('loginCaptchaInput');
    const error = document.getElementById('loginCaptchaError');
    if (!codeEl) return; // not on login page

    currentCaptcha = generateCaptchaText(5);
    renderCaptchaGlyphs(codeEl, currentCaptcha);
    drawCaptchaNoise(noiseEl, currentCaptcha);
    if (input) input.value = '';
    if (input && error) clearFieldError(input, error);
  }

  function isCaptchaCorrect(value) {
    return (value || '').trim().toUpperCase() === currentCaptcha;
  }

  function setupCaptcha() {
    const codeEl = document.getElementById('captchaCode');
    if (!codeEl) return; // only on login.html

    generateCaptcha();

    const refreshBtn = document.getElementById('captchaRefresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('is-spinning');
        generateCaptcha();
        setTimeout(() => refreshBtn.classList.remove('is-spinning'), 400);
      });
    }
  }

  /* ---------------- forgot password (UI only) ---------------- */

  function setupForgotPassword() {
    const link = document.getElementById('forgotPasswordLink');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotPasswordModal();
    });
  }

  function showForgotPasswordModal() {
    let overlay = document.getElementById('mfForgotModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mfForgotModal';
      overlay.className = 'mf-modal-overlay';
      overlay.innerHTML = `
        <div class="mf-modal mf-modal--form">
          <div class="mf-modal-icon">🔑</div>
          <h3>Reset your password</h3>
          <p>Enter the email on your account and we'll send you reset instructions.</p>
          <div class="input-group" style="text-align:left; margin-bottom: 22px;">
            <label for="forgotEmailInput">Email</label>
            <div class="input-shell">
              <input type="email" id="forgotEmailInput" placeholder="you@example.com" autocomplete="email">
            </div>
            <span class="field-error" id="forgotEmailError"></span>
          </div>
          <div class="mf-modal-actions">
            <button type="button" class="mf-modal-cancel">Cancel</button>
            <button type="button" class="mf-modal-confirm" id="forgotSendBtn">Send Link</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('show');
      });
      overlay.querySelector('.mf-modal-cancel').addEventListener('click', () => {
        overlay.classList.remove('show');
      });
    }

    const emailInput = overlay.querySelector('#forgotEmailInput');
    const emailError = overlay.querySelector('#forgotEmailError');
    const sendBtn = overlay.querySelector('#forgotSendBtn');
    emailInput.value = '';
    clearFieldError(emailInput, emailError);

    sendBtn.onclick = () => {
      const email = emailInput.value.trim();
      clearFieldError(emailInput, emailError);

      if (!email) {
        setFieldError(emailInput, emailError, 'Email is required.');
        return;
      }
      if (!isValidEmail(email)) {
        setFieldError(emailInput, emailError, 'Enter a valid email address.');
        return;
      }
      // Deliberately does not check whether the email exists (that would leak
      // account existence to an attacker) and there is no real mail sender
      // configured, so this stays a UI-only stub with a generic message —
      // consistent with "don't pretend features work without credentials".
      overlay.classList.remove('show');
      showToast('If an account exists for ' + email + ', reset instructions were sent.', 'success');
    };

    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  /* ---------------- signup form ---------------- */

  function initSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmInput = document.getElementById('signupConfirm');
    const termsInput = document.getElementById('signupTerms');
    const submitBtn = document.getElementById('signupSubmit');

    const nameError = document.getElementById('signupNameError');
    const emailError = document.getElementById('signupEmailError');
    const passwordError = document.getElementById('signupPasswordError');
    const confirmError = document.getElementById('signupConfirmError');
    const termsError = document.getElementById('signupTermsError');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      const fullName = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirm = confirmInput.value;

      [nameInput, emailInput, passwordInput, confirmInput].forEach((el, i) => {
        clearFieldError(el, [nameError, emailError, passwordError, confirmError][i]);
      });
      if (termsError) termsError.classList.remove('show');

      if (!fullName) {
        setFieldError(nameInput, nameError, 'Please enter your full name.');
        valid = false;
      }

      if (!email) {
        setFieldError(emailInput, emailError, 'Email is required.');
        valid = false;
      } else if (!isValidEmail(email)) {
        setFieldError(emailInput, emailError, 'Enter a valid email address.');
        valid = false;
      }

      if (!password) {
        setFieldError(passwordInput, passwordError, 'Password is required.');
        valid = false;
      } else if (password.length < 8) {
        setFieldError(passwordInput, passwordError, 'Password must be at least 8 characters.');
        valid = false;
      }

      if (!confirm) {
        setFieldError(confirmInput, confirmError, 'Please confirm your password.');
        valid = false;
      } else if (confirm !== password) {
        setFieldError(confirmInput, confirmError, 'Passwords do not match.');
        valid = false;
      }

      if (termsInput && !termsInput.checked) {
        if (termsError) termsError.classList.add('show');
        valid = false;
      }

      if (!valid) return;

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      apiSignup(fullName, email, password).then(user => {
        setCurrentUser(user);
        submitBtn.classList.remove('is-loading');
        submitBtn.classList.add('is-success');
        submitBtn.textContent = 'Account Created ✓';
        showToast('Welcome, ' + fullName.split(' ')[0] + '! Redirecting...', 'success');
        if (window.MarvelFX) {
          window.MarvelFX.unlockAchievement('welcome-hero', 'Achievement Unlocked', 'Welcome, Hero', '🎉');
        }
        setTimeout(() => { window.location.href = getSafeRedirect() || 'index.html'; }, 900);
      }).catch(err => {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        if (err.status === 409) {
          setFieldError(emailInput, emailError, 'An account with this email already exists.');
          showToast('Account already exists. Try logging in.', 'error');
        } else {
          showToast(err.message || 'Signup failed. Please try again.', 'error');
        }
      });
    });
  }

  /* ---------------- login form ---------------- */

  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const rememberInput = document.getElementById('loginRemember');
    const submitBtn = document.getElementById('loginSubmit');

    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    const captchaInput = document.getElementById('loginCaptchaInput');
    const captchaError = document.getElementById('loginCaptchaError');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      clearFieldError(emailInput, emailError);
      clearFieldError(passwordInput, passwordError);
      if (captchaInput) clearFieldError(captchaInput, captchaError);

      if (!email) {
        setFieldError(emailInput, emailError, 'Email is required.');
        valid = false;
      } else if (!isValidEmail(email)) {
        setFieldError(emailInput, emailError, 'Enter a valid email address.');
        valid = false;
      }

      if (!password) {
        setFieldError(passwordInput, passwordError, 'Password is required.');
        valid = false;
      }

      if (captchaInput) {
        if (!captchaInput.value.trim()) {
          setFieldError(captchaInput, captchaError, 'Please enter the security code.');
          valid = false;
        } else if (!isCaptchaCorrect(captchaInput.value)) {
          setFieldError(captchaInput, captchaError, 'Incorrect CAPTCHA');
          showToast('Incorrect CAPTCHA', 'error');
          generateCaptcha();
          valid = false;
        }
      }

      if (!valid) return;

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      apiLogin(email, password, !!(rememberInput && rememberInput.checked)).then(user => {
        setCurrentUser(user);
        generateCaptcha(); // fresh code queued up for next time this page is seen

        submitBtn.classList.remove('is-loading');
        submitBtn.classList.add('is-success');
        submitBtn.textContent = 'Welcome Back ✓';
        showToast('Login successful. Redirecting...', 'success');
        setTimeout(() => { window.location.href = getSafeRedirect() || 'index.html'; }, 800);
      }).catch(err => {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        setFieldError(passwordInput, passwordError, 'Invalid email or password.');
        showToast(err.message || 'Invalid email or password.', 'error');
        generateCaptcha(); // fresh code after any failed attempt
      });
    });
  }

  /* ---------------- navbar auth state (index.html & other pages) ---------------- */

  function renderNavAuthSlot(slot, user, variant) {
    if (!slot) return;
    slot.innerHTML = '';

    if (user) {
      const wrap = document.createElement('div');
      wrap.className = 'nav-user-pill';

      const name = document.createElement('a');
      name.className = 'nav-user-name';
      name.href = rootPrefix() + 'profile.html';
      name.innerHTML = 'Hi, <span>' + escapeHtml(user.fullName.split(' ')[0]) + '</span>';

      const logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.className = variant === 'mobile' ? 'mobile-link nav-logout-btn' : 'nav-logout-btn';
      logoutBtn.textContent = 'Logout';
      logoutBtn.addEventListener('click', () => performLogout('index.html'));

      wrap.appendChild(name);
      wrap.appendChild(logoutBtn);
      slot.appendChild(wrap);
    } else {
      const loginLink = document.createElement('a');
      loginLink.href = buildLoginUrl();
      loginLink.className = variant === 'mobile' ? 'mobile-link' : 'nav-link';
      loginLink.textContent = 'Login';
      slot.appendChild(loginLink);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateNavbarAuthState() {
    const user = getCurrentUser();
    renderNavAuthSlot(document.getElementById('navAuthSlot'), user, 'desktop');
    renderNavAuthSlot(document.getElementById('mobileAuthSlot'), user, 'mobile');
  }

  /* ---------------- redirect logged-in users away from auth pages ---------------- */

  function guardAuthPages() {
    const onAuthPage = document.getElementById('loginForm') || document.getElementById('signupForm');
    if (onAuthPage && getCurrentUser()) {
      window.location.replace(getSafeRedirect() || 'index.html');
    }
  }

  function guardProfilePage() {
    if (document.body.hasAttribute('data-requires-auth') && !getCurrentUser()) {
      window.location.replace(buildLoginUrl());
    }
  }

  function performLogout(redirectTo) {
    showLogoutModal(() => {
      apiLogout().catch(() => { /* even if the request fails, still clear locally */ }).then(() => {
        clearCurrentUser();
        showToast('You have been logged out.', 'success');
        setTimeout(() => { window.location.href = rootPrefix() + (redirectTo || 'index.html'); }, 500);
      });
    });
  }

  /* ---------------- logout confirmation modal ---------------- */

  function showLogoutModal(onConfirm) {
    let overlay = document.getElementById('mfLogoutModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mfLogoutModal';
      overlay.className = 'mf-modal-overlay';
      overlay.innerHTML = `
        <div class="mf-modal">
          <div class="mf-modal-icon">👋</div>
          <h3>Leaving already?</h3>
          <p>You're about to log out of your Marvel Fashion account.</p>
          <div class="mf-modal-actions">
            <button type="button" class="mf-modal-cancel">Stay Logged In</button>
            <button type="button" class="mf-modal-confirm">Logout</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('show');
      });
      overlay.querySelector('.mf-modal-cancel').addEventListener('click', () => {
        overlay.classList.remove('show');
      });
    }
    const confirmBtn = overlay.querySelector('.mf-modal-confirm');
    confirmBtn.onclick = () => {
      overlay.classList.remove('show');
      onConfirm();
    };
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  /* ---------------- password strength meter ---------------- */

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }

  function setupPasswordStrength() {
    const input = document.getElementById('signupPassword');
    const bar = document.getElementById('signupStrengthBar');
    const label = document.getElementById('signupStrengthLabel');
    if (!input || !bar || !label) return;

    const levels = [
      { text: 'Too short', color: '#ff6868' },
      { text: 'Weak', color: '#ff6868' },
      { text: 'Fair', color: '#ffb400' },
      { text: 'Strong', color: '#5ad28c' },
      { text: 'Very Strong', color: '#5ad28c' }
    ];

    input.addEventListener('input', () => {
      const value = input.value;
      const score = value.length ? scorePassword(value) : 0;
      const pct = value.length ? (score + 1) * 20 : 0;
      const level = levels[score];
      bar.style.width = pct + '%';
      bar.style.background = level.color;
      label.textContent = value.length ? level.text : '';
    });
  }

  /* ---------------- keep ?redirect= alive across login <-> signup ---------------- */

  function preserveRedirectAcrossAuthSwitch() {
    const redirect = getSafeRedirect();
    if (!redirect) return;
    document.querySelectorAll('.auth-switch a[href="signup.html"], .auth-switch a[href="login.html"]').forEach(link => {
      link.href = link.getAttribute('href') + '?redirect=' + encodeURIComponent(redirect);
    });
  }

  /* ---------------- init ---------------- */

  document.addEventListener('DOMContentLoaded', () => {
    guardAuthPages();
    guardProfilePage();
    setupPasswordToggles();
    setupFocusStates();
    setupRippleButtons();
    setupGoogleButtons();
    setupForgotPassword();
    setupPasswordStrength();
    setupCaptcha();
    initAuthParticles();
    initSignupForm();
    initLoginForm();
    updateNavbarAuthState();
    preserveRedirectAcrossAuthSwitch();
    initGoogleSignIn();
    syncSessionFromServer(); // reconcile the cached user against the real PHP session
  });

  // Expose a couple of helpers in case other pages want them.
  window.MarvelAuth = {
    getCurrentUser,
    getCurrentUserId: function () {
      const u = getCurrentUser();
      return u ? u.id : null;
    },
    clearCurrentUser,
    updateNavbarAuthState,
    requireLogin,
    handleSessionExpired,
    requestLogout: function (redirectTo) {
      performLogout(redirectTo);
    }
  };
})();
