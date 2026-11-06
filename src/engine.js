/* Tempo chess core: rules (0x88 board) and a search engine. Runs in the page, a worker and Node. */
var Tempo = (function () {
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, BLACK = 8;
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var FLAG_DBL = 1, FLAG_EP = 2, FLAG_CASTLE = 3;
  var CH = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  var CHARS = ' pnbrqk';
  var KN = [33, 31, 18, 14, -33, -31, -18, -14], KD = [1, -1, 16, -16, 17, 15, -17, -15];
  var BD = [17, 15, -17, -15], RD = [1, -1, 16, -16];

  // Seeded random numbers keep position hashes identical between runs.
  var seed = 1070372;
  function rnd() { seed = (seed * 1664525 + 1013904223) | 0; var a = seed; seed = (seed * 1664525 + 1013904223) | 0; return (a ^ (seed >>> 11)) | 0; }
  var ZL = [], ZH = [];
  for (var zi = 0; zi < 15; zi++) { ZL[zi] = new Int32Array(128); ZH[zi] = new Int32Array(128); for (var zj = 0; zj < 128; zj++) { ZL[zi][zj] = rnd(); ZH[zi][zj] = rnd(); } }
  var ZCL = new Int32Array(16), ZCH = new Int32Array(16), ZEL = new Int32Array(128), ZEH = new Int32Array(128);
  for (zi = 0; zi < 16; zi++) { ZCL[zi] = rnd(); ZCH[zi] = rnd(); }
  for (zi = 0; zi < 128; zi++) { ZEL[zi] = rnd(); ZEH[zi] = rnd(); }
  var ZSL = rnd(), ZSH = rnd();
  var CASTLE_MASK = new Uint8Array(128).fill(15);
  CASTLE_MASK[0] = 13; CASTLE_MASK[7] = 14; CASTLE_MASK[4] = 12; CASTLE_MASK[112] = 7; CASTLE_MASK[119] = 11; CASTLE_MASK[116] = 3;

  function sqName(s) { return 'abcdefgh'[s & 7] + (1 + (s >> 4)); }
  function sqIdx(n) { return (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97); }
  function mk(f, t, promo, flag) { return f | (t << 7) | ((promo || 0) << 14) | ((flag || 0) << 17); }
  function mFrom(m) { return m & 127; }
  function mTo(m) { return (m >> 7) & 127; }
  function mPromo(m) { return (m >> 14) & 7; }
  function mFlag(m) { return (m >> 17) & 3; }
  function uci(m) { var s = sqName(mFrom(m)) + sqName(mTo(m)); if (mPromo(m)) s += CHARS[mPromo(m)]; return s; }

  function Pos(fen) {
    this.b = new Uint8Array(128);
    this.stack = [];
    this.setFen(fen || START);
  }
  Pos.prototype.setFen = function (fen) {
    var parts = fen.trim().split(/\s+/), rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('A FEN needs 8 ranks');
    this.b.fill(0); this.kings = [-1, -1];
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var i = 0; i < rows[r].length; i++) {
        var c = rows[r][i];
        if (c >= '1' && c <= '8') { f += +c; continue; }
        var low = c.toLowerCase(), t = CH[low];
        if (!t || f > 7) throw new Error('Bad FEN piece: ' + c);
        var s = (7 - r) * 16 + f, pc = t | (c === low ? BLACK : 0);
        this.b[s] = pc;
        if (t === K) this.kings[c === low ? 1 : 0] = s;
        f++;
      }
    }
    if (this.kings[0] < 0 || this.kings[1] < 0) throw new Error('Both kings are required');
    this.turn = parts[1] === 'b' ? 1 : 0;
    var cs = parts[2] || '-';
    this.castle = (cs.indexOf('K') >= 0 ? 1 : 0) | (cs.indexOf('Q') >= 0 ? 2 : 0) | (cs.indexOf('k') >= 0 ? 4 : 0) | (cs.indexOf('q') >= 0 ? 8 : 0);
    this.ep = parts[3] && parts[3] !== '-' ? sqIdx(parts[3]) : -1;
    this.half = +(parts[4] || 0); this.full = +(parts[5] || 1);
    this.stack.length = 0;
    this.rehash();
    this.hist = [];
  };
  Pos.prototype.rehash = function () {
    var lo = 0, hi = 0;
    for (var s = 0; s < 120; s++) { if (s & 136) { s += 7; continue; } var p = this.b[s]; if (p) { lo ^= ZL[p][s]; hi ^= ZH[p][s]; } }
    lo ^= ZCL[this.castle]; hi ^= ZCH[this.castle];
    if (this.ep >= 0) { lo ^= ZEL[this.ep]; hi ^= ZEH[this.ep]; }
    if (this.turn) { lo ^= ZSL; hi ^= ZSH; }
    this.lo = lo; this.hi = hi;
  };
  Pos.prototype.fen = function () {
    var out = '';
    for (var r = 7; r >= 0; r--) {
      var e = 0;
      for (var f = 0; f < 8; f++) {
        var p = this.b[r * 16 + f];
        if (!p) { e++; continue; }
        if (e) { out += e; e = 0; }
        var ch = CHARS[p & 7]; out += p & BLACK ? ch : ch.toUpperCase();
      }
      if (e) out += e;
      if (r) out += '/';
    }
    var c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return out + ' ' + (this.turn ? 'b' : 'w') + ' ' + (c || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };
  Pos.prototype.attacked = function (s, by) {
    var b = this.b, side = by ? BLACK : 0, t, i, d, p;
    var pd = by ? 16 : -16;
    t = s + pd + 1; if (!(t & 136) && b[t] === (P | side)) return true;
    t = s + pd - 1; if (!(t & 136) && b[t] === (P | side)) return true;
    for (i = 0; i < 8; i++) { t = s + KN[i]; if (!(t & 136) && b[t] === (N | side)) return true; }
    for (i = 0; i < 8; i++) { t = s + KD[i]; if (!(t & 136) && b[t] === (K | side)) return true; }
    for (i = 0; i < 4; i++) {
      d = BD[i]; t = s + d;
      while (!(t & 136)) { p = b[t]; if (p) { if (p === (B | side) || p === (Q | side)) return true; break; } t += d; }
    }
    for (i = 0; i < 4; i++) {
      d = RD[i]; t = s + d;
      while (!(t & 136)) { p = b[t]; if (p) { if (p === (R | side) || p === (Q | side)) return true; break; } t += d; }
    }
    return false;
  };
  Pos.prototype.inCheck = function (c) { if (c === undefined) c = this.turn; return this.attacked(this.kings[c], 1 - c); };
  // Pseudo-legal moves; capturesOnly also keeps queen promotions for quiescence search.
  Pos.prototype.gen = function (capturesOnly) {
    var b = this.b, us = this.turn, side = us ? BLACK : 0, out = [], s, p, t, i, d, q;
    for (s = 0; s < 120; s++) {
      if (s & 136) { s += 7; continue; }
      p = b[s];
      if (!p || (p & BLACK) !== side) continue;
      var ty = p & 7;
      if (ty === P) {
        var fw = us ? -16 : 16, pr = us ? 0 : 7, start = us ? 6 : 1;
        t = s + fw;
        if (!b[t]) {
          if ((t >> 4) === pr) { out.push(mk(s, t, Q)); if (!capturesOnly) { out.push(mk(s, t, R)); out.push(mk(s, t, B)); out.push(mk(s, t, N)); } }
          else if (!capturesOnly) {
            out.push(mk(s, t));
            if ((s >> 4) === start && !b[t + fw]) out.push(mk(s, t + fw, 0, FLAG_DBL));
          }
        }
        for (i = -1; i <= 1; i += 2) {
          t = s + fw + i;
          if (t & 136) continue;
          q = b[t];
          if (q && (q & BLACK) !== side) {
            if ((t >> 4) === pr) { out.push(mk(s, t, Q)); if (!capturesOnly) { out.push(mk(s, t, R)); out.push(mk(s, t, B)); out.push(mk(s, t, N)); } }
            else out.push(mk(s, t));
          } else if (t === this.ep) out.push(mk(s, t, 0, FLAG_EP));
        }
      } else if (ty === N || ty === K) {
        var ds = ty === N ? KN : KD;
        for (i = 0; i < 8; i++) {
          t = s + ds[i];
          if (t & 136) continue;
          q = b[t];
          if (q ? (q & BLACK) !== side : !capturesOnly) out.push(mk(s, t));
        }
      } else {
        var dirs = ty === B ? BD : ty === R ? RD : KD;
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; t = s + d;
          while (!(t & 136)) {
            q = b[t];
            if (q) { if ((q & BLACK) !== side) out.push(mk(s, t)); break; }
            if (!capturesOnly) out.push(mk(s, t));
            t += d;
          }
        }
      }
    }
    if (!capturesOnly) {
      var base = us ? 112 : 0, kBit = us ? 4 : 1, qBit = us ? 8 : 2, them = 1 - us;
      if ((this.castle & kBit) && !b[base + 5] && !b[base + 6] && b[base + 7] === (R | side) && b[base + 4] === (K | side) && !this.attacked(base + 4, them) && !this.attacked(base + 5, them) && !this.attacked(base + 6, them)) out.push(mk(base + 4, base + 6, 0, FLAG_CASTLE));
      if ((this.castle & qBit) && !b[base + 3] && !b[base + 2] && !b[base + 1] && b[base] === (R | side) && b[base + 4] === (K | side) && !this.attacked(base + 4, them) && !this.attacked(base + 3, them) && !this.attacked(base + 2, them)) out.push(mk(base + 4, base + 2, 0, FLAG_CASTLE));
    }
    return out;
  };
  Pos.prototype.make = function (m) {
    var b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = (m >> 17) & 3, p = b[f], cap = b[t], lo = this.lo, hi = this.hi, us = this.turn;
    this.stack.push(m, cap, this.castle, this.ep, this.half, lo, hi);
    this.hist.push(lo, hi);
    if (this.ep >= 0) { lo ^= ZEL[this.ep]; hi ^= ZEH[this.ep]; }
    lo ^= ZCL[this.castle]; hi ^= ZCH[this.castle];
    lo ^= ZL[p][f]; hi ^= ZH[p][f];
    if (cap) { lo ^= ZL[cap][t]; hi ^= ZH[cap][t]; }
    b[f] = 0;
    var placed = pr ? (pr | (p & BLACK)) : p;
    b[t] = placed;
    lo ^= ZL[placed][t]; hi ^= ZH[placed][t];
    this.ep = -1;
    if (fl === FLAG_DBL) { this.ep = (f + t) >> 1; lo ^= ZEL[this.ep]; hi ^= ZEH[this.ep]; }
    else if (fl === FLAG_EP) { var cs = t + (us ? 16 : -16), cp = b[cs]; b[cs] = 0; lo ^= ZL[cp][cs]; hi ^= ZH[cp][cs]; }
    else if (fl === FLAG_CASTLE) {
      var rf = t > f ? t + 1 : t - 2, rt = t > f ? t - 1 : t + 1, rk = b[rf];
      b[rf] = 0; b[rt] = rk;
      lo ^= ZL[rk][rf] ^ ZL[rk][rt]; hi ^= ZH[rk][rf] ^ ZH[rk][rt];
    }
    if ((p & 7) === K) this.kings[us] = t;
    this.castle &= CASTLE_MASK[f] & CASTLE_MASK[t];
    lo ^= ZCL[this.castle]; hi ^= ZCH[this.castle];
    this.half = (cap || (p & 7) === P) ? 0 : this.half + 1;
    if (us) this.full++;
    this.turn = 1 - us;
    lo ^= ZSL; hi ^= ZSH;
    this.lo = lo; this.hi = hi;
  };
  Pos.prototype.unmake = function () {
    var st = this.stack, b = this.b, hi = st.pop(), lo = st.pop(), half = st.pop(), ep = st.pop(), castle = st.pop(), cap = st.pop(), m = st.pop();
    var f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = (m >> 17) & 3;
    this.hist.length -= 2;
    var us = 1 - this.turn, p = b[t];
    if (pr) p = P | (us ? BLACK : 0);
    b[f] = p; b[t] = cap;
    if (fl === FLAG_EP) b[t + (us ? 16 : -16)] = P | (us ? 0 : BLACK);
    else if (fl === FLAG_CASTLE) {
      var rf = t > f ? t + 1 : t - 2, rt = t > f ? t - 1 : t + 1;
      b[rf] = b[rt]; b[rt] = 0;
    }
    if ((p & 7) === K) this.kings[us] = f;
    this.turn = us; this.castle = castle; this.ep = ep; this.half = half; this.lo = lo; this.hi = hi;
    if (us) this.full--;
  };
  Pos.prototype.moves = function () {
    var ps = this.gen(false), out = [], us = this.turn;
    for (var i = 0; i < ps.length; i++) {
      this.make(ps[i]);
      if (!this.attacked(this.kings[us], 1 - us)) out.push(ps[i]);
      this.unmake();
    }
    return out;
  };
  Pos.prototype.repCount = function () {
    var n = 1, h = this.hist;
    for (var i = h.length - 2, k = 0; i >= 0 && k < this.half; i -= 2, k++) if (h[i] === this.lo && h[i + 1] === this.hi) n++;
    return n;
  };
  Pos.prototype.insufficient = function () {
    var n = 0, bishops = [], knights = 0;
    for (var s = 0; s < 120; s++) {
      if (s & 136) { s += 7; continue; }
      var p = this.b[s]; if (!p) continue;
      var t = p & 7;
      if (t === K) continue;
      if (t === P || t === R || t === Q) return false;
      n++;
      if (t === N) knights++; else bishops.push(((s >> 4) + (s & 7)) % 2);
    }
    if (n <= 1) return true;
    if (!knights && bishops.every(function (c) { return c === bishops[0]; })) return true;
    return false;
  };
  // Returns null while the game is going, otherwise {result, reason}.
  Pos.prototype.status = function () {
    if (!this.moves().length) {
      if (this.inCheck()) return { result: this.turn ? '1-0' : '0-1', reason: 'checkmate' };
      return { result: '1/2-1/2', reason: 'stalemate' };
    }
    if (this.half >= 100) return { result: '1/2-1/2', reason: '50-move rule' };
    if (this.repCount() >= 3) return { result: '1/2-1/2', reason: 'repetition' };
    if (this.insufficient()) return { result: '1/2-1/2', reason: 'insufficient material' };
    return null;
  };
  Pos.prototype.san = function (m) {
    var b = this.b, f = mFrom(m), t = mTo(m), p = b[f], ty = p & 7, s;
    if (mFlag(m) === FLAG_CASTLE) s = t > f ? 'O-O' : 'O-O-O';
    else {
      var cap = b[t] || mFlag(m) === FLAG_EP;
      if (ty === P) { s = (cap ? 'abcdefgh'[f & 7] + 'x' : '') + sqName(t); if (mPromo(m)) s += '=' + CHARS[mPromo(m)].toUpperCase(); }
      else {
        var all = this.moves(), sameF = false, sameR = false, other = false;
        for (var i = 0; i < all.length; i++) {
          var o = all[i], of = mFrom(o);
          if (of !== f && mTo(o) === t && b[of] === p) { other = true; if ((of & 7) === (f & 7)) sameF = true; if ((of >> 4) === (f >> 4)) sameR = true; }
        }
        var dis = '';
        if (other) dis = !sameF ? 'abcdefgh'[f & 7] : !sameR ? String(1 + (f >> 4)) : sqName(f);
        s = CHARS[ty].toUpperCase() + dis + (cap ? 'x' : '') + sqName(t);
      }
    }
    this.make(m);
    if (this.inCheck()) s += this.moves().length ? '+' : '#';
    this.unmake();
    return s;
  };
  Pos.prototype.parseSan = function (san) {
    var clean = san.replace(/[+#!?]+$/, '').replace(/0/g, 'O').replace(/e\.p\.$/, ''), all = this.moves();
    for (var i = 0; i < all.length; i++) if (this.san(all[i]).replace(/[+#]+$/, '') === clean) return all[i];
    return 0;
  };
  Pos.prototype.parseUci = function (u) {
    var all = this.moves();
    for (var i = 0; i < all.length; i++) if (uci(all[i]) === u) return all[i];
    return 0;
  };

  /* ---------- Evaluation ---------- */
  var VAL = [0, 100, 320, 330, 500, 900, 20000];
  function rows(a) { var o = new Int16Array(128); for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) o[r * 16 + f] = a[(7 - r) * 8 + f]; return o; }
  // Tables are written from White's view with rank 8 on the first row.
  var PST = [null,
    rows([0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0]),
    rows([-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50]),
    rows([-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20]),
    rows([0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0]),
    rows([-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20])];
  var KMG = rows([-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]);
  var KEG = rows([-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50]);
  var PASSED = [0, 5, 10, 20, 40, 70, 110, 0];
  var fileW = new Int32Array(8), fileB = new Int32Array(8);

  // Static score in centipawns from the side to move's view.
  function evaluate(pos) {
    var b = pos.b, score = 0, phase = 0, s, p, t, i;
    fileW.fill(0); fileB.fill(0);
    var nonPawnW = 0, nonPawnB = 0, bW = 0, bB = 0, pawnsW = 0, pawnsB = 0;
    for (s = 0; s < 120; s++) {
      if (s & 136) { s += 7; continue; }
      p = b[s]; if (!p) continue;
      t = p & 7;
      if (t === P) { if (p & BLACK) { fileB[s & 7] |= 1 << (s >> 4); pawnsB++; } else { fileW[s & 7] |= 1 << (s >> 4); pawnsW++; } continue; }
      if (t === K) continue;
      phase += t === Q ? 4 : t === R ? 2 : 1;
      if (p & BLACK) { nonPawnB += VAL[t]; if (t === B) bB++; } else { nonPawnW += VAL[t]; if (t === B) bW++; }
    }
    if (phase > 24) phase = 24;
    for (s = 0; s < 120; s++) {
      if (s & 136) { s += 7; continue; }
      p = b[s]; if (!p) continue;
      t = p & 7;
      var black = p & BLACK, sq = black ? ((7 - (s >> 4)) * 16 + (s & 7)) : s, v, f = s & 7, rk = s >> 4;
      if (t === K) {
        v = (KMG[sq] * phase + KEG[sq] * (24 - phase)) / 24 | 0;
        if (phase > 10) {
          var fwd = black ? -16 : 16, own = P | black, shield = 0;
          for (i = -1; i <= 1; i++) {
            var a = s + fwd + i, a2 = s + 2 * fwd + i;
            if (!(a & 136) && b[a] === own) shield += 10; else if (!(a2 & 136) && b[a2] === own) shield += 5; else shield -= 8;
          }
          v += shield;
        }
      } else {
        v = VAL[t] + PST[t][sq];
        if (t === P) {
          var mine = black ? fileB : fileW, theirs = black ? fileW : fileB;
          if (mine[f] & (mine[f] - 1)) v -= 10;
          if (!(f > 0 && mine[f - 1]) && !(f < 7 && mine[f + 1])) v -= 12;
          var ahead = black ? (1 << rk) - 1 : ~((2 << rk) - 1), block = theirs[f] | (f > 0 ? theirs[f - 1] : 0) | (f < 7 ? theirs[f + 1] : 0);
          if (!(block & ahead)) v += PASSED[black ? 7 - rk : rk] * (32 - phase) / 24 | 0;
        } else if (t === R) {
          var m1 = black ? fileB : fileW, o1 = black ? fileW : fileB;
          if (!m1[f]) v += o1[f] ? 12 : 22;
        }
        if (t === N || t === B || t === R) {
          var mob = 0;
          if (t === N) { for (i = 0; i < 8; i++) { var kt = s + KN[i]; if (!(kt & 136) && !(b[kt] && (b[kt] & BLACK) === black)) mob++; } v += (mob - 4) * 3; }
          else {
            var ds = t === B ? BD : RD;
            for (i = 0; i < 4; i++) { var dd = ds[i], tt = s + dd; while (!(tt & 136) && !b[tt]) { mob++; tt += dd; } }
            v += (mob - (t === B ? 6 : 7)) * 2;
          }
        }
      }
      score += black ? -v : v;
    }
    if (bW >= 2) score += 30;
    if (bB >= 2) score -= 30;
    // With no pawns left for the weaker side, drive its king to the edge and bring ours closer.
    if (phase <= 8 && Math.abs(nonPawnW - nonPawnB) >= 300) {
      var whiteAhead = nonPawnW > nonPawnB;
      if ((whiteAhead ? pawnsB : pawnsW) === 0) {
        var wk = pos.kings[whiteAhead ? 1 : 0], sk = pos.kings[whiteAhead ? 0 : 1];
        var cd = Math.max(3 - (wk >> 4), (wk >> 4) - 4) + Math.max(3 - (wk & 7), (wk & 7) - 4);
        var kd = Math.abs((wk >> 4) - (sk >> 4)) + Math.abs((wk & 7) - (sk & 7));
        var mop = cd * 12 + (14 - kd) * 5;
        score += whiteAhead ? mop : -mop;
      }
    }
    score += pos.turn ? -10 : 10;
    return pos.turn ? -score : score;
  }

  /* ---------- Search ---------- */
  var MATE = 30000, TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttKey = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttData = new Int32Array(TT_SIZE);
  var killers = [], histTable = new Int32Array(128 * 128);
  for (var kk = 0; kk < 128; kk++) killers[kk] = [0, 0];

  function Abort() {}
  var ctl = { nodes: 0, stopAt: 0, maxNodes: 0, pos: null };

  function see0(pos, m) { // Cheap capture ordering: victim value minus attacker value.
    var v = pos.b[mTo(m)], a = pos.b[mFrom(m)];
    return (v ? VAL[v & 7] : (mFlag(m) === FLAG_EP ? 100 : 0)) * 10 - VAL[a & 7] / 100 + (mPromo(m) ? VAL[mPromo(m)] : 0);
  }
  function order(pos, ms, ttm, ply) {
    var n = ms.length, sc = new Array(n), k = killers[ply] || [0, 0];
    for (var i = 0; i < n; i++) {
      var m = ms[i];
      if (m === ttm) sc[i] = 1e9;
      else if (pos.b[mTo(m)] || mPromo(m) || mFlag(m) === FLAG_EP) sc[i] = 1e7 + see0(pos, m);
      else if (m === k[0]) sc[i] = 9e6;
      else if (m === k[1]) sc[i] = 8e6;
      else sc[i] = histTable[(m & 127) * 128 + ((m >> 7) & 127)];
    }
    for (i = 1; i < n; i++) {
      var ms_ = ms[i], s_ = sc[i], j = i - 1;
      while (j >= 0 && sc[j] < s_) { ms[j + 1] = ms[j]; sc[j + 1] = sc[j]; j--; }
      ms[j + 1] = ms_; sc[j + 1] = s_;
    }
  }
  function tick() {
    if ((++ctl.nodes & 2047) === 0) {
      if (ctl.stopAt && Date.now() > ctl.stopAt) throw new Abort();
    }
    if (ctl.maxNodes && ctl.nodes > ctl.maxNodes) throw new Abort();
  }
  function qs(pos, a, beta, ply) {
    tick();
    var stand = evaluate(pos);
    if (ply > 60) return stand;
    if (stand >= beta) return beta;
    if (stand > a) a = stand;
    var ms = pos.gen(true), us = pos.turn;
    order(pos, ms, 0, 127);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], cap = pos.b[mTo(m)];
      if (stand + (cap ? VAL[cap & 7] : 100) + (mPromo(m) ? 800 : 0) + 200 < a) continue;
      pos.make(m);
      if (pos.attacked(pos.kings[us], 1 - us)) { pos.unmake(); continue; }
      var sc = -qs(pos, -beta, -a, ply + 1);
      pos.unmake();
      if (sc >= beta) return beta;
      if (sc > a) a = sc;
    }
    return a;
  }
  function isDrawn(pos) {
    if (pos.half >= 100) return true;
    var h = pos.hist;
    for (var i = h.length - 2, k = 0; i >= 0 && k < pos.half; i -= 2, k++) if (h[i] === pos.lo && h[i + 1] === pos.hi) return true;
    return false;
  }
  function hasPieces(pos) {
    var side = pos.turn ? BLACK : 0, b = pos.b;
    for (var s = 0; s < 120; s++) { if (s & 136) { s += 7; continue; } var p = b[s]; if (p && (p & BLACK) === side && (p & 7) !== P && (p & 7) !== K) return true; }
    return false;
  }
  function ab(pos, depth, a, beta, ply, allowNull) {
    if (ply && isDrawn(pos)) return 0;
    var us = pos.turn, check = pos.attacked(pos.kings[us], 1 - us);
    if (check) depth++;
    if (depth <= 0) return qs(pos, a, beta, ply);
    tick();
    if (ply > 100) return evaluate(pos);
    var idx = pos.lo & TT_MASK, ttm = 0;
    if (ttKey[idx] === pos.hi) {
      ttm = ttMove[idx];
      var d = ttData[idx], dd = d & 255, fl = (d >> 8) & 3, ts = d >> 10;
      if (dd >= depth && Math.abs(ts) < MATE - 200) {
        if (fl === 0) return ts;
        if (fl === 1 && ts >= beta) return ts;
        if (fl === 2 && ts <= a) return ts;
      }
    }
    var pvNode = beta - a > 1, stat = 0;
    if (!pvNode && !check) {
      stat = evaluate(pos);
      if (depth <= 3 && stat - 90 * depth >= beta && Math.abs(beta) < MATE - 200) return stat;
      if (allowNull && depth >= 3 && stat >= beta && hasPieces(pos)) {
        var oldEp = pos.ep, oldLo = pos.lo, oldHi = pos.hi;
        if (oldEp >= 0) { pos.lo ^= ZEL[oldEp]; pos.hi ^= ZEH[oldEp]; }
        pos.ep = -1; pos.turn = 1 - us; pos.lo ^= ZSL; pos.hi ^= ZSH;
        pos.half++;
        var ns;
        try { ns = -ab(pos, depth - 3 - (depth >> 3), -beta, -beta + 1, ply + 1, false); }
        finally { pos.half--; pos.turn = us; pos.ep = oldEp; pos.lo = oldLo; pos.hi = oldHi; }
        if (ns >= beta && Math.abs(ns) < MATE - 200) return beta;
      }
    }
    var ms = pos.gen(false), best = -MATE, bm = 0, a0 = a, legal = 0;
    order(pos, ms, ttm, ply);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], quiet = !pos.b[mTo(m)] && !mPromo(m) && mFlag(m) !== FLAG_EP;
      pos.make(m);
      if (pos.attacked(pos.kings[us], 1 - us)) { pos.unmake(); continue; }
      legal++;
      var sc;
      try {
        if (legal === 1) sc = -ab(pos, depth - 1, -beta, -a, ply + 1, true);
        else {
          var red = 0;
          if (depth >= 3 && legal > 3 && quiet && !check) red = 1 + (legal > 10 ? 1 : 0) + (depth > 6 ? 1 : 0);
          sc = -ab(pos, depth - 1 - red, -a - 1, -a, ply + 1, true);
          if (sc > a && (red || sc < beta)) sc = -ab(pos, depth - 1, -beta, -a, ply + 1, true);
        }
      } finally { pos.unmake(); }
      if (sc > best) { best = sc; bm = m; }
      if (sc > a) a = sc;
      if (a >= beta) {
        if (quiet) {
          var kl = killers[ply];
          if (kl && kl[0] !== m) { kl[1] = kl[0]; kl[0] = m; }
          var hk = (m & 127) * 128 + ((m >> 7) & 127);
          histTable[hk] = Math.min(histTable[hk] + depth * depth, 5e6);
        }
        break;
      }
    }
    if (!legal) return check ? -MATE + ply : 0;
    if (Math.abs(best) < MATE - 200) {
      ttKey[idx] = pos.hi; ttMove[idx] = bm;
      ttData[idx] = (Math.min(depth, 255)) | ((best <= a0 ? 2 : best >= beta ? 1 : 0) << 8) | (best << 10);
    }
    return best;
  }
  function extractPv(pos, first, maxLen) {
    var pv = [first], made = 0;
    pos.make(first); made++;
    while (pv.length < maxLen) {
      var idx = pos.lo & TT_MASK;
      if (ttKey[idx] !== pos.hi) break;
      var m = ttMove[idx];
      if (!m || pos.moves().indexOf(m) < 0 || isDrawn(pos)) break;
      pv.push(m); pos.make(m); made++;
    }
    while (made--) pos.unmake();
    return pv;
  }
  /* Searches with iterative deepening.
     opts: depth, timeMs, multipv, maxNodes. Returns {lines:[{move, score, pv}], depth, nodes}, scores from the mover's view. */
  function search(pos, opts) {
    opts = opts || {};
    var maxDepth = opts.depth || 64, multi = Math.max(1, opts.multipv || 1);
    ctl.nodes = 0; ctl.maxNodes = opts.maxNodes || 0; ctl.stopAt = opts.timeMs ? Date.now() + opts.timeMs : 0;
    histTable.fill(0);
    for (var ki = 0; ki < 128; ki++) { killers[ki][0] = 0; killers[ki][1] = 0; }
    var root = pos.moves(), result = { lines: [], depth: 0, nodes: 0 };
    if (!root.length) return result;
    multi = Math.min(multi, root.length);
    var scores = {}, stackLen = pos.stack.length, histLen = pos.hist.length;
    root.forEach(function (m) { scores[m] = -MATE; });
    // A snapshot lets an aborted search restore the position even mid-move.
    var snap = { b: pos.b.slice(), kings: pos.kings.slice(), turn: pos.turn, castle: pos.castle, ep: pos.ep, half: pos.half, full: pos.full, lo: pos.lo, hi: pos.hi };
    try {
      for (var depth = 1; depth <= maxDepth; depth++) {
        var excluded = [], lines = [];
        for (var pv = 0; pv < multi; pv++) {
          var a = -MATE - 1, beta = MATE + 1, best = -MATE - 1, bm = 0, cands = root.filter(function (m) { return excluded.indexOf(m) < 0; });
          cands.sort(function (x, y) { return scores[y] - scores[x]; });
          for (var i = 0; i < cands.length; i++) {
            var m = cands[i], sc;
            pos.make(m);
            try {
              if (i === 0) sc = -ab(pos, depth - 1, -beta, -a, 1, true);
              else {
                sc = -ab(pos, depth - 1, -a - 1, -a, 1, true);
                if (sc > a) sc = -ab(pos, depth - 1, -beta, -a, 1, true);
              }
            } finally { pos.unmake(); }
            scores[m] = sc;
            if (sc > best) { best = sc; bm = m; }
            if (sc > a) a = sc;
          }
          excluded.push(bm);
          lines.push({ move: bm, score: best, pv: extractPv(pos, bm, 12) });
        }
        lines.sort(function (x, y) { return y.score - x.score; });
        result.lines = lines; result.depth = depth;
        if (multi === 1 && Math.abs(lines[0].score) > MATE - 100 && MATE - Math.abs(lines[0].score) <= depth) break;
        if (root.length === 1 && depth >= 4 && multi === 1) break;
      }
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
      pos.b.set(snap.b); pos.kings = snap.kings; pos.turn = snap.turn; pos.castle = snap.castle; pos.ep = snap.ep; pos.half = snap.half; pos.full = snap.full; pos.lo = snap.lo; pos.hi = snap.hi;
      pos.stack.length = stackLen; pos.hist.length = histLen;
      if (!result.lines.length) result.lines = root.slice(0, multi).map(function (m) { return { move: m, score: 0, pv: [m] }; });
    }
    result.nodes = ctl.nodes;
    return result;
  }
  function mateIn(score) { return Math.abs(score) > MATE - 200 ? Math.ceil((MATE - Math.abs(score)) / 2) * (score > 0 ? 1 : -1) : 0; }
  // Serves a request of {fen, moves:[uci], depth, timeMs, multipv} and returns plain, transferable data.
  function analyzeRequest(req) {
    var pos = new Pos(req.fen);
    (req.moves || []).forEach(function (u) { var m = pos.parseUci(u); if (m) pos.make(m); });
    var r = search(pos, req);
    return {
      depth: r.depth, nodes: r.nodes,
      lines: r.lines.map(function (l) { return { uci: uci(l.move), score: l.score, mate: mateIn(l.score), pv: l.pv.map(uci) }; })
    };
  }
  return {
    Pos: Pos, START: START, P: P, N: N, B: B, R: R, Q: Q, K: K, BLACK: BLACK, VAL: VAL, MATE: MATE,
    sqName: sqName, sqIdx: sqIdx, uci: uci, mFrom: mFrom, mTo: mTo, mPromo: mPromo, mFlag: mFlag,
    evaluate: evaluate, search: search, mateIn: mateIn, analyzeRequest: analyzeRequest
  };
})();
if (typeof module !== 'undefined') module.exports = Tempo;
