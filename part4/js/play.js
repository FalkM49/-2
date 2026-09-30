'use strict';
// ============================================================ level runtime
let L = null, P = null;
let camX = 0, camY = 0;
let webs = [], bullets = [], parts = [], pops = [], decals = [], traps = [], tethers = [];
let stats = { kos: 0, hits: 0, time: 0, saves: 0 };
const GRAV = .6;

function newPlayer(x, y) {
  return { x, y, w: 26, h: 74, vx: 0, vy: 0, face: 1, onGround: false, ground: null, coyote: 0, airJumps: 1,
    st: 'free', t: 0, hp: 100, max: 100, inv: 0, focus: 0, combo: 0, comboT: 0, atk: null, queue: false,
    webCd: 0, lT: -1, kT: -1, swing: null, swingWant: 0, zip: null, wallDir: 0, wall: null, dodgeCd: 0,
    carry: null, jammed: false, sense: 0, anim: 0, rot: 0, flip: 0, lastSafe: { x, y }, perchT: 0, landT: 0, grabbed: null };
}

function startLevel(id, onDone, opts = {}) {
  const def = LEVELS[id];
  mode = 'level'; hint = null;
  L = { id, def, w: def.w, h: def.h, theme: def.theme || 'night', solids: [], enemies: [], civs: [], events: [], pickups: [], tokens: [], rings: [],
    sections: [], sec: 0, ck: opts.sec || 0, barriers: [], tokensMelee: 2, onDone, timer: def.timer || 0, t: 0, done: false, alarm: false, data: {} };
  webs = []; bullets = []; parts = []; pops = []; decals = []; traps = []; tethers = [];
  def.build(L);
  L.solids.forEach((s, i) => { if (s.id == null) s.id = i + 1; });
  // sections and barriers
  if (def.sections) {
    L.sections = def.sections();
    L.sections.forEach((s, k) => {
      if (s.x1 != null) { const b = { x: s.x1, y: -400, w: 26, h: L.h + 800, kind: 'barrier', active: k >= L.ck, fade: k >= L.ck ? 1 : 0 }; L.solids.push(b); L.barriers[k] = b; }
      if (k < L.ck) s.cleared = true;
    });
    L.sec = L.ck;
    spawnSection(L.sec);
  }
  const sx = opts.x != null ? opts.x : (def.sections && L.ck > 0 ? L.sections[L.ck - 1].x1 + 70 : def.spawn[0]);
  const sy = opts.y != null ? opts.y : (def.sections && L.ck > 0 ? topAt(sx + 12, 0) - 74 : def.spawn[1]);
  P = newPlayer(sx, sy);
  if (opts.hp) P.hp = opts.hp;
  camX = clamp(P.x - W * .4, 0, L.w - W); camY = clamp(P.y - H * .55, 0, L.h - H);
  if (def.onStart) def.onStart(L);
  state = 'play';
}
function spawnSection(i) {
  const s = L.sections[i];
  (s.foes || []).forEach(f => spawnFoe(f, i));
  if (s.onSpawn) s.onSpawn(L);
}
function topAt(x, fromY) {
  let best = null;
  for (const s of L.solids) if ((s.kind === 'bldg' || s.kind === 'street' || s.kind === 'pier' || s.kind === 'metal') && x >= s.x && x <= s.x + s.w && s.y >= fromY) { if (best === null || s.y < best) best = s.y; }
  return best === null ? L.h - 60 : best;
}
function isSolid(s) { return s.kind === 'bldg' || s.kind === 'street' || s.kind === 'pier' || s.kind === 'metal' || s.kind === 'cover' || (s.kind === 'barrier' && s.active); }
function climbable(s) { return s.kind === 'bldg' || (s.kind === 'metal' && s.climb); }
function moveBody(b, noPlat) {
  b.wallHit = 0;
  b.x += b.vx;
  for (const s of L.solids) {
    if (!isSolid(s)) continue;
    if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
      if (b.vx > 0) { b.x = s.x - b.w; b.wallHit = 1; b.wallS = s; } else if (b.vx < 0) { b.x = s.x + s.w; b.wallHit = -1; b.wallS = s; }
      b.vx = 0;
    }
  }
  b.onGround = false;
  const prevBot = b.y + b.h;
  b.y += b.vy;
  for (const s of L.solids) {
    if (s.kind === 'plat') {
      if (noPlat) continue;
      if (b.vy >= 0 && prevBot <= s.y + .01 && b.y + b.h >= s.y && b.x + b.w > s.x + 2 && b.x < s.x + s.w - 2) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; b.ground = s; }
      continue;
    }
    if (!isSolid(s)) continue;
    if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
      if (b.vy > 0) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; b.ground = s; }
      else if (b.vy < 0) { b.y = s.y + s.h; b.vy = 0; }
    }
  }
  if (b.y > L.h + 200) { b.fellOut = true; }
}
function solidAt(x, y) { for (const s of L.solids) if (isSolid(s) && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s; return null; }
function standAt(x, y) {
  for (const s of L.solids) {
    if (x < s.x || x > s.x + s.w) continue;
    if (s.kind === 'plat' && y >= s.y - 2 && y <= s.y + 14) return s;
    if (isSolid(s) && s.kind !== 'barrier' && y >= s.y - 2 && y <= s.y + s.h) return s;
  }
  return null;
}
function wallTouch(b, dir) {
  const probe = { x: dir > 0 ? b.x + b.w : b.x - 3, y: b.y + 14, w: 3, h: b.h - 28 };
  for (const s of L.solids) if (climbable(s) && overlap(probe, s)) return s;
  return null;
}
function lineBlocked(ax, ay, bx, by) {
  const n = Math.ceil(dist(ax, ay, bx, by) / 16);
  for (let i = 1; i < n; i++) { const t = i / n; const s = solidAt(lerp(ax, bx, t), lerp(ay, by, t)); if (s && s.kind !== 'barrier') return true; }
  return false;
}

// ============================================================ fx
function pop(x, y, text, color = GOLD, size = 26) { pops.push({ x, y, text, color, size, life: 54 }); }
function burst(x, y, color, n = 10, sp = 4, grav = .15, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = sp * (.4 + Math.random() * .8);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 22 + Math.random() * 18, max: 40, color, size: size * (.6 + Math.random() * .8), grav });
  }
}
function spark(x, y) { parts.push({ x, y, vx: 0, vy: 0, life: 12, max: 12, star: true, color: '#fff', size: 18, grav: 0 }); burst(x, y, '#fff6c0', 6, 4, .1, 2.5); }
function ring(x, y, color, r = 60) { parts.push({ x, y, vx: 0, vy: 0, life: 20, max: 20, ring: r, color, size: 4, grav: 0 }); }
function updateFx() {
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.vx *= .97; q.life--; }
  parts = parts.filter(q => q.life > 0);
  if (parts.length > 600) parts.splice(0, parts.length - 600);
  for (const q of pops) { q.y -= .6; q.life--; }
  pops = pops.filter(q => q.life > 0);
  for (const d of decals) d.life--;
  decals = decals.filter(d => d.life > 0);
  shake = shake > .4 ? shake * .86 : 0;
}

// ============================================================ player
function heroHurt(dmg, fromX, knock = 6) {
  const p = P;
  if (p.inv > 0 || state !== 'play' || p.st === 'dodge') return false;
  p.hp -= dmg; p.inv = 60; stats.hits++;
  if (p.swing) p.swing = null;
  if (p.st === 'wall' || p.st === 'zip' || p.st === 'swing') p.st = 'free';
  if (p.carry && p.carry.drop) p.carry.drop();
  p.atk = null;
  if (knock) { p.vx = sgn(p.x + p.w / 2 - fromX) * knock; p.vy = -5; p.st = 'hurt'; p.t = 16; }
  shake = 9; SFX.hurt(); burst(p.x + p.w / 2, p.y + 30, '#ff4d5e', 12, 4);
  if (p.hp <= 0) { p.hp = 0; onHeroDown(); }
  return true;
}
function onHeroDown() {
  if (L && L.def.onDeath && L.def.onDeath(L)) return;
  state = 'over'; overT = 0;
}
let overT = 0;
function senseTrigger(t) { if (P.sense < 8) SFX.sense(); P.sense = Math.max(P.sense, t); }
function anchorFor(p, dir) {
  const cx = p.x + p.w / 2, cy = p.y + 10;
  const ix = cx + dir * 170, iy = cy - 240;
  let best = null, bd = 1e9;
  for (const s of L.solids) {
    if (!(s.kind === 'bldg' || s.kind === 'metal' || s.kind === 'anchor')) continue;
    const ax = clamp(ix, s.x, s.x + s.w), ay = clamp(iy, s.y, s.y + s.h);
    if (ay > cy - 70) continue;
    const d = dist(cx, cy, ax, ay);
    if (d < 110 || d > 360) continue;
    const sc = dist(ax, ay, ix, iy);
    if (sc < bd) { bd = sc; best = { x: ax, y: ay }; }
  }
  if (!best && !L.def.indoor) best = { x: ix, y: Math.max(iy, camY - 40) };
  return best;
}
function zipTarget(p, dir) {
  const cx = p.x + p.w / 2, cy = p.y + 20;
  let best = null, bd = 1e9;
  for (const s of L.solids) {
    if (!(s.kind === 'bldg' || s.kind === 'metal' || s.kind === 'plat' || s.kind === 'pier')) continue;
    for (const c of [[s.x, s.y], [s.x + s.w, s.y]]) {
      const dx = (c[0] - cx) * dir, dy = cy - c[1];
      if (dx < 20 || dx > 380 || dy < -40 || dy > 300) continue;
      const d = dist(cx, cy, c[0], c[1]);
      if (d < bd && !lineBlocked(cx, cy, c[0] + (c[0] === s.x ? -2 : 2) * 0, c[1] - 6)) { bd = d; best = { x: c[0], y: c[1], perch: true, s }; }
    }
  }
  if (!best) best = { x: cx + dir * 230, y: cy - 120, perch: false };
  return best;
}
function inputX() { return (keys.right ? 1 : 0) - (keys.left ? 1 : 0); }
function heroCanWeb() { return !P.jammed; }

function startAttack(k) {
  const p = P;
  const A = {
    jab: { dur: 14, a: [3, 8], dmg: 1, kb: 2.5, w: 42, h: 30, oy: 12 },
    hook: { dur: 16, a: [4, 9], dmg: 1, kb: 3.5, w: 44, h: 30, oy: 12 },
    kick: { dur: 20, a: [5, 11], dmg: 2, kb: 8, w: 52, h: 34, oy: 20, down: true, brk: true },
    upper: { dur: 22, a: [5, 11], dmg: 2, kb: 2, ky: -11, w: 44, h: 50, oy: -10, brk: true },
    air: { dur: 13, a: [3, 8], dmg: 1, kb: 2, ky: -3, w: 44, h: 40, oy: 10 },
    sweep: { dur: 22, a: [5, 12], dmg: 1, kb: 3, w: 54, h: 20, oy: 50, down: true, brk: true },
    swingkick: { dur: 18, a: [1, 10], dmg: 3, kb: 10, w: 50, h: 40, oy: 16, down: true, brk: true },
    dive: { dur: 999, a: [0, 999], dmg: 2, kb: 5, w: 34, h: 30, oy: 50, down: true },
  }[k];
  p.atk = Object.assign({ k, t: 0, hit: new Set() }, A);
  SFX.punch();
  if (k === 'upper') { p.vy = Math.min(p.vy, -5); }
  if (k === 'air') { p.vy = Math.min(p.vy, 1); }
  if (k === 'dive') { p.vy = 13; p.vx = p.face * 5; }
}
function comboPress() {
  const p = P;
  if (p.carry) return;
  if (keys.down) { if (p.onGround) startAttack('sweep'); else startAttack('dive'); return; }
  if (p.st === 'swing') { p.swing = null; p.st = 'free'; startAttack('swingkick'); p.vx = clamp(p.vx * 1.1, -13, 13); return; }
  if (!p.onGround) { if (!p.atk || p.atk.t > p.atk.a[1]) { p.airHits = (p.airHits || 0) + 1; if (p.airHits <= 4) startAttack('air'); } return; }
  if (p.atk && p.atk.t < p.atk.a[1]) { p.queue = true; return; }
  const seq = ['jab', 'hook', 'kick', 'upper'];
  if (p.comboT <= 0) p.combo = 0;
  startAttack(seq[p.combo % 4]);
  p.combo = (p.combo + 1) % 4; p.comboT = 34;
}
function heroAtkBox() {
  const p = P, a = p.atk;
  const x = p.face > 0 ? p.x + p.w - 6 : p.x - a.w + 6;
  return { x, y: p.y + a.oy - (a.k === 'upper' ? 10 : 0), w: a.w, h: a.h };
}
function fireWebBall() {
  const p = P;
  webs.push({ x: p.x + p.w / 2 + p.face * 18, y: p.y + 22, vx: p.face * 13 + p.vx * .3, vy: 0, life: 42, kind: 'ball' });
  p.shootT = 12; p.webCd = 18; SFX.web();
}
function webPull() {
  const p = P, cx = p.x + p.w / 2, cy = p.y + 30;
  let best = null, bd = 340;
  for (const e of L.enemies) {
    if (e.dead || e.st === 'cocoon' || e.st === 'ko') continue;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    if ((ex - cx) * p.face < 0 || Math.abs(ey - cy) > 150) continue;
    const d = dist(cx, cy, ex, ey); if (d < bd) { bd = d; best = { e, x: ex, y: ey }; }
  }
  for (const pr of L.pickups) {
    if (pr.kind !== 'throw' || pr.held) continue;
    if ((pr.x - cx) * p.face < 0) continue;
    const d = dist(cx, cy, pr.x, pr.y); if (d < bd) { bd = d; best = { pr, x: pr.x, y: pr.y }; }
  }
  if (L.boss && L.boss.pullTarget) { const t = L.boss.pullTarget(cx, cy, p.face); if (t && t.d < bd) best = t; }
  p.shootT = 16; p.webCd = 24; SFX.zip();
  if (!best) { tethers.push({ x1: cx, y1: cy, x2: cx + p.face * 200, y2: cy - 20, life: 10 }); return; }
  tethers.push({ x1: cx, y1: cy, x2: best.x, y2: best.y, life: 12 });
  if (best.e) {
    const e = best.e;
    if (e.shield) { e.shield = false; pop(e.x + e.w / 2, e.y - 10, 'ЩИТ ВЫРВАН!', '#cfe8ff', 22); SFX.block(); burst(e.x + e.w / 2, e.y + 30, '#cfe8ff', 10, 5); e.st = 'stagger'; e.t = 36; focusAdd(6); return; }
    if (e.type === 'drone') { e.st = 'down'; e.t = 300; e.vy = 2; e.vx = sgn(cx - e.x) * 6; pop(e.x, e.y - 10, 'СБИТ!', '#fff', 22); focusAdd(5); return; }
    e.vx = sgn(cx - (e.x + e.w / 2)) * 10; e.vy = -5; e.st = 'stagger'; e.t = 34; releaseToken(e);
    pop(e.x + e.w / 2, e.y - 10, 'РЫВОК!', '#fff', 20); focusAdd(4);
  } else if (best.pr) {
    const pr = best.pr; pr.held = true; pr.vx = sgn(cx - pr.x) * 12; pr.vy = -6; pr.thrown = 0; pr.returning = true;
  } else if (best.fn) best.fn();
}
function placeTrap() {
  const p = P;
  if (!p.onGround) { fireWebBall(); return; }
  if (traps.length >= 2) traps.shift();
  traps.push({ x: p.x + p.w / 2 + p.face * 26, y: p.y + p.h, life: 1200 });
  p.webCd = 30; SFX.web(); pop(p.x + p.w / 2, p.y - 8, 'ЛОВУШКА', '#fff', 16);
}
function cocoonNear() {
  const p = P;
  for (const e of L.enemies) if (e.st === 'ko' && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 70 && Math.abs(e.y + e.h - (p.y + p.h)) < 60) { e.st = 'cocoon'; e.web = 3; SFX.web(); pop(e.x + e.w / 2, e.y - 10, 'ПРИКЛЕЕН!', '#fff', 20); p.shootT = 12; p.webCd = 14; focusAdd(3); return true; }
  return false;
}
function focusAdd(n) { P.focus = Math.min(100, P.focus + n); }
function doSuper() {
  const p = P, cx = p.x + p.w / 2, cy = p.y + 34;
  p.focus = 0; SFX.super(); shake = 16; slowmo = 30;
  if (p.onGround) {
    pop(cx, p.y - 30, 'ПАУЧИЙ ШТОРМ!', ORANGE, 34);
    for (let i = 0; i < 3; i++) ring(cx, cy, '#fff', 90 + i * 70);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; webs.push({ x: cx, y: cy, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, life: 26, kind: 'storm' }); }
    for (const e of L.enemies) {
      if (e.dead || e.st === 'ko' || e.st === 'cocoon') continue;
      if (dist(cx, cy, e.x + e.w / 2, e.y + e.h / 2) < 300) {
        if (e.type === 'drone') { e.dead = true; burst(e.x, e.y, '#ffb03a', 14, 5); stats.kos++; continue; }
        if (e.type === 'brute') { e.shield = false; e.web = 2; damageEnemy(e, { dmg: 3, kb: 6, down: true, brk: true, dir: sgn(e.x - cx), k: 'super' }); }
        else { e.web = 3; knockOut(e, sgn(e.x - cx), 4); }
      }
    }
    if (L.boss && L.boss.superHit) L.boss.superHit(cx, cy);
  } else {
    pop(cx, p.y - 30, 'МЕТЕОР!', ORANGE, 34);
    p.vy = 18; p.meteor = true;
  }
}

function updateHero() {
  const p = P;
  const inX = inputX();
  if (p.inv > 0) p.inv--;
  if (p.webCd > 0) p.webCd--;
  if (p.dodgeCd > 0) p.dodgeCd--;
  if (p.comboT > 0) p.comboT--;
  if (p.shootT > 0) p.shootT--;
  if (p.sense > 0) p.sense--;
  if (p.perchT > 0) p.perchT--;
  if (p.landT > 0) p.landT--;
  if (p.flip > 0) { p.flip--; p.rot = (1 - p.flip / 26) * TAU * p.face; if (p.flip === 0) p.rot = 0; }
  // jammer field
  p.jammed = false;
  for (const e of L.enemies) if (e.type === 'jammer' && !e.dead && e.st !== 'ko' && e.st !== 'cocoon' && dist(e.x, e.y, p.x, p.y) < 250) p.jammed = true;
  if (p.st === 'grabbed') { if (L.boss && L.boss.grabTick) L.boss.grabTick(); return; }
  if (p.st === 'hurt') { p.t--; if (p.t <= 0) p.st = 'free'; }
  const ctl = p.st !== 'hurt' && !L.lockInput;
  // --- buttons
  if (ctl && pressed.dodge && p.dodgeCd <= 0 && p.st !== 'zip') {
    const dir = inX || p.face;
    if (p.sense > 0) { slowmo = 45; focusAdd(20); pop(p.x + 12, p.y - 20, 'ПАУЧЬЕ ЧУТЬЁ!', '#ff5a7a', 24); SFX.slow(); p.sense = 0; }
    p.st = 'dodge'; p.t = 18; p.face = dir; p.vx = dir * 9.5; if (!p.onGround) p.vy = Math.min(p.vy, -2); p.inv = Math.max(p.inv, 18); p.dodgeCd = 30; p.swing = null; p.atk = null;
    burst(p.x + 12, p.y + p.h, '#c8c0e0', 6, 2, .05);
  }
  if (ctl && pressed.super && p.focus >= 100 && !p.carry) doSuper();
  if (ctl && pressed.punch && p.st !== 'dodge') {
    if (L.stealthTakedown && L.stealthTakedown()) {}
    else if (p.st === 'wall') { p.st = 'free'; p.face = -p.wallDir; p.vx = -p.wallDir * 7; p.vy = -4; startAttack('swingkick'); }
    else comboPress();
  }
  // web key
  if (pressed.web) p.kT = 0;
  if (keys.web && p.kT >= 0) { p.kT++; if (p.kT === 13 && ctl && p.webCd <= 0 && heroCanWeb()) { webPull(); p.kT = -1; } }
  if (released.web && p.kT >= 0) {
    if (ctl && p.webCd <= 0) {
      if (!heroCanWeb()) { pop(p.x + 12, p.y - 10, 'ГЛУШИЛКА!', '#b88aff', 18); SFX.bad(); }
      else if (!cocoonNear()) { if (keys.down) placeTrap(); else fireWebBall(); }
    }
    p.kT = -1;
  }
  // swing key
  if (pressed.swing) p.lT = 0;
  if (keys.swing && p.lT >= 0) {
    p.lT++;
    if (p.lT === 9 && ctl && heroCanWeb() && p.st !== 'swing') {
      if (p.onGround || p.st === 'wall') { p.vy = -11; p.onGround = false; p.st = 'free'; p.swingWant = 7; SFX.jump(); }
      else startSwing();
    }
  }
  if (released.swing && p.lT >= 0) {
    if (p.lT < 9 && ctl) { if (heroCanWeb()) startZip(); else { pop(p.x + 12, p.y - 10, 'ГЛУШИЛКА!', '#b88aff', 18); } }
    if (p.st === 'swing') releaseSwing(false);
    p.lT = -1;
  }
  if (p.swingWant > 0) { p.swingWant--; if (p.swingWant === 0 && keys.swing && !p.onGround && heroCanWeb()) startSwing(); }
  // --- states
  if (p.atk) {
    p.atk.t++;
    if (p.atk.t >= p.atk.dur) { const q = p.queue; p.atk = null; p.queue = false; if (q && p.onGround) comboPress(); }
  }
  switch (p.st) {
    case 'wall': heroWall(inX, ctl); break;
    case 'swing': heroSwing(inX, ctl); break;
    case 'zip': heroZip(); break;
    case 'dodge': p.t--; p.vx *= .92; p.vy += GRAV * .7; moveBody(p); if (p.t <= 0) p.st = 'free'; break;
    default: heroFree(inX, ctl); break;
  }
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.x > L.w - p.w) { p.x = L.w - p.w; p.vx = 0; }
  if (p.y < -300) { p.y = -300; p.vy = Math.max(p.vy, 0); }
  // attack hits
  if (p.atk && p.atk.t >= p.atk.a[0] && p.atk.t <= p.atk.a[1]) heroHits();
  // safe spot / falling
  if (p.onGround && p.ground && p.ground.kind !== 'plat' && p.ground.kind !== 'cover') p.lastSafe = { x: p.x, y: p.y };
  if (p.fellOut || p.y > L.h + 100) { p.fellOut = false; p.x = p.lastSafe.x; p.y = p.lastSafe.y - 6; p.vx = p.vy = 0; p.inv = 0; heroHurt(10, p.x, 0); }
  p.anim += p.onGround ? Math.abs(p.vx) * .075 : .12;
}
function heroFree(inX, ctl) {
  const p = P;
  const spd = p.carry ? 4 : 5.2;
  if (p.onGround) {
    const tgt = ctl && !(p.atk && p.atk.k !== 'jab' && p.atk.k !== 'hook') ? inX * spd : 0;
    p.vx += clamp(tgt - p.vx, -.9, .9);
    if (ctl && inX) p.face = inX;
    p.coyote = 7; p.airJumps = 1; p.airHits = 0;
  } else {
    if (p.coyote > 0) p.coyote--;
    if (ctl && inX && (Math.sign(inX) !== Math.sign(p.vx) || Math.abs(p.vx) < spd)) p.vx += inX * .42;
    if (ctl && inX && !p.atk) p.face = inX;
    p.vx *= .994;
  }
  // jump
  const upJump = pressed.up && !(p.onGround && wallTouch(p, inX || p.face) && keys.up && inX);
  if (ctl && (pressed.jump || upJump)) {
    if (p.coyote > 0) { p.vy = -13.4; p.coyote = 0; p.onGround = false; SFX.jump(); burst(p.x + 12, p.y + p.h, '#c8c0e0', 6, 2, .05); }
    else if (p.airJumps > 0 && !p.carry) { p.airJumps--; p.vy = -11; p.flip = 26; SFX.flip(); }
  }
  // start climbing from ground
  if (ctl && p.onGround && keys.up && inX) { const w = wallTouch(p, inX); if (w) { p.st = 'wall'; p.wallDir = inX; p.wall = w; p.vy = 0; p.face = inX; return; } }
  // gravity
  let g = GRAV;
  if (p.atk && p.atk.k === 'air' && p.vy > 0) g *= .35;
  p.vy += g;
  if (!keys.jump && !keys.up && p.vy < -4 && !p.flung) p.vy += .5;
  if (p.vy > 16) p.vy = 16;
  moveBody(p);
  if (p.onGround) {
    if (p.flung || p.vy === 0 && p.prevVy > 9) { p.landT = 8; }
    if (p.atk && p.atk.k === 'dive' || p.meteor) diveImpact();
    p.flung = false;
  }
  p.prevVy = p.vy;
  // wall grab in air
  if (ctl && !p.onGround && !p.carry) {
    const dir = inX || (p.wallHit || 0);
    if (dir) { const w = wallTouch(p, dir); if (w && (inX === dir)) { p.st = 'wall'; p.wallDir = dir; p.wall = w; p.vy = 0; p.vx = 0; p.face = dir; p.atk = null; p.airJumps = 1; } }
  }
}
function diveImpact() {
  const p = P, cx = p.x + p.w / 2, cy = p.y + p.h;
  const big = !!p.meteor;
  p.meteor = false; p.atk = null;
  shake = big ? 18 : 10; SFX.slam(); ring(cx, cy - 6, '#fff', big ? 160 : 70);
  burst(cx, cy, '#c8b8a0', 14, 5);
  for (const e of L.enemies) {
    if (e.dead || e.st === 'ko' || e.st === 'cocoon') continue;
    if (Math.abs(e.x + e.w / 2 - cx) < (big ? 170 : 70) && Math.abs(e.y + e.h - cy) < 60) damageEnemy(e, { dmg: big ? 4 : 2, kb: 6, down: true, brk: true, dir: sgn(e.x + e.w / 2 - cx), k: 'dive' });
  }
  if (L.boss && L.boss.aoeHit) L.boss.aoeHit(cx, cy, big ? 170 : 70, big ? 6 : 2);
}
function heroWall(inX, ctl) {
  const p = P, w = p.wall;
  p.vx = 0;
  p.vy = keys.up ? -3.6 : keys.down ? 3.6 : 0;
  p.face = p.wallDir;
  p.y += p.vy;
  p.x = p.wallDir > 0 ? w.x - p.w : w.x + w.w;
  p.anim += Math.abs(p.vy) * .12;
  if (p.y + 16 < w.y) { p.y = w.y - p.h; p.x += p.wallDir * 18; p.st = 'free'; p.vy = 0; p.onGround = true; p.perchT = 14; return; }
  if (p.y + p.h > w.y + w.h) { p.st = 'free'; return; }
  // ground below while moving down
  if (keys.down && standAt(p.x + p.w / 2, p.y + p.h + 2)) { p.st = 'free'; return; }
  if (ctl && (pressed.jump)) { p.st = 'free'; p.vx = -p.wallDir * 7.5; p.vy = -12; p.face = -p.wallDir; p.flung = true; SFX.jump(); return; }
  if (ctl && inX === -p.wallDir) { p.st = 'free'; p.vx = -p.wallDir * 2.5; return; }
  // check still touching
  if (!wallTouch(p, p.wallDir)) { p.st = 'free'; }
}
function startSwing() {
  const p = P;
  const dir = Math.abs(p.vx) > 1 ? sgn(p.vx) : p.face;
  const a = anchorFor(p, dir);
  if (!a) return;
  const cx = p.x + p.w / 2, cy = p.y + 10;
  p.swing = { x: a.x, y: a.y, len: dist(cx, cy, a.x, a.y), t: 0 };
  p.st = 'swing'; p.face = dir; p.atk = null; SFX.web();
  if (Math.abs(p.vx) < 3) p.vx = dir * 3;
}
function releaseSwing(jumped) {
  const p = P;
  p.swing = null; p.st = 'free';
  p.vx = clamp(p.vx * 1.18, -15, 15);
  p.vy = jumped ? Math.min(p.vy, 0) - 7 : Math.min(p.vy - 3, p.vy);
  p.flung = true; p.airJumps = 1;
  if (Math.abs(p.vx) > 10) SFX.swing();
}
function heroSwing(inX, ctl) {
  const p = P, s = p.swing, cx = p.x + p.w / 2, cy = p.y + 10;
  let nvx = p.vx, nvy = p.vy + GRAV * .9;
  // pump along tangent
  if (inX) { const dx = cx - s.x, dy = cy - s.y, d = Math.hypot(dx, dy) || 1; const tx = -dy / d, ty = dx / d; const sgnT = sgn(tx * inX); nvx += tx * sgnT * .32; nvy += ty * sgnT * .32; }
  if (keys.up) s.len = Math.max(90, s.len - 2.4);
  if (keys.down) s.len = Math.min(380, s.len + 2.4);
  s.len = Math.max(100, s.len - .3);
  let nx = cx + nvx, ny = cy + nvy;
  const dx = nx - s.x, dy = ny - s.y, d = Math.hypot(dx, dy);
  if (d > s.len) { nx = s.x + dx / d * s.len; ny = s.y + dy / d * s.len; nvx = nx - cx; nvy = ny - cy; }
  const sp = Math.hypot(nvx, nvy);
  if (sp > 16) { nvx *= 16 / sp; nvy *= 16 / sp; }
  p.vx = nvx; p.vy = nvy;
  if (Math.abs(nvx) > .5) p.face = sgn(nvx);
  moveBody(p);
  if (p.onGround || p.wallHit) { p.swing = null; p.st = 'free'; if (p.wallHit) { const w = wallTouch(p, p.wallHit); if (w) { p.st = 'wall'; p.wallDir = p.wallHit; p.wall = w; p.vy = 0; } } }
  if (ctl && pressed.jump && p.st === 'swing') releaseSwing(true);
  if (++s.t > 260 && p.st === 'swing') releaseSwing(false);
  if (sp > 11 && frame % 3 === 0) parts.push({ x: cx - p.vx * 2, y: cy + 20, vx: -p.vx * .2, vy: 0, life: 10, max: 10, line: true, color: 'rgba(255,255,255,.6)', size: 1, grav: 0 });
}
function startZip() {
  const p = P;
  const dir = keys.left ? -1 : keys.right ? 1 : p.face;
  const t = zipTarget(p, dir);
  p.zip = t; p.st = 'zip'; p.t = 0; p.face = dir; p.swing = null; p.atk = null;
  SFX.zip();
}
function heroZip() {
  const p = P, z = p.zip;
  const tx = z.perch ? z.x - p.w / 2 + (z.x === z.s.x ? 14 : -14) : z.x - p.w / 2, ty = z.perch ? z.y - p.h : z.y - 20;
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  p.t++;
  if (d < 20 || p.t > 28) {
    p.st = 'free';
    if (z.perch) { p.x = tx; p.y = ty - 2; p.vx = p.face * 3; p.vy = 0; p.perchT = 18; p.airJumps = 1; }
    else { p.vx = p.face * 10; p.vy = -5; p.flung = true; }
    p.zip = null; return;
  }
  p.vx = dx / d * 17; p.vy = dy / d * 17;
  moveBody(p, true);
  if (p.wallHit) { const w = wallTouch(p, p.wallHit); p.zip = null; if (w) { p.st = 'wall'; p.wallDir = p.wallHit; p.wall = w; p.vy = 0; } else p.st = 'free'; }
}
function heroHits() {
  const p = P, a = p.atk, box = heroAtkBox();
  for (const e of L.enemies) {
    if (e.dead || e.st === 'cocoon' || a.hit.has(e)) continue;
    if (e.st === 'ko' && a.k !== 'dive') continue;
    if (!overlap(box, e)) continue;
    a.hit.add(e);
    damageEnemy(e, { dmg: a.dmg, kb: a.kb, ky: a.ky, down: a.down, brk: a.brk, dir: p.face, k: a.k });
  }
  for (const pr of L.pickups) {
    if (pr.kind === 'throw' && !pr.held && !a.hit.has(pr) && overlap(box, { x: pr.x - 12, y: pr.y - 12, w: 24, h: 24 })) { a.hit.add(pr); pr.held = true; pr.vx = p.face * 12; pr.vy = -4; pr.thrown = 1; SFX.hit(); }
  }
  if (L.boss && L.boss.heroHit) L.boss.heroHit(box, a);
  if (L.events) for (const ev of L.events) if (ev.onHit) ev.onHit(box, a);
}

// ============================================================ enemies
const FOE = {
  thug: { w: 28, h: 72, hp: 4, look: 'thug' },
  thug2: { w: 28, h: 72, hp: 4, look: 'thug2' },
  gunner: { w: 28, h: 72, hp: 3, look: 'merc' },
  brute: { w: 40, h: 90, hp: 9, look: 'brute' },
  medic: { w: 28, h: 72, hp: 3, look: 'medic' },
  jammer: { w: 28, h: 72, hp: 2, look: 'jammer' },
  drone: { w: 30, h: 30, hp: 2, look: 'drone' },
  guard: { w: 28, h: 72, hp: 3, look: 'guard' },
};
function spawnFoe(def, sec) {
  const [type, x, y, extra] = def;
  const F = FOE[type];
  const top = y != null ? y : topAt(x, 0);
  const e = Object.assign({ type, look: F.look, x: x - F.w / 2, y: type === 'drone' ? top - 200 : top - F.h, w: F.w, h: F.h, vx: 0, vy: 0, face: -1, hp: F.hp, max: F.hp,
    sec, st: 'idle', t: 0, cd: 40 + Math.random() * 60, web: 0, webT: 0, flash: 0, seed: Math.random() * 9, anim: Math.random() * 6,
    token: false, shield: type === 'brute', bat: type === 'thug' && Math.random() < .5, alert: 0, homeY: top - 200, side: Math.random() < .5 ? -1 : 1 }, extra || {});
  if (type === 'thug2') { e.type = 'thug'; e.look = 'thug2'; }
  if (type === 'guard') { e.px1 = e.px1 != null ? e.px1 : e.x - 120; e.px2 = e.px2 != null ? e.px2 : e.x + 120; e.face = 1; }
  L.enemies.push(e);
  return e;
}
function releaseToken(e) { if (e.token) { e.token = false; L.tokensMelee++; } }
function damageEnemy(e, a) {
  if (e.dead || e.st === 'cocoon' || e.st === 'ko') return;
  const ex = e.x + e.w / 2, ey = e.y + e.h * .4;
  const fromFront = sgn((P.x + P.w / 2) - ex) === e.face;
  if (e.type === 'drone') { e.hp -= a.dmg; e.flash = 8; spark(ex, ey); SFX.hit(); if (e.hp <= 0) { e.dead = true; burst(ex, ey, '#ffb03a', 16, 5); burst(ex, ey, '#8a8e98', 8, 4); stats.kos++; pop(ex, ey - 10, 'БАХ!', GOLD, 26); focusAdd(6); } hitstop = 3; return; }
  if (e.shield && fromFront && a.k !== 'dive' && a.k !== 'super') {
    pop(ex, e.y - 6, 'ДЗЫНЬ!', '#cfe8ff', 22); SFX.block(); spark(ex + e.face * 20, ey);
    P.vx = -P.face * 5; hitstop = 3; return;
  }
  if (e.st === 'block' && fromFront && !a.brk) {
    pop(ex, e.y - 6, 'БЛОК!', '#cfe8ff', 20); SFX.block(); spark(ex + e.face * 12, ey); hitstop = 2; return;
  }
  if (e.type === 'thug' && fromFront && !a.brk && e.blockCd <= 0 && (e.st === 'circle' || e.st === 'approach' || e.st === 'idle') && Math.random() < .3 && a.k !== 'super') {
    e.st = 'block'; e.t = 40; e.blockCd = 150; pop(ex, e.y - 6, 'БЛОК!', '#cfe8ff', 20); SFX.block(); return;
  }
  if (e.st === 'block' && a.brk) pop(ex, e.y - 20, 'ПРОБИТ!', ORANGE, 22);
  if (e.st === 'revive') pop(ex, e.y - 20, 'ПРЕРВАН!', ORANGE, 20);
  e.hp -= a.dmg; e.flash = 8; releaseToken(e);
  spark(ex + a.dir * 6, ey); SFX.hit(); shake = Math.max(shake, a.dmg > 1 ? 5 : 3); hitstop = a.dmg > 1 ? 5 : 3;
  focusAdd(5);
  if (e.hp <= 0) { knockOut(e, a.dir, a.kb); return; }
  pop(ex, e.y - 6, pick(['ТУЦ!', 'БАЦ!', 'ПАФ!']), '#fff', 20);
  if (a.ky) { e.st = 'air'; e.vy = a.ky; e.vx = a.dir * a.kb; e.t = 0; }
  else if (a.down) { e.st = 'down'; e.t = 70; e.vx = a.dir * a.kb; e.vy = -4; }
  else { e.st = 'stagger'; e.t = 16; e.vx = a.dir * a.kb; }
}
function knockOut(e, dir, kb = 5) {
  releaseToken(e);
  e.st = e.web > 0 ? 'cocoon' : 'ko'; e.vx = dir * kb * 1.3; e.vy = -6; e.t = 0;
  stats.kos++; shake = Math.max(shake, 7);
  pop(e.x + e.w / 2, e.y - 10, pick(['БАМ!', 'ХРЯСЬ!', 'ВЖУХ!', 'БУМ!', 'КРАК!']), GOLD, 32);
  SFX.heavy();
}
function webEnemy(e) {
  if (e.dead || e.st === 'cocoon') return false;
  if (e.st === 'ko') { e.st = 'cocoon'; e.web = 3; pop(e.x + e.w / 2, e.y - 10, 'ПРИКЛЕЕН!', '#fff', 20); return true; }
  const fromFront = sgn((P.x + P.w / 2) - (e.x + e.w / 2)) === e.face;
  if (e.shield && fromFront) { pop(e.x + e.w / 2, e.y - 8, 'В ЩИТ', '#cfe8ff', 16); return true; }
  if (e.type === 'drone') { e.st = 'down'; e.t = 320; e.web = 1; e.vx *= .3; pop(e.x, e.y - 10, 'СБИТ!', '#fff', 20); focusAdd(4); return true; }
  e.web = Math.min(3, e.web + 1); e.webT = 150; e.flash = 4; focusAdd(3);
  releaseToken(e);
  if (e.web >= 3) { e.st = 'cocoon'; e.vx = 0; pop(e.x + e.w / 2, e.y - 10, 'КОКОН!', '#fff', 24); stats.kos++; SFX.web(); }
  else { if (e.st === 'windup' || e.st === 'attack' || e.st === 'aim' || e.st === 'fire') { e.st = 'stagger'; e.t = 20; } pop(e.x + e.w / 2, e.y - 8, 'ШВЫРК!', '#fff', 18); }
  return true;
}
function enemyActive(e) { return !e.dead && e.st !== 'ko' && e.st !== 'cocoon'; }
function secBounds(e) { if (!L.sections.length) return [0, L.w]; const i = e.sec; const x0 = i === 0 ? 0 : L.sections[i - 1].x1; const x1 = L.sections[i].x1 != null ? L.sections[i].x1 : L.w; return [x0 + 20, x1 - 20]; }
function updateEnemies() {
  const pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
  for (const e of L.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash--;
    if (e.webT > 0) { e.webT--; if (e.webT === 0 && e.web > 0 && e.web < 3) e.web--; }
    if (e.blockCd > 0) e.blockCd--;
    const ecx = e.x + e.w / 2, dx = pcx - ecx, ad = Math.abs(dx), dy = (P.y + P.h) - (e.y + e.h);
    e.anim += Math.abs(e.vx) * .1 + .02;
    if (e.cd > 0) e.cd--;
    if (e.type === 'drone') { updateDrone(e, pcx, pcy); continue; }
    const slow = e.web === 1 ? .5 : e.web >= 2 ? 0 : 1;
    switch (e.st) {
      case 'ko': case 'cocoon': e.vx *= .85; break;
      case 'stagger': e.t--; e.vx *= .85; if (e.t <= 0) e.st = 'idle'; break;
      case 'down': e.t--; e.vx *= .9; if (e.t <= 0) e.st = 'idle'; break;
      case 'air': e.vx *= .98; if (e.onGround && e.t > 4) { e.st = 'down'; e.t = 50; } e.t++; break;
      case 'block': e.t--; e.vx = 0; e.face = sgn(dx); if (e.t <= 0) e.st = 'circle'; break;
      default: aiThink(e, dx, ad, dy, slow);
    }
    // traps
    for (const tr of traps) if (enemyActive(e) && tr.life > 0 && Math.abs(tr.x - ecx) < 22 && Math.abs(tr.y - (e.y + e.h)) < 20) { tr.life = 0; e.web = Math.max(e.web, 2); e.webT = 240; releaseToken(e); pop(ecx, e.y - 10, 'ПОПАЛСЯ!', '#fff', 20); if (e.st === 'windup' || e.st === 'attack') e.st = 'idle'; }
    // edge guard
    if (enemyActive(e) && e.onGround && e.vx !== 0 && e.st !== 'stagger' && e.st !== 'air' && e.st !== 'down') {
      const ahead = ecx + sgn(e.vx) * (e.w / 2 + 4);
      if (!standAt(ahead, e.y + e.h + 3)) e.vx = 0;
    }
    if (L.sections.length) { const [lo, hi] = secBounds(e); if (e.x < lo && e.vx < 0) e.vx = 0; if (e.x + e.w > hi && e.vx > 0) e.vx = 0; }
    e.vy += GRAV; if (e.vy > 15) e.vy = 15;
    moveBody(e);
    if (e.fellOut) { e.dead = true; stats.kos++; }
  }
  L.enemies = L.enemies.filter(e => !(e.dead && e.type === 'drone' && e.gone));
}
function aiThink(e, dx, ad, dy, slow) {
  const face = sgn(dx);
  const sees = ad < 520 && Math.abs(dy) < 160;
  if (e.type === 'guard' && !L.alarm) { guardThink(e, dx, ad, dy); return; }
  switch (e.type) {
    case 'thug': {
      if (e.st === 'windup') { e.t--; e.vx = 0; if (e.t < 16 && ad < 110) senseTrigger(8); if (e.t <= 0) { e.st = 'attack'; e.t = 12; e.vx = e.face * 5.5; SFX.punch(); } return; }
      if (e.st === 'attack') {
        e.t--; e.vx *= .9;
        const hb = { x: e.face > 0 ? e.x + e.w : e.x - (e.bat ? 44 : 32), y: e.y + 14, w: e.bat ? 44 : 32, h: 30 };
        if (!e.hitDone && overlap(hb, P)) { e.hitDone = heroHurt(e.bat ? 14 : 10, e.x + e.w / 2); }
        if (e.t <= 0) { e.st = 'recover'; e.t = 26; e.hitDone = false; }
        return;
      }
      if (e.st === 'recover') { e.t--; e.vx *= .8; if (e.t <= 0) { e.st = 'circle'; releaseToken(e); e.cd = 70 + Math.random() * 60; } return; }
      if (!sees) { e.st = 'idle'; e.vx = lerp(e.vx, 0, .2); return; }
      e.face = face;
      if (ad > 150) { e.st = 'approach'; e.vx = face * 2.6 * slow; }
      else {
        e.st = 'circle';
        if (e.t-- <= 0) { e.side = Math.random() < .5 ? -1 : 1; e.t = 30 + Math.random() * 40; }
        const want = ad < 80 ? -face : ad > 130 ? face : e.side * .6;
        e.vx = lerp(e.vx, want * 2 * slow, .15);
        if (slow > 0 && e.cd <= 0 && L.tokensMelee > 0 && Math.random() < .04 && Math.abs(dy) < 50) { L.tokensMelee--; e.token = true; e.st = 'windup'; e.t = 26; e.vx = 0; }
      }
      break;
    }
    case 'gunner': {
      if (e.st === 'aim') {
        e.t--; e.vx = 0; e.face = face;
        if (e.t > 12) e.aimA = Math.atan2((P.y + 30) - (e.y + 22), (P.x + P.w / 2) - (e.x + e.w / 2));
        if (e.t < 18 && e.t > 0) senseTrigger(6);
        if (e.t <= 0) { e.st = 'fire'; e.t = 24; }
        return;
      }
      if (e.st === 'fire') {
        e.t--; e.vx = 0;
        if (e.t % 8 === 0) { const a = e.aimA; bullets.push({ x: e.x + e.w / 2 + Math.cos(a) * 24, y: e.y + 22 + Math.sin(a) * 24, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, life: 120, dmg: 8 }); SFX.shot(); }
        if (e.t <= 0) { e.st = 'cover'; e.t = 60 + Math.random() * 50; }
        return;
      }
      if (!sees) { e.st = 'idle'; e.vx = 0; return; }
      e.face = face;
      if (ad < 120) { e.st = 'retreat'; e.vx = -face * 3.2 * slow; if (e.onGround && Math.random() < .02) e.vy = -9; return; }
      const cover = pickCover(e);
      const want = cover ? cover.x : (P.x + P.w / 2) - face * 320;
      const d = want - (e.x + e.w / 2);
      if (Math.abs(d) > 14) { e.st = 'reposition'; e.vx = sgn(d) * 2.8 * slow; }
      else {
        e.vx = 0;
        if (e.st !== 'cover') { e.st = 'cover'; e.t = 40 + Math.random() * 40; }
        if (--e.t <= 0 && slow > 0) { e.st = 'aim'; e.t = 42; }
      }
      break;
    }
    case 'brute': {
      if (e.st === 'windup') { e.t--; e.vx = 0; if (e.t < 16 && ad < 120) senseTrigger(8); if (e.t <= 0) { e.st = 'attack'; e.t = 14; shake = 6; SFX.slam(); } return; }
      if (e.st === 'attack') {
        e.t--;
        if (e.t === 12) { const hb = { x: e.face > 0 ? e.x + e.w - 4 : e.x - 58, y: e.y + 20, w: 62, h: 60 }; if (overlap(hb, P)) heroHurt(14, e.x + e.w / 2, 9); burst(e.x + e.w / 2 + e.face * 40, e.y + e.h, '#b8a88a', 10, 4); }
        if (e.t <= 0) { e.st = 'recover'; e.t = 34; }
        return;
      }
      if (e.st === 'recover') { e.t--; if (e.t <= 0) { e.st = 'guard'; releaseToken(e); e.cd = 60; } return; }
      if (!sees) { e.st = 'idle'; e.vx = 0; return; }
      e.face = face;
      // bodyguard: stand between hero and a ranged ally
      let ward = null, wd = 600;
      for (const o of L.enemies) if (o !== e && enemyActive(o) && (o.type === 'gunner' || o.type === 'medic' || o.type === 'jammer') && o.sec === e.sec) { const d = Math.abs(o.x - e.x); if (d < wd) { wd = d; ward = o; } }
      let want;
      if (ward && e.shield) want = ward.x + ward.w / 2 + sgn((P.x) - ward.x) * 70;
      else want = P.x + P.w / 2 - face * 50;
      const d = want - (e.x + e.w / 2);
      e.st = 'guard';
      e.vx = Math.abs(d) > 10 ? sgn(d) * (e.shield ? 1.5 : 2) * slow : 0;
      if (ad < 72 && Math.abs(dy) < 60 && e.cd <= 0 && slow > 0) { e.st = 'windup'; e.t = 30; e.vx = 0; if (L.tokensMelee > 0) { L.tokensMelee--; e.token = true; } }
      break;
    }
    case 'medic': {
      if (e.st === 'revive') {
        e.t--; e.vx = 0;
        const tgt = e.target;
        if (!tgt || tgt.st !== 'ko') { e.st = 'idle'; e.target = null; return; }
        if (e.t <= 0) { tgt.hp = Math.ceil(tgt.max / 2); tgt.st = 'stagger'; tgt.t = 30; tgt.web = 0; pop(tgt.x + tgt.w / 2, tgt.y - 10, 'ПОДНЯЛСЯ!', '#ff9a8a', 22); SFX.good(); e.target = null; e.st = 'idle'; e.cd = 90; }
        return;
      }
      let tgt = null, bd = 900;
      for (const o of L.enemies) if (o !== e && o.st === 'ko' && o.sec === e.sec && !o.dead) { const d = Math.abs(o.x - e.x); if (d < bd) { bd = d; tgt = o; } }
      if (tgt && e.cd <= 0) {
        const d = (tgt.x + tgt.w / 2) - (e.x + e.w / 2);
        e.face = sgn(d);
        if (Math.abs(d) > 18) { e.st = 'run'; e.vx = sgn(d) * 3 * slow; }
        else if (slow > 0) { e.st = 'revive'; e.t = 150; e.target = tgt; e.vx = 0; if (!L.data.medicHint) { L.data.medicHint = 1; showHint('Техник поднимает упавших! Приклей их паутиной (K рядом) или вырубай техника первым', 420); } }
        return;
      }
      e.face = face;
      if (ad < 150) { e.vx = -face * 3 * slow; e.st = 'run'; } else if (ad > 300) { e.vx = face * 2 * slow; e.st = 'run'; } else { e.vx = 0; e.st = 'idle'; }
      break;
    }
    case 'jammer': {
      e.face = face;
      if (!L.data.jamHint && ad < 300) { L.data.jamHint = 1; showHint('Глушилка! Рядом с техником не работает паутина — достань его кулаками', 400); }
      if (ad < 140) { e.vx = -face * 3.1 * slow; e.st = 'run'; } else if (ad > 240) { e.vx = face * 1.6 * slow; e.st = 'run'; } else { e.vx = 0; e.st = 'idle'; }
      break;
    }
  }
}
function pickCover(e) {
  const px = P.x + P.w / 2;
  let best = null, bd = 1e9;
  const [lo, hi] = secBounds(e);
  for (const s of L.solids) {
    if (s.kind !== 'cover' || s.x < lo || s.x + s.w > hi) continue;
    const scx = s.x + s.w / 2;
    if (Math.abs(scx - px) < 140) continue;
    const side = sgn(scx - px);
    const standX = side > 0 ? s.x + s.w + e.w / 2 + 2 : s.x - e.w / 2 - 2;
    if (Math.abs(standAt(standX, s.y + s.h + 2) ? 0 : 1)) continue;
    const d = Math.abs(standX - (e.x + e.w / 2)) + Math.abs(scx - px) * .2;
    if (d < bd) { bd = d; best = { x: standX }; }
  }
  return best;
}
function guardThink(e, dx, ad, dy) {
  // patrol with a flashlight cone
  if (e.st !== 'look') {
    e.st = 'patrol';
    e.vx = e.face * 1.2;
    if (e.x < e.px1) e.face = 1; if (e.x > e.px2) e.face = -1;
  }
  const ex = e.x + e.w / 2, ey = e.y + 22;
  const px = P.x + P.w / 2, py = P.y + 30;
  const ang = Math.atan2(py - ey, px - ex), fa = e.face > 0 ? 0 : Math.PI;
  let da = Math.abs(((ang - fa + Math.PI * 3) % TAU) - Math.PI);
  const d = dist(ex, ey, px, py);
  const inCone = d < 250 && da < .5 && !lineBlocked(ex, ey, px, py);
  if (inCone) { e.alert += d < 110 ? 6 : 3; e.st = 'look'; e.vx = 0; if (e.alert > 30) senseTrigger(4); }
  else { e.alert = Math.max(0, e.alert - .8); if (e.st === 'look' && e.alert <= 0) e.st = 'patrol'; }
  // notice knocked allies
  for (const o of L.enemies) if (o !== e && (o.st === 'ko' || o.st === 'cocoon') && Math.abs(o.x - e.x) < 220 && sgn(o.x - e.x) === e.face && Math.abs(o.y - e.y) < 80) { e.alert += 2; }
  if (e.alert >= 100) raiseAlarm();
}
function raiseAlarm() {
  if (L.alarm) return;
  L.alarm = true; SFX.alarm(); shake = 6;
  pop(P.x + 12, P.y - 30, 'ТРЕВОГА!', '#ff4d5e', 32);
  for (const e of L.enemies) if (e.type === 'guard') { e.type = 'gunner'; e.st = 'idle'; }
  if (L.def.onAlarm) L.def.onAlarm(L);
}
function stealthTakedownCheck() {
  if (L.alarm) return false;
  const p = P, px = p.x + p.w / 2;
  for (const e of L.enemies) {
    if (e.type !== 'guard' || !enemyActive(e)) continue;
    const ex = e.x + e.w / 2;
    const behind = sgn(px - ex) !== e.face && Math.abs(px - ex) < 60 && Math.abs((p.y + p.h) - (e.y + e.h)) < 30;
    const above = Math.abs(px - ex) < 50 && p.y + p.h < e.y + 10 && p.y + p.h > e.y - 140 && (p.st === 'wall' || !p.onGround || p.perchT > 0 || p.onGround);
    if ((behind || above) && e.alert < 100) {
      e.st = 'cocoon'; e.web = 3; stats.kos++;
      pop(ex, e.y - 12, 'ТИХО!', '#b8ffd8', 24); SFX.web();
      if (above && !behind) { p.x = ex - p.w / 2; p.y = e.y + e.h - p.h; p.vy = 0; p.st = 'free'; }
      p.atk = null; focusAdd(8);
      return true;
    }
  }
  return false;
}
function stealthPrompt() {
  if (!L || L.alarm || !L.stealthTakedown) return null;
  const p = P, px = p.x + p.w / 2;
  for (const e of L.enemies) {
    if (e.type !== 'guard' || !enemyActive(e)) continue;
    const ex = e.x + e.w / 2;
    const behind = sgn(px - ex) !== e.face && Math.abs(px - ex) < 60 && Math.abs((p.y + p.h) - (e.y + e.h)) < 30;
    const above = Math.abs(px - ex) < 50 && p.y + p.h < e.y + 10 && p.y + p.h > e.y - 140;
    if (behind || above) return e;
  }
  return null;
}
function updateDrone(e, pcx, pcy) {
  const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
  if (e.st === 'down') {
    e.vy += GRAV; moveBody(e); e.vx *= .9; e.t--;
    if (e.t <= 0) { e.st = 'hover'; e.web = 0; }
    return;
  }
  e.face = sgn(pcx - ex);
  switch (e.st) {
    case 'aim':
      e.t--; e.vx *= .9; e.vy *= .9;
      if (e.t > 14) { e.tx = pcx; e.ty = pcy; }
      if (e.t < 20) senseTrigger(6);
      if (e.t <= 0) { e.st = 'dive'; const a = Math.atan2(e.ty - ey, e.tx - ex); e.vx = Math.cos(a) * 10; e.vy = Math.sin(a) * 10; e.t = 40; SFX.zip(); }
      break;
    case 'dive':
      e.t--; e.x += e.vx; e.y += e.vy;
      if (overlap(e, P)) { heroHurt(10, ex); e.t = 0; }
      if (solidAt(ex, ey + 12)) e.t = 0;
      if (e.t <= 0) { e.st = 'hover'; e.cd = 110 + Math.random() * 60; }
      break;
    default: {
      e.st = 'hover';
      const tx = pcx + e.side * 170 - e.w / 2, ty = pcy - 150 + Math.sin(frame * .04 + e.seed) * 20 - e.h / 2;
      e.x += clamp(tx - e.x, -2.6, 2.6); e.y += clamp(ty - e.y, -2.2, 2.2);
      if (e.cd <= 0 && Math.abs(pcx - ex) < 460) { e.st = 'aim'; e.t = 44; }
      if (frame % 240 === Math.floor(e.seed * 20)) e.side *= -1;
    }
  }
}
// tethered drone pairs damage the hero on contact
function updateTethers() {
  for (const e of L.enemies) {
    if (e.type !== 'drone' || e.pair == null || e.dead || e.st === 'down') continue;
    const o = L.enemies.find(k => k.pairId === e.pair && k !== e);
    if (!o || o.dead || o.st === 'down') continue;
    if (e.pairId > o.pairId) continue;
    const ax = e.x + e.w / 2, ay = e.y + e.h / 2, bx = o.x + o.w / 2, by = o.y + o.h / 2;
    if (dist(ax, ay, bx, by) > 420) continue;
    e.beam = { bx, by };
    const px = P.x + P.w / 2, py = P.y + 36;
    const t = clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1), 0, 1);
    if (dist(px, py, ax + (bx - ax) * t, ay + (by - ay) * t) < 26) heroHurt(8, px - 1, 3);
  }
}

// ============================================================ projectiles
function updateProjectiles() {
  for (const w of webs) {
    w.x += w.vx; w.y += w.vy; w.life--;
    if (w.kind === 'storm') continue;
    const box = { x: w.x - 9, y: w.y - 8, w: 18, h: 16 };
    for (const e of L.enemies) {
      if (e.dead || e.st === 'cocoon') continue;
      if (e.type === 'thug' && (e.st === 'circle' || e.st === 'approach') && !e.dodged && Math.abs(w.x - (e.x + e.w / 2)) < 90 && sgn(w.vx) === sgn(e.x - w.x) && Math.random() < .3 && e.onGround) { e.dodged = true; e.vy = -8; e.vx = sgn(w.vx) * 3; pop(e.x + e.w / 2, e.y - 6, 'МИМО!', '#cfe8ff', 16); }
      if (overlap(box, e)) { if (webEnemy(e)) { w.life = 0; burst(w.x, w.y, '#fff', 8, 3, .05); break; } }
    }
    if (w.life > 0) for (const b of bullets) if (b.life > 0 && Math.abs(b.x - w.x) < 14 && Math.abs(b.y - w.y) < 14) { b.life = 0; w.life = 0; burst(w.x, w.y, '#fff', 5, 2, .05); }
    if (w.life > 0 && L.boss && L.boss.webHit && L.boss.webHit(w)) w.life = 0;
    if (w.life > 0 && L.events) for (const ev of L.events) if (ev.onWeb && ev.onWeb(w)) { w.life = 0; break; }
    if (w.life > 0 && solidAt(w.x, w.y)) { w.life = 0; decals.push({ x: w.x, y: w.y, life: 400 }); }
  }
  webs = webs.filter(w => w.life > 0);
  for (const b of bullets) {
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.grav) b.vy += b.grav;
    if (overlap({ x: b.x - 5, y: b.y - 5, w: 10, h: 10 }, P)) { if (heroHurt(b.dmg || 8, b.x - b.vx * 5, b.knock != null ? b.knock : 4)) b.life = 0; }
    if (b.life > 0 && solidAt(b.x, b.y)) { b.life = 0; burst(b.x, b.y, b.big ? '#c8b8a0' : GOLD, b.big ? 12 : 4, b.big ? 5 : 2); if (b.big) { shake = 8; SFX.slam(); } }
  }
  bullets = bullets.filter(b => b.life > 0 && b.y < L.h + 100);
  for (const t of tethers) t.life--;
  tethers = tethers.filter(t => t.life > 0);
  for (const tr of traps) tr.life--;
  traps = traps.filter(t => t.life > 0);
  // throwables
  for (const pr of L.pickups) {
    if (pr.kind !== 'throw' || !pr.held) continue;
    pr.x += pr.vx; pr.y += pr.vy; pr.vy += .3; pr.rot = (pr.rot || 0) + .3;
    if (pr.returning && dist(pr.x, pr.y, P.x + P.w / 2, P.y + 30) < 40) {
      pr.returning = false;
      let tgt = null, bd = 600;
      for (const e of L.enemies) if (enemyActive(e) && sgn(e.x - P.x) === P.face) { const d = Math.abs(e.x - P.x); if (d < bd) { bd = d; tgt = e; } }
      const tx = tgt ? tgt.x + tgt.w / 2 : P.x + P.face * 300, ty = tgt ? tgt.y + 30 : P.y;
      const a = Math.atan2(ty - pr.y, tx - pr.x); pr.vx = Math.cos(a) * 14; pr.vy = Math.sin(a) * 14 - 2; pr.thrown = 1;
    }
    if (pr.thrown) for (const e of L.enemies) if (enemyActive(e) && overlap({ x: pr.x - 14, y: pr.y - 14, w: 28, h: 28 }, e)) { damageEnemy(e, { dmg: 3, kb: 8, down: true, brk: true, dir: sgn(pr.vx), k: 'throw' }); pr.gone = true; burst(pr.x, pr.y, '#9a6a3a', 14, 5); SFX.heavy(); }
    if (!pr.returning && (solidAt(pr.x, pr.y) || pr.y > L.h)) { pr.gone = true; burst(pr.x, pr.y, '#9a6a3a', 12, 4); }
  }
  L.pickups = L.pickups.filter(p => !p.gone);
}

// ============================================================ pickups / tokens / civilians / events
function updatePickups() {
  for (const k of L.pickups) {
    if (k.kind === 'hotdog' && !k.got && overlap(P, { x: k.x - 14, y: k.y - 10, w: 28, h: 24 })) { k.got = true; P.hp = Math.min(P.max, P.hp + 30); pop(k.x, k.y - 16, '+ХОТ-ДОГ', GOLD, 18); SFX.pick(); }
  }
  L.pickups = L.pickups.filter(k => !k.got);
  for (const t of L.tokens) {
    if (!t.got && dist(t.x, t.y, P.x + P.w / 2, P.y + 36) < 34) {
      t.got = true; SAVE.tokens++; SAVE.flags['tok_' + L.id + '_' + t.i] = 1; SFX.token();
      pop(t.x, t.y - 20, `ЖЕТОН ${SAVE.tokens}`, GOLD, 22); checkUnlocks();
    }
  }
  for (const r of L.rings) {
    if (!r.got && dist(r.x, r.y, P.x + P.w / 2, P.y + 36) < 44) { r.got = true; SFX.ring(); P.vx = clamp(P.vx * 1.25 + P.face * 2, -16, 16); burst(r.x, r.y, GOLD, 10, 3, .02); if (L.timer) L.timer += 90; pop(r.x, r.y - 30, '+1.5 С', GOLD, 18); }
  }
}
function updateCivs() {
  for (const c of L.civs) {
    c.t++;
    if (c.bubbleT > 0) c.bubbleT--;
    if (c.follow) continue;
    if (c.static) { c.face = sgn(P.x - c.x) || c.face; continue; }
    c.x += c.vx; c.anim = (c.anim || 0) + Math.abs(c.vx) * .1;
    if (c.x < c.x1) { c.vx = Math.abs(c.vx); c.face = 1; } if (c.x > c.x2) { c.vx = -Math.abs(c.vx); c.face = -1; }
    const near = Math.abs(c.x - (P.x + P.w / 2)) < 50 && Math.abs(c.y - (P.y + P.h)) < 40;
    if (near && pressed.act && !c.greeted) {
      c.greeted = true; c.bubble = pick(GREETINGS); c.bubbleT = 160; SFX.thanks(); SAVE.trust = Math.min(100, SAVE.trust + 1);
      pop(c.x, c.y - 90, '♥', ROSE, 20);
    }
  }
}
const GREETINGS = [
  'Эй, паучок! Классные штаны!', 'Можно селфи? ...Ой, ты уже улетел.', 'Спасибо за вчерашнее, дружище!', 'Джеймсон врёт, ты крутой!',
  'Мой сын носит такую же футболку!', 'Осторожнее на крышах, сынок!', 'Паук! Ты правда из Квинса?', 'Оранжевый — это смело. Уважаю.',
  'Слышал, ты снял кота с антенны. Красавчик.', 'Эти джинсы — это какой-то стиль?',
];
function nearestCivGreet() {
  if (!L || !L.civs) return null;
  for (const c of L.civs) if (!c.greeted && !c.follow && !c.static && Math.abs(c.x - (P.x + P.w / 2)) < 50 && Math.abs(c.y - (P.y + P.h)) < 40) return c;
  return null;
}

// ============================================================ camera and progress
function updateCamera() {
  const p = P;
  const leadX = p.st === 'swing' || Math.abs(p.vx) > 7 ? p.vx * 14 : p.vx * 8;
  const tx = clamp(p.x - W * .42 + leadX, 0, Math.max(0, L.w - W));
  const ty = clamp(p.y - H * .52 + (p.vy > 6 ? 60 : 0), 0, Math.max(0, L.h - H));
  camX = lerp(camX, tx, .12); camY = lerp(camY, ty, .1);
  if (L.camLock) { camX = lerp(camX, L.camLock.x, .15); camY = lerp(camY, L.camLock.y, .15); }
}
function checkSections() {
  if (!L.sections.length || L.done) return;
  const i = L.sec, S = L.sections[i];
  const x0 = i === 0 ? 0 : L.sections[i - 1].x1;
  if (!S.entered && P.x > x0 + 30) { S.entered = true; if (S.enter) runStory(S.enter); if (S.hint) showHint(S.hint, 420); }
  if (!S.cleared && S.entered && !L.enemies.some(e => e.sec === i && enemyActive(e) && !e.optional)) {
    S.cleared = true;
    const b = L.barriers[i];
    if (b) { b.active = false; pop(b.x, P.y - 60, 'ПУТЬ СВОБОДЕН!', '#b8ffd8', 28); SFX.open(); }
    if (i < L.sections.length - 1) { L.sec++; L.ck = L.sec; spawnSection(L.sec); }
    else if (!L.def.goal || L.def.goal === 'clear') finishLevel();
  }
}
function finishLevel() {
  if (L.done) return;
  L.done = true;
  const cb = L.onDone;
  if (cb) cb();
}
function updateLevel() {
  if (hitstop > 0) { hitstop--; updateFx(); return; }
  stats.time++; L.t++;
  updateHero();
  if (state !== 'play') return;
  updateEnemies();
  updateTethers();
  updateProjectiles();
  updatePickups();
  updateCivs();
  if (L.events.length) updateEvents();
  if (L.boss) L.boss.update();
  if (L.def.tick) L.def.tick(L);
  if (L.timer > 0 && state === 'play') { L.timer--; if (L.timer === 0 && L.def.onTimeout) L.def.onTimeout(L); }
  for (const b of L.barriers) if (b) b.fade = lerp(b.fade, b.active ? 1 : 0, .06);
  updateFx();
  updateCamera();
  checkSections();
  if (L.def.goalX != null && P.x > L.def.goalX && !L.done && (!L.def.goalCheck || L.def.goalCheck(L))) finishLevel();
}

// ============================================================ rendering
function heroPoseNow() {
  const p = P;
  if (p.st === 'grabbed') return POSES.hurt();
  if (p.st === 'dodge') { const q = POSES.roll(); q.rot = (1 - p.t / 18) * TAU; return q; }
  if (p.st === 'hurt') return POSES.hurt();
  if (p.st === 'wall') return POSES.wall(p.anim);
  if (p.st === 'zip') return POSES.zip();
  if (p.st === 'swing' && p.swing) { const ax = (p.swing.x - (p.x + p.w / 2)) * p.face, ay = p.swing.y - (p.y + p.h - 64); return POSES.swing(0, ax, ay); }
  if (p.atk) {
    const k = p.atk.k;
    if (k === 'swingkick') return POSES.kick();
    if (k === 'dive') return POSES.dive();
    return POSES[k] ? POSES[k]() : POSES.jab();
  }
  if (p.shootT > 0) return p.kT > 0 || p.shootT > 12 ? POSES.pull() : POSES.shoot();
  if (p.carry) return p.onGround && Math.abs(p.vx) > .5 ? Object.assign(POSES.run(p.anim), { hF: [8, -84], hB: [-6, -84] }) : POSES.carry();
  if (p.perchT > 0) return POSES.perch();
  if (!p.onGround) { const q = p.vy < 0 ? POSES.jump() : POSES.fall(); if (p.flip) q.rot = p.rot * p.face; return q; }
  if (p.landT > 0) return POSES.land();
  if (Math.abs(p.vx) > .6) return POSES.run(p.anim);
  if (keys.down) return POSES.crouch();
  return POSES.idle(frame);
}
function drawHeroNow() {
  const p = P;
  const x = p.x + p.w / 2, y = p.y + p.h;
  if (p.swing) {
    const hx = x + p.face * 8, hy = p.y + 4;
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(p.swing.x, p.swing.y); ctx.stroke();
    ctx.strokeStyle = '#f4f4fa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(p.swing.x, p.swing.y); ctx.stroke();
    ocirc(p.swing.x, p.swing.y, 4, '#fff', 1.5);
  }
  if (p.st === 'zip' && p.zip) {
    ctx.strokeStyle = '#f4f4fa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + p.face * 10, p.y + 10); ctx.lineTo(p.zip.x, p.zip.y); ctx.stroke();
  }
  const alpha = p.inv > 0 && p.st !== 'dodge' && frame % 6 < 3 ? .5 : 1;
  const pose = heroPoseNow();
  drawHero(x, y, p.face, pose, SAVE.suit, { alpha });
  if (p.carry) { const c = p.carry; drawPerson(x - p.face * 4, p.y + 8, -p.face, LOOKS[c.look] || LOOKS.worker, POSES.lie(), { s: c.cat ? .6 : .85 }); }
  if (p.sense > 0) {
    ctx.strokeStyle = frame % 4 < 2 ? '#ff5a7a' : '#ffd84a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * .45, r0 = 30, r1 = 44; const hx = x + p.face * 4, hy = p.y - 6; ctx.beginPath(); for (let k = 0; k <= 4; k++) { const r = lerp(r0, r1, k / 4); ctx.lineTo(hx + Math.cos(a) * r + (k % 2 ? 3 : -3), hy + Math.sin(a) * r * .6); } ctx.stroke(); }
  }
  if (p.jammed) { ctx.fillStyle = '#b88aff'; ctx.font = `10px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText('ПАУТИНА ✕', x, p.y - 28); ctx.textAlign = 'left'; }
}
function renderLevel() {
  const th = L.theme;
  if (L.def.bg === 'river') drawRiverBg(camX, camY, L.h, L.def.fire);
  else if (L.def.bg === 'interior') drawInteriorBg(camX, camY, 'oscorp');
  else drawSky(th, camX, camY, L.h);
  const sx = shake ? (Math.random() - .5) * shake : 0, sy = shake ? (Math.random() - .5) * shake : 0;
  ctx.save(); ctx.translate(-Math.round(camX) + sx, -Math.round(camY) + sy);
  if (L.def.drawBack) L.def.drawBack(L);
  for (const s of L.solids) { if (s.x + s.w < camX - 120 || s.x > camX + W + 120 || s.y > camY + H + 140 || s.y + s.h < camY - 160) continue; if (s.kind !== 'barrier') drawSolid(s, L); }
  for (const d of decals) { ctx.globalAlpha = Math.min(1, d.life / 60); ctx.fillStyle = '#fff'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.lineTo(d.x + Math.cos(a) * (i % 2 ? 4 : 9), d.y + Math.sin(a) * (i % 2 ? 4 : 9)); } ctx.fill(); ctx.globalAlpha = 1; }
  for (const tr of traps) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI + i / 5 * Math.PI; ctx.moveTo(tr.x, tr.y - 2); ctx.lineTo(tr.x + Math.cos(a) * 18, tr.y - 2 + Math.sin(a) * 8); } ctx.stroke(); }
  for (const k of L.pickups) { if (k.kind === 'hotdog') drawHotdog(k.x, k.y + Math.sin(frame * .08 + k.x) * 3); else if (k.kind === 'throw') { ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.rot || 0); orrect(-12, -12, 24, 24, 2, '#9a6a3a', 2.2); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); ctx.stroke(); ctx.restore(); } }
  for (const t of L.tokens) if (!t.got) drawToken(t.x, t.y + Math.sin(frame * .06 + t.i) * 4);
  for (const r of L.rings) if (!r.got) { ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(r.x, r.y, 24, 42, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x, r.y, 24, 42, 0, 0, TAU); ctx.stroke(); }
  for (const c of L.civs) drawCiv(c);
  if (L.events.length) drawEvents();
  // jammer fields
  for (const e of L.enemies) if (e.type === 'jammer' && enemyActive(e)) { ctx.strokeStyle = `rgba(184,138,255,${.25 + .15 * Math.sin(frame * .1)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y + 30, 250, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  // guard cones
  for (const e of L.enemies) if (e.type === 'guard' && enemyActive(e) && !L.alarm) {
    const ex = e.x + e.w / 2, ey = e.y + 22, fa = e.face > 0 ? 0 : Math.PI;
    const g = ctx.createRadialGradient(ex, ey, 10, ex, ey, 250);
    const a = e.alert > 50 ? '255,80,80' : '255,245,180';
    g.addColorStop(0, `rgba(${a},.35)`); g.addColorStop(1, `rgba(${a},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.arc(ex, ey, 250, fa - .5, fa + .5); ctx.closePath(); ctx.fill();
    if (e.alert > 0) { ctx.fillStyle = e.alert > 60 ? '#ff4d5e' : GOLD; ctx.font = `18px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(e.alert > 60 ? '!' : '?', ex, e.y - 16); ctx.textAlign = 'left'; }
  }
  for (const e of L.enemies) {
    if (e.dead) continue;
    if (e.x + 80 < camX || e.x - 80 > camX + W) continue;
    drawEnemy(e);
    if (e.st === 'windup' && frame % 6 < 3) drawStar(e.x + e.w / 2 + e.face * 18, e.y + 6, 7, '#ff4d5e');
    if (e.st === 'aim' && e.type === 'gunner') { const a = e.aimA || 0; const ox = e.x + e.w / 2, oy = e.y + 22; ctx.strokeStyle = `rgba(255,50,50,${e.t < 12 ? .9 : .45})`; ctx.lineWidth = e.t < 12 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 700, oy + Math.sin(a) * 700); ctx.stroke(); }
    if (e.type === 'drone' && e.st === 'aim') { ctx.strokeStyle = 'rgba(255,60,60,.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2); ctx.lineTo(e.tx || 0, e.ty || 0); ctx.stroke(); ctx.setLineDash([]); }
    if (e.beam) { const ax = e.x + e.w / 2, ay = e.y + e.h / 2; ctx.strokeStyle = frame % 4 < 2 ? '#bfe8ff' : '#6ab0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); for (let k = 1; k < 8; k++) ctx.lineTo(lerp(ax, e.beam.bx, k / 8) + (Math.random() - .5) * 10, lerp(ay, e.beam.by, k / 8) + (Math.random() - .5) * 10); ctx.lineTo(e.beam.bx, e.beam.by); ctx.stroke(); e.beam = null; }
    if (e.st === 'revive') { ctx.fillStyle = INK; ctx.fillRect(e.x - 6, e.y - 18, 40, 7); ctx.fillStyle = '#ff9a8a'; ctx.fillRect(e.x - 5, e.y - 17, 38 * (1 - e.t / 150), 5); }
    if (e.st === 'ko' && L.enemies.some(m => m.type === 'medic' && enemyActive(m) && m.sec === e.sec)) { ctx.fillStyle = '#fff'; ctx.font = `9px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(COARSE ? 'ПАУТИНА — ПРИКЛЕИТЬ' : 'K — ПРИКЛЕИТЬ', e.x + e.w / 2, e.y + e.h - 30); ctx.textAlign = 'left'; }
  }
  if (L.boss) L.boss.draw();
  drawHeroNow();
  for (const t of tethers) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); }
  for (const w of webs) { if (w.kind === 'storm') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x - w.vx * 2, w.y - w.vy * 2); ctx.stroke(); continue; } ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(w.x - w.vx * 1.6, w.y); ctx.lineTo(w.x, w.y); ctx.stroke(); ocirc(w.x, w.y, 5, '#fff', 1.6); }
  for (const b of bullets) { if (b.big) { if (b.draw) b.draw(b); else { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.life * .1); orrect(-20, -14, 40, 28, 3, '#6a6a7a', 2.4); ctx.restore(); } } else { ocirc(b.x, b.y, 4, '#ffb03a', 1.6); ctx.fillStyle = 'rgba(255,176,58,.35)'; circle(b.x - b.vx, b.y - b.vy, 4); } }
  for (const q of parts) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    if (q.ring) { ctx.strokeStyle = q.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q.x, q.y, (1 - q.life / q.max) * q.ring + 8, 0, TAU); ctx.stroke(); }
    else if (q.star) drawStar(q.x, q.y, q.size * (q.life / q.max) + 4, '#fff');
    else if (q.line) { ctx.strokeStyle = q.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + 40, q.y); ctx.stroke(); }
    else { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.size, q.size); }
  }
  ctx.globalAlpha = 1;
  if (L.def.drawFront) L.def.drawFront(L);
  for (const s of L.solids) if (s.kind === 'barrier') drawSolid(s, L);
  for (const q of pops) drawPop(q);
  // prompts
  const g = nearestCivGreet(); if (g && state === 'play') promptAt(g.x, g.y - 96, 'ПОПРИВЕТСТВОВАТЬ');
  const sp = stealthPrompt(); if (sp && state === 'play') promptAt(sp.x + sp.w / 2, sp.y - 30, 'ТИХОЕ УСТРАНЕНИЕ', true);
  ctx.restore();
  // speed lines when fast
  const sp2 = Math.hypot(P.vx, P.vy);
  if (sp2 > 12) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const y = hash(i, frame >> 2) * H, x = hash(i + 50, frame >> 2) * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - P.vx * 6, y - P.vy * 6); ctx.stroke(); } }
}
function promptAt(x, y, text, punch) {
  ctx.font = `10px ${F_DISP}`; ctx.textAlign = 'center';
  const t = (punch ? (COARSE ? 'УДАР · ' : 'J · ') : (COARSE ? 'УДАР · ' : 'E · ')) + text;
  const tw = ctx.measureText(t).width;
  orrect(x - tw / 2 - 6, y - 12, tw + 12, 17, 3, 'rgba(12,8,24,.9)', 1.6);
  ctx.fillStyle = '#fff'; ctx.fillText(t, x, y + 1); ctx.textAlign = 'left';
}
function drawPop(q) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const k = q.life > 46 ? 1 + (q.life - 46) * .07 : 1;
  ctx.globalAlpha = Math.min(1, q.life / 15);
  ctx.font = `${Math.round(q.size * k)}px ${F_DISP}`;
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.strokeText(q.text, q.x, q.y); ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y);
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function drawCiv(c) {
  const L2 = LOOKS[c.look] || LOOKS.office;
  const pose = c.pose ? POSES[c.pose](frame) : (Math.abs(c.vx) > .1 && !c.static ? POSES.walk(c.anim) : c.wave ? POSES.wave(frame) : POSES.idle(frame + c.x));
  drawPerson(c.x, c.y, c.face || 1, L2, pose);
  if (c.bubbleT > 0 && c.bubble) speechBubble(c.x, c.y - 100, c.bubble);
}
function speechBubble(x, y, text) {
  ctx.font = `15px ${F_TALK}`;
  const tw = Math.min(260, ctx.measureText(text).width);
  const bx = x - tw / 2 - 10, by = y - 30;
  ofill(() => { if (ctx.roundRect) ctx.roundRect(bx, by, tw + 20, 28, 10); else ctx.rect(bx, by, tw + 20, 28); ctx.moveTo(x - 6, by + 28); ctx.lineTo(x, by + 38); ctx.lineTo(x + 6, by + 28); }, '#fffbe8', 2.2);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(text, x, by + 19, 260); ctx.textAlign = 'left';
}

// ============================================================ citizen events
// ev: { id, type, x, y, label, req, st: idle|active|done, ... }
function evNear(ev, r = 70) { return Math.abs(P.x + P.w / 2 - ev.x) < r && Math.abs(P.y + P.h - ev.y) < 90; }
function completeEvent(ev, line) {
  ev.st = 'done'; SAVE.helped++; SAVE.trust = Math.min(100, SAVE.trust + 6); stats.saves++;
  SFX.thanks(); pop(ev.x, ev.y - 110, 'ГОРОЖАНИН СПАСЁН!', '#b8ffd8', 24);
  if (line) { ev.bubble = line; ev.bubbleT = 200; }
  checkUnlocks();
  if (L.def.onEvent) L.def.onEvent(L, ev);
}
function updateEvents() {
  for (const ev of L.events) {
    if (ev.bubbleT > 0) ev.bubbleT--;
    if (ev.st === 'done') continue;
    const T = EVENT_TYPES[ev.type];
    if (ev.st === 'idle') {
      if (T.autoStart ? evNear(ev, T.autoStart) : (evNear(ev) && pressed.act)) { ev.st = 'active'; T.start(ev); }
    } else T.tick(ev);
  }
}
function drawEvents() {
  for (const ev of L.events) {
    const T = EVENT_TYPES[ev.type];
    T.draw(ev);
    if (ev.st === 'idle' && !ev.hidden) {
      const by = ev.y - 128 + Math.sin(frame * .1) * 4;
      ocirc(ev.x, by, 11, ev.req ? GOLD : '#b8ffd8', 2.2);
      ctx.fillStyle = INK; ctx.font = `bold 14px ${F_UI}`; ctx.textAlign = 'center'; ctx.fillText('!', ev.x, by + 5); ctx.textAlign = 'left';
      if (evNear(ev) && !T.autoStart) promptAt(ev.x, by - 22, ev.label.toUpperCase());
    }
    if (ev.bubbleT > 0 && ev.bubble) speechBubble(ev.x, ev.y - 100, ev.bubble);
  }
}
const EVENT_TYPES = {
  // purse snatcher chase
  thief: {
    start(ev) { ev.th = { x: ev.x + 40, y: ev.y - 72, w: 26, h: 72, vx: 0, vy: 0, face: 1, caught: false, anim: 0 }; ev.bubble = 'ДЕРЖИТЕ ВОРА! МОЯ СУМКА!'; ev.bubbleT = 150; showHint('Догони вора и останови его паутиной или ударом', 300); },
    tick(ev) {
      const t = ev.th;
      if (t.caught) { if (evNear(ev) && pressed.act) { completeEvent(ev, 'Моя сумка! Спасибо, паучок!'); } return; }
      t.anim += .3; t.face = 1;
      t.vx = dist(t.x, t.y, P.x, P.y) < 700 ? 4.4 : 2;
      if (t.onGround && (standAt(t.x + t.w + 8, t.y + t.h + 3) == null || solidAt(t.x + t.w + 10, t.y + 30))) t.vy = -12;
      t.vy += GRAV; moveBody(t);
      if (t.x > ev.maxX) { t.x = ev.maxX; t.vx = 0; }
    },
    onHit(ev) { },
    draw(ev) {
      if (ev.st !== 'active' || !ev.th) { drawPerson(ev.x, ev.y, -1, LOOKS.lady, ev.st === 'done' ? POSES.thumbs() : POSES.wave(frame)); return; }
      drawPerson(ev.x, ev.y, -1, LOOKS.lady, POSES.talk(frame));
      const t = ev.th;
      drawPerson(t.x + 13, t.y + t.h, t.face, LOOKS.thief, t.caught ? POSES.lie() : POSES.run(t.anim));
      if (t.caught) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(t.x - 10, t.y + 50, 46, 14); promptAt(ev.x, ev.y - 120, 'ВЕРНУТЬ СУМКУ'); }
      else { orrect(t.x + 18, t.y + 30, 12, 10, 3, '#8a2a4a', 1.6); }
    },
  },
  // falling person: catch before they hit the ground
  fall: {
    autoStart: 220,
    start(ev) { ev.fy = ev.top; ev.fvy = 0; ev.t = 80; ev.bubble = 'ТРОС ОБОРВАЛСЯ! ПОМОГИТЕ!'; ev.bubbleT = 120; SFX.alarm(); },
    tick(ev) {
      if (ev.t > 0) { ev.t--; return; }
      ev.fvy = Math.min(ev.fvy + .12, 3.2); ev.fy += ev.fvy;
      if (dist(P.x + P.w / 2, P.y + 36, ev.x, ev.fy - 30) < 50) { ev.saved = true; ev.fy = ev.y; completeEvent(ev, 'Ты поймал меня! Я думал — всё...'); SFX.web(); return; }
      if (ev.fy >= ev.y - 4) { ev.st = 'idle'; ev.fy = ev.top; ev.bubble = 'Уф... Меня поймал навес. Давай ещё раз осторожнее!'; ev.bubbleT = 160; }
    },
    draw(ev) {
      orrect(ev.x - 34, ev.top - 60, 68, 10, 1, '#8a8aa0', 2);
      if (ev.st === 'active' && ev.t <= 0) { drawPerson(ev.x, ev.fy, 1, LOOKS.washer, POSES.fall()); if (ev.fy < ev.y - 40) { ctx.fillStyle = '#ff4d5e'; ctx.font = `12px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText('ЛОВИ!', ev.x, ev.fy - 100); ctx.textAlign = 'left'; } }
      else if (ev.st === 'done') drawPerson(ev.x + 30, ev.y, -1, LOOKS.washer, POSES.thumbs());
      else drawPerson(ev.x, ev.top - 60, 1, LOOKS.washer, ev.st === 'active' ? POSES.hurt() : POSES.idle(frame));
      if (ev.st === 'active' && ev.t > 0) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ev.x - 30, ev.top - 60); ctx.lineTo(ev.x - 30 + Math.sin(frame * .5) * 6, ev.top - 160); ctx.stroke(); }
    },
  },
  // lift the car: mash minigame
  lift: {
    start(ev) { startMash('ПОДНИМИ МАШИНУ!', 'Жми УДАР (или J) как можно быстрее!', ok => { if (ok) { ev.lifted = true; completeEvent(ev, 'Нога цела! Спасибо тебе, Паук!'); } else { ev.st = 'idle'; showHint('Не хватило сил. Попробуй ещё раз', 200); } }); },
    tick(ev) {},
    draw(ev) {
      if (ev.lifted) { drawCar(ev.x + 70, ev.y, '#c83a3a', -1, 0); drawPerson(ev.x - 20, ev.y, 1, LOOKS.driver, POSES.thumbs()); }
      else { drawPerson(ev.x - 10, ev.y, 1, LOOKS.driver, POSES.lie()); drawCar(ev.x + 20, ev.y + 4, '#c83a3a', -1, -.12); }
    },
  },
  // escort a lost kid to mom
  escort: {
    start(ev) { ev.kid = { x: ev.x, y: ev.y, w: 16, h: 44, vx: 0, vy: 0, face: 1, anim: 0 }; ev.bubble = 'Я потерял маму... Она у фонтана!'; ev.bubbleT = 180; showHint('Отведи мальчика к маме. Он не умеет лазать — иди по земле', 300); },
    tick(ev) {
      const k = ev.kid, px = P.x + P.w / 2;
      const d = px - k.x;
      if (Math.abs(d) > 40 && Math.abs(d) < 360 && P.onGround) { k.vx = sgn(d) * 2.6; k.face = sgn(d); } else k.vx *= .8;
      if (Math.abs(d) >= 360 && frame % 200 === 0) { ev.bubble = 'Подожди меня!'; ev.bubbleT = 90; }
      const nx = k.x + k.vx;
      const wall = L.solids.some(s => (s.kind === 'bldg' || s.kind === 'cover' || s.kind === 'metal') && nx >= s.x && nx <= s.x + s.w && s.y < k.y - 24 && s.y + s.h > k.y - 10);
      if (wall) { k.vx = 0; if (frame % 160 === 0) { ev.bubble = 'Тут не пройти!'; ev.bubbleT = 80; } } else k.x = nx;
      k.anim += Math.abs(k.vx) * .15;
      const g = topAt(k.x, k.y - 24);
      if (g > k.y) { k.vy = Math.min(12, k.vy + .6); k.y = Math.min(g, k.y + k.vy); } else { k.y = g; k.vy = 0; }
      if (Math.abs(k.x - ev.tx) < 40) { completeEvent(ev, 'Мама!!! Спасибо, Паук!'); ev.kid.x = ev.tx - 30; }
    },
    draw(ev) {
      drawPerson(ev.tx, topAt(ev.tx, 0), -1, LOOKS.mom, ev.st === 'done' ? POSES.hug() : POSES.wave(frame));
      const k = ev.kid;
      if (!k) drawPerson(ev.x, ev.y, 1, LOOKS.kid, POSES.idle(frame));
      else drawPerson(k.x, k.y, k.face, LOOKS.kid, Math.abs(k.vx) > .2 ? POSES.walk(k.anim) : POSES.idle(frame));
    },
  },
  // grab the cat from a high spot, bring it to the girl
  cat: {
    start(ev) { ev.bubble = 'Мурзик залез на антенну и не может слезть!'; ev.bubbleT = 180; ev.phase = 'climb'; },
    tick(ev) {
      if (ev.phase === 'climb') {
        if (dist(P.x + P.w / 2, P.y + 40, ev.cx, ev.cy) < 60 && (pressed.act || pressed.punch)) { ev.phase = 'carry'; P.carry = { look: 'kid', cat: true, drop: () => { ev.phase = 'climb'; P.carry = null; } }; SFX.meow(); pop(ev.cx, ev.cy - 30, 'МЯУ!', GOLD, 22); }
      } else if (ev.phase === 'carry') {
        if (evNear(ev, 60) && pressed.act) { P.carry = null; completeEvent(ev, 'Мурзик! Ты лучший, Паук!'); }
      }
    },
    draw(ev) {
      drawPerson(ev.x, ev.y, 1, LOOKS.girl, ev.st === 'done' ? POSES.hug() : POSES.wave(frame));
      if (ev.st === 'done') drawCatSmall(ev.x + 10, ev.y - 40, 1);
      else if (ev.phase !== 'carry') { drawCatSmall(ev.cx, ev.cy, -1); if (ev.st === 'active' && dist(P.x + P.w / 2, P.y + 40, ev.cx, ev.cy) < 60) promptAt(ev.cx, ev.cy - 30, 'ВЗЯТЬ КОТА'); }
      if (ev.st === 'active' && ev.phase === 'carry' && evNear(ev, 60)) promptAt(ev.x, ev.y - 110, 'ОТДАТЬ КОТА');
    },
  },
  // carry an injured person to the drop zone
  carry: {
    start(ev) { P.carry = { look: ev.look || 'worker', drop: () => { ev.st = 'idle'; P.carry = null; ev.x = P.x; ev.y = topAt(P.x, P.y); } }; SFX.pick(); },
    tick(ev) {
      if (Math.abs(P.x + P.w / 2 - ev.tx) < 70 && Math.abs(P.y + P.h - ev.ty) < 90) { P.carry = null; ev.x = ev.tx + (ev.slot || 0) * 22; ev.y = ev.ty; completeEvent(ev, ev.thanks || 'Спасибо... ты спас мне жизнь'); }
    },
    draw(ev) {
      if (ev.st === 'active') { ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(ev.tx, ev.ty - 4, 60, 12, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); return; }
      drawPerson(ev.x, ev.y, 1, LOOKS[ev.look || 'worker'], ev.st === 'done' ? POSES.sit() : POSES.lie());
    },
  },
  // timed pizza delivery
  deliver: {
    start(ev) { ev.tLeft = ev.time * 60; ev.bubble = 'Я подвернул ногу! Отнеси пиццу на крышу с зелёным садом, пока горячая!'; ev.bubbleT = 200; P.carryPizza = true; },
    tick(ev) {
      ev.tLeft--;
      if (dist(P.x + P.w / 2, P.y + P.h, ev.tx, ev.ty) < 70) { P.carryPizza = false; completeEvent(ev, ev.tLeft > 0 ? 'Горячая! Держи чаевые, паучок!' : 'Остыла... но всё равно спасибо!'); ev.doneAt = { x: ev.tx, y: ev.ty }; }
    },
    draw(ev) {
      drawPerson(ev.x, ev.y, 1, LOOKS.pizza, ev.st === 'done' ? POSES.thumbs() : POSES.kneel());
      if (ev.st === 'active') { ctx.fillStyle = GOLD; ctx.font = `14px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText('ПИЦЦА', ev.tx, ev.ty - 120); ctx.fillText('▼', ev.tx, ev.ty - 100); ctx.textAlign = 'left'; drawPerson(ev.tx + 30, ev.ty, -1, LOOKS.tourist, POSES.wave(frame)); }
      if (ev.st === 'done' && ev.doneAt) drawPerson(ev.doneAt.x + 30, ev.doneAt.y, -1, LOOKS.tourist, POSES.thumbs());
    },
  },
  // mugging: clear spawned thugs
  mugging: {
    autoStart: 260,
    start(ev) { ev.foes = ev.spawn.map(f => spawnFoe(f, -1)); ev.foes.forEach(e => { e.optional = true; }); ev.bubble = 'Помогите! Грабят!'; ev.bubbleT = 150; },
    tick(ev) { if (ev.foes.every(e => !enemyActive(e))) completeEvent(ev, 'Ты их всех уложил! Спасибо, сосед!'); },
    draw(ev) { drawPerson(ev.x, ev.y, -1, LOOKS.office, ev.st === 'done' ? POSES.thumbs() : POSES.hurt()); },
  },
};
function checkUnlocks() {
  const U = [['black', () => SAVE.helped >= 3, 'Помоги 3 горожанам'], ['miles', () => SAVE.helped >= 6, 'Помоги 6 горожанам'], ['gwen', () => SAVE.tokens >= 4, 'Найди 4 жетона'],
    ['punk', () => SAVE.tokens >= 8, 'Найди 8 жетонов'], ['noir', () => SAVE.tokens >= 12, 'Найди 12 жетонов'], ['scarlet', () => SAVE.helped >= 9, 'Помоги 9 горожанам'], ['stealth', () => SAVE.flags.oscorpSilent, 'Пройди Оскорп без тревоги'], ['ff', () => SAVE.trust >= 60, 'Доверие горожан 60']];
  for (const [id, fn] of U) if (!SAVE.suits.includes(id) && fn()) { SAVE.suits.push(id); pop(P ? P.x + 12 : W / 2, P ? P.y - 60 : 200, 'НОВЫЙ КОСТЮМ: ' + SUITS[id].name.toUpperCase(), ORANGE, 20); SFX.token(); }
}
const UNLOCK_TEXT = { street: 'Сшит в главе 1', classic: 'Фелиция починит в главе 4', upgraded: 'Глава 3', black: 'Помоги 3 горожанам', iron: 'Глава 5', miles: 'Помоги 6 горожанам', gwen: 'Найди 4 жетона', s2099: 'Глава 6', punk: 'Найди 8 жетонов', noir: 'Найди 12 жетонов', scarlet: 'Помоги 9 горожанам', superior: 'Пройди игру', stealth: 'Пройди Оскорп без тревоги', ff: 'Доверие горожан 60' };
