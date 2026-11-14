/* 3D page effects: depth reveal on scroll, card tilt + glare, hero depth,
   floating-card parallax. Pure CSS transforms + small JS; respects reduced motion. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('fx');

  /* ---------- 3D reveal when scrolling into view ---------- */
  const REVEAL = [
    '.section-title', '.eyebrow', '.stat', '.about-image', '.about-text p', '.highlight', '.about-actions',
    '.skill-category', '.service-card', '.project-card', '.contact-item', '.contact-form', '.social-icon'
  ].join(',');

  function setupReveal() {
    if (reduce || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.skill-category').forEach((el) => el.classList.add('revealed'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('in', 'revealed');
        const delay = parseFloat(el.style.getPropertyValue('--rd')) || 0;
        setTimeout(() => el.classList.remove('reveal', 'in'), 1500 + delay * 1000);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    document.querySelectorAll(REVEAL).forEach((el) => {
      if (el.closest('.home')) { el.classList.add('revealed'); return; } // hero already has its own intro
      const siblings = [...el.parentElement.children].filter((c) => c.matches(REVEAL));
      const index = Math.max(0, siblings.indexOf(el));
      el.style.setProperty('--rd', (Math.min(index, 5) * 0.09).toFixed(2) + 's');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---------- tilt + glare on cards (mouse only) ---------- */
  function setupTilt() {
    if (!fine || reduce) return;
    const targets = '.stat, .highlight, .skill-category, .service-card, .project-card, .contact-item, .profile-image, .about-image .image-wrapper';

    document.querySelectorAll(targets).forEach((el) => {
      el.classList.add('tilt');
      const max = el.matches('.profile-image, .about-image .image-wrapper') ? 7 : 6;

      if (el.tagName !== 'IMG') {
        const glare = document.createElement('span');
        glare.className = 'tilt-glare';
        glare.setAttribute('aria-hidden', 'true');
        glare.style.borderRadius = parseFloat(getComputedStyle(el).borderTopLeftRadius) ? 'inherit' : '20px';
        el.appendChild(glare);
      }

      let rect = null, raf = 0, px = 0.5, py = 0.5;
      const apply = () => {
        raf = 0;
        el.style.setProperty('--rx', ((py - 0.5) * -2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      };

      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        rect = el.getBoundingClientRect();
        el.classList.add('is-tilting');
        el.style.setProperty('--ty', '-6px');
        el.style.setProperty('--sc', '1.015');
      });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !rect) return;
        px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => {
        rect = null;
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--ty', '0px');
        el.style.setProperty('--sc', '1');
      });
    });
  }

  /* ---------- hero: floating labels drift at different depths with the mouse ---------- */
  function setupHeroParallax() {
    if (!fine || reduce) return;
    const cards = [...document.querySelectorAll('.floating-card')];
    if (!cards.length) return;
    const depth = [18, 12, 26];
    let raf = 0, nx = 0, ny = 0;
    const apply = () => {
      raf = 0;
      cards.forEach((c, i) => {
        const d = depth[i % depth.length];
        c.style.translate = `${(-nx * d).toFixed(1)}px ${(-ny * d).toFixed(1)}px`;
      });
    };
    window.addEventListener('pointermove', (e) => {
      nx = (e.clientX / window.innerWidth) * 2 - 1;
      ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---------- hero recedes into the screen as you scroll ---------- */
  function setupHeroDepth() {
    if (reduce) return;
    const hero = document.querySelector('.home-content');
    if (!hero) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const t = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
      if (t < 0.002) { hero.style.transform = ''; hero.style.opacity = ''; return; }
      hero.style.transform = `perspective(1200px) translate3d(0, ${(t * 70).toFixed(1)}px, ${(-t * 220).toFixed(1)}px) rotateX(${(t * 7).toFixed(2)}deg)`;
      hero.style.opacity = (1 - t * 0.55).toFixed(3);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- hero: tech-icon orbit leans toward the mouse ---------- */
  function setupOrbitTilt() {
    if (!fine || reduce) return;
    const box = document.querySelector('.image-container');
    if (!box) return;
    let raf = 0, nx = 0, ny = 0;
    const apply = () => {
      raf = 0;
      box.style.setProperty('--ox', nx.toFixed(3));
      box.style.setProperty('--oy', ny.toFixed(3));
    };
    window.addEventListener('pointermove', (e) => {
      nx = (e.clientX / window.innerWidth) * 2 - 1;
      ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---------- sliding highlight behind the active menu link (desktop) ---------- */
  function setupNavIndicator() {
    const menu = document.querySelector('.nav-menu');
    const indicator = menu && menu.querySelector('.nav-indicator');
    if (!menu || !indicator) return;
    let placed = false;

    const place = () => {
      if (window.innerWidth <= 1024) return;
      const active = menu.querySelector('.nav-link.active');
      if (!active) { if (indicator.classList.contains('ready')) indicator.classList.remove('ready'); return; }
      const first = !placed;
      if (first) indicator.style.transition = 'none';
      indicator.style.width = active.offsetWidth + 'px';
      indicator.style.height = active.offsetHeight + 'px';
      indicator.style.top = active.offsetTop + 'px';
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      if (first) {
        void indicator.offsetWidth; // apply without animation the first time
        indicator.style.transition = '';
        placed = true;
      }
      if (!indicator.classList.contains('ready')) indicator.classList.add('ready');
    };

    // watch only the links (not the highlight itself, which would retrigger this)
    const watcher = new MutationObserver(place);
    menu.querySelectorAll('.nav-link').forEach((link) => watcher.observe(link, { attributes: true, attributeFilter: ['class'] }));
    window.addEventListener('resize', place);
    window.addEventListener('load', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    place();
  }

  /* ---------- magnetic buttons (mouse only) ---------- */
  function setupMagnetic() {
    if (!fine || reduce) return;
    document.querySelectorAll('.hire-btn, .cta-btn, .about-btn, .submit-btn, .theme-toggle').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0px 0px'; });
    });
  }

  /* ---------- soft light that follows the cursor ---------- */
  function setupCursorGlow() {
    const glow = document.querySelector('.cursor-glow');
    if (!glow || !fine || reduce) return;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 3, x = tx, y = ty, running = false;
    const loop = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      glow.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) requestAnimationFrame(loop);
      else running = false;
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      root.classList.add('glow-on');
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => root.classList.remove('glow-on'));
  }

  /* ---------- numbers count up when they appear ---------- */
  function setupCounters() {
    const els = [...document.querySelectorAll('.stat-number, .badge-number')];
    if (!els.length || reduce || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const end = parseInt(el.dataset.target, 10);
        const start = performance.now(), dur = 1500;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = Math.round(end * eased) + el.dataset.suffix;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => {
      const m = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m) return;
      el.dataset.target = m[1];
      el.dataset.suffix = m[2];
      el.textContent = '0' + m[2];
      io.observe(el);
    });
  }

  /* ---------- scroll progress bar + back-to-top ---------- */
  function setupScrollUI() {
    const bar = document.querySelector('.scroll-progress span');
    const toTop = document.getElementById('toTop');
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar) bar.style.setProperty('--p', p.toFixed(4));
      if (toTop) toTop.classList.toggle('show', window.scrollY > 700);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
    toTop?.addEventListener('click', () => {
      if (window.__scrollToSection) window.__scrollToSection('#home');
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- footer links + year ---------- */
  function setupFooter() {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
    document.querySelectorAll('[data-fx-scroll]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.getAttribute('data-fx-scroll');
        if (window.__scrollToSection) window.__scrollToSection(target);
        else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  setupReveal();
  setupTilt();
  setupOrbitTilt();
  setupNavIndicator();
  setupMagnetic();
  setupCursorGlow();
  setupCounters();
  setupScrollUI();
  setupFooter();
  setupHeroParallax();
  setupHeroDepth();
})();
