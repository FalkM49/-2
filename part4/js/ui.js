'use strict';
// ============================================================ HUD + screens
const LEVEL_NAME = {
  pier_rescue: 'ПИРС №9 · СПАСИ ЛЮДЕЙ', tutorial: 'ВЕРХНИЙ ИСТ-САЙД', queens: 'КВИНС · ПАТРУЛЬ', swing_bank: 'ПОЛЁТ К БАНКУ',
  bank_fight: 'ПЯТАЯ АВЕНЮ', ock_bank: 'БАНК · ОСЬМИНОГ', swing_oscorp: 'ПОЛЁТ К «ОСКОРПУ»', oscorp_in: 'БАШНЯ «ОСКОРП»',
  chase_bridge: 'БРУКЛИНСКИЙ МОСТ · ПОГОНЯ', pier_final: 'ПИРС №9 · НАЁМНИКИ', ock_final: 'ПИРС №9 · ФИНАЛ', escape: 'БЕГИ, ПИТЕР!',
};
function panelText(x, y, text, size, col, align = 'left', font = F_DISP) {
  ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y); ctx.textAlign = 'left';
}
function bar(x, y, w, h, k, col, back = '#2a2236') {
  orrect(x, y, w, h, 3, back, 2.4);
  if (k > 0) { ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, (w - 4) * clamp(k, 0, 1), h - 4); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 2, y + 2, (w - 4) * clamp(k, 0, 1), (h - 4) * .4); }
}
function drawHud() {
  if (mode === 'level' && L && P) {
    // portrait + hp + focus
    orrect(12, 10, 244, 58, 8, 'rgba(12,8,24,.82)', 2.4);
    portraitOf('spidey', 40, 38, 1.5);
    bar(66, 18, 180, 16, P.hp / P.max, P.hp > 35 ? '#6ad86a' : '#ff4d5e');
    bar(66, 40, 180, 12, P.focus / 100, P.focus >= 100 ? (frame % 20 < 10 ? GOLD : ORANGE) : '#6ab0ff');
    ctx.fillStyle = '#fff'; ctx.font = `9px ${F_DISP}`; ctx.fillText(P.focus >= 100 ? (COARSE ? 'СУПЕР ГОТОВ!' : 'СУПЕР ГОТОВ! (I)') : 'ФОКУС', 70, 64);
    // level name
    panelText(W / 2, 26, LEVEL_NAME[L.id] || '', 13, '#fff', 'center');
    if (L.sections.length > 1) { const n = L.sections.length; for (let i = 0; i < n; i++) ocirc(W / 2 - (n - 1) * 10 + i * 20, 42, 6, L.sections[i].cleared ? GOLD : i === L.sec ? '#fff' : '#4a4060', 1.6); }
    if (L.data.obj) panelText(W / 2, 64, L.data.obj, 11, GOLD, 'center');
    if (L.timer > 0) { const s = Math.ceil(L.timer / 60); panelText(W - 20, 40, s + 'с', 26, s <= 10 && frame % 30 < 15 ? '#ff4d5e' : '#fff', 'right'); }
    // love / trust
    orrect(W - 214, 58, 200, 28, 8, 'rgba(12,8,24,.82)', 2);
    drawHeartShape(W - 32, 72, 10); panelText(W - 46, 78, String(SAVE.love), 13, '#fff', 'right');
    panelText(W - 84, 78, 'ДОВ ' + SAVE.trust, 12, TEAL, 'right'); drawToken(W - 190, 72); panelText(W - 176, 78, String(SAVE.tokens), 13, GOLD);
    // boss bar
    const B = L.boss;
    if (B && !B.dead) {
      const bw = 520, bx = W / 2 - bw / 2, by = H - 40;
      panelText(W / 2, by - 8, B.name + (B.mini ? '' : ' · ФАЗА ' + B.phase), 13, '#ffb03a', 'center');
      bar(bx, by, bw, 18, B.hp / B.max, B.flash > 0 ? '#fff' : '#ff6a2a');
      if (!B.mini) for (const k of [.66, .33]) { ctx.fillStyle = INK; ctx.fillRect(bx + bw * k - 1, by, 3, 18); }
    }
    // edge arrows to idle events
    for (const ev of L.events) {
      if (ev.st === 'done' || ev.hidden) continue;
      const sx = ev.x - camX;
      if (sx > 0 && sx < W) continue;
      const left = sx < 0, ax = left ? 22 : W - 22, ay = clamp(ev.y - 60 - camY, 110, H - 80);
      ctx.fillStyle = ev.req ? GOLD : '#b8ffd8';
      ctx.beginPath(); if (left) { ctx.moveTo(ax - 10, ay); ctx.lineTo(ax + 6, ay - 10); ctx.lineTo(ax + 6, ay + 10); } else { ctx.moveTo(ax + 10, ay); ctx.lineTo(ax - 6, ay - 10); ctx.lineTo(ax - 6, ay + 10); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `8px ${F_DISP}`; ctx.textAlign = left ? 'left' : 'right'; ctx.fillStyle = '#fff'; ctx.fillText(Math.round(Math.abs(ev.x - P.x) / 10) + 'м', left ? 12 : W - 12, ay + 22); ctx.textAlign = 'left';
    }
    if (L.alarm && L.id === 'oscorp_in' && frame % 40 < 20) panelText(W / 2, 90, 'ТРЕВОГА!', 18, '#ff4d5e', 'center');
  } else if (mode === 'civil' && SCN) {
    const obj = civilObjective();
    if (obj && state === 'play') { ctx.font = `12px ${F_UI}`; const t = '▸ ' + obj; const tw = ctx.measureText(t).width; orrect(14, 12, tw + 24, 26, 6, 'rgba(12,8,24,.82)', 2); ctx.fillStyle = GOLD; ctx.fillText(t, 26, 30); }
    drawHeartShape(W - 30, 26, 11); panelText(W - 46, 32, String(SAVE.love), 14, '#fff', 'right');
  }
  // hint
  if (hint && hint.t > 0 && state === 'play') {
    hint.t--;
    ctx.font = `14px ${F_UI}`;
    const lines = wrap(hint.text, 620);
    const hh = lines.length * 20 + 14, hy = mode === 'level' && L && L.boss ? H - 110 - hh : H - 24 - hh;
    ctx.globalAlpha = Math.min(1, hint.t / 20);
    orrect(W / 2 - 330, hy, 660, hh, 8, 'rgba(12,8,24,.86)', 2.4);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; lines.forEach((l, i) => ctx.fillText(l, W / 2, hy + 24 + i * 20)); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  // toasts
  for (let i = TOASTS.length - 1; i >= 0; i--) { const t = TOASTS[i]; t.t--; if (t.t <= 0) TOASTS.splice(i, 1); }
  TOASTS.forEach((t, i) => { ctx.globalAlpha = Math.min(1, t.t / 20); panelText(W / 2, 130 + i * 30 - Math.max(0, t.t - 100) * 2, t.text, 18, t.color, 'center'); ctx.globalAlpha = 1; });
}
function wrap(text, maxW) {
  const words = text.split(' '), out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}

// ============================================================ dialog box + comic panel
function drawCutPanel() {
  const id = dialog.cut, f = PANELS[id];
  if (!f) return;
  const x = 24, y = 14, k = Math.min(1, dialog.cutT / 12);
  ctx.fillStyle = 'rgba(8,6,16,.6)'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(x + PW / 2, y + PH / 2); ctx.rotate((1 - k) * -.05); ctx.scale(.9 + k * .1, .9 + k * .1); ctx.translate(-PW / 2, -PH / 2);
  ctx.globalAlpha = k;
  ctx.fillStyle = '#fff'; ctx.fillRect(-8, -8, PW + 16, PH + 16);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PW, PH); ctx.clip();
  try { f(dialog.cutT); } catch (e) { console.error('panel', id, e); }
  ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeRect(0, 0, PW, PH);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawDialog() {
  if (!dialog) return;
  const ln = dialog.lines[dialog.i];
  if (dialog.cut) drawCutPanel();
  if (!ln) return;
  const who = WHO[ln.s] || WHO.narr;
  const narr = ln.s === 'narr';
  const bx = 16, bw = W - 32, bh = ln.choice ? 172 : 128, by = H - bh - 10;
  if (narr && !ln.choice) {
    // caption box — yellow comic narration
    ofill(() => { ctx.rect(bx + 30, by + 14, bw - 60, bh - 24); }, '#ffe98a', 3);
    ctx.fillStyle = HT_LIGHT; ctx.fillRect(bx + 30, by + 14, bw - 60, bh - 24);
    ctx.fillStyle = INK; ctx.font = `19px ${F_TALK}`;
    const shown = ln.t.slice(0, Math.floor(dialog.ch));
    wrap(shown, bw - 110).forEach((l, i) => ctx.fillText(l, bx + 54, by + 46 + i * 24));
  } else {
    orrect(bx, by, bw, bh, 14, '#fbf8ef', 3.4);
    ctx.fillStyle = HT_LIGHT; ctx.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
    // portrait
    orrect(bx + 12, by + 14, 96, 96, 10, who.bg || '#444', 3);
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 14, by + 16, 92, 92); ctx.clip();
    portraitOf(who.face || ln.s, bx + 60, by + 66, 3.2);
    ctx.restore();
    // name tag
    ctx.font = `12px ${F_DISP}`; const nw = ctx.measureText(who.n).width;
    orrect(bx + 120, by - 12, nw + 20, 24, 6, who.accent || who.bg || INK, 2.4);
    ctx.fillStyle = '#fff'; ctx.fillText(who.n, bx + 130, by + 5);
    if (ln.choice) {
      const rs = choiceRects();
      ln.choice.forEach((o, i) => {
        const r = rs[i], on = i === dialog.sel;
        orrect(r.x, r.y, r.w, r.h, 6, on ? '#ffe98a' : '#ece6d8', on ? 2.6 : 1.6);
        ctx.fillStyle = INK; ctx.font = `17px ${F_TALK}`;
        ctx.fillText((i + 1) + '. ' + o.t, r.x + 12, r.y + 21);
        if (o.love) { ctx.fillStyle = ROSE; ctx.font = `12px ${F_DISP}`; ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(o.love), r.x + r.w - 10, r.y + 20); ctx.textAlign = 'left'; }
      });
      ctx.fillStyle = '#7a6a5a'; ctx.font = `11px ${F_UI}`; ctx.fillText(COARSE ? 'коснись варианта' : '↑↓ и Enter · или 1–3', bx + 120, by + 30);
    } else {
      ctx.fillStyle = INK; ctx.font = `20px ${F_TALK}`;
      const shown = ln.t.slice(0, Math.floor(dialog.ch));
      wrap(shown, bw - 160).forEach((l, i) => ctx.fillText(l, bx + 126, by + 42 + i * 25));
    }
  }
  if (!ln.choice && dialog.ch >= ln.t.length && frame % 40 < 26) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(W - 50, H - 30); ctx.lineTo(W - 36, H - 30); ctx.lineTo(W - 43, H - 22); ctx.fill(); }
}

// ============================================================ minigames
function drawMini() {
  const m = MINI;
  ctx.fillStyle = 'rgba(8,6,16,.72)'; ctx.fillRect(0, 0, W, H);
  orrect(W / 2 - 330, 40, 660, 460, 16, '#fbf8ef', 4);
  ctx.fillStyle = HT_LIGHT; ctx.fillRect(W / 2 - 326, 44, 652, 452);
  panelText(W / 2, 92, m.title, 22, ORANGE, 'center');
  ctx.fillStyle = INK; ctx.font = `14px ${F_UI}`; ctx.textAlign = 'center'; ctx.fillText(m.hint || '', W / 2, 120); ctx.textAlign = 'left';
  if (m.type === 'timing') {
    const cx = W / 2, cy = 390, R = 190;
    const toA = a => -Math.PI / 2 + a;
    ctx.lineWidth = 34; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, R, toA(-1.3), toA(1.3)); ctx.stroke();
    ctx.lineWidth = 28; ctx.strokeStyle = m.theme === 'hack' ? '#1a2a22' : m.theme === 'lock' ? '#5a5048' : '#e8dcc8'; ctx.beginPath(); ctx.arc(cx, cy, R, toA(-1.3), toA(1.3)); ctx.stroke();
    ctx.strokeStyle = m.theme === 'hack' ? '#3aff9a' : '#4ad86a'; ctx.beginPath(); ctx.arc(cx, cy, R, toA(m.zone - m.width / 2), toA(m.zone + m.width / 2)); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 28; ctx.beginPath(); ctx.arc(cx, cy, R, toA(m.zone - m.width / 6), toA(m.zone + m.width / 6)); ctx.stroke();
    // needle / tool
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(m.ang);
    if (m.theme === 'needle') { olin([0, 0, 0, -R - 10], 4, '#d8d8e0', 2.4); ocirc(0, -R + 20, 4, '#fff', 1.5); }
    else if (m.theme === 'lock') { olin([0, 0, 0, -R + 4], 6, '#c0b8a8', 2.4); opoly([-6, -R + 4, 6, -R + 4, 0, -R - 16], '#c0b8a8', 2); }
    else if (m.theme === 'catch') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R - 14); ctx.stroke(); ocirc(0, -R - 14, 7, '#fff', 2); }
    else { olin([0, 0, 0, -R - 10], 5, '#3aff9a', 2.4); }
    ctx.restore();
    ocirc(cx, cy, 18, INK, 2);
    if (m.theme === 'catch') drawCar(cx, cy - 20, '#c83a3a', 1, Math.sin(m.phase) * .2);
    if (m.theme === 'needle') { ctx.save(); ctx.translate(cx, cy - 40); ctx.scale(1.2, 1.2); streetHead(0, 0); ctx.restore(); }
    if (m.theme === 'hack') { ctx.fillStyle = '#3aff9a'; ctx.font = `12px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText('0x' + ((frame * 7919) % 65535).toString(16).toUpperCase(), cx, cy - 40); ctx.textAlign = 'left'; }
    for (let i = 0; i < m.tries; i++) ocirc(W / 2 - (m.tries - 1) * 16 + i * 32, 160, 10, i < m.n ? (i < m.hits ? '#4ad86a' : '#ff4d5e') : '#ddd', 2);
    if (m.resT > 0) panelText(cx, 250, m.res ? 'ЕСТЬ!' : 'МИМО!', 36, m.res ? '#4ad86a' : '#ff4d5e', 'center');
    ctx.fillStyle = '#7a6a5a'; ctx.font = `12px ${F_UI}`; ctx.textAlign = 'center'; ctx.fillText(COARSE ? 'Касание — жми!' : 'Пробел / J / Enter', W / 2, 486); ctx.textAlign = 'left';
  } else if (m.type === 'rhythm') {
    const lanes = ['left', 'up', 'down', 'right'], sym = { left: '←', up: '↑', down: '↓', right: '→' };
    const hitY = 420, x0 = W / 2 - 150;
    lanes.forEach((d, i) => { ocirc(x0 + i * 100, hitY, 30, keys[d] ? GOLD : '#e8dcc8', 3); panelText(x0 + i * 100, hitY + 10, sym[d], 26, '#fff', 'center'); });
    for (const n of m.notes) {
      const i = lanes.indexOf(n.d), y = hitY - (n.t - m.t) * m.speed;
      if (y < 140 || y > 470) continue;
      if (n.res === 'hit') continue;
      ocirc(x0 + i * 100, y, 24, n.res === 'miss' ? '#aaa' : ROSE, 2.6); panelText(x0 + i * 100, y + 8, sym[n.d], 20, '#fff', 'center');
    }
    const Fx = W / 2 + 250, s = Math.sin(m.t * .08) * 6;
    drawPerson(Fx - 10 + s, 330, 1, Object.assign({}, LOOKS.peter, { jacket: '#2e3448', tie: '#6a4a2a' }), POSES.hug(), { s: .9 });
    drawPerson(Fx + 20 + s, 330, -1, LOOKS.felicia, POSES.hug(), { s: .9 });
    panelText(W / 2 - 260, 200, m.hits + ' / ' + m.notes.length, 20, ROSE, 'center');
    ctx.fillStyle = '#7a6a5a'; ctx.font = `12px ${F_UI}`; ctx.textAlign = 'center'; ctx.fillText('Стрелки в такт, когда кружок на кольце', W / 2, 486); ctx.textAlign = 'left';
  } else if (m.type === 'mash') {
    bar(W / 2 - 220, 300, 440, 36, m.v / 100, m.v > 70 ? '#4ad86a' : ORANGE, '#d8d0c0');
    panelText(W / 2, 230, COARSE ? 'ЖМИ УДАР!' : 'ЖМИ J / ПРОБЕЛ!', 30, '#ff4d5e', 'center');
    bar(W / 2 - 220, 360, 440, 8, m.t / 360, '#6ab0ff', '#d8d0c0');
  }
}

// ============================================================ wardrobe
function drawWardrobe() {
  ctx.fillStyle = '#1a1424'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = HT_DARK; ctx.fillRect(0, 0, W, H);
  panelText(W / 2, 50, 'ШКАФ С КОСТЮМАМИ', 26, ORANGE, 'center');
  ctx.fillStyle = '#cfc6e0'; ctx.font = `13px ${F_UI}`; ctx.textAlign = 'center'; ctx.fillText('Фелиция шьёт костюмы по твоим снам о других вселенных. Помогай людям и собирай жетоны.', W / 2, 78); ctx.textAlign = 'left';
  const rs = wardRects();
  rs.forEach((r, i) => {
    const got = SAVE.suits.includes(r.id), on = i === WARD.sel, cur = SAVE.suit === r.id;
    orrect(r.x, r.y, r.w, r.h, 10, on ? '#3a2e58' : '#261e38', on ? 3.4 : 2);
    if (cur) { ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8); }
    ctx.save(); ctx.beginPath(); ctx.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); ctx.clip();
    if (got) drawHero(r.x + r.w / 2, r.y + 150, 1, on ? POSES.thumbs() : POSES.idle(frame + i * 9), r.id, { s: .95 });
    else { ctx.globalAlpha = .9; drawHero(r.x + r.w / 2, r.y + 150, 1, POSES.idle(0), r.id, { s: .95 }); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(20,14,30,.86)'; ctx.fillRect(r.x, r.y, r.w, r.h); panelText(r.x + r.w / 2, r.y + 90, '?', 40, '#6a5a8a', 'center'); }
    ctx.restore();
    ctx.fillStyle = got ? '#fff' : '#8a7aa8'; ctx.font = `9px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(got ? SUITS[r.id].name.toUpperCase() : '???', r.x + r.w / 2, r.y + r.h - 10); ctx.textAlign = 'left';
  });
  const id = SUIT_ORDER[WARD.sel], S2 = SUITS[id], got = SAVE.suits.includes(id);
  orrect(40, 500 - 8, W - 280, 38, 8, 'rgba(12,8,24,.9)', 2);
  ctx.fillStyle = got ? GOLD : '#b8a8d8'; ctx.font = `13px ${F_UI}`;
  ctx.fillText(got ? S2.name + ' — ' + S2.from : 'Закрыто: ' + (UNLOCK_TEXT[id] || ''), 54, 516);
  orrect(W - 220, 492, 180, 38, 8, '#3a2e58', 2); panelText(W - 130, 518, COARSE ? 'ГОТОВО' : 'ГОТОВО (Esc)', 12, '#fff', 'center');
}

// ============================================================ title / card / over / credits
function drawTitle() {
  drawSky('dusk', frame * .6, 0, 540);
  ctx.fillStyle = 'rgba(10,6,20,.35)'; ctx.fillRect(0, 0, W, H);
  // ock silhouette + hero
  ctx.save(); ctx.globalAlpha = .9; ockRig(760, 470, -1, [[700, 480], [830, 480], [640, 220 + Math.sin(frame * .03) * 12], [880, 200 + Math.cos(frame * .03) * 12]], POSES.idle(frame), {}); ctx.restore();
  drawHero(250, 470, 1, POSES.perch(), 'street', { s: 1.9 });
  panelText(W / 2, 92, 'ЧЕЛОВЕК-ПАУК 4', 20, '#fff', 'center');
  ctx.save(); ctx.translate(W / 2, 150); ctx.rotate(-.04); panelText(0, 0, 'РУКИ ОКТАВИУСА', 46, ORANGE, 'center'); ctx.restore();
  const items = titleItems();
  items.forEach((it, i) => {
    const y = 250 + i * 50, on = i === TITLE.sel;
    orrect(W / 2 - 150, y, 300, 40, 8, on ? '#ffe98a' : 'rgba(12,8,24,.85)', on ? 3 : 2);
    ctx.fillStyle = on ? INK : '#fff'; ctx.font = `14px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(it.t, W / 2, y + 26); ctx.textAlign = 'left';
  });
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `12px ${F_UI}`; ctx.textAlign = 'center';
  ctx.fillText(COARSE ? 'Коснись пункта меню' : '↑↓ — выбор · Enter — начать', W / 2, 510); ctx.textAlign = 'left';
}
function drawCard() {
  ctx.fillStyle = '#0d0a18'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = HT_DARK; ctx.fillRect(0, 0, W, H);
  const k = Math.min(1, card.t / 30);
  speedLines(W / 2, H / 2, 30, 'rgba(240,122,28,.18)');
  panelText(W / 2, 200, card.num, 22, '#fff', 'center');
  ctx.save(); ctx.translate(W / 2, 270); ctx.scale(.7 + k * .3, .7 + k * .3); ctx.rotate(-.03); panelText(0, 0, card.title, 44, ORANGE, 'center'); ctx.restore();
  ctx.fillStyle = '#cfc6e0'; ctx.font = `16px ${F_TALK}`; ctx.textAlign = 'center'; ctx.fillText(card.sub, W / 2, 320); ctx.textAlign = 'left';
  if (card.t > 60 && frame % 50 < 34) { ctx.fillStyle = '#fff'; ctx.font = `11px ${F_DISP}`; ctx.textAlign = 'center'; ctx.fillText(COARSE ? 'КОСНИСЬ' : 'ENTER', W / 2, 460); ctx.textAlign = 'left'; }
}
function drawOver() {
  ctx.fillStyle = `rgba(20,4,10,${Math.min(.78, overT / 60)})`; ctx.fillRect(0, 0, W, H);
  if (overT > 20) {
    panelText(W / 2, 220, 'ПАУК ПОВЕРЖЕН', 40, '#ff4d5e', 'center');
    ctx.fillStyle = '#fff'; ctx.font = `16px ${F_TALK}`; ctx.textAlign = 'center';
    ctx.fillText(pick2(['«Дядя Бен сказал бы: вставай, Питер».', '«Ещё раз. Ещё один раз».', '«Фелиция будет смеяться. Надо встать»'], (L && L.t) | 0), W / 2, 270);
    if (frame % 50 < 34) { ctx.font = `12px ${F_DISP}`; ctx.fillText(COARSE ? 'КОСНИСЬ — С КОНТРОЛЬНОЙ ТОЧКИ' : 'ENTER — С КОНТРОЛЬНОЙ ТОЧКИ', W / 2, 340); }
    ctx.textAlign = 'left';
  }
}
function pick2(a, n) { return a[n % a.length]; }
let credT = 0;
function startCredits() { state = 'credits'; credT = 0; mode = null; SAVE.done = 1; if (!SAVE.suits.includes('superior')) SAVE.suits.push('superior'); writeSave(); }
const CREDITS = [
  ['ЧЕЛОВЕК-ПАУК 4', 'РУКИ ОКТАВИУСА'], ['', ''], ['Питер Паркер', 'в костюме, который сшила Фелиция'], ['Фелиция Харди', 'Чёрная Кошка'],
  ['Отто Октавиус', 'Доктор Осьминог'], ['Рози Октавиус', ''], ['Тётя Мэй', 'и галстук дяди Бена'], ['Дж. Джона Джеймсон', 'придумал имя. Наверное'],
  ['Робби Робертсон', 'Бетти Брант'], ['Дональд Менкен', 'арестован'], ['', ''], ['Спасено горожан', () => String(SAVE.helped)], ['Паучьих жетонов', () => String(SAVE.tokens)],
  ['Любовь', () => '♥ ' + SAVE.love], ['Доверие города', () => String(SAVE.trust)], ['Костюмов открыто', () => SAVE.suits.length + ' из ' + SUIT_ORDER.length], ['', ''], ['Продолжение следует...', ''],
];
function drawCredits() {
  ctx.fillStyle = '#0d0a18'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = HT_DARK; ctx.fillRect(0, 0, W, H);
  const y0 = H + 20 - credT * .7;
  CREDITS.forEach((c, i) => {
    const y = y0 + i * 44; if (y < -30 || y > H + 30) return;
    ctx.textAlign = 'center';
    if (i === 0) panelText(W / 2, y, c[0], 26, ORANGE, 'center');
    else { ctx.fillStyle = '#fff'; ctx.font = `14px ${F_DISP}`; ctx.fillText(c[0], W / 2, y); ctx.fillStyle = '#cfc6e0'; ctx.font = `16px ${F_TALK}`; ctx.fillText(typeof c[1] === 'function' ? c[1]() : c[1], W / 2, y + 20); }
    ctx.textAlign = 'left';
  });
  drawHero(120, 500, 1, POSES.swing(0, 40, -120), 'street', { s: 1.2 });
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `11px ${F_UI}`; ctx.fillText(COARSE ? 'коснись — пропустить' : 'Enter — пропустить', W - 150, H - 14);
}
function drawTbc() {
  ctx.fillStyle = '#0d0a18'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = Math.min(1, overT / 60);
  ockRig(W / 2 + 200, 470, -1, [[W / 2 + 140, 480], [W / 2 + 270, 480], [W / 2 + 90, 230 + Math.sin(frame * .03) * 12], [W / 2 + 320, 210]], POSES.idle(frame), {});
  ctx.restore();
  panelText(W / 2 - 120, 200, 'ПРОДОЛЖЕНИЕ', 34, '#fff', 'center');
  panelText(W / 2 - 120, 250, 'СЛЕДУЕТ...', 34, ORANGE, 'center');
  ctx.fillStyle = '#cfc6e0'; ctx.font = `16px ${F_TALK}`; ctx.textAlign = 'center'; ctx.fillText('В пятой части Паук вернётся. И на этот раз он будет готов.', W / 2, 320);
  ctx.fillText('Открыт костюм «Высший паук». Загляни в шкаф — начни игру заново с сохранёнными костюмами.', W / 2, 348);
  if (overT > 90 && frame % 50 < 34) { ctx.font = `11px ${F_DISP}`; ctx.fillText(COARSE ? 'КОСНИСЬ — В МЕНЮ' : 'ENTER — В МЕНЮ', W / 2, 470); }
  ctx.textAlign = 'left';
}
function drawPause() {
  ctx.fillStyle = 'rgba(8,6,16,.7)'; ctx.fillRect(0, 0, W, H);
  panelText(W / 2, 200, 'ПАУЗА', 40, '#fff', 'center');
  ctx.fillStyle = '#cfc6e0'; ctx.font = `14px ${F_UI}`; ctx.textAlign = 'center';
  const L1 = ['J — удар (серия: джеб, хук, апперкот с ↑, подсечка с ↓, в воздухе — удар ногой, ↓ в воздухе — пике)', 'K — паутина (держи — рывок врага к себе или ловушка у ног), L — тап: рывок к точке, держи: полёт на паутине', 'Shift — уклон (идеальный уклон замедляет время), I — супер-удар при полном фокусе', 'Пробел — прыжок / сальто, у стены — лазанье, E — помочь горожанину'];
  L1.forEach((t, i) => ctx.fillText(t, W / 2, 260 + i * 24));
  ctx.fillText(COARSE ? 'Коснись — продолжить' : 'P / Esc — продолжить', W / 2, 380);
  ctx.textAlign = 'left';
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (state === 'title') { drawTitle(); return; }
  if (state === 'card') { drawCard(); drawFade(); return; }
  if (state === 'credits') { drawCredits(); drawFade(); return; }
  if (state === 'tbc') { drawTbc(); drawFade(); return; }
  if (state === 'wardrobe') { drawWardrobe(); return; }
  if (mode === 'civil' && SCN) renderCivil();
  else if (mode === 'level' && L) renderLevel();
  else { ctx.fillStyle = '#0d0a18'; ctx.fillRect(0, 0, W, H); }
  if (slowmo > 0) { ctx.fillStyle = 'rgba(80,40,160,.12)'; ctx.fillRect(0, 0, W, H); }
  drawHud();
  if (state === 'dialog') drawDialog();
  if (state === 'mini' && MINI) drawMini();
  if (state === 'over') drawOver();
  if (state === 'pause') drawPause();
  drawFade();
}
function drawFade() { if (fadeA > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeA})`; ctx.fillRect(0, 0, W, H); } }
