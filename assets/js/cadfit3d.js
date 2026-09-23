// CADFit walkthrough: mesh -> sketch profiles -> Extrude/Revolve parameter search
// -> IoU-guided assembly -> residual refinement -> CAD construction sequence.
// Geometry and numbers come from a CADFit run on the timing pulley from the paper.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const panel = document.getElementById('panel-cadfit');
const canvas = document.getElementById('cfCanvas');
if (panel && canvas) init();

function init() {
  const BASE = 'assets/showcase/cadfit/';
  const $ = id => document.getElementById(id);
  const statusEl = $('cfStatus'), iouEl = $('cfIou'), chartEl = $('cfChart'), stepsEl = $('cfSteps'), codeEl = $('cfCode');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const freeze = new URLSearchParams(location.search).get('cft');

  const STAGES = [
    { key: 'mesh',    title: 'Input mesh',             dur: 3000, text: 'Watertight input mesh (15K triangles)' },
    { key: 'sketch',  title: 'Extract sections',       dur: 4200, text: 'Sections from planar faces + axis-aligned slices → 38 sketch profiles' },
    { key: 'extrude', title: 'Search: Extrude height', dur: 5200, text: 'Sweep extrusion height; keep the stable fit before Chamfer distance spikes' },
    { key: 'revolve', title: 'Search: Revolve angle',  dur: 3800, text: 'Axis section → Revolve beats Extrude; sweep angle up to 360°' },
    { key: 'greedy',  title: 'IoU-guided selection',   dur: 4200, text: 'Greedy IoU selection over 58 candidates, then backward pruning keeps 2' },
    { key: 'residual',title: 'Residual refinement',    dur: 3800, text: 'Fit the over-reconstructed residual and remove it with Cut' },
    { key: 'done',    title: 'Construction sequence',  dur: 4200, text: 'Editable CAD construction sequence recovered' },
  ];
  const CODE = [
    { s: 'extrude', l: '<c># 1 · profile from a planar face</c>' },
    { s: 'extrude', l: 'plane_1 = cq.Plane(origin, normal, xDir)' },
    { s: 'extrude', l: 'sketch_1 = cq.Workplane(plane_1)' },
    { s: 'extrude', l: 'loop_1 = sketch_1.moveTo(p0)' },
    { s: 'extrude', l: 'loop_1 = loop_1.threePointArc(p1, p2)  <c># ×48, belt teeth</c>' },
    { s: 'extrude', l: 'solid_1 = sketch_1.<k>extrude</k>(<n>0.57</n>)' },
    { s: 'revolve', l: '<c># 2 · profile from an axis-aligned section</c>' },
    { s: 'revolve', l: 'plane_2 = cq.Plane(origin, normal, xDir)' },
    { s: 'revolve', l: 'sketch_2 = cq.Workplane(plane_2).moveTo(p0)' },
    { s: 'revolve', l: 'sketch_2 = sketch_2.lineTo(p1)  <c># ×11 segments</c>' },
    { s: 'revolve', l: 'solid_2 = sketch_2.<k>revolve</k>(<n>360</n>, axisStart, axisEnd)' },
    { s: 'greedy',  l: 'result = solid_2.<k>union</k>(solid_1)' },
    { s: 'residual',l: '<c># 3 · residual refinement</c>' },
    { s: 'residual',l: 'residual = extrude_a.union(extrude_b).union(extrude_c)' },
    { s: 'residual',l: 'result = result.<k>cut</k>(residual)' },
  ];
  const order = STAGES.map(s => s.key);

  stepsEl.innerHTML = STAGES.map((s, i) =>
    `<li data-i="${i}"><button type="button"><span class="ic">${i + 1}</span>${s.title}</button></li>`).join('');
  const stepItems = [...stepsEl.querySelectorAll('li')];

  function renderCode(stage) {
    const si = order.indexOf(stage);
    codeEl.innerHTML = CODE.filter(c => order.indexOf(c.s) <= si).map(c => {
      const html = c.l.replace(/<c>/g, '<span class="c-c">').replace(/<\/c>/g, '</span>')
        .replace(/<k>/g, '<span class="c-k">').replace(/<\/k>/g, '</span>')
        .replace(/<n>/g, '<span class="c-n">').replace(/<\/n>/g, '</span>');
      return c.s === stage ? `<span class="c-new">${html}</span>` : html;
    }).join('\n') || '<span class="c-c"># construction sequence appears here</span>';
    codeEl.scrollTop = codeEl.scrollHeight;
  }

  // ---------- three.js ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(3.4, 2.6, 3.9);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, enableZoom: false, enablePan: false, autoRotate: !reduceMotion, autoRotateSpeed: 0.9 });
  controls.target.set(0, 0.05, 0);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1b2638, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 2.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb8ff, 0.7); rim.position.set(-4, 1.5, -3); scene.add(rim);
  const grid = new THREE.GridHelper(6, 30, 0x3d5a80, 0x22344d);
  grid.position.y = -0.52; grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);

  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root);  // CADFit frame is Z-up

  const mats = {
    ghost: new THREE.MeshStandardMaterial({ color: 0x9fb6d8, transparent: true, opacity: 0.18, depthWrite: false, roughness: .6 }),
    wire:  new THREE.MeshBasicMaterial({ color: 0x8fb8ff, wireframe: true, transparent: true, opacity: 0.22 }),
    mesh:  new THREE.MeshStandardMaterial({ color: 0xc9d6ea, roughness: .55, metalness: .05, flatShading: true }),
    solid: new THREE.MeshStandardMaterial({ color: 0xf2a93b, roughness: .42, metalness: .12 }),
    cand:  new THREE.MeshStandardMaterial({ color: 0xf2a93b, roughness: .45, transparent: true, opacity: 0.85 }),
    resid: new THREE.MeshStandardMaterial({ color: 0xff6b7f, roughness: .5, transparent: true, opacity: 0.85 }),
    edge:  new THREE.LineBasicMaterial({ color: 0x3a2508, transparent: true, opacity: 0.55 }),
  };
  const loopMat = new THREE.LineBasicMaterial({ color: 0x6fd3a0, transparent: true, opacity: 0.9 });
  const loopDim = new THREE.LineBasicMaterial({ color: 0x6fd3a0, transparent: true, opacity: 0.18 });
  const loopHot = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });

  function resize() {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  function solidNode(geo, mat, edges = true) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat));
    if (edges) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), mats.edge));
    g.visible = false; root.add(g); return g;
  }

  // ---------- load ----------
  let started = false, loaded = null;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) { started = true; load(); }
    if (visible && loaded) loaded();
  }, { rootMargin: '200px' });
  io.observe(panel);
  let visible = false;

  function load() {
    statusEl.textContent = 'Loading example…';
    const L = new STLLoader();
    const files = ['input', 'extrude_unit', 'revolve_060', 'revolve_120', 'revolve_180', 'revolve_240', 'revolve_300', 'revolve_360', 'pass1', 'residual_cut', 'final'];
    Promise.all([
      ...files.map(f => L.loadAsync(BASE + f + '.stl')),
      fetch(BASE + 'loops.json').then(r => r.json()),
      fetch(BASE + 'extrude_sweep.json').then(r => r.json()),
    ]).then(res => {
      const g = Object.fromEntries(files.map((f, i) => [f, res[i]]));
      Object.values(g).forEach(x => x.computeVertexNormals());
      const loops = res[files.length], sweep = res[files.length + 1];
      build(g, loops, sweep);
    }).catch(err => { console.error(err); panel.classList.add('failed'); statusEl.textContent = '3D preview unavailable'; });
  }

  function build(g, loops, sweep) {
    const extrudeZ0 = -0.43364;   // sketch plane of the extruded profile; extrusion scales along +Z from here
    g.extrude_unit.translate(0, 0, -extrudeZ0);
    const N = {
      inputMesh: solidNode(g.input, mats.mesh, false),
      inputWire: solidNode(g.input, mats.wire, false),
      inputGhost: solidNode(g.input, mats.ghost, false),
      extrude: solidNode(g.extrude_unit, mats.cand),
      revolves: ['revolve_060', 'revolve_120', 'revolve_180', 'revolve_240', 'revolve_300', 'revolve_360'].map(k => solidNode(g[k], mats.cand)),
      revolveFinal: solidNode(g.revolve_360, mats.solid),
      pass1: solidNode(g.pass1, mats.solid),
      residual: solidNode(g.residual_cut, mats.resid, false),
      final: solidNode(g.final, mats.solid),
    };
    N.extrude.children.forEach(c => { c.position.z = extrudeZ0; });

    // sketch loops
    const loopGroup = new THREE.Group(); root.add(loopGroup);
    const loopLines = loops.map(lp => {
      const grp = new THREE.Group();
      lp.polys.forEach(poly => {
        const pts = poly.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        if (pts.length > 2) pts.push(pts[0].clone());
        grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), loopMat));
      });
      grp.userData = lp; grp.visible = false; loopGroup.add(grp); return grp;
    });
    const selExtrude = loopLines.find(l => l.userData.type === 'extrude' && l.userData.sketch === 0);
    const selRevolve = loopLines.find(l => l.userData.type === 'revolve');
    const setLoopMat = (grp, m) => grp.children.forEach(c => (c.material = m));

    // chart
    const maxD = Math.max(...sweep.map(d => d[1])), maxH = sweep[sweep.length - 1][0];
    const W = 220, H = 96, px = h => 26 + (h / maxH) * (W - 34), py = d => H - 18 - (d / maxD) * (H - 30);
    const path = sweep.map((d, i) => `${i ? 'L' : 'M'}${px(d[0]).toFixed(1)},${py(d[1]).toFixed(1)}`).join('');
    chartEl.innerHTML = `<div class="cf-chart-t">One-sided Chamfer distance D(h)</div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
        <line x1="26" y1="${H - 18}" x2="${W - 6}" y2="${H - 18}" class="ax"/><line x1="26" y1="8" x2="26" y2="${H - 18}" class="ax"/>
        <rect x="${px(0.02)}" y="8" width="${px(0.57) - px(0.02)}" height="${H - 26}" class="band"/>
        <path d="${path}" class="curve"/>
        <line x1="${px(0.57)}" y1="8" x2="${px(0.57)}" y2="${H - 18}" class="sel"/>
        <text x="${px(0.57) + 4}" y="18" class="lbl">h* = 0.57</text>
        <text x="${W - 8}" y="${H - 5}" class="lbl" text-anchor="end">height h</text>
        <circle id="cfDot" r="3.5" class="dot" cx="${px(0.02)}" cy="${py(sweep[0][1])}"/>
      </svg>`;
    const dot = chartEl.querySelector('#cfDot');
    const dAt = h => { let best = sweep[0]; for (const s of sweep) if (Math.abs(s[0] - h) < Math.abs(best[0] - h)) best = s; return best[1]; };

    const all = [N.inputMesh, N.inputWire, N.inputGhost, N.extrude, ...N.revolves, N.revolveFinal, N.pass1, N.residual, N.final];
    const hideAll = () => { all.forEach(n => (n.visible = false)); loopLines.forEach(l => (l.visible = false)); };
    const setIou = v => { iouEl.hidden = v == null; if (v != null) iouEl.querySelector('b').textContent = v.toFixed(3); };

    // ---------- state per stage and time ----------
    function apply(si, u) {   // u in [0,1] progress within stage
      const st = STAGES[si].key;
      hideAll(); chartEl.hidden = true; setIou(null);
      loopLines.forEach(l => setLoopMat(l, loopMat));
      if (st === 'mesh') { N.inputMesh.visible = true; N.inputWire.visible = true; }
      if (st === 'sketch') {
        N.inputGhost.visible = true;
        const n = Math.ceil(Math.min(1, u * 1.25) * loopLines.length);
        loopLines.forEach((l, i) => (l.visible = i < n));
      }
      if (st === 'extrude') {
        N.inputGhost.visible = true; chartEl.hidden = false;
        loopLines.forEach(l => { l.visible = true; setLoopMat(l, loopDim); });
        setLoopMat(selExtrude, loopHot);
        // sweep 0 -> 1.4, then settle on 0.57
        const h = u < 0.7 ? 0.02 + (maxH - 0.02) * (u / 0.7) : maxH + (0.57 - maxH) * Math.min(1, (u - 0.7) / 0.18);
        N.extrude.visible = true; N.extrude.children.forEach(c => c.scale.set(1, 1, Math.max(0.02, h)));
        dot.setAttribute('cx', px(h)); dot.setAttribute('cy', py(dAt(h)));
        statusEl.textContent = u < 0.7 ? `Extrude · h = ${h.toFixed(2)} · D = ${dAt(h).toFixed(4)}` : 'Extrude · selected h* = 0.57 (IoU 0.68)';
        return;
      }
      if (st === 'revolve') {
        N.inputGhost.visible = true;
        loopLines.forEach(l => { l.visible = true; setLoopMat(l, loopDim); });
        setLoopMat(selRevolve, loopHot);
        const k = Math.min(N.revolves.length - 1, Math.floor(u * 1.15 * N.revolves.length));
        N.revolves[k].visible = true;
        statusEl.textContent = `Revolve · angle = ${(k + 1) * 60}°${k === N.revolves.length - 1 ? ' · IoU 0.952' : ''}`;
        return;
      }
      if (st === 'greedy') {
        N.inputGhost.visible = true;
        if (u < 0.45) { N.revolveFinal.visible = true; setIou(0.952 * Math.min(1, u / 0.25)); statusEl.textContent = 'Step 1 · best candidate: Revolve (IoU 0.952)'; }
        else { N.pass1.visible = true; setIou(0.952 + (0.976 - 0.952) * Math.min(1, (u - 0.45) / 0.25)); statusEl.textContent = 'Step 2 · ∪ Extrude improves IoU → 0.976; no other candidate helps'; }
        return;
      }
      if (st === 'residual') {
        if (u < 0.55) { N.pass1.visible = true; N.residual.visible = true; statusEl.textContent = 'Over-reconstructed residual fitted with 3 Extrudes'; }
        else { N.final.visible = true; statusEl.textContent = 'Residual removed with Cut'; }
        setIou(u < 0.55 ? 0.976 : 0.974);
        return;
      }
      if (st === 'done') { N.final.visible = true; setIou(0.974); }
      statusEl.textContent = STAGES[si].text;
    }

    let current = -1;
    function setStage(si) {
      if (si === current) return;
      current = si;
      stepItems.forEach((li, i) => { li.classList.toggle('done', i < si); li.classList.toggle('active', i === si); });
      renderCode(STAGES[si].key);
    }

    // timeline
    const total = STAGES.reduce((a, s) => a + s.dur, 0);
    let t0 = performance.now(), manual = null;
    stepItems.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
      const off = STAGES.slice(0, i).reduce((a, s) => a + s.dur, 0);
      t0 = performance.now() - off; kick();
    }));

    function locate(t) {
      let acc = 0;
      for (let i = 0; i < STAGES.length; i++) { if (t < acc + STAGES[i].dur) return [i, (t - acc) / STAGES[i].dur]; acc += STAGES[i].dur; }
      return [STAGES.length - 1, 1];
    }

    function frame(now) {
      raf = 0;
      let t = freeze !== null ? +freeze : (now - t0) % total;
      if (reduceMotion && freeze === null) t = total - 1;
      const [si, u] = locate(t);
      setStage(si); apply(si, u);
      controls.update(); renderer.render(scene, camera);
      if (visible && panel.classList.contains('active') && !(reduceMotion || freeze !== null)) raf = requestAnimationFrame(frame);
    }
    let raf = 0;
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    loaded = kick;
    controls.addEventListener('change', kick);
    document.addEventListener('showcase:tab', e => { if (e.detail === 'cadfit') { resize(); kick(); } });
    kick();
  }
}
