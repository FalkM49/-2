'use strict';
// ============================================================ level builders
function addB(L, x, top, w, o = {}) { L.solids.push({ x, y: top, w, h: L.h - top + 200, kind: 'bldg', props: o.props || [], fire: o.fire }); }
function addStreet(L, x, w) { L.solids.push({ x, y: L.h - 60, w, h: 260, kind: 'street' }); }
function addPlat(L, x, y, w, style, c) { L.solids.push({ x, y, w, h: 12, kind: 'plat', style, c }); }
function addCover(L, x, w, h, style, c, base) { const G = base != null ? base : L.h - 60; L.solids.push({ x, y: G - h, w, h, kind: 'cover', style, c }); }
function addMetal(L, x, y, w, h, climb = true) { L.solids.push({ x, y, w, h, kind: 'metal', climb }); }
const prop = (k, x, extra) => Object.assign({ k, x }, extra);
function civ(L, look, x, x1, x2, opt) { L.civs.push(Object.assign({ look, x, y: L.h - 60, x1, x2, vx: (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .6), face: 1, t: 0 }, opt)); }
function tok(L, x, y) { const i = L.tokens.length; L.tokens.push({ x, y, i, got: !!SAVE.flags['tok_' + L.id + '_' + i] }); }
function genCity(L, x0, x1, seed, o) {
  const r = rng(seed), G = L.h - 60;
  let x = x0;
  while (x < x1) {
    const w = 200 + r() * 240;
    const top = G - (o.minH + r() * (o.maxH - o.minH));
    const props = [];
    const n = Math.floor(w / 150);
    for (let k = 0; k < n; k++) props.push(prop(pick(['tank', 'ac', 'antenna', 'vent', 'bill', 'ac']), x + 40 + r() * (w - 80), { t: pick(['ПИЦЦА', 'БЬЮГЛ', 'КИНО', 'СОДА']), c: pick(['#e05a3a', '#3a8ac0', '#e0b83a', '#8a3ac0']) }));
    addB(L, x, top, w, { props, fire: r() < .3 });
    x += w + (r() < o.gap ? 140 + r() * 180 : 0);
  }
}
function pierDeck(L, x, w) { L.solids.push({ x, y: L.h - 60, w, h: 60, kind: 'pier' }); }

// ============================================================ levels
const LEVELS = {
  pier_rescue: {
    w: 2300, h: 800, theme: 'night', bg: 'river', fire: true, spawn: [260, 666],
    build(L) {
      const G = L.h - 60;
      pierDeck(L, 0, 2300);
      addMetal(L, 900, G - 360, 30, 230); addMetal(L, 900, G - 380, 1230, 22); addMetal(L, 2100, G - 380, 30, 380);
      addPlat(L, 1000, G - 150, 300); addPlat(L, 1380, G - 250, 320);
      addCover(L, 1480, 60, 50, 'crate');
      L.events = [
        { id: 'w1', type: 'carry', x: 1150, y: G - 150, tx: 190, ty: G, req: true, look: 'worker', label: 'Вынести рабочего', slot: 0, st: 'idle', thanks: 'Там... ещё люди!' },
        { id: 'w2', type: 'carry', x: 1560, y: G - 250, tx: 190, ty: G, req: true, look: 'worker', label: 'Вынести рабочего', slot: 1, st: 'idle', thanks: 'Спасибо, Паук!' },
        { id: 'w3', type: 'carry', x: 1500, y: G - 380, tx: 190, ty: G, req: true, look: 'worker', label: 'Снять с крыши', slot: 2, st: 'idle', thanks: 'Я думал, сгорю там...' },
        { id: 'rosie', type: 'carry', x: 1960, y: G, tx: 190, ty: G, req: true, look: 'rosie', label: 'Спасти Рози', slot: 3, st: 'idle', thanks: 'Отто... где Отто...' },
      ];
    },
    onStart(L) { L.data.slamT = 200; showHint(COARSE ? 'Подойди к раненому и нажми УДАР, чтобы поднять. Отнеси к лодке ←' : 'Подойди к раненому и нажми E, чтобы поднять. Отнеси к лодке слева', 480); },
    tick(L) {
      const d = L.data;
      if (d.slam) { d.slam.t--; if (d.slam.t === 0) { shake = 14; SFX.slam(); ring(d.slam.x, L.h - 60, '#ffb060', 90); burst(d.slam.x, L.h - 64, '#c8a878', 16, 5); if (Math.abs(P.x + P.w / 2 - d.slam.x) < 80 && P.y + P.h > L.h - 60 - 110) heroHurt(12, d.slam.x, 8); } if (d.slam.t < -30) d.slam = null; }
      else if (--d.slamT <= 0) { d.slam = { x: clamp(P.x + P.w / 2 + (Math.random() - .5) * 160, 400, 2080), t: 56 }; d.slamT = 190 + Math.random() * 120; senseTrigger(12); }
    },
    drawBack(L) {
      const G = L.h - 60;
      ctx.fillStyle = '#1a1420'; ctx.fillRect(930, G - 358, 1170, 358);
      ctx.fillStyle = HT_SOFT; ctx.fillRect(930, G - 358, 1170, 358);
      const rx = 1850, ry = G - 200, pulse = Math.sin(frame * .3) * 8;
      glow(rx, ry, 180 + pulse, [0, 'rgba(255,240,180,.95)', .3, 'rgba(255,150,40,.6)', 1, 'rgba(255,90,30,0)'], .06);
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(rx, ry, 70, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#8a90a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(rx, ry, 70, .4, 2.2); ctx.stroke();
      for (let i = 0; i < 18; i++) { const x = 950 + i * 64, h = 20 + Math.abs(Math.sin(frame * .2 + i)) * 26; ofill(() => { ctx.moveTo(x - 14, G); ctx.quadraticCurveTo(x - 10, G - h * .6, x, G - h); ctx.quadraticCurveTo(x + 10, G - h * .6, x + 14, G); ctx.closePath(); }, i % 2 ? '#ff9a2e' : '#ffd84a', 1.8); }
      ctx.save(); ctx.translate(200, G + 14);
      opoly([-90, -10, 90, -10, 70, 20, -70, 20], '#e8e8f0', 2.4); ctx.fillStyle = '#d7263d'; ctx.fillRect(-88, -4, 176, 5);
      ctx.fillStyle = GOLD; ctx.font = `11px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText('ЛОДКА', 0, -20); ctx.textAlign = 'left';
      ctx.restore();
    },
    drawFront(L) {
      const d = L.data, G = L.h - 60;
      if (d.slam) {
        const k = clamp(1 - d.slam.t / 56, 0, 1);
        ctx.fillStyle = `rgba(255,60,40,${.2 + k * .3})`; ctx.beginPath(); ctx.ellipse(d.slam.x, G - 2, 30 + k * 50, 8, 0, 0, TAU); ctx.fill();
        const ty = d.slam.t > 10 ? G - 400 + k * 120 : lerp(G - 280, G - 20, 1 - clamp(d.slam.t / 10, 0, 1));
        drawTentacle(d.slam.x + 120, G - 500, d.slam.x, ty, d.slam.x + 60, G - 460, .9, { glow: '#ff4a2a' });
      }
    },
    onEvent(L) { if (L.events.every(e => !e.req || e.st === 'done')) setTimeout(() => finishLevel(), 900); },
    onDeath(L) { P.hp = 40; P.inv = 90; showHint('Паук держится. Ещё немного!', 200); return true; },
  },
  tutorial: {
    w: 4300, h: 900, theme: 'dusk', spawn: [120, 466],
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 4300);
      addB(L, 0, G - 300, 520, { props: [prop('ac', 120), prop('tank', 400)] });
      addB(L, 640, G - 560, 260, { props: [prop('antenna', 760)], fire: true });
      addB(L, 1120, G - 380, 420, { props: [prop('bill', 1300, { t: 'БЬЮГЛ', c: '#e0b83a' })] });
      addB(L, 1680, G - 170, 200, { props: [prop('ac', 1760)] });
      addPlat(L, 1960, G - 140, 170, 'awning', '#2a8a5a');
      addCover(L, 2240, 70, 44, 'crate');
      addB(L, 2480, G - 230, 260, { props: [prop('vent', 2560)] });
      addB(L, 3300, G - 200, 240, { props: [prop('ac', 3400)] });
      addPlat(L, 3650, G - 130, 150, 'awning', '#d7263d');
      addB(L, 3950, G - 260, 350, { props: [prop('tank', 4150)] });
      tok(L, 770, G - 640); tok(L, 2610, G - 280);
      L.pickups.push({ kind: 'hotdog', x: 1800, y: G - 200 }, { kind: 'throw', x: 2100, y: G - 12 });
      L.events.push({ id: 'thief', type: 'thief', x: 2920, y: G, req: true, label: 'Помочь даме', maxX: 4250, st: 'idle' });
      civ(L, 'skater', 3000, 2860, 3280); civ(L, 'tourist', 3100, 2860, 3280);
    },
    sections: () => [
      { x1: 1600, foes: [] },
      { x1: 2830, foes: [['thug', 1950], ['thug', 2150], ['thug2', 2380], ['thug', 2700]], enter: 'TUT_FIGHT' },
      { x1: null, foes: [] },
    ],
    goal: 'events',
    onStart(L) { L.data.tut = 0; showHint('← → бег · Пробел прыжок · в воздухе ещё раз — сальто', 360); },
    tick(L) {
      const d = L.data, G = L.h - 60;
      const step = (n, cond, text, t = 420) => { if (d.tut === n && cond) { d.tut++; showHint(text, t); } };
      step(0, P.x > 520, COARSE ? 'Прыгни к стене и держи ▶ — Паук лазает. ▲ ▼ — вверх и вниз' : 'Прыгни к стене и держи → — Паук лазает. W/S или ↑/↓ — вверх и вниз');
      step(1, P.y + P.h < G - 540, COARSE ? 'Держи ЛИАНА в прыжке — маятник. Короткое нажатие — зип к краю крыши' : 'Держи L в прыжке — маятник, отпусти в верхней точке. Короткое L — зип к краю крыши', 500);
      step(2, P.x > 1640, COARSE ? 'УДАР ×4 — комбо. ▼+УДАР — подсечка. ПАУТИНА — выстрел, держи — рывок к себе' : 'J ×4 — комбо (последний удар подбрасывает). ↓+J — подсечка. K — паутина, держи K — рывок', 520);
      step(3, stats.kos >= 1, COARSE ? 'Волнистые линии над головой — паучье чутьё. Жми УВОРОТ в этот момент!' : 'Волнистые линии над головой — паучье чутьё. Жми Shift в этот момент — время замедлится!', 480);
      step(4, P.focus >= 100, COARSE ? 'Фокус полон! Жми СУПЕР' : 'Фокус полон! Жми I — супер-приём', 360);
      if (d.tut === 5 && P.x > 2900) { d.tut++; }
    },
    onEvent(L) { setTimeout(() => finishLevel(), 1200); },
  },
  queens: {
    w: 5400, h: 1000, theme: 'day', spawn: [120, 606],
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 5400);
      addB(L, 0, G - 260, 380, { props: [prop('ac', 100), prop('garden', 250)] });
      addB(L, 460, G - 340, 280, { props: [prop('garden', 600)] });
      addB(L, 1100, G - 560, 300, { props: [prop('bill', 1250, { t: 'КОФЕ', c: '#3a8ac0' })], fire: true });
      addB(L, 2000, G - 120, 200, {});
      addB(L, 3200, G - 280, 300, { props: [prop('tank', 3350)] });
      addB(L, 3620, G - 640, 240, { props: [prop('antenna', 3740)] });
      addB(L, 4000, G - 330, 300, { props: [prop('ac', 4100), prop('vent', 4220)] });
      addB(L, 4950, G - 300, 450, { props: [prop('tank', 5100), prop('bill', 5260, { t: 'ПИЦЦА', c: '#e05a3a' })] });
      addPlat(L, 1500, G - 120, 150, 'awning', '#d7263d'); addPlat(L, 2500, G - 130, 160, 'awning', '#2a8a5a'); addPlat(L, 4500, G - 130, 150, 'awning', '#e0b83a');
      tok(L, 1250, G - 600); tok(L, 2100, G - 170); tok(L, 3740, G - 760); tok(L, 4700, G - 260);
      L.pickups.push({ kind: 'hotdog', x: 2700, y: G - 30 }, { kind: 'hotdog', x: 4400, y: G - 30 });
      L.events = [
        { id: 'fall', type: 'fall', x: 1040, y: G, top: G - 470, req: true, label: 'Мойщик окон', st: 'idle' },
        { id: 'lift', type: 'lift', x: 1700, y: G, req: true, label: 'Поднять машину', st: 'idle' },
        { id: 'kid', type: 'escort', x: 2300, y: G, tx: 3100, req: true, label: 'Потерявшийся мальчик', st: 'idle' },
        { id: 'cat', type: 'cat', x: 3560, y: G, cx: 3740, cy: G - 640 - 70, label: 'Кот на антенне', st: 'idle' },
        { id: 'pizza', type: 'deliver', x: 3930, y: G, tx: 600, ty: G - 340, time: 50, label: 'Раненый курьер', st: 'idle' },
        { id: 'mug', type: 'mugging', x: 4620, y: G, label: 'Грабёж', st: 'idle', spawn: [['thug', 4480], ['thug2', 4760], ['thug', 4850]] },
      ];
      for (let i = 0; i < 8; i++) civ(L, pick(CIV_KINDS), 1400 + i * 420, 1400 + i * 420 - 150, 1400 + i * 420 + 150);
    },
    goalX: 5200, goalCheck: L => L.events.every(e => !e.req || e.st === 'done'),
    onStart(L) { showHint('Помоги горожанам: жёлтые «!» — обязательно, зелёные — по желанию. Стрелки по краям экрана подскажут путь', 520); },
    onEvent(L, ev) { if (L.events.every(e => !e.req || e.st === 'done') && !L.data.allReq) { L.data.allReq = 1; showHint('Обязательные дела сделаны! Лети на восток, к больнице →', 420); } },
  },
  swing_bank: {
    w: 6400, h: 1100, theme: 'day', spawn: [80, 0], timer: 60 * 70,
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 6400);
      genCity(L, 0, 6300, 4242, { minH: 300, maxH: 720, gap: .5 });
      L.solids.forEach(s => { if (s.kind === 'bldg' && s.x < 40) L.data.first = s; });
      const RR = [[700, G - 520], [1300, G - 600], [1900, G - 480], [2500, G - 640], [3100, G - 540], [3700, G - 600], [4400, G - 500], [5100, G - 620], [5700, G - 540]];
      RR.forEach(([x, y]) => L.rings.push({ x, y }));
      tok(L, 1600, G - 760); tok(L, 3300, G - 800); tok(L, 5400, G - 780);
    },
    onStart(L) { const f = L.solids.find(s => s.kind === 'bldg' && s.x <= 80 && s.x + s.w > 80); if (f) P.y = f.y - P.h; showHint('Банк грабят! Успей до конца таймера. Кольца добавляют время', 360); },
    goalX: 6250,
    onTimeout(L) { showHint('Опоздал! Ещё раз — держи темп маятником', 300); startLevel('swing_bank', L.onDone); },
  },
  bank_fight: {
    w: 2800, h: 800, theme: 'day', spawn: [120, 366],
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 2800);
      addB(L, 0, G - 300, 300, { props: [prop('ac', 120)] });
      addCover(L, 520, 92, 40, 'car', '#3a7ac0'); addCover(L, 940, 92, 40, 'car', '#e0b83a');
      addCover(L, 1400, 70, 46); addCover(L, 1720, 70, 46); addCover(L, 2220, 92, 40, 'car', '#c83a3a');
      addPlat(L, 1100, G - 140, 170, 'awning', '#2a8a5a'); addPlat(L, 2000, G - 150, 170, 'awning', '#d7263d');
      L.pickups.push({ kind: 'hotdog', x: 1300, y: G - 30 }, { kind: 'throw', x: 800, y: G - 12 }, { kind: 'throw', x: 1900, y: G - 12 });
      tok(L, 150, G - 360);
    },
    sections: () => [
      { x1: 1300, foes: [['thug', 650], ['gunner', 1080], ['brute', 900], ['gunner', 760]], hint: 'Стрелки прячутся за машинами. Громила закрывает их щитом — вырви щит рывком паутины (держи K)' },
      { x1: null, foes: [['thug2', 1600], ['brute', 1950], ['gunner', 2100], ['gunner', 2500], ['medic', 2400]] },
    ],
    drawBack(L) { drawBankFacade(1700, L.h - 60); },
  },
  ock_bank: {
    w: 1500, h: 760, theme: 'day', spawn: [150, 626],
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 1500);
      addMetal(L, -30, 0, 30, L.h, false); addMetal(L, 1500, 0, 30, L.h, false);
      addCover(L, 250, 92, 40, 'car', '#6a8a4a'); addCover(L, 1160, 92, 40, 'car', '#3a7ac0');
      addPlat(L, 520, G - 170, 170, 'awning', '#d7263d'); addPlat(L, 860, G - 170, 170, 'awning', '#2a8a5a');
      L.pickups.push({ kind: 'hotdog', x: 750, y: G - 30 });
    },
    onStart(L) { L.boss = makeOck(L, 1100, { hp: 60, mini: true }); showHint('Щупальца блокируют удары. Бей, когда он атакует или оглушён. Застрявшие клешни пришпиливай паутиной!', 520); },
    drawBack(L) { drawBankFacade(300, L.h - 60); },
  },
  swing_oscorp: {
    w: 6200, h: 1200, theme: 'night', spawn: [80, 0],
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 6200);
      genCity(L, 0, 5600, 9090, { minH: 380, maxH: 800, gap: .45 });
      addB(L, 5700, G - 1000, 420, { props: [prop('antenna', 5900)] });
      L.data.tower = L.solids[L.solids.length - 1];
      tok(L, 1400, G - 880); tok(L, 3000, G - 900); tok(L, 4700, G - 860);
      let pid = 0;
      for (const x of [1500, 2900, 4300]) { spawnFoe(['drone', x, G - 700, { pair: pid, pairId: pid * 2 + 1 }], -1); spawnFoe(['drone', x + 260, G - 640, { pair: pid, pairId: pid * 2 + 2 }], -1); pid++; }
      L.enemies.forEach(e => { e.optional = true; e.pairId = e.pairId; e.pair = e.pair; });
    },
    onStart(L) { const f = L.solids.find(s => s.kind === 'bldg' && s.x <= 80 && s.x + s.w > 80); if (f) P.y = f.y - P.h; L.data.catX = P.x + 80; showHint('Долети до башни «Оскорпа» и заберись на крышу. Дроны связаны током — не пролетай между ними', 480); },
    tick(L) { L.data.catX = lerp(L.data.catX, P.x + 140, .03); },
    drawFront(L) { const cx = L.data.catX, cy = topAt(cx, 0); drawCat(cx, cy, 1, POSES.run(frame * .3), {}); },
    goalX: 5720, goalCheck: L => P.y + P.h < L.data.tower.y + 10,
  },
  oscorp_in: {
    w: 3900, h: 900, theme: 'night', bg: 'interior', indoor: true, spawn: [100, 766],
    build(L) {
      const G = L.h - 60;
      addMetal(L, 0, G, 3900, 80, false); addMetal(L, 0, 0, 3900, 50, false);
      addMetal(L, -30, 0, 30, L.h, true); addMetal(L, 3900, 0, 30, L.h, true);
      addMetal(L, 420, G - 300, 40, 300); addMetal(L, 1000, 50, 40, 380);
      addPlat(L, 520, G - 200, 260); addPlat(L, 820, G - 330, 240); addPlat(L, 1500, G - 180, 260); addPlat(L, 2000, G - 300, 260);
      addMetal(L, 2300, G - 260, 60, 260); addPlat(L, 2800, G - 200, 260); addPlat(L, 3200, G - 320, 240);
      addCover(L, 1700, 60, 46, 'crate', null, G); addCover(L, 2150, 60, 46, null, null, G); addCover(L, 2900, 60, 46, 'crate', null, G); addCover(L, 3450, 60, 46, null, null, G);
      L.pickups.push({ kind: 'hotdog', x: 1400, y: G - 30 }, { kind: 'hotdog', x: 2700, y: G - 30 }, { kind: 'throw', x: 1800, y: G - 60 });
      tok(L, 930, G - 370); tok(L, 3310, G - 360);
    },
    sections: () => [
      { x1: 1300, foes: [['guard', 600, null, { px1: 520, px2: 900 }], ['guard', 820, 510, { px1: 830, px2: 1050 }], ['guard', 300, null, { px1: 150, px2: 380 }], ['guard', 1150, null, { px1: 1060, px2: 1260 }]], hint: 'Тихо! Подкрадись со спины или сверху и нажми J — тихое устранение. Не попадай в лучи фонарей' },
      { x1: 2600, foes: [['jammer', 2200], ['gunner', 1800], ['gunner', 2450], ['brute', 1650], ['thug2', 2000]], enter: 'OSC_S2' },
      { x1: null, foes: [['medic', 3600], ['gunner', 3000], ['gunner', 3350], ['brute', 3200], ['jammer', 3700], ['drone', 2900, 400, { pair: 7, pairId: 71 }], ['drone', 3300, 380, { pair: 7, pairId: 72 }]] },
    ],
    onStart(L) { L.stealthTakedown = stealthTakedownCheck; },
    onAlarm(L) { spawnFoe(['gunner', P.x + 300], 0); spawnFoe(['gunner', Math.max(100, P.x - 300)], 0); showHint('Тревога! Подкрепление. Придётся драться', 300); },
    tick(L) { catAllyTick(L); },
    drawFront(L) { if (L.data.cat) drawCatAlly(L.data.cat); },
  },
  chase_bridge: {
    w: 7400, h: 1100, theme: 'dusk', spawn: [80, 0],
    build(L) {
      const G = L.h - 60;
      addStreet(L, 0, 7400);
      genCity(L, 0, 7200, 5151, { minH: 280, maxH: 700, gap: .55 });
      tok(L, 2400, G - 820); tok(L, 5200, G - 820);
    },
    onStart(L) { const f = L.solids.find(s => s.kind === 'bldg' && s.x <= 80 && s.x + s.w > 80); if (f) P.y = f.y - P.h; L.data.ock = { x: 700, y: 0, t: 0, lost: 0, throwT: 160, face: 1 }; showHint('Не упусти Октавиуса! Держись ближе — он швыряет обломки', 420); },
    tick(L) {
      const o = L.data.ock, G = L.h - 60;
      const d = o.x - P.x;
      const spd = d > 600 ? 5.2 : d < 250 ? 8.4 : 6.6;
      o.x += spd; o.t++;
      o.y = topAt(o.x, 0);
      if (--o.throwT <= 0) { o.throwT = 130 + Math.random() * 60; throwDebris(o.x, o.y - 160, P.x + P.w / 2 + P.vx * 20, P.y + 30); }
      if (d > 950) { o.lost++; if (o.lost === 1) showHint('Отстаёшь! Маятник быстрее бега', 200); if (o.lost > 300) { showHint('Упустил его! Ещё раз', 240); startLevel('chase_bridge', L.onDone); } } else o.lost = 0;
      if (o.x > 7100) finishLevel();
    },
    drawFront(L) { const o = L.data.ock; drawOckRunner(o.x, o.y, 1, o.t); },
  },
  pier_final: {
    w: 3600, h: 900, theme: 'night', bg: 'river', spawn: [120, 766],
    build(L) {
      const G = L.h - 60;
      pierDeck(L, 0, 3600);
      for (const [x, h, c] of [[400, 150, '#c83a3a'], [900, 240, '#3a7ac0'], [1500, 150, '#e0b83a'], [2100, 260, '#3a8a5a'], [2700, 180, '#c83a3a'], [3200, 240, '#3a7ac0']]) { addMetal(L, x, G - h, 150, h); L.solids[L.solids.length - 1].container = c; }
      addPlat(L, 620, G - 170, 200); addPlat(L, 1200, G - 250, 200); addPlat(L, 1800, G - 190, 200); addPlat(L, 2400, G - 280, 200); addPlat(L, 3000, G - 200, 160);
      L.pickups.push({ kind: 'hotdog', x: 1150, y: G - 30 }, { kind: 'hotdog', x: 2350, y: G - 30 }, { kind: 'throw', x: 700, y: G - 12 }, { kind: 'throw', x: 1900, y: G - 12 });
      tok(L, 2175, G - 300);
    },
    sections: () => [
      { x1: 1250, foes: [['thug', 600], ['gunner', 1050], ['thug2', 850], ['drone', 700, 500, { pair: 1, pairId: 11 }], ['drone', 1000, 460, { pair: 1, pairId: 12 }]] },
      { x1: 2450, foes: [['brute', 1600], ['gunner', 1900], ['brute', 2200], ['gunner', 2350], ['medic', 2000]] },
      { x1: null, foes: [['jammer', 3000], ['brute', 2800], ['gunner', 3350], ['medic', 3450], ['drone', 2700, 480, { pair: 2, pairId: 21 }], ['drone', 3100, 440, { pair: 2, pairId: 22 }]] },
    ],
    drawBack(L) { const G = L.h - 60; for (const s of L.solids) if (s.container) { orrect(s.x, s.y, s.w, s.h, 2, s.container, 2.8); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; for (let x = s.x + 12; x < s.x + s.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, s.y + 6); ctx.lineTo(x, s.y + s.h - 6); ctx.stroke(); } } drawReactorFar(3300, G - 520); },
  },
  ock_final: {
    w: 1800, h: 860, theme: 'night', bg: 'river', spawn: [150, 726],
    build(L) {
      const G = L.h - 60;
      pierDeck(L, 0, 1800);
      addMetal(L, -30, 0, 30, L.h); addMetal(L, 1800, 0, 30, L.h);
      addPlat(L, 180, G - 170, 300); addPlat(L, 1320, G - 170, 300); addPlat(L, 700, G - 320, 400);
      L.pickups.push({ kind: 'hotdog', x: 900, y: G - 360 }, { kind: 'throw', x: 400, y: G - 12 }, { kind: 'throw', x: 1400, y: G - 12 });
    },
    onStart(L) { L.boss = makeOck(L, 1300, { hp: 100, phase: BOSS_CK }); if (BOSS_CK > 1) L.boss.hp = BOSS_CK === 2 ? 66 : 33; },
    drawBack(L) { drawReactorBig(900, L.h - 60 - 330, L.boss ? L.boss.charge : .5); },
    onDeath(L) { if (L.boss && L.boss.phase >= 3) { L.boss.scriptDefeat(); return true; } return false; },
  },
  escape: {
    w: 5600, h: 1000, theme: 'night', bg: 'river', spawn: [300, 0],
    build(L) {
      const G = L.h - 60;
      pierDeck(L, 0, 700);
      addStreet(L, 700, 4900);
      genCity(L, 800, 5400, 7373, { minH: 240, maxH: 560, gap: .45 });
    },
    onStart(L) { P.y = L.h - 60 - P.h; L.data.ock = { x: -200, y: L.h - 60, t: 0, throwT: 100, face: 1 }; P.hp = 45; showHint('БЕГИ! Октавиус прямо за тобой!', 300); },
    tick(L) {
      const o = L.data.ock;
      const spd = 4.6 + Math.min(2.4, L.t / 900);
      o.x += spd; o.t++;
      if (o.x < P.x - 700) o.x = P.x - 700;
      o.y = topAt(o.x, 0);
      if (o.x > P.x - 90) { if (heroHurt(10, o.x, 0)) { P.vx = 10; P.vy = -8; pop(P.x, P.y - 20, 'ТЯНИСЬ!', '#ff4d5e', 22); } }
      if (--o.throwT <= 0) { o.throwT = 110 + Math.random() * 60; throwDebris(o.x, o.y - 180, P.x + 200, P.y + 30); }
      if (L.t % 90 === 0) bullets.push({ x: P.x + 260 + Math.random() * 200, y: camY - 40, vx: 0, vy: 2, grav: .35, life: 200, dmg: 10, big: true, knock: 5 });
      if (P.x > 5300) finishLevel();
    },
    drawFront(L) { const o = L.data.ock; drawOckRunner(o.x, o.y, 1, o.t, true); },
    onDeath(L) { P.hp = 30; P.inv = 120; P.x += 200; showHint('Из последних сил...', 200); return true; },
  },
};
let BOSS_CK = 1;
function drawBankFacade(x, G) {
  ctx.save();
  orrect(x, G - 330, 760, 330, 2, '#e8dcc0', 3); ctx.fillStyle = HT_SOFT; ctx.fillRect(x, G - 330, 760, 330);
  opoly([x - 20, G - 330, x + 380, G - 420, x + 780, G - 330], '#d8ccb0', 3);
  for (let i = 0; i < 6; i++) orrect(x + 40 + i * 130, G - 300, 40, 290, 2, '#f4ecd8', 2.4);
  orrect(x + 300, G - 190, 160, 190, 2, '#6a4a2a', 2.6);
  ctx.fillStyle = INK; ctx.font = `20px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText('БАНК', x + 380, G - 355); ctx.textAlign = 'left';
  ctx.restore();
}
function drawReactorFar(x, y) { glow(x, y, 160, [0, 'rgba(255,230,160,.85)', .4, 'rgba(255,140,40,.4)', 1, 'rgba(255,90,30,0)'], .06); ocirc(x, y, 50, '#ffe0a0', 3); }
function drawReactorBig(x, y, ch) {
  const r = 110 + Math.sin(frame * .2) * 4 * ch;
  glow(x, y, r * 2.4, [0, 'rgba(255,245,200,.95)', .35, `rgba(255,150,40,${(.3 + Math.round(ch * 4) / 10).toFixed(1)})`, 1, 'rgba(255,90,30,0)'], .04);
  ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#8a90a0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * .35, frame * .01, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) olin([x - 200 + i * 130, y + 330, x - 120 + i * 80, y + r * .8], 5, '#4a4e58', 3);
  if (ch > .6) { ctx.strokeStyle = frame % 4 < 2 ? '#fff6c0' : '#ffb03a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) ctx.lineTo(x + (Math.random() - .5) * 300, y + (Math.random() - .5) * 200); ctx.stroke(); }
}
function throwDebris(x, y, tx, ty) {
  const t = 55, vx = (tx - x) / t, vy = (ty - y) / t - .5 * .28 * t;
  bullets.push({ x, y, vx, vy, grav: .28, life: 220, dmg: 14, big: true, knock: 7, pull: true });
  SFX.metal();
}
function drawOckRunner(x, y, face, t, angry) {
  const lift = 70 + Math.sin(t * .15) * 8;
  const by = y - lift;
  const tips = [
    [x - 40 + Math.sin(t * .3) * 18, y], [x + 40 + Math.sin(t * .3 + Math.PI) * 18, y],
    [x + face * 70, by - 110 + Math.sin(t * .1) * 10], [x + face * 30, by - 140 + Math.cos(t * .12) * 12],
  ];
  ockRig(x, by, face, tips, POSES.fall(), { angry });
}
function ockRig(x, y, face, tips, pose, opt = {}) {
  const base = k => [x - face * 8 + (k - 1.5) * 4, y - 70];
  const drawT = k => { const b = base(k), tp = tips[k]; const cx = (b[0] + tp[0]) / 2 - face * 24, cy = Math.min(b[1], tp[1]) - 50; drawTentacle(b[0], b[1], tp[0], tp[1], cx, cy, opt.open ? opt.open[k] : .4, { glow: opt.glow && opt.glow[k] ? '#fff' : '#ff4a2a' }); };
  drawT(0); drawT(2);
  drawPerson(x, y, face, LOOKS.ock, pose, { alpha: opt.alpha });
  drawT(1); drawT(3);
}

// ============================================================ doctor octopus boss
function makeOck(L, x, opt) {
  const G = topAt(x, 0);
  const o = { x, y: G, face: -1, hp: opt.hp, max: opt.hp, phase: opt.phase || 1, mini: !!opt.mini, st: 'intro', t: 0, lift: 120, stun: 0, flash: 0, cd: 90,
    ten: [0, 1, 2, 3].map(i => ({ tx: x, ty: G, open: .3, pinned: 0, stuck: 0 })), k: 2, waves: [], charge: .5, timeT: 0, name: 'ДОКТОР ОСЬМИНОГ' };
  const baseOf = k => [o.x - o.face * 8 + (k - 1.5) * 4, o.y - o.lift - 70];
  const body = () => ({ x: o.x - 26, y: o.y - o.lift - 104, w: 52, h: 104 });
  const freeTen = () => o.ten.filter(t => !t.pinned).length;
  const guarded = () => (o.st === 'idle' || o.st === 'intro') && freeTen() >= 2 && o.stun <= 0;
  function take(n, why) {
    if (o.st === 'script' || o.dead) return;
    o.hp = Math.max(0, o.hp - n); o.flash = 10; shake = Math.max(shake, 6);
    pop(o.x, o.y - o.lift - 120, why || pick(['БАМ!', 'ХРЯСЬ!', 'ПАУ!']), GOLD, 28);
    burst(o.x, o.y - o.lift - 60, '#fff2a8', 10, 5);
    const r = o.hp / o.max;
    if (o.mini) { if (r <= .5 && !o.ended) { o.ended = true; o.st = 'script'; L.def.onDefeat ? L.def.onDefeat(L) : runStory('BANK_CAR'); } return; }
    if (o.phase === 1 && r <= .66) { o.phase = 2; BOSS_CK = 2; o.st = 'idle'; o.t = 0; o.cd = 60; runStory('OCK_P2'); spawnFoe(['drone', o.x - 200, o.y - 300, { pair: 9, pairId: 91 }], -1); spawnFoe(['drone', o.x + 200, o.y - 300, { pair: 9, pairId: 92 }], -1); }
    else if (o.phase === 2 && r <= .33) { o.phase = 3; BOSS_CK = 3; o.st = 'idle'; o.t = 0; runStory('OCK_P3'); }
    else if (o.phase === 3 && r <= .15) o.scriptDefeat();
  }
  o.scriptDefeat = () => { if (o.st === 'script') return; o.st = 'script'; P.st = 'free'; P.swing = null; L.lockInput = true; runStory('OCK_WIN'); };
  o.update = () => {
    const pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
    o.t++; if (o.flash > 0) o.flash--;
    for (const t of o.ten) { if (t.pinned > 0) { t.pinned--; if (t.pinned === 0) pop(t.tx, t.ty - 20, 'ОСВОБОДИЛ!', '#ff9a8a', 16); } if (t.stuck > 0) t.stuck--; }
    if (o.mini) { o.timeT++; if (o.timeT > 60 * 70 && !o.ended) { o.ended = true; o.st = 'script'; runStory('BANK_CAR'); } }
    o.charge = lerp(o.charge, o.phase === 3 ? 1 : o.phase === 2 ? .75 : .5, .01);
    const fast = o.phase === 3 ? .7 : o.phase === 2 ? .85 : 1;
    if (o.st !== 'grab' && o.st !== 'script') o.face = sgn(pcx - o.x);
    const G = topAt(o.x, o.y - 300);
    // waves
    for (const w of o.waves) { w.x += w.dir * 7; w.life--; if (Math.abs(w.x - pcx) < 18 && P.onGround && P.y + P.h > G - 10) heroHurt(12, w.x, 6); }
    o.waves = o.waves.filter(w => w.life > 0);
    const idleGoals = () => {
      const by = o.y - o.lift - 70;
      const gs = [[o.x - 46, o.y], [o.x + 46, o.y], [o.x + o.face * 50, by - 60 + Math.sin(o.t * .06) * 8], [o.x + o.face * 30, by - 100 + Math.cos(o.t * .07) * 8]];
      if (guarded()) { gs[2] = [o.x + o.face * 38, by + 10]; gs[3] = [o.x + o.face * 42, by - 30]; }
      return gs;
    };
    const moveTips = (goals, k = .2) => o.ten.forEach((t, i) => { if (t.pinned || t.stuck) return; t.tx = lerp(t.tx, goals[i][0], k); t.ty = lerp(t.ty, goals[i][1], k); });
    switch (o.st) {
      case 'intro': o.lift = lerp(o.lift, 40, .05); moveTips(idleGoals(), .1); if (o.t > 70) { o.st = 'idle'; o.t = 0; } break;
      case 'idle': {
        o.lift = lerp(o.lift, 40, .1);
        const dx = pcx - o.x;
        o.vx = Math.abs(dx) > 320 ? sgn(dx) * 2.4 : Math.abs(dx) < 150 ? -sgn(dx) * 2 : 0;
        o.x = clamp(o.x + o.vx, 120, L.w - 120);
        o.y = lerp(o.y, topAt(o.x, 0), .3);
        moveTips(idleGoals(), .15);
        if (--o.cd <= 0) pickAttack();
        break;
      }
      case 'stab': {
        const t = o.ten[o.k];
        if (o.t < 34 * fast) { const b = baseOf(o.k); t.tx = lerp(t.tx, b[0] - o.face * 30, .2); t.ty = lerp(t.ty, b[1] - 90, .2); t.open = .9; o.aim = [pcx, pcy + 10]; if (o.t > 34 * fast - 18) senseTrigger(6); }
        else if (o.t < 34 * fast + 9) { const k = (o.t - 34 * fast) / 9; const ex = o.aim[0] + sgn(o.aim[0] - o.x) * 40, ey = Math.min(o.aim[1] + 30, G); t.tx = lerp(t.tx, ex, .5); t.ty = lerp(t.ty, ey, .5); t.open = .2; if (!o.hitDone && dist(t.tx, t.ty, pcx, pcy) < 34) { o.hitDone = heroHurt(14, o.x, 8); } }
        else if (o.t === Math.ceil(34 * fast + 9)) { if (t.ty > G - 30) { t.stuck = 90; pop(t.tx, t.ty - 30, 'ЗАСТРЯЛА!', ORANGE, 18); shake = 6; SFX.metal(); if (!L.data.pinHint) { L.data.pinHint = 1; showHint('Клешня застряла! Попади в неё паутиной (K), чтобы пришпилить', 360); } } }
        else if (o.t > 34 * fast + 40) { o.st = 'idle'; o.cd = 50 * fast; o.hitDone = false; }
        moveTips(idleGoals(), .1);
        break;
      }
      case 'sweep': {
        const tele = 38 * fast;
        if (o.t < tele) { o.ten[0].tx = lerp(o.ten[0].tx, o.x - 30, .2); o.ten[1].tx = lerp(o.ten[1].tx, o.x + 30, .2); o.ten[0].ty = o.ten[1].ty = G; if (o.t > tele - 18) senseTrigger(6); }
        else if (o.t < tele + 22) {
          const k = (o.t - tele) / 22;
          o.ten[0].tx = o.x - 30 - k * 320; o.ten[1].tx = o.x + 30 + k * 320; o.ten[0].ty = o.ten[1].ty = G - 8;
          for (const t of [o.ten[0], o.ten[1]]) if (!o.hitDone && Math.abs(t.tx - pcx) < 26 && P.y + P.h > G - 40) o.hitDone = heroHurt(12, o.x, 7);
        } else if (o.t > tele + 50) { o.st = 'idle'; o.cd = 50 * fast; o.hitDone = false; }
        break;
      }
      case 'throw': {
        const t = o.ten[3];
        if (o.t < 30) { t.tx = lerp(t.tx, o.x + o.face * 70, .2); t.ty = lerp(t.ty, G, .2); }
        else if (o.t < 52) { t.tx = lerp(t.tx, o.x - o.face * 40, .15); t.ty = lerp(t.ty, o.y - o.lift - 220, .15); if (o.t > 40) senseTrigger(6); }
        else if (o.t === 52) throwDebris(t.tx, t.ty, pcx, pcy);
        else if (o.t > 80) { o.st = 'idle'; o.cd = 40 * fast; }
        moveTips(idleGoals().map((g, i) => i === 3 ? [t.tx, t.ty] : g), .1);
        break;
      }
      case 'grab': {
        const t = o.ten[2];
        if (o.t < 28 * fast) { t.tx = lerp(t.tx, o.x - o.face * 20, .2); t.ty = lerp(t.ty, o.y - o.lift - 180, .2); t.open = 1; o.aim = [pcx, pcy]; if (o.t > 28 * fast - 16) senseTrigger(6); }
        else if (o.t < 28 * fast + 14) { t.tx = lerp(t.tx, o.aim[0], .35); t.ty = lerp(t.ty, o.aim[1], .35); if (P.inv <= 0 && P.st !== 'dodge' && dist(t.tx, t.ty, pcx, pcy) < 36) { o.st = 'grabbed'; o.t = 0; o.mash = 0; P.st = 'grabbed'; P.swing = null; P.atk = null; showHint(COARSE ? 'Жми УДАР быстро, чтобы вырваться!' : 'Жми J быстро, чтобы вырваться!', 200); SFX.metal(); } }
        else if (o.t > 28 * fast + 40) { o.st = 'idle'; o.cd = 50 * fast; }
        break;
      }
      case 'grabbed': {
        const t = o.ten[2];
        t.tx = lerp(t.tx, o.x + o.face * 60, .1); t.ty = lerp(t.ty, o.y - o.lift - 200 + Math.sin(o.t * .3) * 8, .1); t.open = .1;
        P.x = t.tx - P.w / 2; P.y = t.ty - 20; P.vx = P.vy = 0;
        if (o.mash >= 11) { P.st = 'free'; P.vx = -o.face * 8; P.vy = -8; P.inv = 60; o.st = 'stunned'; o.stun = 110; o.t = 0; pop(pcx, P.y - 20, 'ВЫРВАЛСЯ!', '#b8ffd8', 26); SFX.good(); }
        else if (o.t > 150) { P.st = 'free'; P.inv = 0; P.vx = -o.face * -12; P.vy = -6; heroHurt(18, o.x, 12); o.st = 'idle'; o.cd = 60; }
        break;
      }
      case 'slam': {
        if (o.t < 34) { o.lift = lerp(o.lift, 170, .1); moveTips(idleGoals(), .15); if (o.t > 18) senseTrigger(6); }
        else if (o.t < 42) { o.lift = lerp(o.lift, 0, .5); }
        else if (o.t === 42) { shake = 16; SFX.slam(); ring(o.x, G, '#fff', 120); o.waves.push({ x: o.x, dir: -1, life: 110 }, { x: o.x, dir: 1, life: 110 }); }
        else if (o.t > 80) { o.st = 'idle'; o.cd = 60 * fast; }
        break;
      }
      case 'stunned': {
        o.lift = lerp(o.lift, 0, .1);
        o.ten.forEach((t, i) => { if (!t.pinned) { t.tx = lerp(t.tx, o.x + (i - 1.5) * 40, .1); t.ty = lerp(t.ty, G, .1); } });
        if (--o.stun <= 0) { o.st = 'idle'; o.cd = 30; o.ten.forEach(t => { t.pinned = 0; t.stuck = 0; }); }
        break;
      }
      case 'script': moveTips(idleGoals(), .1); o.lift = lerp(o.lift, 60, .05); break;
    }
    if (o.ten.filter(t => t.pinned).length >= 2 && o.st !== 'stunned' && o.st !== 'script' && o.st !== 'grabbed') { o.st = 'stunned'; o.stun = 160; o.t = 0; pop(o.x, o.y - o.lift - 140, 'ОБЕЗДВИЖЕН!', '#b8ffd8', 30); SFX.good(); }
    // bullets pulled back into the doctor
    for (const b of bullets) if (b.reflect && dist(b.x, b.y, o.x, o.y - o.lift - 60) < 60) { b.life = 0; take(7, 'ПОЛУЧАЙ!'); o.st = 'stunned'; o.stun = 80; o.t = 0; burst(b.x, b.y, '#c8b8a0', 16, 6); }
  };
  function pickAttack() {
    const pool = o.phase === 1 ? ['stab', 'stab', 'sweep', 'throw'] : o.phase === 2 ? ['stab', 'sweep', 'throw', 'grab', 'slam'] : ['stab', 'grab', 'slam', 'sweep', 'throw', 'stab'];
    let a = pick(pool); if (a === o.last) a = pick(pool);
    if (o.mini && a === 'grab') a = 'stab';
    o.last = a; o.st = a; o.t = 0; o.hitDone = false;
    if (a === 'stab') { const free = [2, 3, 1, 0].filter(i => !o.ten[i].pinned && !o.ten[i].stuck); o.k = free[0] != null ? free[0] : 2; }
  }
  o.heroHit = (box, a) => {
    if (o.st === 'script' || a.hit.has(o)) return;
    if (!overlap(box, body())) return;
    a.hit.add(o);
    if (P.st === 'grabbed') return;
    if (guarded() && a.k !== 'dive' && a.k !== 'swingkick') { pop(o.x, o.y - o.lift - 120, 'ЩУПАЛЬЦА!', '#cfe8ff', 20); SFX.block(); spark(o.x + o.face * 30, P.y + 30); P.vx = -P.face * 5; hitstop = 3; return; }
    hitstop = 4; SFX.hit(); focusAdd(5);
    take(o.st === 'stunned' ? a.dmg * 2 + 1 : a.dmg + (a.k === 'swingkick' ? 1 : 0));
  };
  o.webHit = w => {
    for (const t of o.ten) if (t.stuck > 0 && !t.pinned && dist(w.x, w.y, t.tx, t.ty) < 36) { t.pinned = 260; t.stuck = 0; pop(t.tx, t.ty - 30, 'ПРИШПИЛЕНО!', '#fff', 22); SFX.web(); focusAdd(8); return true; }
    if (overlap({ x: w.x - 8, y: w.y - 8, w: 16, h: 16 }, body())) { pop(o.x, o.y - o.lift - 110, 'ЛИПКО', '#fff', 16); return true; }
    return false;
  };
  o.pullTarget = (cx, cy, face) => {
    let best = null;
    for (const b of bullets) if (b.pull && !b.reflect && (b.x - cx) * face > -40) { const d = dist(cx, cy, b.x, b.y); if (d < 380 && (!best || d < best.d)) best = { x: b.x, y: b.y, d, fn: () => { b.reflect = true; b.pull = false; const a = Math.atan2(o.y - o.lift - 60 - b.y, o.x - b.x); b.vx = Math.cos(a) * 14; b.vy = Math.sin(a) * 14; b.grav = 0; b.dmg = 0; b.life = 120; pop(b.x, b.y - 20, 'ОБРАТНО!', '#fff', 22); focusAdd(6); } }; }
    return best;
  };
  o.aoeHit = (cx, cy, r, dmg) => { if (Math.abs(o.x - cx) < r + 30 && o.st !== 'script') take(dmg + (o.st === 'stunned' ? 2 : 0), 'УДАР СВЕРХУ!'); };
  o.superHit = (cx, cy) => { if (dist(cx, cy, o.x, o.y - 60) < 360 && o.st !== 'script') { take(10, 'ШТОРМ!'); o.st = 'stunned'; o.stun = 120; o.t = 0; o.ten.forEach(t => t.pinned = 120); } };
  o.grabTick = () => { if (pressed.punch || pressed.ok || pressed.jump) { o.mash++; burst(P.x + 12, P.y + 20, '#fff', 3, 2); } };
  o.draw = () => {
    const G = topAt(o.x, 0);
    for (const w of o.waves) { ofill(() => { ctx.moveTo(w.x - 16, G); ctx.quadraticCurveTo(w.x, G - 34, w.x + 16, G); ctx.closePath(); }, 'rgba(232,200,150,.9)', 2); }
    if (o.st === 'sweep' && o.t < 38) { ctx.fillStyle = `rgba(255,60,40,${.2 + (o.t % 10 < 5 ? .2 : 0)})`; ctx.fillRect(o.x - 350, G - 6, 700, 6); }
    if (o.st === 'slam' && o.t < 42) { ctx.fillStyle = 'rgba(255,60,40,.3)'; ctx.beginPath(); ctx.ellipse(o.x, G - 2, 90, 10, 0, 0, TAU); ctx.fill(); }
    const tips = o.ten.map(t => [t.tx, t.ty]);
    const pose = o.st === 'stunned' ? POSES.kneel() : o.st === 'script' ? POSES.idle(frame) : o.st === 'idle' ? (Math.abs(o.vx || 0) > .3 ? POSES.walk(o.t * .15) : POSES.idle(frame)) : POSES.super();
    const glow = o.ten.map((t, i) => (o.st === 'stab' && i === o.k && o.t < 34) || (o.st === 'grab' && i === 2 && o.t < 28));
    ctx.save();
    if (o.flash > 0 && frame % 4 < 2) ctx.globalAlpha = .7;
    ockRig(o.x, o.y - o.lift, o.face, tips, pose, { open: o.ten.map(t => t.open), glow });
    ctx.restore();
    for (const t of o.ten) {
      if (t.pinned) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.moveTo(t.tx, t.ty); ctx.lineTo(t.tx + Math.cos(a) * 22, t.ty + Math.sin(a) * 14); } ctx.stroke(); ocirc(t.tx, t.ty, 8, 'rgba(255,255,255,.8)', 1.4); }
      else if (t.stuck) { if (frame % 8 < 4) drawStar(t.tx, t.ty - 26, 7, ORANGE); }
    }
    if (o.st === 'stunned') for (let i = 0; i < 3; i++) { const a = frame * .12 + i * 2.1; drawStar(o.x + Math.cos(a) * 24, o.y - o.lift - 118 + Math.sin(a) * 6, 6, GOLD); }
    if (o.st === 'grabbed') { ctx.fillStyle = INK; ctx.fillRect(P.x - 20, P.y - 30, 70, 9); ctx.fillStyle = '#b8ffd8'; ctx.fillRect(P.x - 19, P.y - 29, 68 * Math.min(1, o.mash / 11), 7); }
  };
  return o;
}

// ============================================================ black cat ally (oscorp)
function catAllyTick(L) {
  if (L.sec < 1 && !L.data.cat) return;
  if (!L.data.cat) { L.data.cat = { x: P.x - 80, y: P.y + P.h, face: 1, mode: 'idle', p: 0, cd: 120, t: 0 }; }
  const c = L.data.cat; c.t++;
  switch (c.mode) {
    case 'idle': {
      const want = P.x - P.face * 70;
      if (Math.abs(want - c.x) > 40) { c.x += sgn(want - c.x) * 3.4; c.face = sgn(want - c.x); c.run = true; } else c.run = false;
      c.y = lerp(c.y, topAt(c.x, P.y - 40), .3);
      let target = null, bd = 380;
      for (const e of L.enemies) if (enemyActive(e) && e.type !== 'guard' && Math.abs(e.x - c.x) < bd && e.sec === L.sec) { bd = Math.abs(e.x - c.x); target = e; }
      if (--c.cd <= 0 && target) { c.mode = 'leap'; c.p = 0; c.sx = c.x; c.sy = c.y; c.tg = target; c.face = sgn(target.x - c.x); }
      break;
    }
    case 'leap': {
      c.p += 1 / 26; const e = c.tg;
      c.x = lerp(c.sx, e.x + e.w / 2 - c.face * 18, c.p); c.y = lerp(c.sy, e.y + e.h, c.p) - Math.sin(Math.PI * c.p) * 80;
      if (c.p >= 1) {
        if (enemyActive(e)) { const sh = e.shield; e.shield = false; damageEnemy(e, { dmg: 1, kb: 4, brk: true, dir: c.face, k: 'cat' }); if (sh) pop(e.x + e.w / 2, e.y - 20, 'ЩИТ ВЫБИТ!', '#cfe8ff', 18); pop(e.x + e.w / 2, e.y - 34, 'МЯУ!', ROSE, 22); SFX.meow(); }
        c.mode = 'back'; c.p = 0; c.sx = c.x; c.sy = c.y; c.tx = c.x - c.face * 120;
      }
      break;
    }
    case 'back':
      c.p += 1 / 24; c.x = lerp(c.sx, c.tx, c.p); c.y = lerp(c.sy, topAt(c.tx, c.sy - 60), c.p) - Math.sin(Math.PI * c.p) * 60;
      if (c.p >= 1) { c.mode = 'idle'; c.cd = 170 + Math.random() * 90; }
      break;
  }
}
function drawCatAlly(c) {
  const pose = c.mode === 'leap' ? Object.assign(POSES.jump(), { hF: [26, -60] }) : c.mode === 'back' ? Object.assign(POSES.roll(), { rot: c.p * TAU }) : c.run ? POSES.run(c.t * .3) : POSES.idle(frame);
  drawCat(c.x, c.y, c.face, pose, { claws: c.mode === 'leap' });
}

// ============================================================ civil scenes
let SCN = null;
function startCivil(id) {
  mode = 'civil'; hint = null;
  SCN = SCENES(id); SCN.id = id;
  L = { id: 'civil', w: SCN.x1, h: 600, solids: [{ x: SCN.x0 - 400, y: FLOOR, w: SCN.x1 - SCN.x0 + 800, h: 200, kind: 'street' }], enemies: [], civs: [], events: [], pickups: [], tokens: [], rings: [], sections: [], barriers: [], data: {}, def: {}, theme: 'day' };
  parts = []; pops = [];
  P = newPlayer(SCN.start, FLOOR - 74);
  P.skin = SCN.player || 'peter';
  SCN.vw = W / SCN.zoom;
  camX = clamp(P.x - SCN.vw * .4, SCN.x0, Math.max(SCN.x0, SCN.x1 - SCN.vw));
  state = 'play';
  if (SCN.intro) runStory(SCN.intro, () => { if (SCN.auto) SCN.auto(); else { const f = SCN.items.find(i => i.req); if (f) showHint(COARSE ? 'Подойди и нажми УДАР, чтобы поговорить' : 'Подойди и нажми E или J, чтобы поговорить', 300); } });
}
function civilNear() {
  const cx = P.x + P.w / 2;
  let best = null, bd = 64;
  for (const it of SCN.items) { if (!it.label || (it.hidden && it.hidden())) continue; const d = Math.abs(it.x - cx); if (d < bd) { bd = d; best = it; } }
  return best;
}
function civilObjective() {
  const ok = i => !i.need || i.need.every(n => SCN.items.find(j => j.id === n).done);
  const need = SCN.items.find(i => i.req && !i.done && ok(i));
  if (need) return need.label;
  if (SCN.exit && !SCN.items.some(i => i.req && !i.done)) return SCN.exit.label + (SCN.exit.x < P.x ? ' ←' : ' →');
  return '';
}
function updateCivil() {
  const p = P;
  if (p.skin === 'none') return;
  const inX = inputX();
  if (inX) p.face = inX;
  const spd = p.skin === 'peter' ? 3 : 3.8;
  p.vx += clamp(inX * spd - p.vx, -.6, .6);
  if ((pressed.jump || pressed.up) && p.onGround) { p.vy = -9; SFX.jump(); }
  p.vy += .55; if (p.vy > 14) p.vy = 14;
  moveBody(p);
  p.x = clamp(p.x, SCN.x0 + 10, SCN.x1 - 34);
  p.anim += p.onGround ? Math.abs(p.vx) * .09 : .1;
  const it = civilNear();
  if (it && (pressed.punch || pressed.ok || pressed.act)) {
    if (it.need && !it.need.every(n => SCN.items.find(j => j.id === n).done)) showHint('Сначала: ' + SCN.items.find(j => j.id === it.need[0]).label, 200);
    else if (it.wardrobe) openWardrobe();
    else {
      const first = !it.done;
      const key = first || !it.again ? it.talk : it.again;
      p.vx = 0;
      if (it.who) it.face = sgn(p.x + 12 - it.x) || it.face;
      runStory(key, () => { it.done = true; if (first && it.onDone) it.onDone(); });
    }
  }
  if (SCN.exit) {
    const cx = p.x + p.w / 2;
    if (Math.abs(cx - SCN.exit.x) < 22) {
      const miss = SCN.items.find(i => i.req && !i.done);
      if (!miss) { const go = SCN.exit.go; SCN.exit = null; p.vx = 0; go(); }
      else if (!SCN.warned) { SCN.warned = true; showHint('Сначала: ' + miss.label, 220); }
    } else SCN.warned = false;
  }
  if (SCN.x1 - SCN.x0 <= SCN.vw) camX = (SCN.x0 + SCN.x1) / 2 - SCN.vw / 2;
  else camX = lerp(camX, clamp(p.x + 12 - SCN.vw * .45, SCN.x0, SCN.x1 - SCN.vw), .1);
  updateFx();
}
function renderCivil() {
  const z = SCN.zoom;
  ctx.fillStyle = '#0e0b14'; ctx.fillRect(0, 0, W, H);
  if (SCN.theme === 'terrace') drawSky('night', camX * z, 0, 0);
  ctx.save();
  SCN.fy = lerp(SCN.fy || 505, state === 'dialog' || state === 'mini' ? 372 : 505, .12);
  // whole-pixel offsets keep pattern fills and sprites on the fast unfiltered path
  ctx.translate(Math.round(-camX * z), Math.round(SCN.fy - FLOOR * z)); ctx.scale(z, z);
  useHalftoneZoom(z);
  paintCivil(SCN);
  const near = P.skin !== 'none' && state === 'play' ? civilNear() : null;
  for (const it of SCN.items) {
    if (it.hidden && it.hidden()) continue;
    if (it.who) {
      const pose = it.pose ? POSES[it.pose](frame) : (state === 'dialog' ? POSES.talk(frame + it.x) : POSES.idle(frame + it.x));
      if (it.who === 'cat') drawCat(it.x, FLOOR, it.face, pose, { unmasked: it.unmasked });
      else drawPerson(it.x, FLOOR, it.face, LOOKS[it.who], pose);
    }
    if (it.label && P.skin !== 'none') {
      const by = (it.iy || FLOOR - 104) + Math.sin(frame * .08 + it.x) * 2;
      if (!it.done) { ocirc(it.x, by, 8, it.req ? GOLD : '#fff', 1.8); ctx.fillStyle = INK; ctx.font = `bold 11px ${F_UI}`; ctx.textAlign = 'center'; ctx.fillText(it.wardrobe ? '★' : it.req ? '!' : '…', it.x, by + 4); ctx.textAlign = 'left'; }
      if (near === it) promptAt(it.x, by - 20, it.label.toUpperCase());
    }
  }
  if (SCN.exit && !SCN.items.some(i => i.req && !i.done)) {
    const x = SCN.exit.x, y = 250 + Math.sin(frame * .1) * 4;
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y - 8); ctx.lineTo(x, y + 4); ctx.fill();
    ctx.font = `9px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(SCN.exit.label.toUpperCase(), x, y - 14); ctx.textAlign = 'left';
  }
  if (P.skin === 'peter') drawPerson(P.x + 12, P.y + P.h, P.face, LOOKS.peter, Math.abs(P.vx) > .3 ? POSES.walk(P.anim) : POSES.idle(frame));
  else if (P.skin === 'hero') drawHero(P.x + 12, P.y + P.h, P.face, Math.abs(P.vx) > .3 ? POSES.run(P.anim) : POSES.idle(frame), SAVE.suit);
  if (SCN.extra) SCN.extra();
  for (const q of pops) drawPop(q);
  useHalftoneZoom(1);
  ctx.restore();
}

// ============================================================ minigames
let MINI = null;
function startTiming(o, cb) {
  MINI = Object.assign({ type: 'timing', tries: 5, hits: 0, n: 0, width: .34, speed: .05, phase: Math.random() * 6, ang: 0, zone: 0, res: null, resT: 0, cb, theme: 'needle' }, o);
  MINI.zone = (Math.random() * 2 - 1) * .9;
  state = 'mini';
}
function startRhythm(o, cb) {
  const dirs = ['left', 'right', 'up', 'down'];
  const notes = [];
  for (let i = 0; i < (o.count || 16); i++) notes.push({ t: 90 + i * (o.gap || 42), d: pick(dirs), res: null });
  MINI = Object.assign({ type: 'rhythm', t: 0, notes, hits: 0, cb, speed: 3.6 }, o);
  state = 'mini';
}
function startMash(title, hintText, cb) { MINI = { type: 'mash', title, hint: hintText, v: 18, t: 360, cb }; state = 'mini'; }
function updateMini() {
  const m = MINI;
  if (m.type === 'timing') {
    if (m.resT > 0) { m.resT--; if (m.resT === 0) { if (m.n >= m.tries) { const cb = m.cb, h = m.hits; MINI = null; state = 'play'; cb(h); return; } m.zone = (Math.random() * 2 - 1) * .9; } return; }
    m.phase += m.speed;
    let a = Math.sin(m.phase) * 1.25;
    if (m.jerk && (m.n === 2 || m.n === 3)) { a += Math.sin(m.phase * 7) * .25; }
    m.ang = a;
    if (pressed.punch || pressed.ok || pressed.jump || pressed.act) {
      const ok = Math.abs(m.ang - m.zone) < m.width / 2;
      m.n++; if (ok) m.hits++;
      m.res = ok; m.resT = 36; ok ? SFX.good() : SFX.bad();
    }
  } else if (m.type === 'rhythm') {
    m.t++;
    const map = { left: 'left', right: 'right', up: 'up', down: 'down' };
    for (const k in map) if (pressed[k]) {
      let best = null, bd = 16;
      for (const n of m.notes) if (!n.res && Math.abs(n.t - m.t) < bd) { bd = Math.abs(n.t - m.t); best = n; }
      if (best && best.d === k) { best.res = 'hit'; m.hits++; SFX.good(); } else if (best) { best.res = 'miss'; SFX.bad(); } else SFX.bad();
    }
    for (const n of m.notes) if (!n.res && m.t - n.t > 16) n.res = 'miss';
    if (m.notes.every(n => n.res) && m.t > m.notes[m.notes.length - 1].t + 40) { const cb = m.cb, s = m.hits / m.notes.length; MINI = null; state = 'play'; cb(s); }
  } else if (m.type === 'mash') {
    m.t--; m.v = Math.max(0, m.v - .55);
    if (pressed.punch || pressed.ok || pressed.jump || pressed.act) { m.v += 8.5; burst(W / 2 + (Math.random() - .5) * 60, 330, '#fff', 2, 3); SFX.punch(); }
    if (m.v >= 100) { const cb = m.cb; MINI = null; state = 'play'; SFX.good(); cb(true); }
    else if (m.t <= 0) { const cb = m.cb; MINI = null; state = 'play'; SFX.bad(); cb(false); }
  }
}

// ============================================================ wardrobe
let WARD = null;
function openWardrobe() { WARD = { sel: Math.max(0, SUIT_ORDER.indexOf(SAVE.suit)) }; state = 'wardrobe'; SFX.open(); }
function wardRects() { return SUIT_ORDER.map((id, i) => ({ id, x: 44 + (i % 7) * 126, y: 120 + Math.floor(i / 7) * 190, w: 116, h: 176 })); }
function updateWardrobe() {
  const n = SUIT_ORDER.length;
  if (pressed.left) { WARD.sel = (WARD.sel + n - 1) % n; SFX.sel(); }
  if (pressed.right) { WARD.sel = (WARD.sel + 1) % n; SFX.sel(); }
  if (pressed.up || pressed.down) { WARD.sel = (WARD.sel + 7) % n; SFX.sel(); }
  let choose = pressed.ok || pressed.punch || pressed.act;
  if (tap) {
    if (tap.y > 500 && tap.x > W - 220) { closeWardrobe(); return; }
    const r = wardRects().findIndex(r => tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h);
    if (r >= 0) { if (r === WARD.sel) choose = true; else { WARD.sel = r; SFX.sel(); choose = false; } } else choose = false;
  }
  if (choose) {
    const id = SUIT_ORDER[WARD.sel];
    if (SAVE.suits.includes(id)) { SAVE.suit = id; writeSave(); SFX.token(); }
    else SFX.bad();
  }
  if (pressed.pause || pressed.web || pressed.jump) closeWardrobe();
}
function closeWardrobe() { WARD = null; state = 'play'; }
