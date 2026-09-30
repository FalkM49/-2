'use strict';
// ============================================================ speakers
const WHO = {
  peter: { n: 'ПИТЕР ПАРКЕР', bg: '#4a78c8', face: 'peter' },
  spidey: { n: 'ЧЕЛОВЕК-ПАУК', bg: '#f07a1c', face: 'spidey' },
  cat: { n: 'ЧЁРНАЯ КОШКА', bg: '#15131c', accent: ROSE, face: 'cat' },
  felicia: { n: 'ФЕЛИЦИЯ ХАРДИ', bg: '#2a2230', accent: ROSE, face: 'felicia' },
  sms: { n: 'СООБЩЕНИЕ · «КОШКА»', bg: '#2a2230', accent: ROSE, face: 'felicia' },
  may: { n: 'ТЁТЯ МЭЙ', bg: '#b58aa6', face: 'may' },
  jjj: { n: 'ДЖ. ДЖОНА ДЖЕЙМСОН', bg: '#8a2a2a', face: 'jjj' },
  robbie: { n: 'РОББИ РОБЕРТСОН', bg: '#4a4a3a', face: 'robbie' },
  betty: { n: 'БЕТТИ БРАНТ', bg: '#6a8ac0', face: 'betty' },
  otto: { n: 'ДОКТОР ОКТАВИУС', bg: '#6a6a40', face: 'otto' },
  octavius: { n: 'ОТТО ОКТАВИУС', bg: '#3d6a3a', accent: '#ffb03a', face: 'ock' },
  ock: { n: 'ДОКТОР ОСЬМИНОГ', bg: '#2a4a2a', accent: '#ffb03a', face: 'ock' },
  arms: { n: 'РУКИ', bg: '#16160c', accent: '#ff4a2a', face: 'arms' },
  rosie: { n: 'РОЗИ ОКТАВИУС', bg: '#4f7a5a', face: 'rosie' },
  nurse: { n: 'МЕДСЕСТРА', bg: '#3a8a7a', face: 'nurse' },
  menken: { n: 'ДОНАЛЬД МЕНКЕН', bg: '#1f2024', face: 'menken' },
  norman: { n: 'НОРМАН ОСБОРН', bg: '#5a2a18', accent: '#86d83f', face: 'norman' },
  goblinv: { n: '???', bg: '#1a2a10', accent: '#86d83f', face: 'norman' },
  thug: { n: 'БАНДИТ', bg: '#6b2f4f', face: 'thug' },
  lady: { n: 'ДАМА С СУМОЧКОЙ', bg: '#8a3a5a', face: 'lady' },
  mom: { n: 'МАМА', bg: '#e05a8a', face: 'mom' },
  narr: { n: '' },
};
const T = (s, t) => ({ s, t });
const N = t => ({ s: 'narr', t });
const C = (s, ...opts) => ({ s, choice: opts });
const O = (t, next = [], love = 0, act = false) => ({ t, next, love, act });
const A = (t, next = [], love = 0) => O(t, next, love, true);
const FN = fn => ({ fn });
const IF = (c, a, b = []) => ({ cond: c, then: a, else: b });
const CUT = id => ({ cut: id });
const STORY = {};

// ============================================================ dialog engine
let dialog = null;
function runStory(key, done) {
  const lines = typeof key === 'string' ? S[key] : key;
  if (!lines) { done && done(); return; }
  const after = done || (typeof key === 'string' && AFTER[key]) || null;
  dialog = { lines: lines.slice(), i: 0, ch: 0, done: after, sel: 0, cut: dialog && dialog.keepCut ? dialog.cut : null, cutT: 0 };
  state = 'dialog';
  procLine();
}
function procLine() {
  while (dialog && dialog.i < dialog.lines.length) {
    const ln = dialog.lines[dialog.i];
    if (ln.fn) { dialog.i++; if (ln.fn() === 'stop') return; continue; }
    if (ln.cond) { dialog.lines.splice(dialog.i, 1, ...(ln.cond() ? ln.then : ln.else)); continue; }
    if (ln.cut !== undefined && ln.t === undefined && !ln.choice) { if (dialog.cut !== ln.cut) { dialog.cut = ln.cut; dialog.cutT = 0; } dialog.i++; continue; }
    if (ln.choice) dialog.sel = 0;
    return;
  }
  if (dialog) {
    const d = dialog; dialog = null;
    if (state === 'dialog') state = 'play';
    d.done && d.done();
  }
}
function resumeDialog() { state = 'dialog'; procLine(); }
function addLove(n) { if (!n) return; SAVE.love += n; SFX.love(); toast('♥ +' + n, ROSE); }
function choiceRects() {
  const ln = dialog.lines[dialog.i];
  return ln.choice.map((o, i) => ({ x: 160, y: H - 136 + i * 34, w: W - 220, h: 30 }));
}
function updateDialog() {
  const d = dialog; d.cutT++;
  const ln = d.lines[d.i];
  if (!ln) return;
  if (ln.choice) {
    const n = ln.choice.length;
    if (pressed.up) { d.sel = (d.sel + n - 1) % n; SFX.sel(); }
    if (pressed.down) { d.sel = (d.sel + 1) % n; SFX.sel(); }
    let chosen = -1;
    ['n1', 'n2', 'n3'].forEach((k, i) => { if (pressed[k] && i < n) chosen = i; });
    if (tap) { choiceRects().forEach((r, i) => { if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) chosen = i; }); if (chosen < 0) pressed.ok = false; }
    if (chosen < 0 && (pressed.ok || pressed.punch || pressed.jump || pressed.act)) chosen = d.sel;
    if (chosen >= 0) {
      const o = ln.choice[chosen];
      const echo = o.act ? [] : [T(ln.s, o.t)];
      d.lines.splice(d.i, 1, ...echo, ...o.next);
      d.ch = 0; addLove(o.love); procLine();
    }
    return;
  }
  if (d.ch < ln.t.length) { d.ch += 1.4; if (frame % 3 === 0) SFX.blip(); }
  if (pressed.ok || pressed.jump || pressed.punch || pressed.act) {
    if (d.ch < ln.t.length) d.ch = ln.t.length;
    else { d.i++; d.ch = 0; procLine(); }
  }
}

// ============================================================ comic panels (cutscenes)
const PW = 912, PH = 350;
function panelSky(kind) {
  const g = ctx.createLinearGradient(0, 0, 0, PH);
  const c = kind === 'day' ? ['#6ab8f0', '#d8f0ff'] : kind === 'dusk' ? ['#3a2a6a', '#ffb070'] : kind === 'fire' ? ['#2a0a10', '#ff6a2a'] : kind === 'room' ? ['#e8d8b8', '#d0c0a0'] : kind === 'lab' ? ['#101820', '#203040'] : ['#07061a', '#3a2a5e'];
  g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH);
  ctx.fillStyle = kind === 'day' || kind === 'room' ? HT_LIGHT : HT_SOFT; ctx.fillRect(0, 0, PW, PH);
}
function panelCity(y, col, win) { const r = rng(7); let x = 0; while (x < PW) { const w = 50 + r() * 90, h = 60 + r() * 160; ctx.fillStyle = col; ctx.fillRect(x, y - h, w, h + 400); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y - h, w, h + 400); ctx.fillStyle = win; for (let yy = y - h + 10; yy < PH; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12) if (r() < .25) ctx.fillRect(xx, yy, 5, 7); x += w; } }
function burstText(x, y, text, col, size = 46, rot = -.1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `${size}px ${F_DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  ofill(() => { for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = i % 2 ? w * .55 : w * .72; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * .55); } ctx.closePath(); }, '#fff6a0', 3);
  ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
  ctx.restore();
}
function speedLines(cx, cy, n = 40, col = 'rgba(255,255,255,.35)') { ctx.strokeStyle = col; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { const a = hash(i, 3) * TAU, r0 = 120 + hash(i, 4) * 80; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * 700, cy + Math.sin(a) * 700); ctx.stroke(); } }
function heroP(pose, suit) { return { pose, suit: suit || SAVE.suit }; }
const PANELS = {
  pier_night(t) {
    panelSky('night'); panelCity(200, '#1b1840', '#ffd88a');
    ctx.fillStyle = '#10102a'; ctx.fillRect(0, 250, PW, 100);
    ctx.fillStyle = '#4a3222'; ctx.fillRect(80, 240, 760, 20); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(80, 240, 760, 20);
    drawReactorBig(620, 150, .6);
    drawPerson(380, 240, 1, LOOKS.otto, POSES.super(), { s: 1.6 });
    for (let i = 0; i < 4; i++) drawTentacle(370, 150, 440 + i * 30, 90 + Math.sin(t * .05 + i) * 20, 380 + i * 10, 60, .5, { r: 5 });
  },
  reactor_critical(t) {
    panelSky('fire'); speedLines(456, 175, 60, 'rgba(255,240,180,.5)');
    const r = 90 + Math.min(80, t * .8);
    const g = ctx.createRadialGradient(456, 160, 10, 456, 160, r * 2); g.addColorStop(0, '#fffbe0'); g.addColorStop(.5, 'rgba(255,160,40,.8)'); g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g; circle(456, 160, r * 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(456, 160); for (let s = 1; s < 6; s++) ctx.lineTo(456 + Math.cos(k * 1.3) * s * 50 + (Math.random() - .5) * 30, 160 + Math.sin(k * 1.3) * s * 40 + (Math.random() - .5) * 30); ctx.stroke(); }
    drawPerson(250, 340, 1, LOOKS.otto, POSES.hurt(), { s: 2 });
    drawPerson(760, 340, -1, LOOKS.rosie, POSES.run(t * .3), { s: 1.6 });
    burstText(700, 70, 'ВЖЖЖУМ!', '#ff4a2a', 40, .1);
  },
  arms_fuse(t) {
    panelSky('fire');
    drawPerson(456, 340, 1, LOOKS.ock, POSES.kneel(), { s: 3 });
    for (let i = 0; i < 4; i++) { const a = -2.6 + i * .5; drawTentacle(420, 170, 420 + Math.cos(a) * (180 + Math.sin(t * .1 + i) * 20), 170 + Math.sin(a) * 160, 380, 60, .7, { glow: '#ff4a2a' }); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = frame % 4 < 2 ? '#fff' : GOLD; circle(440 + (Math.random() - .5) * 40, 175 + (Math.random() - .5) * 30, 3); }
    burstText(700, 80, 'ТРЕСК!', '#ffd84a', 40, -.12);
  },
  suit_torn(t) {
    panelSky('fire'); speedLines(456, 170);
    drawTentacle(820, 20, 520, 150, 700, 40, .1, { glow: '#ff4a2a' });
    drawHero(460, 260, 1, POSES.hurt(), 'classic', { s: 2.4 });
    for (let i = 0; i < 16; i++) { const a = hash(i, 1) * TAU, d = 40 + ((t * 2 + i * 13) % 160); ctx.save(); ctx.translate(460 + Math.cos(a) * d, 120 + Math.sin(a) * d * .6); ctx.rotate(i + t * .1); opoly([0, 0, 12, -3, 8, 8], i % 2 ? RED : '#2350b5', 1.4); ctx.restore(); }
    burstText(230, 80, 'ТРРРЕСЬ!', RED, 40, -.15);
  },
  ock_river(t) {
    panelSky('night'); panelCity(160, '#1b1840', '#ffd88a');
    ctx.fillStyle = '#12123a'; ctx.fillRect(0, 180, PW, 170);
    ctx.strokeStyle = 'rgba(255,230,160,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo((i * 97 + t) % PW, 200 + i * 12); ctx.lineTo((i * 97 + t) % PW + 40, 200 + i * 12); ctx.stroke(); }
    for (let i = 0; i < 4; i++) drawTentacle(420 + i * 30, 360, 380 + i * 50, 220 + Math.sin(t * .08 + i) * 16, 400 + i * 40, 280, .6, {});
    for (let i = 0; i < 8; i++) ocirc(430 + Math.sin(i * 3 + t * .05) * 60, 250 - ((t * 1.5 + i * 30) % 80), 4 + i % 3, 'rgba(200,230,255,.8)', 1);
  },
  rosie_ambulance(t) {
    panelSky('night'); panelCity(200, '#1b1840', '#ffd88a');
    ctx.fillStyle = '#2a2640'; ctx.fillRect(0, 290, PW, 60);
    ctx.save(); ctx.translate(560, 290); opoly([-120, 0, -120, -90, 60, -90, 120, -50, 120, 0], '#f4f4f8', 3); ctx.fillStyle = RED; ctx.fillRect(-100, -60, 140, 10); ocirc(-70, 0, 16, '#222', 2.4); ocirc(80, 0, 16, '#222', 2.4); ctx.fillStyle = t % 20 < 10 ? '#ff3a3a' : '#3a6aff'; ctx.fillRect(-60, -104, 30, 14); ctx.restore();
    drawPerson(380, 290, 1, LOOKS.rosieBed, POSES.lie(), { s: 1.5 });
    drawHero(200, 290, 1, POSES.idle(t), 'classic', { s: 1.6 });
  },
  torn_suit_bed(t) {
    panelSky('room');
    orrect(80, 200, 760, 160, 0, '#7a5a3c', 0);
    winView(640, 40, 170, 140, 'day');
    ctx.fillStyle = 'rgba(255,240,180,.25)'; ctx.beginPath(); ctx.moveTo(640, 180); ctx.lineTo(810, 180); ctx.lineTo(560, 360); ctx.lineTo(300, 360); ctx.fill();
    orrect(160, 250, 360, 60, 8, '#4a6aa0', 3);
    for (let i = 0; i < 7; i++) opoly([200 + i * 40, 250, 222 + i * 40, 244, 214 + i * 40, 262], i % 2 ? RED : '#2350b5', 1.6);
    drawPerson(600, 330, -1, LOOKS.peterSuitless, POSES.sit(), { s: 1.9 });
  },
  felicia_door(t) {
    panelSky('day'); panelCity(250, '#a8b8d8', '#fff');
    ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, 290, PW, 60);
    ctx.save(); ctx.translate(560, 300); ctx.scale(2, 2); drawCar(0, 0, '#15131c', 1, 0); ctx.restore();
    drawPerson(360, 300, 1, LOOKS.felicia, POSES.wave(t), { s: 1.9 });
  },
  sewing(t) {
    panelSky('room'); ctx.fillStyle = '#2a2230'; ctx.fillRect(0, 0, PW, PH);
    winView(560, 30, 300, 180, 'day');
    drawPerson(360, 340, 1, LOOKS.peterSuitless, POSES.super(), { s: 2.3 });
    drawPerson(500, 340, -1, LOOKS.felicia, POSES.hold(), { s: 2.2 });
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(460, 190); ctx.quadraticCurveTo(410, 200 + Math.sin(t * .1) * 6, 350, 170); ctx.stroke();
    burstText(160, 70, 'ВЖИХ!', '#f07a1c', 30, -.1);
  },
  new_suit(t) {
    panelSky('dusk'); speedLines(456, 180, 50, 'rgba(255,255,255,.25)');
    ctx.fillStyle = '#1b1636'; ctx.fillRect(0, 300, PW, 60); orrect(0, 296, PW, 8, 0, '#4a3e86', 2);
    drawHero(456, 300, 1, POSES.thumbs(), 'street', { s: 2.8 });
    burstText(200, 70, 'НОВЫЙ КОСТЮМ!', ORANGE, 30, -.08);
  },
  jjj_radio(t) {
    panelSky('lab'); ctx.fillStyle = '#3a2a2a'; ctx.fillRect(0, 0, PW, PH);
    orrect(560, 60, 260, 40, 3, '#ff3a3a', 3); ctx.fillStyle = '#fff'; ctx.font = `18px ${F_DISP}`; ctx.fillText('В ЭФИРЕ', 620, 88);
    drawPerson(380, 360, 1, LOOKS.jjj, POSES.talk(t * 3), { s: 2.8 });
    olin([470, 190, 470, 260], 4, '#333', 3); ocirc(470, 180, 14, '#555', 2.4);
    burstText(700, 220, 'КЛОУН!', '#ff3a3a', 40, .1);
  },
  bank_vault(t) {
    panelSky('lab'); ctx.fillStyle = '#3a3440'; ctx.fillRect(0, 0, PW, PH);
    ocirc(640, 170, 120, '#8a8a96', 4); ocirc(640, 170, 90, '#6a6a76', 3); ctx.fillStyle = INK; for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(640, 170); ctx.rotate(i + t * .02); ctx.fillRect(-4, -80, 8, 50); ctx.restore(); }
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate((i * 83 + t * 2) % PW, (i * 47 + t * 1.3) % PH); ctx.rotate(i); orrect(-12, -7, 24, 14, 2, '#6aba6a', 1.6); ctx.restore(); }
    ockRig(300, 330, 1, [[240, 330], [360, 330], [560, 120 + Math.sin(t * .1) * 10], [540, 220]], POSES.super(), {});
  },
  car_throw(t) {
    panelSky('day'); panelCity(220, '#a8b8d8', '#fff'); ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, 300, PW, 60);
    speedLines(700, 200, 40, 'rgba(0,0,0,.15)');
    const k = Math.min(1, t / 60);
    ctx.save(); ctx.translate(lerp(200, 540, k), lerp(90, 210, k)); ctx.scale(2, 2); drawCar(0, 0, '#c83a3a', 1, k * 2); ctx.restore();
    drawPerson(760, 310, -1, LOOKS.mom, POSES.hug(), { s: 1.8 }); drawPerson(700, 310, 1, LOOKS.kid, POSES.hurt(), { s: 1.8 });
    burstText(200, 70, 'ВЫБИРАЙ, ПАУК!', '#ff3a3a', 26, -.1);
  },
  car_caught(t) {
    panelSky('day'); panelCity(220, '#a8b8d8', '#fff'); ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, 300, PW, 60);
    ctx.save(); ctx.translate(540, 250); ctx.scale(2, 2); drawCar(0, 0, '#c83a3a', 1, .2); ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(220, 150); ctx.lineTo(470 + i * 20, 210 + i * 4); ctx.stroke(); }
    drawHero(220, 310, 1, POSES.pull(), SAVE.suit, { s: 2 });
    drawPerson(760, 310, -1, LOOKS.mom, POSES.hug(), { s: 1.8 }); drawPerson(700, 310, 1, LOOKS.kid, POSES.thumbs(), { s: 1.8 });
  },
  hospital_rosie(t) {
    panelSky('lab'); ctx.fillStyle = '#1a2a34'; ctx.fillRect(0, 0, PW, PH);
    winView(560, 30, 240, 200, 'night');
    ctx.fillStyle = 'rgba(0,0,0,.8)'; ockRigSil(680, 210, t);
    orrect(120, 250, 380, 40, 8, '#e8f0f4', 3);
    drawPerson(300, 262, 1, LOOKS.rosieBed, POSES.lie(), { s: 1.8 });
    ctx.strokeStyle = '#3aff9a'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 100; i++) { const ph = (i + t) % 60; ctx.lineTo(60 + i * 3, 120 - (ph > 40 && ph < 44 ? 30 : 0)); } ctx.stroke();
  },
  terrace_dinner(t) {
    panelSky('night'); panelCity(250, '#241d4b', '#ffd88a');
    ctx.fillStyle = '#1b1636'; ctx.fillRect(0, 290, PW, 60);
    for (let i = 0; i < 20; i++) { ctx.fillStyle = (i + (t >> 4)) % 3 ? '#ffe39a' : '#ffb0c8'; circle(i * 48 + 20, 40 + Math.sin(i) * 16, 4); }
    orrect(360, 230, 200, 10, 2, '#f4ecf0', 2.4); ctx.fillStyle = '#ffcc55'; circle(400, 214, 4 + Math.sin(t * .3));
    drawPerson(300, 300, 1, Object.assign({}, LOOKS.peter, { jacket: '#2e3448', tie: '#6a4a2a' }), POSES.sit(), { s: 1.9 });
    drawPerson(620, 300, -1, LOOKS.felicia, POSES.sit(), { s: 1.9 });
  },
  dance(t) {
    panelSky('night');
    ocirc(456, 120, 90, '#f7ecbc', 3);
    for (let i = 0; i < 24; i++) { ctx.fillStyle = (i + (t >> 4)) % 3 ? '#ffe39a' : '#ffb0c8'; circle(i * 40, 30 + Math.sin(i * .7) * 20, 4); }
    ctx.fillStyle = '#1b1636'; ctx.fillRect(0, 300, PW, 60);
    const sw = Math.sin(t * .05) * 10;
    drawPerson(430 + sw, 300, 1, Object.assign({}, LOOKS.peter, { jacket: '#2e3448', tie: '#6a4a2a' }), POSES.hug(), { s: 2.2 });
    drawPerson(490 + sw, 300, -1, LOOKS.felicia, POSES.hug(), { s: 2.2 });
    for (let i = 0; i < 4; i++) drawHeartShape(380 + i * 60, 80 - ((t + i * 30) % 80), 10);
  },
  kiss(t) {
    panelSky('night'); ocirc(456, 175, 150, '#f7ecbc', 3);
    const lean = Math.min(1, t / 90) * 10;
    ctx.save(); ctx.translate(350 + lean, 200); ctx.rotate(.12); ctx.scale(5.5, 5.5); humanHead(LOOKS.peter); ctx.restore();
    ctx.save(); ctx.translate(560 - lean, 196); ctx.rotate(-.1); ctx.scale(-5.5, 5.5); catHair(frame, true); catFace(true); ctx.restore();
    ctx.fillStyle = 'rgba(40,10,40,.25)'; ctx.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 6; i++) drawHeartShape(200 + i * 110, 300 - ((t * 1.5 + i * 40) % 260), 12);
  },
  morning_after(t) {
    panelSky('room'); ctx.fillStyle = '#2a2230'; ctx.fillRect(0, 0, PW, PH);
    winView(80, 30, 320, 220, 'day');
    ctx.fillStyle = 'rgba(255,240,180,.3)'; ctx.beginPath(); ctx.moveTo(80, 250); ctx.lineTo(400, 250); ctx.lineTo(700, 360); ctx.lineTo(300, 360); ctx.fill();
    orrect(420, 250, 440, 90, 10, '#1a1420', 3); orrect(424, 236, 432, 40, 12, '#8a1a3a', 2.4);
    drawPerson(560, 250, 1, LOOKS.peterSuitless, POSES.lie(), { s: 1.8 });
    drawPerson(300, 340, 1, LOOKS.feliciaShirt, POSES.idle(t), { s: 2.2 });
  },
  oscorp_tower(t) {
    panelSky('night'); panelCity(300, '#241d4b', '#ffd88a');
    orrect(560, 20, 160, 400, 2, '#1a3a2a', 3); ctx.fillStyle = '#3aff9a'; ctx.font = `16px ${F_DISP}`; ctx.fillText('OSCORP', 578, 60);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 4; c++) if (hash(r, c) < .5) { ctx.fillStyle = '#3aff9a'; ctx.fillRect(578 + c * 34, 80 + r * 24, 18, 12); }
    drawHero(300, 300, 1, POSES.perch(), SAVE.suit, { s: 1.8 });
    drawCat(380, 300, -1, POSES.idle(t), { s: 1.8 });
  },
  oscorp_files(t) {
    panelSky('lab');
    orrect(120, 30, 680, 290, 4, '#0f1a14', 4);
    ctx.fillStyle = '#3aff9a'; ctx.font = `20px ${F_DISP}`; ctx.fillText('ПРОЕКТ «ЩУПАЛЬЦЕ»', 160, 80);
    ctx.font = `16px ${F_UI}`; const L2 = ['> тритий: через посредника (М.)', '> реактор: достроить на пирсе №9', '> после испытаний: изъять руки', '> военный контракт: 2 млрд', '> ОДОБРЕНО: Н. О.'];
    L2.forEach((s, i) => { if (t > i * 20) ctx.fillText(s, 160, 130 + i * 32); });
    if (frame % 40 < 20) ctx.fillRect(160, 300, 12, 4);
  },
  cat_hurt(t) {
    panelSky('lab'); speedLines(456, 175, 50, 'rgba(255,60,60,.35)');
    ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(456, 170); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    drawCat(456, 330, -1, Object.assign(POSES.hurt(), { rot: -.3 }), { s: 2.4 });
    drawHero(620, 330, -1, POSES.hug(), SAVE.suit, { s: 2.2 });
    burstText(220, 280, 'ФЕЛИЦИЯ!', ROSE, 34, .1);
  },
  may_hug(t) {
    panelSky('room'); winView(600, 40, 200, 150, 'day');
    drawPerson(420, 340, 1, LOOKS.may, POSES.hug(), { s: 2.4 });
    drawPerson(480, 340, -1, LOOKS.peter, POSES.hug(), { s: 2.4 });
  },
  river_dive(t) {
    panelSky('dusk'); panelCity(180, '#4a2a5a', '#ffd88a');
    ctx.fillStyle = '#2a1a3a'; ctx.fillRect(0, 220, PW, 130);
    ctx.fillStyle = '#16122e'; ctx.fillRect(120, 20, 40, 220); ctx.fillRect(700, 20, 40, 220); ctx.fillRect(0, 150, PW, 16);
    const k = Math.min(1, t / 70);
    ockRig(420, lerp(140, 300, k), 1, [[380, lerp(200, 330, k)], [460, lerp(210, 340, k)], [500, lerp(80, 250, k)], [440, lerp(60, 230, k)]], POSES.fall(), {});
    if (k > .8) for (let i = 0; i < 8; i++) ocirc(420 + (i - 4) * 18, 230 - Math.abs(i - 4) * 6, 6, 'rgba(220,240,255,.9)', 1.2);
  },
  pier_reactor(t) {
    panelSky('night'); ctx.fillStyle = '#10102a'; ctx.fillRect(0, 250, PW, 100);
    drawReactorBig(456, 150, .9);
    ockRig(456, 250 - 40, -1, [[400, 300], [520, 300], [360, 120 + Math.sin(t * .1) * 10], [560, 110]], POSES.super(), {});
  },
  unmasked(t) {
    panelSky('fire'); speedLines(456, 175, 40, 'rgba(255,255,255,.3)');
    ctx.save(); ctx.translate(300, 190); ctx.scale(7, 7); humanHead(LOOKS.peter); ctx.restore();
    ctx.save(); ctx.translate(640, 190); ctx.scale(-7, 7); humanHead(LOOKS.ock); ctx.restore();
    ctx.save(); ctx.translate(470, 90); ctx.rotate(-.5 + Math.sin(t * .05) * .1); ctx.scale(3, 3); streetHead(0, 0); ctx.restore();
    drawTentacle(820, 350, 480, 80, 700, 120, .9, {});
  },
  escape_fall(t) {
    panelSky('night'); panelCity(360, '#1b1840', '#ffd88a');
    speedLines(456, 60, 30);
    const k = Math.min(1, t / 50);
    drawHero(456, lerp(40, 230, k), 1, POSES.fall(), SAVE.suit, { s: 1.8 });
    if (k >= 1) drawCat(456, 330, -1, POSES.hug(), { s: 2 });
  },
  patch_up(t) {
    panelSky('room'); ctx.fillStyle = '#2a2230'; ctx.fillRect(0, 0, PW, PH);
    winView(560, 30, 300, 200, 'night');
    drawPerson(380, 340, -1, LOOKS.peterSuitless, POSES.sit(), { s: 2.3 });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(340, 240); ctx.lineTo(400, 260); ctx.stroke();
    drawPerson(280, 340, 1, LOOKS.felicia, POSES.hold(), { s: 2.2 });
  },
  post_ock(t) {
    panelSky('night'); ctx.fillStyle = '#12123a'; ctx.fillRect(0, 230, PW, 120);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#3a2618'; ctx.save(); ctx.translate(100 + i * 150, 240); ctx.rotate((i - 3) * .2); ctx.fillRect(-8, -80, 16, 120); ctx.restore(); }
    ockRig(456, 280, 1, [[380, 300], [540, 300], [300, 120 + Math.sin(t * .05) * 10], [600, 110 + Math.cos(t * .05) * 10]], POSES.sit(), {});
    ctx.save(); ctx.translate(470, 190); ctx.scale(1.2, 1.2); streetHead(0, 0); ctx.restore();
  },
  post_norman(t) {
    panelSky('lab'); ctx.fillStyle = '#4a525a'; ctx.fillRect(0, 0, PW, PH);
    ctx.strokeStyle = '#20252a'; ctx.lineWidth = 8; for (let x = 40; x < PW; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, PH); ctx.stroke(); }
    drawPerson(456, 330, 1, LOOKS.norman, POSES.sit(), { s: 2.4 });
    ctx.save(); ctx.translate(520, 230); ctx.rotate(-.1); orrect(-50, -40, 100, 70, 2, '#f0e8d0', 2.4); ctx.fillStyle = INK; ctx.font = `8px ${F_DISP}`; ctx.fillText('ДЕЙЛИ БЬЮГЛ', -44, -28); ctx.fillText('ПОДПИСЬ Н. О.', -44, -16); ctx.save(); ctx.translate(20, 10); ctx.scale(.9, .9); streetHead(0, 0); ctx.restore(); ctx.restore();
    ctx.fillStyle = '#86d83f'; circle(430 + 12, 190, 3 + Math.sin(t * .2)); circle(430 + 24, 190, 3 + Math.sin(t * .2));
  },
};
function ockRigSil(x, y, t) { ctx.save(); ctx.globalAlpha = .9; ockRig(x, y, -1, [[x - 60, y + 40], [x + 60, y + 40], [x - 90, y - 60 + Math.sin(t * .06) * 10], [x + 80, y - 80]], POSES.idle(t), {}); ctx.restore(); ctx.fillStyle = 'rgba(0,0,20,.55)'; ctx.fillRect(x - 130, y - 200, 260, 260); }
function drawHeartShape(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10); ofill(() => { ctx.moveTo(0, 6); ctx.bezierCurveTo(-10, -1, -6, -10, 0, -4); ctx.bezierCurveTo(6, -10, 10, -1, 0, 6); ctx.closePath(); }, ROSE, 1.4); ctx.restore(); }

// ============================================================ chapters
const CHAPTERS = [
  { num: 'ПРОЛОГ', title: 'СОЛНЦЕ НАД РЕКОЙ', sub: 'Ист-Ривер · пирс №9' },
  { num: 'ГЛАВА 1', title: 'НОВЫЙ КОСТЮМ', sub: 'Квинс · Верхний Ист-Сайд' },
  { num: 'ГЛАВА 2', title: 'ДРУЖЕЛЮБНЫЙ СОСЕД', sub: 'Квинс · больница Метро-Дженерал' },
  { num: 'ГЛАВА 3', title: 'БАНК НА ПЯТОЙ АВЕНЮ', sub: '«Дейли Бьюгл» · Мидтаун' },
  { num: 'ГЛАВА 4', title: 'НОЧЬ У ФЕЛИЦИИ', sub: 'Квинс · пентхаус на Верхнем Ист-Сайде' },
  { num: 'ГЛАВА 5', title: 'ОСКОРП', sub: 'Башня «Оскорп» · полночь' },
  { num: 'ГЛАВА 6', title: 'РОЗИ', sub: 'Больница · Бруклинский мост' },
  { num: 'ГЛАВА 7', title: 'РУКИ ОКТАВИУСА', sub: 'Пирс №9 · финал' },
];
let chapter = 0, card = null;
function startChapter(n) {
  chapter = n; SAVE.ch = n; writeSave();
  const c = CHAPTERS[n];
  card = { num: c.num, title: c.title, sub: c.sub, t: 0, go: () => { state = 'play'; CH_RUN[n](); } };
  state = 'card';
}
function endChapter() { fadeTo(() => { if (chapter + 1 < CHAPTERS.length) startChapter(chapter + 1); else startCredits(); }); }
function goScene(id) { fadeTo(() => startCivil(id)); }
function goLevel(id, done) { fadeTo(() => startLevel(id, done)); }
let lastLevel = null;
const CH_RUN = [
  () => runStory('P0_INTRO', () => goLevel('pier_rescue', () => runStory('P0_END', endChapter))),
  () => startCivil('home1'),
  () => runStory('Q_INTRO', () => goLevel('queens', () => runStory('Q_END', () => goScene('hospital1')))),
  () => startCivil('bugle2'),
  () => startCivil('home4'),
  () => runStory('O_INTRO', () => goLevel('swing_oscorp', () => runStory('O_ROOF', () => goLevel('oscorp_in', () => runStory('O_FILES', endChapter))))),
  () => startCivil('hospital2'),
  () => startCivil('penthouse7'),
];
const AFTER = {
  OCK_WIN: () => goLevel('escape', () => runStory('ESC_END', () => goScene('penthouse_end'))),
  BANK_CAR: () => endChapter(),
};

// ============================================================ civil scenes
function SCENES(id) {
  const I = o => Object.assign({ face: -1, req: false, done: false }, o);
  switch (id) {
    case 'home1': return {
      theme: 'home', x0: 0, x1: 1480, zoom: 1.35, player: 'peter', start: 1100, intro: 'H1_INTRO',
      items: [
        I({ id: 'suit', x: 1320, iy: 380, label: 'Порванный костюм', req: true, talk: 'H1_SUIT' }),
        I({ id: 'may', who: 'may', x: 300, face: 1, label: 'Поговорить с тётей Мэй', req: true, talk: 'H1_MAY', again: [T('may', 'Иди уже, Питер. И подшей эти штаны!')] }),
        I({ id: 'phone', x: 1070, iy: 380, label: 'Телефон', req: true, talk: 'H1_PHONE' }),
        I({ id: 'ward', x: 1190, iy: 330, label: 'Шкаф', talk: 'H1_WARD' }),
      ],
      exit: { x: 540, label: 'Выйти к Фелиции', go: () => runStory('H1_CAR', () => goScene('penthouse1')) },
      extra: () => { if (!SCN.items[0].done) { ctx.save(); ctx.translate(1320, 404); for (let i = 0; i < 6; i++) opoly([-40 + i * 14, 0, -28 + i * 14, -6, -32 + i * 14, 8], i % 2 ? RED : '#2350b5', 1.4); ctx.restore(); } },
    };
    case 'penthouse1': return {
      theme: 'penthouse', x0: 0, x1: 1560, zoom: 1.35, player: 'peter', start: 700, intro: 'H1_PENT',
      items: [
        I({ id: 'fel', who: 'felicia', x: 260, face: 1, label: 'Фелиция', req: true, talk: 'H1_FEL', onDone: () => { P.skin = 'hero'; } }),
        I({ id: 'sketch', x: 1000, iy: 360, label: 'Альбом с эскизами', talk: 'H1_SKETCH' }),
        I({ id: 'mirror', x: 1115, iy: 250, label: 'Зеркало', need: ['fel'], talk: 'H1_MIRROR' }),
      ],
      exit: { x: 1520, label: 'На балкон — в город', go: () => runStory('TUT_INTRO', () => goLevel('tutorial', () => runStory('TUT_END', endChapter))) },
    };
    case 'hospital1': return {
      theme: 'hospital', night: true, x0: 0, x1: 1460, zoom: 1.35, player: 'peter', start: 180, intro: 'HOS_INTRO',
      items: [
        I({ id: 'nurse', who: 'nurse', x: 420, face: -1, label: 'Медсестра', talk: 'HOS_NURSE' }),
        I({ id: 'rosie', who: 'rosieBed', x: 800, face: 1, pose: 'lie', iy: 330, label: 'Рози', req: true, talk: 'HOS_ROSIE' }),
        I({ id: 'otto', x: 605, iy: 190, label: 'Кто-то за окном', req: true, need: ['rosie'], talk: 'HOS_OTTO', hidden: () => !SCN.items[1].done || SCN.items[2].done, onDone: () => endChapter() }),
      ],
      extra: () => { const it = SCN.items[2]; if (SCN.items[1].done && !it.done) { const t = frame; ctx.save(); ctx.beginPath(); ctx.rect(520, 170, 170, 150); ctx.clip(); ockRig(605, 400, 1, [[540, 330], [670, 330], [530, 190 + Math.sin(t * .05) * 6], [680, 200]], POSES.idle(t), {}); ctx.restore(); ocirc(530, 190, 6, '#ff4a2a', 1.5); ocirc(680, 200, 6, '#ff4a2a', 1.5); } },
    };
    case 'bugle2': return {
      theme: 'bugle', x0: 0, x1: 1660, zoom: 1.35, player: 'peter', start: 110, intro: 'B_INTRO',
      items: [
        I({ id: 'betty', who: 'betty', x: 380, label: 'Бетти', talk: 'B_BETTY' }),
        I({ id: 'tv', x: 605, iy: 230, label: 'Новости', talk: 'B_TV' }),
        I({ id: 'robbie', who: 'robbie', x: 830, label: 'Робби', talk: 'B_ROBBIE' }),
        I({ id: 'jjj', who: 'jjj', x: 1450, label: 'Джеймсон', req: true, talk: 'B_JJJ', again: [T('jjj', 'ТЫ ЕЩЁ ЗДЕСЬ, ПАРКЕР?!')] }),
      ],
      exit: { x: 40, label: 'К лифту', go: () => runStory('B_ALARM', () => goLevel('swing_bank', () => goLevel('bank_fight', () => runStory('BANK_OCK', () => goLevel('ock_bank'))))) },
    };
    case 'home4': return {
      theme: 'home', x0: 0, x1: 1480, zoom: 1.35, player: 'peter', start: 1050, intro: 'H4_INTRO',
      items: [
        I({ id: 'may', who: 'may', x: 300, face: 1, label: 'Тётя Мэй', req: true, talk: 'H4_MAY' }),
        I({ id: 'ward', x: 1190, iy: 330, label: 'Шкаф с костюмами', wardrobe: true }),
      ],
      exit: { x: 540, label: 'На свидание', go: () => goScene('terrace') },
    };
    case 'terrace': return {
      theme: 'terrace', x0: 0, x1: 1100, zoom: 1.35, player: 'peter', start: 120, intro: 'T_INTRO',
      items: [I({ id: 'fel', who: 'felicia', x: 640, face: -1, label: 'Фелиция', req: true, talk: 'T_DINNER', onDone: () => runStory('T_NIGHT', () => goScene('penthouse4')) })],
    };
    case 'penthouse4': return {
      theme: 'penthouse', x0: 0, x1: 1560, zoom: 1.35, player: 'peter', start: 1300, intro: null,
      items: [I({ id: 'fel', who: 'feliciaShirt', x: 900, face: 1, label: 'Фелиция', req: true, talk: 'T_MORNING', onDone: () => endChapter() })],
    };
    case 'hospital2': return {
      theme: 'hospital', x0: 0, x1: 1460, zoom: 1.35, player: 'peter', start: 180, intro: 'R_INTRO',
      items: [
        I({ id: 'may', who: 'may', x: 450, face: 1, label: 'Тётя Мэй', req: true, talk: 'R_MAY' }),
        I({ id: 'rosie', who: 'rosieBed', x: 800, face: 1, pose: 'sit', iy: 330, label: 'Рози', req: true, talk: 'R_ROSIE' }),
      ],
      exit: { x: 1240, label: 'На выход', go: () => runStory('R_NEWS', () => goLevel('chase_bridge', () => runStory('R_CHASE_END', endChapter))) },
    };
    case 'penthouse7': return {
      theme: 'penthouse', night: true, x0: 0, x1: 1560, zoom: 1.35, player: 'peter', start: 500, intro: 'F7_INTRO',
      items: [
        I({ id: 'fel', who: 'felicia', x: 920, face: -1, pose: 'sit', label: 'Фелиция', req: true, talk: 'F_EVE', onDone: () => runStory('F7_GO', () => goLevel('pier_final', () => runStory('PF_OCK', () => { BOSS_CK = 1; goLevel('ock_final'); }))) }),
        I({ id: 'ward', x: 1115, iy: 250, label: 'Зеркало: сменить костюм', wardrobe: true }),
      ],
    };
    case 'penthouse_end': return {
      theme: 'penthouse', night: true, x0: 0, x1: 1560, zoom: 1.35, player: 'peter', start: 700, intro: 'END_INTRO',
      items: [I({ id: 'fel', who: 'felicia', x: 900, face: -1, label: 'Фелиция', req: true, talk: 'END_TALK', onDone: () => { if (!SAVE.suits.includes('superior')) SAVE.suits.push('superior'); writeSave(); fadeTo(startCredits); } })],
    };
    case 'post': return {
      theme: 'penthouse', night: true, x0: 0, x1: 1560, zoom: 1.35, player: 'none', start: 700, intro: 'POST', auto: () => fadeTo(() => { state = 'tbc'; overT = 0; SFX.heart(); }),
      items: [],
    };
  }
}
function toast(text, color) { TOASTS.push({ text, color, t: 110 }); }
const TOASTS = [];
function unlockSuit(id) { if (!SAVE.suits.includes(id)) { SAVE.suits.push(id); toast('НОВЫЙ КОСТЮМ: ' + SUITS[id].name.toUpperCase(), ORANGE); SFX.token(); } writeSave(); }

// ============================================================ script
const S = {
  P0_INTRO: [
    CUT('pier_night'),
    N('Ист-Ривер. Заброшенный пирс №9. Прошёл месяц после демонстрации в университете.'),
    N('«Оскорп» закрыл проект доктора Октавиуса. Рози говорит, что он почти не бывает дома. Зато на пирсе каждую ночь горит свет.'),
    T('spidey', 'Светофоры сходят с ума, телефоны садятся за минуту... и моё паучье чутьё гудит, как трансформатор. Значит, мне сюда.'),
    T('otto', 'Ещё немного, мои дорогие. Сегодня солнце будет нашим.'),
    T('arms', 'Мощность — сто сорок процентов. Никто нас не остановит, Отто.'),
    T('rosie', 'Отто! Выключи его, прошу! Здесь рабочие! Здесь живые люди!'),
    T('otto', 'Рози?! Что ты здесь делаешь? Уходи, это опасно!'),
    CUT('reactor_critical'),
    N('Солнце в стеклянной сфере разбухает. Магнитное поле рвётся, как мокрая бумага.'),
    T('spidey', 'Доктор Октавиус! Отключайте реактор!'),
    T('otto', 'Человек-паук?! Не мешай! Я почти...'),
    CUT('arms_fuse'),
    N('Вспышка. Ингибиторный чип на шее Отто взрывается искрами. Металлические руки намертво врастают в его позвоночник.'),
    T('arms', 'Наконец-то. Теперь мы одно целое.'),
    N('Пирс горит. Балки падают в реку. Из огня зовут на помощь.'),
    T('spidey', 'Сначала люди. Всё остальное — потом.'),
    CUT(null),
  ],
  P0_END: [
    CUT('suit_torn'),
    N('Когда Паук выносит Рози, одно щупальце настигает его. Когти распарывают костюм от плеча до пояса.'),
    T('ock', 'Отдай её мне!!!'),
    T('spidey', 'Она ранена! Ей нужна скорая, а не ваш реактор!'),
    CUT('ock_river'),
    N('Пирс складывается, как карточный домик. Октавиус вместе с руками исчезает в чёрной воде.'),
    CUT('rosie_ambulance'),
    N('Рози увозит скорая. Она без сознания. Врачи произносят страшное слово: кома.'),
    T('spidey', 'Доктор Октавиус... что же вы наделали.'),
    CUT('torn_suit_bed'),
    N('Утро. От костюма остались одна перчатка, половина маски и очень много дыр.'),
    FN(() => { if (!SAVE.done) SAVE.suits = []; SAVE.suit = 'street'; }),
  ],
  H1_INTRO: [
    N('Квинс, Форест-Хиллс. Суббота, 11:40. Питер не спал всю ночь.'),
    T('peter', 'Костюм не зашить. Новый стоит как три месяца моих гонораров. А городу без Паука сейчас нельзя.'),
  ],
  H1_SUIT: [
    T('peter', 'Даже паука на груди не осталось. Одни ниточки.'),
    T('peter', '(Дядя Бен сказал бы: главное не костюм, а тот, кто его носит. Но в трусах по крышам не побегаешь.)'),
  ],
  H1_MAY: [
    T('may', 'Питер, ты видел новости? Пожар на пирсе... Рози Октавиус в больнице. А бедный Отто пропал.'),
    T('peter', 'Видел, тётя Мэй.'),
    T('may', 'Мы должны её навестить. Я испеку что-нибудь. Хотя в коме пирог, конечно, не лучший подарок...'),
    C('peter',
      O('Я схожу к ней. Обещаю.', [T('may', 'Ты хороший мальчик, Питер.')]),
      O('Тётя Мэй, человек может стать чудовищем?', [T('may', 'Человек может запутаться, милый. Чудовищами становятся те, кого бросили одних в темноте.'), T('peter', '(Доктор Октавиус сейчас совсем один.)')]),
    ),
    T('may', 'И ещё. Твои джинсы... Питер, они шире меня. Это мода такая?'),
    T('peter', 'Это... свобода движений.'),
    T('may', 'Свобода — это хорошо. Но хоть подшей их, ты подметаешь ими улицу.'),
  ],
  H1_PHONE: [
    FN(() => SFX.phone()),
    N('Сообщение от контакта «Кошка».'),
    T('sms', 'Слышала про пирс. Ты цел, паучок? Я еду.'),
    T('sms', 'Спускайся через десять минут. И захвати то, что осталось от костюма.'),
    C('peter',
      O('Как ты узнала?', [T('sms', 'Милый, я знаю о тебе всё. Ну, почти всё. Остальное узнаю сегодня.')], 1),
      O('Я в порядке.', [T('sms', 'Врёшь. Я слышу, как ты врёшь, даже в сообщениях.')]),
    ),
  ],
  H1_WARD: [T('peter', 'Шкаф. Раньше тут висел костюм. Теперь только свитер с оленями от тёти Мэй.')],
  H1_CAR: [
    CUT('felicia_door'),
    N('У подъезда — чёрный кабриолет. Фелиция Харди в солнечных очках машет Питеру рукой.'),
    T('felicia', 'Садись, красавчик. Едем ко мне. У меня есть швейная машинка, рулон ткани и очень смелые идеи.'),
    T('peter', '(Тётя Мэй смотрит из окна. Она определённо всё видела.)'),
    CUT(null),
  ],
  H1_PENT: [N('Пентхаус Фелиции на Верхнем Ист-Сайде. Каждая вещь здесь стоит дороже, чем дом тёти Мэй. Половину, кажется, никто не покупал.')],
  H1_FEL: [
    T('felicia', 'Ну-ка покажи.'),
    N('Она держит обрывки костюма двумя пальцами, как дохлую рыбу.'),
    T('felicia', 'Питер. Это был спандекс. Красный спандекс. С тобой внутри.'),
    T('felicia', 'Прости, но это преступление похуже моих.'),
    T('peter', 'Он был удобный!'),
    T('felicia', 'Снимай рубашку.'),
    T('peter', 'Что?'),
    T('felicia', 'Мне нужны мерки, паучок. Я профессионал. ...В основном.'),
    CUT('sewing'),
    N('Сантиметровая лента скользит по плечам, по спине, по груди. Фелиция не торопится. Совсем.'),
    C('peter',
      O('Ты специально так медленно?', [T('felicia', 'Конечно. А зачем ещё мне мерки?')], 1),
      A('(Стоять смирно и краснеть)', [T('felicia', 'Ты красный, как твой старый костюм. Очаровательно.')]),
      O('Могу я хотя бы помочь?', [T('felicia', 'Можешь. Держи нитку. И не отвлекай меня этим взглядом.')], 1),
    ),
    T('felicia', 'Итак. Никакого спандекса. Уличный стиль. Твои джинсы огромные — в них удобно прыгать.'),
    T('felicia', 'Сверху — оверсайз-футболка. Оранжевая, чтобы видно издалека. Я нарисую на ней паутину.'),
    T('felicia', 'Маска белая, плотная, с гребнем — как твои волосы по утрам. И очки. Мои, для ночных... прогулок. С ночным режимом.'),
    T('peter', 'Оранжевый? Джеймсон скажет, что я клоун.'),
    T('felicia', 'Джеймсон и так говорит, что ты угроза. Будешь стильной угрозой.'),
    FN(() => { startTiming({ title: 'ШЬЁМ НОВЫЙ КОСТЮМ', hint: 'Жми, когда игла над зелёной строчкой', theme: 'needle', tries: 5, width: .38, speed: .045 }, h => { STORY.sew = h; resumeDialog(); }); return 'stop'; }),
    IF(() => STORY.sew >= 4, [T('felicia', 'Идеальные швы. Руки у тебя, я смотрю, не только для паутины.')], [T('felicia', 'Пара кривых швов. Скажем, что это задумка дизайнера.')]),
    CUT('new_suit'),
    FN(() => { if (!SAVE.suits.includes('street')) SAVE.suits.push('street'); SAVE.suit = 'street'; writeSave(); }),
    N('Через три часа из зеркала смотрит кто-то новый. Белая маска с острым гребнем, круглые очки, оранжевая футболка с паутиной, джинсы шириной с парус.'),
    T('spidey', 'Ого. Я выгляжу так, будто сейчас запишу рэп-альбом.'),
    T('felicia', 'Ты выглядишь так, что мне хочется немедленно тебя украсть.'),
    C('spidey',
      A('(Поцеловать её)', [N('Она отвечает на поцелуй так, что очки съезжают набок.')], 1),
      O('Спасибо. Серьёзно. Ты спасла Паука.', [T('felicia', 'Я спасла твой вкус. Паука ты спасаешь сам.')], 1),
    ),
    T('felicia', 'Иди, проверь его в деле. Балкон — там.'),
    CUT(null),
  ],
  H1_SKETCH: [
    N('На столе — альбом с эскизами. Паучьи костюмы, которых Питер никогда не видел: чёрный с белым пауком, белый с капюшоном, синий из будущего...'),
    T('felicia', 'Ты разговариваешь во сне, паучок. Про других пауков из других миров. А я зарисовываю.'),
    T('peter', 'Я... правда?'),
    T('felicia', 'Правда. Помогай людям, собирай паучьи жетоны — а я буду шить. Новые костюмы появятся у тебя в шкафу.'),
  ],
  H1_MIRROR: [T('spidey', 'Ладно, признаю. Штаны — огонь.')],
  TUT_INTRO: [
    CUT('jjj_radio'),
    T('jjj', 'Говорит Дж. Джона Джеймсон! Горожане, внимание! Человек-паук сменил костюм! Теперь он ОРАНЖЕВЫЙ!'),
    T('jjj', 'Оранжевый, как тыква! Как клоун! Как дорожный конус! Что он прячет в этих огромных штанах?!'),
    T('spidey', 'Свободу движений, Джона. Свободу движений.'),
    CUT(null),
  ],
  TUT_FIGHT: [
    T('thug', 'Ха! Гляньте, пацаны, клоун из пиццерии!'),
    T('spidey', 'Эй, у меня тоже есть чувства. И кулаки. Сейчас покажу, какие из них больнее.'),
  ],
  TUT_END: [
    T('lady', 'Спасибо, молодой человек! ...Эти штаны — это какой-то стиль?'),
    T('spidey', 'Скажем так, это эксперимент.'),
    N('На карнизе сидит Чёрная Кошка.'),
    T('cat', 'Неплохо в деле, паучок. Особенно сальто. Эти джинсы очень... выгодно развеваются.'),
    C('spidey',
      O('Ты следишь за мной?', [T('cat', 'Я слежу за своими инвестициями.')]),
      A('(Сделать ещё одно сальто)', [T('cat', 'Хвастун. Мне нравится.')], 1),
    ),
    T('cat', 'Завтра будет длинный день. Людям страшно — все говорят про монстра со щупальцами. Покажи им, что их сосед рядом.'),
  ],
  Q_INTRO: [
    N('Воскресенье. Квинс. Солнце, запах хот-догов, сирены.'),
    T('spidey', 'Дружелюбный сосед Человек-паук на связи! Кто сегодня застрял, упал или потерял маму?'),
  ],
  Q_END: [
    N('К вечеру у Паука болят руки. Зато ему улыбаются даже таксисты.'),
    T('spidey', 'Пора в больницу. Я обещал тёте Мэй навестить Рози.'),
  ],
  HOS_INTRO: [N('Больница Метро-Дженерал. Одиннадцать вечера. Часы посещений давно закончились, но медсестра делает вид, что не видит Питера.')],
  HOS_NURSE: [T('nurse', 'Вы к миссис Октавиус? Пять минут. И тише. Она не слышит, но... кто знает.')],
  HOS_ROSIE: [
    CUT('hospital_rosie'),
    T('peter', 'Здравствуйте, миссис Октавиус. Это Питер. Я принёс вам ромашки. Вы говорили, что любите ромашки.'),
    N('Приборы тихо пищат. За окном скрипит металл по стеклу.'),
    CUT(null),
  ],
  HOS_OTTO: [
    CUT('hospital_rosie'),
    N('В окне — Отто Октавиус. Четыре руки держат его на стене больницы, как паук держит паутину.'),
    T('octavius', 'Питер. Ты пришёл к ней. Хороший мальчик. Ты всегда был хорошим мальчиком.'),
    T('peter', 'Доктор Октавиус... вы живы.'),
    T('octavius', 'Жив? Я никогда не был так жив. Я чувствую каждый провод в этом городе. Я слышу их мысли. Они такие ясные.'),
    C('peter',
      O('Сдайтесь. Вам помогут. Руки можно снять.', [T('octavius', 'Снять? Они — часть меня. Отрезать их — всё равно что отрезать мне настоящие руки.')]),
      O('Рози не хотела бы, чтобы вы стали таким.', [FN(() => { STORY.otto = (STORY.otto || 0) + 1; }), T('octavius', 'Не смей говорить за неё!'), N('Но его голос дрожит.')]),
      O('Это не вы. Это руки говорят вашим голосом.', [FN(() => { STORY.otto = (STORY.otto || 0) + 1; }), T('octavius', 'Я... я управляю ими. Я!'), T('arms', 'Конечно, Отто. Конечно.')]),
    ),
    T('octavius', 'Я дострою реактор. Больше. Мощнее. Энергии хватит, чтобы сделать что угодно. Даже вернуть её.'),
    T('peter', 'Реактор чуть не взорвал пирс! Большой реактор снесёт пол-Манхэттена!'),
    T('arms', 'Он лжёт, Отто. Он с ними. С «Оскорпом». С Пауком.'),
    T('octavius', 'Прощай, Питер. Не ищи меня. Я не хочу, чтобы тебе было больно.'),
    N('Руки уносят его в темноту. На подоконнике остаются четыре глубокие царапины.'),
    T('peter', '(Я найду вас, доктор. Раньше, чем вы достроите этот реактор.)'),
    CUT(null),
  ],
  B_INTRO: [N('Редакция «Дейли Бьюгл». Понедельник. Джеймсон в прекрасном настроении — то есть орёт.')],
  B_JJJ: [
    T('jjj', 'ПАРКЕР! Фото оранжевого клоуна! Где?!'),
    T('peter', 'Вот. На крыше. В прыжке. А тут он спасает кота.'),
    T('jjj', 'Кота?! Коты не продают газеты! ...Хотя. Заголовок: «ПАУК ПОХИЩАЕТ КОШЕК». Беру!'),
    T('jjj', 'А теперь главное. Этот сумасшедший с железными щупальцами. Октавиус. Газете нужно имя!'),
    T('jjj', 'Октопус... Осьминог... ДОКТОР ОСЬМИНОГ! Гениально! Запишите — я придумал!'),
    T('robbie', 'Джона, по-моему, это придумала полиция.'),
    T('jjj', 'Робертсон, ты уволен! ...Шучу. Пока.'),
    C('peter',
      O('Он не злодей. Он болен.', [T('jjj', 'Больной злодей — всё равно злодей, Паркер! Это пойдёт на первую полосу.')]),
      O('Будет сделано, мистер Джеймсон.', [T('jjj', 'Вот! Учитесь у Паркера! А теперь — ВОН!')]),
    ),
  ],
  B_ROBBIE: [
    T('robbie', 'Питер. Октавиус был твоим учителем, да? Мне жаль. Правда.'),
    T('robbie', 'Когда падают люди, которых мы уважали, мы не перестаём их уважать. Мы просто должны их остановить.'),
  ],
  B_BETTY: [
    T('betty', 'Питер, у тебя на шее... это что, помада?'),
    C('peter',
      O('Это... от кофе.', [T('betty', 'Кофе с красной помадой. Ну-ну.')]),
      O('Может быть.', [T('betty', 'Ого! Питер Паркер — сердцеед! Кто она?'), T('peter', 'Она... крадёт сердца. Профессионально.')], 1),
    ),
  ],
  B_TV: [N('По телевизору: «...Дональд Менкен, «Оскорп»: компания не имеет никакого отношения к экспериментам доктора Октавиуса...»'), T('peter', 'Слишком быстро оправдываются.')],
  B_ALARM: [
    FN(() => SFX.alarm()),
    N('Радио у Бетти орёт: «Ограбление банка на Пятой авеню! Свидетели видят человека с механическими щупальцами!»'),
    T('peter', '(Пора сменить пиджак на что-нибудь оранжевое.)'),
  ],
  BANK_OCK: [
    CUT('bank_vault'),
    N('Дверь хранилища сорвана с петель. Наёмники таскают мешки. Посреди зала — Октавиус.'),
    T('ock', 'А, Паук. В новом наряде. Оранжевый? Смело.'),
    T('spidey', 'Доктор, вам не идёт грабить банки. Вы же учёный!'),
    T('ock', 'Учёным нужно финансирование. Банки его дают. Иногда — не по своей воле.'),
    T('ock', 'Уйди с дороги. Я не хочу тебя калечить.'),
    T('spidey', 'Взаимно. Но придётся.'),
    CUT(null),
  ],
  BANK_CAR: [
    FN(() => { if (L) L.lockInput = true; }),
    CUT('car_throw'),
    N('Октавиус хватает машину и швыряет её в толпу. Там мама с ребёнком.'),
    T('ock', 'Выбирай, Паук. Я — или они.'),
    T('spidey', 'Я всегда выбираю их.'),
    FN(() => { startTiming({ title: 'ПОЙМАЙ МАШИНУ', hint: 'Жми, когда стрелка в зелёной зоне — паутина натянется', theme: 'catch', tries: 3, width: .44, speed: .06 }, h => { STORY.car = h; resumeDialog(); }); return 'stop'; }),
    IF(() => STORY.car >= 2, [CUT('car_caught'), N('Паутина натягивается, как струна. Машина замирает в метре от ребёнка.')], [CUT('car_caught'), N('Одна паутина рвётся, вторая держит. Машина с грохотом падает на тротуар — в полуметре от людей.')]),
    T('mom', 'Спасибо! Спасибо тебе!'),
    N('Когда Паук оборачивается, Октавиуса уже нет. Как и денег.'),
    T('spidey', 'Он знал, что я брошусь спасать. Он до сих пор знает меня, как своего ученика.'),
    FN(() => unlockSuit('upgraded')),
    CUT(null),
    N('Вечером звонит телефон.'),
    T('felicia', 'Видела новости. Ты герой, паучок. И очень грустный герой, судя по фото.'),
    T('felicia', 'Завтра вечером. Моя терраса. Ужин. Надень что-нибудь красивое... Хотя можешь не надевать ничего.'),
    C('spidey',
      O('Я приду.', [T('felicia', 'Я знаю.')]),
      O('Ничего — это в смысле без костюма?', [T('felicia', 'Это в смысле — решай сам, умник.')], 1),
    ),
  ],
  H4_INTRO: [N('Вторник. Вечер. Питер третий раз меняет рубашку.')],
  H4_MAY: [
    T('may', 'Питер, ты полчаса смотришься в зеркало. Это та девушка? С очками и кабриолетом?'),
    T('peter', '...Да.'),
    T('may', 'Она тебе нравится.'),
    T('peter', 'Больше, чем нравится, тётя Мэй. С ней я могу быть собой. Полностью.'),
    T('may', 'Тогда слушай. Когда твой дядя Бен звал меня на первое свидание, он надел галстук своего отца. Ужасный. Коричневый в зелёную крапинку.'),
    N('Мэй достаёт из шкатулки старый галстук. Коричневый. В зелёную крапинку.'),
    T('may', 'На удачу.'),
    C('peter',
      O('Спасибо, тётя Мэй. Я его надену.', [T('may', 'Бен бы гордился. Ну, сначала посмеялся бы. А потом гордился.')]),
      A('(Обнять её)', [CUT('may_hug'), N('Мэй обнимает его крепко-крепко, как в детстве.'), CUT(null)]),
    ),
    T('may', 'Иди. И будь счастлив, Питер. Ты это заслужил.'),
  ],
  T_INTRO: [N('Терраса пентхауса. Гирлянды, свечи, весь Манхэттен внизу. Фелиция в чёрном платье с открытой спиной.')],
  T_DINNER: [
    T('felicia', 'Галстук в зелёную крапинку. Смело, Паркер.'),
    T('peter', 'Это на удачу. Долгая история.'),
    T('felicia', 'Люблю долгие истории.'),
    CUT('terrace_dinner'),
    T('felicia', 'Как ты? Честно. После банка.'),
    T('peter', 'Он был моим учителем. Он учил меня, что наука должна делать мир лучше. А теперь он швыряет машины в детей.'),
    T('felicia', 'Думаешь, его ещё можно спасти?'),
    C('peter',
      O('Я должен попробовать.', [T('felicia', 'Вот поэтому я в тебя и влюбилась. Ты пробуешь, даже когда шансов нет.')], 1),
      O('Не знаю.', [T('felicia', 'Иногда «не знаю» — самый честный ответ.')]),
    ),
    T('felicia', 'А теперь хватит о злодеях. Потанцуй со мной.'),
    FN(() => { startRhythm({ title: 'ТАНЕЦ ПОД ЗВЁЗДАМИ', count: 16, gap: 40 }, s => { STORY.dance = s; resumeDialog(); }); return 'stop'; }),
    CUT('dance'),
    IF(() => STORY.dance >= .7, [N('Они двигаются так, будто танцевали всю жизнь. Фелиция смеётся, когда Питер её кружит.'), FN(() => addLove(1))], [N('Питер дважды наступает ей на ногу. Фелиция смеётся и не отпускает его.')]),
    CUT('kiss'),
    N('Музыка затихает. Она не отпускает его руки.'),
    T('felicia', 'Питер... Останься сегодня.'),
    C('peter',
      O('Я никуда не уйду.', [N('Она целует его — медленно, глубоко, так, что город внизу перестаёт существовать.')], 1),
      A('(Молча поцеловать её)', [N('Поцелуй получается долгим. Её пальцы находят галстук в зелёную крапинку и тянут Питера за собой — в комнату.')], 2),
    ),
    N('Дверь на террасу закрывается. Свечи догорают без них.'),
    CUT(null),
  ],
  T_NIGHT: [
    CUT('morning_after'),
    N('Утро. Солнце в огромных окнах. На Фелиции — только его оранжевая футболка с паутиной.'),
    T('felicia', 'Доброе утро, паучок. Твоя футболка идёт мне больше, чем тебе. Признай.'),
    C('peter',
      O('Признаю. Можешь не возвращать.', [T('felicia', 'Я и не собиралась.')], 1),
      O('Эй, это мой костюм!', [T('felicia', 'Был твой. Теперь наш.')]),
    ),
    CUT(null),
  ],
  T_MORNING: [
    T('felicia', 'А теперь о деле. Пока ты спал, я кое-куда залезла. В сеть «Оскорпа».'),
    T('peter', 'Ты что сделала?!'),
    T('felicia', 'Милый, ты спасаешь людей, а я ворую информацию. У каждого свои таланты.'),
    T('felicia', 'Тритий для Отто продал посредник. Но деньги на сделку прошли через счёт «Оскорпа». Через Дональда Менкена.'),
    T('peter', 'Менкен? Тот, кто закрыл его проект? Зачем ему...'),
    T('felicia', 'Не знаю. Но всё самое интересное лежит на сервере в башне «Оскорпа». Сегодня ночью я туда иду. С тобой или без тебя.'),
    C('peter',
      O('Со мной. Одну я тебя не пущу.', [T('felicia', 'Ревнуешь меня к охране? Мило.')], 1),
      O('Это опасно, Фелиция.', [T('felicia', 'Я Чёрная Кошка, паучок. «Опасно» — моё второе имя.')]),
    ),
    T('felicia', 'И ещё кое-что.'),
    N('Она достаёт из шкафа старый костюм. Красный с синим. Аккуратно заштопанный.'),
    T('felicia', 'Я починила твой старый. На память. Надевай, когда захочешь вспомнить, с чего всё началось.'),
    FN(() => unlockSuit('classic')),
    T('peter', 'Фелиция... Спасибо.'),
    T('felicia', 'Скажешь спасибо потом. Ночью. Когда мы вломимся в «Оскорп».'),
  ],
  O_INTRO: [
    CUT('oscorp_tower'),
    N('Полночь. Башня «Оскорп» сияет над Мидтауном, как зелёный маяк.'),
    T('cat', 'План такой: ты летишь, я бегу по крышам, встречаемся на самом верху. Проигравший...'),
    T('spidey', '...исполняет желание. Помню.'),
    T('cat', 'Видишь? Мы уже как старая пара.'),
    CUT(null),
  ],
  O_ROOF: [
    T('cat', 'Вентиляция ведёт прямо на серверный этаж. Охрана ходит с фонарями. Постарайся, чтобы тебя не заметили.'),
    T('spidey', 'Я? Я сама тишина.'),
    T('cat', 'В оранжевой футболке. Ну да.'),
  ],
  OSC_S2: [
    T('cat', 'Я займусь громилами. А ты — глушилками. Рядом с ними твоя паутина не работает.'),
    T('spidey', 'Понял. Кулаками — так кулаками.'),
  ],
  O_FILES: [
    FN(() => { if (L && !L.alarm) { SAVE.flags.oscorpSilent = 1; checkUnlocks(); } }),
    N('Серверная. Гудят машины. Зелёный свет мигает в темноте.'),
    T('cat', 'Магнитный замок. Держи ритм, паучок, а я подберу код.'),
    FN(() => { startTiming({ title: 'ВЗЛОМ ЗАМКА', hint: 'Жми, когда отмычка напротив зелёного штифта', theme: 'lock', tries: 4, width: .32, speed: .055 }, h => { STORY.lock = h; resumeDialog(); }); return 'stop'; }),
    T('cat', 'Есть. Теперь терминал.'),
    FN(() => { startTiming({ title: 'ВЗЛОМ ТЕРМИНАЛА', hint: 'Лови зелёный сигнал', theme: 'hack', tries: 4, width: .28, speed: .065, jerk: true }, h => { STORY.hack = h; resumeDialog(); }); return 'stop'; }),
    CUT('oscorp_files'),
    N('На экране — файлы. «ПРОЕКТ ЩУПАЛЬЦЕ. Совершенно секретно».'),
    T('cat', 'Читаю: «Передать Октавиусу тритий через посредника. Дать достроить реактор. После испытаний изъять руки и реактор для военного контракта».'),
    T('spidey', 'Они всё подстроили. Авария, Рози, щупальца... «Оскорпу» нужно было, чтобы Отто сделал им оружие.'),
    T('cat', 'Тут подпись. «Одобрено: Н. О.»'),
    T('spidey', 'Н. О.? Норман Осборн? Он же в Рейвенкрофте!'),
    T('cat', 'Видимо, из Рейвенкрофта тоже можно подписывать бумаги. Если у тебя хорошие адвокаты.'),
    T('menken', 'Какая неприятность. Мисс Харди. И... оранжевый клоун.'),
    N('Двери распахиваются. Менкен в окружении охраны. Под потолком раскрываются лазерные турели.'),
    T('menken', 'Турели. Огонь.'),
    CUT('cat_hurt'),
    N('Луч летит прямо в Паука. Кошка бросается наперерез.'),
    T('spidey', 'ФЕЛИЦИЯ!'),
    T('cat', 'Всё... нормально. Царапина. Ну, большая царапина.'),
    N('Паук подхватывает её на руки и вылетает в окно сквозь дождь стеклянных осколков. Сервер пуст — Кошка успела всё скачать.'),
    CUT(null),
    T('felicia', 'Флешка... в кармане. Отдай её Робби Робертсону. Пусть весь город узнает.'),
    T('spidey', 'Держись. Я отнесу тебя к врачу.'),
    T('felicia', 'Лучше домой. У меня есть аптечка. И ты.'),
    N('В кармане её куртки что-то звякает. Прототип брони «Оскорпа» с механическими лапами. Она украла его «на всякий случай». Для него.'),
    FN(() => unlockSuit('iron')),
  ],
  R_INTRO: [
    N('Два дня спустя. «Дейли Бьюгл» печатает файлы «Проекта Щупальце». Менкена арестовывают прямо в офисе. Фелиция отлёживается дома и ворчит, что ей скучно.'),
    N('А Питеру звонят из больницы. Рози Октавиус пришла в себя.'),
  ],
  R_MAY: [
    T('may', 'Питер! Я испекла ей штрудель по её же рецепту. Есть ей пока нельзя, но пахнет-то можно!'),
    T('may', 'Как твоя девушка? Я видела газету. Кошка-воровка, которая помогла раскрыть заговор... Это ведь она?'),
    T('peter', 'Тётя Мэй...'),
    T('may', 'Я ничего не видела и ничего не знаю. Но передай ей, что пирог в силе.'),
  ],
  R_ROSIE: [
    T('rosie', 'Питер... ты пришёл.'),
    T('peter', 'Миссис Октавиус. Рози. Как вы?'),
    T('rosie', 'Как будто по мне проехал реактор. ...Где Отто?'),
    C('peter',
      O('Он жив. Но он... другой.', [T('rosie', 'Руки. Я знала. Я чувствовала, что они забирают его понемногу, каждый день.')]),
      O('Я не знаю, где он. Но я его найду.', [T('rosie', 'Найди. Пожалуйста.')]),
    ),
    T('rosie', 'Питер, послушай. Если увидишь его... скажи ему кое-что. Только ему.'),
    T('rosie', 'Скажи: «Солнце — это не реактор. Солнце — это когда ты приходишь домой». Он поймёт. Это наша фраза.'),
    T('peter', 'Скажу. Обещаю.'),
    T('rosie', 'И ещё. Ты ведь не просто его студент, правда? Ты всегда оказываешься там, где опасно.'),
    N('Питер молчит. Рози слабо улыбается.'),
    T('rosie', 'Береги себя, мальчик. Он тебя любит. Даже если сейчас не помнит об этом.'),
  ],
  R_NEWS: [
    FN(() => SFX.alarm()),
    N('Экран в холле: «Доктор Осьминог замечен на опорах Бруклинского моста! Он движется к реке!»'),
    T('peter', 'Пора.'),
  ],
  R_CHASE_END: [
    CUT('river_dive'),
    N('Октавиус прыгает с опоры моста прямо в Ист-Ривер. Руки врезаются в воду, как якоря.'),
    T('spidey', 'Пирс номер девять. Он вернулся туда, где всё началось.'),
    CUT('pier_reactor'),
    N('Из воды поднимается новый реактор. Втрое больше прежнего.'),
    T('spidey', 'Завтра ночью он его запустит. Если я его не остановлю...'),
    FN(() => unlockSuit('s2099')),
    CUT(null),
  ],
  F7_INTRO: [N('Ночь перед финалом. Пентхаус Фелиции. Она лежит на диване с перевязанным плечом и делает вид, что ей не больно.')],
  F_EVE: [
    T('felicia', 'Даже не думай. Одного я тебя туда не пущу.'),
    T('peter', 'Ты ранена. Я не позволю тебе...'),
    T('felicia', 'Позволишь. Ты всегда всё позволяешь, когда я так смотрю.'),
    C('peter',
      O('Не в этот раз. Мне нужно знать, что ты в безопасности.', [T('felicia', 'Ты невыносим.'), N('Она притягивает его за футболку.'), T('felicia', 'Ладно. Но если ты не вернёшься, я сама приду за тобой. И за Осьминогом. И за всеми, кто встанет на пути.')], 1),
      O('Тогда будь рядом. На крыше напротив. Если что — подхватишь.', [T('felicia', 'Договорились. Я всегда тебя подхвачу, паучок.')], 1),
    ),
    N('Она целует его долго, отчаянно, будто пытается запомнить.'),
    T('felicia', 'Возвращайся. Я ещё не все костюмы тебе сшила.'),
  ],
  F7_GO: [
    N('Пирс №9. Полночь. Реактор охраняют наёмники «Оскорпа» — Менкен успел заключить с Октавиусом последнюю сделку.'),
    T('spidey', 'Ладно. Последний раунд.'),
  ],
  PF_OCK: [
    CUT('pier_reactor'),
    N('В центре пирса гудит реактор. Над ним, на четырёх руках, возвышается Доктор Осьминог.'),
    T('ock', 'Ты пришёл, Паук. Я знал. Ты всегда приходишь.'),
    T('spidey', 'Доктор, файлы «Оскорпа» у полиции. Менкен арестован. Вас подставили. Всё кончено. Выключите реактор.'),
    T('ock', 'Кончено? Нет. Всё только начинается. Когда реактор заработает, никто — ни «Оскорп», ни полиция, ни ты — не отнимет у меня то, что моё.'),
    T('arms', 'Раздави его, Отто. Он последнее препятствие.'),
    CUT(null),
  ],
  OCK_P2: [
    T('ock', 'Ты быстрее, чем я думал. Но руки учатся. С каждым твоим ударом.'),
    T('arms', 'Мы вызвали помощь, Отто.'),
  ],
  OCK_P3: [
    T('ock', 'ХВАТИТ!'),
    N('Реактор ревёт. Руки двигаются так быстро, что их почти не видно.'),
    T('spidey', '(Он становится сильнее. А я — нет.)'),
  ],
  OCK_WIN: [
    CUT('unmasked'),
    N('Удар. Ещё удар. Щупальце сбивает Паука с ног, второе прижимает к доскам, третье срывает маску.'),
    T('ock', 'Посмотрим, кто прячется под этой...'),
    N('Тишина. Даже реактор, кажется, замолкает.'),
    T('octavius', 'Питер?..'),
    T('peter', 'Здравствуйте, доктор.'),
    T('octavius', 'Мой мальчик... Это был ты? Всё это время?'),
    C('peter',
      O('Рози просила передать: «Солнце — это не реактор. Солнце — это когда ты приходишь домой».', [N('Руки замирают. Октавиус отшатывается, как от удара.'), T('octavius', 'Рози... она очнулась? Она... ждёт меня?'), T('arms', 'Это ловушка, Отто. Он лжёт. Все лгут.'), T('octavius', 'Замолчите! ЗАМОЛЧИТЕ!')]),
      O('Выключите реактор. Вы учили меня, что наука должна спасать.', [T('octavius', 'Спасать... Да. Я учил. Когда-то.'), T('arms', 'Он — враг, Отто.')]),
    ),
    N('Отто колеблется всего секунду. Этой секунды хватает: Питер выстреливает паутиной в пульт, и реактор уходит в аварийный режим. Сфера гаснет.'),
    T('arms', 'НЕТ!'),
    T('ock', 'Что ты наделал?! Двадцать лет... СНОВА!'),
    N('Руки швыряют Питера через весь пирс. Он едва успевает натянуть маску.'),
    T('arms', 'Убей его. Он видел наше лицо. Мы знаем, где живёт его тётя.'),
    T('ock', 'Беги, Питер. Беги, пока я ещё помню, кем ты был для меня. Потому что через минуту я забуду.'),
    CUT(null),
    FN(() => { if (L) L.lockInput = false; }),
  ],
  ESC_END: [
    CUT('escape_fall'),
    N('На последней крыше силы заканчиваются. Паук срывается вниз — в темноту между домами.'),
    N('И чьи-то руки ловят его на лету.'),
    T('cat', 'Я же говорила: я всегда тебя подхвачу, паучок.'),
    T('spidey', 'Фелиция... ты же ранена.'),
    T('cat', 'Ты тоже. Будем ранеными вместе.'),
    CUT(null),
  ],
  END_INTRO: [
    CUT('patch_up'),
    N('Пентхаус. Три часа ночи. Фелиция промывает ему ссадины и бинтует спину.'),
    T('felicia', 'Не дёргайся. Я профессионал.'),
    T('peter', 'Ты вор.'),
    T('felicia', 'Профессиональный вор. Мы умеем обращаться с ценными вещами.'),
    CUT(null),
  ],
  END_TALK: [
    T('peter', 'Я проиграл, Фелиция. Он оказался сильнее. Он видел моё лицо. Он знает, кто я.'),
    T('felicia', 'Ты не проиграл. Реактор выключен. Город цел. Менкен в тюрьме. А Отто на секунду вспомнил, кто он такой. Это сделал ты.'),
    T('peter', 'Он знает про тётю Мэй.'),
    T('felicia', 'Тогда завтра перевезём её сюда. У меня пять спален и ни одного пирога. Ей понравится.'),
    C('peter',
      O('Ты удивительная, ты знаешь?', [T('felicia', 'Знаю. Но от тебя это звучит лучше.')], 1),
      O('Я люблю тебя.', [N('Она замирает с бинтом в руках.'), T('felicia', 'Скажи ещё раз. Медленно.'), T('peter', 'Я люблю тебя, Фелиция Харди.'), T('felicia', 'Я тоже тебя люблю, Питер Паркер. Даже в этих ужасных штанах.')], 2),
      A('(Молча притянуть её к себе)', [N('Бинт падает на пол. Перевязка может подождать.')], 1),
    ),
    IF(() => SAVE.love >= 12, [N('Они засыпают под утро, переплетя пальцы. Впервые за много дней Питеру не снятся щупальца.')], [N('Они долго сидят у окна и смотрят, как над Ист-Ривер светает.')]),
    T('peter', 'Он вернётся. И я тоже. В следующий раз я буду готов.'),
    T('felicia', 'Мы будем готовы.'),
  ],
  POST: [
    CUT('post_ock'),
    N('ПОСЛЕ ТИТРОВ. Руины пирса №9.'),
    T('octavius', 'Питер Паркер... мой лучший ученик.'),
    T('arms', 'Он победил нас сегодня, Отто.'),
    T('octavius', 'Нет. Сегодня он просто сбежал. А в следующий раз...'),
    T('ock', 'В следующий раз мы будем готовы. Все восемь рук.'),
    T('arms', 'Четыре, Отто.'),
    T('ock', 'Я знаю, сколько у меня рук!'),
    CUT('post_norman'),
    N('Институт Рейвенкрофт. Камера 7.'),
    N('Норман Осборн читает свежий «Дейли Бьюгл». На первой полосе — оранжевый Паук и заголовок: «ПРОЕКТ ЩУПАЛЬЦЕ: ПОДПИСЬ Н. О.».'),
    T('norman', 'Ах, Отто, Отто. Ты всегда был слишком сентиментален.'),
    N('В темноте камеры кто-то тихо смеётся. Голосом, который совсем не похож на голос Нормана.'),
    T('goblinv', 'Скоро, Норман. Скоро мы снова полетаем.'),
    CUT(null),
  ],
};
