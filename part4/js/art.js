'use strict';
// ============================================================ comic ink helpers
const TAU = Math.PI * 2;
function pathPts(p) { ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); }
function olin(p, w, col, ow = 4) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pathPts(p); ctx.strokeStyle = INK; ctx.lineWidth = w + ow; ctx.stroke();
  ctx.beginPath(); pathPts(p); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function ofill(fn, col, lw = 2.4) {
  ctx.beginPath(); fn(); ctx.fillStyle = col; ctx.fill();
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function opoly(p, col, lw = 2.4) { ofill(() => { pathPts(p); ctx.closePath(); }, col, lw); }
function ocirc(x, y, r, col, lw = 2.2) { ofill(() => ctx.arc(x, y, r, 0, TAU), col, lw); }
function oell(x, y, rx, ry, rot, col, lw = 2.2) { ofill(() => ctx.ellipse(x, y, rx, ry, rot, 0, TAU), col, lw); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function orrect(x, y, w, h, r, col, lw = 2.4) { rrect(x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); } }
function shade(col, k) {
  const n = parseInt(col.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * k), 0, 255); g = clamp(Math.round(g * k), 0, 255); b = clamp(Math.round(b * k), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function makeDots(col, r, s) {
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.fillStyle = col; g.beginPath(); g.arc(s / 2, s / 2, r, 0, TAU); g.fill();
  return ctx.createPattern(c, 'repeat');
}
const HT_DARK = makeDots('rgba(10,6,20,.30)', 1.25, 5);
const HT_SOFT = makeDots('rgba(10,6,20,.16)', 1.6, 7);
const HT_LIGHT = makeDots('rgba(255,255,255,.22)', 1.3, 6);
function halftone(fn, pat = HT_DARK) {
  ctx.save(); ctx.beginPath(); fn(); ctx.clip(); ctx.fillStyle = pat; ctx.fillRect(-2000, -2000, 6000, 6000); ctx.restore();
}
// quad strip around a polyline with per-point half widths, returns polygon points
function strip(pts, ws) {
  const L = [], R = [];
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    const px = pts[Math.max(0, i - 1) * 2], py = pts[Math.max(0, i - 1) * 2 + 1];
    const nx = pts[Math.min(n - 1, i + 1) * 2], ny = pts[Math.min(n - 1, i + 1) * 2 + 1];
    let dx = nx - px, dy = ny - py; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    L.push(x - dy * ws[i], y + dx * ws[i]); R.push(x + dy * ws[i], y - dx * ws[i]);
  }
  const out = L.slice();
  for (let i = n - 1; i >= 0; i--) out.push(R[i * 2], R[i * 2 + 1]);
  return out;
}
function ik(ax, ay, bx, by, l1, l2, bend) {
  const dx = bx - ax, dy = by - ay;
  const d = clamp(Math.hypot(dx, dy), .01, l1 + l2 - .01);
  const a = Math.atan2(dy, dx);
  const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = a - bend * Math.acos(c);
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}

// ============================================================ poses
// local coordinates: facing +x, feet at y=0, up is negative y
function mkPose(o) {
  const p = {
    hip: o.hip || [0, -40], sh: o.sh || [1, -64], head: o.head || [3, -78],
    fB: o.fB || [-7, 0], fF: o.fF || [8, 0], hB: o.hB || [-6, -42], hF: o.hF || [9, -43],
    rot: o.rot || 0, kbend: o.kbend || 1, open: o.open || false,
  };
  p.kB = ik(p.hip[0] - 3, p.hip[1], p.fB[0], p.fB[1], 21, 21, p.kbend);
  p.kF = ik(p.hip[0] + 3, p.hip[1], p.fF[0], p.fF[1], 21, 21, p.kbend);
  p.eB = ik(p.sh[0] - 4, p.sh[1] + 2, p.hB[0], p.hB[1], 15, 15, o.ebB != null ? o.ebB : -1);
  p.eF = ik(p.sh[0] + 4, p.sh[1] + 2, p.hF[0], p.hF[1], 15, 15, o.ebF != null ? o.ebF : -1);
  return p;
}
function scalePose(p, s) {
  const k = ['hip', 'sh', 'head', 'fB', 'fF', 'hB', 'hF', 'kB', 'kF', 'eB', 'eF'];
  const q = Object.assign({}, p);
  for (const n of k) q[n] = [p[n][0] * s, p[n][1] * s];
  return q;
}
const POSES = {
  idle: t => { const b = Math.sin(t * .07); return mkPose({ hip: [0, -40 + b * .5], sh: [1, -64 + b], head: [3, -78 + b], hB: [-7, -41 + b], hF: [9, -42 + b] }); },
  run: t => {
    const s = Math.sin(t), c = Math.cos(t), bob = Math.abs(s) * 2;
    return mkPose({ hip: [2, -40 + bob], sh: [7, -63 + bob], head: [11, -76 + bob],
      fF: [s * 19 + 2, -Math.max(0, c) * 11], fB: [-s * 19 + 2, -Math.max(0, -c) * 11],
      hF: [-s * 13 + 8, -48 + bob], hB: [s * 13 + 2, -48 + bob] });
  },
  walk: t => {
    const s = Math.sin(t), c = Math.cos(t);
    return mkPose({ hip: [0, -40 + Math.abs(s)], sh: [2, -64 + Math.abs(s)], head: [4, -78 + Math.abs(s)],
      fF: [s * 11, -Math.max(0, c) * 5], fB: [-s * 11, -Math.max(0, -c) * 5], hF: [-s * 7 + 6, -42], hB: [s * 7 - 3, -42] });
  },
  jump: () => mkPose({ hip: [0, -42], sh: [3, -66], head: [5, -80], fF: [10, -12], fB: [-6, -6], hF: [14, -86], hB: [-12, -54] }),
  fall: () => mkPose({ hip: [0, -40], sh: [2, -64], head: [4, -78], fF: [9, -2], fB: [-10, -8], hF: [20, -64], hB: [-18, -62] }),
  land: () => mkPose({ hip: [0, -30], sh: [5, -54], head: [9, -67], fF: [11, 0], fB: [-9, 0], hF: [14, -30], hB: [-10, -28] }),
  perch: () => mkPose({ hip: [-4, -24], sh: [6, -44], head: [14, -54], fF: [8, 0], fB: [-14, 0], hF: [20, -1], hB: [12, -1], kbend: 1 }),
  wall: t => { const c = Math.sin(t) * 6; return mkPose({ hip: [2, -40], sh: [4, -64], head: [6, -78], fF: [12, -8 + c], fB: [10, -28 - c], hF: [13, -90 - c], hB: [12, -70 + c], kbend: -1, ebF: 1, ebB: 1 }); },
  swing: (t, ax, ay) => { const a = Math.atan2(ay, ax); return mkPose({ hip: [-2, -40], sh: [0, -64], head: [2, -78], fF: [-8, -4], fB: [-16, -12], hF: [Math.cos(a) * 30, -64 + Math.sin(a) * 30], hB: [-14, -52] }); },
  zip: () => mkPose({ hip: [-4, -42], sh: [2, -64], head: [6, -78], fF: [-10, -10], fB: [-18, -18], hF: [30, -80], hB: [-14, -54] }),
  jab: () => mkPose({ hip: [2, -40], sh: [8, -63], head: [11, -77], fF: [12, 0], fB: [-10, 0], hF: [32, -60], hB: [2, -52] }),
  hook: () => mkPose({ hip: [2, -40], sh: [7, -63], head: [10, -77], fF: [12, 0], fB: [-10, 0], hF: [6, -54], hB: [30, -58], ebB: 1 }),
  kick: () => mkPose({ hip: [-2, -44], sh: [-6, -66], head: [-4, -80], fF: [34, -44], fB: [-4, 0], hF: [-4, -60], hB: [-16, -56] }),
  upper: () => mkPose({ hip: [2, -44], sh: [7, -68], head: [10, -82], fF: [12, -4], fB: [-9, 0], hF: [18, -98], hB: [-10, -52] }),
  air: () => mkPose({ hip: [0, -42], sh: [5, -65], head: [8, -79], fF: [10, -14], fB: [-8, -8], hF: [32, -60], hB: [-8, -54] }),
  dive: () => mkPose({ hip: [0, -40], sh: [-6, -60], head: [-6, -74], fF: [22, 4], fB: [8, -14], hF: [-16, -70], hB: [-20, -58], rot: .5 }),
  sweep: () => mkPose({ hip: [-6, -18], sh: [-10, -40], head: [-10, -54], fF: [34, -2], fB: [-14, 0], hF: [-10, -2], hB: [-18, -4] }),
  shoot: () => mkPose({ hip: [0, -40], sh: [4, -64], head: [7, -78], fF: [11, 0], fB: [-8, 0], hF: [32, -64], hB: [-6, -46] }),
  pull: () => mkPose({ hip: [-2, -38], sh: [-6, -62], head: [-6, -76], fF: [12, 0], fB: [-12, 0], hF: [4, -58], hB: [-12, -52] }),
  trap: () => mkPose({ hip: [0, -28], sh: [8, -50], head: [12, -62], fF: [12, 0], fB: [-10, 0], hF: [22, -4], hB: [-6, -30] }),
  roll: () => mkPose({ hip: [0, -30], sh: [5, -46], head: [9, -54], fF: [10, -20], fB: [2, -16], hF: [12, -26], hB: [6, -24] }),
  hurt: () => mkPose({ hip: [-2, -40], sh: [-8, -62], head: [-10, -75], fF: [10, -4], fB: [-8, 0], hF: [14, -74], hB: [-20, -66] }),
  carry: () => mkPose({ hip: [0, -40], sh: [2, -64], head: [5, -77], hF: [8, -84], hB: [-6, -84] }),
  super: () => mkPose({ hip: [0, -42], sh: [1, -66], head: [2, -80], fF: [14, 0], fB: [-14, 0], hF: [30, -84], hB: [-28, -84] }),
  thumbs: () => mkPose({ hF: [22, -66], hB: [-7, -41] }),
  talk: t => { const b = Math.sin(t * .15); return mkPose({ hF: [14, -54 + b * 3], hB: [-7, -41] }); },
  wave: t => mkPose({ hF: [14, -88 + Math.sin(t * .3) * 4], hB: [-7, -41] }),
  hold: () => mkPose({ hF: [16, -52], hB: [12, -50] }),
  hug: () => mkPose({ hF: [18, -62], hB: [14, -60], sh: [4, -64], head: [7, -77] }),
  sit: () => mkPose({ hip: [0, -24], sh: [1, -48], head: [3, -62], fF: [14, 0], fB: [10, 0], hF: [14, -30], hB: [8, -28], kbend: 1 }),
  lie: () => mkPose({ hip: [0, -8], sh: [-24, -8], head: [-38, -10], fF: [22, -2], fB: [20, -4], hF: [-10, -4], hB: [-16, -2] }),
  kneel: () => mkPose({ hip: [0, -26], sh: [3, -50], head: [5, -64], fF: [12, 0], fB: [-16, 0], hF: [10, -28], hB: [-4, -26] }),
  crouch: () => mkPose({ hip: [0, -28], sh: [5, -52], head: [9, -65], fF: [12, 0], fB: [-10, 0], hF: [16, -34], hB: [-8, -30] }),
};

// ============================================================ suits
const SUITS = {
  street: { name: 'Уличный', from: 'Сшит Фелицией: твои джинсы и её оранжевая футболка', street: true },
  classic: { name: 'Классический', from: 'Самый первый костюм. Фелиция его заштопала', torso: '#d7263d', side: '#2350b5', legs: '#2350b5', boots: '#d7263d', arms: '#d7263d', gloves: '#d7263d', head: '#d7263d', web: '#1a0a10', emb: '#111', eyes: '#fff' },
  upgraded: { name: 'Апгрейд', from: 'Вселенная «Вдали от дома»', torso: '#d7263d', side: '#15131c', legs: '#15131c', boots: '#d7263d', arms: '#d7263d', gloves: '#15131c', head: '#d7263d', web: '#6a0a18', emb: '#15131c', eyes: '#f4f4ff' },
  black: { name: 'Чёрный симбиот', from: 'Инопланетный костюм. Липкий и злой', torso: '#15131c', side: '#15131c', legs: '#15131c', boots: '#15131c', arms: '#15131c', gloves: '#15131c', head: '#15131c', bigemb: '#f4f4ff', emb: null, eyes: '#f4f4ff', glossy: true },
  iron: { name: 'Железный паук', from: 'Броня с механическими лапами', torso: '#c81f2a', side: '#d9a52a', legs: '#c81f2a', boots: '#d9a52a', arms: '#c81f2a', gloves: '#d9a52a', head: '#c81f2a', emb: '#d9a52a', eyes: '#f7f1c0', legs4: true, glossy: true },
  miles: { name: 'Майлз Моралес', from: 'Земля-1610, Бруклин', torso: '#15131c', side: '#15131c', legs: '#15131c', boots: '#d7263d', arms: '#15131c', gloves: '#d7263d', head: '#15131c', web: '#d7263d', emb: '#d7263d', eyes: '#f4f4ff' },
  gwen: { name: 'Паук-Гвен', from: 'Земля-65, барабанщица', torso: '#f2f2f6', side: '#15131c', legs: '#15131c', boots: '#2fd0b0', arms: '#f2f2f6', gloves: '#2fd0b0', head: '#f2f2f6', web: '#ff7ab8', emb: null, eyes: '#f4f4ff', hood: true, eyeline: '#ff7ab8' },
  s2099: { name: 'Паук 2099', from: 'Нуэва-Йорк, будущее', torso: '#1c2a8a', side: '#1c2a8a', legs: '#1c2a8a', boots: '#1c2a8a', arms: '#1c2a8a', gloves: '#d7263d', head: '#1c2a8a', emb: '#d7263d', bigemb: '#d7263d', eyes: '#d7263d', fins: true },
  punk: { name: 'Паук-панк', from: 'Земля-138, Лондон', torso: '#d7263d', side: '#2350b5', legs: '#2350b5', boots: '#15131c', arms: '#2350b5', gloves: '#d7263d', head: '#d7263d', web: '#15131c', emb: '#15131c', eyes: '#f4f4ff', vest: true, mohawk: true },
  noir: { name: 'Паук-нуар', from: 'Земля-90214, 1933 год', torso: '#1b1b1e', side: '#1b1b1e', legs: '#1b1b1e', boots: '#101012', arms: '#1b1b1e', gloves: '#1b1b1e', head: '#1b1b1e', emb: null, eyes: '#b8b8c0', coat: true, gray: true },
  scarlet: { name: 'Алый паук', from: 'Клон Бена Райли', torso: '#c81f2a', side: '#c81f2a', legs: '#c81f2a', boots: '#c81f2a', arms: '#c81f2a', gloves: '#c81f2a', head: '#c81f2a', web: '#7a0a18', emb: '#2350b5', eyes: '#f4f4ff', hoodie: true },
  superior: { name: 'Высший паук', from: 'Ум Октавиуса в теле Паркера', torso: '#15131c', side: '#c81f2a', legs: '#c81f2a', boots: '#15131c', arms: '#15131c', gloves: '#c81f2a', head: '#15131c', web: '#c81f2a', emb: '#c81f2a', eyes: '#ff4a3a', legs4: true },
  stealth: { name: 'Стелс', from: 'Большое время: гасит свет и звук', torso: '#101418', side: '#101418', legs: '#101418', boots: '#101418', arms: '#101418', gloves: '#101418', head: '#101418', web: '#3aff9a', emb: '#3aff9a', eyes: '#3aff9a', glow: true },
  ff: { name: 'Фонд будущего', from: 'Белый костюм Фантастической четвёрки', torso: '#f4f4f8', side: '#15131c', legs: '#15131c', boots: '#f4f4f8', arms: '#f4f4f8', gloves: '#15131c', head: '#f4f4f8', emb: '#15131c', bigemb: '#15131c', eyes: '#15131c' },
};
const SUIT_ORDER = ['street', 'classic', 'upgraded', 'black', 'iron', 'miles', 'gwen', 's2099', 'punk', 'noir', 'scarlet', 'superior', 'stealth', 'ff'];

// ============================================================ hero drawing
// x,y = feet in world coords; face = ±1; pose from POSES
function drawHero(x, y, face, pose, suitId, opt = {}) {
  const suit = SUITS[suitId] || SUITS.street;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * (opt.s || 1), opt.s || 1);
  if (pose.rot) { ctx.translate(0, -40); ctx.rotate(pose.rot); ctx.translate(0, 40); }
  if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
  if (suit.street) drawStreetSuit(pose, opt);
  else drawTightSuit(pose, suit, opt);
  ctx.restore();
}
function jeansLeg(hip, knee, foot, side) {
  const hx = hip[0] + side * 4, hy = hip[1];
  const pts = [hx, hy, knee[0], knee[1], foot[0], foot[1] - 3];
  const poly = strip(pts, [8.5, 9.5, 11.5]);
  opoly(poly, '#2f4fc4', 2.4);
  // shading hatch
  ctx.strokeStyle = 'rgba(15,20,70,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 3; i++) { const t = .25 + i * .18; const ax = lerp(hx, knee[0], t) - 5, ay = lerp(hy, knee[1], t); ctx.moveTo(ax, ay); ctx.lineTo(ax + 3, ay + 4); }
  ctx.stroke();
  // rip on the knee
  ctx.strokeStyle = '#b8d8ff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(knee[0] - 3, knee[1] - 2); ctx.lineTo(knee[0] + 3, knee[1]); ctx.stroke();
  // grey frayed cuff
  const t0 = .55;
  const cx0 = lerp(knee[0], foot[0], t0), cy0 = lerp(knee[1], foot[1] - 3, t0);
  const cuff = strip([cx0, cy0, foot[0], foot[1] - 3], [10.6, 11.6]);
  ofill(() => {
    ctx.moveTo(cuff[0], cuff[1]);
    const n = 6;
    for (let i = 1; i <= n; i++) { const t = i / n; ctx.lineTo(lerp(cuff[0], cuff[6], t) + (i % 2 ? 0 : 0), lerp(cuff[1], cuff[7], t) + (i % 2 ? -3.5 : 0)); }
    ctx.lineTo(cuff[4], cuff[5]); ctx.lineTo(cuff[2], cuff[3]); ctx.closePath();
  }, '#bcc0c9', 2.2);
  ctx.strokeStyle = 'rgba(40,40,60,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cuff[2] - 2, cuff[3] - 2); ctx.lineTo(cuff[4] + 1, cuff[5] - 6); ctx.stroke();
  // sneaker
  orrect(foot[0] - 8, foot[1] - 7, 20, 8, 4, '#f7f7f4', 2.2);
  ctx.fillStyle = '#b8bcc6'; ctx.fillRect(foot[0] - 7, foot[1] - 2, 18, 2);
}
function whiteArm(sh, el, ha, sleeveOrange) {
  olin([sh[0], sh[1], el[0], el[1], ha[0], ha[1]], 6.5, '#f3f3f6');
  ctx.strokeStyle = 'rgba(120,120,150,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(el[0] - 1, el[1] + 2); ctx.lineTo(ha[0] - 1, ha[1] + 2); ctx.stroke();
  if (sleeveOrange) {
    const mx = lerp(sh[0], el[0], .55), my = lerp(sh[1], el[1], .55);
    opoly(strip([sh[0], sh[1], mx, my], [7, 7.5]), '#f07a1c', 2.2);
    ctx.strokeStyle = '#b8321a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(mx, my); ctx.stroke();
  }
  ocirc(ha[0], ha[1], 4.6, '#fbfbfd', 2);
}
function drawStreetSuit(p, opt) {
  const sh = p.sh, hip = p.hip;
  const shB = [sh[0] - 6, sh[1] + 2], shF = [sh[0] + 6, sh[1] + 2];
  // back arm & leg
  whiteArm(shB, p.eB, p.hB, true);
  jeansLeg(hip, p.kB, p.fB, -1);
  // tee
  const tee = [sh[0] - 4, sh[1] - 3, sh[0] + 6, sh[1] - 3, sh[0] + 12, sh[1] + 1, hip[0] + 14, hip[1] + 3, hip[0] - 13, hip[1] + 4, sh[0] - 12, sh[1] + 1];
  // neck
  opoly([sh[0] - 2, sh[1] - 2, sh[0] + 4, sh[1] - 2, p.head[0] + 1, p.head[1] + 11, p.head[0] - 4, p.head[1] + 11], '#f3f3f6', 2);
  opoly(tee, '#f07a1c', 2.6);
  ctx.save(); ctx.beginPath(); pathPts(tee); ctx.closePath(); ctx.clip();
  const cx = lerp(sh[0], hip[0], .4) + 3, cy = lerp(sh[1], hip[1], .4);
  ctx.strokeStyle = '#c0301a'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); }
  ctx.stroke();
  for (const r of [5, 10, 16]) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU; const rr = r + (i % 2 ? -1 : 0); ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.stroke(); }
  ctx.fillStyle = 'rgba(120,30,0,.22)'; ctx.fillRect(sh[0] - 16, sh[1] - 4, 8, 40);
  ctx.restore();
  jeansLeg(hip, p.kF, p.fF, 1);
  // belt line under tee hem visible
  // head
  streetHead(p.head[0], p.head[1]);
  whiteArm(shF, p.eF, p.hF, true);
  if (opt.webHand) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; }
}
function streetHead(hx, hy) {
  ctx.save(); ctx.translate(hx, hy);
  opoly([-1, 12, 6, 9, 9, 0, 9, -10, 6, -18, 3, -12, 0, -22, -3, -14, -7, -8, -8, 4], '#f4f4f0', 2.4);
  ctx.fillStyle = 'rgba(120,120,150,.25)'; ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(-8, 4); ctx.lineTo(-1, 11); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
  // goggles band
  ctx.fillStyle = INK; ctx.fillRect(-8, -4, 17, 3);
  oell(5.5, -2.5, 4.4, 3.8, 0, '#101014', 1.5);
  oell(-1.5, -2.5, 3.2, 3.6, 0, '#101014', 1.5);
  ctx.fillStyle = 'rgba(255,255,255,.75)'; circle(6.8, -3.8, 1.2); circle(-0.8, -3.8, .9);
  ctx.restore();
}
function tightHead(hx, hy, s) {
  ctx.save(); ctx.translate(hx, hy);
  if (s.hood) { ofill(() => { ctx.moveTo(-10, 10); ctx.quadraticCurveTo(-14, -16, 2, -15); ctx.quadraticCurveTo(14, -14, 12, 2); ctx.lineTo(10, 12); ctx.closePath(); }, '#f2f2f6', 2.4); ctx.fillStyle = '#ff7ab8'; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-10, -10, 2, -11); ctx.lineTo(0, -8); ctx.quadraticCurveTo(-6, -6, -5, 8); ctx.fill(); }
  oell(1.5, -1, 9.5, 11, 0, s.head, 2.4);
  if (s.web) { ctx.save(); ctx.beginPath(); ctx.ellipse(1.5, -1, 9.5, 11, 0, 0, TAU); ctx.clip(); ctx.strokeStyle = s.web; ctx.lineWidth = .8; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(4, 0); ctx.lineTo(4 + Math.cos(a) * 14, Math.sin(a) * 14); } ctx.stroke(); for (const r of [5, 9]) { ctx.beginPath(); ctx.arc(4, 0, r, 0, TAU); ctx.stroke(); } ctx.restore(); }
  if (s.glossy) { ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-2, -6, 3, 5, -.4, 0, TAU); ctx.fill(); }
  const eye = s.eyes;
  ofill(() => ctx.ellipse(6.5, -2, 3.6, 2.6, -.5, 0, TAU), eye, 1.6);
  ofill(() => ctx.ellipse(-0.5, -2.5, 2.8, 2.2, .5, 0, TAU), eye, 1.6);
  if (s.glow) { ctx.fillStyle = 'rgba(58,255,154,.35)'; circle(6.5, -2, 6); }
  if (s.coat) { opoly([-12, -7, 14, -7, 11, -11, -9, -11], '#101012', 2); orrect(-6, -17, 13, 7, 2, '#101012', 2); ocirc(6, -2, 3.2, '#8a8a92', 1.6); ocirc(-0.5, -2.5, 2.6, '#8a8a92', 1.6); }
  if (s.mohawk) { opoly([-6, -9, -4, -21, -1, -12, 1, -24, 3, -12, 6, -21, 7, -9], '#1a1a22', 2); }
  ctx.restore();
}
function drawTightSuit(p, s, opt) {
  const sh = p.sh, hip = p.hip;
  const shB = [sh[0] - 6, sh[1] + 2], shF = [sh[0] + 6, sh[1] + 2];
  if (s.legs4) {
    for (let i = 0; i < 2; i++) { const a = -2.4 + i * .5 + Math.sin(frame * .05 + i) * .1; olin([sh[0] - 6, sh[1] + 8, sh[0] - 6 + Math.cos(a) * 20, sh[1] + 8 + Math.sin(a) * 20, sh[0] - 6 + Math.cos(a - .6) * 34, sh[1] + 8 + Math.sin(a - .6) * 34], 3, s.side === '#c81f2a' ? '#15131c' : '#d9a52a', 3); }
  }
  if (s.coat) {
    opoly([sh[0] - 12, sh[1], sh[0] + 12, sh[1], hip[0] + 16, hip[1] + 28, hip[0] - 18, hip[1] + 30], '#232326', 2.6);
  }
  const limb = (a, b, c, col, end) => { olin([a[0], a[1], b[0], b[1], c[0], c[1]], 7, col); if (end) { const mx = lerp(b[0], c[0], .5), my = lerp(b[1], c[1], .5); olin([mx, my, c[0], c[1]], 7, end, 0); } };
  limb(shB, p.eB, p.hB, s.arms, s.gloves !== s.arms ? s.gloves : null);
  ocirc(p.hB[0], p.hB[1], 4.2, s.gloves, 2);
  limb([hip[0] - 3, hip[1]], p.kB, p.fB, s.legs, s.boots !== s.legs ? s.boots : null);
  orrect(p.fB[0] - 6, p.fB[1] - 5, 14, 6, 3, s.boots, 2);
  // torso
  const tor = [sh[0] - 11, sh[1] - 1, sh[0] + 11, sh[1] - 1, hip[0] + 8, hip[1] + 2, hip[0] - 8, hip[1] + 2];
  opoly(tor, s.torso, 2.6);
  ctx.save(); ctx.beginPath(); pathPts(tor); ctx.closePath(); ctx.clip();
  if (s.side !== s.torso) { ctx.fillStyle = s.side; ctx.beginPath(); ctx.moveTo(sh[0] - 11, sh[1] + 6); ctx.lineTo(hip[0] - 3, hip[1] + 2); ctx.lineTo(hip[0] - 10, hip[1] + 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(sh[0] + 11, sh[1] + 6); ctx.lineTo(hip[0] + 3, hip[1] + 2); ctx.lineTo(hip[0] + 10, hip[1] + 2); ctx.closePath(); ctx.fill(); }
  if (s.web) { ctx.strokeStyle = s.web; ctx.lineWidth = .9; const cx = sh[0] + 1, cy = sh[1] + 12; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); } ctx.stroke(); for (const r of [6, 12, 19]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); } }
  if (s.bigemb) { ctx.strokeStyle = s.bigemb; ctx.lineWidth = 2.4; const cx = sh[0] + 1, cy = sh[1] + 11; ctx.beginPath(); for (const k of [-1, 1]) { ctx.moveTo(cx, cy); ctx.lineTo(cx + k * 12, cy - 8); ctx.lineTo(cx + k * 14, cy - 2); ctx.moveTo(cx, cy + 2); ctx.lineTo(cx + k * 12, cy + 4); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx + k * 10, cy + 14); ctx.lineTo(cx + k * 12, cy + 20); } ctx.stroke(); ctx.fillStyle = s.bigemb; ctx.beginPath(); ctx.ellipse(cx, cy + 3, 3, 6, 0, 0, TAU); ctx.fill(); }
  if (s.glossy) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(sh[0] + 2, sh[1], 5, 22); }
  if (s.glow) { ctx.strokeStyle = s.web; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sh[0] - 8, sh[1] + 2); ctx.lineTo(hip[0], hip[1]); ctx.moveTo(sh[0] + 8, sh[1] + 2); ctx.lineTo(hip[0], hip[1]); ctx.stroke(); }
  ctx.restore();
  if (s.emb) { const cx = sh[0] + 1, cy = sh[1] + 12; ctx.fillStyle = s.emb; ctx.beginPath(); ctx.ellipse(cx, cy, 2, 4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = s.emb; ctx.lineWidth = 1.1; ctx.beginPath(); for (const k of [-1, 1]) { ctx.moveTo(cx, cy - 1); ctx.lineTo(cx + k * 5, cy - 5); ctx.moveTo(cx, cy + 1); ctx.lineTo(cx + k * 5, cy + 6); ctx.moveTo(cx, cy); ctx.lineTo(cx + k * 6, cy); } ctx.stroke(); }
  if (s.vest) { opoly([sh[0] - 11, sh[1] - 1, sh[0] - 2, sh[1] - 1, hip[0] - 3, hip[1], hip[0] - 9, hip[1] + 1], '#15131c', 2); opoly([sh[0] + 11, sh[1] - 1, sh[0] + 3, sh[1] - 1, hip[0] + 3, hip[1], hip[0] + 9, hip[1] + 1], '#15131c', 2); ctx.fillStyle = '#c8c8d0'; circle(sh[0] + 7, sh[1] + 6, 1.4); circle(sh[0] - 7, sh[1] + 10, 1.4); }
  if (s.hoodie) { opoly([sh[0] - 12, sh[1] - 2, sh[0] + 12, sh[1] - 2, hip[0] + 11, hip[1] - 2, hip[0] - 11, hip[1] - 2], '#2350b5', 2.4); ctx.fillStyle = '#c81f2a'; ctx.beginPath(); ctx.ellipse(sh[0] + 1, sh[1] + 12, 3, 6, 0, 0, TAU); ctx.fill(); }
  limb([hip[0] + 3, hip[1]], p.kF, p.fF, s.legs, s.boots !== s.legs ? s.boots : null);
  orrect(p.fF[0] - 6, p.fF[1] - 5, 15, 6, 3, s.boots, 2);
  olin([sh[0], sh[1] - 2, p.head[0], p.head[1] + 8], 6, s.head === s.torso ? s.torso : s.head);
  tightHead(p.head[0], p.head[1], s);
  limb(shF, p.eF, p.hF, s.arms, s.gloves !== s.arms ? s.gloves : null);
  if (s.fins) { opoly([p.eF[0], p.eF[1], p.hF[0], p.hF[1], lerp(p.eF[0], p.hF[0], .5) - 6, lerp(p.eF[1], p.hF[1], .5) + 8], '#d7263d', 1.6); }
  ocirc(p.hF[0], p.hF[1], 4.4, s.gloves, 2);
}

// ============================================================ people
const LOOKS = {
  peter: { skin: '#efc6a2', hair: 'messy', hairC: '#5a3a22', top: '#f3f3f6', jacket: '#4a78c8', pants: '#2f4fc4', baggy: true, shoes: '#f7f7f4', bag: true },
  peterSuitless: { skin: '#efc6a2', hair: 'messy', hairC: '#5a3a22', top: '#f3f3f6', pants: '#2f4fc4', baggy: true, shoes: '#f7f7f4' },
  felicia: { skin: '#f3dccd', hair: 'platinum', hairC: '#f5f2ec', top: '#141418', jacket: '#2a2a30', pants: null, skirt: '#141418', legs: '#141418', shoes: '#141418', lips: true, fem: true, earring: true },
  feliciaShirt: { skin: '#f3dccd', hair: 'platinum', hairC: '#f5f2ec', top: '#f07a1c', web: true, pants: null, bare: true, shoes: null, lips: true, fem: true, long: true },
  cat: { cat: true },
  may: { skin: '#f0cdb4', hair: 'bun', hairC: '#e2e2e2', glasses: true, top: '#b58aa6', jacket: '#d4a8c0', skirt: '#6a5070', legs: '#e8c0a8', shoes: '#4a3a3a', fem: true, s: .93 },
  jjj: { skin: '#e8b894', hair: 'flattop', hairC: '#9a9a9a', mustache: '#6a6a6a', top: '#ecece4', tie: '#8a2a2a', pants: '#55586a', shoes: '#2a2020', vest: '#55586a' },
  robbie: { skin: '#6b4430', hair: 'short', hairC: '#c8c8c8', glasses: true, top: '#f0f0f0', jacket: '#4a4a3a', tie: '#2a4a8a', pants: '#4a4a3a', shoes: '#1a1a1a' },
  betty: { skin: '#f2d0b8', hair: 'bob', hairC: '#4a2a18', top: '#6a8ac0', skirt: '#34446a', legs: '#f2d0b8', shoes: '#2a2020', lips: true, fem: true },
  otto: { skin: '#e8b894', hair: 'bowl', hairC: '#3a2a1a', goggles: true, top: '#6a6a50', coat: '#eeeeea', pants: '#4a4a3a', shoes: '#2a2020', heavy: true, s: 1.06 },
  ock: { skin: '#e2ad88', hair: 'bowl', hairC: '#2a1e14', goggles: true, glow: true, top: '#3a3a2a', coat: '#3d6a3a', pants: '#2a2a26', shoes: '#1a1a18', heavy: true, s: 1.12, stubble: true },
  rosie: { skin: '#f2d0b8', hair: 'curly', hairC: '#b0522d', top: '#e0b83a', skirt: '#4f7a5a', legs: '#f2d0b8', shoes: '#4a3020', lips: true, fem: true },
  rosieBed: { skin: '#f2d0b8', hair: 'curly', hairC: '#b0522d', top: '#cfe0ea', pants: '#cfe0ea', shoes: null, fem: true },
  nurse: { skin: '#c9956a', hair: 'bun', hairC: '#2a1a10', top: '#6ac0b0', pants: '#6ac0b0', shoes: '#f0f0f0', fem: true },
  menken: { skin: '#f2d0b8', hair: 'slick', hairC: '#1a1a1a', glasses: true, top: '#f4f4f4', jacket: '#1f2024', tie: '#2a8a4a', pants: '#1f2024', shoes: '#101010' },
  norman: { skin: '#eac2a2', hair: 'spiky', hairC: '#b5452a', top: '#e0782a', pants: '#e0782a', shoes: '#f0f0f0' },
  kid: { skin: '#d9a27a', hair: 'short', hairC: '#2a1a10', top: '#3ac07a', pants: '#3a4a8a', shoes: '#e03a3a', s: .62, cap: '#e03a3a' },
  mom: { skin: '#d9a27a', hair: 'long', hairC: '#2a1a10', top: '#e05a8a', skirt: '#3a3a5a', legs: '#d9a27a', shoes: '#2a2020', fem: true },
  girl: { skin: '#f0cdb4', hair: 'pigtails', hairC: '#e0a040', top: '#ff8ad8', skirt: '#6a4ab0', legs: '#f0cdb4', shoes: '#fff', fem: true, s: .7 },
  washer: { skin: '#c9956a', hair: 'cap', hairC: '#e0b83a', top: '#3a7ac0', pants: '#2a3a5a', shoes: '#3a2a1a', vestHi: true },
  worker: { skin: '#d9a27a', hair: 'hardhat', hairC: '#ffd84a', top: '#e07a2a', pants: '#3a3a4a', shoes: '#3a2a1a', vestHi: true },
  pizza: { skin: '#efc6a2', hair: 'cap', hairC: '#d7263d', top: '#d7263d', pants: '#2a2a3a', shoes: '#f0f0f0' },
  lady: { skin: '#e8c0a0', hair: 'bob', hairC: '#8a5a3a', top: '#8a3a5a', skirt: '#2a2a3a', legs: '#e8c0a0', shoes: '#2a2020', fem: true, purse: true },
  cop: { skin: '#b07a54', hair: 'cop', hairC: '#1e2638', top: '#2a3a6a', pants: '#1e2638', shoes: '#101010' },
  driver: { skin: '#e8c0a0', hair: 'short', hairC: '#6a4a2a', top: '#6a8a4a', pants: '#3a3a3a', shoes: '#2a2020' },
  skater: { skin: '#f0cdb4', hair: 'beanie', hairC: '#3a8a6a', top: '#8a6a4a', pants: '#3a4a6a', baggy: true, shoes: '#f0f0f0' },
  granny: { skin: '#f0d0b8', hair: 'bun', hairC: '#f0f0f0', top: '#6a8a6a', skirt: '#5a4a6a', legs: '#f0d0b8', shoes: '#3a2a2a', fem: true, glasses: true, s: .9 },
  office: { skin: '#8a5a3a', hair: 'bob', hairC: '#1a1a1a', top: '#f0f0f0', jacket: '#3a3a4a', skirt: '#3a3a4a', legs: '#8a5a3a', shoes: '#101010', fem: true },
  tourist: { skin: '#f4d4bc', hair: 'short', hairC: '#e0c080', top: '#ff9a3a', pants: '#e8d8a8', shoes: '#fff', camera: true },
  thief: { skin: '#d9a27a', hair: 'hood', hairC: '#3a3a3a', top: '#3a3a3a', pants: '#2a2a2a', shoes: '#f0f0f0' },
  guardOs: { skin: '#c9956a', hair: 'cap', hairC: '#1e2638', top: '#2a3a4a', pants: '#1e2638', shoes: '#101010' },
};
const CIV_KINDS = ['skater', 'office', 'tourist', 'granny', 'driver', 'lady', 'pizza', 'mom'];

function humanHead(L) {
  const hc = L.hairC;
  // back hair
  if (L.hair === 'platinum') {
    ofill(() => { ctx.moveTo(6, -10); ctx.bezierCurveTo(-10, -18, -19, -4, -17, 10); ctx.bezierCurveTo(-16, 24, -22, 34, -12, 40); ctx.bezierCurveTo(-7, 30, -5, 18, -3, 6); ctx.closePath(); }, hc, 2.2);
  } else if (L.hair === 'long') {
    ofill(() => { ctx.moveTo(5, -9); ctx.bezierCurveTo(-9, -15, -16, -2, -14, 10); ctx.bezierCurveTo(-13, 20, -12, 26, -6, 28); ctx.lineTo(-3, 6); ctx.closePath(); }, hc, 2.2);
  } else if (L.hair === 'bun') { ocirc(-8, -9, 5, hc, 2); }
  else if (L.hair === 'curly') { for (let i = 0; i < 5; i++) ocirc(-9 + (i % 2) * 2, -8 + i * 5, 4.5, hc, 1.8); }
  else if (L.hair === 'pigtails') { ocirc(-11, 2, 4, hc, 1.8); ocirc(10, 2, 4, hc, 1.8); }
  // neck and face
  ctx.fillStyle = L.skin; ctx.fillRect(-3.5, 6, 7, 7);
  const jaw = L.fem ? 8.5 : 9;
  ofill(() => { ctx.moveTo(-6, -8); ctx.quadraticCurveTo(4, -14, 9, -6); ctx.quadraticCurveTo(11, 2, 8, 7); ctx.quadraticCurveTo(4, 11, -1, 10); ctx.quadraticCurveTo(-7, 8, -7, 0); ctx.closePath(); }, L.skin, 2.2);
  if (L.stubble) { ctx.fillStyle = 'rgba(40,30,20,.3)'; ctx.beginPath(); ctx.moveTo(-3, 5); ctx.quadraticCurveTo(3, 12, 9, 5); ctx.lineTo(8, 3); ctx.quadraticCurveTo(3, 7, -2, 3); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-7, 7, -1, 10); ctx.quadraticCurveTo(-4, 4, -3, -2); ctx.fill();
  ocirc(-4.5, 0, 2.4, L.skin, 1.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(9.5, -1); ctx.lineTo(11.5, 3); ctx.lineTo(9.5, 3.8); ctx.stroke();
  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5.4, -2, 2.2, 1.7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = INK; circle(6, -2, 1.1);
  if (L.fem) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3, -3.5); ctx.lineTo(8, -3.8); ctx.stroke(); }
  ctx.fillStyle = L.hair === 'platinum' || /e2e2e2|f0f0f0|c8c8c8|9a9a9a/.test(hc) ? '#8a8078' : hc;
  ctx.fillRect(3.2, -5.6, 5, 1.4);
  if (L.lips) { ctx.fillStyle = '#c8203a'; ctx.beginPath(); ctx.ellipse(6.6, 5.2, 2.2, 1.1, 0, 0, TAU); ctx.fill(); }
  else { ctx.strokeStyle = '#6a3a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4.4, 5.4); ctx.quadraticCurveTo(6.4, 6.4, 8.2, 5); ctx.stroke(); }
  if (L.mustache) { ofill(() => { ctx.moveTo(3, 3.4); ctx.quadraticCurveTo(7, 1.6, 11, 3.6); ctx.lineTo(10, 5); ctx.quadraticCurveTo(7, 3.6, 3.5, 5); ctx.closePath(); }, L.mustache, 1); }
  // top hair
  const H = (fn) => ofill(fn, hc, 2.1);
  switch (L.hair) {
    case 'messy': H(() => { ctx.moveTo(-8, 2); ctx.quadraticCurveTo(-11, -11, -2, -12); ctx.lineTo(0, -16); ctx.lineTo(3, -12); ctx.lineTo(7, -15); ctx.lineTo(8, -10); ctx.quadraticCurveTo(11, -7, 10, -4); ctx.quadraticCurveTo(3, -9, -4, -5); ctx.quadraticCurveTo(-6, -2, -6, 2); ctx.closePath(); }); break;
    case 'short': H(() => { ctx.moveTo(-8, 1); ctx.quadraticCurveTo(-9, -12, 2, -12); ctx.quadraticCurveTo(10, -11, 9.5, -5); ctx.quadraticCurveTo(3, -8, -4, -5); ctx.lineTo(-5, 1); ctx.closePath(); }); break;
    case 'flattop': H(() => { ctx.rect(-7, -15, 16, 8); }); H(() => { ctx.rect(-8.5, -8, 4, 8); }); break;
    case 'bob': H(() => { ctx.moveTo(-9, 8); ctx.quadraticCurveTo(-12, -13, 2, -12); ctx.quadraticCurveTo(11, -11, 10.5, -4); ctx.quadraticCurveTo(4, -8, 0, -7); ctx.quadraticCurveTo(-4, -4, -4, 8); ctx.closePath(); }); break;
    case 'bun': H(() => { ctx.ellipse(0, -6, 9, 6.5, 0, Math.PI, TAU); ctx.closePath(); }); break;
    case 'bowl': H(() => { ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-10, -14, 2, -13); ctx.quadraticCurveTo(11, -12, 10.5, -4); ctx.lineTo(-3, -4.5); ctx.lineTo(-4, 2); ctx.closePath(); }); break;
    case 'spiky': H(() => { ctx.moveTo(-8, 2); ctx.lineTo(-10, -6); ctx.lineTo(-6, -9); ctx.lineTo(-7, -15); ctx.lineTo(-1, -11); ctx.lineTo(2, -17); ctx.lineTo(5, -11); ctx.lineTo(10, -12); ctx.lineTo(9, -5); ctx.quadraticCurveTo(2, -8, -4, -4); ctx.lineTo(-5, 2); ctx.closePath(); }); break;
    case 'slick': H(() => { ctx.moveTo(-8, 1); ctx.quadraticCurveTo(-9, -12, 3, -12); ctx.quadraticCurveTo(11, -11, 9.5, -5); ctx.quadraticCurveTo(2, -9, -5, -4); ctx.lineTo(-5, 1); ctx.closePath(); }); break;
    case 'platinum': case 'long': H(() => { ctx.moveTo(-8, 5); ctx.bezierCurveTo(-8, -15, 9, -15, 12, -5); ctx.bezierCurveTo(5, -10, -2, -8, -4, 4); ctx.closePath(); }); break;
    case 'curly': for (let i = 0; i < 4; i++) ocirc(-4 + i * 4, -10 + (i % 2) * 2, 4.2, hc, 1.8); break;
    case 'pigtails': H(() => { ctx.ellipse(1, -6, 9.5, 6.5, 0, Math.PI, TAU); ctx.closePath(); }); break;
    case 'cap': orrect(-8, -14, 17, 8, 4, hc, 2); orrect(4, -8.5, 10, 3, 1, hc, 1.6); break;
    case 'cop': orrect(-8, -15, 17, 9, 3, hc, 2); orrect(3, -8, 11, 3, 1, '#101018', 1.6); ctx.fillStyle = GOLD; ctx.fillRect(1, -13, 4, 4); break;
    case 'hardhat': ofill(() => { ctx.ellipse(1, -8, 10, 7, 0, Math.PI, TAU); ctx.closePath(); }, hc, 2); orrect(-10, -9, 23, 3, 1, hc, 1.6); break;
    case 'beanie': H(() => { ctx.arc(1, -4, 9.8, Math.PI, 0); ctx.closePath(); }); orrect(-9, -6, 20, 4, 2, shade(hc, .8), 1.6); break;
    case 'hood': H(() => { ctx.moveTo(-10, 10); ctx.quadraticCurveTo(-13, -14, 2, -14); ctx.quadraticCurveTo(12, -13, 11, -2); ctx.lineTo(8, -6); ctx.quadraticCurveTo(0, -10, -5, -2); ctx.lineTo(-4, 10); ctx.closePath(); }); break;
  }
  if (L.cap && L.hair === 'short') { orrect(-8, -14, 17, 7, 3, L.cap, 2); orrect(4, -9, 9, 3, 1, L.cap, 1.5); }
  if (L.glasses) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(5.6, -1.8, 3, 0, TAU); ctx.moveTo(2.6, -1.8); ctx.lineTo(-4, -2.4); ctx.stroke(); }
  if (L.goggles) {
    ocirc(5.8, -2, 3.8, '#16161a', 1.6);
    ctx.fillStyle = L.glow ? `rgba(255,${120 + Math.sin(frame * .2) * 40},40,.9)` : 'rgba(140,210,255,.55)'; circle(6.4, -2.6, L.glow ? 2.4 : 1.3);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(2, -2.4); ctx.lineTo(-7, -3.4); ctx.stroke();
  }
  if (L.earring) { ctx.fillStyle = '#fff'; circle(-4.5, 4, 1.2); }
}

// full person; x,y feet world coords
function drawPerson(x, y, face, L, pose, opt = {}) {
  if (L.cat) { drawCat(x, y, face, pose, opt); return; }
  const s = (L.s || 1) * (opt.s || 1);
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
  if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
  if (pose.rot) { ctx.translate(0, -40); ctx.rotate(pose.rot); ctx.translate(0, 40); }
  const p = pose, sh = p.sh, hip = p.hip;
  const shB = [sh[0] - 5, sh[1] + 2], shF = [sh[0] + 5, sh[1] + 2];
  const wT = L.heavy ? 14 : L.fem ? 9 : 10.5;
  const sleeve = L.coat || L.jacket || L.top;
  if (opt.back) opt.back();
  // back arm
  olin([shB[0], shB[1], p.eB[0], p.eB[1], p.hB[0], p.hB[1]], L.heavy ? 8 : 6, L.bare ? L.skin : sleeve);
  ocirc(p.hB[0], p.hB[1], 3.4, L.skin, 1.6);
  // legs
  const leg = (k, f, side) => {
    const hx = hip[0] + side * 3;
    if (L.baggy) { const poly = strip([hx, hip[1], k[0], k[1], f[0], f[1] - 3], [8, 9, 10.5]); opoly(poly, L.pants, 2.2); }
    else if (L.pants) olin([hx, hip[1], k[0], k[1], f[0], f[1] - 2], L.heavy ? 9 : 7, L.pants);
    else olin([hx, hip[1], k[0], k[1], f[0], f[1] - 2], 5, L.legs || L.skin);
    if (L.shoes) orrect(f[0] - 5, f[1] - 5, 13, 5.5, 2.5, L.shoes, 1.8);
  };
  leg(p.kB, p.fB, -1);
  if (L.coat) opoly([sh[0] - wT - 1, sh[1], sh[0] + wT + 1, sh[1], hip[0] + wT + 4, hip[1] + 26, hip[0] - wT - 5, hip[1] + 28], L.coat, 2.4);
  leg(p.kF, p.fF, 1);
  // skirt
  if (L.skirt) opoly([hip[0] - wT + 1, hip[1] - 6, hip[0] + wT - 1, hip[1] - 6, hip[0] + wT + 4, hip[1] + 14, hip[0] - wT - 4, hip[1] + 14], L.skirt, 2.2);
  // torso
  const tor = L.fem
    ? [sh[0] - wT, sh[1], sh[0] + wT, sh[1], hip[0] + wT - 3, hip[1] - 12, hip[0] + wT, hip[1], hip[0] - wT, hip[1], hip[0] - wT + 3, hip[1] - 12]
    : [sh[0] - wT, sh[1], sh[0] + wT, sh[1], hip[0] + wT - 1, hip[1] + 1, hip[0] - wT + 1, hip[1] + 1];
  if (L.long) tor.splice(tor.length - 4, 4, hip[0] + wT + 2, hip[1] + 16, hip[0] - wT - 2, hip[1] + 16);
  opoly([sh[0] - 2, sh[1] - 2, sh[0] + 3, sh[1] - 2, p.head[0] + 1, p.head[1] + 11, p.head[0] - 4, p.head[1] + 11], L.skin, 1.8);
  opoly(tor, L.top, 2.4);
  ctx.save(); ctx.beginPath(); pathPts(tor); ctx.closePath(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(sh[0] - wT - 2, sh[1] - 4, 6, 60);
  if (L.web) { ctx.strokeStyle = '#c0301a'; ctx.lineWidth = 1.1; const cx = sh[0] + 2, cy = sh[1] + 14; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); } ctx.stroke(); for (const r of [6, 12]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); } }
  if (L.vestHi) { ctx.fillStyle = '#d8ff3a'; ctx.fillRect(sh[0] - wT, sh[1] + 12, wT * 2, 4); ctx.fillRect(sh[0] - wT, sh[1] + 20, wT * 2, 4); }
  ctx.restore();
  if (L.vest) { opoly([sh[0] - wT, sh[1] + 2, sh[0] - 2, sh[1] + 2, hip[0] - 2, hip[1] - 2, hip[0] - wT + 1, hip[1]], L.vest, 1.8); opoly([sh[0] + wT, sh[1] + 2, sh[0] + 3, sh[1] + 2, hip[0] + 3, hip[1] - 2, hip[0] + wT - 1, hip[1]], L.vest, 1.8); }
  if (L.tie) opoly([sh[0] + 1, sh[1] + 1, sh[0] + 4, sh[1] + 1, sh[0] + 3.5, sh[1] + 18, sh[0] + 2.5, sh[1] + 20, sh[0] + 1.5, sh[1] + 18], L.tie, 1.2);
  if (L.jacket) { opoly([sh[0] - wT - 1, sh[1] - 1, sh[0] - 1, sh[1] - 1, hip[0] - 1, hip[1] + 2, hip[0] - wT - 1, hip[1] + 2], L.jacket, 2); opoly([sh[0] + wT + 1, sh[1] - 1, sh[0] + 4, sh[1] - 1, hip[0] + 5, hip[1] + 2, hip[0] + wT + 1, hip[1] + 2], L.jacket, 2); }
  if (L.coat) { opoly([sh[0] + wT + 1, sh[1] - 1, sh[0] + 4, sh[1] - 1, hip[0] + 6, hip[1] + 26, hip[0] + wT + 4, hip[1] + 26], L.coat, 2); }
  if (L.bag) { olin([sh[0] + 5, sh[1], hip[0] - 8, hip[1] - 4], 2.4, '#6a4a2a', 2); }
  if (L.purse) { orrect(p.hB[0] - 6, p.hB[1] + 2, 12, 10, 3, '#8a2a4a', 1.8); }
  if (L.camera) { orrect(sh[0] + 2, sh[1] + 16, 10, 7, 2, '#2a2a2a', 1.6); }
  ctx.save(); ctx.translate(p.head[0], p.head[1]); humanHead(L); ctx.restore();
  // front arm
  olin([shF[0], shF[1], p.eF[0], p.eF[1], p.hF[0], p.hF[1]], L.heavy ? 8 : 6, L.bare ? L.skin : sleeve);
  ocirc(p.hF[0], p.hF[1], 3.6, L.skin, 1.6);
  if (opt.front) opt.front();
  ctx.restore();
}

// ============================================================ black cat
function catHair(t, unmasked) {
  const sw = Math.sin(t * .06) * 3;
  ofill(() => { ctx.moveTo(4, -11); ctx.bezierCurveTo(-11, -18, -20, -4, -18 + sw * .3, 10); ctx.bezierCurveTo(-17, 26, -24 + sw, 38, -14 + sw, 46); ctx.bezierCurveTo(-8, 34, -6, 20, -4, 7); ctx.closePath(); }, '#f5f2ec', 2.2);
  ctx.strokeStyle = 'rgba(160,150,170,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-15, 20, -13 + sw, 38); ctx.stroke();
}
function catFace(unmasked) {
  ofill(() => { ctx.moveTo(-6, -8); ctx.quadraticCurveTo(4, -13, 9, -6); ctx.quadraticCurveTo(10.5, 2, 7.5, 7); ctx.quadraticCurveTo(3.5, 10.5, -1, 9.5); ctx.quadraticCurveTo(-7, 8, -7, 0); ctx.closePath(); }, '#f3dccd', 2.2);
  if (!unmasked) ofill(() => { ctx.moveTo(-7, -4); ctx.quadraticCurveTo(2, -8, 11, -5); ctx.lineTo(10, -1); ctx.quadraticCurveTo(2, -2.5, -6, 0); ctx.closePath(); }, '#0b0b10', 1.4);
  ctx.fillStyle = unmasked ? '#2f7a6a' : '#6fe0c6'; ctx.beginPath(); ctx.ellipse(6, -3, 1.7, 1.1, 0, 0, TAU); ctx.fill();
  if (unmasked) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3.5, -4.8); ctx.lineTo(9, -5.4); ctx.stroke(); }
  ctx.fillStyle = '#d11a3a'; ctx.beginPath(); ctx.ellipse(6.8, 5, 2.3, 1.2, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(9.5, -1); ctx.lineTo(11, 2.4); ctx.stroke();
  ofill(() => { ctx.moveTo(-8, 2); ctx.bezierCurveTo(-7, -15, 9, -15, 12, -6); ctx.bezierCurveTo(4, -11, -2, -9, -4, 1); ctx.closePath(); }, '#ffffff', 1.8);
}
function drawCat(x, y, face, pose, opt = {}) {
  const s = (opt.s || 1) * .96;
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
  if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
  if (pose.rot) { ctx.translate(0, -40); ctx.rotate(pose.rot); ctx.translate(0, 40); }
  const p = pose, sh = p.sh, hip = p.hip, BL = '#16141c', FUR = '#f7f4ee';
  const shB = [sh[0] - 4, sh[1] + 2], shF = [sh[0] + 4, sh[1] + 2];
  ctx.save(); ctx.translate(p.head[0], p.head[1]); catHair(frame, opt.unmasked); ctx.restore();
  olin([shB[0], shB[1], p.eB[0], p.eB[1], p.hB[0], p.hB[1]], 5, BL);
  oell(lerp(p.eB[0], p.hB[0], .75), lerp(p.eB[1], p.hB[1], .75), 3.4, 2.4, 0, FUR, 1.4);
  const leg = (k, f, side) => { olin([hip[0] + side * 3, hip[1], k[0], k[1], f[0], f[1] - 2], 6, BL); oell(lerp(k[0], f[0], .72), lerp(k[1], f[1], .72), 4, 2.6, 0, FUR, 1.4); orrect(f[0] - 4, f[1] - 5, 11, 5, 2, BL, 1.6); };
  leg(p.kB, p.fB, -1);
  const tor = [sh[0] - 9, sh[1], sh[0] + 9, sh[1], hip[0] + 6, hip[1] - 12, hip[0] + 9, hip[1], hip[0] - 9, hip[1], hip[0] - 6, hip[1] - 12];
  leg(p.kF, p.fF, 1);
  opoly(tor, BL, 2.4);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sh[0] + 3, sh[1] + 2); ctx.lineTo(hip[0] + 3, hip[1] - 2); ctx.stroke();
  oell(sh[0] + 1, sh[1], 9, 3.8, 0, FUR, 1.8);
  opoly([sh[0], sh[1] + 2, sh[0] + 4, sh[1] + 2, sh[0] + 2, sh[1] + 10], FUR, 1.2);
  ctx.save(); ctx.translate(p.head[0], p.head[1]); catFace(opt.unmasked); ctx.restore();
  olin([shF[0], shF[1], p.eF[0], p.eF[1], p.hF[0], p.hF[1]], 5, BL);
  oell(lerp(p.eF[0], p.hF[0], .75), lerp(p.eF[1], p.hF[1], .75), 3.4, 2.4, 0, FUR, 1.4);
  if (opt.claws) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(p.hF[0], p.hF[1] - 2 + i * 2); ctx.lineTo(p.hF[0] + 6, p.hF[1] - 4 + i * 3); } ctx.stroke(); }
  ctx.restore();
}

// ============================================================ doctor octopus arms
// base: world point; tip; claw open 0..1; lights
function drawTentacle(bx, by, tx, ty, cx, cy, open, opt = {}) {
  const N = 16, pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * bx + 2 * u * t * cx + t * t * tx, u * u * by + 2 * u * t * cy + t * t * ty]); }
  const r0 = opt.r || 6.5;
  ctx.fillStyle = INK;
  for (let i = 0; i <= N; i++) { const r = r0 - i * .12; circle(pts[i][0], pts[i][1], r + 2.2); }
  for (let i = 0; i <= N; i++) { const r = r0 - i * .12; ctx.fillStyle = i % 2 ? '#7a808e' : '#9aa0ae'; circle(pts[i][0], pts[i][1], r); ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(pts[i][0] - r * .3, pts[i][1] - r * .35, r * .35); }
  // claw
  const a = Math.atan2(ty - pts[N - 2][1], tx - pts[N - 2][0]);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
  const o = .25 + open * .6;
  for (const k of [-1, 0, 1]) {
    const ang = k * o;
    ctx.save(); ctx.rotate(ang);
    opoly([2, -3, 16, -2.5, 22, 0, 16, 2.5, 2, 3], '#b8bec8', 1.8);
    ctx.restore();
  }
  ocirc(0, 0, 6.5, '#4a4e58', 2);
  ctx.fillStyle = opt.glow || '#ff4a2a'; circle(0, 0, 2.6);
  if (opt.glow) { ctx.fillStyle = 'rgba(255,90,40,.25)'; circle(0, 0, 9); }
  ctx.restore();
}

// ============================================================ enemies
const ELOOK = {
  thug: { skin: '#d9a27a', hair: 'beanie', hairC: '#b3263a', top: '#6b2f4f', pants: '#2c2c3a', baggy: true, shoes: '#f0f0f0' },
  thug2: { skin: '#8a5a3a', hair: 'short', hairC: '#1a1a1a', top: '#3a6a8a', pants: '#2c2c3a', baggy: true, shoes: '#d0d0d0' },
  merc: { skin: '#c9956a', hair: 'helmet', hairC: '#3a3f4a', top: '#4a505c', pants: '#2a2e36', shoes: '#15151a', armor: '#e07a2a' },
  medic: { skin: '#d9a27a', hair: 'helmet', hairC: '#f0f0f0', top: '#f0f0f0', pants: '#3a3f4a', shoes: '#15151a', armor: '#e07a2a' },
  jammer: { skin: '#c9956a', hair: 'helmet', hairC: '#2a2e36', top: '#2a2e36', pants: '#1a1c22', shoes: '#15151a', armor: '#6a3ae0' },
  brute: { skin: '#c99a7a', hair: 'helmet', hairC: '#2a2e36', top: '#3a3f4a', pants: '#2a2e36', shoes: '#15151a', heavy: true, armor: '#e07a2a', s: 1.25 },
  guard: { skin: '#c9956a', hair: 'cop', hairC: '#1e2638', top: '#2a3a4a', pants: '#1e2638', shoes: '#101010', s: 1 },
};
function mercHelmet(L) {
  ofill(() => { ctx.moveTo(-9, 4); ctx.quadraticCurveTo(-11, -14, 2, -14); ctx.quadraticCurveTo(12, -13, 11, -1); ctx.lineTo(11, 3); ctx.lineTo(-9, 4); ctx.closePath(); }, L.hairC, 2.2);
  orrect(1, -6, 11, 5, 2, L.armor || '#e07a2a', 1.6);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(3, -5, 4, 1.5);
}
function enemyPose(e) {
  const t = e.anim || 0;
  switch (e.st) {
    case 'windup': return e.type === 'brute' ? mkPose({ hF: [10, -96], hB: [-4, -94], sh: [-2, -64], head: [0, -78] }) : mkPose({ hip: [-2, -40], sh: [-6, -63], head: [-4, -77], hF: [-14, -60], hB: [-18, -50] });
    case 'attack': return e.type === 'brute' ? mkPose({ hF: [30, -20], hB: [26, -24], sh: [10, -56], head: [16, -68] }) : POSES.jab();
    case 'block': return mkPose({ hF: [14, -74], hB: [12, -70], ebF: 1, ebB: 1 });
    case 'stagger': case 'hurt': return POSES.hurt();
    case 'air': return POSES.fall();
    case 'down': case 'ko': return POSES.lie();
    case 'aim': case 'fire': return mkPose({ hF: [28, -60], hB: [18, -58] });
    case 'crouch': return POSES.crouch();
    case 'revive': return POSES.kneel();
    default: return Math.abs(e.vx) > .3 ? POSES.run(t) : POSES.idle(frame + (e.seed || 0) * 50);
  }
}
function drawEnemy(e) {
  if (e.type === 'drone') { drawDrone(e); return; }
  const L = ELOOK[e.look || e.type] || ELOOK.merc;
  const pose = enemyPose(e);
  const fl = e.flash > 0 && frame % 4 < 2;
  const x = e.x + e.w / 2, y = e.y + e.h;
  if (e.st === 'cocoon') {
    ctx.save(); ctx.translate(x, y);
    oell(0, -14, 26, 14, 0, '#f4f4f8', 2.4);
    ctx.strokeStyle = 'rgba(120,120,150,.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -20; i <= 20; i += 7) { ctx.moveTo(i, -26); ctx.lineTo(i + 6, -2); } ctx.stroke();
    ctx.restore(); return;
  }
  const helmet = L.hair === 'helmet';
  const L2 = helmet ? Object.assign({}, L, { hair: 'none' }) : L;
  drawPerson(x, y, e.face, L2, pose, {
    back: () => {
      if (e.type === 'medic' || e.type === 'jammer') { orrect(pose.sh[0] - 18, pose.sh[1] - 2, 11, 22, 3, e.type === 'medic' ? '#f0f0f0' : '#3a3f4a', 2); if (e.type === 'medic') { ctx.fillStyle = '#e03a3a'; ctx.fillRect(pose.sh[0] - 14, pose.sh[1] + 4, 3, 10); ctx.fillRect(pose.sh[0] - 17, pose.sh[1] + 7.5, 9, 3); } else { olin([pose.sh[0] - 12, pose.sh[1] - 2, pose.sh[0] - 12, pose.sh[1] - 26], 1.5, '#9aa0aa', 2); ctx.fillStyle = frame % 20 < 10 ? '#b88aff' : '#6a3ae0'; circle(pose.sh[0] - 12, pose.sh[1] - 27, 3); } }
    },
    front: () => {
      if (helmet) { ctx.save(); ctx.translate(pose.head[0], pose.head[1]); mercHelmet(L); ctx.restore(); }
      if (L.armor && e.type !== 'thug') { orrect(pose.sh[0] - 8, pose.sh[1] + 4, 16, 14, 3, shade(L.top, .8), 1.6); ctx.fillStyle = L.armor; ctx.fillRect(pose.sh[0] - 6, pose.sh[1] + 9, 12, 3); }
      if (e.type === 'gunner' || e.type === 'guard') { orrect(pose.hF[0] - 4, pose.hF[1] - 5, 24, 7, 2, '#2a2e36', 1.6); ctx.fillStyle = '#e07a2a'; ctx.fillRect(pose.hF[0] + 12, pose.hF[1] - 4, 6, 2); }
      if (e.type === 'guard') { ctx.fillStyle = 'rgba(255,250,200,.9)'; circle(pose.hF[0] + 20, pose.hF[1] - 2, 2.4); }
      if (e.type === 'brute' && e.shield) {
        ctx.save(); ctx.translate(pose.hF[0] + 6, pose.hF[1] - 10);
        orrect(0, -26, 10, 56, 3, '#8aa0b8', 2.4);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(3, -22, 2, 46);
        ctx.fillStyle = '#e07a2a'; circle(5, 2, 3);
        ctx.restore();
      }
      if (e.type === 'thug' && e.bat) olin([pose.hF[0], pose.hF[1], pose.hF[0] + 20, pose.hF[1] - 18], 3.5, '#b08a5a', 2);
    },
    s: (L.s || 1),
    alpha: e.st === 'ko' ? .85 : 1,
  });
  if (fl) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(e.x - 6, e.y - 6, e.w + 12, e.h + 8); ctx.restore(); }
  if (e.web > 0 && e.st !== 'ko') {
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i < e.web * 3; i++) { const yy = e.y + 10 + i * 9; ctx.moveTo(e.x - 3, yy); ctx.lineTo(e.x + e.w + 3, yy + 6); }
    ctx.stroke();
  }
}
function drawDrone(e) {
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  ctx.save(); ctx.translate(x, y); if (e.st === 'down') ctx.rotate(.6);
  for (let i = -1; i <= 1; i++) { const a = Math.PI / 2 + i * .5 + Math.sin(frame * .15 + i) * .2; olin([0, 6, Math.cos(a) * 14, 6 + Math.sin(a) * 14, Math.cos(a + .3) * 20, 6 + Math.sin(a + .3) * 20], 2.4, '#8a8e98', 2.5); }
  ocirc(0, 0, 13, e.flash > 0 && frame % 4 < 2 ? '#fff' : '#b0783a', 2.4);
  halftone(() => ctx.arc(0, 0, 12, 0, TAU), HT_SOFT);
  ocirc(e.face * 4, -1, 5, '#15131c', 1.6);
  ctx.fillStyle = e.st === 'aim' ? '#ff3a2a' : '#ffb03a'; circle(e.face * 5, -1, 2.6);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; circle(-5, -6, 3);
  if (e.web > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(14, 8); ctx.moveTo(14, -8); ctx.lineTo(-14, 8); ctx.stroke(); }
  ctx.restore();
}

// ============================================================ misc props
function drawHotdog(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,216,74,.2)'; circle(0, 0, 18);
  oell(0, 3, 15, 6, 0, '#e0a458', 2); oell(0, 0, 16, 3.6, 0, '#c24a2c', 1.6);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = -10; i <= 10; i += 5) { ctx.moveTo(i - 2, -1); ctx.lineTo(i + 2, 1); } ctx.stroke();
  ctx.restore();
}
function drawToken(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(frame * .08), 1);
  ocirc(0, 0, 11, GOLD, 2.2); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 4, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); for (const k of [-1, 1]) { ctx.moveTo(0, -1); ctx.lineTo(k * 6, -6); ctx.moveTo(0, 1); ctx.lineTo(k * 6, 6); ctx.moveTo(0, 0); ctx.lineTo(k * 7, 0); } ctx.stroke();
  ctx.restore();
}
function drawStar(x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
}
function drawCar(x, y, col, face = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(face, 1);
  opoly([-44, -8, -40, -22, -18, -24, -8, -38, 22, -38, 32, -24, 44, -20, 46, -8], col, 2.6);
  opoly([-4, -34, 20, -34, 27, -24, -12, -24], '#9ad0f0', 2);
  ocirc(-26, -6, 9, '#222', 2.2); ocirc(28, -6, 9, '#222', 2.2); ctx.fillStyle = '#aaa'; circle(-26, -6, 3); circle(28, -6, 3);
  ctx.fillStyle = '#fff6b0'; ctx.fillRect(40, -18, 5, 4);
  ctx.restore();
}
function drawCatSmall(x, y, face = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  oell(0, -6, 9, 6, 0, '#e08a3a', 1.8); ocirc(8, -12, 5, '#e08a3a', 1.8);
  opoly([5, -16, 6, -21, 9, -16], '#e08a3a', 1.4); opoly([9, -16, 11, -21, 12, -15], '#e08a3a', 1.4);
  olin([-8, -8, -14, -16], 2.4, '#e08a3a', 2); ctx.fillStyle = INK; circle(10, -13, 1);
  ctx.restore();
}

// portrait heads (centered)
function portraitOf(who, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const suit = SUITS[SAVE.suit] || SUITS.street;
  switch (who) {
    case 'spidey': if (suit.street) streetHead(0, 2); else tightHead(0, 0, suit); break;
    case 'spideyClassic': tightHead(0, 0, SUITS.classic); break;
    case 'cat': ctx.translate(1, -1); catHair(frame); catFace(false); break;
    case 'felicia': ctx.translate(1, -1); catHair(frame); catFace(true); break;
    case 'arms': ctx.scale(.7, .7); drawTentacle(-24, 24, 6, -4, -20, -8, .8, { r: 5, glow: '#ff4a2a' }); break;
    case 'ock': humanHead(LOOKS.ock); break;
    case 'radio': orrect(-10, -8, 20, 16, 3, '#6a3a2a', 2); ctx.fillStyle = '#e0c080'; circle(-3, 0, 4); ctx.fillStyle = INK; ctx.fillRect(3, -4, 5, 2); ctx.fillRect(3, 0, 5, 2); break;
    case 'phone': orrect(-7, -12, 14, 24, 3, '#2a2a30', 2); ctx.fillStyle = '#6a8aff'; ctx.fillRect(-5, -9, 10, 16); break;
    default: { const L = LOOKS[who] || ELOOK[who]; if (L) { if (L.hair === 'helmet') { humanHead(Object.assign({}, L, { hair: 'none' })); mercHelmet(L); } else humanHead(L); } }
  }
  ctx.restore();
}
