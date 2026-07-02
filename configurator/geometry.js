// ============================================================================
// Geometry builders — parts become THREE meshes with REAL hole/slot cutouts.
// Local conventions:
//   tube:  length along X centered, cross-section Hc along Y, Wc along Z.
//          walls: 'top' (+Y, spans Z), 'bottom' (−Y), 'front' (+Z, spans Y), 'back' (−Z)
//          feature u = 0..L from -X end, v = 0..(wall span) from wall min edge
//   plate: L along X, W along Y, t along Z, centered.
//   angle: mitered picture-frame stick, length X, leg inward +Y, return leg +Z.
// Units: inches.
// ============================================================================
import * as THREE from './vendor/three.module.js';
import { STOCK, SYS } from './engine.js';

// ---- shape helpers ----------------------------------------------------------
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0.001) { s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, h); s.closePath(); return s; }
  s.moveTo(r, 0); s.lineTo(w - r, 0); s.absarc(w - r, r, r, -Math.PI / 2, 0);
  s.lineTo(w, h - r); s.absarc(w - r, h - r, r, 0, Math.PI / 2);
  s.lineTo(r, h); s.absarc(r, h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(0, r); s.absarc(r, r, r, Math.PI, Math.PI * 1.5);
  s.closePath(); return s;
}
function circleHole(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}
function rectHole(cx, cy, w, h) {
  const p = new THREE.Path();
  p.moveTo(cx - w / 2, cy - h / 2); p.lineTo(cx - w / 2, cy + h / 2);
  p.lineTo(cx + w / 2, cy + h / 2); p.lineTo(cx + w / 2, cy - h / 2);
  p.closePath(); return p;
}

// extruded flat panel (u,v) -> thickness d, returns geometry in shape space (z = 0..d)
function panelGeom(w, h, d, holes = [], slots = [], cornerR = 0) {
  const shape = roundedRectShape(w, h, cornerR);
  for (const hl of holes) shape.holes.push(circleHole(hl.u, hl.v, hl.d / 2));
  for (const sl of slots) shape.holes.push(rectHole(sl.u, sl.v, sl.w, sl.h));
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 24 });
  return g;
}

// ---- tube from 4 wall plates --------------------------------------------------
export function tubeGeometry(L, Hc, Wc, wall, features = { holes: [], slots: [] }) {
  const group = new THREE.Group();
  const byFace = f => ({
    holes: (features.holes || []).filter(h => h.face === f).map(h => ({ u: h.x, v: h.y, d: h.d })),
    slots: (features.slots || []).filter(s => s.face === f).map(s => ({ u: s.x, v: s.y, w: s.w, h: s.h })),
  });
  const wallMesh = (geom, name) => { const m = new THREE.Mesh(geom); m.userData.wall = name; return m; };

  // top (+Y) wall: shape (u=X, v=Z), rotateX(-90) maps (u,v,w)->(u,w,-v) — v mirrors, compensate
  {
    const f = byFace('top');
    const geom = panelGeom(L, Wc, wall,
      f.holes.map(h => ({ ...h, v: Wc - h.v })),
      f.slots.map(s => ({ ...s, v: Wc - s.v })));
    geom.rotateX(-Math.PI / 2);
    geom.translate(-L / 2, Hc / 2 - wall, Wc / 2);
    group.add(wallMesh(geom, 'top'));
  }
  // bottom (−Y) wall: rotateX(+90) maps (u,v,w)->(u,-w,v) — no mirror
  {
    const f = byFace('bottom');
    const geom = panelGeom(L, Wc, wall, f.holes, f.slots);
    geom.rotateX(Math.PI / 2);
    geom.translate(-L / 2, -Hc / 2 + wall, -Wc / 2);
    group.add(wallMesh(geom, 'bottom'));
  }
  // front (+Z) wall: shape (u=X, v=Y within wall..Hc-wall), extrude +Z
  {
    const f = byFace('front');
    const geom = panelGeom(L, Hc - 2 * wall, wall,
      f.holes.map(h => ({ ...h, v: h.v - wall })),
      f.slots.map(s => ({ ...s, v: s.v - wall })));
    geom.translate(-L / 2, -(Hc - 2 * wall) / 2, Wc / 2 - wall);
    group.add(wallMesh(geom, 'front'));
  }
  // back (−Z) wall: rotateY(180) maps (u,v,w)->(-u,v,-w) — u mirrors, compensate
  {
    const f = byFace('back');
    const geom = panelGeom(L, Hc - 2 * wall, wall,
      f.holes.map(h => ({ ...h, u: L - h.u, v: h.v - wall })),
      f.slots.map(s => ({ ...s, u: L - s.u, v: s.v - wall })));
    geom.rotateY(Math.PI);
    geom.translate(L / 2, -(Hc - 2 * wall) / 2, -Wc / 2 + wall);
    group.add(wallMesh(geom, 'back'));
  }
  return group;
}

// ---- plate --------------------------------------------------------------------
export function plateGeometry(L, W, t, holes = [], slots = [], cornerR = 0) {
  const g = panelGeom(L, W, t,
    holes.map(h => ({ u: h.x, v: h.y, d: h.d })),
    slots.map(s => ({ u: s.x, v: s.y, w: s.w, h: s.h })),
    cornerR);
  g.translate(-L / 2, -W / 2, -t / 2);
  return g;
}

// ---- mitered angle (picture frame stick) ---------------------------------------
// profile in (y=inward, z=out-of-glass): pts of L angle, leg A against glass plane.
export function miteredAngleGeometry(L, leg, t) {
  // L-profile in (y=inward, z=toward glass), CCW; concave at (t,t)
  const pts = [
    [0, 0], [leg, 0], [leg, t], [t, t], [t, leg], [0, leg],
  ];
  const n = pts.length;
  const verts = [];
  const endX = (y, sideR) => sideR ? L / 2 - y : -L / 2 + y;   // 45° miter: outer edge (y=0) longest
  // side walls along length — wind so outward faces point out (profile is CCW in (y,z))
  for (let i = 0; i < n; i++) {
    const [y1, z1] = pts[i], [y2, z2] = pts[(i + 1) % n];
    const a = [endX(y1, false), y1, z1], b = [endX(y1, true), y1, z1];
    const c = [endX(y2, true), y2, z2], d = [endX(y2, false), y2, z2];
    verts.push(...a, ...d, ...c, ...a, ...c, ...b);
  }
  // end caps: proper triangulation of the (concave) L profile
  const tris = THREE.ShapeUtils.triangulateShape(pts.map(([y, z]) => new THREE.Vector2(y, z)), []);
  for (const sideR of [false, true]) {
    for (const [i0, i1, i2] of tris) {
      const tri = [pts[i0], pts[i1], pts[i2]].map(([y, z]) => [endX(y, sideR), y, z]);
      // CCW profile normal = +X; right cap keeps CCW, left cap reversed
      if (!sideR) tri.reverse();
      verts.push(...tri[0], ...tri[1], ...tri[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  g.translate(0, -leg / 2, -t / 2); // center-ish on frame edge line
  return g;
}

// ---- door leaf -----------------------------------------------------------------
export function doorLeafGroup(part, mats) {
  const { dims, extra } = part;
  const [w, h, d] = dims;
  const f = extra.frame ?? 1.75;
  const grp = new THREE.Group();
  const steel = mats.steel, glass = mats.glass;
  const bar = (bw, bh, bd) => new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), steel);
  // stiles
  const ls = bar(f, h, d); ls.position.set(-w / 2 + f / 2, 0, 0); grp.add(ls);
  const rs = bar(f, h, d); rs.position.set(w / 2 - f / 2, 0, 0); grp.add(rs);
  // top/bottom rails
  const tr = bar(w - 2 * f, f, d); tr.position.set(0, h / 2 - f / 2, 0); grp.add(tr);
  const br = bar(w - 2 * f, f * 1.6, d); br.position.set(0, -h / 2 + f * 0.8, 0); grp.add(br);
  if (extra.style === 'solid') {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * f, h - f - f * 1.6, d * 0.6), mats.wood || steel);
    p.position.set(0, (f * 1.6 - f) / 2 * -1 + (f * 1.6 - f) / 2, 0); grp.add(p);
  } else {
    // mid-rails sit exactly on the partition rail centerlines (extra.rails = y from leaf bottom)
    const innerW = w - 2 * f;
    const rails = (extra.rails || []).map(r => r - h / 2).sort((a, b) => a - b); // leaf-local centered y
    const cuts = [-h / 2 + f * 1.6];
    for (const r of rails) { cuts.push(r - f / 2, r + f / 2); }
    cuts.push(h / 2 - f);
    for (let i = 0; i < cuts.length; i += 2) {
      const liteH = cuts[i + 1] - cuts[i];
      if (liteH <= 0.5) continue;
      const gp = new THREE.Mesh(new THREE.BoxGeometry(innerW, liteH, SYS.glassT), glass);
      gp.position.set(0, (cuts[i] + cuts[i + 1]) / 2, 0); grp.add(gp);
    }
    for (const r of rails) { const mr = bar(innerW, f, d); mr.position.set(0, r, 0); grp.add(mr); }
  }
  // pull
  if (extra.pull !== 'none') {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, Math.min(72, h * 0.72), 16), mats.brass);
    const px = extra.hand === 'L' ? w / 2 - 3 : -w / 2 + 3;
    pl.position.set(px, 0, d / 2 + 1.25); grp.add(pl);
    const pl2 = pl.clone(); pl2.position.z = -d / 2 - 1.25; grp.add(pl2);
  }
  // hinges
  const hingeN = extra.hinge === 'continuous' ? 1 : Math.max(3, Math.ceil(h / 30));
  const hx = extra.hand === 'L' ? -w / 2 : w / 2;
  if (extra.hinge === 'continuous') {
    const hg = new THREE.Mesh(new THREE.BoxGeometry(0.5, h * 0.95, 0.75), mats.brass);
    hg.position.set(hx, 0, 0); grp.add(hg);
  } else {
    for (let i = 0; i < hingeN; i++) {
      const hg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.5, 0.9), mats.brass);
      hg.position.set(hx, -h / 2 + 6 + i * ((h - 12) / Math.max(1, hingeN - 1)), 0); grp.add(hg);
    }
  }
  return grp;
}

// ---- part -> mesh dispatcher ------------------------------------------------
export function buildPartMesh(part, mats) {
  let obj;
  switch (part.kind) {
    case 'tube': {
      const stock = STOCK[part.profile];
      const [Wc, Hc] = part.dims;               // dims = [depth Z, height Y]
      obj = tubeGeometry(part.length, Hc, Wc, stock.wall, { holes: part.holes, slots: part.slots });
      obj.traverse(o => { if (o.isMesh) o.material = mats.steel; });
      break;
    }
    case 'angle': {
      const g = miteredAngleGeometry(part.length, SYS.mullLeg, SYS.mullT);
      obj = new THREE.Mesh(g, mats.steel);
      break;
    }
    case 'plate': {
      const [L, W, t] = part.dims;
      const g = plateGeometry(L, W, t, part.holes || [], part.slots || [], 0.125);
      obj = new THREE.Mesh(g, part.extra === 'portal' ? mats.portal : mats.steel);
      break;
    }
    case 'glass': {
      const [w, h, t] = part.dims;
      obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mats.glass);
      break;
    }
    case 'panel': {
      const [w, h, t] = part.dims;
      obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mats.metalPanel);
      break;
    }
    case 'portal': {
      const [w, h, d] = part.dims;
      obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.portal);
      break;
    }
    case 'door':
      obj = doorLeafGroup(part, mats);
      break;
    default:
      obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.steel);
  }
  obj.userData.partId = part.id;
  return obj;
}

// orient a part instance from its pose (see engine placements)
export function poseObject(obj, pose) {
  if (pose.vertical) obj.rotation.z = Math.PI / 2;      // tube length X -> Y
  if (pose.flat) { obj.rotation.order = 'YXZ'; obj.rotation.x = -Math.PI / 2; if (pose.flip) obj.rotation.y = Math.PI; }  // flat plate; flip = foot mirrored about the vertical
  if (pose.tab) obj.rotation.y = Math.PI / 2;           // tab plane perpendicular to wall
  if (pose.mullion === 'v-left' || pose.mullion === 'v-right') obj.rotation.z = pose.mullion === 'v-left' ? -Math.PI / 2 : Math.PI / 2;
  if (pose.mullion === 'h-top') obj.rotation.z = Math.PI;
  if (pose.mullion && pose.face === -1) obj.rotation.y = Math.PI;
  obj.position.set(...pose.pos);
  return obj;
}

export function makeMaterials(finishHex = 0x3a3128) {
  return {
    steel: new THREE.MeshStandardMaterial({ color: finishHex, metalness: 0.85, roughness: 0.45 }),
    portal: new THREE.MeshStandardMaterial({ color: finishHex, metalness: 0.8, roughness: 0.55 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xe8f4f6, metalness: 0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.28, thickness: 0.25, side: THREE.DoubleSide }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.95, roughness: 0.3 }),
    metalPanel: new THREE.MeshStandardMaterial({ color: 0x2c2c2e, metalness: 0.7, roughness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, metalness: 0.05, roughness: 0.8 }),
  };
}
