const T = require('../src/engine.js');
function perft(p, d) { if (!d) return 1; let n = 0; for (const m of p.moves()) { p.make(m); n += perft(p, d - 1); p.unmake(); } return n; }
const cases = [
  [T.START, 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
];
let ok = true;
for (const [f, d, want] of cases) { const p = new T.Pos(f), n = perft(p, d); if (n !== want || p.fen() !== f) ok = false; console.log(n === want ? 'ok  ' : 'FAIL', d, n, want); }
const p = new T.Pos();
let t = Date.now(); const r = T.search(p, { timeMs: 1500 });
console.log('start depth', r.depth, 'nps', Math.round(r.nodes / ((Date.now() - t) / 1000)), p.san(r.lines[0].move), r.lines[0].score);
const q = new T.Pos('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
const rq = T.search(q, { depth: 5 }); console.log('Scholar mate:', q.san(rq.lines[0].move), T.mateIn(rq.lines[0].score));
const k = new T.Pos('8/8/8/8/8/2k5/8/K1Q5 b - - 0 1'); console.log('fen', k.fen(), k.status());
process.exit(ok ? 0 : 1);
