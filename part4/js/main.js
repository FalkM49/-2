'use strict';
// ============================================================ title menu
const TITLE = { sel: 0 };
function titleItems() {
  const it = [];
  if (SAVE.ch > 0 || SAVE.love > 0) it.push({ t: 'ПРОДОЛЖИТЬ · ' + CHAPTERS[SAVE.ch].num, go: () => startChapter(SAVE.ch) });
  it.push({ t: 'НОВАЯ ИГРА', go: newGame });
  it.push({ t: 'ШКАФ С КОСТЮМАМИ', go: () => { openWardrobe(); WARD.fromTitle = true; } });
  return it;
}
function newGame() {
  const keep = SAVE.done ? SAVE.suits.slice() : null;
  SAVE = freshSave();
  if (keep) { SAVE.suits = keep; SAVE.done = 1; }
  SAVE.suit = 'classic'; BOSS_CK = 1; STORY.sew = STORY.car = STORY.dance = 0;
  startChapter(0);
}
function updateTitle() {
  const items = titleItems();
  if (TITLE.sel >= items.length) TITLE.sel = 0;
  if (pressed.up) { TITLE.sel = (TITLE.sel + items.length - 1) % items.length; SFX.sel(); }
  if (pressed.down) { TITLE.sel = (TITLE.sel + 1) % items.length; SFX.sel(); }
  if (tap) {
    const i = items.findIndex((_, i) => tap.x > W / 2 - 150 && tap.x < W / 2 + 150 && tap.y > 250 + i * 50 && tap.y < 290 + i * 50);
    if (i >= 0) { TITLE.sel = i; items[i].go(); SFX.open(); }
    return;
  }
  if (pressed.ok || pressed.jump || pressed.punch) { SFX.open(); items[TITLE.sel].go(); }
}

// ============================================================ restart from checkpoint
function restartCheckpoint() {
  hint = null; slowmo = 0; hitstop = 0; shake = 0;
  if (!L || mode !== 'level') { startChapter(SAVE.ch); return; }
  if (L.id === 'ock_final') startLevel('ock_final', L.onDone);
  else startLevel(L.id, L.onDone, { sec: L.ck });
  showHint('Контрольная точка', 120);
}

// ============================================================ update
let fadeIn = false;
function update() {
  frame++;
  if (pressed.mute) { muted = !muted; syncMute(); }
  if (fadeIn && state !== 'fade') { fadeA = Math.max(0, fadeA - .05); if (fadeA === 0) fadeIn = false; }
  switch (state) {
    case 'title': updateTitle(); return;
    case 'card':
      card.t++;
      if (card.t > 30 && (pressed.ok || pressed.jump || pressed.punch || card.t > 300)) { const g = card.go; card = null; state = 'play'; fadeA = 1; fadeIn = true; g(); }
      return;
    case 'fade':
      fadeA = Math.min(1, fadeA + .06);
      if (fadeA >= 1) { const cb = fadeCb; fadeCb = null; state = 'play'; fadeIn = true; if (cb) cb(); }
      return;
    case 'dialog': updateDialog(); if (mode === 'civil' && SCN) updateFx(); return;
    case 'mini': updateMini(); return;
    case 'wardrobe': { const fromTitle = WARD.fromTitle; updateWardrobe(); if (state === 'play' && fromTitle) state = 'title'; return; }
    case 'pause': if (pressed.pause || pressed.ok) state = 'play'; return;
    case 'over': overT++; if (overT > 40 && (pressed.ok || pressed.jump || pressed.punch)) restartCheckpoint(); return;
    case 'credits':
      credT++;
      if (credT > 60 * 4 && (pressed.ok || pressed.jump)) credT = 99999;
      if (credT > CREDITS.length * 44 / .7 + H / .7 + 60) { fadeTo(() => startCivil('post')); state = 'fade'; }
      return;
    case 'tbc': overT++; if (overT > 90 && (pressed.ok || pressed.jump)) { state = 'title'; mode = null; SAVE.ch = 0; writeSave(); } return;
    case 'play':
      if (pressed.pause) { state = 'pause'; return; }
      if (slowmo > 0) { slowmo--; if (slowmo % 2) { updateFx(); return; } }
      if (mode === 'civil') updateCivil();
      else if (mode === 'level') updateLevel();
      if (shake > 0) shake = Math.max(0, shake - .6);
      return;
  }
}
document.getElementById('pauseBtn').addEventListener('click', () => { if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; });

// ============================================================ boot
SAVE = loadSave() || SAVE;
{
  const m = /^#ch(\d)$/.exec(location.hash);
  if (m) { const n = +m[1]; if (n < CHAPTERS.length) { if (n >= 1 && SAVE.suits.length <= 1) { SAVE.suits = ['street']; if (n >= 4) SAVE.suits.push('upgraded'); SAVE.suit = 'street'; } startChapter(n); } }
}
let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 4) {
    tickInput(); update(); clearInput();
    acc -= 1000 / 60; steps++;
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
