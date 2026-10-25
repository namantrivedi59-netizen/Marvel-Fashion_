/* ============================================================
   LIQUID INK BACKGROUND — real GPU fluid-ink effect for internal
   (non-homepage) pages.

   Runs ONLY when <body data-aurora="true"> — i.e. every page except
   the homepage, which keeps its own hero background untouched.

   Technique: a framebuffer ping-pong "dye" simulation rendered with
   a custom GLSL shader (reuses the Three.js already loaded on these
   pages via the r128 CDN script tag — no new library added).
   Each frame the previous dye texture is advected (semi-Lagrangian
   sample offset by a curl-noise flow field, warped further near the
   cursor), decayed slightly, and has new color injected from an
   ambient noise field, the mouse, and click bursts. This is genuine
   texture-feedback fluid advection, not a blurred/animated div.
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.getAttribute('data-aurora') !== 'true') {
      console.info('[MarvelLiquidBG] Skipped: <body data-aurora="true"> not present on this page (expected — this page is not an internal page, or the attribute is missing).');
      return;
    }
    if (typeof THREE === 'undefined') {
      console.error('[MarvelLiquidBG] THREE is undefined — the three.js CDN script (cdnjs.cloudflare.com/.../three.min.js) did not finish loading before js/liquid-bg.js executed. Check the Network tab for a failed/blocked request to that URL (ad-blocker, offline testing, or a CSP that blocks cdnjs.cloudflare.com), and confirm no earlier <script> tag on this page errors out before it.');
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = window.matchMedia('(max-width: 760px)').matches;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const enablePointer = !reduced && isFinePointer;

    console.info(`[MarvelLiquidBG] Initializing. reduced=${reduced} isSmallScreen=${isSmallScreen} isFinePointer=${isFinePointer} enablePointer=${enablePointer}` +
      (reduced ? ' — prefers-reduced-motion is TRUE: the sim will still render but mouse reactivity is intentionally disabled and animation speed is cut to ~15%. If you did not intend this, check your OS/browser "reduce motion" accessibility setting or a devtools media-feature emulation override.' : '') +
      (!isFinePointer ? ' — (hover:hover) and (pointer:fine) is FALSE: mouse reactivity is intentionally disabled for touch/coarse pointers. If this is a desktop mouse, check devtools device-emulation/touch-simulation is off.' : ''));

    /* ---------------- canvas + renderer ---------------- */
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
    } catch (e) {
      console.error('[MarvelLiquidBG] THREE.WebGLRenderer construction threw — WebGL is unavailable in this browser/context (disabled GPU, blocked by browser flag, or running inside a context without a WebGL-capable canvas).', e);
      return;
    }
    renderer.domElement.className = 'mf-liquid-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const pixelRatioCap = isSmallScreen ? 1 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    document.body.prepend(renderer.domElement);
    console.info(`[MarvelLiquidBG] Canvas created and prepended to <body>. Initial size will be logged after resize().`);

    const vignette = document.createElement('div');
    vignette.className = 'mf-liquid-vignette';
    vignette.setAttribute('aria-hidden', 'true');
    document.body.prepend(vignette);

    /* ---------------- sim resolution (kept low: this is the dye
       buffer, not the display — it gets smoothly upscaled) ---------------- */
    const simScale = isSmallScreen ? 0.14 : 0.32;

    function simSize() {
      const w = Math.max(64, Math.floor(window.innerWidth * simScale));
      const h = Math.max(64, Math.floor(window.innerHeight * simScale));
      return { w, h };
    }

    const rtOptions = {
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false
    };

    let { w: simW, h: simH } = simSize();
    let rtA = new THREE.WebGLRenderTarget(simW, simH, rtOptions);
    let rtB = new THREE.WebGLRenderTarget(simW, simH, rtOptions);

    const simScene = new THREE.Scene();
    const displayScene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* ---------------- simulation shader ---------------- */
    const simUniforms = {
      uPrevDye: { value: null },
      uResolution: { value: new THREE.Vector2(simW, simH) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseVel: { value: new THREE.Vector2(0, 0) },
      uPointerActive: { value: 0 },
      uClickPos: { value: new THREE.Vector2(-1, -1) },
      uClickTime: { value: 999.0 }
    };

    const simFrag = `
      precision highp float;
      uniform sampler2D uPrevDye;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uMouseVel;
      uniform float uPointerActive;
      uniform vec2 uClickPos;
      uniform float uClickTime;
      varying vec2 vUv;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float vnoise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0.0; float amp = 0.5;
        for (int i = 0; i < 4; i++) { v += amp * vnoise(p); p *= 2.02; amp *= 0.55; }
        return v;
      }
      vec2 curl(vec2 p){
        float e = 0.6;
        float n1 = fbm(p + vec2(0.0, e));
        float n2 = fbm(p - vec2(0.0, e));
        float n3 = fbm(p + vec2(e, 0.0));
        float n4 = fbm(p - vec2(e, 0.0));
        float dx = (n1 - n2) / (2.0 * e);
        float dy = (n3 - n4) / (2.0 * e);
        return vec2(dy, -dx);
      }

      // Marvel Fashion palette — obsidian black + deep crimson, built from
      // the exact brand hex values (#0D080A base / #3D0A12 dark red /
      // #6E101B crimson / #A7192B highlight). Cycles between crimson and
      // highlight only, always toward near-black at the low end — strictly
      // no green, teal, cyan, blue, or purple.
      vec3 marvelPalette(float t){
        vec3 c0 = vec3(0.655,0.098,0.169); // #A7192B highlight
        vec3 c1 = vec3(0.431,0.063,0.106); // #6E101B crimson
        vec3 c2 = vec3(0.239,0.039,0.071); // #3D0A12 dark red
        vec3 c3 = vec3(0.14,0.024,0.045);  // dark red fading toward black
        vec3 c4 = vec3(0.08,0.017,0.028);  // near-black crimson
        vec3 c5 = vec3(0.051,0.031,0.039); // #0D080A obsidian base
        float ft = fract(t) * 6.0;
        float f = fract(ft);
        int i = int(floor(ft));
        vec3 a = c0; vec3 b = c1;
        if (i == 1){ a = c1; b = c2; }
        else if (i == 2){ a = c2; b = c3; }
        else if (i == 3){ a = c3; b = c4; }
        else if (i == 4){ a = c4; b = c5; }
        else if (i == 5){ a = c5; b = c0; }
        return mix(a, b, smoothstep(0.0, 1.0, f));
      }

      void main(){
        vec2 uv = vUv;
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

        vec2 p = uv * aspect * 2.4 + vec2(0.0, uTime * 0.12);
        vec2 flow = curl(p + uTime * 0.38) * 0.05;
        flow += curl(p * 2.1 - uTime * 0.28) * 0.028; // finer secondary swirl for ink-like detail

        vec2 toMouse = (uv - uMouse) * aspect;
        float d = length(toMouse);
        float influence = smoothstep(0.75, 0.0, d) * uPointerActive;
        flow += normalize(toMouse + 1e-4) * influence * -0.09;
        flow += uMouseVel * influence * 3.2;

        vec2 srcUv = uv - flow;
        srcUv = clamp(srcUv, 0.0, 1.0);
        vec3 prev = texture2D(uPrevDye, srcUv).rgb;
        vec3 col = prev * 0.975;

        // All three injections below use mix() rather than += : a blend
        // toward a target color can never run away past that target no
        // matter how long the trigger holds (unlike additive accumulation,
        // which — combined with a slow decay — was silently saturating the
        // buffer to a flat, frozen, oversaturated color within ~1-2s. That
        // saturation was the actual cause of the "static/unclassy" look:
        // the sim wasn't idle, it had maxed out and stopped visibly
        // changing.) This keeps every reaction visibly bounded while still
        // reading as a bright, responsive push of color.
        float amb = fbm(p * 1.5 - uTime * 0.18);
        float hueT = fbm(p * 0.7 + uTime * 0.02) + uTime * 0.025;
        vec3 palette = marvelPalette(hueT);
        float ambientStrength = smoothstep(0.15, 0.7, amb) * 0.22;
        col = mix(col, palette, ambientStrength);

        float mouseDye = smoothstep(0.42, 0.0, d) * uPointerActive;
        vec3 mouseColor = mix(marvelPalette(hueT + 0.5), vec3(1.0), 0.12);
        float mouseStrength = mouseDye * clamp(0.55 + length(uMouseVel) * 7.0, 0.0, 1.0);
        col = mix(col, mouseColor, mouseStrength);

        vec2 toClick = (uv - uClickPos) * aspect;
        float dc = length(toClick);
        float age = uClickTime;
        float ring = smoothstep(0.0, 0.02, age) * exp(-age * 1.4);
        float clickMask = smoothstep(0.55 * (0.15 + age), 0.0, dc) * ring;
        vec3 clickColor = mix(marvelPalette(hueT + 0.83), vec3(1.0), 0.15);
        col = mix(col, clickColor, clamp(clickMask, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const passVert = `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const simMaterial = new THREE.ShaderMaterial({
      uniforms: simUniforms,
      vertexShader: passVert,
      fragmentShader: simFrag
    });
    const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    simScene.add(simQuad);

    /* ---------------- display (composite) shader ---------------- */
    const displayUniforms = { uDye: { value: null } };
    const displayFrag = `
      precision highp float;
      uniform sampler2D uDye;
      varying vec2 vUv;
      void main(){
        vec3 dye = texture2D(uDye, vUv).rgb;
        vec3 base = vec3(0.051, 0.031, 0.039); // #0D080A obsidian black base
        vec3 col = base + dye;
        col = col / (1.0 + col * 0.4);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: displayUniforms,
      vertexShader: passVert,
      fragmentShader: displayFrag
    });
    const displayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMaterial);
    displayScene.add(displayQuad);

    /* ---------------- pointer state (spring-smoothed) ---------------- */
    let targetMouse = new THREE.Vector2(0.5, 0.5);
    let curMouse = new THREE.Vector2(0.5, 0.5);
    let lastMouse = new THREE.Vector2(0.5, 0.5);
    let pointerActive = 0;
    let clickPos = new THREE.Vector2(-1, -1);
    let clickTime = 999;

    if (enablePointer) {
      window.addEventListener('pointermove', (e) => {
        targetMouse.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
        pointerActive = 1;
      }, { passive: true });

      window.addEventListener('pointerleave', () => { pointerActive = 0; }, { passive: true });
    }

    // Click/tap disturbance: kept separate from the fine-pointer-only cursor
    // trail above so touch taps on mobile still create a fluid ripple, per
    // the "use touch interaction if practical" requirement — this listener
    // only ever sets a click origin + timer, it never drives per-frame
    // pointer tracking, so it's cheap enough to leave on for touch too.
    if (!reduced) {
      window.addEventListener('pointerdown', (e) => {
        clickPos.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
        clickTime = 0;
      }, { passive: true });
    }

    /* ---------------- resize ---------------- */
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      const s = simSize();
      simW = s.w; simH = s.h;
      rtA.setSize(simW, simH);
      rtB.setSize(simW, simH);
      simUniforms.uResolution.value.set(simW, simH);
    }
    resize();
    window.addEventListener('resize', resize);
    console.info(`[MarvelLiquidBG] Canvas sized to ${window.innerWidth}x${window.innerHeight} (sim buffer ${simW}x${simH}). If this logs 0x0, the canvas has no visible area — check that nothing collapsed <body>'s box.`);

    /* ---------------- render loop ---------------- */
    let running = true;
    let lastT = performance.now();
    let framesLogged = 0;

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      if (framesLogged < 1) {
        framesLogged++;
        console.info('[MarvelLiquidBG] Render loop is running (first frame rendered). If you see this but no visible motion, the effect is rendering but likely hidden behind opaque content — check z-index/backgrounds of elements above it, or that prefers-reduced-motion above isn\'t true.');
      }

      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;

      simUniforms.uTime.value += reduced ? dt * 0.15 : dt;

      if (enablePointer) {
        curMouse.lerp(targetMouse, 0.18); // spring/inertia — never snaps, but snappier than before
        const vel = new THREE.Vector2(curMouse.x - lastMouse.x, curMouse.y - lastMouse.y);
        lastMouse.copy(curMouse);
        simUniforms.uMouse.value.copy(curMouse);
        simUniforms.uMouseVel.value.copy(vel);
        simUniforms.uPointerActive.value = pointerActive;
      }

      clickTime += dt;
      simUniforms.uClickPos.value.copy(clickPos);
      simUniforms.uClickTime.value = clickTime;

      // simulate: read rtA, write rtB
      simUniforms.uPrevDye.value = rtA.texture;
      renderer.setRenderTarget(rtB);
      renderer.render(simScene, camera);

      // display the freshly-written buffer
      displayUniforms.uDye.value = rtB.texture;
      renderer.setRenderTarget(null);
      renderer.render(displayScene, camera);

      // swap
      const tmp = rtA; rtA = rtB; rtB = tmp;
    }

    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) { lastT = performance.now(); requestAnimationFrame(frame); }
    });

    requestAnimationFrame(frame);
  });
})();
