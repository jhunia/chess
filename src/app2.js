/* Screens, part 2: puzzles, rush, lessons, drills, vision and openings. */
var THEME_NAMES = { mate1: 'Mate in 1', mate2: 'Mate in 2', mate3: 'Mate in 3', mate4: 'Mate in 4+', fork: 'Fork', pin: 'Pin', skewer: 'Skewer', hanging: 'Hanging piece', sacrifice: 'Sacrifice', promotion: 'Promotion', endgame: 'Endgame', backrank: 'Back rank', quiet: 'Quiet move', material: 'Win material', tactic: 'Tactic' };
var puzzleTheme = 'all';
VIEWS.puzzles = function () {
  var themes = {}; PUZZLES.forEach(function (z) { z.t.forEach(function (t) { themes[t] = (themes[t] || 0) + 1; }); });
  var names = Object.keys(THEME_NAMES).filter(function (t) { return themes[t] >= 3; });
  var hist = S.puzzle.hist.slice(-30), lo = Math.min.apply(null, hist) - 20, hi = Math.max.apply(null, hist) + 20;
  var pts = hist.map(function (v, i) { return (hist.length > 1 ? i / (hist.length - 1) * 300 : 150).toFixed(1) + ',' + (60 - (v - lo) / (hi - lo) * 54).toFixed(1); }).join(' ');
  main.innerHTML = '<div class="page"><h1>Puzzles</h1><div class="card"><div class="row"><div class="grow"><span class="eyebrow">Your rating</span><div style="font:700 30px var(--display)">' + Math.round(S.puzzle.r) + '</div></div><span class="small muted">' + PUZZLES.length + ' puzzles</span></div><svg class="graph" viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label="Puzzle rating over your last ' + hist.length + ' puzzles"><polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>' +
    '<button class="btn primary big" data-solve>Solve puzzles' + (puzzleTheme !== 'all' ? ': ' + THEME_NAMES[puzzleTheme] : '') + '</button><div class="grid2"><button class="tile" data-go="daily"><span class="eyebrow">Daily</span><h2>' + (S.daily.last === today() ? 'Solved today' : 'Today\'s puzzle') + '</h2></button><button class="tile" data-go="rush"><span class="eyebrow">Rush</span><h2>Race the clock</h2><span class="small muted">Best: ' + S.rush[3] + '</span></button></div>' +
    '<div class="eyebrow">Train a theme</div><div class="chips"><button class="chip ' + (puzzleTheme === 'all' ? 'on' : '') + '" data-theme="all">All</button>' + names.map(function (t) { return '<button class="chip ' + (puzzleTheme === t ? 'on' : '') + '" data-theme="' + t + '">' + THEME_NAMES[t] + '</button>'; }).join('') + '</div></div>';
};
function nextPuzzle(theme) {
  var all = PUZZLES.filter(function (z) { return theme === 'all' || z.t.indexOf(theme) >= 0; });
  var pool = all.filter(function (z) { return !S.puzzle.done[z.f]; });
  if (!pool.length) pool = all;
  var near = pool.filter(function (z) { return Math.abs(z.r - S.puzzle.r) <= 200; });
  if (near.length) return pick(near);
  pool = pool.slice().sort(function (a, b) { return Math.abs(a.r - S.puzzle.r) - Math.abs(b.r - S.puzzle.r); });
  return pick(pool.slice(0, 8));
}
// Plays one puzzle on a board: animates the opponent's move, then checks each reply.
function PuzzleRun(boardEl, z, on) {
  var pos = new T.Pos(z.f), line = z.m.split(' '), idx = 0, failed = false, done = false, busy = true;
  var board = new Board(boardEl, { flip: pos.turn === 0, dests: function (s) { return done || busy ? [] : legalDests(pos, s); }, onMove: function (u) { attempt(u); } });
  board.setPos(pos);
  function refresh(u) { board.setPos(pos); board.setState({ last: u ? [u.slice(0, 2), u.slice(2, 4)] : [], check: checkSq(pos), arrows: [], marks: [] }); }
  var t0 = setTimeout(function () { pos.make(pos.parseUci(z.p)); refresh(z.p); sfx.move(); busy = false; if (on.ready) on.ready(pos.turn); }, 500);
  function attempt(u) {
    var m = pos.parseUci(u), mated = false;
    if (!m) return;
    pos.make(m); mated = pos.inCheck() && !pos.moves().length; pos.unmake();
    if (u === line[idx] || mated) {
      pos.make(m); refresh(u); idx++;
      if (idx >= line.length || mated) { done = true; sfx.good(); on.solved(!failed); return; }
      sfx[pos.inCheck() ? 'check' : 'move']();
      busy = true;
      setTimeout(function () { if (done) return; var r = line[idx]; pos.make(pos.parseUci(r)); idx++; refresh(r); sfx.move(); busy = false; if (on.progress) on.progress(); }, 400);
    } else {
      sfx.bad(); var first = !failed; failed = true;
      board.setPos(pos); board.setState({ marks: [u.slice(2, 4)] });
      setTimeout(function () { board.setState({ marks: [] }); }, 500);
      on.wrong(first);
    }
  }
  this.hint = function () { failed = true; board.setState({ marks: [line[idx].slice(0, 2)] }); };
  this.solution = function () { var w = line[idx]; failed = true; board.setState({ arrows: [[w.slice(0, 2), w.slice(2, 4), 'rgba(47,158,95,.85)']] }); };
  this.stop = function () { done = true; clearTimeout(t0); };
}
VIEWS.solve = function (arg) {
  arg = arg || {};
  var z = arg.z || nextPuzzle(arg.theme || puzzleTheme), counted = false;
  main.innerHTML = '<div class="page">' + topBar(arg.daily ? 'Daily puzzle' : 'Puzzle', '<span class="badge" id="rt">' + Math.round(S.puzzle.r) + '</span>') + '<div id="bd"></div><div class="bubble"><div class="tx" id="msg" role="status">Watch your opponent\'s move…</div></div><div class="tools" id="pt"><button class="btn tool" data-p="hint">Hint</button><button class="btn tool" data-p="sol">Solution</button><button class="btn tool" data-p="ana">Analyse</button></div></div>';
  function result(win) {
    if (counted || arg.daily && S.daily.last === today()) { counted = true; return; }
    counted = true;
    var exp = 1 / (1 + Math.pow(10, (z.r - S.puzzle.r) / 400)), delta = 24 * ((win ? 1 : 0) - exp);
    S.puzzle.r = Math.max(100, S.puzzle.r + delta); S.puzzle.played++; if (win) S.puzzle.won++;
    S.puzzle.hist.push(Math.round(S.puzzle.r)); S.puzzle.hist = S.puzzle.hist.slice(-200); S.puzzle.done[z.f] = 1;
    z.t.forEach(function (t) { var e = S.puzzle.themes[t] = S.puzzle.themes[t] || [0, 0]; e[1]++; if (win) e[0]++; });
    var rt = $('#rt'); if (rt) rt.textContent = Math.round(S.puzzle.r) + ' (' + (delta >= 0 ? '+' : '') + Math.round(delta) + ')';
    save();
  }
  var run = new PuzzleRun($('#bd'), z, {
    ready: function (c) { $('#msg').textContent = 'Find the best move for ' + (c ? 'Black' : 'White') + '.'; },
    progress: function () { $('#msg').textContent = 'Correct. Keep going.'; },
    wrong: function (first) { $('#msg').textContent = 'That is not it. Try again.'; if (first) result(false); },
    solved: function (clean) {
      if (arg.daily && S.daily.last !== today()) { S.daily.streak = clean ? S.daily.streak + 1 : 0; result(clean); S.daily.last = today(); save(); }
      else result(clean);
      $('#msg').innerHTML = '<strong>' + (clean ? 'Solved.' : 'Finished.') + '</strong> Themes: ' + esc(z.t.map(function (t) { return THEME_NAMES[t] || t; }).join(', ')) + '. Puzzle rated ' + z.r + '.';
      $('#pt').innerHTML = arg.daily ? '<button class="btn primary big" data-next>More puzzles</button>' : '<button class="btn primary big" data-next>Next puzzle</button>';
    }
  });
  var el = main, h = function (e) {
    var b = e.target.closest('[data-p]');
    if (b) { var k = b.dataset.p; if (k === 'hint') { result(false); run.hint(); } if (k === 'sol') { result(false); run.solution(); } if (k === 'ana') go('analysis', { fen: z.f, moves: [z.p] }); }
    if (e.target.closest('[data-next]')) go('solve', { theme: arg.daily ? 'all' : arg.theme }, { replace: true });
  };
  el.addEventListener('click', h);
  cleanup = function () { run.stop(); el.removeEventListener('click', h); };
};
VIEWS.rush = function (mode) {
  if (!mode) {
    main.innerHTML = '<div class="page">' + topBar('Puzzle Rush') + '<p class="muted">Puzzles start easy and get harder. Three wrong moves end your run.</p><div class="list">' + [[3, '3 minutes'], [5, '5 minutes'], ['survival', 'Survival, no clock']].map(function (r) { return '<button class="item" data-rush="' + r[0] + '"><div class="grow"><h3>' + r[1] + '</h3><span class="small muted">Best: ' + S.rush[r[0]] + '</span></div><span class="chev">›</span></button>'; }).join('') + '</div></div>';
    return;
  }
  var score = 0, strikes = 0, left = mode === 'survival' ? 0 : mode * 6e4, last = Date.now(), run = null, over = false, used = {};
  var sorted = PUZZLES.slice().sort(function (a, b) { return a.r - b.r; });
  main.innerHTML = '<div class="page">' + topBar('Puzzle Rush', '<span class="clock" id="tm"></span>') + '<div class="row"><span class="grow" style="font:700 22px var(--display)" id="sc">0</span><span id="st" aria-label="Wrong moves" style="font-weight:700;color:var(--bad);letter-spacing:4px"></span></div><div id="host"></div><div class="bubble"><div class="tx" id="msg" role="status">Get ready.</div></div></div>';
  function hud() { $('#sc').textContent = score + ' solved'; $('#st').textContent = '✕'.repeat(strikes) + '○'.repeat(3 - strikes); $('#tm').textContent = mode === 'survival' ? 'No clock' : fmtClock(left); }
  function nextOne() {
    if (over) return;
    var target = 450 + score * 60, pool = sorted.filter(function (z) { return !used[z.f] && Math.abs(z.r - target) < 200; });
    if (!pool.length) pool = sorted.filter(function (z) { return !used[z.f]; });
    if (!pool.length) return end('You solved every puzzle available');
    var z = pick(pool); used[z.f] = 1;
    $('#host').innerHTML = '<div id="bd"></div>';
    run = new PuzzleRun($('#bd'), z, {
      ready: function (c) { $('#msg').textContent = (c ? 'Black' : 'White') + ' to move.'; },
      wrong: function () { strikes++; hud(); run.stop(); if (strikes >= 3) end('Three wrong moves'); else { $('#msg').textContent = 'Wrong. Next puzzle.'; setTimeout(nextOne, 600); } },
      solved: function () { score++; hud(); setTimeout(nextOne, 300); }
    });
  }
  function end(why) {
    if (over) return; over = true; clearInterval(tk); if (run) run.stop();
    var best = S.rush[mode] < score; if (best) { S.rush[mode] = score; save(); }
    var m = sheet('<h1>' + score + ' solved</h1><p class="muted">' + esc(why) + '. ' + (best ? 'New personal best.' : 'Your best is ' + S.rush[mode] + '.') + '</p><button class="btn primary big" data-a>Go again</button><button class="btn big" data-b>Done</button>');
    m.addEventListener('click', function (e) { if (e.target.closest('[data-a]')) go('rush', mode, { replace: true }); if (e.target.closest('[data-b]')) back(); });
  }
  var tk = setInterval(function () { if (over || mode === 'survival') return; var n = Date.now(); left -= n - last; last = n; if (left <= 0) { left = 0; hud(); end('Time is up'); } else hud(); }, 250);
  cleanup = function () { over = true; clearInterval(tk); if (run) run.stop(); };
  hud(); nextOne();
};

/* ---------- Learn ---------- */
VIEWS.learn = function () {
  main.innerHTML = '<div class="page"><h1>Lessons</h1>' + COURSES.map(function (c, ci) {
    var d = c.lessons.filter(function (l, j) { return S.lessons[c.id + j]; }).length;
    return '<div class="row"><div class="grow"><h2>' + esc(c.title) + '</h2><span class="small muted">' + esc(c.level) + '. ' + esc(c.blurb) + '</span></div><span class="badge">' + d + '/' + c.lessons.length + '</span></div><div class="list">' + c.lessons.map(function (l, j) { return '<button class="item" data-lesson="' + ci + ',' + j + '"><div class="grow"><h3>' + esc(l.title) + '</h3></div><span style="color:var(--good)">' + (S.lessons[c.id + j] ? '✓' : '') + '</span><span class="chev">›</span></button>'; }).join('') + '</div>';
  }).join('') + '<h2>Practice</h2><div class="list"><button class="item" data-go="drills"><div class="grow"><h3>Endgame drills</h3><span class="small muted">Win or hold positions against the engine</span></div><span class="chev">›</span></button><button class="item" data-go="openings"><div class="grow"><h3>Opening explorer</h3><span class="small muted">' + OPENINGS.length + ' lines to browse and practise</span></div><span class="chev">›</span></button><button class="item" data-go="vision"><div class="grow"><h3>Vision trainer</h3><span class="small muted">Learn the board\'s coordinates</span></div><span class="chev">›</span></button></div></div>';
};
VIEWS.lesson = function (a) {
  var course = COURSES[a.c], lesson = course.lessons[a.l], i = 0, pos = null, c = coachOf(), done = false, step = null, replyT = 0;
  main.innerHTML = '<div class="page">' + topBar(lesson.title, '<button class="chip ' + (S.settings.speak ? 'on' : '') + '" id="spk" aria-pressed="' + S.settings.speak + '">Read aloud</button>') + '<div class="bar"><i id="pb" style="width:0"></i></div><div id="bd"></div><div class="bubble">' + avatar(c.name, c.color, 36) + '<div class="tx" id="tx" role="status"></div></div><div id="act"></div></div>';
  var board = new Board($('#bd'), { dests: function (s) { return awaiting() ? legalDests(pos, s) : []; }, onMove: function (u) { attempt(u); } });
  function awaiting() { return step && (step.move || step.goal) && !done; }
  function refresh(u) { board.setPos(pos); board.setState({ last: u ? [u.slice(0, 2), u.slice(2, 4)] : [], check: checkSq(pos), arrows: [], marks: [] }); }
  function nextBtn() { return '<button class="btn primary big" data-lnext>' + (i + 1 < lesson.steps.length ? 'Continue' : 'Finish lesson') + '</button>'; }
  function show() {
    step = lesson.steps[i]; done = false;
    if (step.f) { pos = new T.Pos(step.f); if (board.flip !== (pos.turn === 1)) board.setFlip(pos.turn === 1); }
    board.setPos(pos);
    board.setState({ last: [], check: checkSq(pos), arrows: (step.arrows || []).slice(), marks: step.marks || [] });
    $('#tx').textContent = step.t; speak(step.t);
    $('#pb').style.width = (i / lesson.steps.length * 100) + '%';
    $('#act').innerHTML = awaiting() ? '<button class="btn big" data-lhint>Show me</button>' : nextBtn();
  }
  function mateMove() { var ms = pos.moves(); for (var k = 0; k < ms.length; k++) { pos.make(ms[k]); var mt = pos.inCheck() && !pos.moves().length; pos.unmake(); if (mt) return T.uci(ms[k]); } return ''; }
  function attempt(u) {
    var m = pos.parseUci(u), ok;
    pos.make(m); var mate = pos.inCheck() && !pos.moves().length, stale = !pos.inCheck() && !pos.moves().length; pos.unmake();
    ok = step.goal === 'mate' ? mate : [].concat(step.move).indexOf(u) >= 0;
    if (!ok) {
      sfx.bad(); board.setPos(pos);
      $('#tx').textContent = stale ? 'That would be stalemate, which is a draw. Look for another move.' : 'Not quite. ' + step.t;
      return;
    }
    done = true; pos.make(m); refresh(u); sfx[pos.inCheck() ? 'check' : 'good']();
    $('#tx').textContent = step.ok || 'Correct.'; speak(step.ok || 'Correct.');
    $('#act').innerHTML = nextBtn();
    if (step.reply) { var rep = step.reply; replyT = setTimeout(function () { replyT = 0; var r = pos.parseUci(rep); if (r) { pos.make(r); refresh(rep); sfx.move(); } }, 600); }
  }
  var el = main, h = function (e) {
    if (e.target.closest('[data-lnext]')) {
      if (replyT) { clearTimeout(replyT); replyT = 0; var r = pos.parseUci(step.reply); if (r) pos.make(r); }
      i++;
      if (i >= lesson.steps.length) {
        S.lessons[course.id + a.l] = 1; save(); sfx.end(); step = null;
        var nl = course.lessons[a.l + 1] ? { c: a.c, l: a.l + 1 } : nextLesson();
        $('#pb').style.width = '100%'; $('#tx').textContent = 'Lesson complete. Well done.';
        $('#act').innerHTML = '<div style="display:flex;flex-direction:column;gap:8px">' + (nl ? '<button class="btn primary big" data-lgo="' + nl.c + ',' + nl.l + '">Next lesson: ' + esc(COURSES[nl.c].lessons[nl.l].title) + '</button>' : '') + '<button class="btn big" data-back>Back to lessons</button></div>';
        return;
      }
      show();
    }
    if (e.target.closest('[data-lhint]')) { var u = step.move ? [].concat(step.move)[0] : mateMove(); if (u) board.setState({ arrows: [[u.slice(0, 2), u.slice(2, 4)]] }); }
    var lg = e.target.closest('[data-lgo]'); if (lg) { var p = lg.dataset.lgo.split(','); go('lesson', { c: +p[0], l: +p[1] }, { replace: true }); }
    var sp = e.target.closest('#spk');
    if (sp) { S.settings.speak = !S.settings.speak; save(); sp.classList.toggle('on', S.settings.speak); sp.setAttribute('aria-pressed', S.settings.speak); if (S.settings.speak && step) speak(step.t); else if (window.speechSynthesis) speechSynthesis.cancel(); }
  };
  el.addEventListener('click', h);
  cleanup = function () { clearTimeout(replyT); el.removeEventListener('click', h); if (window.speechSynthesis) speechSynthesis.cancel(); };
  show();
};
VIEWS.drills = function () {
  var groups = []; DRILLS.forEach(function (d) { if (groups.indexOf(d.group) < 0) groups.push(d.group); });
  main.innerHTML = '<div class="page">' + topBar('Endgame drills') + '<p class="muted">The engine defends at full strength. Finish within the target number of moves to master a drill.</p>' + groups.map(function (g) { return '<div class="eyebrow">' + g + '</div><div class="list">' + DRILLS.filter(function (d) { return d.group === g; }).map(function (d) { var b = S.drills[d.id]; return '<button class="item" data-drill="' + d.id + '"><div class="grow"><h3>' + esc(d.title) + '</h3><span class="small muted">' + (d.goal === 'draw' ? 'Hold the draw for ' + d.par + ' moves' : 'Target: ' + d.par + ' moves') + '</span></div>' + (b ? '<span class="badge">' + (d.goal === 'draw' || b <= d.par ? 'Mastered' : 'Best ' + b) + '</span>' : '') + '<span class="chev">›</span></button>'; }).join('') + '</div>'; }).join('') + '</div>';
};
VIEWS.vision = function () {
  var score = 0, left = 30, target = '', running = false, tk = 0;
  main.innerHTML = '<div class="page">' + topBar('Vision trainer', '<span class="clock" id="vt">0:30</span>') + '<div class="row"><div class="grow"><span class="eyebrow">Tap this square</span><div id="vs" style="font:700 34px var(--display)">Ready?</div></div><div style="text-align:right"><span class="eyebrow">Score</span><div id="vc" style="font:700 22px var(--display)">0</div></div></div><div id="bd"></div><p class="small muted">Best: <span id="vb">' + S.vision + '</span> in 30 seconds. The board turns at random, so learn it from both sides.</p><button class="btn primary big" id="vgo">Start</button></div>';
  function pickSq() { var n; do { n = 'abcdefgh'[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8)); } while (n === target); target = n; $('#vs').textContent = n; }
  var board = new Board($('#bd'), { onTap: function (s) {
    if (!running) return;
    if (s === target) { score++; $('#vc').textContent = score; sfx.move(); pickSq(); } else { sfx.bad(); board.setState({ marks: [s] }); setTimeout(function () { board.setState({ marks: [] }); }, 250); }
  } });
  board.setPos(new T.Pos('4k3/8/8/8/8/8/8/4K3 w - - 0 1'));
  $('#vgo').onclick = function () {
    score = 0; left = 30; running = true; board.setFlip(Math.random() < .5); $('#vc').textContent = 0; $('#vgo').hidden = true; pickSq();
    clearInterval(tk); tk = setInterval(function () {
      left--; $('#vt').textContent = fmtClock(left * 1000);
      if (left > 0) return;
      clearInterval(tk); running = false; $('#vs').textContent = score + ' correct';
      if (score > S.vision) { S.vision = score; save(); $('#vb').textContent = score; }
      $('#vgo').hidden = false; $('#vgo').textContent = 'Go again'; sfx.end();
    }, 1000);
  };
  cleanup = function () { clearInterval(tk); };
};
VIEWS.openings = function () {
  main.innerHTML = '<div class="page">' + topBar('Opening explorer') + '<input id="oq" type="search" placeholder="Search by name, such as Sicilian" aria-label="Search openings"><div class="list" id="ol"></div></div>';
  function draw(q) { $('#ol').innerHTML = OPENINGS.map(function (o, i) { return [o, i]; }).filter(function (x) { return x[0][0].toLowerCase().indexOf(q) >= 0; }).map(function (x) { return '<button class="item" data-open="' + x[1] + '"><div class="grow"><h3>' + esc(x[0][0]) + '</h3><span class="small muted">' + esc(x[0][1].split(' ').slice(0, 6).join(' ')) + '</span></div><span class="chev">›</span></button>'; }).join('') || '<div class="item muted">No opening matches that name.</div>'; }
  draw(''); $('#oq').oninput = function (e) { draw(e.target.value.toLowerCase()); };
};
VIEWS.opening = function (i) {
  var o = OPENINGS[i], sans = o[1].split(' '), idx = 0, practice = false, pos = new T.Pos(), myColor = 0, autoT = 0;
  main.innerHTML = '<div class="page">' + topBar(o[0]) + '<div id="bd"></div><div class="card"><p>' + esc(o[2]) + '</p><div class="moves" id="ol"></div><p class="small muted" id="om" role="status">Step through the moves, or practise playing them from memory.</p></div><div class="tools"><button class="btn tool" data-o="prev">Back</button><button class="btn tool" data-o="next">Next</button><button class="btn tool" data-o="practice">Practise</button><button class="btn tool" data-o="play">Play from here</button></div></div>';
  var board = new Board($('#bd'), { dests: function (s) { return practice && pos.turn === myColor && idx < sans.length ? legalDests(pos, s) : []; }, onMove: function (u) {
    var want = pos.parseSan(sans[idx]);
    if (want && T.uci(want) === u) { sfx.good(); step(1); $('#om').textContent = 'Correct.'; auto(); }
    else { sfx.bad(); $('#om').textContent = 'The main line plays ' + sans[idx] + ' here.'; board.setState({ arrows: [[T.uci(want).slice(0, 2), T.uci(want).slice(2, 4)]] }); board.setPos(pos); }
  } });
  function auto() {
    if (idx >= sans.length) { $('#om').textContent = 'Line complete. You know this one.'; practice = false; return; }
    if (pos.turn !== myColor) autoT = setTimeout(function () { if (practice) { step(1); auto(); } }, 400);
  }
  function step(d) {
    if (d > 0 && idx < sans.length) { pos.make(pos.parseSan(sans[idx])); idx++; sfx.move(); }
    if (d < 0 && idx > 0) { pos.unmake(); idx--; }
    draw();
  }
  function draw() {
    board.setPos(pos);
    var last = pos.stack.length ? T.uci(pos.stack[pos.stack.length - 7]) : null;
    board.setState({ last: last ? [last.slice(0, 2), last.slice(2, 4)] : [], check: checkSq(pos), arrows: [] });
    var h = ''; sans.forEach(function (s, k) { if (k % 2 === 0) h += '<span>' + (k / 2 + 1) + '.</span>'; h += '<button class="' + (k + 1 === idx ? 'on' : '') + '" data-oi="' + (k + 1) + '">' + esc(s) + '</button>'; });
    $('#ol').innerHTML = h;
  }
  var el = main, H = function (e) {
    var b = e.target.closest('[data-o]');
    if (b) {
      var k = b.dataset.o; clearTimeout(autoT);
      if (k === 'prev') { practice = false; step(-1); }
      if (k === 'next') { practice = false; step(1); }
      if (k === 'practice') {
        while (idx > 0) step(-1);
        myColor = /Defense|Accepted|Slav|Benoni|Benko|Dutch|Grünfeld|Indian Defense/.test(o[0]) ? 1 : 0;
        practice = true; board.setFlip(myColor === 1);
        $('#om').textContent = 'You play ' + (myColor ? 'Black' : 'White') + '. Play the main line from memory.'; auto();
      }
      if (k === 'play') { var q = new T.Pos(), u = []; sans.slice(0, idx).forEach(function (s) { var m = q.parseSan(s); u.push(T.uci(m)); q.make(m); }); setup.color = q.turn ? 'black' : 'white'; startBot(T.START, u); }
    }
    var oi = e.target.closest('[data-oi]'); if (oi) { practice = false; var tgt = +oi.dataset.oi; while (idx > tgt) step(-1); while (idx < tgt) step(1); }
  };
  el.addEventListener('click', H); cleanup = function () { practice = false; clearTimeout(autoT); el.removeEventListener('click', H); };
  draw();
};
