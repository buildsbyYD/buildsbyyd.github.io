// The 3D device for the home showcase: a phone (a TV for Builds TV) with the app's real screens.
// Switching apps is a gentle dip and lean, not a flip. Loaded on demand by home.js; returns null if WebGL isn't available.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export async function init({ stage, canvas, apps, current, colour }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50); camera.position.set(0, 0, 5);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(0xffbb33, 30, 8); rim.position.set(-1.3, .8, -.8); scene.add(rim);
  const rim2 = new THREE.PointLight(0xffbb33, 22, 8); rim2.position.set(1.5, -.9, -.6); scene.add(rim2);

  // Rounded-rectangle screen with 0..1 UVs so a screenshot maps edge to edge.
  const rr = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  const screenGeo = (w, h, r) => { const g = new THREE.ShapeGeometry(rr(w, h, r), 16), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h); return g; };
  // Screen shader: wipes from one screenshot to the next.
  const screenMat = () => new THREE.ShaderMaterial({
    uniforms: { a: { value: null }, b: { value: null }, ra: { value: new THREE.Vector4(1, 1, 0, 0) }, rb: { value: new THREE.Vector4(1, 1, 0, 0) }, p: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D a,b;uniform vec4 ra,rb;uniform float p;varying vec2 vUv;
      void main(){vec4 ca=texture2D(a,vUv*ra.xy+ra.zw),cb=texture2D(b,vUv*rb.xy+rb.zw);
      float e=smoothstep(p*1.3-.3,p*1.3,1.-vUv.y);gl_FragColor=mix(cb,ca,e);
      #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });

  const metal = new THREE.MeshPhysicalMaterial({ color: 0x3a3c47, metalness: .9, roughness: .22, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: 1.8 });
  const PW = .76, PH = 1.5, PD = .085;
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(PW, PH, PD, 6, .1), metal));
  const glass = new THREE.Mesh(screenGeo(PW - .03, PH - .03, .088), new THREE.MeshPhysicalMaterial({ color: 0, roughness: .05, clearcoat: 1 }));
  glass.position.z = PD / 2 + .0005; phone.add(glass);
  const SW = PW - .065, SH = SW * 2133 / 1080;
  const pScreen = new THREE.Mesh(screenGeo(SW, SH, .07), screenMat()); pScreen.position.z = PD / 2 + .001; phone.add(pScreen);

  const TW = 2.3, TH = 1.34, tv = new THREE.Group();
  tv.add(new THREE.Mesh(new RoundedBoxGeometry(TW, TH, .05, 4, .025), metal));
  const tScreen = new THREE.Mesh(screenGeo(TW - .06, TH - .06, .01), screenMat()); tScreen.position.z = .026; tv.add(tScreen);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(.12, .32, .04), metal); neck.position.set(0, -TH / 2 - .14, -.03); tv.add(neck);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(.9, .03, .32, 3, .012), metal); foot.position.set(0, -TH / 2 - .3, -.03); tv.add(foot);

  const rig = new THREE.Group(); rig.add(phone, tv); scene.add(rig);

  // Screenshots as textures, cropped like object-fit: cover (top-anchored on phones).
  const loader = new THREE.TextureLoader(), cache = {};
  const tex = src => cache[src] || (cache[src] = new Promise((res, rej) => loader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t); }, undefined, rej)));
  const fit = (t, aspect, top) => { const ia = t.image.width / t.image.height;
    return ia < aspect ? new THREE.Vector4(1, ia / aspect, 0, top ? 1 - ia / aspect : (1 - ia / aspect) / 2) : new THREE.Vector4(aspect / ia, 1, (1 - aspect / ia) / 2, 0); };
  const PA = SW / SH, TA = (TW - .06) / (TH - .06);
  async function setScreen(mesh, src, aspect, top, wipe) {
    const t = await tex(src), u = mesh.material.uniforms, r = fit(t, aspect, top);
    gsap.killTweensOf(u.p); // a wipe still running from the previous screen must not drag the old image back in
    if (!wipe || !u.a.value) { u.a.value = u.b.value = t; u.ra.value = u.rb.value = r; u.p.value = 1; return; }
    u.b.value = u.a.value; u.rb.value = u.ra.value; u.a.value = t; u.ra.value = r; u.p.value = 0;
    gsap.to(u.p, { value: 1, duration: .9, ease: 'power3.inOut' });
  }

  function size() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  size(); new ResizeObserver(size).observe(stage);
  // Fit to the stage: the phone fills ~80% of its height, the TV up to ~88% of its width.
  const H = () => 2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * 5, W = () => H() * camera.aspect;
  const scaleFor = isTv => isTv ? Math.min(.88 * W() / TW, .62 * H() / TH) : .8 * H() / PH;

  let shown = current(), isTv = apps[shown].tv;
  const state = { s: scaleFor(isTv), dip: 0, lean: 0 };
  phone.scale.setScalar(isTv ? .001 : 1); tv.scale.setScalar(isTv ? 1 : .001);
  await setScreen(isTv ? tScreen : pScreen, apps[shown].shots[0], isTv ? TA : PA, !isTv);
  apps.forEach(a => a.shots.forEach(s => tex(s).catch(() => {})));
  addEventListener('resize', () => state.s = scaleFor(isTv));

  // Pointer tilt, idle float and the accent rim light. Renders only while on screen.
  let mx = 0, my = 0, tx = 0, ty = 0, visible = true;
  addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); mx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width - .5)); my = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height - .5)); });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(stage);
  const clock = new THREE.Clock(), c = new THREE.Color();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    tx += (mx - tx) * .06; ty += (my - ty) * .06;
    rig.position.set(0, Math.sin(t * 1.1) * .03 - (isTv ? .1 : 0), -state.dip * .9);
    rig.scale.setScalar(state.s * (1 - state.dip * .06));
    rig.rotation.set(ty * .3 + (isTv ? 0 : .05) + state.dip * .22, tx * .55 + (isTv ? 0 : -.18) + state.lean * .35, Math.sin(t * .7) * .015);
    c.setRGB(...colour()); rim.color.copy(c); rim2.color.copy(c);
    renderer.render(scene, camera);
  });

  return {
    // App switch: dip back and lean toward the direction of travel, swap at the bottom, settle forward.
    app(i, dir) {
      const a = apps[i];
      gsap.timeline()
        .to(state, { dip: 1, lean: dir, duration: .38, ease: 'power2.in' })
        .add(() => {
          shown = i;
          // Swap straight to the new app's first screen while the device is dipped; the wipe is only for screens within one app.
          setScreen(a.tv ? tScreen : pScreen, a.shots[0], a.tv ? TA : PA, !a.tv, false);
          if (a.tv !== isTv) { isTv = a.tv;
            gsap.to(tv.scale, { x: isTv ? 1 : .001, y: isTv ? 1 : .001, z: isTv ? 1 : .001, duration: .55, ease: 'power3.out' });
            gsap.to(phone.scale, { x: isTv ? .001 : 1, y: isTv ? .001 : 1, z: isTv ? .001 : 1, duration: .45, ease: 'power3.out' });
            gsap.to(state, { s: scaleFor(isTv), duration: .6, ease: 'power3.out' }); }
        })
        .to(state, { dip: 0, lean: 0, duration: .7, ease: 'power3.out' });
    },
    shot(i, j) { if (i === shown && !apps[i].tv) setScreen(pScreen, apps[i].shots[j], PA, true, true); },
  };
}
