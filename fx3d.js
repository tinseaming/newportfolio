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
    '.section-title', '.stat', '.about-image', '.about-text p', '.highlight', '.about-actions',
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

  setupReveal();
  setupTilt();
  setupOrbitTilt();
  setupHeroParallax();
  setupHeroDepth();
})();
