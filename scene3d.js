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
      vec2 uv = vUv;
      vec2 p = vec2(uv.x * uAspect, uv.y);
      float t = uTime;
      p.x += uMouse.x * 0.06;

      vec3 aur = vec3(0.0);
      float inten = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float base = 0.50 + fi * 0.12 + 0.07 * sin(uScroll * 5.5 + fi * 1.7) + uMouse.y * 0.02 - uScroll * 0.08;
        float h;
        float c = curtain(p + vec2(fi * 3.1, 0.0), t * (1.0 + fi * 0.25), fi * 7.3 + 1.0, base, h);
        vec3 col = pal(h + 0.18 * fi - 0.2 + sin(uScroll * 3.0 + fi) * 0.12, uLight);
        float w = c * (1.0 - fi * 0.18);
        aur += col * w;
        inten += w;
      }
      aur *= 0.46;
      inten *= 0.46;

      /* fireflies */
      vec3 fire = vec3(0.0);
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        float sped = 0.015 + hash(vec2(fi, 1.0)) * 0.03;
        vec2 fp = vec2(hash(vec2(fi, 2.0)) * uAspect, fract(hash(vec2(fi, 3.0)) + t * sped - uScroll * 0.1));
        fp.x += sin(t * 0.4 + fi * 2.3) * 0.05;
        vec2 d = uv * vec2(uAspect, 1.0) - fp;
        float glow = 0.0007 / (dot(d, d) + 0.0007);
        float blink = 0.5 + 0.5 * sin(t * 1.2 + fi * 4.0);
        fire += glow * blink * mix(vec3(0.45, 1.0, 0.85), vec3(0.75, 0.65, 1.0), hash(vec2(fi, 4.0)));
      }
      fire *= 0.22;

      /* night: additive light on the page background (premultiplied) */
      vec3 rgbN = aur + fire;
      float aN = clamp(max(rgbN.r, max(rgbN.g, rgbN.b)), 0.0, 1.0);
      rgbN = min(rgbN, vec3(aN));

      /* day: soft pastel wash + a few glowing dots */
      float aL = clamp(inten * 0.95, 0.0, 0.72);
      vec3 colL = aur / max(inten, 0.001);
      float spark = clamp((fire.g + fire.b) * 0.3, 0.0, 0.5);
      vec3 rgbL = colL * aL + vec3(0.56, 0.5, 0.92) * spark;
      float aL2 = clamp(aL + spark, 0.0, 0.8);

      gl_FragColor = mix(vec4(rgbN, aN), vec4(rgbL, aL2), uLight);
    }`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('Aurora shader error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uTime', 'uScroll', 'uAspect', 'uLight', 'uMouse'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  gl.clearColor(0, 0, 0, 0);
  gl.disable(gl.BLEND);

  const isSmall = () => window.innerWidth < 768;
  const isLight = () => root.getAttribute('data-theme') === 'light';

  /* ---------- stars: two static canvases that twinkle out of phase (CSS) ---------- */
  const starLayers = [0, 1].map((i) => {
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
  drawStars();
  let starTimer;
  window.addEventListener('resize', () => { clearTimeout(starTimer); starTimer = setTimeout(drawStars, 250); });

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
