/* Galaxy background (Three.js): spiral galaxies, twinkling stars, nebula clouds,
   planets and shooting stars. Reacts to scroll + mouse. Falls back silently
   if WebGL is not available. */
(() => {
  'use strict';

  const canvas = document.getElementById('bg3d');
  const root = document.documentElement;
  if (!canvas || !window.THREE) return;
  const THREE = window.THREE;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
  if (lowPower) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const isSmall = () => window.innerWidth < 768;
  const isLight = () => root.getAttribute('data-theme') === 'light';
  const RANGE = 30; // how far the camera travels down the scene over the whole page

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 0, 14);
  scene.add(camera);

  /* seeded random so the galaxy looks the same on every visit */
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- lights (follow the camera) ---------- */
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  const sun = new THREE.PointLight(0xffc48a, 2.0, 80); sun.position.set(-9, 6, 6);
  const fill = new THREE.PointLight(0x7a5cff, 1.4, 80); fill.position.set(9, -4, 4);
  camera.add(ambient, sun, fill);

  /* ---------- star-like points (shared shader: soft glow + twinkle) ---------- */
  const VERT = `
    attribute float aScale; attribute float aPhase; attribute vec3 aColor;
    uniform float uTime; uniform float uSize; uniform float uTwinkle;
    varying vec3 vColor; varying float vAlpha;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float tw = 1.0 - uTwinkle * 0.55 + uTwinkle * 0.55 * sin(uTime * (0.7 + aPhase * 0.9) + aPhase * 40.0);
      gl_PointSize = max(1.0, aScale * uSize * (60.0 / -mv.z) * (0.8 + 0.2 * tw));
      vColor = aColor;
      vAlpha = tw;
    }`;
  const FRAG = `
    uniform float uLight; varying vec3 vColor; varying float vAlpha;
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
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = glowTexture();

  /* ---------- spiral galaxy ---------- */
  function makeGalaxy(o) {
    const rand = rng(o.seed);
    const n = o.count;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), scl = new Float32Array(n), ph = new Float32Array(n);
    const cIn = new THREE.Color(o.inside), cMid = new THREE.Color(o.mid), cOut = new THREE.Color(o.outside), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = Math.pow(rand(), 1.25) * o.radius;
      const branch = ((i % o.branches) / o.branches) * Math.PI * 2;
      const angle = branch + r * o.spin;
      const spread = () => Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * o.randomness * (0.25 + r);
      pos[i * 3]     = Math.cos(angle) * r + spread();
      pos[i * 3 + 1] = spread() * 0.45;
      pos[i * 3 + 2] = Math.sin(angle) * r + spread();
      const t = r / o.radius;
      if (t < 0.4) c.lerpColors(cIn, cMid, t / 0.4); else c.lerpColors(cMid, cOut, (t - 0.4) / 0.6);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      scl[i] = 0.35 + Math.pow(rand(), 3) * 1.5;
      ph[i] = rand();
    }
    const g = buildPoints(pos, col, scl, ph, makePointMaterial(1.25, 0.35));
    return g;
  }

  const galaxyCount = isSmall() ? 12000 : 36000;
  const galaxyA = new THREE.Group();
  galaxyA.add(makeGalaxy({ seed: 11, count: galaxyCount, radius: 13, branches: 4, spin: 0.95, randomness: 0.55, inside: 0xffe2b8, mid: 0xff5fa8, outside: 0x4f7bff }));
  const galaxyB = new THREE.Group();
  galaxyB.add(makeGalaxy({ seed: 29, count: Math.round(galaxyCount * 0.8), radius: 11, branches: 3, spin: 1.2, randomness: 0.5, inside: 0xfff0c8, mid: 0xb46bff, outside: 0x2fd3ff }));
  const coreSprites = [];
  [[galaxyA, 0xffd9a8, 9], [galaxyB, 0xe2b8ff, 7.5]].forEach(([grp, color, size]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    sp.scale.set(size, size, 1);
    grp.add(sp);
    coreSprites.push(sp);
  });
  scene.add(galaxyA, galaxyB);

  /* ---------- star field ---------- */
  const STAR_COLORS = [0xffffff, 0xffffff, 0xcfe0ff, 0xaec8ff, 0xfff0d0, 0xffd6ec].map((h) => new THREE.Color(h));
  function makeStars(count, seed, scaleMin, scaleMax, twinkle, size) {
    const rand = rng(seed);
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), scl = new Float32Array(count), ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (rand() - 0.5) * 70;
      pos[i * 3 + 1] = 14 - rand() * 40;
      pos[i * 3 + 2] = -34 + rand() * 40;
      const c = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      scl[i] = scaleMin + rand() * (scaleMax - scaleMin);
      ph[i] = rand();
    }
    return buildPoints(pos, col, scl, ph, makePointMaterial(size, twinkle));
  }
  const stars = new THREE.Group();
  stars.add(makeStars(isSmall() ? 1200 : 3400, 5, 0.4, 1.3, 0.7, 1.0));
  stars.add(makeStars(isSmall() ? 50 : 150, 77, 2.2, 4.2, 1.0, 1.0)); // a few bright, strongly twinkling stars
  scene.add(stars);

  /* ---------- nebula clouds ---------- */
  const nebula = new THREE.Group();
  const nebulaSprites = [];
  [
    [-9, 3, 0x6d3cff, 34], [10, -5, 0xff3d9a, 30], [-7, -15, 0x2d7bff, 32],
    [9, -23, 0xb46bff, 34], [-4, -30, 0x00c2c7, 30]
  ].forEach(([x, y, color, size]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }));
    s.position.set(x, y, -22);
    s.scale.set(size, size, 1);
    nebula.add(s);
    nebulaSprites.push(s);
  });
  scene.add(nebula);

  /* ---------- planets + asteroids ---------- */
  const bodies = [];
  const planetMats = [];
  function addPlanet(o) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.55, metalness: 0.1, emissive: o.color, emissiveIntensity: 0.12 });
    planetMats.push(mat);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(o.r, 40, 40), mat));
    if (o.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(o.r * 1.45, o.r * 2.2, 80),
        new THREE.MeshBasicMaterial({ color: o.ring, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2 - 0.35;
      group.add(ring);
    }
    group.userData = { side: o.side, v: o.v, z: o.z, phase: o.v * 9, depth: 0.3, spin: o.spin || 0.15, tilt: o.tilt || 0.3, scale: 1 };
    group.rotation.z = group.userData.tilt;
    scene.add(group);
    bodies.push(group);
    return group;
  }
  const p1 = addPlanet({ r: 1.0, color: 0x7a5cff, ring: 0xffd6a5, side: 1,  v: -0.06, z: -3, spin: 0.12, tilt: 0.35 });
  const p2 = addPlanet({ r: 0.75, color: 0x2fc9d6, side: -1, v: 0.46, z: -2, spin: 0.2 });
  addPlanet({ r: 1.3, color: 0xff7a4a, ring: 0xffe3c2, side: 1, v: 0.8, z: -5, spin: 0.1, tilt: -0.3 });
  // small moon orbiting planet 2
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), new THREE.MeshStandardMaterial({ color: 0xd9dbe4, roughness: 0.9 }));
  p2.add(moon);

  const rockRand = rng(3);
  [[-1, 0.3, -1], [1, 0.36, 0], [-1, 0.62, -2], [1, 0.93, -1]].forEach(([side, v, z], i) => {
    const geo = new THREE.IcosahedronGeometry(0.5 + (i % 2) * 0.12, 1);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const f = 0.8 + rockRand() * 0.45;
      p.setXYZ(k, p.getX(k) * f, p.getY(k) * f, p.getZ(k) * f);
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6f6b80, roughness: 0.95, flatShading: true }));
    rock.userData = { side, v, z, phase: i * 2.3, depth: 0.5, spin: 0.35 + i * 0.07, tilt: 0, scale: 1, rock: true };
    rock.rotation.set(i, i * 1.7, 0);
    scene.add(rock);
    bodies.push(rock);
  });

  /* ---------- shooting stars ---------- */
  const shooters = [];
  const SHOOT_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  const SHOOT_FRAG = `varying vec2 vUv; uniform float uOpacity;
    void main(){ float along = pow(vUv.x, 2.5); float across = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 1.5);
      gl_FragColor = vec4(vec3(0.85, 0.93, 1.0), along * across * uOpacity); }`;
  for (let i = 0; i < 2; i++) {
    const mat = new THREE.ShaderMaterial({ vertexShader: SHOOT_VERT, fragmentShader: SHOOT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uOpacity: { value: 0 } } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.scale.set(4.5, 0.07, 1);
    m.visible = false;
    m.userData = { life: 0, dur: 1, dx: -1, dy: -0.5 };
    scene.add(m);
    shooters.push(m);
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

  /* ---------- size / layout ---------- */
  let lw = 0, lh = 0, halfW = 10, halfH = 6;
  function layout() {
    const dist = camera.position.z;
    halfH = Math.tan((camera.fov * Math.PI) / 360) * dist;
    halfW = halfH * camera.aspect;
    const small = isSmall();
    bodies.forEach((b) => {
      const u = b.userData;
      u.baseX = u.side * halfW * (small ? 0.76 : 0.8);
      u.baseY = -u.v * RANGE + 1.2;
      u.scale = small ? 0.6 : 1;
      b.scale.setScalar(u.scale);
    });
    const gs = small ? 0.62 : 1;
    galaxyA.scale.setScalar(gs);
    galaxyB.scale.setScalar(gs);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === lw && h === lh)) return;
    lw = w; lh = h;
    const dpr = Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    pointMaterials.forEach((m) => { m.uniforms.uSize.value = m.userData.sizeFactor * dpr; });
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
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

  /* ---------- animation ---------- */
  let sp = scrollProgress(), lastSp = sp, boost = 0;

  function update(dt, t) {
    const target = scrollProgress();
    sp += (target - sp) * Math.min(1, dt * 5);
    mx += (tmx - mx) * Math.min(1, dt * 3);
    my += (tmy - my) * Math.min(1, dt * 3);

    const speed = Math.abs(sp - lastSp) / Math.max(dt, 0.001);
    lastSp = sp;
    boost += (Math.min(speed * 18, 3) - boost) * Math.min(1, dt * 4);

    camera.position.y = -sp * RANGE;
    camera.position.x = mx * 0.8;
    camera.position.z = 14 + Math.sin(sp * Math.PI * 3) * 1.0;
    camera.lookAt(mx * 0.3, camera.position.y + my * 0.3, 0);

    pointMaterials.forEach((m) => { m.uniforms.uTime.value = t; });

    // galaxies: slow spin, speeds up while scrolling; tilt changes with scroll
    galaxyA.position.set(halfW * 0.12 + mx * 0.6, -2 + camera.position.y * 0.55, -10);
    galaxyA.rotation.x = 1.05 - sp * 0.5 + my * 0.05;
    galaxyA.rotation.z = -0.35 + mx * 0.05;
    galaxyA.rotation.y += dt * (0.03 + boost * 0.05);

    galaxyB.position.set(-halfW * 0.25 - mx * 0.5, -19, -11);
    galaxyB.rotation.x = 0.7 + sp * 0.4;
    galaxyB.rotation.z = 0.5;
    galaxyB.rotation.y -= dt * (0.025 + boost * 0.05);

    stars.position.y = camera.position.y * 0.7;
    stars.rotation.y = t * 0.004 + mx * 0.02;
    nebula.position.y = camera.position.y * 0.82;
    nebula.position.x = mx * 0.8;

    bodies.forEach((b) => {
      const u = b.userData;
      b.position.x = u.baseX + mx * u.depth * 1.6 + Math.sin(t * 0.35 + u.phase) * 0.25;
      b.position.y = u.baseY + Math.sin(t * 0.55 + u.phase) * 0.35;
      b.position.z = u.z;
      const k = dt * u.spin * (1 + boost * 1.4);
      if (u.rock) { b.rotation.x += k; b.rotation.y += k * 1.3; }
      else { b.rotation.y += k; }
    });
    moon.position.set(Math.cos(t * 0.9) * 1.5, Math.sin(t * 0.9) * 0.25, Math.sin(t * 0.9) * 1.5);

    // shooting stars (dark mode only)
    if (!reduce && !isLight()) {
      nextShoot -= dt;
      if (nextShoot <= 0) {
        const free = shooters.find((m) => !m.visible);
        if (free) spawnShooter(free, halfW, halfH);
        nextShoot = 3 + Math.random() * 4;
      }
      shooters.forEach((m) => {
        if (!m.visible) return;
        const u = m.userData;
        u.life += dt;
        const k = u.life / u.dur;
        if (k >= 1) { m.visible = false; return; }
        m.position.x += u.dx * dt * 14;
        m.position.y += u.dy * dt * 14;
        m.material.uniforms.uOpacity.value = Math.sin(k * Math.PI) * 0.95;
      });
    }
  }

  function renderOnce() {
    resize();
    sp = lastSp = scrollProgress();
    update(0.016, 3);
    renderer.render(scene, camera);
  }

  let last = performance.now(), raf = 0, ready = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    if (isSmall() && now - last < 28) return; // ~35 fps on phones
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt, now / 1000);
    renderer.render(scene, camera);
    if (!ready) { ready = true; root.classList.add('scene-ready'); }
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    root.classList.remove('scene-ready');
  });

  /* ---------- go ---------- */
  if (reduce) pointMaterials.forEach((m) => { m.uniforms.uTwinkle.value = 0; });
  resize();
  applyPalette();
  if (reduce) {
    renderOnce();
    root.classList.add('scene-ready');
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
