// ============================================================================
// Orthographic shop-drawing generator — part -> SVG multi-view.
// FRONT + TOP length strips (NTS, dimensioned) + END cross-section (to scale)
// + ISO pictorial + title block + hole/slot schedule. Distances are called out
// from the outer edges, matching the source ChiLab CHL sheets.
// ============================================================================
import { inch, SYS, STOCK, PLATE } from './engine.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const L = (x1, y1, x2, y2, c = 'ln') => `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" class="${c}"/>`;
const RECT = (x, y, w, h, c = 'part', rx = 0) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${r(rx)}" class="${c}"/>`;
const C = (cx, cy, rad, c = 'hole') => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}" class="${c}"/>`;
const T = (x, y, s, c = 'dim', a = 'middle') => `<text x="${r(x)}" y="${r(y)}" text-anchor="${a}" class="${c}">${esc(s)}</text>`;
const r = v => Math.round(v * 100) / 100;

// horizontal dimension between xa,xb at height y, label centered above
function hdim(xa, xb, y, label, tick = 4) {
  if (Math.abs(xb - xa) < 1) return '';
  return L(xa, y - tick, xa, y + tick, 'ext') + L(xb, y - tick, xb, y + tick, 'ext') +
    L(xa, y, xb, y, 'dimln') + T((xa + xb) / 2, y - 3, label, 'dim');
}
// vertical dimension between ya,yb at x, label rotated
function vdim(ya, yb, x, label, tick = 4) {
  if (Math.abs(yb - ya) < 1) return '';
  return L(x - tick, ya, x + tick, ya, 'ext') + L(x - tick, yb, x + tick, yb, 'ext') +
    L(x, ya, x, yb, 'dimln') +
    `<text x="${r(x - 4)}" y="${r((ya + yb) / 2)}" text-anchor="middle" class="dim" transform="rotate(-90 ${r(x - 4)} ${r((ya + yb) / 2)})">${esc(label)}</text>`;
}
// witness line from a feature point down/right to a dimension line
const witness = (x1, y1, x2, y2) => L(x1, y1, x2, y2, 'ext');

// hole glyph: tap = filled, clearance = open, big access = double ring
function holeGlyph(cx, cy, px, part, h) {
  if (h.tap) return C(cx, cy, Math.max(px, 2.5), 'tap');
  if (h.d >= 0.5) return C(cx, cy, Math.max(px, 3), 'hole') + C(cx, cy, Math.max(px, 3) + 2, 'hole');
  return C(cx, cy, Math.max(px, 2.5), 'hole');
}

// ---- part geometry summary for drawing ----
function partBox(part) {
  const k = part.kind;
  if (k === 'tube') return { len: part.length, H: part.dims[1], D: part.dims[0], wall: STOCK[part.profile]?.wall ?? 0.125, cr: STOCK[part.profile]?.cornerR ?? 0 };
  if (k === 'plate') return { len: part.dims[0], H: part.dims[1], D: part.dims[2], cr: (PLATE[part.profile]?.cornerR ?? 0) };
  if (k === 'angle') return { len: part.length, H: SYS.mullLeg, D: SYS.mullLeg, wall: SYS.mullT, angle: true };
  if (k === 'glass' || k === 'panel') return { len: part.dims[0], H: part.dims[1], D: part.dims[2] };
  if (k === 'door') return { len: part.dims[0], H: part.dims[1], D: part.dims[2] };
  if (k === 'pull') return { len: part.length, H: 1, D: 1, round: true };
  return { len: part.length || 1, H: (part.dims?.[1] ?? 1), D: (part.dims?.[0] ?? 1) };
}

// map a face's holes/slots into (u along length, v across the view's cross axis, size)
function faceFeatures(part, faces, crossMax) {
  const out = [];
  for (const h of (part.holes || [])) if (faces.includes(h.face)) out.push({ ...h, isHole: true });
  for (const s of (part.slots || [])) if (faces.includes(s.face)) out.push({ ...s, isSlot: true });
  return out;
}

// ---- a length-wise strip view (FRONT or TOP), NTS in cross, holes proportional ----
function stripView(part, box, faces, x0, y0, w, hStrip, title, crossDim, crossLabel) {
  const feats = faceFeatures(part, faces, crossDim);
  const sx = w / box.len;                       // px per inch along length
  const stripH = hStrip;                          // fixed readable strip height (NTS cross)
  const yTop = y0, yBot = y0 + stripH;
  let g = `<g>`;
  g += T(x0, y0 - 14, title, 'vtitle', 'start');
  g += T(x0 + w, y0 - 14, 'NTS', 'nts', 'end');
  // outline (miter ends for angles)
  if (box.angle && part.miter) {
    const m = stripH; // 45° miter foreshortened schematic
    g += `<polygon points="${r(x0 + m)},${r(yTop)} ${r(x0 + w - m)},${r(yTop)} ${r(x0 + w)},${r(yBot)} ${r(x0)},${r(yBot)}" class="part"/>`;
  } else {
    g += RECT(x0, yTop, w, stripH, 'part');
  }
  // features
  const xNums = new Set(); const yNums = new Set();
  for (const f of feats) {
    const cx = x0 + f.x * sx;
    const cv = yTop + (f.v ?? (f.y / crossDim)) * 0; // we place features vertically centered-ish by y across crossDim
    const cy = yTop + (f.y / crossDim) * stripH;
    if (f.isSlot) {
      const sw = Math.max(f.w * sx, 3), sh = Math.max((f.h / crossDim) * stripH, 6);
      g += RECT(cx - sw / 2, cy - sh / 2, sw, sh, 'slot', 1.5);
    } else {
      const px = (f.d / 2) * sx;
      g += holeGlyph(cx, cy, px, part, f);
    }
    xNums.add(r(f.x)); yNums.add(r(f.y));
  }
  // overall length dim (below strip)
  const dy = yBot + 24;
  g += witness(x0, yBot, x0, dy) + witness(x0 + w, yBot, x0 + w, dy);
  g += hdim(x0, x0 + w, dy, inch(box.len));
  // hole X stations from left edge (chain, up to ~10 unique)
  const xs = [...xNums].sort((a, b) => a - b);
  if (xs.length && xs.length <= 12) {
    const dy2 = yBot + 10;
    let prev = 0;
    for (const xv of xs) {
      const px0 = x0 + prev * sx, px1 = x0 + xv * sx;
      g += L(px1, yBot, px1, dy2 + 3, 'ext');
      if (xv - prev > 0.05) g += hdim(px0, px1, dy2, inch(xv - prev), 3);
      prev = xv;
    }
  }
  // cross dim (right side)
  const cx2 = x0 + w + 14;
  g += witness(x0 + w, yTop, cx2, yTop) + witness(x0 + w, yBot, cx2, yBot);
  g += vdim(yTop, yBot, cx2, crossLabel + ' ' + inch(crossDim));
  // Y-from-edge callouts — dimension each from the NEAREST edge so they never stack
  const ys = [...yNums].sort((a, b) => a - b);
  if (ys.length && ys.length <= 4) {
    const lx = x0 - 16;
    for (const yv of ys) {
      const py = yTop + (yv / crossDim) * stripH;
      const nearTop = yv <= crossDim / 2;
      const edgeY = nearTop ? yTop : yBot;
      const edgeVal = nearTop ? yv : crossDim - yv;
      if (edgeVal < 0.02) continue;
      g += L(x0, py, lx + 3, py, 'ext');
      g += vdim(Math.min(edgeY, py), Math.max(edgeY, py), lx, inch(edgeVal), 3);
    }
  }
  g += `</g>`;
  return g;
}

// ---- END cross-section (to scale) ----
function endView(part, box, x0, y0, boxW, boxH, title) {
  const pad = 34;
  const s = Math.min((boxW - 2 * pad) / box.D, (boxH - 2 * pad) / box.H);
  const w = box.D * s, h = box.H * s;
  const cx = x0 + boxW / 2, cy = y0 + boxH / 2;
  const lx = cx - w / 2, ty = cy - h / 2;
  let g = `<g>`;
  g += T(x0 + 4, y0 - 14, title, 'vtitle', 'start');
  g += T(x0 + boxW, y0 - 14, `SCALE ${scaleLabel(s)}`, 'nts', 'end');
  if (box.angle) {
    const t = box.wall * s;
    g += `<polygon points="${r(lx)},${r(ty)} ${r(lx + t)},${r(ty)} ${r(lx + t)},${r(ty + h - t)} ${r(lx + w)},${r(ty + h - t)} ${r(lx + w)},${r(ty + h)} ${r(lx)},${r(ty + h)}" class="part"/>`;
  } else if (box.wall) {
    const t = box.wall * s, rr = (box.cr || 0) * s;
    g += RECT(lx, ty, w, h, 'part', rr);
    g += RECT(lx + t, ty + t, w - 2 * t, h - 2 * t, 'hollow', Math.max(0, rr - t));
  } else {
    g += RECT(lx, ty, w, h, box.round ? 'part' : 'plate', box.round ? h / 2 : (box.cr || 0) * s);
  }
  g += witness(lx, ty + h, lx, ty + h + 20) + witness(lx + w, ty + h, lx + w, ty + h + 20);
  g += hdim(lx, lx + w, ty + h + 18, inch(box.D));
  g += witness(lx, ty, lx - 18, ty) + witness(lx, ty + h, lx - 18, ty + h);
  g += vdim(ty, ty + h, lx - 16, inch(box.H));
  if (box.wall) g += T(cx, ty + h + 32, `${inch(box.wall)} wall`, 'note');
  g += `</g>`;
  return g;
}

function scaleLabel(s) {
  // s = px per inch; express as fraction near common scales
  const inPerPx = 1 / s;
  if (s >= 40) return '3\" = 1\'-0\"';
  if (s >= 20) return '1 1/2\" = 1\'-0\"';
  if (s >= 12) return '1\" = 1\'-0\"';
  if (s >= 6) return '1/2\" = 1\'-0\"';
  return 'NTS';
}

// ---- ISO pictorial (simple oblique prism) ----
function isoView(part, box, x0, y0, boxW, boxH) {
  const pad = 28;
  // schematic pictorial (NTS): clamp the length so a long thin bar stays legible
  const aspect = Math.min(box.len / Math.max(box.H, box.D, 0.1), 6);
  const drawLen = aspect * Math.max(box.H, box.D);
  const s = Math.min((boxW - 2 * pad) / (drawLen + box.D * 0.5), (boxH - 2 * pad) / (box.H + box.D * 0.5));
  const Lp = drawLen * s, Hp = box.H * s, Dp = box.D * s * 0.5;
  const x = x0 + pad, y = y0 + boxH - pad - Dp;
  const p = (px, py) => `${r(px)},${r(py)}`;
  let g = `<g>`;
  g += T(x0 + 4, y0 - 14, 'ISO', 'vtitle', 'start');
  // front face
  g += `<polygon points="${p(x, y)} ${p(x + Lp, y)} ${p(x + Lp, y - Hp)} ${p(x, y - Hp)}" class="iso"/>`;
  // top face
  g += `<polygon points="${p(x, y - Hp)} ${p(x + Lp, y - Hp)} ${p(x + Lp + Dp, y - Hp - Dp)} ${p(x + Dp, y - Hp - Dp)}" class="iso2"/>`;
  // right face
  g += `<polygon points="${p(x + Lp, y)} ${p(x + Lp + Dp, y - Dp)} ${p(x + Lp + Dp, y - Hp - Dp)} ${p(x + Lp, y - Hp)}" class="iso3"/>`;
  g += `</g>`;
  return g;
}

// ---- hole / slot schedule table ----
function schedule(part, x0, y0, w) {
  const rows = [];
  (part.holes || []).forEach((h, i) => rows.push([`H${i + 1}`, h.face, inch(h.x), inch(h.y), (h.tap ? h.tap + ' tap' : 'Ø' + inch(h.d)), h.note || '']));
  (part.slots || []).forEach((s, i) => rows.push([`S${i + 1}`, s.face, inch(s.x), inch(s.y), inch(s.w) + '×' + inch(s.h) + ' slot', s.note || '']));
  if (!rows.length) return T(x0, y0 + 14, 'No drilled features.', 'note', 'start');
  const cols = [34, 74, 60, 60, 96, 999];
  let g = `<g>`;
  const head = ['#', 'FACE', 'X-EDGE', 'Y-EDGE', 'SIZE', 'OP'];
  let cx = x0;
  g += RECT(x0, y0, w, 16, 'thead');
  head.forEach((hh, i) => { g += T(cx + 4, y0 + 12, hh, 'th', 'start'); cx += cols[i]; });
  let yy = y0 + 16;
  const maxRows = 16;
  rows.slice(0, maxRows).forEach((rw, ri) => {
    cx = x0;
    if (ri % 2) g += RECT(x0, yy, w, 15, 'trow');
    rw.forEach((cell, i) => { g += T(cx + 4, yy + 11, cell, 'td', 'start'); cx += cols[i]; });
    yy += 15;
  });
  if (rows.length > maxRows) g += T(x0 + 4, yy + 11, `… +${rows.length - maxRows} more (see cut sheet)`, 'note', 'start');
  g += `</g>`;
  return g;
}

// ============================================================================
export function partDrawingSVG(part) {
  const box = partBox(part);
  const W = 1140, Hc = 780;
  const M = 60;
  const colW = W - 2 * M;
  const stripW = colW * 0.68;                    // FRONT/TOP length strips
  const rightX = M + stripW + 54;
  const rightW = W - M - rightX;

  const stripH = 46;
  const frontY = 80, topY = 210;

  // FRONT: front/back walls (for tubes) / the flat face (plates/glass)
  const frontFaces = part.kind === 'tube' ? ['front', 'back'] : ['top'];
  const frontCross = part.kind === 'tube' ? box.H : box.H;
  // TOP: top/bottom walls (tubes) — where most holes live
  const topFaces = part.kind === 'tube' ? ['top', 'bottom'] : [];
  const topCross = part.kind === 'tube' ? box.D : box.D;

  let svg = `<svg viewBox="0 0 ${W} ${Hc}" xmlns="http://www.w3.org/2000/svg" class="shopdrawing">`;
  svg += `<style>
    .shopdrawing{background:#fbfaf7;font-family:'Helvetica Neue',Arial,sans-serif;}
    .part{fill:#eceae4;stroke:#1c1c1c;stroke-width:1.4;}
    .iso{fill:#ded9cf;stroke:#1c1c1c;stroke-width:1.2;} .iso2{fill:#efece5;stroke:#1c1c1c;stroke-width:1.2;} .iso3{fill:#cfc9bd;stroke:#1c1c1c;stroke-width:1.2;}
    .hollow{fill:#fbfaf7;stroke:#1c1c1c;stroke-width:1;} .plate{fill:#d9d5cc;stroke:#1c1c1c;stroke-width:1.4;}
    .hole{fill:#fff;stroke:#1c1c1c;stroke-width:1;} .tap{fill:#1c1c1c;stroke:#1c1c1c;} .slot{fill:#fff;stroke:#1c1c1c;stroke-width:1;}
    .ln{stroke:#1c1c1c;stroke-width:1;} .dimln{stroke:#b8551f;stroke-width:0.8;} .ext{stroke:#b8551f;stroke-width:0.6;}
    .dim{fill:#b8551f;font-size:11px;} .note{fill:#666;font-size:10.5px;} .nts{fill:#999;font-size:10px;letter-spacing:.05em;}
    .vtitle{fill:#1c1c1c;font-size:12px;font-weight:700;letter-spacing:.08em;}
    .th{fill:#fff;font-size:9.5px;font-weight:700;letter-spacing:.04em;} .td{fill:#222;font-size:10px;} .thead{fill:#3a3128;} .trow{fill:#f0ede7;}
    .tbTitle{fill:#1c1c1c;font-size:15px;font-weight:700;} .tbLbl{fill:#888;font-size:9.5px;letter-spacing:.06em;} .tbVal{fill:#1c1c1c;font-size:12px;}
    .frame{fill:none;stroke:#1c1c1c;stroke-width:1.2;}
  </style>`;
  svg += RECT(6, 6, W - 12, Hc - 12, 'frame', 4);

  svg += stripView(part, box, frontFaces, M, frontY, stripW, stripH, 'FRONT / ELEVATION', frontCross, part.kind === 'tube' ? 'H' : 'W');
  if (part.kind === 'tube')
    svg += stripView(part, box, topFaces, M, topY, stripW, stripH, 'TOP / PLAN', topCross, 'D');

  // END + ISO on the right column
  svg += endView(part, box, rightX, frontY, rightW, 150, 'END SECTION');
  svg += isoView(part, box, rightX, topY + 20, rightW, 150);

  // Title block (bottom-right)
  const tbX = rightX, tbY = 400, tbW = rightW, tbH = 150;
  svg += RECT(tbX, tbY, tbW, tbH, 'frame');
  svg += T(tbX + 12, tbY + 26, part.id + ' — ' + part.name, 'tbTitle', 'start');
  const stockName = STOCK[part.profile]?.name || PLATE[part.profile]?.name || (part.kind === 'glass' ? '¼" glass' : part.kind);
  const info = [
    ['STOCK', stockName],
    ['QTY REQUIRED', String(part.qty)],
    ['CUT LENGTH', part.length ? inch(part.length) : '—'],
    ['SECTION', part.kind === 'tube' ? `${inch(box.D)} × ${inch(box.H)}` : (part.dims ? part.dims.map(d => inch(d)).join(' × ') : '—')],
    ['END PREP', part.miter ? '45° miter both ends' : 'square'],
    ['FINISH', 'per spec'],
  ];
  info.forEach((row, i) => {
    const rx = tbX + 12 + (i % 2) * (tbW / 2), ry = tbY + 52 + Math.floor(i / 2) * 34;
    svg += T(rx, ry, row[0], 'tbLbl', 'start') + T(rx, ry + 15, row[1], 'tbVal', 'start');
  });

  // Hole schedule (bottom span)
  svg += T(M, 578, 'HOLE & SLOT SCHEDULE — all distances from outer edges', 'vtitle', 'start');
  svg += schedule(part, M, 590, colW);

  svg += `</svg>`;
  return svg;
}
