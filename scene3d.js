/* Aurora background (plain WebGL, no libraries).
   Flowing northern-light curtains + twinkling stars + drifting fireflies,
   rendered by one fragment shader. Reacts to scroll and mouse.
   Dark mode = night aurora. Light mode = soft sunrise aurora.
   Falls back silently (CSS stars) if WebGL is not available. */
(() => {
  'use strict';

  const canvas = document.getElementById('bg3d');
  const root = document.documentElement;
  if (!canvas) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
  if (lowPower) return;

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return;

  const VERT = `
    attribute vec2 p;
    varying vec2 vUv;
    void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUv;
    uniform float uTime, uScroll, uAspect, uLight;
    uniform vec2 uMouse;

    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
      return v;
    }

    /* colour along the height of a curtain: green -> cyan -> violet (night) / peach -> mint -> lavender (sunrise) */
    vec3 pal(float t, float l) {
      vec3 g = vec3(0.20, 0.95, 0.62), c = vec3(0.13, 0.82, 0.95), v = vec3(0.62, 0.45, 1.0);
      vec3 night = mix(mix(g, c, smoothstep(0.0, 0.5, t)), v, smoothstep(0.45, 1.0, t));
      vec3 pg = vec3(1.0, 0.70, 0.62), pc = vec3(0.50, 0.88, 0.82), pv = vec3(0.68, 0.60, 1.0);
      vec3 day = mix(mix(pg, pc, smoothstep(0.0, 0.5, t)), pv, smoothstep(0.45, 1.0, t));
      return mix(night, day, l);
    }

    /* one curtain: bright wavy lower edge, vertical rays fading upward */
    float curtain(vec2 p, float t, float seed, float base, out float h) {
      float wob = fbm(vec2(p.x * 1.5 + seed, t * 0.08 + seed * 1.7));
      float b = base + (wob - 0.5) * 0.34 + 0.05 * sin(p.x * 2.2 + t * 0.15 + seed);
      float d = p.y - b;
      h = clamp(d * 2.4, 0.0, 1.0);
      float lower = smoothstep(-0.012, 0.03, d);
      float upper = exp(-max(d, 0.0) * 3.4);
      float rays = noise(vec2(p.x * 26.0 + seed * 5.0, d * 3.0 - t * 0.22));
      float rays2 = noise(vec2(p.x * 9.0 - seed, d * 1.2 - t * 0.12));
      float r = 0.35 + 1.5 * rays * rays2;
      float edge = exp(-abs(d) * 30.0) * 0.5;
      return lower * (upper * r + edge);
    }

    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = pow(smoothstep(0.5, 0.0, d), 2.0) * vAlpha;
      vec3 col = mix(vColor, vColor * vColor * 0.7, uLight);
      gl_FragColor = vec4(col, a * 0.85);
    }`;

  const pointMaterials = [];
  function makePointMaterial(sizeFactor, twinkle) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: sizeFactor },
        uTwinkle: { value: twinkle },
        uLight: { value: 0 }
      }
    });
    mat.userData.sizeFactor = sizeFactor;
    pointMaterials.push(mat);
    return mat;
  }

  function buildPoints(positions, colors, scales, phases, material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const p = new THREE.Points(g, material);
    p.frustumCulled = false;
    return p;
  }

  /* ---------- soft glow texture (nebula + galaxy cores) ---------- */
  function glowTexture() {
    const c = document.createElement('canvas');
    c.className = 'stars2d stars2d-' + (i ? 'b' : 'a');
    c.setAttribute('aria-hidden', 'true');
    canvas.parentNode.insertBefore(c, canvas);
    return c;
  });

  function drawStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = Math.round(window.innerHeight * 1.1);
    const palette = ['255,255,255', '255,255,255', '200,235,255', '210,255,240', '230,215,255'];
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const count = Math.min(220, Math.round((w * h) / 7500));
    starLayers.forEach((c) => {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const x = c.getContext('2d');
      x.scale(dpr, dpr);
      for (let i = 0; i < count / 2; i++) {
        const px = rnd() * w, py = rnd() * h;
        const big = rnd() > 0.93;
        const r = big ? 1.1 + rnd() * 0.9 : 0.4 + rnd() * 0.8;
        const col = palette[Math.floor(rnd() * palette.length)];
        if (big) {
          const g = x.createRadialGradient(px, py, 0, px, py, r * 6);
          g.addColorStop(0, `rgba(${col},0.55)`);
          g.addColorStop(1, `rgba(${col},0)`);
          x.fillStyle = g;
          x.fillRect(px - r * 6, py - r * 6, r * 12, r * 12);
        }
        x.fillStyle = `rgba(${col},${0.55 + rnd() * 0.45})`;
        x.beginPath();
        x.arc(px, py, r, 0, Math.PI * 2);
        x.fill();
      }
    });
  }
  let nextShoot = 2.5;
  function spawnShooter(m, halfW, halfH) {
    const ang = Math.PI + 0.25 + Math.random() * 0.4; // heading down-left
    m.userData.dx = Math.cos(ang); m.userData.dy = Math.sin(ang);
    m.userData.life = 0; m.userData.dur = 0.9 + Math.random() * 0.5;
    m.position.set((Math.random() * 1.2 - 0.1) * halfW * 1.4, camera.position.y + (Math.random() * 0.9 - 0.2) * halfH, -6);
    m.rotation.z = ang;
    m.visible = true;
  }

  /* ---------- theme ---------- */
  function applyPalette() {
    const light = isLight();
    pointMaterials.forEach((m) => {
      m.uniforms.uLight.value = light ? 1 : 0;
      m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    });
    nebulaSprites.forEach((s) => {
      s.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      s.material.opacity = light ? 0.2 : 0.26;
    });
    coreSprites.forEach((s) => {
      s.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      s.material.opacity = light ? 0.26 : 0.42;
    });
    ambient.intensity = light ? 0.9 : 0.45;
    shooters.forEach((m) => { if (light) m.visible = false; });
    if (reduce) renderOnce();
  }
  new MutationObserver(applyPalette).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- size ---------- */
  let lw = 0, lh = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === lw && h === lh)) return;
    lw = w; lh = h;
    const scale = isSmall() ? 0.6 : 0.5; // the aurora is soft, so half resolution looks identical and is far cheaper
    canvas.width = Math.max(2, Math.round(w * scale));
    canvas.height = Math.max(2, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(U.uAspect, w / h);
    if (reduce) renderOnce();
  }
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });

  /* ---------- input ---------- */
  let tmx = 0, tmy = 0, mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  const scrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };
  window.addEventListener('scroll', () => root.style.setProperty('--sy', scrollProgress().toFixed(3)), { passive: true });

  /* ---------- state ---------- */
  let sp = scrollProgress();
  let light = isLight() ? 1 : 0;

  function draw(t) {
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uScroll, sp);
    gl.uniform1f(U.uLight, light);
    gl.uniform2f(U.uMouse, mx, my);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function renderOnce() {
    resize();
    sp = scrollProgress();
    light = isLight() ? 1 : 0;
    draw(6.0);
  }

  let last = performance.now(), raf = 0, ready = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    if (isSmall() && now - last < 28) return; // ~35 fps on phones
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // smooth follow of scroll, mouse and theme (the aurora cross-fades between night and sunrise)
    sp += (scrollProgress() - sp) * (1 - Math.exp(-dt * 4));
    mx += (tmx - mx) * (1 - Math.exp(-dt * 2.5));
    my += (tmy - my) * (1 - Math.exp(-dt * 2.5));
    light += ((isLight() ? 1 : 0) - light) * (1 - Math.exp(-dt * 3));

    draw(now / 1000);
    if (!ready) { ready = true; root.classList.add('scene-ready'); }
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    root.classList.remove('scene-ready');
  });

  if (reduce) new MutationObserver(renderOnce).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- go ---------- */
  resize();
  if (reduce) {
    renderOnce();
    root.classList.add('scene-ready');
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
