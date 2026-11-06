// Mines tactics from noisy engine self-play. Usage: node gen-puzzles.js <outFile> <seconds>
const fs = require('fs'), vm = require('vm');
const T = require('../src/engine.js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../src/openings.js', 'utf8') + ';this.O=OPENINGS', ctx);
const OPENINGS = ctx.O, [out, secs] = [process.argv[2], +process.argv[3] || 60];
const end = Date.now() + secs * 1000, found = [], seen = new Set();
const pick = a => a[Math.floor(Math.random() * a.length)];
const LIM = { depth: 7, multipv: 2, maxNodes: 120000 };
const V = T.VAL;

function isMate(s) { return Math.abs(s) > T.MATE - 200; }
function themes(p, m, line, mate) {
  const t = [], from = T.mFrom(m), to = T.mTo(m), mover = p.b[from], ty = mover & 7, cap = p.b[to], them = 1 - p.turn;
  if (mate) t.push('mate' + Math.min(mate, 4));
  if (T.mPromo(m)) t.push('promotion');
  let phase = 0; for (let s = 0; s < 120; s++) { if (s & 136) { s += 7; continue; } const q = p.b[s] & 7; if (q > 1 && q < 6) phase += q === 5 ? 4 : q === 4 ? 2 : 1; }
  if (phase <= 8) t.push('endgame');
  const defended = p.attacked(to, them);
  if (cap && !defended) t.push('hanging');
  p.make(m);
  const replyCaptures = p.attacked(to, p.turn);
  if (replyCaptures && V[ty] > (cap ? V[cap & 7] : 0) + 50 && ty !== 6) t.push('sacrifice');
  // Fork: the moved piece attacks two or more valuable targets that it can actually win.
  const atk = [], b = p.b, enemy = p.turn ? 8 : 0;
  const scan = (d, slide) => { let s = to + d; while (!(s & 136)) { const q = b[s]; if (q) { if ((q & 8) === enemy) atk.push(s); break; } if (!slide) break; s += d; } };
  const KN = [33, 31, 18, 14, -33, -31, -18, -14], D = [1, -1, 16, -16, 17, 15, -17, -15];
  if (ty === 2) KN.forEach(d => scan(d, false));
  else if (ty === 3) D.slice(4).forEach(d => scan(d, true));
  else if (ty === 4) D.slice(0, 4).forEach(d => scan(d, true));
  else if (ty === 5) D.forEach(d => scan(d, true));
  else if (ty === 1) { const fw = p.turn ? 16 : -16; [fw + 1, fw - 1].forEach(d => scan(d, false)); }
  const big = atk.filter(s => (b[s] & 7) === 6 || V[b[s] & 7] > V[ty]);
  if (!replyCaptures && big.length >= 2) t.push('fork');
  // Pin or skewer: a slider attacks a piece with a more or equally valuable piece directly behind it.
  if (ty >= 3 && ty <= 5) {
    const ds = ty === 3 ? D.slice(4) : ty === 4 ? D.slice(0, 4) : D;
    for (const d of ds) {
      let s = to + d; while (!(s & 136) && !b[s]) s += d;
      if (s & 136 || (b[s] & 8) !== enemy) continue;
      let r = s + d; while (!(r & 136) && !b[r]) r += d;
      if (r & 136 || (b[r] & 8) !== enemy) continue;
      const first = b[s] & 7, second = b[r] & 7;
      if (second === 6 || V[second] > V[first] + 50) { if (!t.includes('pin')) t.push('pin'); }
      else if (first === 6 || (V[first] > V[second] + 50 && first >= 4)) { if (!t.includes('skewer')) t.push('skewer'); }
    }
  }
  const check = p.inCheck();
  p.unmake();
  if (mate && (ty === 4 || ty === 5) && ((to >> 4) === 0 || (to >> 4) === 7)) t.push('backrank');
  if (!cap && !check && !T.mPromo(m)) t.push('quiet');
  if (!t.some(x => x !== 'endgame' && x !== 'quiet')) t.push(cap ? 'material' : 'tactic');
  return t;
}
function tryPuzzle(p, prevEval, prevUci, prevFen) {
  const r = T.search(p, LIM);
  if (r.lines.length < 2) return;
  const [a, b] = r.lines;
  const mate = isMate(a.score) && a.score > 0 ? T.mateIn(a.score) : 0;
  if (mate) { if (mate > 4 || (isMate(b.score) && b.score > 0) || b.score > 300) return; }
  else if (a.score < 200 || a.score - b.score < 200 || a.score < prevEval + 200 || Math.abs(prevEval) > 400) return;
  if (seen.has(prevFen)) return;
  const line = [T.uci(a.move)], first = a.move; let made = 0, ok = true, cur = a, players = 1, baseT = themes(p, first, line, mate);
  p.make(cur.move); made++;
  for (; players < 4;) {
    if (!p.moves().length) break;
    const rep = T.search(p, { depth: 7, maxNodes: 120000 });
    const reply = rep.lines[0].move;
    p.make(reply); made++;
    if (!p.moves().length) { break; }
    const nx = T.search(p, LIM);
    const c = nx.lines[0], d = nx.lines[1];
    const unique = !d || (isMate(c.score) && c.score > 0 ? !(isMate(d.score) && d.score > 0) || mate : c.score > 150 && c.score - d.score >= 200);
    if (!unique) { if (mate) ok = false; p.unmake(); made--; break; }
    line.push(T.uci(reply), T.uci(c.move)); players++;
    p.make(c.move); made++;
  }
  // A mate puzzle must really finish in checkmate.
  if (mate && (p.moves().length || !p.inCheck())) ok = false;
  while (made--) p.unmake();
  if (!ok) return;
  const shallow = T.search(p, { depth: 2 }).lines[0].move, mid = T.search(p, { depth: 4 }).lines[0].move;
  let rating = mate === 1 ? 450 : mate === 2 ? 1000 : mate === 3 ? 1500 : mate ? 1800 : 800 + (players - 1) * 250;
  if (shallow !== first) rating += 150;
  if (mid !== first) rating += 350;
  if (baseT.includes('quiet')) rating += 150;
  if (baseT.includes('sacrifice')) rating += 200;
  rating += Math.floor(Math.random() * 120) - 60;
  seen.add(prevFen);
  found.push({ f: prevFen, p: prevUci, m: line.join(' '), r: Math.max(300, Math.min(2600, rating)), t: baseT });
}
while (Date.now() < end) {
  const [, san] = pick(OPENINGS), p = new T.Pos();
  const sans = san.split(' '); const cut = 2 + Math.floor(Math.random() * (sans.length - 1));
  for (const s of sans.slice(0, cut)) { const m = p.parseSan(s); if (!m) break; p.make(m); }
  let prevEval = 0;
  for (let ply = 0; ply < 110 && !p.status() && Date.now() < end; ply++) {
    const r = T.search(p, { depth: 3, multipv: 6, maxNodes: 20000 });
    const best = r.lines[0], blunder = Math.random() < 0.3;
    let pickL = best;
    if (blunder) pickL = r.lines[r.lines.length - 1];
    else { const good = r.lines.filter(l => best.score - l.score < 40); pickL = pick(good); }
    const prevFen = p.fen(), myEval = best.score;
    p.make(pickL.move);
    const u = T.uci(pickL.move);
    if (!p.status() && p.full >= 6) tryPuzzle(p, -myEval, u, prevFen);
    prevEval = -pickL.score;
    if (Math.abs(best.score) > 900) break;
  }
}
fs.writeFileSync(out, JSON.stringify(found));
console.log('found', found.length);
