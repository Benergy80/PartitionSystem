// ============================================================================
// ChiLab Partition Configurator — UI, viewer, exports
// ============================================================================
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFExporter } from './vendor/GLTFExporter.js';
import { generate, DEFAULT_CONFIG, RATES, STOCK, PLATE, SYS, inch } from './engine.js';
import { buildPartMesh, poseObject, makeMaterials } from './geometry.js';
import { partDrawingSVG } from './drawing.js';

// ---------------- state ----------------
let cfg = structuredClone(DEFAULT_CONFIG);
let result = null;
let activeTab = 'layout';
let viewMode = 'assembled';
let showGlass = true;
let selectedPartId = null;
let lightMode = true;          // light viewer theme is the default
let doorsOpen = false;
let isolatedPartId = null;
let drawingMode = false;

const FINISHES = [
  { key: 'raw', name: 'Raw steel (waxed)', hex: 0x83858a },
  { key: 'matte-black', name: 'Matte black', hex: 0x1c1c1f },
  { key: 'oil-rubbed-bronze', name: 'Oil-rubbed bronze', hex: 0x3a3128 },
  { key: 'brass-patina', name: 'Brass patina', hex: 0x8c7440 },
];
const GLASS_TYPES = [
  { key: 'clear', name: 'Clear' }, { key: 'lowIron', name: 'Low iron' },
  { key: 'fluted', name: 'Fluted / reeded' }, { key: 'smoked', name: 'Smoked' },
];

// ---------------- ft/in helpers ----------------
function parseFtIn(s) {
  s = String(s).trim();
  let m = s.match(/^(\d+)\s*'\s*(?:(\d+)\s*(?:(\d+)\/(\d+))?\s*"?)?$/);
  if (m) return parseInt(m[1]) * 12 + (parseInt(m[2] || 0)) + (m[3] ? parseInt(m[3]) / parseInt(m[4]) : 0);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:(\d+)\/(\d+))?\s*"?$/);
  if (m) return parseFloat(m[1]) + (m[2] ? parseInt(m[2]) / parseInt(m[3]) : 0);
  const v = parseFloat(s); return isNaN(v) ? null : v;
}
function fmtFtIn(v) {
  const ft = Math.floor(v / 12); let rest = v - ft * 12;
  rest = Math.round(rest * 16) / 16;
  const whole = Math.floor(rest); const fr = rest - whole;
  const fracs = { 0: '', 0.0625: ' 1/16', 0.125: ' 1/8', 0.1875: ' 3/16', 0.25: ' 1/4', 0.3125: ' 5/16', 0.375: ' 3/8', 0.4375: ' 7/16', 0.5: ' 1/2', 0.5625: ' 9/16', 0.625: ' 5/8', 0.6875: ' 11/16', 0.75: ' 3/4', 0.8125: ' 13/16', 0.875: ' 7/8', 0.9375: ' 15/16' };
  const fs = fracs[fr] ?? '';
  return ft > 0 ? `${ft}' ${whole}${fs}"` : `${whole}${fs}"`;
}
const $$ = sel => document.querySelector(sel);
const money = v => '$' + Math.round(v).toLocaleString();

// ---------------- viewer ----------------
const viewer = { scene: null, camera: null, renderer: null, controls: null, root: null, mats: null, instances: [], doorPivots: [], grid: null, floor: null };
const THEMES = {
  light: { bg: 0xefede8, floor: 0xe0ddd5, grid1: 0xc9c6be, grid2: 0xd9d6ce, hemi: 1.15, key: 1.35 },
  dark:  { bg: 0x101114, floor: 0x141518, grid1: 0x2a2d34, grid2: 0x1c1e23, hemi: 1.0,  key: 1.6 },
};
function applyTheme() {
  const t = THEMES[lightMode ? 'light' : 'dark'];
  viewer.scene.background = new THREE.Color(t.bg);
  viewer.floor.material.color.setHex(t.floor);
  viewer.grid.material.color?.setHex?.(t.grid1);
  viewer.scene.remove(viewer.grid);
  viewer.grid = new THREE.GridHelper(600, 30, t.grid1, t.grid2);
  viewer.grid.position.y = -0.05; viewer.scene.add(viewer.grid);
  const btn = $$('#btnTheme'); if (btn) btn.textContent = lightMode ? 'Dark mode' : 'Light mode';
}
function initViewer() {
  const el = $$('#viewer');
  viewer.scene = new THREE.Scene();
  viewer.scene.background = new THREE.Color(0x101114);
  viewer.camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
  viewer.renderer = new THREE.WebGLRenderer({ antialias: true });
  viewer.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  el.appendChild(viewer.renderer.domElement);
  viewer.controls = new OrbitControls(viewer.camera, viewer.renderer.domElement);
  viewer.controls.enableDamping = true;

  const amb = new THREE.HemisphereLight(0xf5efe6, 0x232428, 1.0);
  viewer.scene.add(amb);
  viewer.key = new THREE.DirectionalLight(0xfff2dd, 1.6); viewer.scene.add(viewer.key);
  viewer.fill = new THREE.DirectionalLight(0xcfd8e6, 0.55); viewer.scene.add(viewer.fill);
  updateLight();

  viewer.grid = new THREE.GridHelper(600, 30, 0x2a2d34, 0x1c1e23);
  viewer.grid.position.y = -0.05; viewer.scene.add(viewer.grid);
  viewer.floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.95 }));
  viewer.floor.rotation.x = -Math.PI / 2; viewer.floor.position.y = -0.1; viewer.scene.add(viewer.floor);
  applyTheme();

  window.addEventListener('resize', sizeViewer); sizeViewer();
  viewer.renderer.domElement.addEventListener('pointerdown', onPick);
  animate();
}
// key light from azimuth/elevation sliders — low default so faces read clearly
function updateLight() {
  const az = THREE.MathUtils.degToRad($$('#lightAz')?.valueAsNumber ?? 140);
  const el = THREE.MathUtils.degToRad($$('#lightEl')?.valueAsNumber ?? 28);
  const R = 500, cx = (cfg?.opening?.width ?? 142) / 2;
  viewer.key.position.set(cx + R * Math.cos(el) * Math.sin(az), R * Math.sin(el), R * Math.cos(el) * Math.cos(az));
  // fill opposes the key at a low angle
  viewer.fill.position.set(cx - R * Math.cos(el) * Math.sin(az), R * 0.35, -R * Math.cos(el) * Math.cos(az));
}
function sizeViewer() {
  const el = $$('#viewer');
  const w = el.clientWidth, h = el.clientHeight;
  viewer.camera.aspect = w / h; viewer.camera.updateProjectionMatrix();
  viewer.renderer.setSize(w, h);
}
function animate() {
  requestAnimationFrame(animate);
  for (const p of viewer.doorPivots) {
    const target = doorsOpen ? p.userData.openSign * THREE.MathUtils.degToRad(85) : 0;
    p.rotation.y += (target - p.rotation.y) * 0.09;
  }
  viewer.controls.update();
  viewer.renderer.render(viewer.scene, viewer.camera);
}

function frameCamera(iso = true) {
  const W = cfg.opening.width, H = cfg.opening.height;
  const d = Math.max(W, H) * (iso ? 1.35 : 1.5);
  viewer.controls.target.set(W / 2, H / 2, 0);
  if (iso) viewer.camera.position.set(W / 2 + d * 0.72, H * 0.75, d * 0.9);
  else viewer.camera.position.set(W / 2, H / 2, d);
  viewer.camera.near = 1; viewer.camera.far = d * 20; viewer.camera.updateProjectionMatrix();
}

function rebuildScene() {
  if (viewer.root) { viewer.scene.remove(viewer.root); disposeDeep(viewer.root); }
  viewer.mats = makeMaterials(FINISHES.find(f => f.key === cfg.finish)?.hex ?? 0x3a3128);
  viewer.root = new THREE.Group();
  viewer.instances = [];
  viewer.doorPivots = [];
  const pivotMap = new Map();
  for (const part of result.parts) {
    for (const pose of part.poses) {
      const obj = buildPartMesh(part, viewer.mats);
      poseObject(obj, pose);
      if (pose.doorPivot) {
        // every door-attached part (frame, lites, glazing angles, pulls) joins its leaf's hinge pivot
        const key = pose.doorPivot.join(',');
        let pivot = pivotMap.get(key);
        if (!pivot) {
          pivot = new THREE.Group();
          pivot.position.set(...pose.doorPivot);
          pivot.userData.openSign = pose.openSign;
          pivotMap.set(key, pivot);
          viewer.doorPivots.push(pivot);
          viewer.root.add(pivot);
        }
        obj.position.set(pose.pos[0] - pivot.position.x, pose.pos[1] - pivot.position.y, pose.pos[2] - pivot.position.z);
        pivot.add(obj);
      } else {
        viewer.root.add(obj);
      }
      obj.userData.partId = part.id;
      obj.userData.kind = part.kind;
      obj.userData.profile = part.profile;
      obj.userData.pose = pose;
      obj.userData.basePos = obj.position.clone();
      if (part.kind === 'glass') obj.visible = showGlass;
      viewer.instances.push(obj);
    }
  }
  viewer.scene.add(viewer.root);
  applyExplode();
}
function disposeDeep(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); }); }

// Layered assembly explode: each part family separates along its install direction.
// Verticals stay put as the reference skeleton.
function explodeVector(o) {
  const { kind, profile, pose } = o.userData;
  const W = cfg.opening.width;
  if (kind === 'portal') {
    if (pose.portal === 'head') return new THREE.Vector3(0, 1.3, 0);
    return new THREE.Vector3(pose.pos[0] < W / 2 ? -0.9 : 0.9, 0.15, 0);
  }
  if (kind === 'tube' && profile === 'header') return new THREE.Vector3(0, 0.85, 0);
  if (kind === 'tube' && profile === 'vertical') return new THREE.Vector3(0, 0, 0);
  if (kind === 'tube' && profile === 'horizontal') return new THREE.Vector3(0, 0, 0.55);
  if (kind === 'plate' && (profile === 'shearA' || profile === 'shearB' || profile === 'shearAPass'))
    return new THREE.Vector3(0, 0, 1.1);
  if (kind === 'plate') return new THREE.Vector3(0, -0.55, 0);   // clips + tabs drop below
  if (kind === 'angle') return new THREE.Vector3(0, 0, (pose.face ?? 1) * 1.0);
  if (kind === 'glass' || kind === 'panel') return new THREE.Vector3(0, 0, 0.28);
  if (kind === 'door') return new THREE.Vector3(0, 0, 0.75);
  if (kind === 'pull') return new THREE.Vector3(0, 0, 1.35);
  return new THREE.Vector3(0, 0, 0.4);
}
function applyExplode() {
  const D = viewMode === 'exploded'
    ? ($$('#explodeAmt').valueAsNumber / 100) * Math.min(60, Math.max(cfg.opening.width, cfg.opening.height) * 0.35)
    : 0;
  for (const o of viewer.instances) {
    o.position.copy(o.userData.basePos).addScaledVector(explodeVector(o), D);
  }
}

// ---- part isolation viewer ----
function isolatePart(id) {
  const part = result.parts.find(p => p.id === id);
  if (!part) return;
  const wasDrawing = drawingMode;
  exitIsolation(false);
  isolatedPartId = id;
  viewer.root.visible = false;
  const obj = buildPartMesh(part, viewer.mats);
  const bb = new THREE.Box3().setFromObject(obj);
  const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3());
  obj.position.sub(c);
  viewer.isoGroup = new THREE.Group();
  viewer.isoGroup.add(obj);
  const lift = Math.max(size.y / 2 + 2, 8);
  viewer.isoGroup.position.set(0, lift, 0);
  viewer.scene.add(viewer.isoGroup);
  const r = Math.max(size.length() / 2, 2);
  const d = r / Math.tan(THREE.MathUtils.degToRad(viewer.camera.fov / 2)) * 1.35;
  viewer.controls.target.set(0, lift, 0);
  viewer.camera.position.set(d * 0.8, lift + d * 0.45, d * 0.85);
  viewer.camera.near = Math.max(0.05, d / 100); viewer.camera.far = d * 50;
  viewer.camera.updateProjectionMatrix();
  showPartCard(part);
  renderPartsList();
  $$('#partsList').style.display = 'block';
  if (wasDrawing) showDrawing(part);
}
function exitIsolation(reframe = true) {
  isolatedPartId = null;
  drawingMode = false;
  if (viewer.isoGroup) { viewer.scene.remove(viewer.isoGroup); disposeDeep(viewer.isoGroup); viewer.isoGroup = null; }
  if (viewer.root) viewer.root.visible = true;
  $$('#partsList').style.display = 'none';
  $$('#drawingOverlay').style.display = 'none';
  if (reframe) { viewer.camera.near = 1; viewer.camera.updateProjectionMatrix(); frameCamera(true); }
}

// ---- scrollable parts list (visible during isolation) ----
function renderPartsList() {
  const el = $$('#partsList');
  el.innerHTML = `<h4>Parts (${result.parts.length})</h4>` + result.parts.map(p =>
    `<div class="pl-item ${p.id === isolatedPartId ? 'active' : ''}" data-pl="${p.id}">
      <span>${p.id} · ${p.name}</span><span class="q">×${p.qty}</span></div>`).join('');
  el.querySelectorAll('[data-pl]').forEach(row => {
    row.onclick = () => { selectedPartId = row.dataset.pl; isolatePart(row.dataset.pl); };
  });
  const active = el.querySelector('.pl-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

// ---- orthographic drawing overlay ----
function showDrawing(part) {
  drawingMode = true;
  $$('#drawingScroll').innerHTML = partDrawingSVG(part);
  $$('#dwTitle').textContent = `${part.id} — ${part.name}  (×${part.qty})`;
  $$('#drawingOverlay').style.display = 'flex';
}
function hideDrawing() {
  drawingMode = false;
  $$('#drawingOverlay').style.display = 'none';
}
function exportPartSVG(part) {
  const svg = partDrawingSVG(part);
  download(new Blob([svg], { type: 'image/svg+xml' }), `${part.id} ${part.name} drawing.svg`);
}
function stepPart(dir) {
  const ids = result.parts.map(p => p.id);
  const i = Math.max(0, ids.indexOf(selectedPartId ?? isolatedPartId));
  const next = ids[(i + dir + ids.length) % ids.length];
  selectedPartId = next;
  if (isolatedPartId) isolatePart(next); else selectPart(next);
}

const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
function onPick(e) {
  if (e.button !== 0 || isolatedPartId) return;
  const r = viewer.renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, viewer.camera);
  const hits = raycaster.intersectObjects(viewer.instances, true);
  let obj = hits[0]?.object;
  while (obj && !obj.userData.partId) obj = obj.parent;
  selectPart(obj?.userData.partId ?? null);
}
function selectPart(id) {
  selectedPartId = id;
  for (const o of viewer.instances) {
    const sel = id && o.userData.partId === id;
    o.traverse(c => {
      if (c.isMesh && c.material) {
        c.material = sel ? c.material.clone() : c.material;
        if (sel) { c.material.emissive = new THREE.Color(0xc9a36a); c.material.emissiveIntensity = 0.35; }
      }
    });
  }
  if (!id) { $$('#partCard').style.display = 'none'; rebuildScene(); return; }
  const part = result.parts.find(p => p.id === id);
  showPartCard(part);
}
function showPartCard(part) {
  const el = $$('#partCard');
  const holes = part.holes || [], slots = part.slots || [];
  el.innerHTML = `
    <h3>${part.id} — ${part.name}</h3>
    <div style="color:var(--dim)">Qty required: <b style="color:var(--text)">${part.qty}</b>${part.length ? ` · cut length <b style="color:var(--text)">${inch(part.length)}</b>` : ''}${part.miter ? ' · 45° miter both ends' : ''}</div>
    ${part.dims ? `<div style="color:var(--dim);margin-top:3px">Dims: ${part.dims.map(d => inch(d)).join(' × ')}</div>` : ''}
    ${holes.length ? `<table><tr><th>Hole</th><th>Face</th><th>x</th><th>y</th><th>Ø</th></tr>${holes.map((h, i) => `<tr><td>${i + 1}${h.tap ? ' (tap ' + h.tap + ')' : ''}</td><td>${h.face}</td><td>${inch(h.x)}</td><td>${inch(h.y)}</td><td>${inch(h.d)}</td></tr>`).join('')}</table>` : ''}
    ${slots.length ? `<table><tr><th>Slot</th><th>Face</th><th>x</th><th>y</th><th>w×h</th></tr>${slots.map((s, i) => `<tr><td>${i + 1}</td><td>${s.face}</td><td>${inch(s.x)}</td><td>${inch(s.y)}</td><td>${inch(s.w)}×${inch(s.h)}</td></tr>`).join('')}</table>` : ''}
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="hudBtn" id="pcPrev">◀</button>
      <button class="hudBtn" id="pcNext">▶</button>
      <button class="hudBtn ${isolatedPartId ? 'active' : ''}" id="pcIso">${isolatedPartId ? 'Back to assembly' : 'Isolate part'}</button>
      ${isolatedPartId ? `<button class="hudBtn" id="pcDraw">Shop drawing</button>` : ''}
      <span class="dl" data-dl="${part.id}" style="align-self:center">Download ${part.id}.glb</span>
    </div>`;
  el.style.display = 'block';
  el.querySelector('[data-dl]').onclick = () => exportPartGLB(part);
  el.querySelector('#pcPrev').onclick = () => stepPart(-1);
  el.querySelector('#pcNext').onclick = () => stepPart(1);
  el.querySelector('#pcIso').onclick = () => { if (isolatedPartId) { exitIsolation(); showPartCard(part); } else { selectedPartId = part.id; isolatePart(part.id); } };
  const drawBtn = el.querySelector('#pcDraw');
  if (drawBtn) drawBtn.onclick = () => showDrawing(part);
}

// ---------------- regenerate ----------------
function regen() {
  exitIsolation(false);
  $$('#partCard').style.display = 'none';
  result = generate(cfg);
  cfg = result.cfg;                       // normalized
  rebuildScene();
  renderPanel();
  $$('#totalPrice').textContent = money(result.bom.total);
  $$('#totalMeta').textContent =
    `${result.stats.totalPieces} pieces · ${result.stats.uniqueParts} unique parts · ${result.bom.glassArea.toFixed(0)} sqft glass · ${result.stats.joints} cold joints`;
}

// ---------------- UI panels ----------------
function renderPanel() {
  const p = $$('#panel');
  if (activeTab === 'layout') p.innerHTML = layoutHTML();
  else if (activeTab === 'doors') p.innerHTML = doorsHTML();
  else if (activeTab === 'finishes') p.innerHTML = finishesHTML();
  else p.innerHTML = quoteHTML();
  wirePanel();
}

const conflictsHTML = () => {
  const list = result.conflicts;
  if (!list.length) return `<div class="chip ok">No conflicts — system resolves cleanly.</div>`;
  return list.map(c => `<div class="chip ${c.level}">${c.level === 'error' ? '⛔' : '⚠️'} ${c.msg}</div>`).join('');
};

function dimRow(label, id, val, min, max) {
  return `<div class="row"><label>${label}</label>
    <input type="range" id="${id}_r" min="${min}" max="${max}" step="1" value="${val}">
    <input type="text" class="ftIn" id="${id}_t" value="${fmtFtIn(val)}"></div>`;
}

function layoutHTML() {
  const b = cfg.bays, r = cfg.rows;
  return `
  <div class="sec"><h2>Clear opening</h2>
    ${dimRow('Width', 'ow', cfg.opening.width, 36, 480)}
    ${dimRow('Height', 'oh', cfg.opening.height, 78, 168)}
  </div>
  <div class="sec"><h2>Portal surround</h2>
    <div class="row"><label>Portal</label><div class="pills">
      <div class="pill ${cfg.portal.enabled ? 'active' : ''}" data-set="portal.enabled" data-val="true">½" steel plate</div>
      <div class="pill ${!cfg.portal.enabled ? 'active' : ''}" data-set="portal.enabled" data-val="false">None</div></div></div>
    ${cfg.portal.enabled ? `<div class="row"><label>Portal depth</label>
      <input type="text" class="ftIn" id="pd_t" value="${fmtFtIn(cfg.portal.depth)}">
      <span class="note" style="margin:0">wall + ¼" reveal each side</span></div>` : ''}
  </div>
  <div class="sec"><h2>Vertical bays</h2>
    <div class="row"><label>Bay count</label><input type="number" id="bayCount" min="1" max="16" value="${b.count}"></div>
    <div class="row"><label>Custom widths</label><input type="text" id="bayWidths" style="width:100%" placeholder="auto (equal)" value="${b.widths ? b.widths.map(w => fmtFtIn(w)).join(', ') : ''}"></div>
    <div class="note">Comma list of clear bay widths (door bay auto-sizes from leaves). Leave blank for equal bays.</div>
  </div>
  <div class="sec"><h2>Horizontal rows</h2>
    <div class="row"><label>Field rows</label><input type="number" id="rowCount" min="1" max="8" value="${r.count}"></div>
    <div class="row"><label>Head row infill</label><div class="pills">
      <div class="pill ${r.topPanel === 'glass' ? 'active' : ''}" data-set="rows.topPanel" data-val="glass">Glass</div>
      <div class="pill ${r.topPanel === 'metal' ? 'active' : ''}" data-set="rows.topPanel" data-val="metal">Metal panel</div></div></div>
    <div class="note">Field rows subdivide below the door head; the head-lite band above auto-fills the opening and adds horizontals so no head panel is taller than a field panel — the grid stays congruent.</div>
  </div>
  <div class="sec"><h2>System check</h2>${conflictsHTML()}
    ${result.notes.map(n => `<div class="note">ℹ️ ${n}</div>`).join('')}
  </div>`;
}

function doorsHTML() {
  const d = cfg.door;
  const L = result.layout;
  const posRow = d.type === 'none' ? '' : (L.sideliteSplitEven
    ? `<div class="row"><label>Door position</label><span class="note" style="margin:0">Centered — ${L.leftSidelites} sidelite${L.leftSidelites === 1 ? '' : 's'} each side</span></div>`
    : `<div class="row"><label>Extra sidelite</label><div class="pills">
        <div class="pill ${cfg.bays.doorSide !== 'right' ? 'active' : ''}" data-set="bays.doorSide" data-val="left">Left (${L.leftSidelites})</div>
        <div class="pill ${cfg.bays.doorSide === 'right' ? 'active' : ''}" data-set="bays.doorSide" data-val="right">Right (${L.rightSidelites})</div></div></div>`);
  return `
  <div class="sec"><h2>Door configuration</h2>
    <div class="row"><label>Type</label><div class="pills">
      ${['none', 'single', 'pair'].map(t => `<div class="pill ${d.type === t ? 'active' : ''}" data-set="door.type" data-val="${t}">${t === 'none' ? 'No door' : t === 'single' ? 'Single' : 'Pair'}</div>`).join('')}
    </div></div>
    ${d.type !== 'none' ? `
    ${posRow}
    ${dimRow('Leaf width', 'lw', d.leafWidth || 36, 24, 48)}
    ${dimRow('Leaf height', 'lh', d._leafH || 84, 78, 120)}
    <div class="row"><label>Std. height</label><div class="pills">
      ${[[80, "6'-8\""], [84, "7'-0\""], [96, "8'-0\""]].map(([h, lbl]) =>
        `<div class="pill ${Math.abs((d._leafH || 84) - h) < 0.1 ? 'active' : ''}" data-doorh="${h}">${lbl}</div>`).join('')}</div></div>
    <div class="note">Door height is a fixed room standard — it drives a rail line at the door head, so changing the <b>opening height</b> only grows or shrinks the head-lite band above, never the door.</div>
    <div class="row"><label>Leaf style</label><div class="pills">
      <div class="pill ${d.style === 'glass-grid' ? 'active' : ''}" data-set="door.style" data-val="glass-grid">Glass grid</div>
      <div class="pill ${d.style === 'solid' ? 'active' : ''}" data-set="door.style" data-val="solid">Solid (wood veneer)</div></div></div>
    ${d.style === 'glass-grid' ? `<div class="note">Door mid-rails automatically align to the partition rail lines, so mullion lines carry across leaves and sidelites.</div>` : ''}
  </div>
  <div class="sec"><h2>Hinging & clearances</h2>
    <div class="row"><label>Hinge</label><div class="pills">
      ${['butt', 'continuous', 'pivot'].map(h => `<div class="pill ${d.hinge === h ? 'active' : ''}" data-set="door.hinge" data-val="${h}">${h === 'butt' ? 'Butt (IVES)' : h[0].toUpperCase() + h.slice(1)}</div>`).join('')}
    </div></div>
    <div class="grid2">
      <div class="row"><label>Hinge gap</label><input type="text" id="hingeGap" value="${inch(d.hingeGap)}"></div>
      ${d.type === 'pair' ? `<div class="row"><label>Meeting gap</label><input type="text" id="meetingGap" value="${inch(d.meetingGap)}"></div>` : ''}
      <div class="row"><label>Floor clear</label><input type="text" id="floorClear" value="${inch(d.floorClearance)}"></div>
      <div class="row"><label>Head gap</label><input type="text" id="headGap" value="${inch(d.headGap)}"></div>
    </div>
    <div class="note">Source project: ⅜" hinge gaps, ¼" meeting gap, ¾" floor clearance (36" leaves in a 73½" module).</div>
  </div>
  <div class="sec"><h2>Hardware</h2>
    <div class="row"><label>Pulls</label><select id="doorPull">
      <option value="none" ${d.pull === 'none' ? 'selected' : ''}>None</option>
      <option value="brass36" ${d.pull === 'brass36' ? 'selected' : ''}>Brass pull 36"</option>
      <option value="brass72" ${d.pull === 'brass72' ? 'selected' : ''}>Brass pull 72"</option></select></div>
    <div class="row"><label>Closers</label><div class="pills">
      <div class="pill ${d.closers ? 'active' : ''}" data-set="door.closers" data-val="true">OH concealed</div>
      <div class="pill ${!d.closers ? 'active' : ''}" data-set="door.closers" data-val="false">None</div></div></div>
    <div class="row"><label>Locking</label><select id="doorLock">
      <option value="none" ${d.lock === 'none' ? 'selected' : ''}>None</option>
      <option value="maglock" ${d.lock === 'maglock' ? 'selected' : ''}>Mag lock + card reader</option>
      <option value="mortise" ${d.lock === 'mortise' ? 'selected' : ''}>Mortise</option></select></div>
  </div>` : ''}
  <div class="sec"><h2>System check</h2>${conflictsHTML()}</div>`;
}

function finishesHTML() {
  return `
  <div class="sec"><h2>Steel finish</h2>
    <div class="swatches">
      ${FINISHES.map(f => `<div class="swatch ${cfg.finish === f.key ? 'active' : ''}" data-set="finish" data-val="${f.key}" style="background:#${f.hex.toString(16).padStart(6, '0')}"><span>${f.name}</span></div>`).join('')}
    </div>
    <div class="note" style="margin-top:8px">Finish to match control sample (source spec: oil-rubbed bronze). Multiplier applied to steel + fabrication.</div>
  </div>
  <div class="sec"><h2>Glass — ¼" plate</h2>
    <div class="pills">
      ${GLASS_TYPES.map(g => `<div class="pill ${cfg.glass.type === g.key ? 'active' : ''}" data-set="glass.type" data-val="${g.key}">${g.name}</div>`).join('')}
    </div>
  </div>
  <div class="sec"><h2>Install</h2>
    <div class="pills">
      <div class="pill ${cfg.estimate.install ? 'active' : ''}" data-set="estimate.install" data-val="true">Include install (35%)</div>
      <div class="pill ${!cfg.estimate.install ? 'active' : ''}" data-set="estimate.install" data-val="false">Fab only</div>
    </div>
  </div>`;
}

function quoteHTML() {
  const bom = result.bom;
  const profRows = Object.entries(bom.profiles).map(([k, pr]) => `
    <tr><td>${pr.name}</td><td class="num">${pr.lf.toFixed(1)} lf</td><td class="num">${pr.lfWithWaste.toFixed(1)} lf</td><td class="num">${pr.stockSticks} × ${RATES.stockLengthFt}'</td></tr>`).join('');
  const plateRows = Object.entries(bom.plateCounts).map(([k, q]) => `
    <tr><td>${PLATE[k].name}</td><td class="num">${q}</td><td class="num" colspan="2">plate/bar stock</td></tr>`).join('');
  const partRows = result.parts.map(p => `
    <tr class="partRow" data-part="${p.id}"><td>${p.id}</td><td>${p.name}</td><td class="num">${p.qty}</td>
      <td class="num">${p.length ? inch(p.length) : '—'}</td><td><span class="dl" data-dl="${p.id}">glb</span></td></tr>`).join('');
  const costRows = bom.lines.map(l => `<tr><td>${l.item}</td><td class="num">${money(l.cost)}</td></tr>`).join('');
  return `
  <div class="sec"><h2>Export package</h2>
    <button class="btn" id="btnQuotePkg">Print quote package (summary + BOM + cut sheet)</button>
    <div class="grid2">
      <button class="btn secondary" id="btnGlbAssembly">Assembly .glb</button>
      <button class="btn secondary" id="btnGlbParts">Parts library .glb</button>
      <button class="btn secondary" id="btnCsv">BOM .csv</button>
      <button class="btn secondary" id="btnCutSheet">Cut sheet (print)</button>
    </div>
    <div class="note">Parts library lays out one of each unique part with qty in the node name. Repeated parts export once; unique-featured parts get their own file (click "glb" per row).</div>
  </div>
  <div class="sec"><h2>Stock material — linear totals</h2>
    <table class="bom"><tr><th>Profile</th><th style="text-align:right">Net</th><th style="text-align:right">+10% waste</th><th style="text-align:right">Order</th></tr>
    ${profRows}${plateRows}
    <tr><td>Glass ¼" (${cfg.glass.type})</td><td class="num">${bom.glassArea.toFixed(1)} sqft</td><td class="num">${result.panes.length} panes</td><td></td></tr>
    <tr><td>8-32 × ⅜" SS screws</td><td class="num">${bom.fasteners.screw832}</td><td colspan="2" class="num">anchors: ${bom.fasteners.anchors}</td></tr>
    </table>
  </div>
  <div class="sec"><h2>Unique parts (${result.parts.length})</h2>
    <table class="bom"><tr><th>ID</th><th>Part</th><th style="text-align:right">Qty</th><th style="text-align:right">Cut</th><th></th></tr>${partRows}</table>
  </div>
  <div class="sec"><h2>Estimate breakdown</h2>
    <table class="bom">${costRows}
    <tr><td style="color:var(--accent);font-weight:600">TOTAL (budget)</td><td class="num" style="color:var(--accent);font-weight:600">${money(bom.total)}</td></tr></table>
    <div class="note">Budgetary estimate for quoting — verify glass and finish rates per vendor. Rates editable in engine.js RATES.</div>
  </div>
  <div class="sec"><h2>Request formal quote</h2>
    <div class="row"><label>Name</label><input type="text" id="qName" style="width:100%"></div>
    <div class="row"><label>Email</label><input type="text" id="qEmail" style="width:100%"></div>
    <div class="row"><label>Project / zip</label><input type="text" id="qProj" style="width:100%"></div>
    <button class="btn" id="btnQuotePkg2">Generate quote package</button>
  </div>`;
}

// ---------------- wiring ----------------
function setPath(path, val) {
  const keys = path.split('.'); let o = cfg;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = val;
}
function wirePanel() {
  document.querySelectorAll('[data-set]').forEach(el => {
    el.onclick = () => {
      let v = el.dataset.val;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      setPath(el.dataset.set, v);
      regen();
    };
  });
  const bindDim = (id, path, cb) => {
    const r = $$(`#${id}_r`), t = $$(`#${id}_t`);
    if (r) r.oninput = () => { setByPath(path, r.valueAsNumber); regen(); };
    if (t) t.onchange = () => { const v = parseFtIn(t.value); if (v != null) { setByPath(path, v); regen(); } };
  };
  const setByPath = (p, v) => { if (typeof p === 'function') p(v); else setPath(p, v); };
  bindDim('ow', 'opening.width'); bindDim('oh', 'opening.height');
  bindDim('lw', v => { cfg.door.leafWidth = v; }); bindDim('lh', v => { cfg.door.height = v; });
  document.querySelectorAll('[data-doorh]').forEach(el => {
    el.onclick = () => { cfg.door.height = +el.dataset.doorh; regen(); };
  });
  const on = (id, fn) => { const el = $$(`#${id}`); if (el) el.onchange = () => fn(el); };
  on('pd_t', el => { const v = parseFtIn(el.value); if (v != null) { cfg.portal.depth = v; regen(); } });
  on('bayCount', el => { cfg.bays.count = +el.value; cfg.bays.widths = null; regen(); });
  on('rowCount', el => { cfg.rows.count = +el.value; regen(); });
  on('bayWidths', el => {
    const s = el.value.trim();
    cfg.bays.widths = s ? s.split(',').map(x => parseFtIn(x)).filter(v => v != null) : null;
    if (cfg.bays.widths && cfg.bays.widths.length !== cfg.bays.count) cfg.bays.count = cfg.bays.widths.length;
    regen();
  });
  on('doorPull', el => { cfg.door.pull = el.value; regen(); });
  on('doorLock', el => { cfg.door.lock = el.value; regen(); });
  on('hingeGap', el => { const v = parseFtIn(el.value); if (v != null) { cfg.door.hingeGap = v; regen(); } });
  on('meetingGap', el => { const v = parseFtIn(el.value); if (v != null) { cfg.door.meetingGap = v; regen(); } });
  on('floorClear', el => { const v = parseFtIn(el.value); if (v != null) { cfg.door.floorClearance = v; regen(); } });
  on('headGap', el => { const v = parseFtIn(el.value); if (v != null) { cfg.door.headGap = v; regen(); } });
  document.querySelectorAll('.partRow').forEach(tr => { tr.onclick = e => { if (e.target.dataset.dl) return; selectedPartId = tr.dataset.part; isolatePart(tr.dataset.part); }; });
  document.querySelectorAll('#panel [data-dl]').forEach(el => { el.onclick = () => exportPartGLB(result.parts.find(p => p.id === el.dataset.dl)); });
  const q1 = $$('#btnQuotePkg'), q2 = $$('#btnQuotePkg2');
  if (q1) q1.onclick = printQuotePackage; if (q2) q2.onclick = printQuotePackage;
  const ga = $$('#btnGlbAssembly'); if (ga) ga.onclick = exportAssemblyGLB;
  const gp = $$('#btnGlbParts'); if (gp) gp.onclick = exportPartsLibraryGLB;
  const cs = $$('#btnCsv'); if (cs) cs.onclick = exportCSV;
  const cut = $$('#btnCutSheet'); if (cut) cut.onclick = printCutSheet;
}

// ---------------- exports ----------------
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportSceneGLB(root, name) {
  const wrap = new THREE.Group();
  wrap.scale.setScalar(0.0254);          // inches -> meters
  wrap.add(root);
  new GLTFExporter().parse(wrap, gltf => {
    download(new Blob([gltf], { type: 'model/gltf-binary' }), name);
  }, err => console.error(err), { binary: true });
}
function exportPartGLB(part) {
  const mats = viewer.mats || makeMaterials();
  const obj = buildPartMesh(part, mats);
  obj.name = `${part.id}_${part.name.replace(/[^a-z0-9]+/gi, '_')}_x${part.qty}`;
  let i = 0;
  obj.traverse(c => { if (c.isMesh && !c.name) c.name = `${part.id}_m${i++}`; });
  exportSceneGLB(obj, `${part.id} ${part.name} x${part.qty}.glb`);
}
function exportPartsLibraryGLB() {
  const mats = viewer.mats || makeMaterials();
  const root = new THREE.Group(); root.name = 'ChiLab_Partition_Parts';
  let x = 0;
  for (const part of result.parts) {
    const obj = buildPartMesh(part, mats);
    obj.name = `${part.id}_x${part.qty}_${part.name.replace(/[^a-z0-9]+/gi, '_')}`;
    const bb = new THREE.Box3().setFromObject(obj);
    const size = bb.getSize(new THREE.Vector3());
    obj.position.set(x - bb.min.x, -bb.min.y, 0);
    x += size.x + 6;
    root.add(obj);
  }
  exportSceneGLB(root, 'partition-parts-library.glb');
}
function exportAssemblyGLB() {
  const mats = viewer.mats || makeMaterials();
  const root = new THREE.Group(); root.name = 'ChiLab_Partition_Assembly';
  for (const part of result.parts) {
    for (const pose of part.poses) {
      const obj = buildPartMesh(part, mats);
      obj.name = `${part.id}_${part.name.replace(/[^a-z0-9]+/gi, '_')}`;
      let i = 0;
      obj.traverse(c => { if (c.isMesh && !c.name) c.name = `${part.id}_m${i++}`; });
      poseObject(obj, pose);
      root.add(obj);
    }
  }
  exportSceneGLB(root, 'partition-assembly.glb');
}
function exportCSV() {
  const rows = [['id', 'part', 'kind', 'profile', 'qty', 'cut_length_in', 'cut_length_ftin', 'miter', 'holes', 'slots', 'notes']];
  for (const p of result.parts) {
    rows.push([p.id, p.name, p.kind, p.profile || '', p.qty, p.length ? p.length.toFixed(3) : '',
      p.length ? fmtFtIn(p.length) : '', p.miter ? '45deg both ends' : '',
      (p.holes || []).map(h => `${h.face}@${h.x.toFixed(3)},${h.y.toFixed(3)} D${h.d}`).join('; '),
      (p.slots || []).map(s => `${s.face}@${s.x.toFixed(3)},${s.y.toFixed(3)} ${s.w}x${s.h}`).join('; '),
      (p.holes || [])[0]?.note || '']);
  }
  rows.push([]);
  rows.push(['profile', 'net_lf', 'waste_lf', 'order_sticks']);
  for (const [k, pr] of Object.entries(result.bom.profiles))
    rows.push([pr.name, pr.lf.toFixed(1), pr.lfWithWaste.toFixed(1), pr.stockSticks]);
  rows.push([]);
  rows.push(['glass_sqft', result.bom.glassArea.toFixed(1)], ['screws_832', result.bom.fasteners.screw832], ['anchors', result.bom.fasteners.anchors], ['estimate_total', result.bom.total.toFixed(0)]);
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  download(new Blob([csv], { type: 'text/csv' }), 'partition-bom.csv');
}

function cutSheetHTML() {
  const cutParts = result.parts.filter(p => p.kind === 'tube' || p.kind === 'angle' || p.kind === 'plate');
  const glassParts = result.parts.filter(p => p.kind === 'glass' || p.kind === 'panel');
  return `
  <h1>Cut Sheet — ChiLab Partition System</h1>
  <p class="meta">Opening ${fmtFtIn(cfg.opening.width)} × ${fmtFtIn(cfg.opening.height)} · ${cfg.bays.count} bays × ${cfg.rows.count} rows · ${new Date().toLocaleDateString()}</p>
  <h2>Steel cut list</h2>
  <table><tr><th>ID</th><th>Part</th><th>Stock</th><th>Qty</th><th>Cut length</th><th>End prep</th><th>Features</th></tr>
  ${cutParts.map(p => `<tr>
    <td>${p.id}</td><td>${p.name}</td>
    <td>${p.profile && STOCK[p.profile] ? STOCK[p.profile].name : (PLATE[p.profile]?.name || p.dims?.map(d => inch(d)).join('×') || '')}</td>
    <td>${p.qty}</td><td>${p.length ? fmtFtIn(p.length) : p.dims.map(d => inch(d)).join(' × ')}</td>
    <td>${p.miter ? '45° miter both ends (face leg); cope return leg' : 'square'}</td>
    <td>${(p.holes || []).length ? (p.holes.length + ' holes: ' + summarizeHoles(p)) : ''}${(p.slots || []).length ? ` · ${p.slots.length} slots ${p.slots.map(s => inch(s.w) + '×' + inch(s.h)).join(', ')}` : ''}</td>
  </tr>`).join('')}</table>
  <h2>Hole schedule</h2>
  <table><tr><th>Part</th><th>#</th><th>Face</th><th>X from end</th><th>Y from edge</th><th>Ø</th><th>Op</th></tr>
  ${cutParts.flatMap(p => (p.holes || []).map((h, i) => `<tr><td>${p.id} (×${p.qty})</td><td>${i + 1}</td><td>${h.face}</td><td>${inch(h.x)}</td><td>${inch(h.y)}</td><td>${inch(h.d)}</td><td>${h.tap ? 'tap ' + h.tap : (h.note || 'drill')}</td></tr>`)).join('')}</table>
  ${result.parts.some(p => p.kind === 'pull') ? `<h2>Hardware</h2>
  <table><tr><th>ID</th><th>Item</th><th>Qty</th><th>Length</th></tr>
  ${result.parts.filter(p => p.kind === 'pull').map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.qty}</td><td>${fmtFtIn(p.length)}</td></tr>`).join('')}</table>` : ''}
  <h2>Glass / panel schedule</h2>
  <table><tr><th>ID</th><th>Type</th><th>Qty</th><th>W × H</th><th>Area ea.</th></tr>
  ${glassParts.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.qty}</td><td>${inch(p.dims[0])} × ${inch(p.dims[1])}</td><td>${(p.dims[0] * p.dims[1] / 144).toFixed(1)} sqft</td></tr>`).join('')}</table>
  <h2>Stock order</h2>
  <table><tr><th>Profile</th><th>Net lf</th><th>+10% waste</th><th>Order</th></tr>
  ${Object.values(result.bom.profiles).map(pr => `<tr><td>${pr.name}</td><td>${pr.lf.toFixed(1)}</td><td>${pr.lfWithWaste.toFixed(1)}</td><td>${pr.stockSticks} × ${RATES.stockLengthFt}' sticks</td></tr>`).join('')}
  ${Object.entries(result.bom.plateCounts).map(([k, q]) => `<tr><td>${PLATE[k].name}</td><td colspan="2">${q} pcs</td><td>flat bar</td></tr>`).join('')}
  <tr><td>Fasteners</td><td colspan="3">${result.bom.fasteners.screw832} × 8-32×⅜" SS · ${result.bom.fasteners.anchors} anchors</td></tr></table>`;
}
function summarizeHoles(p) {
  const g = {};
  for (const h of p.holes) { const k = `Ø${inch(h.d)}${h.tap ? ' tap' : ''}`; g[k] = (g[k] || 0) + 1; }
  return Object.entries(g).map(([k, v]) => `${v}×${k}`).join(', ');
}
function printDoc(title, body) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Helvetica,Arial,sans-serif;margin:40px;color:#111}
    h1{font-size:20px;letter-spacing:.04em} h2{font-size:14px;margin-top:26px;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid #111;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
    th{background:#f0ede8;text-align:left;padding:5px 7px;border:1px solid #ccc}
    td{padding:4px 7px;border:1px solid #ddd}
    .meta{color:#666;font-size:12px} .total{font-size:16px;font-weight:700}
    @media print {.noprint{display:none}}
  </style></head><body>${body}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function printCutSheet() { printDoc('Cut Sheet', cutSheetHTML()); }
function printQuotePackage() {
  const name = $$('#qName')?.value || '', email = $$('#qEmail')?.value || '', proj = $$('#qProj')?.value || '';
  const bom = result.bom;
  const body = `
  <h1>Quote Package — Steel & Glass Partition System</h1>
  <p class="meta">${name ? 'Prepared for: ' + name + (email ? ' · ' + email : '') + '<br>' : ''}${proj ? 'Project: ' + proj + '<br>' : ''}Date: ${new Date().toLocaleDateString()} · System: ChiLab cold-connection steel + glass (shop set 102219.004 basis)</p>
  <h2>Configuration summary</h2>
  <table>
    <tr><td>Clear opening</td><td>${fmtFtIn(cfg.opening.width)} W × ${fmtFtIn(cfg.opening.height)} H</td></tr>
    <tr><td>Portal</td><td>${cfg.portal.enabled ? `½" steel plate surround, ${fmtFtIn(cfg.portal.depth)} deep, ¼" reveal` : 'none'}</td></tr>
    <tr><td>Grid</td><td>${cfg.bays.count} bays × ${cfg.rows.count} rows${cfg.rows.topPanel === 'metal' ? ' (top row metal panel)' : ''}</td></tr>
    <tr><td>Bay widths</td><td>${result.layout.widths.map(w => fmtFtIn(w)).join(' · ')}</td></tr>
    <tr><td>Row heights</td><td>${result.layout.heights.map(h => fmtFtIn(h)).join(' · ')}</td></tr>
    <tr><td>Door</td><td>${cfg.door.type === 'none' ? 'none' : `${cfg.door.type} · ${fmtFtIn(cfg.door._leafW)} × ${fmtFtIn(cfg.door._leafH)} leaves · ${cfg.door.style} · ${cfg.door.hinge} hinges${cfg.door.closers ? ' · OH closers' : ''} · ${cfg.door.pull} pulls · ${cfg.door.lock}`}</td></tr>
    <tr><td>Finish / glass</td><td>${FINISHES.find(f => f.key === cfg.finish)?.name} · ¼" ${cfg.glass.type} glass</td></tr>
    <tr><td>Scope</td><td>${result.stats.totalPieces} pieces (${result.stats.uniqueParts} unique) · ${bom.glassArea.toFixed(0)} sqft glass · ${result.stats.joints} cold joints</td></tr>
  </table>
  ${result.conflicts.length ? `<h2>Flags</h2><table>${result.conflicts.map(c => `<tr><td>${c.level.toUpperCase()}</td><td>${c.msg}</td></tr>`).join('')}</table>` : ''}
  <h2>Estimate</h2>
  <table>${bom.lines.map(l => `<tr><td>${l.item}</td><td style="text-align:right">$${Math.round(l.cost).toLocaleString()}</td></tr>`).join('')}
  <tr><td class="total">TOTAL (budgetary)</td><td class="total" style="text-align:right">$${Math.round(bom.total).toLocaleString()}</td></tr></table>
  <p class="meta">Budgetary pricing for planning; formal quote follows shop drawing review. Excludes field survey, permits, GC conditions.</p>
  ${cutSheetHTML()}`;
  printDoc('Quote Package', body);
}

// ---------------- tabs & hud ----------------
document.querySelectorAll('#tabs button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('#tabs button').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); activeTab = b.dataset.tab; renderPanel();
  };
});
$$('#btnAssembled').onclick = () => setViewMode('assembled');
$$('#btnExploded').onclick = () => setViewMode('exploded');
function setViewMode(m) {
  if (isolatedPartId) exitIsolation();
  viewMode = m;
  $$('#btnAssembled').classList.toggle('active', m === 'assembled');
  $$('#btnExploded').classList.toggle('active', m === 'exploded');
  $$('#explodeWrap').style.display = m === 'exploded' ? 'flex' : 'none';
  applyExplode();
}
$$('#explodeAmt').oninput = applyExplode;
$$('#btnGlassToggle').onclick = () => {
  showGlass = !showGlass;
  $$('#btnGlassToggle').textContent = showGlass ? 'Hide glass' : 'Show glass';
  for (const o of viewer.instances) if (o.userData.kind === 'glass') o.visible = showGlass;
};
$$('#btnFront').onclick = () => frameCamera(false);
$$('#btnIso').onclick = () => frameCamera(true);
$$('#btnSwing').onclick = () => {
  doorsOpen = !doorsOpen;
  $$('#btnSwing').classList.toggle('active', doorsOpen);
  $$('#btnSwing').textContent = doorsOpen ? 'Close doors' : 'Swing doors';
};
$$('#btnTheme').onclick = () => { lightMode = !lightMode; applyTheme(); };
$$('#lightAz').oninput = updateLight;
$$('#lightEl').oninput = updateLight;
// drawing overlay controls
$$('#dw3D').onclick = hideDrawing;
$$('#dwPrev').onclick = () => stepPart(-1);
$$('#dwNext').onclick = () => stepPart(1);
$$('#dwSvg').onclick = () => { const p = result.parts.find(x => x.id === isolatedPartId); if (p) exportPartSVG(p); };

// ---------------- boot ----------------
window.__app = { viewer, get result() { return result; }, get cfg() { return cfg; } };
initViewer();
regen();
frameCamera(true);
