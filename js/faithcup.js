/* =========================================================
   FAITH CUP NAVIDEÑA 2026 · app de una sola pantalla
   Vistas con barra inferior, escenas 3D (three.js) y GSAP
   ========================================================= */
(function () {
  'use strict';

  const C = window.FAITHCUP;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const hasGsap = typeof window.gsap !== 'undefined';
  const has3D = typeof window.THREE !== 'undefined';
  // Con "reducir movimiento" se suaviza todo, pero no se apaga: la nieve y el 3D siguen, más lentos.
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]motion=1/.test(location.search);

  const money = n => '$' + Number(n).toLocaleString('es-CO');
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const waLink = msg => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg)}`;

  /* ---------------- Fase del torneo ---------------- */
  const F = {
    abre: new Date(C.fechas.abreInscripcion), cierra: new Date(C.fechas.cierraInscripcion),
    inicio: new Date(C.fechas.inicioTorneo), fin: new Date(C.fechas.finTorneo)
  };
  function fase(now = new Date()) {
    if (now < F.abre) return 'antes';
    if (now <= F.cierra) return 'abiertas';
    if (now < F.inicio) return 'cerradas';
    if (now <= F.fin) return 'enJuego';
    return 'terminado';
  }

  /* =========================================================
     NIEVE (2D, siempre visible)
     ========================================================= */
  function snow() {
    const cv = $('#snow'); const ctx = cv.getContext('2d');
    let w, h, dpr, flakes = [];
    function make(anywhere) {
      const depth = Math.random();                       // 0 lejos · 1 cerca
      const r = (0.8 + depth * depth * 3.6) * dpr;
      return { x: Math.random() * w, y: anywhere ? Math.random() * h : -20, r, depth,
        vy: (0.25 + depth * 1.1) * dpr * (calm ? 0.45 : 1), sway: Math.random() * 6.28,
        vs: 0.006 + Math.random() * 0.012, o: 0.35 + depth * 0.6 };
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      const n = Math.min(170, Math.round(innerWidth / 5));
      flakes = Array.from({ length: n }, () => make(true));
    }
    let wind = 0, tilt = 0;
    addEventListener('pointermove', e => { wind = (e.clientX / innerWidth - 0.5) * 1.4; }, { passive: true });
    addEventListener('deviceorientation', e => { if (e.gamma != null) tilt = Math.max(-1, Math.min(1, e.gamma / 30)); }, { passive: true });
    function loop() {
      if (!document.hidden) {
        ctx.clearRect(0, 0, w, h);
        for (const f of flakes) {
          f.sway += f.vs;
          f.x += (Math.sin(f.sway) * 0.5 + (wind + tilt) * (0.4 + f.depth)) * dpr;
          f.y += f.vy;
          if (f.y > h + 20) Object.assign(f, make(false));
          if (f.x < -20) f.x = w + 10; if (f.x > w + 20) f.x = -10;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
          g.addColorStop(0, `rgba(255,255,255,${f.o})`);
          g.addColorStop(f.depth > 0.85 ? 0.35 : 0.6, `rgba(255,255,255,${f.o * 0.6})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
        }
      }
      requestAnimationFrame(loop);
    }
    addEventListener('resize', resize); resize(); loop();
  }

  /* =========================================================
     3D (three.js)
     ========================================================= */
  // Mapa de reflejos: estudio oscuro con franjas de luz (da el brillo "premium" al metal)
  function envTexture(renderer) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#1a1f1f'); bg.addColorStop(1, '#020303');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    const strip = (x, y, wd, ht, col, blur) => { g.filter = `blur(${blur}px)`; g.fillStyle = col; g.fillRect(x, y, wd, ht); };
    strip(80, 60, 260, 70, '#ffffff', 18); strip(600, 40, 340, 50, '#fff6dc', 22);
    strip(420, 300, 200, 160, '#c8f000', 50); strip(0, 340, 160, 120, '#e3262f', 50);
    strip(850, 260, 170, 200, '#f2c14e', 50); g.filter = 'none';
    const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose(); return env;
  }
  function softSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  // 12 pentágonos curvos sobre una esfera = balón de fútbol
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    return [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
      .map(v => new THREE.Vector3(...v).normalize());
  })();
  // Textura de balón: pentágonos oscuros + costuras de los hexágonos, calculada pixel a pixel
  const ballTexCache = {};
  function soccerTexture(base, patch) {
    const key = base + '-' + patch; if (ballTexCache[key]) return ballTexCache[key];
    const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H);
    const B = new THREE.Color(base), P = new THREE.Color(patch);
    const R = 0.36, k = Math.PI / 5, d = new THREE.Vector3();
    // marco tangente de cada vértice para medir el ángulo del pentágono
    const frames = ICO.map(n => {
      const a = Math.abs(n.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = new THREE.Vector3().crossVectors(a, n).normalize(); const v = new THREE.Vector3().crossVectors(n, u);
      return { n, u, v };
    });
    for (let y = 0; y < H; y++) {
      const th = y / H * Math.PI;
      for (let x = 0; x < W; x++) {
        const ph = x / W * Math.PI * 2;
        d.set(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
        let best = -2, bi = 0, second = -2;
        for (let i = 0; i < 12; i++) { const dt = frames[i].n.dot(d); if (dt > best) { second = best; best = dt; bi = i; } else if (dt > second) second = dt; }
        const f = frames[bi], ang = Math.acos(Math.min(1, best));
        const az = Math.atan2(d.dot(f.v), d.dot(f.u));
        const m = ((az % (2 * k)) + 2 * k) % (2 * k) - k;
        const edge = R * Math.cos(k) / Math.cos(m);       // borde del pentágono
        let col = B, shade = 1;
        if (ang < edge) col = P;
        else {
          // costuras: borde del pentágono y líneas entre hexágonos
          if (ang - edge < .018) shade = .45;
          const ratio = Math.acos(Math.min(1, second)) - ang;
          if (ratio < .03) shade = Math.min(shade, .55);
        }
        const o = (y * W + x) * 4;
        img.data[o] = col.r * 255 * shade; img.data[o + 1] = col.g * 255 * shade; img.data[o + 2] = col.b * 255 * shade; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    return (ballTexCache[key] = tex);
  }
  function soccerBall(r, base, patch, extra = {}) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48),
      new THREE.MeshPhysicalMaterial(Object.assign({ map: soccerTexture(base, patch), metalness: .1, roughness: .28, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .8 }, extra)));
  }
  function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    return r;
  }
  function fit(renderer, camera, canvas) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  addEventListener('deviceorientation', e => { if (e.gamma != null) { pointer.x = Math.max(-.5, Math.min(.5, e.gamma / 60)); pointer.y = Math.max(-.5, Math.min(.5, (e.beta - 45) / 90)); } }, { passive: true });

  // ---- Escena de inicio: esfera navideña de fútbol + bokeh + bolas flotando
  function homeScene() {
    const canvas = $('#stage-home');
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    scene.environment = envTexture(renderer);

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
    const rimR = new THREE.PointLight(0xff3344, 3, 14); rimR.position.set(-4, -1, 2); scene.add(rimR);
    const rimG = new THREE.PointLight(0xf2c14e, 2.5, 14); rimG.position.set(4, -2, 1); scene.add(rimG);

    // Esfera principal
    const orn = new THREE.Group();
    const ball = soccerBall(1, 0xc8f000, 0x0b0e02, { metalness: .25, roughness: .16, emissive: 0x1c2600, envMapIntensity: .7 });
    orn.add(ball);
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.25, envMapIntensity: 1.6 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.26, 32), gold); cap.position.y = 1.05; orn.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 12, 32), gold); ring.position.y = 1.25; orn.add(ring);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0x777766 }));
    string.position.y = 4.35; orn.add(string);
    const pivot = new THREE.Group(); pivot.add(orn); orn.position.y = -1.2; pivot.position.set(2.2, 2.8, -1.5);
    scene.add(pivot);

    // Bolas pequeñas y balones flotando
    const minis = [];
    [[0xe3262f, -2.6, 2.2, -2, .42], [0xf2c14e, -3.2, -2.4, -3, .36], [0xe3262f, 1.4, -3.6, -4, .5], [0xc8f000, -1.4, 4, -5, .4]]
      .forEach(([col, x, y, z, s]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 48, 48), new THREE.MeshPhysicalMaterial({ color: col, metalness: .7, roughness: .15, clearcoat: 1, envMapIntensity: 1.3 }));
        m.position.set(x, y, z); m.userData = { y, ph: Math.random() * 6 }; scene.add(m); minis.push(m);
      });
    [[3.1, -2.6, -2.5, .38], [-2.2, -0.6, -4.5, .3]].forEach(([x, y, z, s]) => {
      const b = soccerBall(s, 0xf4f6f1, 0x111111); b.position.set(x, y, z); b.userData = { y, ph: Math.random() * 6 }; scene.add(b); minis.push(b);
    });

    // Bokeh: luces navideñas desenfocadas al fondo
    const N = 70, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const palette = [new THREE.Color(0xc8f000), new THREE.Color(0xe3262f), new THREE.Color(0xf2c14e), new THREE.Color(0xffffff)];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * 18; pos[i * 3 + 1] = (Math.random() - .5) * 12; pos[i * 3 + 2] = -6 - Math.random() * 8;
      const c = palette[i % 4]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const bokeh = new THREE.Points(bg, new THREE.PointsMaterial({ size: 1.1, map: softSprite(), vertexColors: true, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(bokeh);

    // En pantallas angostas, la esfera arriba a la derecha y más pequeña
    function layout() {
      const narrow = canvas.clientWidth < 700;
      // en celular: arriba a la derecha, sin tapar el logo ni el chip de "2ª edición"
      pivot.position.set(narrow ? 1.55 : 3.2, narrow ? 3.55 : 1.6, narrow ? -2.6 : -1.2);
      pivot.scale.setScalar(narrow ? 0.62 : 1.25);
    }

    let on = true, t0 = performance.now(), entered = false, last = 0, slow = 0, lowered = false;
    const speed = calm ? 0.4 : 1;
    function frame(now) {
      if (!on) return;
      // Calidad adaptable: si el celular no da, baja la resolución del 3D
      if (last && !document.hidden) { const dt = now - last; if (dt > 45 && dt < 400) slow++; else if (slow > 0) slow -= 0.5; }
      last = now;
      if (!lowered && slow > 40) { lowered = true; renderer.setPixelRatio(1); }
      fit(renderer, camera, canvas); layout();
      const t = (now - t0) / 1000 * speed;
      pivot.rotation.z = Math.sin(t * 1.1) * 0.12;
      orn.rotation.y = t * 0.5;
      minis.forEach(m => { m.position.y = m.userData.y + Math.sin(t + m.userData.ph) * 0.25; m.rotation.y = t; });
      bokeh.rotation.z = t * 0.01;
      camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.05;
      camera.position.y += (-pointer.y * 0.8 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    if (hasGsap && !entered) { entered = true; gsap.from(pivot.position, { y: 9, duration: 2, ease: 'elastic.out(1, .5)', delay: 1.1 }); }
    requestAnimationFrame(frame);
    return { start() { if (!on) { on = true; requestAnimationFrame(frame); } }, stop() { on = false; } };
  }

  // ---- Escena de premios: trofeo dorado que crece con el premio
  function trophyScene() {
    const canvas = $('#stage-trophy');
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.3, 5.6);
    scene.environment = envTexture(renderer);
    scene.add(new THREE.AmbientLight(0xffffff, .3));
    const key = new THREE.SpotLight(0xffffff, 2.2, 30, .5, .6); key.position.set(3, 7, 5); scene.add(key);
    const rim = new THREE.PointLight(0xc8f000, 2.4, 12); rim.position.set(-3, 2, -2); scene.add(rim);
    const rim2 = new THREE.PointLight(0xe3262f, 2, 12); rim2.position.set(3, 0, -2); scene.add(rim2);

    const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: .18, clearcoat: .6, envMapIntensity: 1.8 });
    const trophy = new THREE.Group();
    const prof = [[0, 0], [.62, 0], [.62, .1], [.4, .16], [.16, .3], [.11, .62], [.15, .82], [.32, .95], [.52, 1.15], [.64, 1.62], [.58, 1.64], [.47, 1.2], [0, 1.02]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 80), gold); trophy.add(cup);
    [-1, 1].forEach(s => {
      const hdl = new THREE.Mesh(new THREE.TorusGeometry(.26, .045, 16, 40, Math.PI * 1.25), gold);
      hdl.position.set(s * .6, 1.28, 0); hdl.rotation.z = s > 0 ? -Math.PI * .62 : Math.PI * 1.62; trophy.add(hdl);
    });
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), new THREE.MeshStandardMaterial({ color: 0xc8f000, emissive: 0xc8f000, emissiveIntensity: .8, metalness: .3, roughness: .2 }));
    star.position.set(0, 1.0, .5); trophy.add(star);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.85, .95, .38, 64), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, metalness: .4, roughness: .25, clearcoat: 1 }));
    base.position.y = -.19;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.865, .875, .06, 64), new THREE.MeshStandardMaterial({ color: 0xc8f000, emissive: 0x9fbf00, emissiveIntensity: .7 }));
    band.position.y = -.12;
    const all = new THREE.Group(); all.add(trophy, base, band); all.position.y = -.55; scene.add(all);

    // Disco de luz bajo el trofeo
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.8, 48), new THREE.MeshBasicMaterial({ map: softSprite(), color: 0xf2c14e, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = -.74; scene.add(glow);

    // Chispas doradas
    const N = 60, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, r = 1 + Math.random() * 1.6; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.random() * 3 - .6; p[i * 3 + 2] = Math.sin(a) * r; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: .09, map: softSprite(), color: 0xffe39a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(sparks);

    const state = { scale: 1, spin: 0, dim: 0 };
    let on = false, t0 = performance.now();
    function frame(now) {
      if (!on) return;
      fit(renderer, camera, canvas);
      const t = (now - t0) / 1000 * (calm ? .4 : 1);
      all.rotation.y = t * .6 + state.spin;
      all.scale.setScalar(state.scale);
      star.rotation.y = t * 2;
      sparks.rotation.y = -t * .3;
      gold.color.setRGB(0.95 - state.dim * .55, 0.76 - state.dim * .4, 0.31 - state.dim * .05);
      glow.material.opacity = .35 * (1 - state.dim * .8) * state.scale;
      camera.position.x += (pointer.x * .8 - camera.position.x) * .05;
      camera.lookAt(0, .55, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    return {
      start() { if (!on) { on = true; requestAnimationFrame(frame); } },
      stop() { on = false; },
      // nivel 0..1 según el premio; dim=1 si la categoría no abre
      set(level, dim) {
        if (!hasGsap) { state.scale = .7 + level * .45; state.dim = dim; return; }
        gsap.to(state, { scale: .62 + level * .5, dim, duration: .9, ease: 'elastic.out(1,.55)' });
        gsap.fromTo(state, { spin: state.spin }, { spin: state.spin + Math.PI * 2, duration: 1.1, ease: 'power3.out' });
      }
    };
  }

  // ---- Árbol de Navidad 3D: luces en espiral que se encienden con los regalos
  function treeScene() {
    const canvas = $('#stage-tree');
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 2.2, 8.8);
    scene.environment = envTexture(renderer);
    scene.add(new THREE.HemisphereLight(0x9fc7ff, 0x050d07, .35));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 6, 5); scene.add(key);
    const warm = new THREE.PointLight(0xffb347, 0, 8); warm.position.set(0, 2, 2.5); scene.add(warm);

    const tree = new THREE.Group(); scene.add(tree);
    const lin = h => new THREE.Color(h).convertSRGBToLinear();
    const needle = new THREE.MeshStandardMaterial({ color: lin(0x1d6b3a), emissive: lin(0x02140a), roughness: .85, metalness: 0, flatShading: true, envMapIntensity: .25 });
    // pisos del árbol (y base, radio, alto)
    const tiers = [[.35, 1.75, 1.7], [1.15, 1.42, 1.5], [1.85, 1.08, 1.35], [2.5, .72, 1.15]];
    tiers.forEach(([y, r, h]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9, 1), needle);
      cone.position.y = y + h / 2; tree.add(cone);
      // nieve en el borde de cada piso
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * .93, .06, 6, 9), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = y + .04; tree.add(rim);
    });
    const coneR = y => {           // radio del árbol a una altura
      for (let i = tiers.length - 1; i >= 0; i--) { const [b, r, h] = tiers[i]; if (y >= b && y <= b + h) return r * (1 - (y - b) / h); }
      return 0;
    };
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .5, 12), new THREE.MeshStandardMaterial({ color: lin(0x5a3720), roughness: .9 }));
    trunk.position.y = .2; tree.add(trunk);

    // Estrella
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? .13 : .32; i ? sh.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); }
    const starMat = new THREE.MeshStandardMaterial({ color: 0x55533a, emissive: 0x000000, metalness: .8, roughness: .3 });
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }), starMat);
    star.position.set(0, 3.82, -.04); tree.add(star);
    const sprite = softSprite();
    const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xffd36b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    starGlow.scale.set(2.2, 2.2, 1); starGlow.position.set(0, 3.82, .1); tree.add(starGlow);

    // Luces en espiral
    const COLORS = [0xff3b47, 0xc8f000, 0xffd36b, 0xffffff, 0x4fd1ff];
    const lights = [], N = 64;
    const bulbGeo = new THREE.SphereGeometry(.055, 10, 10);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), y = .45 + t * 3.15, a = t * Math.PI * 2 * 5.2, r = coneR(y) * .97 + .04;
      const col = new THREE.Color(COLORS[i % COLORS.length]);
      const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0x2a2f2a }));
      bulb.position.set(Math.cos(a) * r, y, Math.sin(a) * r); tree.add(bulb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(.6, .6, 1); halo.position.copy(bulb.position); tree.add(halo);
      lights.push({ bulb, halo, col, ph: Math.random() * 6 });
    }
    // Cable de la guirnalda
    const pts = lights.map(l => l.bulb.position.clone());
    const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, .012, 4), new THREE.MeshBasicMaterial({ color: 0x0d150f }));
    tree.add(wire);

    // Adornos: bolas y balones
    const orns = [[0xe3262f, .9, 75], [0xf2c14e, 1.6, 200], [0xe3262f, 2.3, 320], [0xf2c14e, 1.1, 260], [0xc8f000, 2.0, 140], [0xe3262f, 2.9, 30]];
    orns.forEach(([c, y, deg]) => {
      const a = deg * Math.PI / 180, r = coneR(y) * .9 + .1;
      const m = new THREE.Mesh(new THREE.SphereGeometry(.12, 24, 24), new THREE.MeshPhysicalMaterial({ color: c, metalness: .8, roughness: .15, clearcoat: 1 }));
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); tree.add(m);
    });
    [[1.4, 110], [2.6, 250], [.8, 300]].forEach(([y, deg]) => {
      const a = deg * Math.PI / 180, r = coneR(y) * .9 + .12;
      const b = soccerBall(.13, 0xf4f6f1, 0x111111); b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); tree.add(b);
    });

    // Regalos bajo el árbol (aparecen con las metas)
    const gifts = [];
    const giftDefs = [[-1.3, .9, 0xe3262f, 0xf2c14e, .42], [1.25, .7, 0xc8f000, 0xe3262f, .36], [-.5, 1.45, 0xf2c14e, 0xe3262f, .3], [.55, 1.35, 0xffffff, 0xe3262f, .34],
      [-1.75, -.1, 0x2f7d46, 0xf2c14e, .3], [1.8, .1, 0xe3262f, 0xffffff, .32], [0, 1.85, 0xc8f000, 0xf2c14e, .26], [-.95, 1.6, 0xe3262f, 0xc8f000, .24], [1.05, 1.55, 0xf2c14e, 0x2f7d46, .26]];
    giftDefs.forEach(([x, z, c, rb, s]) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(s, s * .85, s), new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .1 })));
      const rm = new THREE.MeshStandardMaterial({ color: rb, metalness: .6, roughness: .3 });
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * .87, s * .18), rm); g.add(r1);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(s * .18, s * .87, s * 1.02), rm); g.add(r2);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(s * .14, s * .05, 8, 16), rm); bow.position.y = s * .48; g.add(bow);
      g.position.set(x, s * .42, z); g.rotation.y = Math.random(); g.scale.setScalar(.001); tree.add(g); gifts.push(g);
    });

    // Suelo con nieve y brillo
    const N2 = 120, sp = new Float32Array(N2 * 3);
    for (let i = 0; i < N2; i++) { sp[i * 3] = (Math.random() - .5) * 8; sp[i * 3 + 1] = Math.random() * 6; sp[i * 3 + 2] = (Math.random() - .5) * 6; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const flakes = new THREE.Points(sg, new THREE.PointsMaterial({ size: .07, map: sprite, color: 0xffffff, transparent: true, opacity: .8, depthWrite: false }));
    scene.add(flakes);

    // Girar con el dedo
    let drag = null, spin = 0, vel = 0;
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', e => { drag = e.clientX; vel = 0; });
    addEventListener('pointermove', e => { if (drag == null) return; const d = (e.clientX - drag) / 120; spin += d; vel = d; drag = e.clientX; });
    addEventListener('pointerup', () => { drag = null; });

    const state = { lit: 0, star: 0, gifts: 0 };
    let on = false, t0 = performance.now();
    function frame(now) {
      if (!on) return;
      fit(renderer, camera, canvas);
      const t = (now - t0) / 1000;
      if (drag == null) { vel *= .94; spin += vel + (calm ? .001 : .003); }
      tree.rotation.y = spin;
      const litN = Math.round(state.lit * N);
      lights.forEach((l, i) => {
        const on = i < litN, tw = .75 + Math.sin(t * 3 + l.ph) * .25;
        l.bulb.material.color.set(on ? l.col : 0x2a2f2a);
        l.halo.material.opacity = on ? tw : 0;
      });
      starMat.emissive.setRGB(state.star * 1, state.star * .75, state.star * .25);
      starMat.color.setRGB(.33 + state.star * .6, .33 + state.star * .45, .23);
      starGlow.material.opacity = state.star * (.8 + Math.sin(t * 2) * .2);
      star.rotation.y = Math.sin(t) * .4;
      warm.intensity = state.lit * 1.6;
      const gN = state.gifts * gifts.length;
      gifts.forEach((g, i) => { const k = Math.max(0, Math.min(1, gN - i)); g.scale.setScalar(Math.max(.001, k)); });
      const pos = sg.attributes.position;
      for (let i = 0; i < N2; i++) { let y = pos.getY(i) - .006; if (y < 0) y = 6; pos.setY(i, y); }
      pos.needsUpdate = true;
      camera.position.x += (pointer.x * .6 - camera.position.x) * .05;
      camera.lookAt(0, 1.95, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    return {
      state, get running() { return on; },
      start() { if (!on) { on = true; requestAnimationFrame(frame); } },
      stop() { on = false; },
      // p = progreso 0..1 hacia la meta final; starAt = progreso de la primera meta
      set(p, starAt, opts = {}) {
        const target = { lit: p, star: p >= starAt ? 1 : 0, gifts: p };
        if (!hasGsap) { Object.assign(state, target); return; }
        if (opts.test) {
          // prueba de luces: se prende todo y vuelve al valor real
          gsap.timeline()
            .to(state, { lit: 1, gifts: 1, duration: 2.2, ease: 'power1.inOut' })
            .to(state, { star: 1, duration: .5 }, '-=.4')
            .to(state, { ...target, duration: 1.4, ease: 'power2.inOut', delay: 3 });
        } else gsap.to(state, { ...target, duration: 1.6, ease: 'power2.out' });
      }
    };
  }

  /* =========================================================
     NAVEGACIÓN ENTRE VISTAS (tipo app)
     ========================================================= */
  const ORDER = ['inicio', 'categorias', 'premios', 'agenda', 'navidad', 'redes'];
  const LABEL = { inicio: 'Inicio', categorias: 'Categorías', premios: 'Premios', agenda: 'Agenda', navidad: 'Misión', redes: 'Síguenos' };
  let current = 'inicio', busy = false;
  const scenes = {};

  function placePill(name, instant) {
    const i = ORDER.indexOf(name), pill = $('#dock-pill');
    const x = `calc(${i} * 100%)`;
    if (hasGsap && !instant) gsap.to(pill, { x: 0, xPercent: i * 100, duration: .55, ease: 'back.out(1.4)' });
    else pill.style.transform = `translateX(${i * 100}%)`;
    $$('.dock__btn').forEach(b => { const on = b.dataset.go === name; b.classList.toggle('is-active', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  }
  function updateChrome(name) {
    $('.top').classList.toggle('show-title', name !== 'inicio');
    $('#top-title').textContent = name === 'inicio' ? 'Faith Cup Navideña' : LABEL[name];
    // escenas 3D solo cuando se ven
    scenes.home && (name === 'inicio' ? scenes.home.start() : scenes.home.stop());
    scenes.trophy && (name === 'premios' ? scenes.trophy.start() : scenes.trophy.stop());
    scenes.tree && (name === 'navidad' ? scenes.tree.start() : scenes.tree.stop());
  }
  function go(name, opts = {}) {
    if (!ORDER.includes(name) || name === current || busy) return;
    const from = $(`#v-${current}`), to = $(`#v-${name}`);
    const dir = ORDER.indexOf(name) > ORDER.indexOf(current) ? 1 : -1;
    const prev = current; current = name;
    placePill(name);
    updateChrome(name);
    if (!opts.noHash) history.replaceState(null, '', name === 'inicio' ? location.pathname + location.search : '#' + name);
    to.scrollTop = 0;
    if (!hasGsap) { from.classList.remove('is-active'); to.classList.add('is-active'); return; }
    busy = true;
    to.classList.add('is-active');
    const tl = gsap.timeline({ onComplete: () => { from.classList.remove('is-active'); gsap.set([from, to], { clearProps: 'transform,opacity,filter' }); busy = false; } });
    if (calm) {
      tl.to(from, { opacity: 0, duration: .25 }).fromTo(to, { opacity: 0 }, { opacity: 1, duration: .3 }, 0.1);
    } else {
      tl.to(from, { rotationY: -28 * dir, xPercent: -45 * dir, z: -260, opacity: 0, filter: 'blur(6px)', duration: .6, ease: 'power3.inOut' }, 0)
        .fromTo(to, { rotationY: 28 * dir, xPercent: 45 * dir, z: -260, opacity: 0, filter: 'blur(6px)' },
          { rotationY: 0, xPercent: 0, z: 0, opacity: 1, filter: 'blur(0px)', duration: .7, ease: 'power3.out' }, .12);
    }
    enterAnim(name);
  }
  function enterAnim(name) {
    if (!hasGsap) return;
    const v = $(`#v-${name}`);
    const items = $$('.view__head > *, .days, .agenda > *, .pills, .teams, .result, .ladder, .format, .gifts, .candy, .goals, .minicards, .xmas__tree, .hint, .dots', v);
    gsap.fromTo(items, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out', stagger: .05, delay: .25 });
    if (name === 'navidad') { lightTree(); missionIntro(false); }
    if (name === 'categorias') coverflowUpdate();
    if (name === 'redes' && hasGsap) gsap.fromTo('.red', { y: 50, rotationX: -35, opacity: 0 }, { y: 0, rotationX: 0, opacity: 1, duration: .8, stagger: .1, ease: 'expo.out', delay: .3, clearProps: 'transform' });
  }
  function router() {
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-go]'); if (b) { go(b.dataset.go); }
    });
    // Deslizar a izquierda/derecha para cambiar de sección
    let sx = 0, sy = 0, st = 0, ok = false;
    $('#views').addEventListener('touchstart', e => {
      ok = !e.target.closest('.coverflow, .pills, .teams__row, .days');
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    }, { passive: true });
    $('#views').addEventListener('touchend', e => {
      if (!ok) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - st < 600) {
        const i = ORDER.indexOf(current) + (dx < 0 ? 1 : -1);
        if (ORDER[i]) go(ORDER[i]);
      }
    }, { passive: true });
    addEventListener('keydown', e => {
      if ($('#sheet').classList.contains('is-open')) return;
      if (e.key === 'ArrowRight') { const n = ORDER[ORDER.indexOf(current) + 1]; n && go(n); }
      if (e.key === 'ArrowLeft') { const p = ORDER[ORDER.indexOf(current) - 1]; p && go(p); }
    });
    addEventListener('hashchange', () => { const h = location.hash.slice(1); ORDER.includes(h) && go(h, { noHash: true }); });
    const h = location.hash.slice(1);
    if (ORDER.includes(h) && h !== 'inicio') {
      $('#v-inicio').classList.remove('is-active'); $(`#v-${h}`).classList.add('is-active'); current = h;
    }
    placePill(current, true); updateChrome(current);
  }

  /* =========================================================
     HOJAS INFERIORES
     ========================================================= */
  let lastFocus = null;
  function openSheet(html) {
    const s = $('#sheet');
    $('#sheet-body').innerHTML = html;
    lastFocus = document.activeElement;
    s.classList.add('is-open'); s.setAttribute('aria-hidden', 'false');
    $('#sheet-body').scrollTop = 0;
    $$('#sheet-body .js-wa').forEach(a => { a.href = waLink(a.dataset.msg); a.target = '_blank'; a.rel = 'noopener'; });
    if (hasGsap) gsap.fromTo('#sheet-body > *', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .04, ease: 'power3.out', delay: .12 });
    setTimeout(() => $('.sheet__close').focus(), 50);
  }
  function closeSheet() {
    const s = $('#sheet'); s.classList.remove('is-open'); s.setAttribute('aria-hidden', 'true');
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  const SHEETS = {
    inscripcion() {
      const t = {
        antes: 'Las inscripciones abren el <b>lunes 23 de noviembre</b>. Separa ya el cupo de tu iglesia.',
        abiertas: '¡Abiertas hasta el <b>6 de diciembre</b>!',
        cerradas: 'Las inscripciones cerraron. Puedes venir a ver los partidos y donar regalos.',
        enJuego: 'El torneo está en juego. Las inscripciones ya cerraron.',
        terminado: 'Esta edición terminó. ¡Gracias por jugar por una Navidad!'
      }[fase()];
      return `<h3 id="sheet-title">Inscribe tu iglesia</h3><p class="sub">${t}</p>
        <ul class="list">
          <li data-i="⚽">Elige la categoría y arma tu plantilla.</li>
          <li data-i="🪪">Documento de cada jugador: la edad va por año de nacimiento.</li>
          <li data-i="🎁">Trae mínimo <b>5 regalos</b> para niños.</li>
          <li data-i="💳">Paga la inscripción para asegurar el cupo.</li>
        </ul>
        <a class="btn btn--wa js-wa" href="#" data-msg="Hola, quiero inscribir a mi iglesia en la Faith Cup Navideña 2026.">Separar cupo por WhatsApp</a>`;
    },
    causa() {
      return `<h3 id="sheet-title">Misión <em>Navidad</em></h3>
        <p class="sub">Lo que hace distinta a la Faith Cup: cada equipo juega por un niño. Todo lo donado va a niños a través de una fundación aliada.</p>
        <ul class="list">
          <li data-i="🎁">Cada equipo trae mínimo 5 regalos: juguete nuevo o ropa en buen estado.</li>
          <li data-i="📍">Punto de donación abierto al público en todos los partidos.</li>
          <li data-i="📸">Después del torneo publicamos la entrega con fotos y video.</li>
        </ul>
        <button class="btn btn--lime btn--block" type="button" data-go="navidad" data-close>Ver el árbol de regalos</button>`;
    },
    categoria(id) {
      const c = C.categorias.find(x => x.id === id);
      const st = estadoCat(c);
      const premio = c.premio.tipo === 'dinero' ? 'Hasta ' + money(c.premio.escalas[0].campeon) + ' + trofeo y medallas' : 'Trofeo + medallas';
      return `<span class="badge badge--${st.cls}">${st.txt}</span>
        <h3 id="sheet-title">${esc(c.nombre)}</h3><p class="sub">${esc(c.deporte)} · ${esc(c.edad)} · nacidos ${esc(c.nacimiento)}</p>
        <div class="kv">
          <div class="gold"><small>Inscripción</small><b>${money(c.inscripcion)}</b></div>
          <div class="gold"><small>Campeón</small><b>${premio}</b></div>
          <div><small>Cancha</small><b>${esc(c.cancha)}</b></div>
          <div><small>Inscritos</small><b>${c.inscritos} de ${c.maxEquipos}</b></div>
          <div class="wide"><small>Cuándo juega</small><b>${esc(c.cuando)}</b></div>
          <div class="wide"><small>Equipo</small><b>${esc(c.jugadores)}</b></div>
          <div class="wide"><small>Partidos</small><b>${esc(c.partido)}</b></div>
          <div class="wide"><small>Para abrir</small><b>Mínimo ${c.minEquipos} equipos · máximo ${c.maxEquipos}</b></div>
        </div>
        ${cuposBlock(c)}
        <button class="btn btn--glass btn--block" type="button" data-go="premios" data-close data-cat="${c.id}" style="margin-bottom:8px">Ver cómo cambia el premio</button>
        <button class="btn btn--lime btn--block" type="button" data-reg="${c.id}">Inscribir equipo en ${esc(c.nombre)}</button>`;
    },
    formato() {
      const { cat, n } = prizeState;
      const abre = n >= cat.minEquipos;
      let body;
      if (!abre) body = `<div class="grp"><p>No abre</p>Faltan ${cat.minEquipos - n} equipo(s). Si al 6 de diciembre no se llega al mínimo, se devuelve la inscripción.</div>`;
      else if (n === 8) {
        const g = (L) => `<div class="grp"><p>Grupo ${L}</p><div>${[1, 2, 3, 4].map(i => `<span class="tm ${i < 3 ? 'q' : ''}">${L}${i}</span>`).join('')}</div></div>`;
        body = `${g('A')}${g('B')}<p class="arrow">↓ pasan los 2 primeros ↓</p><div class="ko"><span>1A vs 2B</span><span>1B vs 2A</span></div><div class="ko"><span>3er puesto</span><span class="f">🏆 Final</span></div>`;
      } else {
        body = `<div class="grp"><p>Un solo grupo · ${n} equipos</p><div>${Array.from({ length: n }, (_, i) => `<span class="tm ${i < 4 ? 'q' : ''}">${i + 1}</span>`).join('')}</div></div><p class="arrow">↓ según la tabla ↓</p><div class="ko"><span>3ro vs 4to</span><span class="f">🏆 1ro vs 2do</span></div>`;
      }
      return `<h3 id="sheet-title">Formato</h3><p class="sub">${esc(cat.nombre)} con ${n} equipos</p><div class="fmt">${body}</div>
        <div class="acc"><details><summary>Desempates y penales</summary><div class="body"><ul>
        <li>Ganado 3, empate 1, perdido 0.</li><li>Desempate: diferencia de gol, goles a favor, resultado entre ellos.</li>
        <li>Empate en eliminatoria: 3 penales por equipo; si sigue, muerte súbita.</li></ul></div></details></div>`;
    },
    donar() {
      return `<h3 id="sheet-title">Cómo donar</h3><p class="sub">Todo va a niños a través de una fundación aliada.</p>
        <ul class="list">
          <li data-i="🎁"><b>5 regalos por equipo</b>, al inscribirse o antes del primer partido.</li>
          <li data-i="🧸">Juguete nuevo o ropa en buen estado.</li>
          <li data-i="📍">Punto de donación abierto al público en todos los partidos.</li>
          <li data-i="📱">En la caja hay un <b>código QR</b>: lo escaneas, registras tu regalo y entras solo al <b>sorteo del Gol Navideño</b>. Cada regalo es una oportunidad.</li>
          <li data-i="❤️">Premio <b>Corazón Navideño</b> al equipo que más done.</li>
        </ul>
        <a class="btn btn--wa js-wa" href="#" data-msg="Hola, quiero donar regalos para la Faith Cup Navideña 2026.">Quiero donar</a>`;
    },
    ranking() {
      const r = C.donaciones.ranking.slice().sort((a, b) => b.regalos - a.regalos).slice(0, 8);
      const rows = r.length ? r.map((x, i) => `<li data-i="${i === 0 ? '❤️' : i + 1}"><b>${esc(x.equipo)}</b> · ${x.regalos} regalos</li>`).join('')
        : '<li data-i="⏳">Arranca cuando se inscriban los primeros equipos.</li>';
      return `<h3 id="sheet-title">Corazón Navideño</h3><p class="sub">El equipo que más done gana el premio Corazón Navideño.</p><ul class="list">${rows}</ul>`;
    },
    dinamicas() {
      return `<h3 id="sheet-title">Dinámicas <em>navideñas</em></h3><p class="sub">No es solo fútbol. Es Navidad.</p>
        <ul class="list">
          <li data-i="🎅">Papá Noel en las finales y en la premiación.</li>
          <li data-i="🎶">Villancico de las barras antes de la final Libre.</li>
          <li data-i="🎟️">Sorteo del Gol Navideño.</li>
          <li data-i="📸">Foto final con todas las donaciones.</li>
        </ul>`;
    },
    redes() {
      return `<h3 id="sheet-title">Síguenos</h3><p class="sub">Ahí publicamos los grupos, los resultados de cada día, los goles y la entrega de regalos.</p>
        <div class="socials">${C.redes.map(r => `<a class="social social--${r.id}" href="${esc(r.url)}" target="_blank" rel="noopener">
          <span class="social__ico">${SOCIAL[r.id]}</span><span class="social__txt"><b>${esc(r.nombre)}</b><small>${esc(r.usuario)} · ${esc(r.texto)}</small></span><span class="social__go">Seguir</span></a>`).join('')}</div>`;
    },
    inscritos() {
      const total = C.categorias.reduce((n, c) => n + c.inscritos, 0);
      return `<h3 id="sheet-title">Inscritos</h3><p class="sub">${total ? `${total} ${total === 1 ? 'equipo ya está' : 'equipos ya están'} dentro. Se actualiza en vivo.` : 'Todavía no hay equipos. ¡Sé el primero!'}</p>
        ${C.categorias.map(c => `<div class="cupo-cat"><p class="cupo-cat__t"><b>${esc(c.nombre)}</b><span>${c.inscritos}/${c.maxEquipos}</span></p>${cuposBlock(c, true)}</div>`).join('')}
        <button class="btn btn--lime btn--block" type="button" data-reg="">Inscribir mi iglesia</button>`;
    },
    mas() {
      return `<h3 id="sheet-title">Más</h3><p class="sub">Todo lo demás del torneo.</p>
        <div class="menu">
          <button type="button" data-sheet="redes"><span>📲</span>Síguenos<small>Instagram, TikTok, YouTube</small></button>
          <button type="button" data-sheet="inscritos"><span>⛪</span>Inscritos<small>Quiénes ya están</small></button>
          <button type="button" data-sheet="reglamento"><span>📋</span>Reglamento<small>Las reglas claras</small></button>
          <button type="button" data-sheet="faq"><span>❓</span>Preguntas<small>Lo que siempre preguntan</small></button>
          <button type="button" data-sheet="causa"><span>🎁</span>Misión Navidad<small>Regalos para niños</small></button>
          <button type="button" data-sheet="patrocinar"><span>🤝</span>Patrocinar<small>Tu marca en la valla</small></button>
          ${C.linkEnVivo ? `<a href="${esc(C.linkEnVivo)}" target="_blank" rel="noopener"><span>📺</span>En vivo<small>Grupos y resultados</small></a>` : `<button type="button" disabled style="opacity:.55"><span>📺</span>En vivo<small>Se activa el 9 de dic</small></button>`}
          <button type="button" data-sheet="whatsapp"><span>💬</span>WhatsApp<small>Escríbenos</small></button>
        </div>`;
    },
    reglamento() {
      return `<h3 id="sheet-title">Reglamento</h3><p class="sub">Reglas base. Pueden ajustarse antes del torneo.</p>
        <div class="acc">${C.reglamento.map((r, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(r.titulo)}</summary><div class="body"><ul>${r.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></details>`).join('')}</div>`;
    },
    faq() {
      return `<h3 id="sheet-title">Preguntas</h3><p class="sub">Si no está aquí, escríbenos.</p>
        <div class="acc">${C.faq.map(f => `<details><summary>${esc(f.p)}</summary><div class="body">${esc(f.r)}</div></details>`).join('')}</div>`;
    },
    patrocinar() {
      return `<h3 id="sheet-title">Patrocina</h3><p class="sub">Tu marca en las vallas de la cancha, en los videos y en el sorteo del Gol Navideño.</p>
        <a class="btn btn--wa js-wa" href="#" data-msg="Hola, quiero patrocinar la Faith Cup Navideña 2026.">Quiero patrocinar</a>`;
    },
    whatsapp() {
      const q = ['¿Cómo inscribo a mi iglesia?', '¿Cuáles son los medios de pago?', '¿Qué documentos necesitan los jugadores?', '¿Quedan cupos en mi categoría?', 'Quiero donar regalos sin jugar', 'Quiero patrocinar el torneo'];
      return `<h3 id="sheet-title">Hablemos</h3>
        <div class="bubble">¡Hola! 🎄 Elige una pregunta y te llevamos al chat con el mensaje listo.</div>
        <div class="chips">${q.map(x => `<a target="_blank" rel="noopener" href="${waLink('Hola, sobre la Faith Cup Navideña 2026: ' + x)}">${esc(x)}</a>`).join('')}</div>
        <a class="btn btn--wa js-wa" href="#" data-msg="Hola, quiero más información sobre la Faith Cup Navideña 2026.">Abrir WhatsApp · +57 322 246 2392</a>`;
    }
  };
  function sheets() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-sheet]');
      if (t) { const fn = SHEETS[t.dataset.sheet]; fn && openSheet(fn(t.dataset.arg)); return; }
      const c = e.target.closest('[data-close]');
      if (c && c.closest('#sheet')) {
        if (c.dataset.cat) selectPrizeCat(c.dataset.cat);
        closeSheet();
      }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
    // Arrastrar la hoja hacia abajo para cerrarla
    const panel = $('.sheet__panel'); let y0 = null;
    panel.addEventListener('touchstart', e => { if ($('#sheet-body').scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    panel.addEventListener('touchmove', e => { if (y0 == null) return; const d = e.touches[0].clientY - y0; if (d > 0) panel.style.transform = `translateY(${d}px)`; }, { passive: true });
    panel.addEventListener('touchend', e => { if (y0 == null) return; const d = e.changedTouches[0].clientY - y0; panel.style.transform = ''; y0 = null; if (d > 110) closeSheet(); });
  }

  /* =========================================================
     INICIO: cuenta regresiva
     ========================================================= */
  function countdown() {
    const label = $('#cd-label'), u = { d: $('[data-u="d"]'), h: $('[data-u="h"]'), m: $('[data-u="m"]'), s: $('[data-u="s"]') };
    function target() {
      return ({ antes: [F.abre, 'Abren inscripciones en'], abiertas: [F.cierra, 'Cierran inscripciones en'], cerradas: [F.inicio, 'Arranca el torneo en'],
        enJuego: [null, '¡El torneo está en juego!'], terminado: [null, '¡Gracias por jugar por una Navidad!'] })[fase()];
    }
    let first = true;
    function set(el, v) {
      const s = String(v).padStart(2, '0'); if (el.textContent === s) return;
      el.textContent = s;
      if (hasGsap && !calm && !first && !document.getElementById('intro')) gsap.fromTo(el.parentElement, { rotationX: -90 }, { rotationX: 0, duration: .5, ease: 'back.out(2)', overwrite: 'auto' });
    }
    function tick() {
      const [t, txt] = target(); label.textContent = txt;
      if (!t) { $('.cd__row').style.display = 'none'; return; }
      let d = Math.max(0, t - new Date());
      const D = Math.floor(d / 864e5); d -= D * 864e5; const H = Math.floor(d / 36e5); d -= H * 36e5; const M = Math.floor(d / 6e4); d -= M * 6e4;
      set(u.d, D); set(u.h, H); set(u.m, M); set(u.s, Math.floor(d / 1000));
      first = false;
    }
    tick(); setInterval(tick, 1000);
  }

  /* =========================================================
     CATEGORÍAS: coverflow 3D
     ========================================================= */
  const ICON = {
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/></svg>',
    volley: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3c-1 5 1 9 7.5 10.5M3.3 10C8 9 11.5 11 12 21M5 18c3-4 7-5 14-3.5"/></svg>'
  };
  function estadoCat(c) {
    const f = fase();
    if (c.inscritos >= c.maxEquipos) return { cls: 'full', txt: 'Llena' };
    if (f === 'antes') return C.inscripcion && C.inscripcion.preinscripcion
      ? { cls: 'open', txt: `${c.maxEquipos - c.inscritos} cupos` } : { cls: 'soon', txt: 'Abre 23 nov' };
    if (f === 'abiertas') return { cls: 'open', txt: `${c.maxEquipos - c.inscritos} cupos` };
    if (c.inscritos < c.minEquipos) return { cls: 'closed', txt: 'No abre' };
    return { cls: 'closed', txt: 'Cerrada' };
  }
  const THEME = { mini: 'c-mini', pre: 'c-pre', juvenil: 'c-juvenil', libre: 'c-libre', voley: 'c-voley' };
  // Barra de cupos + nombres de las iglesias inscritas
  function cuposBlock(c, compact) {
    const names = c.iglesias || [];
    const slots = Array.from({ length: c.maxEquipos }, (_, i) => `<i class="${i < c.inscritos ? 'on' : ''} ${i < c.minEquipos ? 'min' : ''}"></i>`).join('');
    return `<div class="cupos ${compact ? 'cupos--sm' : ''}">
      ${compact ? '' : `<p class="cupos__t">Equipos inscritos <b>${c.inscritos}/${c.maxEquipos}</b></p>`}
      <div class="cupos__slots" title="Las rayas marcadas son el mínimo para abrir">${slots}</div>
      ${names.length ? `<div class="cupos__names">${names.map(n => `<span>⛪ ${esc(n)}</span>`).join('')}</div>` : `<p class="cupos__empty">Aún no hay equipos. Faltan ${c.minEquipos} para abrir.</p>`}
    </div>`;
  }
  function renderLive() {
    const el = $('#live'); if (!el) return;
    const total = C.categorias.reduce((n, c) => n + c.inscritos, 0);
    const names = C.categorias.flatMap(c => (c.iglesias || []).map(n => `${n} · ${c.nombre}`));
    el.innerHTML = total
      ? `<span class="live__dot"></span><b>${total}</b> ${total === 1 ? 'equipo inscrito' : 'equipos inscritos'}<span class="live__names"><span class="live__track">${names.concat(names).map(n => `<i>${esc(n)}</i>`).join('')}</span></span><span class="live__go">Ver ›</span>`
      : `<span class="live__dot"></span>Inscripciones abiertas · <b>sé el primer equipo</b><span class="live__go">Ver ›</span>`;
  }
  const SOCIAL = {
    instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" class="f"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.3 4.5 5 4.8"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" class="f"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H9v3h2.7V21"/></svg>'
  };
  function renderRedes() {
    const el = $('#redes'); if (!el || !C.redes) return;
    el.innerHTML = C.redes.map(r => `<a class="red social--${r.id}" href="${esc(r.url)}" target="_blank" rel="noopener">
      <span class="red__glow" aria-hidden="true"></span>
      <span class="red__ico">${SOCIAL[r.id]}</span>
      <span class="red__txt"><b>${esc(r.nombre)}</b><small>${esc(r.usuario)}</small><i>${esc(r.texto)}</i></span>
      <span class="red__go">Seguir</span>
    </a>`).join('');
    // inclinación 3D al pasar el dedo o el mouse
    $$('.red', el).forEach(card => {
      card.addEventListener('pointermove', e => {
        const b = card.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
        card.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
  function renderFollow() {
    const el = $('#follow'); if (!el || !C.redes) return;
    el.innerHTML = `<span class="follow__lbl">Síguenos</span>${C.redes.map(r => `<a class="follow__btn social--${r.id}" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="${esc(r.nombre)} ${esc(r.usuario)}">${SOCIAL[r.id]}</a>`).join('')}`;
  }
  function categories(refresh) {
    const cf = $('#coverflow');
    cf.innerHTML = C.categorias.map(c => {
      const st = estadoCat(c);
      const premio = c.premio.tipo === 'dinero' ? money(c.premio.escalas[0].campeon) : 'Trofeo';
      return `<div class="ccard ${THEME[c.id] || 'c-libre'}">
        <button class="ccard__in" type="button" data-sheet="categoria" data-arg="${c.id}" aria-label="${esc(c.nombre)}: ver detalles">
          <div class="ccard__top"><span class="ccard__sport">${ICON[c.icono] || ''}${esc(c.deporte)}</span><span class="badge badge--${st.cls}">${st.txt}</span></div>
          <span class="ccard__big" aria-hidden="true">${esc(c.nombre.charAt(0))}</span>
          <h3 class="ccard__name">${esc(c.nombre)}</h3>
          <p class="ccard__age">${esc(c.edad)}</p>
          <div class="ccard__chips"><span>${esc(c.cancha)}</span><span>${esc(c.cuando.split(' + ')[0])}</span></div>
          <div class="ccard__cupo"><span><b>${c.inscritos}</b> de ${c.maxEquipos} equipos</span><div class="bar"><i style="width:${Math.min(100, c.inscritos / c.maxEquipos * 100)}%"></i></div></div>
          <div class="ccard__foot">
            <div class="ccard__prize"><small>Campeón${c.premio.tipo === 'dinero' ? ' · hasta' : ''}</small><b>${premio}</b></div>
            <span class="ccard__open" aria-hidden="true">+</span>
          </div>
        </button></div>`;
    }).join('');
    $('#cf-dots').innerHTML = C.categorias.map(() => '<span></span>').join('');
    if (refresh) return;
    cf.addEventListener('scroll', () => requestAnimationFrame(coverflowUpdate), { passive: true });
    addEventListener('resize', coverflowUpdate);
    // empieza en Libre
    requestAnimationFrame(() => {
      const i = Math.max(0, C.categorias.findIndex(c => c.destacada));
      const card = cf.children[i]; cf.scrollLeft = card.offsetLeft - (cf.clientWidth - card.clientWidth) / 2;
      coverflowUpdate();
    });
    // escritorio: arrastrar con el mouse y rueda horizontal
    let down = false, sx = 0, sl = 0, moved = false;
    cf.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = cf.scrollLeft; cf.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - sx; if (Math.abs(d) > 5) moved = true; cf.scrollLeft = sl - d; });
    addEventListener('pointerup', () => { if (!down) return; down = false; cf.style.scrollSnapType = ''; });
    cf.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    cf.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { cf.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  }
  function coverflowUpdate() {
    const cf = $('#coverflow'); if (!cf) return;
    const mid = cf.scrollLeft + cf.clientWidth / 2;
    let best = 0, bestD = Infinity;
    Array.from(cf.children).forEach((card, i) => {
      const c = card.offsetLeft + card.clientWidth / 2;
      const d = (c - mid) / card.clientWidth;               // -1..1 aprox
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
      const k = Math.max(-1.6, Math.min(1.6, d));
      card.style.transform = `translateX(${-k * 14}%) rotateY(${-k * 32}deg) translateZ(${-Math.abs(k) * 120}px) scale(${1 - Math.abs(k) * .08})`;
      card.style.zIndex = String(100 - Math.round(Math.abs(k) * 10));
      card.style.opacity = String(1 - Math.min(.55, Math.abs(k) * .4));
      card.firstElementChild.style.setProperty('--shine', `${k * 160}%`);
    });
    $$('#cf-dots span').forEach((s, i) => s.classList.toggle('on', i === best));
  }

  /* =========================================================
     PREMIOS
     ========================================================= */
  const prizeState = { cat: null, n: 8 };
  const MAX_PRIZE = Math.max(...C.categorias.filter(c => c.premio.tipo === 'dinero').map(c => c.premio.escalas[0].campeon));
  function prizeFor(cat, n) {
    if (n < cat.minEquipos) return null;
    if (cat.premio.tipo !== 'dinero') return { especie: true };
    return cat.premio.escalas.find(s => n >= s.min) || null;
  }
  function selectPrizeCat(id) {
    prizeState.cat = C.categorias.find(c => c.id === id) || prizeState.cat;
    $$('#pz-cats button').forEach(b => b.setAttribute('aria-checked', b.dataset.id === prizeState.cat.id));
    renderPrize(true);
  }
  function prizes() {
    prizeState.cat = C.categorias.find(c => c.destacada) || C.categorias[0];
    $('#pz-cats').innerHTML = C.categorias.map(c => `<button type="button" role="radio" aria-checked="${c === prizeState.cat}" data-id="${c.id}">${esc(c.nombre)}</button>`).join('');
    $('#pz-cats').addEventListener('click', e => { const b = e.target.closest('button'); if (b) selectPrizeCat(b.dataset.id); });
    $('#pz-teams').innerHTML = [4, 5, 6, 7, 8].map(n => `<button type="button" role="radio" aria-checked="${n === 8}" data-n="${n}" aria-label="${n} equipos">${n}</button>`).join('');
    $('#pz-teams').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      prizeState.n = Number(b.dataset.n); renderPrize(true);
    });
    renderPrize(false);
  }
  function countTo(el, to) {
    const from = Number(el.dataset.v || 0); el.dataset.v = to;
    if (!hasGsap) { el.textContent = money(to); return; }
    const o = { v: from };
    gsap.to(o, { v: to, duration: .9, ease: 'power3.out', onUpdate: () => { el.textContent = money(Math.round(o.v / 10000) * 10000); } });
  }
  function renderPrize(animate) {
    const { cat, n } = prizeState;
    $$('#pz-teams button').forEach(b => {
      b.setAttribute('aria-checked', Number(b.dataset.n) === n);
      b.classList.toggle('no', Number(b.dataset.n) < cat.minEquipos);
    });
    $('#pz-fee').textContent = 'Inscripción ' + money(cat.inscripcion) + ' por equipo';
    const p = prizeFor(cat, n), res = $('#pz-result'), camp = $('#pz-camp'), sub = $('#pz-sub');
    res.classList.toggle('is-closed', !p);
    if (!p) {
      camp.textContent = 'No abre'; camp.dataset.v = 0; sub.textContent = `Mín. ${cat.minEquipos}`; sub.dataset.v = 0;
    } else if (p.especie) {
      camp.textContent = 'Trofeo + premio'; camp.dataset.v = 0; sub.textContent = 'Medallas'; sub.dataset.v = 0;
    } else { countTo(camp, p.campeon); countTo(sub, p.sub); }
    $('#pz-camp-x').hidden = $('#pz-sub-x').hidden = !p || !!p.especie;

    // escalera: premio del campeón con 4, 5, 6, 7 y 8 equipos
    $('#pz-ladder').innerHTML = [4, 5, 6, 7, 8].map(k => {
      const q = prizeFor(cat, k);
      const v = !q ? 0 : q.especie ? .45 : q.campeon / MAX_PRIZE;
      const lbl = !q ? '✕' : q.especie ? '🏆' : '$' + (q.campeon / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + 'M';
      return `<div class="${k === n ? 'on' : ''} ${!q ? 'zero' : ''}" style="height:${Math.max(14, v * 100)}%"><span>${lbl}</span></div>`;
    }).join('');

    $('#pz-format-txt').textContent = !p ? `No abre con ${n} equipos` : n === 8 ? '2 grupos de 4 → semis → final' : `Un solo grupo de ${n} → final`;

    const level = !p ? .2 : p.especie ? .45 : p.campeon / MAX_PRIZE;
    scenes.trophy && scenes.trophy.set(level, p ? 0 : 1);
    if (animate && hasGsap) gsap.fromTo('#pz-result', { scale: .96 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
  }

  /* =========================================================
     AGENDA
     ========================================================= */
  function agenda() {
    const days = $('#days'), box = $('#agenda');
    const short = { semana: ['Mié–Vie', '9 · 10 · 11 dic'], sabado: ['Sábado', '12 dic'], domingo: ['Domingo', '13 dic · Final'] };
    days.innerHTML = C.calendario.map((d, i) => `<button class="day" type="button" role="tab" aria-selected="${i === 0}" data-i="${i}"><b>${short[d.id] ? short[d.id][0] : esc(d.etiqueta)}</b><small>${short[d.id] ? short[d.id][1] : ''}</small></button>`).join('');
    function show(i, animate) {
      const d = C.calendario[i];
      $$('.day', days).forEach(b => b.setAttribute('aria-selected', Number(b.dataset.i) === i));
      box.innerHTML = `<p class="agenda__title"><b>${esc(d.titulo)}</b> · ${esc(d.horario)}</p>` + d.canchas.map(c => `
        <div class="court"><p class="court__name"><i></i>${esc(c.nombre)}</p>
          ${c.items.map(it => `<div class="match ${it.final ? 'match--final' : ''}">
            <span class="match__h">${esc(it.hora)}</span><span class="match__t">${it.final ? '🏆 ' : ''}${esc(it.texto)}</span>
            ${it.detalle ? `<button class="match__info" type="button" aria-label="Detalle" data-tip="${esc(it.detalle)}">i</button>` : '<span></span>'}
          </div>`).join('')}
        </div>`).join('') + (d.cierre ? `<div class="closing"><b>${esc(d.cierre.hora)}</b><p><strong>${esc(d.cierre.texto)}</strong> · ${esc(d.cierre.detalle)}</p></div>` : '');
      if (animate && hasGsap) gsap.fromTo('#agenda > *', { y: 18, opacity: 0, rotationX: -20 }, { y: 0, opacity: 1, rotationX: 0, duration: .55, stagger: .07, ease: 'power3.out' });
    }
    days.addEventListener('click', e => { const b = e.target.closest('.day'); if (b) show(Number(b.dataset.i), true); });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-tip]'); if (!b) return;
      openSheet(`<h3 id="sheet-title">Detalle</h3><p class="sub">${b.dataset.tip}</p>`);
    });
    // por defecto, el día del torneo que toca (o el primero)
    const now = new Date(), day = now.getDate(), month = now.getMonth();
    show(month === 11 && day === 12 ? 1 : month === 11 && day === 13 ? 2 : 0, false);
  }

  /* =========================================================
     NAVIDAD: árbol con luces
     ========================================================= */
  // Explicación de la Misión Navidad: sale sola la primera vez que se entra (por visita) y con "¿Por qué?"
  function missionIntro(force) {
    const el = $('#mi');
    if (!force) { let seen = false; try { seen = sessionStorage.getItem('fc-mi') === '1'; } catch (e) {} if (seen) return; }
    try { sessionStorage.setItem('fc-mi', '1'); } catch (e) {}
    $('#mi-goal').textContent = META() + ' regalos';
    setTimeout(() => {
      el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
      if (hasGsap) {
        gsap.fromTo('.mi__card', { y: 80, rotationX: 25, opacity: 0, scale: .92 }, { y: 0, rotationX: 0, opacity: 1, scale: 1, duration: .8, ease: 'expo.out' });
        gsap.fromTo('.mi__steps li', { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: .12, delay: .35, duration: .5, ease: 'power3.out' });
      }
      $('#mi-ok').focus();
    }, force ? 0 : 700);
  }
  function missionClose() {
    const el = $('#mi');
    const done = () => { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); lightTree(); };
    if (hasGsap) gsap.to('.mi__card', { y: 60, opacity: 0, duration: .35, ease: 'power2.in', onComplete: done }); else done();
  }
  function missionBind() {
    $('#mi-ok').addEventListener('click', missionClose);
    $('#mi').addEventListener('click', e => { if (e.target.id === 'mi') missionClose(); });
    document.addEventListener('click', e => { if (e.target.closest('[data-mission]')) missionIntro(true); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && $('#mi').classList.contains('is-open')) missionClose(); });
  }
  let treeTested = false;
  const META = () => C.donaciones.metas[C.donaciones.metas.length - 1].cantidad;
  function navidad() {
    const D = C.donaciones, top = META();
    $('#goals').innerHTML = D.metas.map(m => `<div class="goal" data-n="${m.cantidad}"><b>${m.cantidad}</b><small>${esc(m.titulo)}</small></div>`).join('');
    $('#candy').style.width = Math.min(100, D.regalos / top * 100) + '%';
    $$('#goals .goal').forEach(g => g.classList.toggle('done', D.regalos >= Number(g.dataset.n)));
    // tarjeta de Misión Navidad en el inicio
    $('#mission-num').textContent = D.regalos;
    $('#mission-goal').textContent = '/ ' + top;
    setTimeout(() => { $('#mission-fill').style.width = Math.max(3, D.regalos / top * 100) + '%'; }, 1800);
  }
  function lightTree() {
    const D = C.donaciones, v = D.regalos, top = META(), num = $('#gift-num');
    const p = Math.min(1, v / top), starAt = D.metas[0].cantidad / top;
    // Prueba de luces cada vez que se entra: se ve cómo quedará el árbol lleno
    if (scenes.tree) { scenes.tree.set(p, starAt, { test: p < 1 }); treeTested = true; }
    if (!hasGsap) { num.textContent = v; return; }
    const o = { v: 0 };
    gsap.to(o, { v, duration: 1.8, ease: 'power2.out', onUpdate: () => { num.textContent = Math.round(o.v); } });
  }

  /* =========================================================
     INTRO
     ========================================================= */
  function intro() {
    const el = $('#intro');
    if (!hasGsap) { el.remove(); return; }
    const tl = gsap.timeline();
    // Seguro: si el celular va lento, la intro nunca tapa la página más de 4 s
    setTimeout(() => { if (document.body.contains(el)) { tl.progress(1); } }, 4000);
    tl.from('.intro__logo', { scale: .6, opacity: 0, duration: .6, ease: 'back.out(2)' })
      .from('.intro__logo .hat', { y: -80, rotate: -50, opacity: 0, duration: .8, ease: 'bounce.out' }, '-=.3')
      .to('.intro__bar span', { width: '100%', duration: .7, ease: 'power2.inOut' }, '-=.5')
      .to(el, { opacity: 0, scale: 1.08, duration: .5, ease: 'power2.in', onComplete: () => el.remove() })
      .from('.home__logo', { y: 60, scale: .7, opacity: 0, duration: 1, ease: 'expo.out' }, '-=.15')
      .from('.home__logo .hat', { y: -140, rotate: -60, opacity: 0, duration: 1.1, ease: 'bounce.out' }, '-=.75')
      .from('.chip-live', { y: 14, opacity: 0, duration: .5 }, '-=.8')
      .from('.home__title .t1', { y: 80, rotationX: -80, opacity: 0, duration: 1, ease: 'expo.out', transformOrigin: '50% 100%' }, '-=.6')
      .from('.home__title .t2', { y: 30, opacity: 0, scale: .9, duration: .9, ease: 'expo.out' }, '-=.7')
      .from('.home__meta', { y: 12, opacity: 0, duration: .5 }, '-=.6')
      .fromTo('.cd__cell', { y: 30, rotationX: -90, opacity: 0 }, { y: 0, rotationX: 0, opacity: 1, duration: .7, stagger: .08, ease: 'back.out(1.8)', immediateRender: false }, '-=.5')
      .from('.home__ctas > *, .mission', { y: 16, opacity: 0, duration: .5, stagger: .1 }, '-=.4')
      .from('.dock', { y: 120, duration: .8, ease: 'expo.out' }, '-=.6')
      .from('.top, .wa', { opacity: 0, duration: .5 }, '-=.5');
    gsap.to('[data-float]', { y: -8, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    // En equipos lentos, las animaciones siguen el tiempo real en vez de congelarse
    if (hasGsap) gsap.ticker.lagSmoothing(1200, 33);
    categories(); prizes(); agenda(); navidad();
    sheets(); countdown(); snow();
    if (has3D) {
      try { scenes.home = homeScene(); scenes.trophy = trophyScene(); scenes.tree = treeScene(); renderPrize(false); }
      catch (err) { console.warn('3D no disponible:', err); }
    }
    missionBind();
    window.FCApp = {
      closeSheet,
      // la inscripción avisa cuando cambian los cupos
      refreshDonaciones() {
        navidad();
        if (current === 'navidad') lightTree();
      },
      refreshCupos() {
        const cf = $('#coverflow'), x = cf.scrollLeft;
        categories(true); cf.scrollLeft = x; coverflowUpdate(); renderLive();
      }
    };
    renderLive(); renderFollow(); renderRedes();
    router();
    intro();
    if (current !== 'inicio') enterAnim(current);
    // Aviso una sola vez: dónde está "Más"
    let seen = false; try { seen = localStorage.getItem('fc-tip') === '1'; } catch (e) {}
    if (!seen) {
      setTimeout(() => { $('#tip').classList.add('show'); }, 4200);
      setTimeout(() => { $('#tip').classList.remove('show'); try { localStorage.setItem('fc-tip', '1'); } catch (e) {} }, 9500);
    }
  });
})();
