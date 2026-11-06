/* Screens, part 1: navigation, home, play setup and the game screen. */
var main, nav, cleanup = null, stack = [];
var ICONS = {
  home: 'M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3z',
  play: 'M12 2a4 4 0 0 1 2.500 7.100c.5 2.500 1.700 4.700 3.500 6.400V18H6v-2.500c1.800-1.700 3-3.900 3.500-6.400A4 4 0 0 1 12 2zM5 19h14v3H5z',
  puzzles: 'M10 3a2 2 0 0 1 4 0v2h5v5h-2a2 2 0 0 0 0 4h2v7h-6v-2a2 2 0 0 0-4 0v2H3v-6h2a2 2 0 0 0 0-4H3V5h7z',
  learn: 'M12 3L1 9l11 6 9-4.900V17h2V9zM5 13.200V17c0 1.700 3.100 3.500 7 3.500s7-1.800 7-3.500v-3.800l-7 3.800z',
  more: 'M4 6h16v2.500H4zm0 5h16v2.500H4zm0 5h16v2.500H4z'
};
var TABS = [['home', 'Home'], ['play', 'Play'], ['puzzles', 'Puzzles'], ['learn', 'Learn'], ['more', 'More']];
var VIEWS = {};
function drawNav(active) { nav.innerHTML = TABS.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (t[0] === active ? 'on' : '') + '"' + (t[0] === active ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[t[0]] + '"/></svg>' + t[1] + '</button>'; }).join(''); }
function go(view, arg, opts) {
  opts = opts || {};
  if (cleanup) { cleanup(); cleanup = null; }
  Engine.cancel();
  var old = $('.modal'); if (old) old.remove();
  if (opts.root) stack = []; else if (!opts.replace && go.cur) stack.push(go.cur);
  go.cur = { view: view, arg: arg };
  var isTab = TABS.some(function (t) { return t[0] === view; });
  nav.hidden = ['game', 'solve', 'rush', 'lesson'].indexOf(view) >= 0 && !(view === 'rush' && !arg);
  if (isTab) drawNav(view);
  main.scrollTop = 0;
  VIEWS[view](arg);
  markActive();
}
function back() { var b = stack.pop(); if (!b) return go('home', null, { root: true }); var s = stack.slice(); go.cur = null; go(b.view, b.arg); stack = s; }
function topBar(title, right) { return '<div class="top"><button class="back" data-back aria-label="Back">‹</button><h1 class="grow">' + esc(title) + '</h1>' + (right || '') + '</div>'; }
function sheet(html) { var m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="sheet">' + html + '</div>'; m.addEventListener('click', function (e) { if (e.target === m) m.remove(); }); document.body.appendChild(m); return m; }
function coachOf() { return COACHES.find(function (c) { return c.id === S.settings.coach; }) || COACHES[0]; }
function botById(id) { return BOTS.find(function (b) { return b.id === id; }); }
function fmtClock(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function posAfter(start, moves, n) { var p = new T.Pos(start); for (var i = 0; i < (n === undefined ? moves.length : n); i++) p.make(p.parseUci(moves[i])); return p; }

/* ---------- Home ---------- */
function nextLesson() { for (var i = 0; i < COURSES.length; i++) for (var j = 0; j < COURSES[i].lessons.length; j++) if (!S.lessons[COURSES[i].id + j]) return { c: i, l: j }; return null; }
function dailyPuzzle() { var pool = PUZZLES.filter(function (z) { return z.r >= 700 && z.r <= 1700; }); if (!pool.length) pool = PUZZLES; return pool[hash(today()) % pool.length]; }
VIEWS.home = function () {
  var nl = nextLesson(), c = coachOf(), dailyDone = S.daily.last === today();
  main.innerHTML = '<div class="page"><div class="row"><h1 class="grow">Tempo Chess</h1><span class="badge">' + Math.max(1, S.daily.activeStreak || 0) + ' day streak</span></div>' +
    (S.current ? '<button class="lead" data-go="resume"><span class="eyebrow">Game in progress</span><h2>Continue against ' + esc(S.current.oppName) + '</h2><span class="small">' + Math.ceil(S.current.cfg.moves.length / 2) + ' moves played</span></button>' : '<button class="lead" data-go="play"><span class="eyebrow">Next game</span><h2>Play a bot with ' + esc(c.name) + ' beside you</h2><span class="small">Hints, takebacks and live explanations of every move.</span></button>') +
    '<div class="grid2"><button class="tile" data-go="daily"><span class="eyebrow">Daily puzzle</span><span class="num">' + (dailyDone ? 'Solved' : 'Ready') + '</span><span class="small muted">' + S.daily.streak + ' solved in a row</span></button>' +
    '<button class="tile" data-tab="puzzles"><span class="eyebrow">Puzzle rating</span><span class="num">' + Math.round(S.puzzle.r) + '</span><span class="small muted">' + S.puzzle.won + ' of ' + S.puzzle.played + ' solved</span></button></div>' +
    '<div class="list">' + (nl ? '<button class="item" data-lesson="' + nl.c + ',' + nl.l + '"><div class="grow"><span class="eyebrow">Next lesson</span><h3>' + esc(COURSES[nl.c].lessons[nl.l].title) + '</h3><span class="small muted">' + esc(COURSES[nl.c].title) + '</span></div><span class="chev">›</span></button>' : '') +
    '<button class="item" data-go="coach">' + avatar(c.name, c.color, 40) + '<div class="grow"><h3>Ask ' + esc(c.name) + '</h3><span class="small muted">Chat about any chess question</span></div><span class="chev">›</span></button>' +
    '<button class="item" data-go="rush"><div class="grow"><h3>Puzzle Rush</h3><span class="small muted">Best 3-minute score: ' + S.rush[3] + '</span></div><span class="chev">›</span></button>' +
    '<button class="item" data-go="drills"><div class="grow"><h3>Endgame drills</h3><span class="small muted">' + Object.keys(S.drills).length + ' of ' + DRILLS.length + ' completed</span></div><span class="chev">›</span></button>' +
    '<button class="item" data-go="analysis"><div class="grow"><h3>Analysis board</h3><span class="small muted">Explore any position with the engine</span></div><span class="chev">›</span></button></div></div>';
};

/* ---------- Play setup ---------- */
var setup = { bot: 'june', color: 'random', time: 0, assist: true };
VIEWS.play = function () {
  var groups = ['Beginner', 'Intermediate', 'Advanced', 'Master', 'Personalities'], b = botById(setup.bot);
  var chip = function (k, v, l) { return '<button class="chip ' + (setup[k] === v ? 'on' : '') + '" data-set="' + k + ':' + v + '">' + l + '</button>'; };
  main.innerHTML = '<div class="page"><h1>Play a bot</h1><div class="card"><div class="row">' + avatar(b.name, b.color, 56) + '<div class="grow"><h2>' + esc(b.name) + ' <span class="badge">about ' + b.rating + '</span></h2><p class="small muted">' + esc(b.blurb) + '</p></div></div>' +
    '<div class="chips">' + chip('color', 'white', 'White') + chip('color', 'random', 'Random') + chip('color', 'black', 'Black') + '</div>' +
    '<div class="chips">' + chip('time', 0, 'No clock') + chip('time', 5, '5 min') + chip('time', 10, '10 min') + chip('time', 30, '30 min') + '</div>' +
    '<div class="chips">' + chip('assist', true, 'Coach on') + chip('assist', false, 'Coach off') + '</div>' +
    '<button class="btn primary big" data-start>Play ' + esc(b.name) + '</button></div>' +
    groups.map(function (g) { return '<div class="eyebrow">' + g + '</div><div class="list">' + BOTS.filter(function (x) { return x.group === g; }).map(function (x) { return '<button class="item" data-bot="' + x.id + '">' + avatar(x.name, x.color, 40) + '<div class="grow"><h3>' + esc(x.name) + (S.botWins[x.id] ? ' <span class="badge">Beaten</span>' : '') + '</h3><span class="small muted">About ' + x.rating + '</span></div>' + (x.id === setup.bot ? '<span style="color:var(--accent)" aria-label="Selected">●</span>' : '') + '</button>'; }).join('') + '</div>'; }).join('') +
    '<div class="list"><button class="item" data-local><div class="grow"><h3>Pass and play</h3><span class="small muted">Two people, one phone</span></div><span class="chev">›</span></button></div></div>';
};
function startBot(fen, moves) {
  var color = setup.color === 'random' ? (Math.random() < .5 ? 0 : 1) : setup.color === 'white' ? 0 : 1;
  go('game', { mode: 'bot', bot: setup.bot, color: color, start: fen || T.START, moves: moves || [], time: setup.time, coach: setup.assist });
}

/* ---------- Game: bots, pass and play, and drills ---------- */
VIEWS.game = function (cfg) {
  var pos = new T.Pos(cfg.start), local = cfg.mode === 'local', drill = cfg.drill, bot = local ? null : (drill ? botById('tempo') : botById(cfg.bot)), coach = coachOf();
  var G = { moves: [], sans: [], view: 0, over: null, pre: null, prevLoss: 0, token: 1, feedback: null, flip: !local && cfg.color === 1, thinking: false, arrows: [], badge: null, say: null,
    clock: cfg.time ? [cfg.time * 6e4, cfg.time * 6e4] : null, tick: 0, last: Date.now(), coachOn: !!cfg.coach && !drill, evalOn: false, hintShown: false };
  var oppName = local ? 'Black' : drill ? 'Engine' : bot.name, meName = local ? 'White' : S.name;
  main.innerHTML = '<div class="page wide">' + topBar(drill ? drill.title : bot ? 'Game vs ' + bot.name : 'Pass and play') +
    '<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="player"><span id="oa"></span><div class="grow" style="min-width:0"><div class="nm">' + esc(oppName) + '</div><div class="small muted" id="ost"></div></div><div class="clock" id="c1" hidden></div></div>' +
    '<div class="board-wrap"><div class="evalbar" id="ev" hidden><i style="height:50%"></i></div><div id="bd"></div></div>' +
    '<div class="player"><span id="ma"></span><div class="grow"><div class="nm">' + esc(meName) + '</div></div><div class="clock" id="c0" hidden></div></div></div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;min-width:0"><div class="moves" id="ml"></div><div class="bubble" id="cb"></div><div class="tools" id="tl"></div></div></div>';
  $('#oa').innerHTML = bot ? avatar(oppName, bot.color, 36) : avatar('Player two', '#577590', 36);
  $('#ma').innerHTML = avatar(meName + ' player', '#0f7a5f', 36);
  var board = new Board($('#bd'), { flip: G.flip, dests: function (s) { return canMove() ? legalDests(pos, s) : []; }, onMove: function (u) { userMove(u); } });
  function canMove() { return !G.over && !G.thinking && G.view === G.moves.length && (local || pos.turn === cfg.color); }
  function persist() { if (drill || G.over) return; S.current = { cfg: Object.assign({}, cfg, { moves: G.moves.slice(), clock: G.clock ? G.clock.slice() : null }), oppName: oppName }; save(); }
  function statusLine() { var el = $('#ost'); if (el) el.textContent = G.thinking ? 'Thinking…' : (G.sans.length ? openingName(G.sans) : (drill ? drill.tip : '')); }
  function syncClock() {
    [0, 1].forEach(function (i) {
      var side = local ? i : (i === 0 ? cfg.color : 1 - cfg.color), el = $('#c' + i);
      if (!el) return;
      el.hidden = !G.clock;
      if (G.clock) { el.textContent = fmtClock(G.clock[side]); el.className = 'clock' + (pos.turn === side && !G.over ? ' on' : '') + (G.clock[side] < 2e4 ? ' low' : ''); }
    });
  }
  function draw() {
    var v = G.view, p = posAfter(cfg.start, G.moves, v), live = v === G.moves.length;
    board.setPos(p);
    var lastU = v ? G.moves[v - 1] : null;
    board.setState({ last: lastU ? [lastU.slice(0, 2), lastU.slice(2, 4)] : [], check: checkSq(p), badge: live ? G.badge : null, arrows: live ? G.arrows : [] });
    var h = '';
    G.sans.forEach(function (s, i) { if (i % 2 === 0) h += '<span>' + (i / 2 + 1) + '.</span>'; h += '<button data-mv="' + (i + 1) + '" class="' + (i + 1 === v ? 'on' : '') + '">' + esc(s) + '</button>'; });
    var ml = $('#ml'); ml.innerHTML = h || '<span class="muted">Moves appear here</span>'; ml.scrollLeft = ml.scrollWidth;
    statusLine(); syncClock(); drawCoach(); drawTools();
  }
  function drawCoach() {
    var cb = $('#cb'), f = G.feedback;
    if (!cb) return;
    var who = (G.coachOn || drill || !bot) ? coach : bot;
    var text = f ? '<span class="cl-tag c-' + f.cls + '">' + CLASSES[f.cls].label + '.</span> ' + esc(f.praise + ' ' + f.text) : esc(G.say || (drill ? drill.tip : bot ? bot.say.hi : 'White moves first. Hand the phone over after each move.'));
    cb.innerHTML = avatar(who.name, who.color, 36) + '<div class="tx"><strong>' + esc(who.name) + '</strong><br>' + text + (sampleFn && G.coachOn && !G.over ? '<div style="margin-top:6px"><button class="chip" data-ask>Ask a question</button></div>' : '') + '</div>';
  }
  function drawTools() {
    var tl = $('#tl'), tb = function (id, label, on, dis) { return '<button class="btn tool ' + (on ? 'on' : '') + '" data-t="' + id + '"' + (dis ? ' disabled' : '') + (on ? ' aria-pressed="true"' : '') + '>' + label + '</button>'; };
    if (G.over) { tl.innerHTML = (drill ? tb('again', 'Try again') : tb('review', 'Game review')) + (bot && !drill ? tb('rematch', 'Rematch') : '') + tb('flip', 'Flip'); return; }
    tl.innerHTML = (cfg.mode === 'bot' ? tb('coach', 'Coach', G.coachOn) : '') + (!local ? tb('hint', 'Hint', G.hintShown, !canMove()) : '') + tb('undo', 'Take back', false, !G.moves.length) + tb('eval', 'Eval', G.evalOn) + tb('flip', 'Flip') + tb('resign', drill ? 'Give up' : 'Resign');
  }
  function play(u, silent) {
    var m = pos.parseUci(u);
    if (!m) return false;
    var capt = pos.b[T.mTo(m)] || T.mFlag(m) === 2;
    G.sans.push(pos.san(m)); pos.make(m); G.moves.push(u); G.view = G.moves.length;
    if (!silent) { if (pos.inCheck()) sfx.check(); else if (capt) sfx.cap(); else sfx.move(); }
    return true;
  }
  function endCheck() {
    var st = pos.status(), played = Math.ceil(G.moves.length / 2);
    if (drill && !st && drill.goal === 'draw' && played >= drill.par) st = { result: '1/2-1/2', reason: 'holding out for ' + drill.par + ' moves' };
    if (st) finish(st.result, st.reason);
    return !!st;
  }
  function finish(result, reason) {
    G.over = { result: result, reason: reason }; G.thinking = false;
    clearInterval(G.tick); sfx.end();
    var mine = local ? -1 : cfg.color, played = Math.ceil(G.moves.length / 2);
    var outcome = result === '1/2-1/2' ? .5 : mine < 0 ? 1 : ((result === '1-0') === (mine === 0) ? 1 : 0), head, sub = 'By ' + reason + '.';
    if (drill) {
      var won = drill.goal === 'draw' ? result === '1/2-1/2' : outcome === 1;
      if (won) { var prev = S.drills[drill.id]; S.drills[drill.id] = prev ? Math.min(prev, played) : played; }
      head = won ? 'Drill complete' : 'Not this time';
      sub = won ? 'Done in ' + played + ' moves. Target: ' + drill.par + '.' : 'Ended by ' + reason + '. ' + drill.tip;
      save();
    } else {
      S.current = null;
      if (bot) {
        var exp = 1 / (1 + Math.pow(10, (bot.rating - S.elo) / 400));
        S.elo = Math.round(Math.max(100, S.elo + 32 * (outcome - exp)));
        if (outcome === 1) S.botWins[bot.id] = (S.botWins[bot.id] || 0) + 1;
        G.say = outcome === 1 ? bot.say.lose : outcome === 0 ? bot.say.win : 'A fair result. Well played.';
      }
      G.rec = { id: Date.now(), date: today(), white: local ? 'White' : cfg.color === 0 ? S.name : bot.name, black: local ? 'Black' : cfg.color === 1 ? S.name : bot.name, color: mine, bot: cfg.bot || null, start: cfg.start, moves: G.moves.slice(), result: result, reason: reason, outcome: outcome, opening: cfg.start === T.START ? openingName(G.sans) : '' };
      S.games.unshift(G.rec); S.games = S.games.slice(0, 40); save();
      head = mine < 0 ? (result === '1-0' ? 'White wins' : result === '0-1' ? 'Black wins' : 'Draw') : outcome === 1 ? 'You won' : outcome === 0 ? 'You lost' : 'Draw';
    }
    G.feedback = null; G.coachOn = false; G.arrows = [];
    draw();
    var m = sheet('<h1>' + esc(head) + '</h1><p class="muted">' + esc(sub) + '</p>' + (G.say && bot ? '<p>' + esc(oppName) + ': “' + esc(G.say) + '”</p>' : '') +
      (drill ? '<button class="btn primary big" data-t="again">Try again</button>' : '<button class="btn primary big" data-t="review">Run game review</button>' + (bot ? '<button class="btn big" data-t="rematch">Rematch</button>' : '')) + '<button class="btn big" data-close>View the board</button>');
    m.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) m.remove(); else { var t = e.target.closest('[data-t]'); if (t) { m.remove(); tool(t.dataset.t); } } });
  }
  function userMove(u) {
    var token = ++G.token, before = G.pre, judgePos = posAfter(cfg.start, G.moves);
    G.hintShown = false; G.arrows = []; G.badge = null; G.feedback = null; G.pre = null;
    if (!play(u)) return;
    persist(); draw();
    if (endCheck()) return;
    var needCoach = G.coachOn && before;
    var job = needCoach ? Engine.analyze({ fen: cfg.start, moves: G.moves.slice(), timeMs: 450, depth: 14, multipv: 1 }) : Promise.resolve(null);
    if (!local) { G.thinking = true; statusLine(); drawTools(); }
    job.then(function (after) {
      if (token !== G.token) return;
      if (needCoach && after && after.lines.length) {
        var v = judge(judgePos, u, before, after, null, G.prevLoss, cfg.start === T.START && inBook(G.sans));
        var group = v.loss < 2.5 ? coach.good : v.loss < 10 ? coach.ok : coach.bad;
        G.feedback = { cls: v.cls, praise: pick(group), text: explain(judgePos, u, before, after, v) };
        G.badge = { sq: u.slice(2, 4), color: CLASSES[v.cls].color, text: CLASSES[v.cls].sym };
        if (v.loss >= 10 && before.lines[0]) G.arrows = [[before.lines[0].uci.slice(0, 2), before.lines[0].uci.slice(2, 4), 'rgba(47,158,95,.8)']];
        draw();
      }
      if (local) { prepare(); return; }
      botTurn();
    });
  }
  function prepare() { // Analyse ahead so hints, the eval bar and coach feedback are ready when needed.
    if (G.over || !(G.coachOn || G.evalOn || cfg.mode === 'bot' || drill)) return;
    var token = G.token;
    Engine.analyze({ fen: cfg.start, moves: G.moves.slice(), timeMs: 600, depth: 16, multipv: 2 }).then(function (r) {
      if (!r || token !== G.token || !r.lines.length) return;
      G.pre = r;
      var w = wpOf(r.lines[0]); if (pos.turn) w = 100 - w;
      var bar = $('#ev'); if (bar) { bar.classList.toggle('flip', G.flip); bar.firstChild.style.height = w + '%'; }
    });
  }
  function chooseBotMove(res) {
    var ls = res.lines;
    if (!ls.length) return null;
    if (bot.blunder && ls.length > 1 && Math.random() < bot.blunder) return pick(ls.slice(1)).uci;
    if (!bot.temp) return ls[0].uci;
    var ek = pos.kings[1 - pos.turn], scored = ls.map(function (l) {
      var m = pos.parseUci(l.uci), s = l.score;
      if (m && Math.abs(s) < T.MATE - 200) {
        var cp = pos.b[T.mTo(m)];
        if (cp) s += (bot.capture || 0) + (T.VAL[cp & 7] >= T.VAL[pos.b[T.mFrom(m)] & 7] ? (bot.trade || 0) : 0);
        if (bot.attack) { var t = T.mTo(m), d = Math.max(Math.abs((t >> 4) - (ek >> 4)), Math.abs((t & 7) - (ek & 7))); if (d <= 2) s += bot.attack; }
      }
      return { u: l.uci, s: s };
    });
    var hi = Math.max.apply(null, scored.map(function (x) { return x.s; })), w = scored.map(function (x) { return Math.exp((x.s - hi) / bot.temp); }), sum = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum;
    for (var i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return scored[i].u; }
    return scored[0].u;
  }
  function botTurn() {
    var token = ++G.token, started = Date.now();
    G.thinking = true; statusLine(); drawTools();
    var bookNext = !drill && cfg.start === T.START && BOOK.tree[G.sans.join(' ')], bookMove = null;
    if (bookNext && Math.random() < (bot.book || 0)) { var m = pos.parseSan(pick(Object.keys(bookNext))); if (m) bookMove = T.uci(m); }
    var job = bookMove ? Promise.resolve(bookMove) : Engine.analyze({ fen: cfg.start, moves: G.moves.slice(), depth: drill ? 14 : bot.depth, timeMs: drill ? 900 : (bot.timeMs || 1000), multipv: drill ? 1 : bot.multipv }).then(function (r) { return r && r.lines.length ? (drill ? r.lines[0].uci : chooseBotMove(r)) : null; });
    job.then(function (u) {
      if (token !== G.token || !u) return;
      setTimeout(function () {
        if (token !== G.token) return;
        G.thinking = false;
        play(u); persist(); draw();
        if (!endCheck()) prepare();
      }, Math.max(0, 500 - (Date.now() - started)));
    });
  }
  function tool(id) {
    if (id === 'flip') { G.flip = !G.flip; board.setFlip(G.flip); $('#ev').classList.toggle('flip', G.flip); return; }
    if (id === 'eval') { G.evalOn = !G.evalOn; $('#ev').hidden = !G.evalOn; drawTools(); if (G.evalOn && !G.pre && canMove()) prepare(); return; }
    if (id === 'coach') { G.coachOn = !G.coachOn; if (!G.coachOn) { G.feedback = null; G.arrows = []; G.badge = null; } toast(G.coachOn ? coach.name + ' is watching' : 'Coach off'); if (G.coachOn && !G.pre && canMove()) prepare(); draw(); return; }
    if (id === 'hint') {
      var l = G.pre && G.pre.lines[0];
      if (!l) { toast('Still thinking. Try again in a second.'); prepare(); return; }
      G.hintShown = true; G.arrows = [[l.uci.slice(0, 2), l.uci.slice(2, 4)]]; G.feedback = null; G.badge = null;
      G.say = 'Try ' + pos.san(pos.parseUci(l.uci)) + ': ' + describe(pos, l.uci) + '.'; draw(); G.say = null;
      return;
    }
    if (id === 'undo') {
      G.token++; Engine.cancel(); G.thinking = false; G.feedback = null; G.arrows = []; G.badge = null; G.pre = null;
      var n = local ? 1 : (pos.turn === cfg.color ? 2 : 1);
      for (var i = 0; i < n && G.moves.length; i++) { pos.unmake(); G.moves.pop(); G.sans.pop(); }
      G.view = G.moves.length; persist(); draw();
      if (local || pos.turn === cfg.color) prepare(); else botTurn();
      return;
    }
    if (id === 'resign') {
      var m = sheet('<h2>' + (drill ? 'Give up this drill?' : 'Resign this game?') + '</h2><button class="btn primary big" data-yes>' + (drill ? 'Give up' : 'Resign') + '</button><button class="btn big" data-no>Keep playing</button>');
      m.addEventListener('click', function (e) {
        if (e.target.closest('[data-no]')) m.remove();
        if (e.target.closest('[data-yes]')) { m.remove(); G.token++; Engine.cancel(); var loser = local ? pos.turn : cfg.color; finish(loser === 0 ? '0-1' : '1-0', 'resignation'); }
      });
      return;
    }
    if (id === 'review') go('review', G.rec);
    if (id === 'rematch') go('game', Object.assign({}, cfg, { color: 1 - cfg.color, moves: [], clock: null, start: T.START }), { replace: true });
    if (id === 'again') go('game', Object.assign({}, cfg, { moves: [], clock: null }), { replace: true });
  }
  var host = main, handler = function (e) {
    var t = e.target.closest('[data-t]'); if (t && !t.disabled && host.contains(t)) return tool(t.dataset.t);
    var mv = e.target.closest('[data-mv]'); if (mv) { G.view = +mv.dataset.mv; board.select(null); draw(); return; }
    if (e.target.closest('[data-ask]')) openChat('The student is playing a game as ' + (cfg.color ? 'Black' : 'White') + '. Current FEN: ' + pos.fen() + '. Moves so far: ' + (G.sans.join(' ') || 'none') + '.' + (G.pre && G.pre.lines[0] ? ' Engine evaluation for the side to move: ' + evalText(G.pre.lines[0]) + ', best line: ' + pvSan(cfg.start, G.moves, G.pre.lines[0].pv) + '.' : ''));
  };
  host.addEventListener('click', handler);
  G.tick = setInterval(function () {
    var now = Date.now(), dt = now - G.last; G.last = now;
    if (!G.clock || G.over || !G.moves.length) return;
    G.clock[pos.turn] -= dt;
    if (G.clock[pos.turn] <= 0) { G.clock[pos.turn] = 0; G.token++; Engine.cancel(); finish(pos.turn ? '1-0' : '0-1', 'time'); return; }
    syncClock();
  }, 250);
  cleanup = function () { clearInterval(G.tick); G.token++; host.removeEventListener('click', handler); };
  (cfg.moves || []).forEach(function (u) { play(u, true); });
  if (cfg.clock) G.clock = cfg.clock.slice();
  draw();
  if (pos.status()) return;
  if (local || pos.turn === cfg.color) prepare(); else botTurn();
};
