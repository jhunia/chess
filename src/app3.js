/* Screens, part 3: analysis, board setup, game review, tutor chat, archive, stats, settings and routing. */
VIEWS.analysis = function (a) {
  a = a || {};
  var start = a.fen || T.START, line = (a.moves || []).slice(), cur = line.length, token = 0, pos, flip;
  function buildPos() { pos = posAfter(start, line, cur); }
  buildPos();
  flip = a.flip !== undefined ? a.flip : pos.turn === 1;
  main.innerHTML = '<div class="page wide">' + topBar('Analysis') + '<div class="board-wrap"><div class="evalbar" id="ev"><i style="height:50%"></i></div><div id="bd"></div></div><div style="display:flex;flex-direction:column;gap:10px;min-width:0"><div class="moves" id="al"></div><div class="tools"><button class="btn tool" data-a="start">Start</button><button class="btn tool" data-a="prev">Back</button><button class="btn tool" data-a="next">Next</button><button class="btn tool" data-a="flip">Flip</button></div><div class="card"><div class="row"><h3 class="grow">Engine</h3><span class="small muted" id="ad"></span></div><div id="ln" class="small" style="display:flex;flex-direction:column;gap:6px;font-variant-numeric:tabular-nums"></div></div><div class="grid2"><button class="btn" data-a="bot">Play from here</button><button class="btn" data-a="edit">Set up board</button><button class="btn" data-a="load">Load FEN or PGN</button><button class="btn" data-a="copy">Copy FEN</button></div></div></div>';
  var board = new Board($('#bd'), { flip: flip, dests: function (s) { return legalDests(pos, s); }, onMove: function (u) { line = line.slice(0, cur); line.push(u); cur++; pos.make(pos.parseUci(u)); sfx.move(); draw(); } });
  function draw() {
    board.setPos(pos);
    var u = cur ? line[cur - 1] : null;
    board.setState({ last: u ? [u.slice(0, 2), u.slice(2, 4)] : [], check: checkSq(pos), arrows: [] });
    var q = new T.Pos(start), h = '';
    line.forEach(function (x, i) { var m = q.parseUci(x); if (q.turn === 0 || !i) h += '<span>' + q.full + (q.turn ? '…' : '.') + '</span>'; h += '<button data-ai="' + (i + 1) + '" class="' + (i + 1 === cur ? 'on' : '') + '">' + esc(q.san(m)) + '</button>'; q.make(m); });
    $('#al').innerHTML = h || '<span class="muted">Make a move on the board</span>';
    run();
  }
  function setBar(w) { $('#ev').classList.toggle('flip', flip); $('#ev').firstChild.style.height = w + '%'; }
  function run() {
    var t = ++token, st = pos.status(), ms = line.slice(0, cur);
    Engine.cancel();
    if (st) { $('#ln').textContent = 'Game over by ' + st.reason + '.'; $('#ad').textContent = ''; setBar(st.result === '1-0' ? 100 : st.result === '0-1' ? 0 : 50); return; }
    $('#ln').textContent = 'Thinking…';
    (function stage(time, more) {
      Engine.analyze({ fen: start, moves: ms, timeMs: time, multipv: 3 }).then(function (r) {
        if (!r || t !== token || !r.lines.length) return;
        var black = pos.turn === 1;
        $('#ad').textContent = 'Depth ' + r.depth;
        $('#ln').innerHTML = r.lines.map(function (l) { return '<div class="row" style="align-items:flex-start"><span class="badge" style="flex:none;min-width:48px;text-align:center">' + evalText(l, black) + '</span><span style="overflow-wrap:anywhere">' + esc(pvSan(start, ms, l.pv, 7)) + '</span></div>'; }).join('');
        var w = wpOf(r.lines[0]); setBar(black ? 100 - w : w);
        var b = r.lines[0].uci; board.setState({ arrows: [[b.slice(0, 2), b.slice(2, 4), 'rgba(47,158,95,.75)']] });
        if (more > 0) stage(time * 3, more - 1);
      });
    })(400, 2);
  }
  function showText(t) { sheet('<h2>Copy this text</h2><textarea rows="3" readonly aria-label="Text to copy">' + esc(t) + '</textarea>'); }
  var el = main, H = function (e) {
    var ai = e.target.closest('[data-ai]');
    if (ai) { cur = +ai.dataset.ai; buildPos(); draw(); return; }
    var b = e.target.closest('[data-a]'); if (!b) return;
    var k = b.dataset.a;
    if (k === 'start') { cur = 0; buildPos(); draw(); }
    if (k === 'prev' && cur > 0) { cur--; buildPos(); draw(); }
    if (k === 'next' && cur < line.length) { cur++; buildPos(); draw(); }
    if (k === 'flip') { flip = !flip; board.setFlip(flip); run(); }
    if (k === 'bot') { if (pos.status()) return toast('The game is already over in this position.'); go('game', { mode: 'bot', bot: setup.bot, color: pos.turn, start: pos.fen(), moves: [], time: 0, coach: true }); }
    if (k === 'copy') { var f = pos.fen(); if (navigator.clipboard) navigator.clipboard.writeText(f).then(function () { toast('FEN copied'); }, function () { showText(f); }); else showText(f); }
    if (k === 'edit') go('editor', { fen: pos.fen() });
    if (k === 'load') {
      var m = sheet('<h2>Load a position or game</h2><p class="small muted">Paste a FEN or a PGN.</p><textarea id="lt" rows="5" aria-label="FEN or PGN"></textarea><p class="small" id="le" style="color:var(--bad)" hidden></p><button class="btn primary big" data-ld>Load</button>');
      $('[data-ld]', m).onclick = function () {
        var res = parseGameText($('#lt', m).value);
        if (res.error) { var le = $('#le', m); le.textContent = res.error; le.hidden = false; return; }
        m.remove(); go('analysis', { fen: res.start, moves: res.moves }, { replace: true });
      };
    }
  };
  el.addEventListener('click', H); cleanup = function () { token++; el.removeEventListener('click', H); };
  draw();
};
function parseGameText(text) {
  var s = text.trim();
  if (!s) return { error: 'Paste a FEN or PGN first.' };
  if (/^[1-8pnbrqkPNBRQK]+(\/[1-8pnbrqkPNBRQK]+){7}\s+[wb]\b/.test(s)) {
    try { var p = new T.Pos(s); if (p.inCheck(1 - p.turn)) return { error: 'In that FEN the side not to move is in check.' }; return { start: p.fen(), moves: [] }; } catch (e) { return { error: e.message + '. Check the FEN and try again.' }; }
  }
  var fm = s.match(/\[FEN\s+"([^"]+)"\]/), start = fm ? fm[1] : T.START;
  var body = s.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ');
  var toks = body.trim().split(/\s+/).filter(Boolean), q, out = [];
  try { q = new T.Pos(start); } catch (e) { return { error: 'The FEN inside that PGN is not valid.' }; }
  for (var i = 0; i < toks.length; i++) { var m = q.parseSan(toks[i]); if (!m) return { error: 'Could not read move ' + (i + 1) + ': ' + toks[i] + '.' }; out.push(T.uci(m)); q.make(m); }
  if (!out.length) return { error: 'No moves found in that text.' };
  return { start: start, moves: out };
}
VIEWS.editor = function (a) {
  var src = new T.Pos(a.fen), cells = {}, tool = 'wK', turn = src.turn;
  function fill(p) { cells = {}; for (var s = 0; s < 120; s++) { if (s & 136) { s += 7; continue; } var pc = p.b[s]; if (pc) cells[T.sqName(s)] = (pc & 8 ? 'b' : 'w') + ' PNBRQK'[pc & 7]; } }
  fill(src);
  main.innerHTML = '<div class="page">' + topBar('Set up board') + '<div id="bd"></div><div class="palette" id="pl"></div><div class="chips"><button class="chip" data-ed="w">White to move</button><button class="chip" data-ed="b">Black to move</button><button class="chip" data-ed="clear">Clear board</button><button class="chip" data-ed="start">Starting position</button></div><p class="small" id="ee" style="color:var(--bad)" role="alert" hidden></p><button class="btn primary big" data-ed="done">Analyse this position</button></div>';
  function fen() {
    var o = '';
    for (var r = 8; r >= 1; r--) { var e = 0; for (var f = 0; f < 8; f++) { var c = cells['abcdefgh'[f] + r]; if (!c) { e++; continue; } if (e) { o += e; e = 0; } o += c[0] === 'w' ? c[1] : c[1].toLowerCase(); } if (e) o += e; if (r > 1) o += '/'; }
    var cs = (cells.e1 === 'wK' && cells.h1 === 'wR' ? 'K' : '') + (cells.e1 === 'wK' && cells.a1 === 'wR' ? 'Q' : '') + (cells.e8 === 'bK' && cells.h8 === 'bR' ? 'k' : '') + (cells.e8 === 'bK' && cells.a8 === 'bR' ? 'q' : '');
    return o + ' ' + (turn ? 'b' : 'w') + ' ' + (cs || '-') + ' - 0 1';
  }
  var board = new Board($('#bd'), { onTap: function (sq) { if (tool === 'x' || cells[sq] === tool) delete cells[sq]; else cells[sq] = tool; paint(); } });
  function paint() {
    var fake = { b: new Uint8Array(128) }; // Partial boards may lack kings, so draw from a bare array.
    Object.keys(cells).forEach(function (k) { var c = cells[k]; fake.b[T.sqIdx(k)] = 'PNBRQK'.indexOf(c[1]) + 1 + (c[0] === 'b' ? 8 : 0); });
    board.setPos(fake);
    $('#pl').innerHTML = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'x', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'].map(function (c) { return '<button class="' + (tool === c ? 'on' : '') + '" data-tool="' + c + '" aria-label="' + (c === 'x' ? 'Eraser' : (c[0] === 'w' ? 'White ' : 'Black ') + PIECE_NAME[' PNBRQK'.indexOf(c[1])]) + '">' + (c === 'x' ? '✕' : pieceSvg(c)) + '</button>'; }).join('');
    document.querySelectorAll('[data-ed="w"],[data-ed="b"]').forEach(function (b) { b.classList.toggle('on', (b.dataset.ed === 'b') === (turn === 1)); });
  }
  var el = main, H = function (e) {
    var t = e.target.closest('[data-tool]'); if (t) { tool = t.dataset.tool; paint(); return; }
    var d = e.target.closest('[data-ed]'); if (!d) return;
    var k = d.dataset.ed;
    if (k === 'w') turn = 0; if (k === 'b') turn = 1;
    if (k === 'clear') cells = {};
    if (k === 'start') { fill(new T.Pos()); turn = 0; }
    if (k === 'done') {
      var ee = $('#ee'), f = fen();
      try {
        var ks = Object.keys(cells).filter(function (x) { return cells[x] === 'wK'; }).length, kb = Object.keys(cells).filter(function (x) { return cells[x] === 'bK'; }).length;
        if (ks !== 1 || kb !== 1) throw new Error('Each side needs exactly one king.');
        if (Object.keys(cells).some(function (x) { return cells[x][1] === 'P' && (x[1] === '1' || x[1] === '8'); })) throw new Error('Pawns cannot stand on the first or last rank.');
        var np = new T.Pos(f);
        if (np.inCheck(1 - np.turn)) throw new Error('The side that is not moving cannot be in check. Switch whose move it is.');
        go('analysis', { fen: f, moves: [] }, { replace: true });
      } catch (err) { ee.textContent = err.message; ee.hidden = false; }
      return;
    }
    paint();
  };
  el.addEventListener('click', H); cleanup = function () { el.removeEventListener('click', H); };
  paint();
};

/* ---------- Game review ---------- */
var PERF = [[0, 200], [40, 300], [50, 450], [60, 700], [70, 950], [80, 1350], [85, 1600], [90, 1900], [95, 2300], [100, 2700]];
function perfRating(acc) { for (var i = 1; i < PERF.length; i++) if (acc <= PERF[i][0]) { var a = PERF[i - 1], b = PERF[i]; return Math.round(a[1] + (b[1] - a[1]) * (acc - a[0]) / (b[0] - a[0])); } return 2700; }
var KEY = ['blunder', 'mistake', 'miss', 'brilliant', 'great'];
VIEWS.review = function (g) {
  main.innerHTML = '<div class="page">' + topBar('Game review') + '<div class="card"><h2>Checking your game…</h2><div class="bar"><i id="rb" style="width:0"></i></div><p class="small muted">The engine looks at every position in turn. This takes about a third of a second per move.</p></div></div>';
  var dead = false; cleanup = function () { dead = true; };
  if (g.review && g.review.length === g.moves.length) return showReview(g);
  if (!g.moves.length) { g.review = []; return showReview(g); }
  var res = [], analysis = [], p = new T.Pos(g.start), sans = [], i = 0, prevLoss = [0, 0];
  (function stepA() {
    if (dead) return;
    var q = posAfter(g.start, g.moves, i), st = q.moves().length ? null : (q.inCheck() ? 'mate' : 'draw');
    var job = st ? Promise.resolve({ lines: [] }) : Engine.analyze({ fen: g.start, moves: g.moves.slice(0, i), timeMs: 320, depth: 16, multipv: 2 });
    job.then(function (r) {
      if (dead || !r) return;
      analysis[i] = r;
      var bar = $('#rb'); if (bar) bar.style.width = (i / g.moves.length * 100) + '%';
      if (i > 0) {
        var u = g.moves[i - 1], before = analysis[i - 1], mv = p.parseUci(u), mover = p.turn;
        var san = p.san(mv); sans.push(san);
        var v = judge(p, u, before, r, st, prevLoss[1 - mover], g.start === T.START && inBook(sans));
        res.push({ c: v.cls, a: Math.round(v.acc), w: Math.round(mover ? 100 - v.wp : v.wp), b: before.lines[0].uci, x: explain(p, u, before, r, v), s: san });
        prevLoss[mover] = v.loss;
        p.make(mv);
      }
      if (i >= g.moves.length) { g.review = res; save(); if (!dead) showReview(g); return; }
      i++; stepA();
    });
  })();
};
function showReview(g) {
  var R = g.review, n = 0, flip = g.color === 1, best = false, c = coachOf(), t0 = new T.Pos(g.start).turn;
  var side = [0, 1].map(function (s) { var xs = R.filter(function (_, i) { return (t0 + i) % 2 === s; }); return { acc: xs.length ? xs.reduce(function (a, b) { return a + b.a; }, 0) / xs.length : 0, xs: xs }; });
  var counts = CLASS_ORDER.map(function (k) { return [k, side[0].xs.filter(function (x) { return x.c === k; }).length, side[1].xs.filter(function (x) { return x.c === k; }).length]; }).filter(function (r) { return r[1] + r[2] > 0; });
  var pts = '0,30 ' + R.map(function (r, i) { return ((i + 1) / R.length * 300).toFixed(1) + ',' + (60 - r.w * .6).toFixed(1); }).join(' ');
  var keys = R.filter(function (r) { return KEY.indexOf(r.c) >= 0; }).length;
  main.innerHTML = '<div class="page wide">' + topBar('Game review') + '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div id="bd"></div><svg class="graph" viewBox="0 0 300 60" preserveAspectRatio="none" role="img" aria-label="Winning chances for White through the game"><rect width="300" height="60" fill="#2b2d30"/><polygon points="0,60 ' + pts + ' 300,60" fill="#f2efe5"/><line id="gl" y1="0" y2="60" stroke="#35c49c" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="moves" id="rm"></div><div class="tools"><button class="btn tool" data-r="first">Start</button><button class="btn tool" data-r="prev">Back</button><button class="btn tool" data-r="next">Next</button><button class="btn tool" id="rbest" data-r="best">Best move</button><button class="btn tool" data-r="key">Key move</button></div></div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;min-width:0"><div class="bubble">' + avatar(c.name, c.color, 36) + '<div class="tx" id="rx" role="status"></div></div><div class="card"><div class="grid2"><div><span class="eyebrow">' + esc(g.white) + '</span><div style="font:700 26px var(--display)">' + side[0].acc.toFixed(1) + '%</div><span class="small muted">Played like ' + perfRating(side[0].acc) + '</span></div><div><span class="eyebrow">' + esc(g.black) + '</span><div style="font:700 26px var(--display)">' + side[1].acc.toFixed(1) + '%</div><span class="small muted">Played like ' + perfRating(side[1].acc) + '</span></div></div><table class="tbl"><tbody>' + counts.map(function (r) { return '<tr><td><span class="c-' + r[0] + ' cl-tag">' + CLASSES[r[0]].label + '</span></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</tbody></table><p class="small muted">' + keys + ' key moments. ' + (g.opening ? 'Opening: ' + esc(g.opening) + '. ' : '') + 'Result ' + esc(g.result) + ' by ' + esc(g.reason) + '. Accuracy and “played like” ratings are estimates from the engine.</p></div><div class="grid2"><button class="btn" data-r="ana">Open in analysis</button><button class="btn" data-r="pgn">Copy PGN</button></div>' + (sampleFn ? '<button class="btn" data-r="ask">Ask ' + esc(c.name) + ' about this game</button>' : '') + '</div></div>';
  var board = new Board($('#bd'), { flip: flip });
  function show() {
    var p = posAfter(g.start, g.moves, n);
    board.setPos(p);
    var r = n ? R[n - 1] : null, u = n ? g.moves[n - 1] : null, st = { last: u ? [u.slice(0, 2), u.slice(2, 4)] : [], check: checkSq(p), arrows: [], badge: null };
    if (r) { st.badge = { sq: u.slice(2, 4), color: CLASSES[r.c].color, text: CLASSES[r.c].sym }; if (best && r.b !== u) st.arrows = [[r.b.slice(0, 2), r.b.slice(2, 4), 'rgba(47,158,95,.85)']]; }
    board.setState(st);
    $('#rx').innerHTML = r ? '<strong>' + esc(r.s) + '</strong> <span class="cl-tag c-' + r.c + '">' + CLASSES[r.c].label + '</span><br>' + esc(r.x) : (R.length ? 'Your game has been checked. Step through it or jump to the key moments.' : 'No moves were played in this game.');
    var h = ''; R.forEach(function (x, i) { if ((t0 + i) % 2 === 0 || !i) h += '<span>' + (Math.floor((i + t0) / 2) + 1) + ((t0 + i) % 2 ? '…' : '.') + '</span>'; var mark = KEY.indexOf(x.c) >= 0 || x.c === 'inaccuracy' ? '<span class="c-' + x.c + '" style="padding:0 0 0 2px">' + CLASSES[x.c].sym + '</span>' : ''; h += '<button data-ri="' + (i + 1) + '" class="' + (i + 1 === n ? 'on' : '') + '">' + esc(x.s) + mark + '</button>'; });
    var rm = $('#rm'); rm.innerHTML = h; var on = $('.on', rm); if (on) rm.scrollLeft = on.offsetLeft - rm.clientWidth / 2;
    var x = R.length ? n / R.length * 300 : 0, gl = $('#gl'); gl.setAttribute('x1', x); gl.setAttribute('x2', x);
    $('#rbest').classList.toggle('on', best);
  }
  function copyPgn() { var t = pgnOf(g), fb = function () { sheet('<h2>Copy this PGN</h2><textarea rows="7" readonly aria-label="PGN">' + esc(t) + '</textarea>'); }; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('PGN copied'); }, fb); else fb(); }
  var el = main, H = function (e) {
    var ri = e.target.closest('[data-ri]'); if (ri) { n = +ri.dataset.ri; show(); return; }
    var b = e.target.closest('[data-r]'); if (!b) return;
    var k = b.dataset.r;
    if (k === 'first') n = 0;
    if (k === 'prev' && n) n--;
    if (k === 'next' && n < R.length) n++;
    if (k === 'best') best = !best;
    if (k === 'key') { var found = -1; for (var i = n; i < R.length; i++) if (KEY.indexOf(R[i].c) >= 0) { found = i; break; } if (found < 0) { toast('No more key moments. Back to the start.'); n = 0; } else n = found + 1; }
    if (k === 'ana') return go('analysis', { fen: g.start, moves: g.moves, flip: flip });
    if (k === 'pgn') return copyPgn();
    if (k === 'ask') return openChat('The student wants to discuss a finished game. They played ' + (g.color === 1 ? 'Black' : 'White') + '. PGN: ' + pgnOf(g) + ' Engine verdicts by move: ' + R.map(function (x) { return x.s + ' (' + x.c + ')'; }).join(', ') + '.');
    show();
  };
  el.addEventListener('click', H);
  cleanup = function () { el.removeEventListener('click', H); };
  show();
}

/* ---------- Tutor chat (needs the Claude sample capability) ---------- */
function coachPrompt(context, history) {
  var c = coachOf();
  return c.prompt + ' You work inside a chess training app. Keep replies under 120 words unless asked for more. Use standard algebraic notation. Only state concrete variations that the supplied position and engine data support, and say plainly when you are unsure. The student\'s puzzle rating is ' + Math.round(S.puzzle.r) + ' and their playing estimate is ' + S.elo + '.' + (context ? ' Context: ' + context : '') + '\n\nConversation so far:\n' + history.map(function (m) { return (m.me ? 'Student: ' : 'Coach: ') + m.t; }).join('\n') + '\n\nReply as the coach, in plain text without markdown.';
}
function chatUI(root, context, history) {
  var busy = false;
  root.innerHTML = '<div class="chat" id="cl" aria-live="polite"></div>' + (sampleFn ? '<form id="cf" class="row"><input id="ci" class="grow" placeholder="Ask about chess" autocomplete="off" aria-label="Your question"><button class="btn primary" type="submit">Send</button></form>' : '<p class="small muted">Free chat works when Tempo is opened from its Claude link. Move explanations, hints and reviews work everywhere.</p>');
  function draw(extra) { var l = $('#cl', root); l.innerHTML = history.map(function (m) { return '<div class="msg ' + (m.me ? 'me' : 'them') + '">' + esc(m.t) + '</div>'; }).join('') + (extra ? '<div class="msg them">' + esc(extra) + '</div>' : ''); var sc = root.closest('.sheet') || main; sc.scrollTop = sc.scrollHeight; }
  draw();
  var f = $('#cf', root);
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('#ci', root), q = inp.value.trim();
    if (!q || busy) return;
    busy = true; inp.value = ''; history.push({ me: true, t: q }); draw('Thinking…');
    sampleFn(coachPrompt(context, history), { cache: false, onText: function (u) { if (u.text) draw(u.text); } }).then(function (r) { history.push({ t: r.text }); draw(); }).catch(function (err) {
      var code = err && err.code;
      history.push({ t: code === 'rate_limited' ? 'Too many questions at once. Wait a minute, then ask again.' : code === 'not_granted' ? 'Chat permission was declined, so I cannot answer here. You can allow it from this page\'s Permissions menu.' : 'That question did not go through. Please send it again.' }); draw();
    }).then(function () { busy = false; });
  });
}
function openChat(context) { var c = coachOf(), m = sheet('<div class="row">' + avatar(c.name, c.color, 40) + '<h2 class="grow">' + esc(c.name) + '</h2><button class="btn" data-x>Close</button></div><div id="cu" style="display:flex;flex-direction:column;gap:10px"></div>'); $('[data-x]', m).onclick = function () { m.remove(); }; chatUI($('#cu', m), context, [{ t: 'What would you like to know about this position?' }]); }
var chatHistory = null;
VIEWS.coach = function () {
  var c = coachOf(); chatHistory = chatHistory || [{ t: 'Hi, I am ' + c.name + '. Ask me anything: an opening, a plan, or why a move is bad.' }];
  var th = S.puzzle.themes, weak = Object.keys(th).filter(function (t) { return th[t][1] >= 3 && THEME_NAMES[t]; }).sort(function (a, b) { return th[a][0] / th[a][1] - th[b][0] / th[b][1]; })[0];
  main.innerHTML = '<div class="page">' + topBar('Your tutor') + '<div class="list">' + COACHES.map(function (x) { return '<button class="item" data-coach="' + x.id + '">' + avatar(x.name, x.color, 44) + '<div class="grow"><h3>' + esc(x.name) + '</h3><span class="small muted">' + esc(x.style) + '</span></div>' + (x.id === c.id ? '<span style="color:var(--accent)" aria-label="Selected">●</span>' : '') + '</button>'; }).join('') + '</div>' + (weak ? '<button class="card" data-weak="' + weak + '"><span class="eyebrow">Suggested practice</span><h3>Your weakest puzzle theme: ' + esc(THEME_NAMES[weak]) + '</h3><span class="small muted">' + th[weak][0] + ' of ' + th[weak][1] + ' solved. Tap to train it.</span></button>' : '') + '<div id="cu" style="display:flex;flex-direction:column;gap:10px"></div></div>';
  chatUI($('#cu'), 'General chess conversation.', chatHistory);
};

/* ---------- More, archive, stats, settings ---------- */
VIEWS.more = function () {
  main.innerHTML = '<div class="page"><h1>More</h1><div class="list">' + [['coach', 'Your tutor', 'Choose a coach and chat'], ['analysis', 'Analysis board', 'Engine lines, FEN and PGN'], ['drills', 'Endgame drills', 'Practise against the engine'], ['openings', 'Opening explorer', 'Browse and practise lines'], ['vision', 'Vision trainer', 'Learn the coordinates'], ['archive', 'Game archive', S.games.length + ' saved games'], ['stats', 'Stats and awards', 'Your progress at a glance'], ['settings', 'Settings', 'Board, sound and appearance']].map(function (x) { return '<button class="item" data-go="' + x[0] + '"><div class="grow"><h3>' + x[1] + '</h3><span class="small muted">' + x[2] + '</span></div><span class="chev">›</span></button>'; }).join('') + '</div></div>';
};
VIEWS.archive = function () {
  main.innerHTML = '<div class="page">' + topBar('Game archive') + (S.games.length ? '<div class="list">' + S.games.map(function (g, i) { var r = g.color < 0 ? g.result : g.outcome === 1 ? 'Won' : g.outcome === 0 ? 'Lost' : 'Draw'; return '<button class="item" data-game="' + i + '"><div class="grow"><h3>' + esc(g.white) + ' vs ' + esc(g.black) + '</h3><span class="small muted">' + esc(g.date) + ' · ' + Math.ceil(g.moves.length / 2) + ' moves' + (g.opening ? ' · ' + esc(g.opening) : '') + (g.review ? ' · Reviewed' : '') + '</span></div><span class="badge">' + r + '</span><span class="chev">›</span></button>'; }).join('') + '</div>' : '<div class="card"><h2>No games yet</h2><p class="muted">Finished games appear here, ready for review.</p><button class="btn primary" data-tab="play">Play a bot</button></div>') + '</div>';
};
function awards() {
  var ls = Object.keys(S.lessons).length, wins = Object.keys(S.botWins), g = S.games.length, total = COURSES.reduce(function (a, c) { return a + c.lessons.length; }, 0);
  return [['First game', 'Finish a game', g >= 1], ['First win', 'Beat any bot', wins.length >= 1], ['Giant killer', 'Beat a bot rated 1500 or more', wins.some(function (id) { var b = botById(id); return b && b.rating >= 1500; })], ['Bot collector', 'Beat five different bots', wins.length >= 5], ['Student', 'Finish 5 lessons', ls >= 5], ['Scholar', 'Finish every lesson', ls >= total], ['Puzzler', 'Solve 25 puzzles', S.puzzle.won >= 25], ['Puzzle master', 'Solve 200 puzzles', S.puzzle.won >= 200], ['Rusher', 'Score 15 in Puzzle Rush', Math.max(S.rush[3], S.rush[5], S.rush.survival) >= 15], ['Sharp eye', 'Reach a 1500 puzzle rating', S.puzzle.r >= 1500], ['Regular', 'Train 7 days in a row', S.daily.best >= 7], ['Endgame ready', 'Complete 3 drills', Object.keys(S.drills).length >= 3], ['Board sense', 'Score 20 in the vision trainer', S.vision >= 20]];
}
VIEWS.stats = function () {
  var gs = S.games.filter(function (g) { return g.color >= 0; }), w = gs.filter(function (g) { return g.outcome === 1; }).length, l = gs.filter(function (g) { return g.outcome === 0; }).length, d = gs.length - w - l, a = awards();
  main.innerHTML = '<div class="page">' + topBar('Stats and awards') + '<div class="grid2"><div class="tile"><span class="eyebrow">Playing estimate</span><span class="num">' + S.elo + '</span><span class="small muted">From results against bots</span></div><div class="tile"><span class="eyebrow">Puzzle rating</span><span class="num">' + Math.round(S.puzzle.r) + '</span><span class="small muted">' + S.puzzle.won + ' solved</span></div><div class="tile"><span class="eyebrow">Record</span><span class="num">' + w + '–' + l + '–' + d + '</span><span class="small muted">Wins, losses, draws</span></div><div class="tile"><span class="eyebrow">Best streak</span><span class="num">' + S.daily.best + '</span><span class="small muted">Days in a row</span></div></div><h2>Awards: ' + a.filter(function (x) { return x[2]; }).length + ' of ' + a.length + '</h2><div class="list">' + a.map(function (x) { return '<div class="item"><span style="width:20px;text-align:center;color:' + (x[2] ? 'var(--good)' : 'var(--muted)') + '">' + (x[2] ? '✓' : '○') + '</span><div class="grow"><h3 style="' + (x[2] ? '' : 'color:var(--muted)') + '">' + x[0] + '</h3><span class="small muted">' + x[1] + '</span></div></div>'; }).join('') + '</div></div>';
};
function applyTheme() { var t = S.settings.theme; if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }
VIEWS.settings = function () {
  var st = S.settings, tgl = function (k, l, sub) { return '<button class="item" data-tg="' + k + '" role="switch" aria-checked="' + !!st[k] + '"><div class="grow"><h3>' + l + '</h3><span class="small muted">' + sub + '</span></div><span class="chip ' + (st[k] ? 'on' : '') + '">' + (st[k] ? 'On' : 'Off') + '</span></button>'; };
  main.innerHTML = '<div class="page">' + topBar('Settings') + '<div class="card"><label for="nm" class="eyebrow">Your name</label><input id="nm" value="' + esc(S.name) + '" maxlength="24"></div><div class="eyebrow">Board colours</div><div class="chips">' + Object.keys(BOARD_THEMES).map(function (k) { return '<button class="chip ' + (st.board === k ? 'on' : '') + '" data-bt="' + k + '"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:6px;background:' + BOARD_THEMES[k][1] + '"></span>' + BOARD_THEMES[k][2] + '</button>'; }).join('') + '</div><div id="pv"></div><div class="eyebrow">Appearance</div><div class="chips">' + [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(function (x) { return '<button class="chip ' + (st.theme === x[0] ? 'on' : '') + '" data-th="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="list">' + tgl('sound', 'Sound', 'Move and result sounds') + tgl('coords', 'Coordinates', 'Show file and rank labels') + tgl('autoQueen', 'Always promote to queen', 'Skip the promotion picker') + tgl('speak', 'Read lessons aloud', 'Uses your device\'s voice') + '</div><div class="list"><button class="item" data-reset><div class="grow"><h3 style="color:var(--bad)">Reset all progress</h3><span class="small muted">Clears ratings, lessons and saved games</span></div></button></div></div>';
  new Board($('#pv')).setPos(new T.Pos('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'));
  $('#nm').onchange = function (e) { S.name = e.target.value.trim() || 'You'; save(); };
};

/* ---------- Taps anywhere in the app ---------- */
function routes(e) {
  var t = e.target, el;
  if (t.closest('[data-back]')) return back();
  if ((el = t.closest('[data-tab]'))) return go(el.dataset.tab, null, { root: true });
  if ((el = t.closest('[data-go]'))) {
    var g = el.dataset.go;
    if (g === 'daily') return go('solve', { z: dailyPuzzle(), daily: true });
    if (g === 'resume') return go('game', S.current.cfg);
    return go(g);
  }
  if ((el = t.closest('[data-lesson]'))) { var p = el.dataset.lesson.split(','); return go('lesson', { c: +p[0], l: +p[1] }); }
  if (t.closest('[data-solve]')) return go('solve', { theme: puzzleTheme });
  if ((el = t.closest('[data-theme]'))) { puzzleTheme = el.dataset.theme; return VIEWS.puzzles(); }
  if ((el = t.closest('[data-rush]'))) { var v = el.dataset.rush; return go('rush', v === 'survival' ? v : +v); }
  if ((el = t.closest('[data-bot]'))) { setup.bot = el.dataset.bot; VIEWS.play(); main.scrollTop = 0; return; }
  if ((el = t.closest('[data-set]'))) { var kv = el.dataset.set.split(':'); setup[kv[0]] = kv[0] === 'time' ? +kv[1] : kv[0] === 'assist' ? kv[1] === 'true' : kv[1]; var sc = main.scrollTop; VIEWS.play(); main.scrollTop = sc; return; }
  if (t.closest('[data-start]')) { S.current = null; return startBot(); }
  if (t.closest('[data-local]')) { S.current = null; return go('game', { mode: 'local', color: 0, start: T.START, moves: [], time: 0 }); }
  if ((el = t.closest('[data-drill]'))) { var d = DRILLS.find(function (x) { return x.id === el.dataset.drill; }); return go('game', { mode: 'drill', drill: d, color: new T.Pos(d.fen).turn, start: d.fen, moves: [], time: 0 }); }
  if ((el = t.closest('[data-open]'))) return go('opening', +el.dataset.open);
  if ((el = t.closest('[data-game]'))) return go('review', S.games[+el.dataset.game]);
  if ((el = t.closest('[data-coach]'))) { S.settings.coach = el.dataset.coach; chatHistory = null; save(); return VIEWS.coach(); }
  if ((el = t.closest('[data-weak]'))) { puzzleTheme = el.dataset.weak; return go('solve', { theme: puzzleTheme }); }
  if ((el = t.closest('[data-tg]'))) { var k = el.dataset.tg; S.settings[k] = !S.settings[k]; save(); return VIEWS.settings(); }
  if ((el = t.closest('[data-bt]'))) { S.settings.board = el.dataset.bt; save(); return VIEWS.settings(); }
  if ((el = t.closest('[data-th]'))) { S.settings.theme = el.dataset.th; save(); applyTheme(); return VIEWS.settings(); }
  if (t.closest('[data-reset]')) {
    var m = sheet('<h2>Reset all progress?</h2><p class="muted">Ratings, lessons, saved games and awards will be erased. This cannot be undone.</p><button class="btn big" style="background:var(--bad);color:#fff" data-rs>Reset everything</button><button class="btn big" data-rn>Keep my progress</button>');
    m.addEventListener('click', function (ev) { if (ev.target.closest('[data-rn]')) m.remove(); if (ev.target.closest('[data-rs]')) { S = JSON.parse(JSON.stringify(DEFAULTS)); save(); applyTheme(); m.remove(); go('home', null, { root: true }); } });
  }
}
(function boot() {
  main = $('#main'); nav = $('#nav');
  document.addEventListener('click', routes);
  applyTheme();
  go('home', null, { root: true });
  connectClaude(function () { applyTheme(); if (go.cur && TABS.some(function (x) { return x[0] === go.cur.view; })) VIEWS[go.cur.view](); });
})();
