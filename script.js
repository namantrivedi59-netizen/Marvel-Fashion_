

document.addEventListener('DOMContentLoaded', () => {

  const loader = document.getElementById('loader');
  const loaderStatus = document.getElementById('loaderStatus');
  const statusMessages = ['Initializing...', 'Loading Worlds...', 'Almost Ready...'];
  let statusIndex = 0;

  const statusInterval = setInterval(() => {
    statusIndex = (statusIndex + 1) % statusMessages.length;
    if (loaderStatus) loaderStatus.textContent = statusMessages[statusIndex];
  }, 500);

  window.addEventListener('load', () => {
    setTimeout(() => {
      clearInterval(statusInterval);
      if (loader) loader.classList.add('hidden');
    }, 1200);
  });

  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    if (window.scrollY > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
  mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });

  const emblem = document.querySelector('.landing-emblem');
  const glow = document.querySelector('.landing-glow');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5);
    const y = (e.clientY / window.innerHeight - 0.5);
    if (emblem) emblem.style.transform = `translate(calc(-50% + ${x * 26}px), calc(-50% + ${y * 26}px))`;
    if (glow) glow.style.marginLeft = `${x * 30}px`;
  });

  const revealTargets = document.querySelectorAll('.hero-content');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.25 });
  revealTargets.forEach(el => revealObserver.observe(el));

  const flashEl = document.getElementById('lightningFlash');
  if (flashEl) {
    const scheduleFlash = () => {
      const delay = 4000 + Math.random() * 5000;
      setTimeout(() => {
        flashEl.classList.remove('flash');
        void flashEl.offsetWidth; 
        flashEl.classList.add('flash');
        scheduleFlash();
      }, delay);
    };
    scheduleFlash();
  }

  const canvases = document.querySelectorAll('.bg-canvas');

  canvases.forEach(canvas => {
    const type = canvas.dataset.particles || 'ambient';
    initParticleCanvas(canvas, type);
  });

  function initParticleCanvas(canvas, type) {
    const ctx = canvas.getContext('2d');
    let width, height, particles = [];
    let running = true;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    const count = window.innerWidth < 700 ? 26 : 48;

    function makeParticle() {
      const base = {
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 0.4,
        alpha: 0.2 + Math.random() * 0.5
      };
      return base;
    }
    for (let i = 0; i < count; i++) particles.push(makeParticle());

    const colorMap = {
      web: 'rgba(232,40,63,ALPHA)',
      lightning: 'rgba(79,195,255,ALPHA)',
      circuit: 'rgba(212,175,55,ALPHA)',
      ember: 'rgba(200,60,60,ALPHA)',
      energy: 'rgba(155,77,232,ALPHA)',
      gamma: 'rgba(74,222,128,ALPHA)',
      shadow: 'rgba(214,34,70,ALPHA)',
      arrow: 'rgba(139,92,246,ALPHA)',
      ambient: 'rgba(255,255,255,ALPHA)'
    };
    const colorTemplate = colorMap[type] || colorMap.ambient;

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.fillStyle = colorTemplate.replace('ALPHA', p.alpha.toFixed(2));
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      if (type === 'circuit') {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 110) {
              ctx.strokeStyle = `rgba(212,175,55,${0.12 * (1 - dist / 110)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      requestAnimationFrame(draw);
    }
    draw();

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        running = entry.isIntersecting;
        if (running) requestAnimationFrame(draw);
      });
    }, { threshold: 0.05 });
    io.observe(canvas);
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

});

document.addEventListener('DOMContentLoaded', () => {
  const spotlightTargets = document.querySelectorAll('.landing, .hero-section');
  spotlightTargets.forEach(section => {
    section.addEventListener('mousemove', (e) => {
      const rect = section.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      section.style.setProperty('--mx', `${x}%`);
      section.style.setProperty('--my', `${y}%`);
    });
  });
});
const landing = document.querySelector(".landing");

if (landing) {
  document.addEventListener("mousemove", (e) => {

      const x = (e.clientX / window.innerWidth - 0.5) * 20;

      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      landing.style.backgroundPosition = `${50 + x}% ${50 + y}%`;

  });
}
/* =========================================================================
   PREMIUM HOMEPAGE POLISH — additive only. Runs independently of every
   block above, so it can't interfere with the loader/navbar/particle/
   parallax logic already wired up. Only touches: landing text blocks,
   footer columns (adds .mf-reveal scroll-reveal), and nav-link active
   state while scrolling. No existing element, id, or class is removed.
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- lightweight scroll reveal for landing + footer ---------------- */
  const revealEls = document.querySelectorAll(
    '.landing-left, .landing-bottom, .footer-brand, .footer-links, .footer-social'
  );
  revealEls.forEach(el => el.classList.add('mf-reveal'));

  if (revealEls.length) {
    const mfRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('mf-revealed');
          mfRevealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => mfRevealObserver.observe(el));
  }

  /* ---------------- active nav link while scrolling ---------------- */
  const navLinks = document.querySelectorAll('.navbar .nav-link');
  if (navLinks.length) {
    const zoneMap = [
      { selector: '#landing', link: navLinks[0] },
      { selector: '.hero-section', link: navLinks[1] }, // first hero section = start of "Heroes" zone
      { selector: '#collections', link: navLinks[2] },
      { selector: '#footer', link: navLinks[3] }
    ].filter(z => document.querySelector(z.selector) && z.link);

    function setActiveNav() {
      const scrollPos = window.scrollY + window.innerHeight * 0.3;
      let current = zoneMap[0];
      zoneMap.forEach(zone => {
        const el = document.querySelector(zone.selector);
        if (el && el.offsetTop <= scrollPos) current = zone;
      });
      navLinks.forEach(link => link.classList.remove('active'));
      if (current && current.link) current.link.classList.add('active');
    }

    let navTicking = false;
    window.addEventListener('scroll', () => {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(() => { setActiveNav(); navTicking = false; });
    }, { passive: true });
    setActiveNav();
  }
});
