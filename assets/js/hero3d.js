// Interactive "mesh in, editable CAD out" demo for the hero.
// A scanned point cloud resolves into a CAD model that is rebuilt feature by feature,
// while the matching CadQuery program is written alongside it.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.getElementById('cadStage');
const canvas = document.getElementById('cadCanvas');
if (stage && canvas) init();

function init() {
  const STEPS = [
    { file: 'base',    label: 'Sketch + Extrude', code: '.rect(90, 56).extrude(8)' },
    { file: 'boss',    label: 'Boss',             code: '.faces(">Z").circle(16).extrude(22)' },
    { file: 'bore',    label: 'Bore',             code: '.faces(">Z").hole(14)' },
    { file: 'holes',   label: 'Hole pattern',     code: '.rect(70, 36).vertices().hole(7)' },
    { file: 'ribs',    label: 'Ribs',             code: '.rect(4, 14).extrude(12)' },
    { file: 'fillet',  label: 'Fillet',           code: '.edges("|Z").fillet(6)' },
    { file: 'chamfer', label: 'Chamfer',          code: '.faces(">Z").chamfer(1.5)' },
  ];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const treeEl = document.getElementById('cadTree');
  const codeEl = document.getElementById('cadCode');
  const statusEl = document.getElementById('cadStatus');

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  camera.position.set(175, 128, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 1.1;
  controls.target.set(0, 15, 0);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1b2638, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(120, 200, 90);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb8ff, 0.7);
  rim.position.set(-150, 60, -120);
  scene.add(rim);

  const grid = new THREE.GridHelper(260, 26, 0x3d5a80, 0x22344d);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  const solidMat = new THREE.MeshStandardMaterial({ color: 0xe9edf3, metalness: 0.15, roughness: 0.45, transparent: true, opacity: 1 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x0f1a2a, transparent: true, opacity: 0.9 });
  const pointMat = new THREE.PointsMaterial({ color: 0xff6b7f, size: 1.35, sizeAttenuation: true, transparent: true, opacity: 0 });

  const group = new THREE.Group();
  scene.add(group);

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---------- UI: feature tree + code ----------
  treeEl.innerHTML = '<li data-i="-1"><span class="ic">◌</span>Input scan (point cloud)</li>' +
    STEPS.map((s, i) => `<li data-i="${i}"><span class="ic">${i + 1}</span>${s.label}</li>`).join('');
  const treeItems = [...treeEl.querySelectorAll('li')];
  function setTree(i) {
    treeItems.forEach(li => {
      const k = +li.dataset.i;
      li.classList.toggle('done', k < i);
      li.classList.toggle('active', k === i);
    });
  }
  function setCode(i) {
    const lines = ['<span class="c-k">part</span> = cq.Workplane(<span class="c-s">"XY"</span>)'];
    STEPS.forEach((s, k) => {
      if (k <= i) lines.push(`  <span class="${k === i ? 'c-new' : ''}">${escapeCode(s.code)}</span>`);
    });
    codeEl.innerHTML = lines.join('\n');
  }
  function escapeCode(c) {
    return c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"([^"]*)"/g, '<span class="c-s">"$1"</span>')
      .replace(/(\d+(\.\d+)?)/g, '<span class="c-n">$1</span>');
  }

  // ---------- load meshes ----------
  const loader = new STLLoader();
  const base = stage.dataset.models;
  Promise.all(STEPS.map(s => loader.loadAsync(`${base}/${s.file}.stl`))).then(geoms => {
    const meshes = geoms.map(g => {
      g.rotateX(-Math.PI / 2);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, solidMat);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), edgeMat);
      const o = new THREE.Group();
      o.add(m, e);
      o.visible = false;
      group.add(o);
      return o;
    });
    const cloud = new THREE.Points(samplePoints(geoms[geoms.length - 1], 7000), pointMat);
    group.add(cloud);
    stage.classList.add('ready');
    run(meshes, cloud);
  }).catch(() => stage.classList.add('failed'));

  function samplePoints(geo, n) {
    const pos = geo.attributes.position;
    const tri = pos.count / 3;
    const areas = new Float32Array(tri);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let total = 0;
    for (let t = 0; t < tri; t++) {
      a.fromBufferAttribute(pos, 3 * t); b.fromBufferAttribute(pos, 3 * t + 1); c.fromBufferAttribute(pos, 3 * t + 2);
      total += areas[t] = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let r = Math.random() * total, t = 0;
      while (t < tri - 1 && (r -= areas[t]) > 0) t++;
      a.fromBufferAttribute(pos, 3 * t); b.fromBufferAttribute(pos, 3 * t + 1); c.fromBufferAttribute(pos, 3 * t + 2);
      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const p = a.clone().add(b.clone().sub(a).multiplyScalar(u)).add(c.clone().sub(a).multiplyScalar(v));
      out.set([p.x + (Math.random() - .5) * .9, p.y + (Math.random() - .5) * .9, p.z + (Math.random() - .5) * .9], 3 * i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(out, 3));
    return g;
  }

  // ---------- timeline ----------
  function run(meshes, cloud) {
    const last = meshes.length - 1;
    function show(i) { meshes.forEach((m, k) => (m.visible = k === i)); }

    if (reduceMotion) {
      show(last); setTree(STEPS.length); setCode(last);
      statusEl.textContent = 'Editable CAD program recovered';
      solidMat.opacity = 1; edgeMat.opacity = 0.9; cloud.visible = false;
      const draw = () => { controls.update(); renderer.render(scene, camera); };
      controls.addEventListener('change', draw);
      new ResizeObserver(draw).observe(canvas);
      draw();
      return;
    }
    // phases: [cloud, step0..step6, hold]
    const CLOUD = 2600, STEP = 1250, HOLD = 3200;
    const total = CLOUD + STEP * meshes.length + HOLD;
    let t0 = performance.now(), phase = null;

    // ?cadt=<ms> freezes the demo at a given moment (used for previews/screenshots)
    const freeze = new URLSearchParams(location.search).get('cadt');
    function frame(now) {
      const t = freeze !== null ? +freeze % total : (now - t0) % total;
      let p;
      if (t < CLOUD) p = -1;
      else if (t < CLOUD + STEP * meshes.length) p = Math.floor((t - CLOUD) / STEP);
      else p = 99;

      // point cloud fades in, then out as the first feature appears
      const cloudA = t < CLOUD ? Math.min(1, t / 700) : Math.max(0, 1 - (t - CLOUD) / 600);
      pointMat.opacity = cloudA;
      cloud.visible = cloudA > 0.01;
      solidMat.opacity = p === -1 ? 0 : Math.min(1, (t - CLOUD) / 500);
      edgeMat.opacity = solidMat.opacity * 0.9;

      if (p !== phase) {
        phase = p;
        if (p === -1) { show(-1); setTree(-1); setCode(-1); statusEl.textContent = 'Reading 3D scan…'; }
        else if (p === 99) { show(last); setTree(STEPS.length); setCode(last); statusEl.textContent = 'Editable CAD program recovered'; }
        else { show(p); setTree(p); setCode(p); statusEl.textContent = `Fitting: ${STEPS[p].label}`; }
      }
      controls.update();
      renderer.render(scene, camera);
      if (visible) requestAnimationFrame(frame);
    }

    let visible = false;
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) requestAnimationFrame(frame);
    }).observe(stage);
  }
}
