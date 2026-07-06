// ============================================================================
// ChiLab Partition System — Parametric Engine
// Pure data layer: config -> { parts, placements, bom, cutlist, conflicts }
// All dimensions in INCHES. Coordinates: X = width (right+), Y = height (up+),
// Z = depth (out of wall, glass plane at z = 0).
// Derived from shop drawings 102219.004.01/.02 and measured STP solids.
// ============================================================================

// ---- Stock library (measured from STP files) -------------------------------
export const STOCK = {
  header:      { key: 'header',      name: 'Header tube 2×5',            w: 2.0,  h: 5.0,  wall: 0.125, cornerR: 0.25,   pricePerLf: 42 },
  vertical:    { key: 'vertical',    name: 'Vertical HSS 1×3 (14 ga)',   w: 1.0,  h: 3.0,  wall: 0.083, cornerR: 0.125,  pricePerLf: 24 },
  horizontal:  { key: 'horizontal',  name: 'Horizontal tube 1×2.5 (14 ga)', w: 1.0, h: 2.5, wall: 0.083, cornerR: 0.0,   pricePerLf: 21 },
  mullion:     { key: 'mullion',     name: 'Mullion angle ¾×¾×⅛',        leg: 0.75, t: 0.125,                            pricePerLf: 9  },
};

export const PLATE = {
  shearA:      { key: 'shearA',   name: 'Shear block A 5×2×¼',            L: 5.0,  W: 2.0, t: 0.25,   cornerR: 0.125, priceEach: 6.5 },
  shearAPass:  { key: 'shearAPass', name: 'Passthrough shear block 5×2×¼', L: 5.0, W: 2.0, t: 0.25,   cornerR: 0.125, priceEach: 8.0 },
  shearB:      { key: 'shearB',   name: 'Shear block B (terminal) 2×2×¼', L: 2.0,  W: 2.0, t: 0.25,   cornerR: 0.125, priceEach: 4.0 },
  tClip:       { key: 'tClip',    name: 'T clip base 6.5×2×3/16',         L: 6.5,  W: 2.0, t: 0.1875, cornerR: 0.125, priceEach: 11.0 },
  fClip:       { key: 'fClip',    name: 'F clip base 3.67×2×3/16',        L: 3.67, W: 2.0, t: 0.1875, cornerR: 0.125, priceEach: 9.0 },
  clipTab:     { key: 'clipTab',  name: 'F&T clip tab 3/16×1¼ bar',       L: 3.25, W: 1.25, t: 0.1875, cornerR: 0.0,  priceEach: 3.0 },
};

export const RATES = {
  glassPerSqFt: { clear: 28, lowIron: 38, fluted: 46, smoked: 44 },     // ¼" plate
  portalPlatePerSqFt: 95,           // ½" plate incl. forming
  fastenerEach: 0.35,               // 8-32 × ⅜ SS
  anchorEach: 1.8,
  hingeEach: { butt: 38, continuous: 120, pivot: 260 },
  pullEach: { none: 0, brass36: 240, brass72: 420 },
  closerEach: 310,
  laborPerJoint: 14,                // drill/tap/fit cold connection
  laborPerLfMullion: 3.5,           // miter, fit, fasten
  finishMultiplier: { 'raw': 1.0, 'matte-black': 1.12, 'oil-rubbed-bronze': 1.22, 'brass-patina': 1.35 },
  doorLeafBase: { glassGrid: 550, solid: 700 },   // welded frame fab per leaf (glazing counted separately)
  wasteFactor: 1.10,
  stockLengthFt: 24,                // mill length for tube/angle stock
};

// ---- System constants (from measured parts) --------------------------------
export const SYS = {
  headerH: 2.0, headerD: 5.0,   // 2" tall in elevation, 5" deep in plan (measured)
  vertW: 1.0, vertD: 3.0,
  horizH: 1.0, horizD: 2.5,          // 1" sightline tall, 2.5" deep
  sillH: 1.0,                        // base sill channel at floor (same 1×2.5 profile)
  mullLeg: 0.75, mullT: 0.125,
  glassT: 0.25,
  glassEdgeClear: 0.125,             // glass held back from steel each side
  clipPlateT: 0.1875,
  tapDrill: 0.137,                   // 8-32
  clearanceHole: 0.3125,             // 5/16 at shear connections (measured)
  accessHole: 0.625,                 // ⅝ driver access (measured)
  anchorHole: 0.3125,
  screwsPerTongue: 2,
  stdDoorHeight: 84,                 // default leaf height = 7'-0" (common commercial standard)
  minBay: 12, maxBay: 48,            // sane glass module limits
  minRow: 10, maxRow: 48,
  maxGlassArea: 24 * 144,            // sq in, ¼" plate comfort limit
  headerStockMax: 24 * 12,
};

export const DEFAULT_CONFIG = {
  opening: { width: 142.0, height: 102.0 },        // clear opening
  portal: { enabled: true, depth: 13.25, reveal: 0.25, plateT: 0.5 },
  bays: { count: 3, widths: null, doorSide: 'left' }, // widths null => equal; door auto-centers, doorSide breaks odd ties
  rows: { count: 3, topPanel: 'glass', headLite: true }, // field-row count; head lite auto-sizes from the door
  door: {
    type: 'pair',                                   // 'none' | 'single' | 'pair'
    style: 'glass-grid',                            // 'glass-grid' | 'solid'
    hinge: 'butt',                                  // 'butt' | 'continuous' | 'pivot'
    pull: 'brass72', closers: true, lock: 'maglock',
    hingeGap: 0.375, meetingGap: 0.25, headGap: 0.125, floorClearance: 0.75,
  },
  glass: { type: 'clear' },
  finish: 'oil-rubbed-bronze',
  estimate: { region: 'chicago', install: true },
};

// ---- small helpers ----------------------------------------------------------
const r64 = v => Math.round(v * 64) / 64;
const ftIn = v => { const ft = Math.floor(v / 12), i = r64(v - ft * 12); return ft ? `${ft}'-${i}"` : `${i}"`; };
const sqft = (w, h) => (w * h) / 144;

function frac(v) {
  const whole = Math.floor(v + 1e-9); let rem = v - whole;
  let best = '', err = 1;
  for (const d of [2, 4, 8, 16, 32, 64]) {
    const n = Math.round(rem * d); const e = Math.abs(rem - n / d);
    if (e < err - 1e-12) { err = e; best = n === 0 ? '' : `${n}/${d}`; if (n === d) { return `${whole + 1}`; } }
  }
  return best ? (whole ? `${whole} ${best}` : best) : `${whole}`;
}
export const inch = v => `${frac(r64(v))}"`;

// ---- Part factory: unique-part dedupe by signature --------------------------
class PartSet {
  constructor() { this.map = new Map(); this.placements = []; }
  add(part, matrixOrPose) {
    const sig = JSON.stringify({
      k: part.kind, p: part.profile || null, L: r64(part.length || 0),
      d: part.dims ? part.dims.map(r64) : null,
      h: (part.holes || []).map(h => [h.face, r64(h.x), r64(h.y), r64(h.d)]).sort(),
      s: (part.slots || []).map(s => [s.face, r64(s.x), r64(s.y), r64(s.w), r64(s.h)]).sort(),
      m: part.miter || null, extra: part.extra || null,
    });
    let entry = this.map.get(sig);
    if (!entry) {
      entry = { ...part, sig, qty: 0, id: `P${this.map.size + 1}`, poses: [] };
      this.map.set(sig, entry);
    }
    entry.qty += 1;
    entry.poses.push(matrixOrPose);
    return entry;
  }
  list() { return [...this.map.values()]; }
}

// ---- Main generator ---------------------------------------------------------
export function generate(cfgIn) {
  const cfg = deepMerge(structuredClone(DEFAULT_CONFIG), cfgIn || {});
  const conflicts = [];
  const notes = [];
  const W = cfg.opening.width, H = cfg.opening.height;
  const S = SYS;

  // ---- bay layout ----
  const n = Math.max(1, cfg.bays.count | 0);
  let widths = cfg.bays.widths && cfg.bays.widths.length === n ? [...cfg.bays.widths] : null;
  // Door auto-centers among the sidelites. When the sidelite count is odd it can't
  // split evenly — `doorSide` picks which side gets the extra bay (more glass there).
  const sidelites = n - 1;
  const sideliteSplitEven = sidelites % 2 === 0;
  const leftSidelites = cfg.bays.doorSide === 'right' ? Math.floor(sidelites / 2) : Math.ceil(sidelites / 2);
  const doorBay = cfg.door.type === 'none' ? -1 : leftSidelites; // door sits after the left sidelites

  // door bay width driven by leaves + gaps if doors on
  let doorBayW = 0;
  if (doorBay >= 0) {
    const leaves = cfg.door.type === 'pair' ? 2 : 1;
    const leafW = cfg.door.leafWidth || 36;
    doorBayW = leaves * leafW + 2 * cfg.door.hingeGap + (leaves === 2 ? cfg.door.meetingGap : 0) + S.vertW; // + jamb sightlines share
    doorBayW = leaves * leafW + 2 * cfg.door.hingeGap + (leaves === 2 ? cfg.door.meetingGap : 0);
  }
  if (!widths) {
    const glassBays = n - (doorBay >= 0 ? 1 : 0);
    // centerline-based module: total member sightline = (n+1) verticals × 1"
    const netGlass = W - (n + 1) * S.vertW - (doorBay >= 0 ? doorBayW : 0);
    const each = Math.floor((netGlass / Math.max(1, glassBays)) * 16) / 16;  // 1/16" shop increments
    widths = Array.from({ length: n }, (_, i) => (i === doorBay ? doorBayW : each));
    // remainder from rounding goes to the last glass bay
    let rem = netGlass - each * glassBays;
    for (let i = n - 1; i >= 0 && rem > 1e-9; i--) if (i !== doorBay) { widths[i] += rem; rem = 0; }
  }
  const sumW = widths.reduce((a, b) => a + b, 0) + (n + 1) * S.vertW;
  if (Math.abs(sumW - W) > 1 / 32) {
    let last = n - 1; if (last === doorBay) last = n - 2;
    if (last < 0 || last === doorBay) {
      conflicts.push({ level: 'error', msg: `Door bay (${inch(widths[doorBay])}) does not fill the ${inch(W)} opening and there is no glass bay to absorb the remaining ${inch(W - sumW)} — add a sidelite bay, widen the leaves, or reduce the opening.` });
      widths[doorBay] += (W - sumW); // keep geometry closed for preview
    } else {
      conflicts.push({ level: 'warn', msg: `Bay widths + verticals total ${inch(sumW)} vs opening ${inch(W)} — remainder ${inch(W - sumW)} pushed to last glass bay.` });
      widths[last] += (W - sumW);
    }
  }
  widths.forEach((bw, i) => {
    if (i === doorBay) return;
    if (bw < S.minBay) conflicts.push({ level: 'error', msg: `Bay ${i + 1} clear width ${inch(bw)} < minimum ${S.minBay}" — reduce bay count.` });
    if (bw > S.maxBay) conflicts.push({ level: 'warn', msg: `Bay ${i + 1} clear width ${inch(bw)} > ${S.maxBay}" — ¼" glass may deflect; consider adding a vertical.` });
  });

  // vertical x centerlines
  const vx = [S.vertW / 2];
  for (let i = 0; i < n; i++) vx.push(vx[i] + S.vertW / 2 + widths[i] + S.vertW / 2);

  // ---- door spec (FIXED height — independent of the opening height) ----
  // The door leaf height is a room standard the user specifies (6'-8", 7'-0", 8'-0",
  // …). It is NOT derived from the opening. A rail line is placed exactly at the door
  // head, so changing the opening height only grows/shrinks the head-lite band above.
  const hasDoor = doorBay >= 0;
  const leaves = cfg.door.type === 'pair' ? 2 : 1;
  const leafW = cfg.door.leafWidth || 36;
  const leafH = hasDoor ? (cfg.door.height || S.stdDoorHeight) : 0;
  const doorHeadBottom = hasDoor ? (cfg.door.floorClearance + leafH + cfg.door.headGap) : 0; // bottom edge of head rail

  // ---- head condition ----
  // The 2×5 header exists ONLY to house internal closers for a pivot door specified to
  // run to the top with no head lites. Otherwise the grid continues to a 1×2.5 top channel.
  let headerMode = false;
  if (hasDoor && cfg.door.hinge === 'pivot' && cfg.door.closers && cfg.rows.headLite === false) {
    headerMode = doorHeadBottom >= (H - S.headerH) - 3;
  }
  const topH = headerMode ? S.headerH : S.sillH;      // 2" header or 1" top channel
  const gridTop = H - topH;
  if (headerMode) notes.push('Head condition: 2×5 header (pivot door with internal closers, leaf runs to the top — no head lites).');
  else if (hasDoor && cfg.door.hinge === 'pivot' && cfg.door.closers)
    notes.push('Head lites present above the door — 2×5 closer header omitted; verify pivot closer housing in the door head rail.');
  // verticals bear on the 3/16" clip plate; in head-lite mode they run FULL height
  // (through the top-channel band, which butts them bay-by-bay) up to the top clip plate.
  const vertTop = headerMode ? gridTop : H - S.clipPlateT;
  const vertLen = vertTop - S.clipPlateT;
  const vertY0 = S.clipPlateT;

  // ---- row layout (rail centerlines) ----
  const gridH = gridTop - S.sillH;    // glass zone: top of base sill -> top channel / header underside
  const fieldRows = Math.max(1, cfg.rows.count | 0);
  let heights;
  let headRailIdx = -1;               // index into railY that lands at the door head (-1 = door head is the grid top)
  let headYOverride = null;           // door head snapped to grid top when there's no room for a head lite

  const fillRows = (zone, count) => {  // `count` equal glass rows spanning `zone` (rows + intervening rails)
    const net = zone - (count - 1) * S.horizH;
    const each = Math.floor((net / count) * 16) / 16;
    const arr = Array.from({ length: count }, () => each);
    arr[count - 1] += net - each * count;             // rounding remainder to the last row
    return arr;
  };

  if (hasDoor) {
    // DOOR DRIVES THE GRID: a rail lands at the door head; field rows below, head lite above.
    if (doorHeadBottom + S.horizH > gridTop + 1e-6)
      conflicts.push({ level: 'error', msg: `Door height ${inch(leafH)} + clearances leaves no room below the ${headerMode ? 'header' : 'top channel'} — increase the opening height or reduce the door height.` });
    const aboveZone = gridTop - (doorHeadBottom + S.horizH);   // door-head-rail top -> grid top
    heights = fillRows(doorHeadBottom - S.sillH, fieldRows);    // field rows below the door head
    const fieldRowH = heights[0];                              // module height — keep the grid congruent
    if (aboveZone >= 6) {
      headRailIdx = fieldRows - 1;                             // rail after the last field row = door head
      // CONGRUENCE: add horizontals so no head-lite panel is taller than a field panel.
      const headRows = Math.max(1, Math.ceil(aboveZone / fieldRowH));
      heights.push(...fillRows(aboveZone, headRows));
    } else {
      // door head within 6" of the top — no head lite; the top channel/header is the head,
      // and the field rows fill the whole grid.
      heights = fillRows(gridTop - S.sillH, fieldRows);
      headRailIdx = -1;
      headYOverride = gridTop;
      if (aboveZone > 0.5 && cfg.rows.headLite !== false && !headerMode)
        notes.push(`Door head is within ${inch(aboveZone + S.horizH)} of the top — the leaf meets the top channel with no head lite. Lower the door height for a head-lite band.`);
    }
  } else {
    // NO DOOR: even field rows across the whole grid
    heights = fillRows(gridH, fieldRows);
  }
  const m = heights.length;
  // rows up to `bodyRows` are field (main-body) glass held to the strict minimum;
  // rows above are the head-lite/transom band, where a shorter vision band is fine.
  const bodyRows = hasDoor && headRailIdx >= 0 ? headRailIdx + 1 : m;
  heights.forEach((rh, i) => {
    if (i < bodyRows) {
      if (rh < S.minRow) conflicts.push({ level: 'error', msg: `Field row ${i + 1} height ${inch(rh)} < ${S.minRow}" minimum — reduce field-row count or raise the door head.` });
    } else if (rh < 4) {
      conflicts.push({ level: 'warn', msg: `Head lite ${inch(rh)} is very short — a taller opening or shorter door gives a more standard transom.` });
    }
    if (rh > S.maxRow) conflicts.push({ level: 'warn', msg: `Row ${i + 1} height ${inch(rh)} exceeds ${S.maxRow}" — check glass deflection.` });
  });
  // rail centerlines y
  const railY = [];
  { let y = S.sillH; for (let i = 0; i < m - 1; i++) { y += heights[i] + S.horizH / 2; railY.push(y); y += S.horizH / 2; } }

  // ---- door checks ----
  if (hasDoor) {
    if (leafW < 24) conflicts.push({ level: 'error', msg: `Door leaf ${inch(leafW)} < 24" — not code-compliant for egress.` });
    if (leafW > 48) conflicts.push({ level: 'warn', msg: `Door leaf ${inch(leafW)} > 48" — heavy leaf; use pivot hinge + reinforced jamb.` });
    if (cfg.door.hinge === 'butt' && leafH * leafW / 144 > 24)
      conflicts.push({ level: 'warn', msg: `Leaf area ${(leafW * leafH / 144).toFixed(1)} sqft on butt hinges — recommend continuous hinge or pivot.` });
    cfg.door._leafH = leafH; cfg.door._leaves = leaves; cfg.door._leafW = leafW;
    cfg.door._headY = headYOverride != null ? headYOverride : doorHeadBottom;  // bottom of the head rail
    cfg.door._headRailIdx = headRailIdx;
  }

  if (W > S.headerStockMax) conflicts.push({ level: 'warn', msg: `Header span ${ftIn(W)} exceeds ${RATES.stockLengthFt}' stock — a field splice (Type A + Type B jamb-fix pattern) is generated.` });

  // ============================================================
  // Build parts
  // ============================================================
  const P = new PartSet();
  const fasteners = { screw832: 0, anchors: 0 };

  // ---- head member: 2×5 header (headerMode) or per-bay 1×2.5 top channels ----
  const headerSegs = [];
  if (headerMode) {
    if (W <= S.headerStockMax) headerSegs.push({ x0: 0, L: W });
    else {
      const half = W / 2; headerSegs.push({ x0: 0, L: half }, { x0: half, L: half });
    }
  } else {
    for (let b = 0; b < n; b++) {
      const span = widths[b];
      const x0 = vx[b] + S.vertW / 2;
      const holes = [];
      const au = span < 12 ? [span / 2] : [4, span - 4];
      au.forEach(u => {
        holes.push({ face: 'top', x: u, y: S.horizD / 2, d: S.anchorHole, note: 'structure anchor' });
        holes.push({ face: 'bottom', x: u, y: S.horizD / 2, d: S.accessHole, note: 'access' });
        fasteners.anchors += 1;
      });
      P.add({
        kind: 'tube', profile: 'horizontal', name: 'Top channel',
        length: span, dims: [S.horizD, S.horizH], holes,
      }, { pos: [x0 + span / 2, H - S.sillH / 2, 0], rot: [0, 0, 0], horizontal: true });
    }
  }
  // Header orientation (measured): 2" tall in elevation, 5" deep in plan.
  // - Slab anchors: Ø5/16 through TOP wall at bay centers, Ø⅝ access through BOTTOM wall.
  // - Clip mounting: Ø3/16 pilot PAIRS @ 5" o.c. (T-clip) / 1" o.c. (F-clip) on BOTTOM wall
  //   at each vertical station — clips hang tabs-down into the vertical top cavity.
  headerSegs.forEach(seg => {
    const holes = [];
    vx.forEach(x => {
      if (x >= seg.x0 - 1e-6 && x <= seg.x0 + seg.L + 1e-6) {
        const lx = Math.min(Math.max(x - seg.x0, 1.0), seg.L - 1.0);
        const isEnd = (x === vx[0] || x === vx[vx.length - 1]);
        const dir = x === vx[0] ? 1 : -1;
        const pilotXs = isEnd ? [lx + dir * 0.935, lx + dir * 1.935] : [lx - 2.5, lx + 2.5]; // F foot / T symmetric
        pilotXs.forEach(px => holes.push({ face: 'bottom', x: px, y: S.headerD / 2, d: 0.1875, note: 'clip pilot' }));
        fasteners.screw832 += 2;
      }
    });
    // slab anchors at bay centers
    for (let b = 0; b < n; b++) {
      const cx = (vx[b] + vx[b + 1]) / 2;
      if (cx >= seg.x0 && cx <= seg.x0 + seg.L) {
        holes.push({ face: 'top', x: cx - seg.x0, y: S.headerD / 2, d: S.clearanceHole, note: 'slab anchor' });
        holes.push({ face: 'bottom', x: cx - seg.x0, y: S.headerD / 2, d: S.accessHole, note: 'access' });
        fasteners.anchors += 1;
      }
    }
    P.add({
      kind: 'tube', profile: 'header', name: `Header${headerSegs.length > 1 ? ' (spliced)' : ''}`,
      length: seg.L, dims: [S.headerD, S.headerH], holes,
    }, { pos: [seg.x0 + seg.L / 2, H - S.headerH / 2, 0], rot: [0, 0, 0] });
  });

  // ---- verticals ----
  // Vertical local frame: length along X (building Y after pose), Hc=1" (building X
  // sightline), Wc=3" (building Z). 'top'/'bottom' faces are the 3"-wide walls.
  vx.forEach((x, vi) => {
    const isEnd = vi === 0 || vi === vx.length - 1;
    const holes = [];
    const slots = [];
    // shear-block slots through BOTH 3" walls at each rail station (CHL08);
    // door-jamb verticals also carry the door head-rail station
    const isJamb = doorBay >= 0 && (vi === doorBay || vi === doorBay + 1);
    const stations = [...railY];
    if (isJamb && cfg.door._headY) stations.push(cfg.door._headY + S.horizH / 2);
    stations.forEach(ry => {
      const ly = ry - vertY0;
      for (const f of ['top', 'bottom']) {
        slots.push({ face: f, x: ly, y: S.vertD / 2, w: 0.3125, h: 2.0625, note: 'shear block slot' });
      }
    });
    // clip-tab set screws: Ø¼ pairs 1.6" from each end, both walls (measured)
    for (const u of [1.6, vertLen - 1.6]) {
      for (const f of ['top', 'bottom']) {
        holes.push({ face: f, x: u, y: 0.5, d: 0.25, note: 'clip set screw' });
        holes.push({ face: f, x: u, y: 2.5, d: 0.25, note: 'clip set screw' });
      }
    }
    fasteners.screw832 += 4;
    P.add({
      kind: 'tube', profile: 'vertical', name: isJamb ? 'Vertical support (door jamb)' : isEnd ? 'Vertical support (end)' : 'Vertical support (mid)',
      length: vertLen, dims: [S.vertD, S.vertW], holes, slots, extra: isJamb ? 'jamb' : isEnd ? 'end' : 'mid',
    }, { pos: [x, vertY0 + vertLen / 2, 0], rot: [0, 0, 0], vertical: true });
    // ---- clips ----
    // F clips (one-sided foot): all four outer corners, and the BOTTOM of door jambs
    // with the foot turned away from the door swing. T clips (symmetric): everywhere else.
    const addClip = (cy, useF, dir, note) => {
      const clip = useF ? PLATE.fClip : PLATE.tClip;
      // F baseline: tabs 0.6" from the near (vertical-side) end, anchors on the foot 1" o.c.
      const holeXs = useF ? [clip.L / 2 + 0.335, clip.L / 2 + 1.335] : [clip.L / 2 - 2.5, clip.L / 2 + 2.5];
      P.add({
        kind: 'plate', profile: clip.key, name: clip.name,
        length: clip.L, dims: [clip.L, clip.W, clip.t],
        holes: holeXs.map(hx => ({ face: 'top', x: hx, y: clip.W / 2, d: S.anchorHole, note })),
      }, { pos: [x + (useF ? dir * (clip.L / 2 - 0.6) : 0), cy, 0], flat: true, flip: useF && dir < 0 });
      for (let t = 0; t < 2; t++) {
        P.add({
          kind: 'plate', profile: 'clipTab', name: PLATE.clipTab.name,
          length: PLATE.clipTab.L, dims: [PLATE.clipTab.W, PLATE.clipTab.L, PLATE.clipTab.t], holes: [],
        }, { pos: [x + (t ? 0.321 : -0.321), cy > H / 2 ? cy - S.clipPlateT / 2 - PLATE.clipTab.L / 2 : cy + S.clipPlateT / 2 + PLATE.clipTab.L / 2, 0], tab: true });
      }
    };
    const dirEnd = vi === 0 ? 1 : -1;                       // end feet turn into the elevation
    const bottomF = isEnd || isJamb;
    const bottomDir = isEnd ? dirEnd : (vi === doorBay ? -1 : 1);  // jamb feet turn away from the door
    addClip(S.clipPlateT / 2, bottomF, bottomDir, 'floor anchor');
    fasteners.anchors += 2;
    const topClipY = headerMode ? gridTop - S.clipPlateT / 2 : H - S.clipPlateT / 2;
    addClip(topClipY, isEnd, dirEnd, headerMode ? 'header screw' : 'structure anchor');
    if (headerMode) fasteners.screw832 += 2; else fasteners.anchors += 2;
  });

  // ---- base sill channels: floor line of the grid, anchored to slab ----
  for (let b = 0; b < n; b++) {
    if (b === doorBay) continue;
    const span = widths[b];
    const x0 = vx[b] + S.vertW / 2;
    const holes = [];
    const au = span < 12 ? [span / 2] : [4, span - 4];
    au.forEach(u => {
      holes.push({ face: 'bottom', x: u, y: S.horizD / 2, d: S.anchorHole, note: 'slab anchor' });
      holes.push({ face: 'top', x: u, y: S.horizD / 2, d: S.accessHole, note: 'access' });
      fasteners.anchors += 1;
    });
    P.add({
      kind: 'tube', profile: 'horizontal', name: 'Base sill channel',
      length: span, dims: [S.horizD, S.horizH], holes,
    }, { pos: [x0 + span / 2, S.sillH / 2, 0], rot: [0, 0, 0], horizontal: true });
  }

  // ---- horizontals + shear blocks (skip door bay below door head) ----
  let jointCount = 0;
  railY.forEach(ry => {
    for (let b = 0; b < n; b++) {
      const inDoorBay = b === doorBay;
      if (inDoorBay && ry < (cfg.door?._headY ?? 0)) continue; // no rails through the door swing
      const span = widths[b];
      const x0 = vx[b] + S.vertW / 2;
      const holes = [];
      // screws DOWN through top wall into shear-block taps; ⅝ access in bottom wall (CHL08)
      [0.5, 1.5, span - 1.5, span - 0.5].forEach(hx => {
        holes.push({ face: 'top', x: hx, y: S.horizD / 2, d: 0.177, note: '8-32 clearance' });
        holes.push({ face: 'bottom', x: hx, y: S.horizD / 2, d: S.accessHole, note: 'access' });
      });
      P.add({
        kind: 'tube', profile: 'horizontal', name: 'Horizontal support',
        length: span, dims: [S.horizD, S.horizH], holes,
      }, { pos: [x0 + span / 2, ry, 0], rot: [0, 0, 0], horizontal: true });
      fasteners.screw832 += 4;
      jointCount += 2;
    }
    // shear blocks at each vertical along this rail
    vx.forEach((x, vi) => {
      const leftBay = vi - 1, rightBay = vi;
      const leftOpen = leftBay >= 0 && !(leftBay === doorBay && ry < (cfg.door?._headY ?? 0));
      const rightOpen = rightBay < n && !(rightBay === doorBay && ry < (cfg.door?._headY ?? 0));
      if (!leftOpen && !rightOpen) return;
      if (leftOpen && rightOpen) {
        const p = PLATE.shearA;
        P.add({
          kind: 'plate', profile: p.key, name: p.name, length: p.L, dims: [p.L, p.W, p.t],
          holes: [0.5, 1.5, 3.5, 4.5].map(hx => ({ face: 'top', x: hx, y: 0.5, d: S.tapDrill, tap: '8-32', note: '8-32 tap' })),
        }, { pos: [x, ry, 0], flat: true });
      } else {
        const p = PLATE.shearB;
        P.add({
          kind: 'plate', profile: p.key, name: p.name, length: p.L, dims: [p.L, p.W, p.t],
          holes: [0.5, 1.5].map(hx => ({ face: 'top', x: hx, y: 0.5, d: S.tapDrill, tap: '8-32', note: '8-32 tap' })),
        }, { pos: [x + (leftOpen ? -0.5 : 0.5), ry, 0], flat: true });
      }
    });
  });

  // ---- glass + mullion frames per pane ----
  let glassArea = 0; const panes = [];
  // door bay: skip rows at/below the door head (the leaf occupies them); the head-lite
  // rows above the door head are glazed like any sidelite so the grid reads continuous.
  const doorSkipUpTo = cfg.door._headRailIdx < 0 ? m : cfg.door._headRailIdx;
  for (let b = 0; b < n; b++) {
    const isDoorBay = b === doorBay;
    const span = widths[b], x0 = vx[b] + S.vertW / 2;
    let y = S.sillH;
    for (let r = 0; r < m; r++) {
      const rh = heights[r];
      if (isDoorBay && r <= doorSkipUpTo) { y += rh + (r < m - 1 ? S.horizH : 0); continue; }
      const isMetal = cfg.rows.topPanel === 'metal' && r === m - 1;
      const gw = span - 2 * S.glassEdgeClear;
      const gh = rh - 2 * S.glassEdgeClear;
      if (gw * gh > S.maxGlassArea)
        conflicts.push({ level: 'warn', msg: `Pane ${b + 1}/${r + 1} is ${sqft(gw, gh).toFixed(1)} sqft — exceeds comfortable ¼" plate size; consider tempered/laminated.` });
      const py = y + rh / 2;
      if (isMetal) {
        P.add({ kind: 'panel', profile: 'metal', name: 'Metal infill panel', length: gw, dims: [gw, gh, 0.125], holes: [] },
          { pos: [x0 + span / 2, py, 0], rot: [0, 0, 0] });
      } else {
        glassArea += sqft(gw, gh);
        panes.push({ bay: b + 1, row: r + 1, w: gw, h: gh });
        P.add({ kind: 'glass', profile: 'glass', name: `Glass pane ¼" (${cfg.glass.type})`, length: gw, dims: [gw, gh, S.glassT], holes: [] },
          { pos: [x0 + span / 2, py, 0], rot: [0, 0, 0] });
      }
      // mullion picture frame, both faces: H sticks = span long-point, V sticks = rh long-point
      for (const face of [1, -1]) {
        const zc = face * (S.glassT / 2 + S.mullLeg / 2 - S.mullT / 2); // angle leg against glass
        P.add({ kind: 'angle', profile: 'mullion', name: 'Mullion angle — horizontal (mitered)', length: span, miter: 45, holes: [] },
          { pos: [x0 + span / 2, y + S.mullLeg / 2, zc * 0 + face * (S.glassT / 2 + S.mullT / 2)], rot: [0, 0, 0], mullion: 'h-bottom', face });
        P.add({ kind: 'angle', profile: 'mullion', name: 'Mullion angle — horizontal (mitered)', length: span, miter: 45, holes: [] },
          { pos: [x0 + span / 2, y + rh - S.mullLeg / 2, face * (S.glassT / 2 + S.mullT / 2)], rot: [0, 0, 180], mullion: 'h-top', face });
        P.add({ kind: 'angle', profile: 'mullion', name: 'Mullion angle — vertical (mitered)', length: rh, miter: 45, holes: [] },
          { pos: [x0 + S.mullLeg / 2, y + rh / 2, face * (S.glassT / 2 + S.mullT / 2)], rot: [0, 0, 90], mullion: 'v-left', face });
        P.add({ kind: 'angle', profile: 'mullion', name: 'Mullion angle — vertical (mitered)', length: rh, miter: 45, holes: [] },
          { pos: [x0 + span - S.mullLeg / 2, y + rh / 2, face * (S.glassT / 2 + S.mullT / 2)], rot: [0, 0, -90], mullion: 'v-right', face });
      }
      y += rh + (r < m - 1 ? S.horizH : 0);
    }
  }

  // ---- door assembly ----
  const doorParts = [];
  if (doorBay >= 0) {
    const d = cfg.door;
    const x0 = vx[doorBay] + S.vertW / 2;
    const span = widths[doorBay];
    const leafFrame = 1.75; // door leaf stile/rail sightline (from CHL10 proportions)
    // COHESION RULE: door mid-rails land exactly on the partition rail centerlines,
    // so mullion lines carry across leaves and sidelites. (leaf-local y from leaf bottom)
    const railsLocal = d.style === 'glass-grid'
      ? railY.filter(ry => ry > d.floorClearance + leafFrame * 1.6 + 2 && ry < d._headY - leafFrame - 2)
             .map(ry => Math.round((ry - d.floorClearance) * 64) / 64)
      : [];
    if (d.style === 'glass-grid' && railsLocal.length === 0 && railY.length)
      notes.push('No partition rail line falls within the door leaf — leaves generate as full-height lites.');
    for (let leaf = 0; leaf < d._leaves; leaf++) {
      const hand = leaf === 0 ? 'L' : 'R';
      const lx = leaf === 0 ? x0 + d.hingeGap : x0 + span - d.hingeGap - d._leafW;
      const cx = lx + d._leafW / 2, cy = d.floorClearance + d._leafH / 2;
      const pivot = [hand === 'L' ? lx : lx + d._leafW, cy, 0];
      const openSign = hand === 'L' ? -1 : 1;
      const dp = p => ({ ...p, doorPivot: pivot, openSign });   // parts that swing with this leaf
      // welded frame: stiles + rails only — glazing and hardware are separate components
      P.add({
        kind: 'door', profile: 'door', name: `Door leaf frame ${inch(d._leafW)} × ${inch(d._leafH)} — welded (${d.style}${railsLocal.length ? ', rails on grid' : ''}, ${hand})`,
        length: d._leafH, dims: [d._leafW, d._leafH, 1.75], holes: [],
        extra: { style: d.style, rails: railsLocal, hinge: d.hinge, hand, frame: leafFrame },
      }, dp({ pos: [cx, cy, 0], door: true, hand }));
      // glazing per lite: glass pane + mitered angle frames both faces (same S4 stock)
      if (d.style === 'glass-grid') {
        const f = leafFrame;
        const innerW = d._leafW - 2 * f;
        const railsC = railsLocal.map(r => r - d._leafH / 2).sort((a, b) => a - b);
        const cuts = [-d._leafH / 2 + f * 1.6];
        for (const rr of railsC) cuts.push(rr - f / 2, rr + f / 2);
        cuts.push(d._leafH / 2 - f);
        for (let i = 0; i < cuts.length; i += 2) {
          const liteH = cuts[i + 1] - cuts[i];
          if (liteH <= 0.5) continue;
          const zoneB = cy + cuts[i], zoneT = cy + cuts[i + 1], zoneC = (zoneB + zoneT) / 2;
          const gw = innerW - 2 * S.glassEdgeClear, gh = liteH - 2 * S.glassEdgeClear;
          glassArea += sqft(gw, gh);
          panes.push({ bay: doorBay + 1, row: `door lite`, w: gw, h: gh });
          P.add({ kind: 'glass', profile: 'glass', name: `Door lite ¼" (${cfg.glass.type})`, length: gw, dims: [gw, gh, S.glassT], holes: [] },
            dp({ pos: [cx, zoneC, 0] }));
          for (const face of [1, -1]) {
            const zc = face * (S.glassT / 2 + S.mullT / 2);
            P.add({ kind: 'angle', profile: 'mullion', name: 'Door glazing angle — horizontal (mitered)', length: innerW, miter: 45, holes: [] },
              dp({ pos: [cx, zoneB + S.mullLeg / 2, zc], mullion: 'h-bottom', face }));
            P.add({ kind: 'angle', profile: 'mullion', name: 'Door glazing angle — horizontal (mitered)', length: innerW, miter: 45, holes: [] },
              dp({ pos: [cx, zoneT - S.mullLeg / 2, zc], mullion: 'h-top', face }));
            P.add({ kind: 'angle', profile: 'mullion', name: 'Door glazing angle — vertical (mitered)', length: liteH, miter: 45, holes: [] },
              dp({ pos: [cx - innerW / 2 + S.mullLeg / 2, zoneC, zc], mullion: 'v-left', face }));
            P.add({ kind: 'angle', profile: 'mullion', name: 'Door glazing angle — vertical (mitered)', length: liteH, miter: 45, holes: [] },
              dp({ pos: [cx + innerW / 2 - S.mullLeg / 2, zoneC, zc], mullion: 'v-right', face }));
          }
        }
      }
      // pulls: separate brass components, mounted back-to-back
      if (d.pull && d.pull !== 'none') {
        const nominal = d.pull === 'brass72' ? 72 : 36;
        const pullL = Math.min(nominal, d._leafH - 8);
        const px = cx + (hand === 'L' ? d._leafW / 2 - 3 : -d._leafW / 2 + 3);
        for (const zs of [1, -1]) {
          P.add({ kind: 'pull', profile: 'pull', name: `Brass pull ${nominal}" × Ø1"`, length: pullL, dims: [1.0, pullL, 1.0], holes: [] },
            dp({ pos: [px, cy, zs * (1.75 / 2 + 1.25)] }));
        }
      }
      doorParts.push({ leaf, hinges: d.hinge === 'continuous' ? 1 : Math.max(3, Math.ceil(d._leafH / 30)) });
    }
    // The door head rail and the head-lite glass above it are generated by the main
    // horizontal-rail and glass loops (the door head lands exactly on rail line
    // #${d._headRailIdx + 1}), so nothing extra is emitted here.
  }

  // ---- portal ----
  if (cfg.portal.enabled) {
    const pd = cfg.portal.depth, pt = cfg.portal.plateT;
    // ½" plate LINING of the opening: head soffit + jamb plates running the wall depth —
    // reads as a thin edge band in elevation (CHL01 resubmittal), NOT a header-like block
    P.add({ kind: 'portal', profile: 'portalHead', name: `Portal head lining — ½" plate, ${inch(pd)} deep`, length: W + 2 * pt, dims: [W + 2 * pt, pt, pd], holes: [], extra: 'portal' },
      { pos: [W / 2, H + pt / 2, 0], portal: 'head' });
    for (const side of [0, 1]) {
      P.add({ kind: 'portal', profile: 'portalJamb', name: `Portal jamb lining — ½" plate, ${inch(pd)} deep`, length: H, dims: [pt, H, pd], holes: [], extra: 'portal' },
        { pos: [side ? W + pt / 2 : -pt / 2, H / 2, 0], portal: 'jamb' });
    }
    if (pd < 4) conflicts.push({ level: 'warn', msg: `Portal depth ${inch(pd)} — verify against wall survey (source project: 13¼").` });
  }

  fasteners.screw832 += 0;

  // ============================================================
  // BOM / cutlist / estimate
  // ============================================================
  const parts = P.list();
  const profiles = {};   // linear stock aggregation
  for (const p of parts) {
    if (p.kind === 'tube' || p.kind === 'angle') {
      const key = p.profile;
      profiles[key] = profiles[key] || { name: STOCK[key].name, cuts: [], lf: 0, pricePerLf: STOCK[key].pricePerLf };
      profiles[key].cuts.push({ id: p.id, name: p.name, length: p.length, qty: p.qty, miter: p.miter || null });
      profiles[key].lf += (p.length * p.qty) / 12;
    }
  }
  for (const k in profiles) {
    profiles[k].lfWithWaste = profiles[k].lf * RATES.wasteFactor;
    profiles[k].stockSticks = Math.ceil(profiles[k].lfWithWaste / RATES.stockLengthFt);
  }

  const plateCounts = {};
  for (const p of parts) {
    if (p.kind === 'plate' && PLATE[p.profile]) {
      plateCounts[p.profile] = (plateCounts[p.profile] || 0) + p.qty;
    }
  }

  // estimate
  const finishMult = RATES.finishMultiplier[cfg.finish] ?? 1;
  let cost = 0;
  const lines = [];
  for (const k in profiles) {
    const c = profiles[k].lfWithWaste * profiles[k].pricePerLf * finishMult;
    lines.push({ item: `${profiles[k].name} — ${profiles[k].lfWithWaste.toFixed(1)} lf (incl. ${((RATES.wasteFactor - 1) * 100).toFixed(0)}% waste)`, cost: c });
    cost += c;
  }
  for (const k in plateCounts) {
    const c = plateCounts[k] * PLATE[k].priceEach * finishMult;
    lines.push({ item: `${PLATE[k].name} × ${plateCounts[k]}`, cost: c }); cost += c;
  }
  const glassCost = glassArea * (RATES.glassPerSqFt[cfg.glass.type] ?? 30);
  lines.push({ item: `Glass ¼" ${cfg.glass.type} — ${glassArea.toFixed(1)} sqft (${panes.length} panes)`, cost: glassCost }); cost += glassCost;
  if (cfg.portal.enabled) {
    const areaSqFt = ((W + 1) * cfg.portal.depth + 2 * H * cfg.portal.depth) / 144;
    const c = areaSqFt * RATES.portalPlatePerSqFt;
    lines.push({ item: `Portal surround ½" plate — ${areaSqFt.toFixed(1)} sqft`, cost: c }); cost += c;
  }
  if (doorBay >= 0) {
    const d = cfg.door;
    const leaves = d._leaves;
    let c = leaves * RATES.doorLeafBase[d.style === 'glass-grid' ? 'glassGrid' : 'solid'] * finishMult;
    const hingesPerLeaf = d.hinge === 'continuous' ? 1 : Math.max(3, Math.ceil(d._leafH / 30));
    c += leaves * hingesPerLeaf * RATES.hingeEach[d.hinge];
    c += leaves * (RATES.pullEach[d.pull] ?? 0);
    if (d.closers) c += leaves * RATES.closerEach;
    lines.push({ item: `${leaves} door ${leaves > 1 ? 'leaves' : 'leaf'} (${d.style}, ${d.hinge} hinge${d.closers ? ', closers' : ''}${d.pull !== 'none' ? ', pulls' : ''})`, cost: c });
    cost += c;
  }
  const fastenerCost = fasteners.screw832 * RATES.fastenerEach + fasteners.anchors * RATES.anchorEach;
  lines.push({ item: `Fasteners: ${fasteners.screw832} × 8-32×⅜" SS, ${fasteners.anchors} anchors`, cost: fastenerCost }); cost += fastenerCost;
  const laborCost = jointCount * RATES.laborPerJoint + (profiles.mullion ? profiles.mullion.lf * RATES.laborPerLfMullion : 0);
  lines.push({ item: `Fabrication labor — ${jointCount} cold joints, mullion fit/miter`, cost: laborCost }); cost += laborCost;
  if (cfg.estimate.install) { const c = cost * 0.35; lines.push({ item: 'Installation (35%)', cost: c }); cost += c; }

  return {
    cfg, parts, conflicts, notes, panes,
    layout: { widths, heights, vx, railY, gridTop, vertLen, doorBay, sidelites, sideliteSplitEven, leftSidelites, rightSidelites: sidelites - leftSidelites },
    bom: { profiles, plateCounts, fasteners, glassArea, lines, total: cost },
    stats: {
      uniqueParts: parts.length,
      totalPieces: parts.reduce((a, p) => a + p.qty, 0),
      joints: jointCount,
    },
  };
}

function deepMerge(base, over) {
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') deepMerge(base[k], over[k]);
    else if (over[k] !== undefined) base[k] = over[k];
  }
  return base;
}
