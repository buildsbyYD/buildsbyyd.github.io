// Builds By YD: shared behaviour for every page. Pages work without it; this only adds motion and polish.
(() => {
  const root = document.documentElement;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  // Weak devices (or data saver) get the still versions of the glow and the 3D device.
  const conn = navigator.connection || {};
  const low = reduced || conn.saveData || (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  root.classList.remove('no-js'); root.classList.add('js');
  if (low) root.classList.add('low');
  window.BYD = { $, $$, reduced, fine, low };

  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  // Other sites open in a new tab; our own pages stay in this tab (Back works); email links open no tab at all.
  $$('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if (/^(mailto|tel):/i.test(h)) { a.removeAttribute('target'); return; }
    let u; try { u = new URL(h, location.href); } catch (e) { return; }
    const own = u.origin === location.origin || /(^|\.)buildsbyyd\.com$/i.test(u.hostname);
    if (own) a.removeAttribute('target');
    else { a.target = '_blank'; a.rel = 'noopener'; }
  });

  // QR codes next to Play buttons (desktop only, see CSS).
  if (window.qrcode) $$('.qr[data-qr]').forEach(el => {
    const q = qrcode(0, 'M'); q.addData(el.dataset.qr); q.make();
    el.querySelector('.code').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  });

  // Custom cursor; links that leave the site can show a short label (data-cursor).
  if (fine && !reduced) {
    root.classList.add('has-cur');
    const dot = $('.cur'), ring = $('.ring');
    let x = -100, y = -100, rx = x, ry = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; });
    (function loop() { rx += (x - rx) * .18; ry += (y - ry) * .18; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', e => {
      const el = e.target.closest('a,button');
      ring.className = 'ring' + (el ? (el.dataset.cursor ? ' label' : ' hover') : '');
      ring.textContent = el?.dataset.cursor || '';
    });
    // Magnetic buttons.
    $$('.mag').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
    // Nav links scramble briefly on hover.
    const G = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*';
    $$('.nav a.l').forEach(a => {
      const text = a.textContent;
      a.addEventListener('pointerenter', () => { let f = 0; const id = setInterval(() => {
        a.textContent = [...text].map((ch, k) => k < f / 2 ? ch : G[Math.random() * G.length | 0]).join('');
        if (++f > text.length * 2) { clearInterval(id); a.textContent = text; } }, 28); });
    });
  }

  // Light that follows the pointer on cards and the footer wordmark.
  $$('.cell').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
  $$('.word').forEach(w => w.addEventListener('pointermove', e => {
    const r = w.getBoundingClientRect(); w.style.setProperty('--fx', e.clientX - r.left + 'px'); w.style.setProperty('--fy', e.clientY - r.top + 'px');
  }));

  // 3D lean toward the pointer for app-page screens.
  if (fine && !reduced) $$('.duo').forEach(d => {
    const rig = d.querySelector('.rig');
    d.addEventListener('pointermove', e => { const r = d.getBoundingClientRect(); rig.style.transform = `rotateY(${((e.clientX - r.left) / r.width - .5) * 14}deg) rotateX(${-((e.clientY - r.top) / r.height - .5) * 10}deg)`; });
    d.addEventListener('pointerleave', () => rig.style.transform = '');
  });

  // Smooth scrolling + reveal on scroll.
  let lenis = null;
  if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (!reduced && window.Lenis) {
      lenis = new Lenis({ lerp: .09 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    }
    if (!reduced) $$('.rv').forEach(el => {
      if (el.closest('.hero')) return; // the hero has its own intro
      gsap.to(el, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
  } else $$('.rv').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
  window.BYD.lenis = lenis;
  window.BYD.scrollTo = (target, opts) => lenis ? lenis.scrollTo(target, opts) : document.querySelector(target)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
    e.preventDefault(); window.BYD.scrollTo(id); history.replaceState(null, '', id);
  }));
})();
