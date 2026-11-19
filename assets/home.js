// Home page: hero glow, intro, statement, and the app showcase.
// The showcase reads everything from the HTML panels (#apps .panel), so the page itself is the one place app info lives.
(() => {
  const { $, $$, reduced, low } = window.BYD;
  const root = document.documentElement;
  const AUTO_MS = 7000;   // time per app while nobody is touching the showcase
  const SHOT_MS = 2600;   // time per screenshot within an app

  const panels = $$('#apps .panel');
  const apps = panels.map(p => ({ id: p.id.replace('app-', ''), name: p.dataset.name, color: p.dataset.color, shots: p.dataset.shots.split(','), tv: 'tv' in p.dataset }));

  // ---- Accent colour, shared by CSS, the hero glow and the 3D device. ----
  let target = [1, .733, .2], colour = target.slice();
  const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  function setAccent(hex) { root.style.setProperty('--accent', hex); target = hexToRgb(hex); }
  (function ease() { colour = colour.map((v, i) => v + (target[i] - v) * .05); requestAnimationFrame(ease); })();
  window.BYD.colour = () => colour;

  // ---- Hero glow: soft glass ribbons that bend around the pointer (WebGL). Weak devices get a still glow. ----
  if (!low) (() => {
    const c = $('#gl'), gl = c && c.getContext('webgl');
    if (!gl) { root.classList.add('low'); return; }
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    // Hash without sin(): sin-based hashes break into visible blocks on some GPUs.
    const fs = `precision highp float;uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c;
    float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p*=2.;a*=.5;}return v;}
    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*r)/r.y, mm=(m-.5*r)/r.y;
      float md=length(uv-mm); uv+=(uv-mm)*.18*exp(-md*2.);
      vec2 dir=vec2(.7071,-.7071), perp=vec2(.7071,.7071);
      float w=fbm(uv*.9+vec2(t*.03,-t*.02));
      float d=dot(uv,dir)*1.25+w*.7-t*.05;
      float s=abs(fract(d)-.5);
      float rib=pow(smoothstep(.36,.0,s),2.2);
      float gl2=.65+.35*n(vec2(dot(uv,perp)*1.6+t*.05,d*3.));
      float edge=smoothstep(.02,.0,abs(s-.18))*.18;
      vec3 col=c*rib*gl2*.95+vec3(1.)*(rib*rib*.12+edge*w);
      col*=smoothstep(1.05,.05,length(uv*vec2(.75,1.25)));
      col+=(h(gl_FragCoord.xy+fract(t)*97.)-.5)*.03;
      gl_FragColor=vec4(col,1.);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { root.classList.add('low'); return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = k => gl.getUniformLocation(pr, k), uR = U('r'), uT = U('t'), uM = U('m'), uC = U('c');
    let mx = innerWidth * .6, my = innerHeight * .4, sx = mx, sy = my, visible = true;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(c);
    const dpr = Math.min(devicePixelRatio, 1.5);
    const size = () => { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; gl.viewport(0, 0, c.width, c.height); };
    size(); addEventListener('resize', size);
    const t0 = performance.now();
    (function frame(now) {
      if (visible) {
        sx += (mx - sx) * .06; sy += (my - sy) * .06;
        gl.uniform2f(uR, c.width, c.height); gl.uniform1f(uT, (now - t0) / 1000);
        gl.uniform2f(uM, sx * dpr, c.height - sy * dpr); gl.uniform3fv(uC, colour);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(frame);
    })(t0);
  })();

  // ---- Intro: a short count on the first visit, then the headline rises in letter by letter. ----
  $$('#h1 .line').forEach(line => {
    const walk = n => [...n.childNodes].forEach(ch => {
      if (ch.nodeType !== 3) return walk(ch);
      const frag = document.createDocumentFragment();
      ch.textContent.split(/(\s+)/).forEach(word => {
        if (!word.trim()) return frag.append(word);
        const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        [...word].forEach(l => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = l; w.append(s); });
        frag.append(w);
      });
      ch.replaceWith(frag);
    });
    walk(line);
  });
  const intro = () => {
    $('#loader')?.classList.add('done');
    if (!window.gsap || reduced) { $$('#h1 .ch, .hero .rv').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    gsap.to('#h1 .ch', { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: .022, delay: .15 });
    gsap.to('.hero .rv', { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: .1, delay: .55 });
  };
  let seen = true; try { seen = sessionStorage.getItem('byd-seen') === '1'; sessionStorage.setItem('byd-seen', '1'); } catch (e) {}
  if (seen || reduced || !window.gsap) { $('#loader')?.remove(); intro(); }
  else { const o = { v: 0 }; gsap.to(o, { v: 100, duration: .6, ease: 'power2.inOut', onUpdate: () => $('#count').textContent = Math.round(o.v), onComplete: intro }); }

  // ---- Statement: words light up as you scroll. ----
  const mani = $('#mani');
  if (mani && window.gsap && !reduced) {
    mani.innerHTML = mani.innerHTML.replace(/(<em>.*?<\/em>)|([^\s<]+)/g, m => `<span class="wd">${m}</span>`);
    gsap.to('#mani .wd', { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: mani, start: 'top 78%', end: 'bottom 45%', scrub: true } });
  }

  // ---- Showcase ----
  const rail = $$('#rail [role=tab]'), names = $('#names'), flat = $('.flat'), flatImg = $('.flat img'), hint = $('#hint');
  let cur = -1, shot = 0, shotTimer = 0, device = null;
  function show(i, { focus = false } = {}) {
    i = (i + apps.length) % apps.length;
    if (i === cur) return;
    const a = apps[i], dir = i > cur ? 1 : -1, first = cur < 0, prev = panels[cur];
    cur = i; shot = 0;
    setAccent(a.color);
    // Details: old panel fades out, new one in. Screen readers hear the new panel (aria-live on .panels).
    const next = panels[i];
    if (prev) { prev.classList.add('out'); setTimeout(() => { prev.classList.remove('on', 'out'); prev.hidden = true; }, first ? 0 : 300); }
    setTimeout(() => { next.hidden = false; next.classList.add('on', 'out'); requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('out'))); }, first ? 0 : 300);
    // Giant outlined name slides through behind everything.
    names.querySelectorAll('.bigname').forEach(n => { n.classList.add(dir > 0 ? 'out-l' : 'in-r'); setTimeout(() => n.remove(), 1100); });
    const n = document.createElement('div'); n.className = 'bigname' + (first ? '' : dir > 0 ? ' in-r' : ' out-l'); n.textContent = a.name; n.setAttribute('aria-hidden', 'true');
    names.append(n); requestAnimationFrame(() => requestAnimationFrame(() => n.className = 'bigname'));
    rail.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    if (focus) rail[i].focus();
    // Device: 3D when loaded, the flat image otherwise.
    device ? device.app(i, dir) : setFlat(a, 0);
    clearInterval(shotTimer);
    if (a.shots.length > 1) shotTimer = setInterval(() => { shot = (shot + 1) % a.shots.length; device ? device.shot(cur, shot) : setFlat(a, shot); }, SHOT_MS);
    restartBar();
  }
  function setFlat(a, j) {
    flat.classList.toggle('tv', a.tv);
    flatImg.style.opacity = 0;
    setTimeout(() => { flatImg.src = a.shots[j]; flatImg.alt = a.name; flatImg.style.opacity = 1; }, 180);
  }

  // Auto-advance until the visitor takes over; pauses while hovered or focused, and only runs while on screen.
  let auto = !reduced, autoTimer = 0, inView = false, paused = false;
  function restartBar() {
    clearTimeout(autoTimer);
    $$('#rail .bar').forEach(b => { b.classList.remove('run'); void b.offsetWidth; });
    if (!auto || !inView || paused || cur < 0) return;
    const bar = rail[cur].querySelector('.bar');
    bar.style.setProperty('--dur', AUTO_MS + 'ms'); bar.classList.add('run');
    autoTimer = setTimeout(() => show(cur + 1), AUTO_MS);
  }
  function takeOver() { if (!auto) return; auto = false; restartBar(); hint.textContent = 'Use the arrows, your keyboard or swipe'; }
  const sec = $('#apps');
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; restartBar(); }, { threshold: .45 }).observe(sec);
  sec.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { paused = true; restartBar(); } });
  sec.addEventListener('pointerleave', () => { paused = false; restartBar(); });
  sec.addEventListener('focusin', () => { paused = true; restartBar(); });
  sec.addEventListener('focusout', e => { if (!sec.contains(e.relatedTarget)) { paused = false; restartBar(); } });
  rail.forEach((b, k) => b.addEventListener('click', () => { takeOver(); show(k); }));
  $('#rail').addEventListener('keydown', e => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); takeOver(); show(cur + step, { focus: true }); }
    if (e.key === 'Home') { e.preventDefault(); takeOver(); show(0, { focus: true }); }
    if (e.key === 'End') { e.preventDefault(); takeOver(); show(apps.length - 1, { focus: true }); }
  });
  $('#prev').addEventListener('click', () => { takeOver(); show(cur - 1); });
  $('#next').addEventListener('click', () => { takeOver(); show(cur + 1); });
  let sx = null;
  sec.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  sec.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { takeOver(); show(cur + (dx < 0 ? 1 : -1)); } sx = null; });

  // "Explore the apps" lands on the showcase and starts it fresh from the first app.
  $('#explore')?.addEventListener('click', e => {
    e.preventDefault(); window.BYD.scrollTo('#apps');
    if (auto) { show(0); restartBar(); }
  });

  // Open on the app in the link (#cashtrack), else the first.
  const fromHash = apps.findIndex(a => '#' + a.id === location.hash);
  show(Math.max(0, fromHash));
  if (fromHash >= 0) setTimeout(() => window.BYD.scrollTo('#apps', { immediate: true }), 50);

  // ---- 3D device: loaded only when the showcase is near, and never on weak devices. ----
  if (!low) {
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      try {
        // Same version as the <script> tags in index.html, so updates aren't stuck in browser caches.
        const { init } = await import('./device3d.js?v=3');
        device = await init({ stage: $('#stage'), canvas: $('#three'), apps, current: () => cur, colour: () => colour });
        if (device) root.classList.add('has3d');
      } catch (err) { console.warn('3D device unavailable, showing the flat one', err); }
    }, { rootMargin: '600px' });
    io.observe(sec);
  }

  // Greeting in the app languages.
  const hello = $('#hello');
  if (hello && !reduced) { const words = hello.dataset.words.split(','); let k = 0; setInterval(() => hello.textContent = words[++k % words.length], 1500); }
})();
