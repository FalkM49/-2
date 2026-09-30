'use strict';
// ============================================================ sky and skyline layers
const PALETTES = {
  night: { sky: ['#07061a', '#1d1747', '#4b2a5e'], far: '#1b1840', mid: '#241d4b', win: '#ffd88a', winOff: '#2d2658', bldg: ['#2a2350', '#302a5c', '#28224a', '#34285a'], ledge: '#4a3e86', street: '#1a1726', walk: '#3a3452' },
  day: { sky: ['#5ab0f0', '#9ad4ff', '#e8f4ff'], far: '#a8b8d8', mid: '#8898bc', win: '#dff2ff', winOff: '#6a7a9a', bldg: ['#c99a7a', '#a8b4c8', '#d8c09a', '#b08a8a', '#9aa8a0'], ledge: '#6a5a6a', street: '#4a4a52', walk: '#9a98a8' },
  dusk: { sky: ['#2a1f5a', '#c8607a', '#ffb070'], far: '#6a3a6a', mid: '#4a2a5a', win: '#ffd88a', winOff: '#5a3a6a', bldg: ['#5a3a6a', '#4a3060', '#6a4070', '#523664'], ledge: '#8a5a8a', street: '#2a2030', walk: '#5a4a62' },
};
function makeSkyline(seed, pal, minH, maxH, base, width, layer) {
  const c = document.createElement('canvas'); c.width = Math.round(width * DPR); c.height = Math.round(640 * DPR); c.lw = width;
  const g = c.getContext('2d'); g.scale(DPR, DPR); const r = rng(seed);
  let x = 0;
  g.lineJoin = 'round';
  while (x < width) {
    const w = 50 + r() * 100, h = minH + r() * (maxH - minH);
    const col = layer === 'far' ? pal.far : pal.mid;
    g.fillStyle = col; g.strokeStyle = 'rgba(10,6,20,.55)'; g.lineWidth = 2;
    g.beginPath(); g.rect(x, base - h, w, 640); g.fill(); g.stroke();
    if (r() < .35) { g.beginPath(); g.rect(x + w / 2 - 2, base - h - 30, 4, 30); g.fill(); g.stroke(); }
    if (r() < .2) { g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + w / 2, base - h - 36); g.lineTo(x + w, base - h); g.fill(); g.stroke(); }
    g.fillStyle = pal.win;
    for (let yy = base - h + 12; yy < 640; yy += 16) for (let xx = x + 7; xx < x + w - 9; xx += 13) if (r() < (layer === 'far' ? .14 : .22)) g.fillRect(xx, yy, 5, 7);
    x += w + (r() < .3 ? r() * 16 : 0);
  }
  return c;
}
// skyline layers are built lazily per theme at the current resolution, so they blit 1:1
const SKY_LAYERS = {};
function skyLayers(k) {
  const key = k + '@' + DPR;
  if (!SKY_LAYERS[key]) {
    for (const old in SKY_LAYERS) if (old.startsWith(k + '@')) delete SKY_LAYERS[old];
    SKY_LAYERS[key] = { far: makeSkyline(11 + k.length, PALETTES[k], 120, 320, 560, 1800, 'far'), mid: makeSkyline(29 + k.length, PALETTES[k], 80, 260, 620, 1800, 'mid') };
  }
  return SKY_LAYERS[key];
}
const STARS = Array.from({ length: 110 }, (_, i) => ({ x: hash(i, 1) * W, y: hash(i, 2) * 320, r: hash(i, 3) * 1.5 + .3, p: hash(i, 4) * 6 }));
const CLOUDS = Array.from({ length: 8 }, (_, i) => ({ x: hash(i, 9) * 1800, y: 40 + hash(i, 8) * 160, s: .6 + hash(i, 7) * .8 }));
function tileX(img, off, dy) {
  const lw = img.lw || img.width; let x = -(((off % lw) + lw) % lw);
  // snap to device pixels so the blit stays unfiltered
  dy = Math.round(dy * DPR) / DPR;
  for (; x < W; x += lw) { const sx = Math.round(x * DPR) / DPR; ctx.drawImage(img, sx, dy, lw, 640); }
}
function drawCloud(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ofill(() => { ctx.arc(0, 0, 20, Math.PI, 0); ctx.arc(28, -6, 26, Math.PI, 0); ctx.arc(60, 0, 18, Math.PI, 0); ctx.lineTo(78, 8); ctx.lineTo(-20, 8); ctx.closePath(); }, '#ffffff', 2);
  ctx.restore();
}
// static sky (gradient + halftone + stars + moon) is baked once per theme and resolution
const SKY_CACHE = {};
function skyBase(theme) {
  const key = theme + '@' + DPR;
  if (SKY_CACHE[key]) return SKY_CACHE[key];
  for (const k in SKY_CACHE) if (!k.endsWith('@' + DPR)) delete SKY_CACHE[k];
  const pal = PALETTES[theme] || PALETTES.night;
  const c = document.createElement('canvas'); c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
  const main = ctx; const g2 = c.getContext('2d'); g2.setTransform(DPR, 0, 0, DPR, 0, 0); g2.lineCap = g2.lineJoin = 'round';
  ctx = g2;
  try {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(.55, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = theme === 'day' ? HT_LIGHT : HT_SOFT; ctx.fillRect(0, 0, W, H);
    if (theme !== 'day') {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (const s of STARS) ctx.fillRect(s.x, s.y, s.r, s.r);
      const mx = 770, my = 110;
      const mg = ctx.createRadialGradient(mx, my, 30, mx, my, 190);
      mg.addColorStop(0, 'rgba(255,240,190,.35)'); mg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 190, my - 190, 380, 380);
      ocirc(mx, my, 60, theme === 'dusk' ? '#ffe0b0' : '#f7ecbc', 3);
      halftone(() => ctx.arc(mx, my, 58, 0, TAU), HT_SOFT);
    } else ocirc(140, 90, 44, '#fff3a0', 3);
  } finally { ctx = main; }
  return (SKY_CACHE[key] = c);
}
let CLOUD_IMG = null;
function cloudSprite() {
  if (CLOUD_IMG && CLOUD_IMG.dpr === DPR) return CLOUD_IMG;
  const c = document.createElement('canvas'), k = DPR * 1.4; c.width = Math.ceil(110 * k); c.height = Math.ceil(46 * k);
  const main = ctx; ctx = c.getContext('2d'); ctx.setTransform(k, 0, 0, k, 24 * k, 34 * k); ctx.lineCap = ctx.lineJoin = 'round';
  try { drawCloud(0, 0, 1); } finally { ctx = main; }
  c.dpr = DPR; c.k = k; return (CLOUD_IMG = c);
}
function drawSky(theme, cx, cy, lvlH) {
  ctx.drawImage(skyBase(theme), 0, 0, W, H);
  if (theme !== 'day') {
    // a handful of twinkling stars on top of the baked ones
    ctx.fillStyle = '#fff';
    for (let i = 0; i < STARS.length; i += 5) { const s = STARS[i]; ctx.globalAlpha = .5 + .5 * Math.sin(frame * .03 + s.p); ctx.fillRect(s.x - .5, s.y - .5, s.r + 1, s.r + 1); }
    ctx.globalAlpha = 1;
  } else {
    const cs = cloudSprite();
    for (const c of CLOUDS) { const x = ((c.x - cx * .05) % 1900 + 1900) % 1900 - 100; ctx.drawImage(cs, x - 24 * c.s, c.y - 34 * c.s, cs.width / cs.k * c.s, cs.height / cs.k * c.s); }
  }
  const lift = lvlH ? Math.max(0, (lvlH - H) - cy) : 0;
  const L = skyLayers(SKY_LAYERS && PALETTES[theme] ? theme : 'night');
  tileX(L.far, cx * .15, -60 + lift * .12);
  tileX(L.mid, cx * .35, -40 + lift * .3);
}
function drawRiverBg(cx, cy, lvlH, fire) {
  drawSky('night', cx, cy, lvlH);
  const lift = lvlH ? Math.max(0, (lvlH - H) - cy) : 0;
  const wy = 400 + lift * .45;
  // bridge silhouette
  ctx.save(); ctx.translate(-((cx * .2) % 1400), wy - 180);
  for (let k = 0; k < 2; k++) {
    const bx = k * 1400 + 300;
    ctx.fillStyle = '#16122e'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.fillRect(bx, 20, 30, 170); ctx.fillRect(bx + 500, 20, 30, 170); ctx.fillRect(bx - 200, 150, 1000, 14);
    ctx.strokeStyle = '#2a2458'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 200, 150); ctx.quadraticCurveTo(bx + 15, 40, bx + 15, 22); ctx.moveTo(bx + 15, 22); ctx.quadraticCurveTo(bx + 265, 170, bx + 515, 22); ctx.moveTo(bx + 515, 22); ctx.quadraticCurveTo(bx + 700, 40, bx + 800, 150); ctx.stroke();
  }
  ctx.restore();
  const g = ctx.createLinearGradient(0, wy, 0, H);
  g.addColorStop(0, '#1a1a3a'); g.addColorStop(1, '#07061a');
  ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy + 20);
  ctx.strokeStyle = 'rgba(255,230,160,.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const y = wy + 10 + i * 12, x = ((i * 137 - cx * .4 + frame * .3) % (W + 100) + W + 100) % (W + 100) - 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + i * 2, y); ctx.stroke(); }
  if (fire) glow(W / 2, H, 500, [0, 'rgba(255,120,40,.35)', 1, 'rgba(255,120,40,0)'], .1);
}
function drawInteriorBg(cx, cy, style) {
  ctx.fillStyle = style === 'oscorp' ? '#141a24' : '#1c1620'; ctx.fillRect(0, 0, W, H);
  const off = cx * .5, offY = cy * .5;
  for (let i = Math.floor(off / 140) - 1; i < Math.floor(off / 140) + 9; i++) {
    const x = i * 140 - off;
    ctx.fillStyle = i % 2 ? '#1b2230' : '#1e2636'; ctx.fillRect(x, 0, 136, H);
    ctx.fillStyle = '#2a3446'; ctx.fillRect(x, ((120 - offY) % 300 + 300) % 300, 140, 6);
    if (style === 'oscorp' && hash(i, 3) < .4) { ctx.fillStyle = '#0f1a14'; ctx.fillRect(x + 30, 150, 70, 100); ctx.fillStyle = '#3aff9a'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 36, 160 + k * 20, 20 + ((frame + k * 30 + i * 7) % 40), 4); }
  }
  ctx.fillStyle = HT_SOFT; ctx.fillRect(0, 0, W, H);
}

// ============================================================ level solids
function bldgColor(b, pal) { return pal.bldg[Math.floor(hash(b.id, 17) * pal.bldg.length)]; }
function drawBuilding(b, pal, L) {
  const col = bldgColor(b, pal);
  const top = b.y, bot = Math.min(b.y + b.h, L.h + 40);
  // only the on-screen part of the facade is filled
  const vy0 = Math.max(top, camY - 20), vy1 = Math.min(bot, camY + H + 20);
  const vx0 = Math.max(b.x, camX - 20), vx1 = Math.min(b.x + b.w, camX + W + 20);
  if (vy1 > vy0 && vx1 > vx0) {
    ctx.fillStyle = col; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    ctx.fillStyle = HT_SOFT; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    const sx = Math.max(vx0, b.x + b.w - 12);
    if (sx < vx1) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(sx, vy0, vx1 - sx, vy1 - vy0); }
  }
  // windows: batched into one path per colour
  const x0 = Math.max(b.x + 14, camX - 40), x1 = Math.min(b.x + b.w - 18, camX + W + 40);
  const y0 = Math.max(top + 30, camY - 40), y1 = Math.min(bot, camY + H + 40);
  const rs = Math.floor((y0 - top - 30) / 38), cs = Math.floor((x0 - b.x - 14) / 30);
  const day = L.theme === 'day', thr = day ? .7 : .3;
  const lit = new Path2D(), off = new Path2D(), glint = day ? new Path2D() : null;
  for (let r = Math.max(0, rs), yy = top + 30 + Math.max(0, rs) * 38; yy < y1; r++, yy += 38) {
    for (let c = Math.max(0, cs), xx = b.x + 14 + Math.max(0, cs) * 30; xx < x1; c++, xx += 30) {
      if (hash(b.id * 131 + r, c) < thr) { lit.rect(xx, yy, 15, 20); if (glint) glint.rect(xx + 2, yy + 2, 3, 12); } else off.rect(xx, yy, 15, 20);
    }
  }
  ctx.fillStyle = pal.win; ctx.fill(lit); ctx.fillStyle = pal.winOff; ctx.fill(off);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(lit); ctx.stroke(off);
  if (glint) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(glint); }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(b.x, top, b.w, bot - top + 4);
  // cornice
  orrect(b.x - 5, top - 4, b.w + 10, 12, 1, pal.ledge, 2.5);
  // fire escape
  if (b.fire) {
    const fx = b.x + b.w * .3;
    ctx.strokeStyle = '#15101e'; ctx.lineWidth = 2;
    for (let yy = top + 70; yy < bot - 60; yy += 76) { ctx.strokeRect(fx, yy, 60, 4); ctx.beginPath(); for (let k = 0; k < 60; k += 6) { ctx.moveTo(fx + k, yy); ctx.lineTo(fx + k, yy - 14); } ctx.moveTo(fx, yy - 14); ctx.lineTo(fx + 60, yy - 14); ctx.moveTo(fx + 8, yy + 4); ctx.lineTo(fx + 30, yy + 76); ctx.stroke(); }
  }
  for (const pr of b.props || []) drawRoofProp(pr, b);
}
function drawRoofProp(pr, b) {
  const x = pr.x, y = b.y - 4;
  switch (pr.k) {
    case 'tank':
      olin([x - 16, y, x - 12, y - 32], 3, '#5a3a2a', 2); olin([x + 16, y, x + 12, y - 32], 3, '#5a3a2a', 2);
      orrect(x - 22, y - 76, 44, 46, 3, '#7a4a32', 2.4);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 22 + i * 11, y - 76); ctx.lineTo(x - 22 + i * 11, y - 30); ctx.stroke(); }
      opoly([x - 26, y - 76, x, y - 94, x + 26, y - 76], '#4a2e22', 2.4);
      break;
    case 'ac': orrect(x - 20, y - 24, 40, 24, 3, '#6a6a80', 2.2); ocirc(x, y - 12, 7, '#3a3a4a', 1.8); break;
    case 'antenna': olin([x, y, x, y - 80], 2.5, '#6a6a80', 2); olin([x - 12, y - 58, x + 12, y - 58], 2, '#6a6a80', 2); if (frame % 80 < 40) { ctx.fillStyle = '#ff3a4a'; circle(x, y - 82, 3.5); } break;
    case 'bill': {
      olin([x - 30, y, x - 30, y - 50], 3, '#3a3a4a', 2); olin([x + 30, y, x + 30, y - 50], 3, '#3a3a4a', 2);
      orrect(x - 56, y - 118, 112, 70, 3, pr.c || '#e05a3a', 2.6);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `12px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(pr.t || 'ПИЦЦА', x, y - 78); ctx.textAlign = 'left';
      halftone(() => ctx.rect(x - 56, y - 118, 112, 70), HT_SOFT);
      break;
    }
    case 'vent': orrect(x - 8, y - 30, 16, 30, 2, '#5a5a6a', 2); orrect(x - 12, y - 36, 24, 8, 2, '#5a5a6a', 2); break;
    case 'garden': for (let i = 0; i < 3; i++) { orrect(x - 30 + i * 22, y - 14, 18, 14, 2, '#8a5a3a', 1.8); ocirc(x - 21 + i * 22, y - 20, 9, '#3a8a4a', 1.8); } break;
  }
}
function drawSolid(s, L) {
  const pal = PALETTES[L.theme] || PALETTES.night;
  switch (s.kind) {
    case 'bldg': drawBuilding(s, pal, L); break;
    case 'street': {
      ctx.fillStyle = pal.street; ctx.fillRect(s.x, s.y, s.w, s.h);
      orrect(s.x - 2, s.y - 2, s.w + 4, 14, 0, pal.walk, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let x = Math.max(s.x, Math.floor(camX / 80) * 80); x < Math.min(s.x + s.w, camX + W + 80); x += 80) ctx.fillRect(x, s.y + 40, 40, 4);
      break;
    }
    case 'pier': {
      ctx.fillStyle = '#4a3222'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = s.x; x < s.x + s.w; x += 26) { ctx.moveTo(x, s.y); ctx.lineTo(x, s.y + 14); }
      ctx.stroke();
      ctx.fillStyle = '#3a2618'; for (let x = s.x + 20; x < s.x + s.w; x += 90) { ctx.fillRect(x, s.y + s.h, 14, 300); ctx.strokeStyle = INK; ctx.strokeRect(x, s.y + s.h, 14, 300); }
      break;
    }
    case 'metal': {
      ctx.fillStyle = '#2e3644'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = HT_SOFT; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#4a5468'; ctx.fillRect(s.x, s.y, s.w, 6);
      break;
    }
    case 'plat': {
      const c = s.style === 'awning' ? (s.c || '#d7263d') : '#8a8aa0';
      if (s.style === 'awning') {
        opoly([s.x, s.y, s.x + s.w, s.y, s.x + s.w + 6, s.y + 16, s.x - 6, s.y + 16], c, 2.2);
        ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let x = s.x; x < s.x + s.w; x += 24) ctx.fillRect(x, s.y + 1, 12, 14);
      } else {
        orrect(s.x, s.y, s.w, 7, 1, c, 2.2);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let x = s.x; x < s.x + s.w; x += 22) { ctx.moveTo(x, s.y + 7); ctx.lineTo(x + 11, s.y + 20); ctx.lineTo(x + 22, s.y + 7); }
        ctx.stroke(); ctx.fillStyle = c; ctx.fillRect(s.x, s.y + 19, s.w, 3);
      }
      break;
    }
    case 'cover': {
      if (s.style === 'car') { drawCar(s.x + s.w / 2, s.y + s.h, s.c || '#3a7ac0', 1, 0); break; }
      if (s.style === 'crate') { orrect(s.x, s.y, s.w, s.h, 2, '#9a6a3a', 2.4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y + s.h); ctx.moveTo(s.x + s.w, s.y); ctx.lineTo(s.x, s.y + s.h); ctx.stroke(); break; }
      orrect(s.x, s.y, s.w, s.h, 3, '#8a8a96', 2.4);
      ctx.fillStyle = '#e0c03a'; for (let x = s.x + 4; x < s.x + s.w - 6; x += 16) ctx.fillRect(x, s.y + 6, 8, 5);
      break;
    }
    case 'barrier': {
      if (s.fade < .02) break;
      ctx.save(); ctx.globalAlpha = s.fade;
      const g = ctx.createLinearGradient(s.x - 30, 0, s.x + s.w + 30, 0);
      g.addColorStop(0, 'rgba(255,160,60,0)'); g.addColorStop(.5, 'rgba(255,160,60,.55)'); g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g; ctx.fillRect(s.x - 30, s.y, s.w + 60, s.h);
      ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 2;
      for (let y = s.y + (frame * 2) % 40; y < s.y + s.h; y += 40) { ctx.beginPath(); ctx.moveTo(s.x, y); ctx.lineTo(s.x + s.w, y + 10); ctx.stroke(); }
      ctx.restore();
      break;
    }
  }
}

// ============================================================ civil scene painters (world coords, floor at FLOOR)
const FLOOR = 460;
function wallFill(x0, x1, c, stripe) {
  ctx.fillStyle = c; ctx.fillRect(x0, 20, x1 - x0, FLOOR - 20);
  if (stripe) { ctx.fillStyle = stripe; for (let x = x0; x < x1; x += 30) ctx.fillRect(x, 20, 12, FLOOR - 20); }
  ctx.fillStyle = HT_SOFT; ctx.fillRect(x0, 20, x1 - x0, FLOOR - 20);
}
function floorFill(x0, x1, c, lines) {
  ctx.fillStyle = c; ctx.fillRect(x0, FLOOR, x1 - x0, 140);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let x = x0 - (x0 % 60); x < x1; x += 60) ctx.fillRect(x, FLOOR, 2, 140);
  orrect(x0, FLOOR - 12, x1 - x0, 12, 0, lines || shade(c, .75), 2);
}
function winView(x, y, w, h, theme) {
  orrect(x - 7, y - 7, w + 14, h + 14, 2, '#6a4a30', 2.4);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const pal = PALETTES[theme];
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, pal.sky[0]); g.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (theme !== 'day') { ctx.fillStyle = '#f7ecbc'; circle(x + w * .75, y + h * .25, 12); }
  for (let i = 0; i < w; i += 20) { const hh = 25 + hash(i, x) * (h * .6); ctx.fillStyle = pal.mid; ctx.fillRect(x + i, y + h - hh, 18, hh); ctx.fillStyle = pal.win; if (hash(i, 7) < .6) ctx.fillRect(x + i + 5, y + h - hh + 8, 4, 5); }
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#6a4a30'; ctx.fillRect(x + w / 2 - 2, y, 4, h); ctx.fillRect(x, y + h / 2 - 2, w, 4);
}
function paintHome(night) {
  wallFill(-60, 905, '#ecdcbc', 'rgba(170,120,80,.1)');
  wallFill(905, 1480, '#c8d4ea', 'rgba(80,100,160,.08)');
  // kitchen
  orrect(40, 250, 72, 210, 6, '#eef2f4', 2.6); ctx.fillStyle = '#9aa0a8'; ctx.fillRect(100, 300, 4, 40);
  orrect(120, 380, 190, 80, 2, '#b89a70', 2.4); orrect(114, 372, 202, 10, 2, '#e0d8c8', 2);
  ocirc(170, 370, 8, '#3a3a3a', 1.8); ocirc(222, 370, 8, '#3a3a3a', 1.8);
  winView(340, 210, 130, 110, night ? 'night' : 'day');
  orrect(326, 200, 20, 132, 2, '#d24a4a', 2); orrect(464, 200, 20, 132, 2, '#d24a4a', 2);
  orrect(345, 402, 150, 8, 1, '#8a6a4a', 2); orrect(355, 410, 6, 50, 1, '#8a6a4a', 1.6); orrect(479, 410, 6, 50, 1, '#8a6a4a', 1.6);
  oell(420, 398, 16, 4, 0, '#f0e0c0', 1.6); oell(420, 394, 11, 4, 0, '#d8a060', 1.4);
  // door
  orrect(508, 262, 64, 198, 3, '#7a3e22', 2.6); ctx.fillStyle = GOLD; circle(560, 370, 3.2);
  // living: Ben's chair, photo, lamp
  orrect(700, 360, 92, 100, 12, '#7a4a3a', 2.4); orrect(690, 330, 26, 112, 8, '#8a5a44', 2.2); orrect(774, 330, 26, 112, 8, '#8a5a44', 2.2);
  orrect(670, 220, 60, 68, 2, '#5a3a28', 2.4); ctx.fillStyle = '#efe4c8'; ctx.fillRect(675, 225, 50, 58);
  ctx.save(); ctx.translate(700, 252); ctx.scale(1.6, 1.6); humanHead({ skin: '#e8c0a0', hair: 'short', hairC: '#9a9a9a', glasses: true }); ctx.restore();
  olin([822, 460, 822, 300], 3, '#c9a13b', 2); opoly([806, 300, 838, 300, 830, 278, 814, 278], '#f4dc98', 2);
  // partition
  orrect(898, 20, 12, 250, 0, '#b8a888', 2);
  // peter room: poster, desk, wardrobe, bed, window
  orrect(948, 180, 74, 96, 2, '#f2eadc', 2.2);
  ctx.save(); ctx.translate(985, 222); ctx.scale(2.1, 2.1); humanHead({ skin: '#e8c8a8', hair: 'spiky', hairC: '#ffffff', mustache: '#dddddd' }); ctx.restore();
  ctx.fillStyle = INK; ctx.font = `8px ${F_UI}`; ctx.fillText('E = mc²', 966, 268);
  orrect(1020, 390, 120, 8, 1, '#6a4a30', 2); orrect(1026, 398, 6, 62, 1, '#6a4a30', 1.6); orrect(1128, 398, 6, 62, 1, '#6a4a30', 1.6);
  orrect(1040, 338, 58, 42, 2, '#2a2a33', 2); ctx.fillStyle = night ? '#6a8aff' : '#3a5a8a'; ctx.fillRect(1044, 342, 50, 34);
  orrect(1102, 374, 20, 14, 2, '#15131c', 1.6); ocirc(1112, 381, 4, '#6a6a7a', 1.2);
  // wardrobe
  orrect(1150, 250, 80, 210, 3, '#8a5a3a', 2.6); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1190, 256); ctx.lineTo(1190, 454); ctx.stroke();
  ctx.fillStyle = GOLD; circle(1184, 350, 2.6); circle(1196, 350, 2.6);
  ctx.fillStyle = '#f07a1c'; ctx.fillRect(1156, 262, 30, 10);
  orrect(1250, 410, 180, 50, 6, '#4a6aa0', 2.4); orrect(1395, 396, 34, 20, 6, '#eef', 2);
  winView(1300, 200, 100, 110, night ? 'night' : 'day');
  floorFill(-60, 1480, '#7a5a3c');
  if (night) { ctx.fillStyle = 'rgba(10,10,40,.45)'; ctx.fillRect(-60, 0, 1560, 640); glow(1068, 360, 220, [0, 'rgba(255,220,150,.3)', 1, 'rgba(255,220,150,0)'], .05); }
}
function paintPenthouse(theme) {
  wallFill(-60, 1560, '#2a2230', 'rgba(255,255,255,.02)');
  // panoramic window
  winView(160, 120, 620, 260, theme);
  // sewing corner
  orrect(40, 380, 110, 10, 1, '#c9a13b', 2); olin([50, 390, 50, 460], 3, '#c9a13b', 2); olin([140, 390, 140, 460], 3, '#c9a13b', 2);
  orrect(66, 350, 60, 30, 5, '#e8e0e8', 2.2); olin([110, 350, 110, 336], 2, '#9aa0aa', 1.6);
  // mannequin with orange tee
  olin([100, 460, 100, 300], 3, '#8a6a4a', 2); opoly([80, 240, 120, 240, 124, 300, 76, 300], '#f07a1c', 2.2); ocirc(100, 228, 11, '#e8dcd0', 2);
  // sofa
  orrect(820, 390, 200, 70, 14, '#5a2a4a', 2.6); orrect(810, 360, 40, 100, 12, '#6a3458', 2.4); orrect(990, 360, 40, 100, 12, '#6a3458', 2.4);
  // mirror
  orrect(1080, 200, 70, 200, 30, '#c9a13b', 2.6); ctx.fillStyle = '#b8c8e0'; rrect(1087, 207, 56, 186, 26); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(1098, 220, 6, 150);
  // bed
  orrect(1200, 380, 280, 80, 8, '#1a1420', 2.6); orrect(1204, 366, 272, 30, 10, '#8a1a3a', 2.4); orrect(1440, 330, 50, 130, 6, '#2a2030', 2.4); orrect(1390, 358, 46, 20, 8, '#f4e8f0', 2);
  // chandelier
  olin([700, 20, 700, 70], 2, '#c9a13b', 1.6); for (let i = -2; i <= 2; i++) { ctx.fillStyle = 'rgba(255,230,160,.8)'; circle(700 + i * 14, 80 + Math.abs(i) * 4, 4); }
  floorFill(-60, 1560, '#3a2a30', '#2a1e24');
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(-60, FLOOR, 1620, 30);
}
function paintTerrace() {
  ctx.fillStyle = '#1b1636'; ctx.fillRect(-60, FLOOR, 1200, 160);
  orrect(-60, FLOOR - 6, 1200, 12, 0, '#4a3e86', 2.5);
  // string lights
  ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-40, 200); ctx.quadraticCurveTo(300, 290, 620, 200); ctx.quadraticCurveTo(820, 270, 1100, 190); ctx.stroke();
  for (let i = 0; i < 24; i++) { const t = i / 23, x = lerp(-40, 1100, t), y = 200 + Math.sin(t * Math.PI * 2) * 40 + 30; ctx.fillStyle = (i + Math.floor(frame / 20)) % 3 ? '#ffe39a' : '#ffb0c8'; circle(x, y, 3.2); }
  // table
  orrect(430, 392, 180, 10, 2, '#f4ecf0', 2.2); olin([520, 402, 520, 460], 4, '#c9a13b', 2);
  olin([470, 392, 470, 370], 2.5, '#f4ecf0', 2); ctx.fillStyle = '#ffcc55'; circle(470, 366, 3.5 + Math.sin(frame * .3));
  olin([580, 392, 580, 372], 2, '#8a1a3a', 1.6); oell(580, 370, 5, 3, 0, '#8a1a3a', 1.4);
  // plants
  for (const x of [120, 880]) { orrect(x - 20, 410, 40, 50, 3, '#8a5a3a', 2.2); ocirc(x, 390, 26, '#2a7a4a', 2.2); ocirc(x - 16, 404, 16, '#2a7a4a', 2); }
  // railing
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-60, 400); ctx.lineTo(1140, 400); ctx.stroke();
  for (let x = -40; x < 1140; x += 40) { ctx.beginPath(); ctx.moveTo(x, 400); ctx.lineTo(x, FLOOR); ctx.stroke(); }
}
function paintBugle() {
  wallFill(-60, 1660, '#d6ddd0');
  ctx.fillStyle = '#b0bcb0'; ctx.fillRect(-60, 380, 1720, 80);
  for (let x = 120; x < 1220; x += 260) winView(x, 150, 200, 170, 'day');
  orrect(40, 90, 290, 44, 2, '#15131c', 2.4); ctx.fillStyle = '#fff'; ctx.font = `17px ${F_DISP}`; ctx.fillText('ДЕЙЛИ БЬЮГЛ', 56, 120);
  orrect(10, 250, 60, 210, 2, '#9aa0a8', 2.4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, 252); ctx.lineTo(40, 458); ctx.stroke();
  for (const x of [300, 760, 980]) { orrect(x, 400, 150, 8, 1, '#6a5a4a', 2); orrect(x + 6, 408, 6, 52, 1, '#6a5a4a', 1.6); orrect(x + 138, 408, 6, 52, 1, '#6a5a4a', 1.6); orrect(x + 80, 362, 42, 32, 2, '#2a2a33', 2); ctx.fillStyle = '#8ab0d0'; ctx.fillRect(x + 84, 366, 34, 24); orrect(x + 16, 382, 40, 20, 2, '#efefe6', 1.6); }
  orrect(558, 188, 94, 64, 2, '#2a2a33', 2.4); ctx.fillStyle = frame % 40 < 20 ? '#4a6a9a' : '#5a7aaa'; ctx.fillRect(563, 193, 84, 54);
  ctx.fillStyle = 'rgba(160,200,220,.35)'; ctx.fillRect(1250, 120, 12, 340);
  orrect(1340, 400, 200, 10, 1, '#6a4a30', 2);
  orrect(1290, 138, 290, 36, 2, '#15131c', 2.4); ctx.fillStyle = '#efefe6'; ctx.font = `11px ${F_DISP}`; ctx.fillText('ДЖ. ДЖ. ДЖЕЙМСОН · ГЛ. РЕДАКТОР', 1298, 161);
  orrect(1560, 214, 70, 100, 2, '#f0e8d0', 2.4); ctx.fillStyle = '#8a2a2a'; ctx.font = `9px ${F_DISP}`; ctx.fillText('УГРОЗА!', 1568, 230);
  ctx.save(); ctx.translate(1595, 270); ctx.scale(1.4, 1.4); streetHead(0, 0); ctx.restore();
  floorFill(-60, 1660, '#5a5a62', '#3a3a42');
}
function paintHospital(night) {
  wallFill(-60, 1460, '#dfe8ea');
  ctx.fillStyle = '#b8d0d4'; ctx.fillRect(-60, 330, 1520, 130);
  winView(520, 170, 170, 150, night ? 'night' : 'day');
  // bed
  orrect(700, 380, 220, 30, 6, '#f4f8fa', 2.4); orrect(700, 410, 220, 8, 1, '#9aa0aa', 2); olin([710, 418, 710, 460], 3, '#9aa0aa', 2); olin([910, 418, 910, 460], 3, '#9aa0aa', 2);
  orrect(690, 330, 16, 90, 3, '#9aa0aa', 2);
  // monitor
  orrect(960, 280, 70, 50, 3, '#2a2a33', 2.4); ctx.strokeStyle = '#3aff9a'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 60; i++) { const x = 964 + i, ph = (i + frame) % 60; ctx.lineTo(x, 305 - (ph > 40 && ph < 44 ? 14 : ph > 44 && ph < 47 ? -8 : 0)); } ctx.stroke();
  olin([995, 330, 995, 460], 3, '#9aa0aa', 2);
  // flowers
  orrect(640, 400, 30, 60, 2, '#c8d8e0', 2); for (let i = 0; i < 5; i++) { ocirc(646 + i * 5, 386 - (i % 2) * 6, 4, '#fff', 1.2); ctx.fillStyle = GOLD; circle(646 + i * 5, 386 - (i % 2) * 6, 1.5); }
  // corridor door
  orrect(200, 250, 90, 210, 3, '#8ab0c0', 2.6); ctx.fillStyle = '#fff'; ctx.fillRect(220, 280, 50, 30); ctx.fillStyle = INK; ctx.font = `10px ${F_DISP}`; ctx.fillText('412', 232, 300);
  orrect(1200, 250, 90, 210, 3, '#8ab0c0', 2.6);
  floorFill(-60, 1460, '#aab8bc', '#8a9aa0');
  if (night) { ctx.fillStyle = 'rgba(10,20,50,.4)'; ctx.fillRect(-60, 0, 1520, 640); }
}
function paintCivil(scn) {
  switch (scn.theme) {
    case 'home': paintHome(!!scn.night); break;
    case 'penthouse': paintPenthouse(scn.night ? 'night' : 'day'); break;
    case 'terrace': paintTerrace(); break;
    case 'bugle': paintBugle(); break;
    case 'hospital': paintHospital(!!scn.night); break;
  }
}
