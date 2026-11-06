// Checks every opening line, lesson step, drill and puzzle against the rules engine.
const fs = require('fs'), vm = require('vm');
const T = require('../src/engine.js');
const ctx = {}; vm.createContext(ctx);
const root = __dirname + '/../';
vm.runInContext(fs.readFileSync(root + 'src/openings.js', 'utf8') + fs.readFileSync(root + 'src/content.js', 'utf8') + ';this.D={OPENINGS,BOTS,COACHES,COURSES,DRILLS}', ctx);
const { OPENINGS, COURSES, DRILLS } = ctx.D;
let bad = 0; const fail = (...a) => { bad++; console.log('FAIL', ...a); };
for (const [n, l] of OPENINGS) { const p = new T.Pos(); for (const s of l.split(' ')) { const m = p.parseSan(s); if (!m) { fail(n, s); break; } p.make(m); } }
let steps = 0;
for (const c of COURSES) for (const l of c.lessons) {
  let p = null;
  for (const s of l.steps) {
    steps++;
    if (s.f) { p = new T.Pos(s.f); if (p.inCheck(1 - p.turn)) fail(l.title, 'side not to move in check', s.f); }
    if (!p) { fail(l.title, 'no position'); continue; }
    if (s.move) {
      const opts = [].concat(s.move); let chosen = 0;
      for (const u of opts) { const m = p.parseUci(u); if (!m) fail(l.title, 'illegal', u, p.fen()); else if (!chosen) chosen = m; }
      if (chosen) p.make(chosen);
    } else if (s.goal === 'mate') {
      const ms = p.moves().filter(m => { p.make(m); const r = p.inCheck() && !p.moves().length; p.unmake(); return r; });
      if (!ms.length) fail(l.title, 'no mate', p.fen()); else p.make(ms[0]);
    }
    if (s.reply) { const m = p.parseUci(s.reply); if (!m) fail(l.title, 'illegal reply', s.reply, p.fen()); else p.make(m); }
  }
}
for (const d of DRILLS) { const p = new T.Pos(d.fen); if (p.inCheck(1 - p.turn) || p.status()) fail(d.title, d.fen); }
let puzzles = [];
try { puzzles = JSON.parse(fs.readFileSync(root + 'build/puzzles.json', 'utf8')); } catch (e) { console.log('no puzzle file yet'); }
for (const z of puzzles) {
  const p = new T.Pos(z.f), pre = p.parseUci(z.p);
  if (!pre) { fail('puzzle pre', z.f, z.p); continue; }
  p.make(pre);
  for (const u of z.m.split(' ')) { const m = p.parseUci(u); if (!m) { fail('puzzle', z.f, u); break; } p.make(m); }
  if (z.t.some(t => /^mate\d/.test(t)) && !(p.inCheck() && !p.moves().length)) fail('mate puzzle not mate', z.f, z.m);
}
console.log(`openings ${OPENINGS.length}, lesson steps ${steps}, lessons ${COURSES.reduce((a, c) => a + c.lessons.length, 0)}, drills ${DRILLS.length}, puzzles ${puzzles.length}, failures ${bad}`);
process.exit(bad ? 1 : 0);
