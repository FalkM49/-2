'use strict';
// ============================================================ canvas
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = 960, H = 540;
let DPR = 1;
function fit() { DPR = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * DPR; cv.height = H * DPR; }
fit();
addEventListener('resize', fit);

const F_DISP = '"Rubik Mono One", Rubik, system-ui, sans-serif';
const F_TALK = 'Neucha, "Comic Sans MS", Rubik, cursive';
const F_UI = 'Rubik, system-ui, sans-serif';
const INK = '#15101e';
const ORANGE = '#f07a1c', RED = '#d7263d', BLUE = '#2f4fc4', GOLD = '#ffd84a', ROSE = '#ff5a7a', TEAL = '#2fd0b0';

function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function hash(a, b) {
  let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pick = arr => arr[(Math.random() * arr.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const sgn = v => v < 0 ? -1 : 1;
const COARSE = matchMedia('(pointer: coarse)').matches;

// ============================================================ save
const SAVE_KEY = 'spidey4-save';
function freshSave() { return { ch: 0, love: 0, trust: 0, tokens: 0, flags: {}, suits: ['classic'], suit: 'classic', helped: 0 }; }
let SAVE = freshSave();
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && typeof s.ch === 'number' ? Object.assign(freshSave(), s) : null; } catch (e) { return null; } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

// ============================================================ audio
let AC = null, muted = false;
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}
function tone(f, d, type = 'square', v = .08, slide = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d);
}
function noise(d, v = .15) {
  if (!AC || muted) return;
  const b = AC.createBuffer(1, Math.max(1, AC.sampleRate * d | 0), AC.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = b; g.gain.value = v; s.connect(g).connect(AC.destination); s.start();
}
const later = (ms, fn) => setTimeout(fn, ms);
const SFX = {
  jump: () => tone(380, .12, 'square', .035, 300),
  flip: () => tone(520, .16, 'triangle', .04, 500),
  punch: () => noise(.05, .07),
  hit: () => { noise(.1, .18); tone(140, .12, 'square', .06, -60); },
  heavy: () => { noise(.18, .25); tone(90, .2, 'square', .08, -40); },
  web: () => tone(1100, .12, 'sawtooth', .022, -800),
  zip: () => tone(700, .16, 'sawtooth', .03, 900),
  swing: () => tone(260, .2, 'sine', .03, 160),
  block: () => { tone(1500, .1, 'square', .045, -300); tone(900, .16, 'triangle', .04); },
  hurt: () => tone(320, .28, 'sawtooth', .055, -230),
  boom: () => { noise(.5, .26); tone(90, .45, 'sine', .2, -50); },
  shot: () => noise(.05, .1),
  laser: () => tone(1600, .15, 'square', .02, -1200),
  sense: () => { tone(1800, .08, 'sine', .03); later(70, () => tone(2200, .08, 'sine', .03)); },
  slow: () => tone(200, .5, 'sine', .06, -120),
  super: () => [0, 1, 2, 3].forEach(i => later(i * 70, () => tone(400 + i * 200, .18, 'sawtooth', .04))),
  pick: () => { tone(660, .08, 'square', .045); later(80, () => tone(990, .12, 'square', .045)); },
  token: () => [880, 1175, 1568].forEach((f, i) => later(i * 70, () => tone(f, .12, 'triangle', .05))),
  good: () => tone(880, .12, 'triangle', .06, 200),
  bad: () => tone(160, .25, 'sawtooth', .05, -60),
  open: () => [392, 523, 659].forEach((f, i) => later(i * 90, () => tone(f, .16, 'triangle', .06))),
  blip: () => tone(1300, .018, 'square', .01),
  sel: () => tone(900, .05, 'square', .03),
  love: () => [784, 988].forEach((f, i) => later(i * 110, () => tone(f, .18, 'triangle', .05))),
  heart: () => [659, 784, 988, 1318].forEach((f, i) => later(i * 180, () => tone(f, .35, 'triangle', .05))),
  slam: () => { noise(.35, .3); tone(60, .4, 'sine', .25, -20); },
  alarm: () => [0, 1, 2].forEach(i => later(i * 260, () => tone(700, .2, 'sawtooth', .045, 300))),
  phone: () => [0, 1].forEach(i => later(i * 180, () => tone(1400, .08, 'square', .03))),
  meow: () => tone(620, .4, 'triangle', .07, 480),
  ring: () => tone(1320, .12, 'triangle', .05, 200),
  thanks: () => [523, 659, 784].forEach((f, i) => later(i * 80, () => tone(f, .12, 'sine', .05))),
  zap: () => { tone(1800, .15, 'sawtooth', .035, -1500); noise(.1, .07); },
  metal: () => { tone(220, .3, 'square', .05, -100); noise(.15, .12); },
};

// ============================================================ input
const keys = {}, pressed = {}, released = {}, held = {};
let tap = null;
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyJ: 'punch', KeyX: 'punch', KeyK: 'web', KeyC: 'web',
  KeyL: 'swing', KeyV: 'swing', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyF: 'dodge',
  KeyI: 'super', KeyQ: 'super', KeyE: 'act',
  Enter: 'ok', NumpadEnter: 'ok', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
  Digit1: 'n1', Digit2: 'n2', Digit3: 'n3', Numpad1: 'n1', Numpad2: 'n2', Numpad3: 'n3',
};
function press(a) { if (!keys[a]) { pressed[a] = true; held[a] = 0; } keys[a] = true; }
function unpress(a) { if (keys[a]) released[a] = true; keys[a] = false; }
addEventListener('keydown', e => {
  const a = KEYMAP[e.code]; if (!a) return;
  e.preventDefault(); ensureAudio(); press(a);
});
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) unpress(a); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll('[data-act]').forEach(b => {
  const a = b.dataset.act;
  const down = e => { e.preventDefault(); ensureAudio(); press(a); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
  const up = () => { unpress(a); b.classList.remove('on'); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
cv.addEventListener('pointerdown', e => {
  ensureAudio();
  const r = cv.getBoundingClientRect();
  tap = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  pressed.ok = true;
});
function tickInput() { for (const k in keys) if (keys[k]) held[k] = (held[k] || 0) + 1; }
function clearInput() { for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false; tap = null; }
const muteBtn = document.getElementById('muteBtn');
function syncMute() { muteBtn.textContent = muted ? 'Звук: выкл' : 'Звук: вкл'; }
muteBtn.addEventListener('click', () => { ensureAudio(); muted = !muted; syncMute(); });
document.getElementById('pauseBtn').addEventListener('click', () => { pressed.pause = true; });

// ============================================================ shared runtime state
let state = 'title';       // title | card | dialog | play | pause | fade | over | mini | wardrobe | credits | tbc | cut
let mode = null;           // civil | level | boss
let frame = 0, gameTime = 0;
let fadeA = 0, fadeCb = null;
let hint = null;
let slowmo = 0, hitstop = 0, shake = 0;
function showHint(text, t = 360) { hint = { text, t }; }
function fadeTo(cb) { state = 'fade'; fadeCb = cb; }
