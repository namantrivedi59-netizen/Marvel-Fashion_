

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // This system is the homepage-only Marvel hero background (data-glow="true").
    // Internal pages (data-aurora="true") run js/liquid-bg.js instead. Previously
    // this ran unconditionally on every page and, on success, stripped the
    // data-aurora attribute (see injectTransparencyOverrides/removeAttribute
    // below) before liquid-bg.js's own DOMContentLoaded handler ever checked
    // it — silently preventing the internal-page liquid background from ever
    // initializing. Gating on data-glow here (mirroring aurora.js's own check)
    // fixes that without changing anything about how the homepage renders.
    const onHomepage = document.body.getAttribute('data-glow') === 'true';
    if (!onHomepage) return;

    if (typeof THREE === 'undefined' || !isWebGLAvailable()) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // respect the OS-level setting; CSS fallback already handles this too

    const lite = window.matchMedia('(max-width: 760px)').matches ||
                 (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    let ctx;
    try {
      ctx = buildScene(lite);
    } catch (e) {
      console.warn('MarvelThreeBG: falling back to CSS background —', e);
      return;
    }

    document.body.removeAttribute('data-glow');
    document.body.removeAttribute('data-aurora');
    injectTransparencyOverrides();
    document.body.classList.add('mf-gpu-bg-active');

    /* ---------------- palettes ---------------- */

    const IDLE_PALETTE = [hex(0x4a3592), hex(0x1c3f8f), hex(0x1a6e78)];
    const HERO_PALETTES = {
      weaver:     [hex(0x8f1c2b), hex(0x122f7a), hex(0x4a0d16)],
      storm:      [hex(0x1f6f96), hex(0x9fb8c4), hex(0x1c3f8f)],
      forge:      [hex(0x8a6a1f), hex(0x8f3d18), hex(0x4a3208)],
      sentinel:   [hex(0x1c3a63), hex(0x6a6e78), hex(0x3a557e)],
      king:       [hex(0x4a2680), hex(0x6a6e78), hex(0x2e1354)],
      hulk:       [hex(0x256b3e), hex(0x0d2e19), hex(0x452a8f)],
      blackwidow: [hex(0x7a1830), hex(0x1a0509), hex(0x33333c)],
      hawkeye:    [hex(0x4a2f8f), hex(0x353a45), hex(0x6a4bab)]
    };

    let targetPalette = IDLE_PALETTE;
    const heroSections = document.querySelector('.hero-section[data-hero]');
    if (heroSections) {
      initHeroAtmosphere((heroKey) => {
        targetPalette = HERO_PALETTES[heroKey] || IDLE_PALETTE;
      });
    }

    /* ---------------- cursor, spring-eased ---------------- */

    let mouseTX = 0.5, mouseTY = 0.5;
    let mouseX = 0.5, mouseY = 0.5;
    window.addEventListener('pointermove', (e) => {
      mouseTX = e.clientX / window.innerWidth;
      mouseTY = 1 - e.clientY / window.innerHeight;
    }, { passive: true });

    /* ---------------- resize ---------------- */

    function handleResize() { ctx.resize(); }
    window.addEventListener('resize', handleResize);

    /* ---------------- render loop ---------------- */

    let running = true;
    let rafId = null;
    const clock = new THREE.Clock();

    function tick() {
      if (!running) return;
      mouseX += (mouseTX - mouseX) * 0.05;
      mouseY += (mouseTY - mouseY) * 0.05;

      lerpColor(ctx.uniformsFar.uColorA.value, targetPalette[0], 0.02);
      lerpColor(ctx.uniformsFar.uColorB.value, targetPalette[1], 0.02);
      lerpColor(ctx.uniformsFar.uColorC.value, targetPalette[2], 0.02);
      lerpColor(ctx.uniformsNear.uColor.value, targetPalette[1], 0.02);

      ctx.render(clock.getElapsedTime(), mouseX, mouseY);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) { clock.start(); rafId = requestAnimationFrame(tick); }
      else if (rafId) cancelAnimationFrame(rafId);
    });

    window.addEventListener('pagehide', () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      ctx.dispose();
    });
  }

  /* ---------------- helpers ---------------- */

  function isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function hex(n) { return new THREE.Color(n); }

  function lerpColor(current, target, amount) {
    current.r += (target.r - current.r) * amount;
    current.g += (target.g - current.g) * amount;
    current.b += (target.b - current.b) * amount;
  }

  function initHeroAtmosphere(onHeroChange) {
    const sections = document.querySelectorAll('.hero-section[data-hero]');
    if (!sections.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          onHeroChange(entry.target.getAttribute('data-hero'));
        }
      });
    }, { threshold: [0.5] });
    sections.forEach((s) => io.observe(s));
  }

  
  function injectTransparencyOverrides() {
    if (document.getElementById('mf-gpu-bg-overrides')) return;
    const style = document.createElement('style');
    style.id = 'mf-gpu-bg-overrides';
    style.textContent = `
      body.mf-gpu-bg-active{ background: transparent !important; }
      body.mf-gpu-bg-active .shop-page{ background: transparent !important; }
    `;
    document.head.appendChild(style);
  }


  function buildScene(lite) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed; inset:0; z-index:-5; width:100%; height:100%; pointer-events:none; display:block;';
    document.body.prepend(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.autoClear = true;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 30);
    camera.position.set(0, 0, 0);

    const scene = new THREE.Scene();

    const PRECISION_GLSL = `precision highp float;\n`;
    const NOISE_GLSL = `
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a,b,u.x) + (c-a) * u.y * (1.0-u.x) + (d-b) * u.x * u.y;
      }
      float fbm(vec2 p){
        float v = 0.0, amp = 0.5;
        for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.03; amp *= 0.52; }
        return v;
      }
    `;

    const PLANE_VERT = `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    /* ---------- FAR layer: aurora + liquid gradient + volumetric light + waves + grain ---------- */
    const uniformsFar = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uColorA: { value: new THREE.Color(0x4a3592) },
      uColorB: { value: new THREE.Color(0x1c3f8f) },
      uColorC: { value: new THREE.Color(0x1a6e78) }
    };
    const farMat = new THREE.ShaderMaterial({
      uniforms: uniformsFar,
      vertexShader: PLANE_VERT,
      fragmentShader: PRECISION_GLSL + NOISE_GLSL + `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform vec3 uColorA, uColorB, uColorC;

        void main(){
          vec2 p = vUv - 0.5;
          float t = uTime;

          vec2 warp = vec2(fbm(p*1.6 + t*0.05), fbm(p*1.6 - t*0.045)) * 0.35;

          vec2 mp = uMouse - 0.5;
          float md = length(p - mp);
          vec2 cursorPush = normalize(p - mp + 0.0001) * smoothstep(0.5,0.0,md) * 0.12;
          vec2 pw = p + warp + cursorPush;

          vec2 c1 = vec2(sin(t*0.071)*0.34, cos(t*0.053)*0.30);
          vec2 c2 = vec2(cos(t*0.043)*0.40, sin(t*0.097)*0.26) + vec2(0.28,-0.22);
          vec2 c3 = vec2(sin(t*0.061+2.1)*0.30, cos(t*0.038+1.3)*0.34) + vec2(-0.26,0.24);
          vec2 c4 = vec2(cos(t*0.029+0.7)*0.36, sin(t*0.081+3.0)*0.30) + vec2(0.05,0.30);

          float g1 = smoothstep(0.55,0.0,length(pw-c1));
          float g2 = smoothstep(0.60,0.0,length(pw-c2));
          float g3 = smoothstep(0.50,0.0,length(pw-c3));
          float g4 = smoothstep(0.46,0.0,length(pw-c4));

          vec3 col = vec3(0.045, 0.043, 0.05); // deep charcoal base, not pure black

          // soft dark "shadow" cloud behind the gradients — adds mottled
          // depth to the charcoal itself before any glow is added
          float shadowCloud = fbm(p*0.8 - t*0.02);
          col -= shadowCloud * 0.028;

          col += uColorA * g1 * 0.62;
          col += uColorB * g2 * 0.62;
          col += uColorC * g3 * 0.62;
          col += mix(uColorA,uColorC,0.5) * g4 * 0.42;

          float bands = 0.0;
          for (int i = 0; i < 3; i++){
            float fi = float(i);
            float streak = sin((pw.x*6.0 + fi*2.1) + fbm(pw*3.0 + vec2(fi*10.0, t*0.09))*4.0 + t*0.12);
            streak = smoothstep(0.75,1.0,streak);
            float vFall = smoothstep(0.65,-0.1,pw.y);
            bands += streak * vFall * 0.35;
          }
          col += mix(uColorA,uColorB,0.5) * bands * 0.6;

          vec2 lightSrc = mix(vec2(0.15,0.55), mp, 0.35) + vec2(sin(t*0.023)*0.08, cos(t*0.019)*0.06);
          vec2 toLight = p - lightSrc;
          float ang = atan(toLight.y, toLight.x);
          float rays = 0.5 + 0.5*sin(ang*10.0 + fbm(p*2.0 + t*0.05)*3.0);
          rays = pow(rays, 6.0);
          float lightFalloff = smoothstep(0.9,0.0,length(toLight));
          col += mix(uColorC, vec3(0.9), 0.35) * rays * lightFalloff * 0.10;
          col += mix(uColorA, vec3(0.85), 0.3) * lightFalloff * 0.08;

          float wave = sin((p.x+p.y)*3.0 + t*0.17) * 0.5 + 0.5;
          wave *= sin((p.x-p.y)*2.2 - t*0.11) * 0.5 + 0.5;
          col += mix(uColorB,uColorC,0.5) * wave * 0.06;

          float grain = hash(vUv*uResolution.xy + fract(t*37.0)) - 0.5;
          col += grain * 0.014;

          // cursor glow core — softer, more cinematic, less "white flash"
          col += mix(uColorA, vec3(0.85), 0.45) * smoothstep(0.32,0.0,md) * 0.22;

          // vignette — subtle black falloff toward the screen edges
          float vig = smoothstep(1.05, 0.3, length(p));
          col *= mix(0.62, 1.0, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const farMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), farMat);
    farMesh.position.z = -9;
    scene.add(farMesh);

    /* ---------- NEAR layer: thinner, faster, adds real parallax depth ---------- */
    const uniformsNear = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uColor: { value: new THREE.Color(0x1c3f8f) }
    };
    const nearMat = new THREE.ShaderMaterial({
      uniforms: uniformsNear,
      vertexShader: PLANE_VERT,
      fragmentShader: PRECISION_GLSL + NOISE_GLSL + `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uColor;
        void main(){
          vec2 p = vUv - 0.5;
          float t = uTime * 1.6;
          vec2 mp = uMouse - 0.5;
          vec2 warp = vec2(fbm(p*2.2 + t*0.08), fbm(p*2.2 - t*0.07)) * 0.3;
          vec2 pw = p + warp;
          vec2 c1 = vec2(sin(t*0.09)*0.30, cos(t*0.07)*0.28) + mp*0.15;
          vec2 c2 = vec2(cos(t*0.05+1.0)*0.32, sin(t*0.11+2.0)*0.30) + mp*0.10;
          float g1 = smoothstep(0.4,0.0,length(pw-c1));
          float g2 = smoothstep(0.36,0.0,length(pw-c2));
          vec3 col = uColor * (g1*0.42 + g2*0.32);
          float alpha = clamp(g1*0.36 + g2*0.28, 0.0, 0.4);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const nearMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), nearMat);
    nearMesh.position.z = -4.5;
    scene.add(nearMesh);

    /* ---------- soft particle field: floating energy ---------- */
    const PARTICLE_COUNT = lite ? 40 : 120;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const basePalette = [new THREE.Color(0x4a3592), new THREE.Color(0x1a6e78), new THREE.Color(0xcfd0da)];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i*3+0] = (Math.random() - 0.5) * 9;
      positions[i*3+1] = (Math.random() - 0.5) * 7;
      positions[i*3+2] = -1 - Math.random() * 7;
      sizes[i] = 8 + Math.random() * 20;
      speeds[i] = 0.15 + Math.random() * 0.5;
      phases[i] = Math.random() * Math.PI * 2;
      const c = basePalette[i % basePalette.length];
      colors[i*3+0] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    particleGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    particleGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const uniformsParticles = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) }
    };
    const particleMat = new THREE.ShaderMaterial({
      uniforms: uniformsParticles,
      vertexShader: `
        attribute float aSize;
        attribute float aSpeed;
        attribute float aPhase;
        attribute vec3 aColor;
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          vColor = aColor;
          vec3 pos = position;
          float t = uTime;
          pos.y = mod(position.y + t * aSpeed, 7.0) - 3.5;
          pos.x += sin(t*0.3 + aPhase) * 0.6 + (uMouse.x - 0.5) * 1.4;
          pos.z += cos(t*0.2 + aPhase) * 0.5;
          vAlpha = 0.28 + 0.22 * (0.5 + 0.5 * sin(t*0.6 + aPhase*4.0));
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    /* ---------- bloom post-processing (2-pass gaussian, half-res) ---------- */
    const quadScene = new THREE.Scene();
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quadMesh = new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial());
    quadScene.add(quadMesh);

    const QUAD_VERT = `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `;
    const brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.7 } },
      vertexShader: QUAD_VERT,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse; uniform float uThreshold; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          float lum = dot(c.rgb, vec3(0.2126,0.7152,0.0722));
          float f = smoothstep(uThreshold, uThreshold + 0.35, lum);
          gl_FragColor = vec4(c.rgb * f, 1.0);
        }
      `
    });
    const blurMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1,1) }, uDir: { value: new THREE.Vector2(1,0) } },
      vertexShader: QUAD_VERT,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform vec2 uDir; varying vec2 vUv;
        void main(){
          vec2 o = uTexel * uDir;
          vec4 sum = texture2D(tDiffuse, vUv) * 0.2270270270;
          sum += texture2D(tDiffuse, vUv + o*1.0) * 0.1945945946;
          sum += texture2D(tDiffuse, vUv - o*1.0) * 0.1945945946;
          sum += texture2D(tDiffuse, vUv + o*2.0) * 0.1216216216;
          sum += texture2D(tDiffuse, vUv - o*2.0) * 0.1216216216;
          sum += texture2D(tDiffuse, vUv + o*3.0) * 0.0540540541;
          sum += texture2D(tDiffuse, vUv - o*3.0) * 0.0540540541;
          gl_FragColor = sum;
        }
      `
    });
    const compositeMat = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, tBloom: { value: null }, uBloomStrength: { value: 0.64 } },
      vertexShader: QUAD_VERT,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloomStrength; varying vec2 vUv;
        void main(){
          vec3 col = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloomStrength;
          col = col / (col + vec3(1.0));
          col = pow(col, vec3(1.02));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    let sceneRT, bloomA, bloomB;

    function makeTargets(w, h) {
      const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false };
      if (sceneRT) sceneRT.dispose();
      if (bloomA) bloomA.dispose();
      if (bloomB) bloomB.dispose();
      sceneRT = new THREE.WebGLRenderTarget(w, h, opts);
      const bw = Math.max(1, Math.floor(w / 2)), bh = Math.max(1, Math.floor(h / 2));
      bloomA = new THREE.WebGLRenderTarget(bw, bh, opts);
      bloomB = new THREE.WebGLRenderTarget(bw, bh, opts);
      blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    }

    function layoutPlanes(w, h) {
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      uniformsFar.uResolution.value.set(w, h);

      const fovRad = THREE.MathUtils.degToRad(camera.fov / 2);
      const farDist = Math.abs(farMesh.position.z - camera.position.z);
      const farH = Math.tan(fovRad) * farDist * 2.2;
      farMesh.scale.set(farH * aspect, farH, 1);

      const nearDist = Math.abs(nearMesh.position.z - camera.position.z);
      const nearH = Math.tan(fovRad) * nearDist * 2.2;
      nearMesh.scale.set(nearH * aspect, nearH, 1);
    }

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      makeTargets(Math.floor(w * pr), Math.floor(h * pr));
      layoutPlanes(w, h);
    }
    resize();

    function render(t, mouseX, mouseY) {
      uniformsFar.uTime.value = t;
      uniformsFar.uMouse.value.set(mouseX, mouseY);
      uniformsNear.uTime.value = t;
      uniformsNear.uMouse.value.set(mouseX, mouseY);
      uniformsParticles.uTime.value = t;
      uniformsParticles.uMouse.value.set(mouseX, mouseY);

      // gentle camera parallax driven by the pointer — real 3D depth, not CSS
      camera.position.x += ((mouseX - 0.5) * 0.6 - camera.position.x) * 0.04;
      camera.position.y += ((mouseY - 0.5) * 0.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -6);

      renderer.setRenderTarget(sceneRT);
      renderer.clear();
      renderer.render(scene, camera);

      quadMesh.material = brightMat;
      brightMat.uniforms.tDiffuse.value = sceneRT.texture;
      renderer.setRenderTarget(bloomA);
      renderer.render(quadScene, quadCam);

      quadMesh.material = blurMat;
      blurMat.uniforms.tDiffuse.value = bloomA.texture;
      blurMat.uniforms.uDir.value.set(1, 0);
      renderer.setRenderTarget(bloomB);
      renderer.render(quadScene, quadCam);

      blurMat.uniforms.tDiffuse.value = bloomB.texture;
      blurMat.uniforms.uDir.value.set(0, 1);
      renderer.setRenderTarget(bloomA);
      renderer.render(quadScene, quadCam);

      quadMesh.material = compositeMat;
      compositeMat.uniforms.tScene.value = sceneRT.texture;
      compositeMat.uniforms.tBloom.value = bloomA.texture;
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    }

    function dispose() {
      farMesh.geometry.dispose(); farMat.dispose();
      nearMesh.geometry.dispose(); nearMat.dispose();
      particleGeo.dispose(); particleMat.dispose();
      quadGeo.dispose(); brightMat.dispose(); blurMat.dispose(); compositeMat.dispose();
      if (sceneRT) sceneRT.dispose();
      if (bloomA) bloomA.dispose();
      if (bloomB) bloomB.dispose();
      renderer.dispose();
    }

    return { render, resize, dispose, uniformsFar, uniformsNear };
  }
})();
