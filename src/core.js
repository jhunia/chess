/* Shared helpers: storage, sound, pieces, board widget, engine bridge and move judgement. */
var T = Tempo, PIECE_NAME = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
function $(s, el) { return (el || document).querySelector(s); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function toast(msg) { var old = $('.toast'); if (old) old.remove(); var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

/* ---------- Progress ---------- */
var DEFAULTS = { v: 1, updated: 0, name: 'You', settings: { sound: true, coords: true, board: 'moss', autoQueen: false, coach: 'ada', speak: false, theme: 'system' },
  puzzle: { r: 800, played: 0, won: 0, hist: [800], themes: {}, done: {} }, rush: { 3: 0, 5: 0, survival: 0 }, daily: { last: '', streak: 0, best: 0, activeDay: '' , activeStreak: 0}, lessons: {}, drills: {}, games: [], current: null, elo: 800, vision: 0, botWins: {} };
var S = JSON.parse(JSON.stringify(DEFAULTS)), dbDoc = null, saveTimer = 0;
function mergeState(o) { if (!o) return; for (var k in DEFAULTS) if (o[k] !== undefined) S[k] = (typeof DEFAULTS[k] === 'object' && DEFAULTS[k] && !Array.isArray(DEFAULTS[k]) && o[k]) ? Object.assign({}, DEFAULTS[k], o[k]) : o[k]; }
try { mergeState(JSON.parse(localStorage.getItem('tempo-chess') || 'null')); } catch (e) { /* storage may be blocked */ }
function save() {
  S.updated = Date.now();
  try { localStorage.setItem('tempo-chess', JSON.stringify(S)); } catch (e) { /* the app still runs for this session */ }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () { if (dbDoc) dbDoc.set({ json: JSON.stringify(S) }).catch(function () {}); }, 1500);
}
function markActive() {
  var d = today(), a = S.daily;
  if (a.activeDay === d) return;
  var y = new Date(Date.now() - 864e5), ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  a.activeStreak = a.activeDay === ys ? a.activeStreak + 1 : 1; a.activeDay = d; a.best = Math.max(a.best, a.activeStreak); save();
}
var sampleFn = null;
function connectClaude(onReady) {
  if (!window.claude || !window.claude.use) return;
  window.claude.use('sample').then(function (s) { sampleFn = s; if (s) onReady(); }).catch(function () {});
  Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
    if (!r[0] || !r[1]) return;
    return r[1].id().then(function (id) {
      dbDoc = r[0].collection('data/users/' + id).doc('profile');
      return dbDoc.get().then(function (snap) {
        if (!snap.exists) return save();
        var o = JSON.parse(snap.data().json || 'null');
        if (o && o.updated > S.updated) { mergeState(o); onReady(); }
      });
    });
  }).catch(function () {});
}

/* ---------- Sound ---------- */
var audio = null;
function tone(f, d, v, type, delay) {
  if (!S.settings.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + (delay || 0);
    o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + d);
  } catch (e) { /* sound is optional */ }
}
var sfx = { move: function () { tone(230, .07, .28, 'square'); }, cap: function () { tone(170, .1, .4, 'square'); tone(110, .1, .25, 'square', .03); }, check: function () { tone(660, .12, .2); tone(880, .12, .15, 'triangle', .07); },
  good: function () { tone(523, .12, .18); tone(784, .18, .18, 'triangle', .09); }, bad: function () { tone(220, .22, .22, 'sawtooth'); }, end: function () { tone(392, .2, .2); tone(523, .2, .2, 'triangle', .14); tone(659, .3, .2, 'triangle', .28); } };
function speak(text) { if (!S.settings.speak || !window.speechSynthesis) return; try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch (e) { /* optional */ } }

/* ---------- Pieces and avatars (original drawings) ---------- */
var BASE = '<path d="M13 34h19a1 1 0 0 1 1 1v3H12v-3a1 1 0 0 1 1-1z"/>';
var SHAPES = {
  P: '<circle cx="22.5" cy="14" r="6"/><path d="M16.5 21.5h12c-1 1.600-2.200 2.600-3 3.400.6 4 2.800 7 5.500 9.100H14c2.700-2.100 4.900-5.100 5.500-9.100-.8-.8-2-1.800-3-3.400z"/>' + BASE,
  R: '<path d="M12 8h5v3.500h3V8h5v3.500h3V8h5v8.500l-4 3v9.500l3 5H13l3-5v-9.500l-4-3z"/>' + BASE,
  B: '<circle cx="22.500" cy="6.800" r="2.500"/><path d="M22.500 9.500c5 3.800 8 7.800 8 12 0 3.200-1.900 5.300-4 6.500l1.500 6H17l1.500-6c-2.100-1.200-4-3.300-4-6.500 0-4.200 3-8.200 8-12z"/><path class="ln" d="M22.500 15v8M18.500 19h8"/>' + BASE,
  N: '<path d="M14 34c.5-4.500 5-6.500 7-11.500-3 2-5.500 3-7.500 3.200l-3.500-3.700c3.500-3.600 6.500-10.500 12-13l.8-3.500 3.500 3.700C33 12 36 20 35.500 34z"/><circle class="eye" cx="20" cy="14.500" r="1.400"/>' + BASE,
  Q: '<circle cx="9.500" cy="12" r="2.300"/><circle cx="16" cy="8.500" r="2.300"/><circle cx="22.500" cy="7" r="2.300"/><circle cx="29" cy="8.500" r="2.300"/><circle cx="35.500" cy="12" r="2.300"/><path d="M10 14l5 12 1.500-15 6 14.500 6-14.500L30 26l5-12-3 20H13z"/>' + BASE,
  K: '<path d="M21 3.500h3V7h3.500v3H24v4.500h-3V10h-3.500V7H21z"/><path d="M22.500 16.500c4.500-5 13.500-2.800 13.500 5 0 5-4.500 8-5.500 12.500h-16c-1-4.500-5.500-7.500-5.500-12.500 0-7.800 9-10 13.500-5z"/><path class="ln" d="M22.500 16.500V34"/>' + BASE
};
function pieceSvg(code) { // code such as "wK"
  var w = code[0] === 'w', fill = w ? '#f7f3e6' : '#2b2f31', st = w ? '#23282a' : '#0d1011', ln = w ? '#23282a' : '#d9d5c8';
  return '<svg viewBox="0 0 45 45" aria-hidden="true"><g fill="' + fill + '" stroke="' + st + '" stroke-width="1.500" stroke-linejoin="round">' + SHAPES[code[1]].replace(/class="ln"/g, 'fill="none" stroke="' + ln + '"').replace(/class="eye"/g, 'fill="' + st + '" stroke="none"') + '</g></svg>';
}
function avatar(name, color, size) {
  var h = hash(name), skin = ['#f2d0b1', '#d9a877', '#a8703f', '#7a4e2c', '#e8bd96'][h % 5], hair = ['#2a211c', '#6b3f1f', '#b7843b', '#8a8f94', '#1e2a38'][(h >> 3) % 5], style = (h >> 6) % 4;
  var hairShape = ['<path d="M13 21c0-9 5-13 11-13s11 4 11 13c-3-5-7-6-11-6s-8 1-11 6z"/>', '<path d="M12 28c-1-13 5-20 12-20s13 7 12 20l-3-1c1-6-1-11-9-11s-10 5-9 11z"/>', '<circle cx="24" cy="8" r="5"/><path d="M14 20c0-7 4-10 10-10s10 3 10 10c-3-4-6-5-10-5s-7 1-10 5z"/>', '<path d="M14 18c2-7 7-9 12-8 5 0 8 4 8 9l-8-3c-4 2-8 2-12 2z"/>'][style];
  var specs = (h >> 9) % 3 === 0 ? '<g fill="none" stroke="#1b1b1b" stroke-width="1.300"><circle cx="20" cy="23" r="3"/><circle cx="28" cy="23" r="3"/><path d="M23 23h2"/></g>' : '';
  return '<svg class="avatar" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" role="img" aria-label="' + esc(name) + '"><rect width="48" height="48" rx="10" fill="' + color + '"/><path d="M8 48c1-10 8-14 16-14s15 4 16 14z" fill="#00000033"/><circle cx="24" cy="23" r="11" fill="' + skin + '"/><g fill="' + hair + '">' + hairShape + '</g><circle cx="20" cy="23" r="1.300" fill="#1b1b1b"/><circle cx="28" cy="23" r="1.300" fill="#1b1b1b"/><path d="M20.500 28.500c2 1.500 5 1.500 7 0" fill="none" stroke="#1b1b1b" stroke-width="1.200" stroke-linecap="round"/>' + specs + '</svg>';
}

/* ---------- Board widget ---------- */
var BOARD_THEMES = { moss: ['#e9e4d4', '#5f8a78', 'Moss'], walnut: ['#ecd9b9', '#a9754b', 'Walnut'], slate: ['#dfe5ea', '#6a8199', 'Slate'], plum: ['#ece2ea', '#8a6a8e', 'Plum'], ink: ['#c9cfd0', '#3f5159', 'Ink'] };
function Board(el, opts) {
  this.el = el; this.o = opts || {}; this.flip = !!this.o.flip; this.pcs = {}; this.sel = null; this.state = {}; this.dests = [];
  var t = BOARD_THEMES[S.settings.board] || BOARD_THEMES.moss;
  el.classList.add('board'); el.style.setProperty('--sq-l', t[0]); el.style.setProperty('--sq-d', t[1]);
  el.innerHTML = '<div class="sqs"></div><div class="ovs"></div><div class="pcs"></div><svg class="arrows" viewBox="0 0 800 800"></svg><div class="clsl"></div>';
  this.drawSquares();
  this.bind();
}
Board.prototype.pt = function (s) { var f = s.charCodeAt(0) - 97, r = +s[1] - 1; return this.flip ? [7 - f, r] : [f, 7 - r]; };
Board.prototype.place = function (e, s) { var p = this.pt(s); e.style.left = '0'; e.style.top = '0'; e.style.transform = 'translate(' + p[0] * 100 + '%,' + p[1] * 100 + '%)'; };
Board.prototype.drawSquares = function () {
  var out = '', files = 'abcdefgh';
  for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
    var s = files[f] + (r + 1), p = this.pt(s), co = '';
    if (S.settings.coords) { if (p[0] === 0) co += '<span class="co r">' + (r + 1) + '</span>'; if (p[1] === 7) co += '<span class="co f">' + files[f] + '</span>'; }
    out += '<div class="sq ' + ((r + f) % 2 ? 'l' : 'd') + '" style="left:' + p[0] * 12.5 + '%;top:' + p[1] * 12.5 + '%">' + co + '</div>';
  }
  $('.sqs', this.el).innerHTML = out;
};
Board.prototype.setFlip = function (v) { this.flip = v; this.drawSquares(); for (var k in this.pcs) this.place(this.pcs[k].el, k); this.drawOverlay(); this.drawArrows(); };
// Moves piece elements to match the position so the pieces slide instead of blinking.
Board.prototype.setPos = function (pos) {
  var want = {}, layer = $('.pcs', this.el), self = this;
  for (var s = 0; s < 120; s++) { if (s & 136) { s += 7; continue; } var p = pos.b[s]; if (p) want[T.sqName(s)] = (p & 8 ? 'b' : 'w') + ' PNBRQK'[p & 7]; }
  var next = {}, spare = [];
  Object.keys(this.pcs).forEach(function (k) { var e = self.pcs[k]; if (want[k] === e.code) { next[k] = e; delete want[k]; } else spare.push(e); });
  Object.keys(want).forEach(function (k) {
    var code = want[k], i = spare.findIndex(function (e) { return e.code === code; }), e;
    if (i >= 0) e = spare.splice(i, 1)[0];
    else { var d = document.createElement('div'); d.className = 'pc'; d.innerHTML = pieceSvg(code); layer.appendChild(d); e = { el: d, code: code }; }
    self.place(e.el, k); next[k] = e;
  });
  spare.forEach(function (e) { e.el.remove(); });
  this.pcs = next;
  this.pos = pos;
};
Board.prototype.setState = function (st) { Object.assign(this.state, st); this.drawOverlay(); this.drawArrows(); };
Board.prototype.overlay = function (s, cls) { return '<div class="ov ' + cls + '" style="left:' + this.pt(s)[0] * 12.5 + '%;top:' + this.pt(s)[1] * 12.5 + '%"></div>'; };
Board.prototype.drawOverlay = function () {
  var st = this.state, out = '', self = this;
  (st.last || []).forEach(function (s) { out += self.overlay(s, 'last'); });
  (st.marks || []).forEach(function (s) { out += self.overlay(s, 'mark'); });
  if (st.check) out += this.overlay(st.check, 'check');
  if (this.sel) out += this.overlay(this.sel, 'sel');
  this.dests.forEach(function (d) { out += self.overlay(d, self.pcs[d] ? 'cap' : 'dest'); });
  $('.ovs', this.el).innerHTML = out;
  var c = $('.clsl', this.el), b = st.badge;
  if (b) { var p = this.pt(b.sq); c.innerHTML = '<div class="cls" style="left:' + p[0] * 12.5 + '%;top:' + p[1] * 12.5 + '%"><b style="background:' + b.color + '">' + esc(b.text) + '</b></div>'; } else c.innerHTML = '';
};
Board.prototype.drawArrows = function () {
  var self = this, out = '';
  (this.state.arrows || []).forEach(function (a) {
    var p = self.pt(a[0]), q = self.pt(a[1]), x1 = p[0] * 100 + 50, y1 = p[1] * 100 + 50, x2 = q[0] * 100 + 50, y2 = q[1] * 100 + 50, ang = Math.atan2(y2 - y1, x2 - x1), c = a[2] || 'rgba(240,160,30,.85)';
    var hx = x2 - Math.cos(ang) * 30, hy = y2 - Math.sin(ang) * 30, n = Math.PI / 2;
    out += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + hx + '" y2="' + hy + '" stroke="' + c + '" stroke-width="16" stroke-linecap="round"/><polygon fill="' + c + '" points="' + x2 + ',' + y2 + ' ' + (hx + Math.cos(ang + n) * 24) + ',' + (hy + Math.sin(ang + n) * 24) + ' ' + (hx + Math.cos(ang - n) * 24) + ',' + (hy + Math.sin(ang - n) * 24) + '"/>';
  });
  $('.arrows', this.el).innerHTML = out;
};
Board.prototype.sqAt = function (ev) {
  var r = this.el.getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) / r.width * 8), y = Math.floor((ev.clientY - r.top) / r.height * 8);
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return this.flip ? 'abcdefgh'[7 - x] + (y + 1) : 'abcdefgh'[x] + (8 - y);
};
Board.prototype.select = function (s) { this.sel = s; this.dests = s && this.o.dests ? this.o.dests(s) : []; this.drawOverlay(); };
Board.prototype.tryMove = function (from, to) {
  var self = this;
  if (this.dests.indexOf(to) < 0) return false;
  var pc = this.pcs[from], promo = pc && pc.code[1] === 'P' && (to[1] === '8' || to[1] === '1');
  this.select(null);
  if (promo && !S.settings.autoQueen) {
    var w = pc.code[0], box = document.createElement('div'); box.className = 'promo';
    ['q', 'r', 'b', 'n'].forEach(function (x) { var btn = document.createElement('button'); btn.innerHTML = pieceSvg(w + x.toUpperCase()); btn.setAttribute('aria-label', 'Promote to ' + { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[x]); btn.onclick = function () { box.remove(); self.o.onMove(from + to + x); }; box.appendChild(btn); });
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (e.target === box) box.remove(); });
    this.el.appendChild(box);
  } else this.o.onMove(from + to + (promo ? 'q' : ''));
  return true;
};
Board.prototype.bind = function () {
  var self = this, drag = null;
  this.el.addEventListener('pointerdown', function (ev) {
    if (!self.o.dests) { if (self.o.onTap) { var ts = self.sqAt(ev); if (ts) self.o.onTap(ts); } return; }
    var s = self.sqAt(ev);
    if (!s) return;
    if (audio && audio.state === 'suspended') audio.resume();
    if (self.sel && self.tryMove(self.sel, s)) return;
    var pc = self.pcs[s], can = pc && self.o.dests(s).length;
    if (!can) { self.select(null); if (self.o.onTap) self.o.onTap(s); return; }
    var was = self.sel === s;
    self.select(s);
    drag = { from: s, el: pc.el, id: ev.pointerId, moved: false, was: was, sx: ev.clientX, sy: ev.clientY };
    try { self.el.setPointerCapture(ev.pointerId); } catch (e) { /* older browsers drag without capture */ }
  });
  this.el.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 6) return;
    drag.moved = true;
    var r = self.el.getBoundingClientRect(), w = r.width / 8, lift = ev.pointerType === 'touch' ? w * .55 : 0;
    drag.el.classList.add('drag');
    drag.el.style.transform = 'translate(' + (ev.clientX - r.left - w / 2) + 'px,' + (ev.clientY - r.top - w / 2 - lift) + 'px) scale(1.25)';
  });
  function finish(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null;
    d.el.classList.remove('drag');
    if (d.moved) {
      var r = self.el.getBoundingClientRect(), lift = ev.pointerType === 'touch' ? r.width / 8 * .55 : 0;
      var to = self.sqAt({ clientX: ev.clientX, clientY: ev.clientY - lift });
      self.place(d.el, d.from);
      if (!(to && to !== d.from && ev.type !== 'pointercancel' && self.tryMove(d.from, to))) self.select(null);
    } else if (d.was) self.select(null);
  }
  this.el.addEventListener('pointerup', finish);
  this.el.addEventListener('pointercancel', finish);
};
// Standard board controls for a Pos: legal destinations and last-move and check highlighting.
function legalDests(pos, s) {
  var i = T.sqIdx(s), out = [];
  pos.moves().forEach(function (m) { if (T.mFrom(m) === i) { var n = T.sqName(T.mTo(m)); if (out.indexOf(n) < 0) out.push(n); } });
  return out;
}
function checkSq(pos) { return pos.inCheck() ? T.sqName(pos.kings[pos.turn]) : null; }

/* ---------- Engine bridge: one worker, cancellable, with a same-thread fallback ---------- */
var Engine = {
  worker: null, failed: false, queue: [], busy: null, nextId: 1,
  spawn: function () {
    if (this.failed || this.worker) return;
    try {
      var src = document.getElementById('engine-src').textContent + ';onmessage=function(e){postMessage({id:e.data.id,r:Tempo.analyzeRequest(e.data.req)})};';
      var w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))), self = this;
      w.onmessage = function (e) { var b = self.busy; if (b && b.id === e.data.id) { self.busy = null; b.resolve(e.data.r); self.pump(); } };
      w.onerror = function () { self.failed = true; self.worker = null; var b = self.busy; self.busy = null; if (b) self.queue.unshift(b); self.pump(); };
      this.worker = w;
    } catch (e) { this.failed = true; }
  },
  analyze: function (req) { var self = this; return new Promise(function (resolve) { self.queue.push({ id: self.nextId++, req: req, resolve: resolve }); self.pump(); }); },
  pump: function () {
    if (this.busy || !this.queue.length) return;
    var job = this.queue.shift(), self = this;
    this.busy = job; this.spawn();
    if (this.worker) this.worker.postMessage({ id: job.id, req: job.req });
    else setTimeout(function () { var r = T.analyzeRequest(job.req); if (self.busy === job) { self.busy = null; job.resolve(r); self.pump(); } }, 10);
  },
  cancel: function () {
    this.queue.forEach(function (j) { j.resolve(null); }); this.queue = [];
    if (this.busy) { this.busy.resolve(null); this.busy = null; if (this.worker) { this.worker.terminate(); this.worker = null; } }
  }
};

/* ---------- Judging moves ---------- */
function wpOf(line) { if (!line) return 50; if (line.mate) return line.mate > 0 ? 100 : 0; return 50 + 50 * (2 / (1 + Math.exp(-.00368 * line.score)) - 1); }
function evalText(line, flip) { if (!line) return ''; var sign = flip ? -1 : 1; if (line.mate) return (line.mate * sign > 0 ? '+' : '-') + 'M' + Math.abs(line.mate); var v = sign * line.score / 100; return (v > 0 ? '+' : '') + v.toFixed(1); }
var CLASSES = {
  brilliant: { label: 'Brilliant', sym: '!!', color: '#16a5a5' }, great: { label: 'Great find', sym: '!', color: '#2d7fc4' }, best: { label: 'Best', sym: '★', color: '#2f9e5f' }, excellent: { label: 'Excellent', sym: '✓', color: '#2f9e5f' }, good: { label: 'Good', sym: '✓', color: '#6a9e4f' },
  book: { label: 'Book', sym: 'B', color: '#b08a44' }, inaccuracy: { label: 'Inaccuracy', sym: '?!', color: '#d9a21b' }, mistake: { label: 'Mistake', sym: '?', color: '#e0802a' }, miss: { label: 'Missed win', sym: '×', color: '#d4543a' }, blunder: { label: 'Blunder', sym: '??', color: '#cf3030' }
};
var CLASS_ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
function isSacrifice(pos, m) {
  var f = T.mFrom(m), t = T.mTo(m), ty = pos.b[f] & 7, cap = pos.b[t] & 7;
  if (ty === T.P || ty === T.K) return false;
  pos.make(m);
  var hit = false, them = pos.turn;
  pos.moves().forEach(function (r) { if (T.mTo(r) === t && (T.VAL[pos.b[T.mFrom(r)] & 7] < T.VAL[ty])) hit = true; });
  var att = pos.attacked(t, them); pos.unmake();
  return att && hit && T.VAL[ty] > T.VAL[cap] + 100;
}
// before: analysis of the position before the move. after: analysis after it (null if the game ended).
function judge(pos, uci, before, after, end, prevLoss, inBook) {
  var best = before.lines[0], m = pos.parseUci(uci), wpB = wpOf(best), wpP;
  if (uci === best.uci) wpP = wpB;
  else if (end) wpP = end === 'mate' ? 100 : 50;
  else wpP = after && after.lines[0] ? 100 - wpOf(after.lines[0]) : wpB;
  var loss = Math.max(0, wpB - wpP), cls;
  if (inBook) cls = 'book';
  else if (uci === best.uci || loss < 1) {
    cls = 'best';
    var second = before.lines[1], gap = second ? wpB - wpOf(second) : 0;
    if (m && isSacrifice(pos, m) && wpP >= 50 && wpB < 98) cls = 'brilliant';
    else if (second && gap >= 18 && wpB < 97 && wpB > 30 && !(pos.b[T.mTo(m)] && T.VAL[pos.b[T.mTo(m)] & 7] >= T.VAL[pos.b[T.mFrom(m)] & 7])) cls = 'great';
  }
  else if (loss < 2.5) cls = 'excellent';
  else if (loss < 5) cls = 'good';
  else if (loss < 10) cls = 'inaccuracy';
  else if ((prevLoss || 0) >= 10) cls = 'miss';
  else if (loss < 20) cls = 'mistake';
  else cls = 'blunder';
  return { cls: cls, loss: loss, wp: wpP, acc: Math.max(0, Math.min(100, 103.1668 * Math.exp(-.04354 * loss) - 3.1669)) };
}
function describe(pos, uci) {
  var m = pos.parseUci(uci);
  if (!m) return '';
  var f = T.mFrom(m), t = T.mTo(m), p = pos.b[f] & 7, cap = pos.b[t] & 7, san = pos.san(m);
  if (san.indexOf('#') >= 0) return 'it is checkmate';
  if (T.mFlag(m) === 3) return 'it castles the king to safety and brings the rook into play';
  var bits = [];
  if (T.mPromo(m)) bits.push('it promotes the pawn');
  if (cap) bits.push('it wins the ' + PIECE_NAME[cap] + ' on ' + T.sqName(t));
  if (san.indexOf('+') >= 0) bits.push('it gives check');
  pos.make(m);
  var targets = [], us = 1 - pos.turn;
  pos.b[t] && (function () {
    var saved = pos.turn; pos.turn = us; // Look at what the moved piece attacks next.
    pos.gen(true).forEach(function (r) { if (T.mFrom(r) === t) { var c = pos.b[T.mTo(r)] & 7; if (c > 1 && (T.VAL[c] > T.VAL[p] || !pos.attacked(T.mTo(r), 1 - us))) targets.push(c); } });
    pos.turn = saved;
  })();
  pos.unmake();
  if (targets.length >= 2) bits.push('it attacks your opponent\'s ' + PIECE_NAME[targets[0]] + ' and ' + PIECE_NAME[targets[1]] + ' at once');
  else if (targets.length === 1) bits.push('it threatens the ' + PIECE_NAME[targets[0]]);
  if (!bits.length) {
    if ((p === T.N || p === T.B) && pos.full <= 12 && (f >> 4) === (pos.turn ? 7 : 0)) bits.push('it develops a piece');
    else if (p === T.P && (t & 7) >= 3 && (t & 7) <= 4 && (t >> 4) >= 3 && (t >> 4) <= 4) bits.push('it claims the centre');
    else bits.push('it keeps your position coordinated');
  }
  return bits.join(' and ');
}
// Plain-language explanation of a judged move, built from the engine's lines.
function explain(pos, uci, before, after, verdict) {
  var best = before.lines[0], m = pos.parseUci(uci), san = m ? pos.san(m) : uci, cls = verdict.cls, out = '';
  if (cls === 'book') return san + ' is a well-known opening move.';
  if (cls === 'brilliant') return san + ' is a real sacrifice, and it holds up. ' + cap(describe(pos, uci)) + '.';
  if (cls === 'great') return san + ' was the only strong move here. Everything else would have let your advantage slip.';
  if (cls === 'best' || cls === 'excellent' || cls === 'good') return san + (cls === 'best' ? ' is the engine\'s top choice: ' : ' works: ') + describe(pos, uci) + '.';
  if (after && after.lines[0] && m) {
    pos.make(m);
    var r = after.lines[0], rm = pos.parseUci(r.uci), rs = rm ? pos.san(rm) : r.uci;
    if (r.mate > 0) out = san + ' allows forced mate in ' + r.mate + ', starting with ' + rs + '. ';
    else if (rm && pos.b[T.mTo(rm)]) out = san + ' lets your opponent play ' + rs + ', taking the ' + PIECE_NAME[pos.b[T.mTo(rm)] & 7] + '. ';
    else out = san + ' allows ' + rs + ', which improves your opponent\'s position. ';
    pos.unmake();
  } else out = san + ' is not the most accurate. ';
  var bm = pos.parseUci(best.uci);
  if (bm) out += 'Better was ' + pos.san(bm) + ', because ' + describe(pos, best.uci) + '.';
  return out;
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function pvSan(fen, moves, pvUci, limit) {
  var p = new T.Pos(fen), out = [];
  (moves || []).forEach(function (u) { var m = p.parseUci(u); if (m) p.make(m); });
  pvUci.slice(0, limit || 6).forEach(function (u) { var m = p.parseUci(u); if (!m) return; out.push(p.san(m)); p.make(m); });
  return out.join(' ');
}

/* ---------- Opening book ---------- */
var BOOK = (function () {
  var tree = {}, names = {};
  OPENINGS.forEach(function (o) {
    var keys = [], sans = o[1].split(' ');
    sans.forEach(function (s, i) { var k = sans.slice(0, i).join(' '); (tree[k] = tree[k] || {}); tree[k][s] = (tree[k][s] || 0) + 1; keys.push(k); });
    names[o[1]] = o[0];
  });
  return { tree: tree, names: names };
})();
function openingName(sans) { var name = '', cur = ''; for (var i = 0; i < sans.length; i++) { cur += (i ? ' ' : '') + sans[i]; if (BOOK.names[cur]) name = BOOK.names[cur]; if (!BOOK.tree[cur] && !BOOK.names[cur]) break; } return name; }
function inBook(sans) { return !!BOOK.tree[sans.slice(0, sans.length - 1).join(' ')] && !!BOOK.tree[sans.slice(0, sans.length - 1).join(' ')][sans[sans.length - 1]]; }
function pgnOf(g) {
  var p = new T.Pos(g.start), out = '';
  g.moves.forEach(function (u, i) { var m = p.parseUci(u); if (!m) return; if (p.turn === 0) out += p.full + '. '; else if (!i) out += p.full + '... '; out += p.san(m) + ' '; p.make(m); });
  return '[White "' + g.white + '"]\n[Black "' + g.black + '"]\n[Result "' + (g.result || '*') + '"]\n' + (g.start !== T.START ? '[FEN "' + g.start + '"]\n' : '') + '\n' + out + (g.result || '*');
}
