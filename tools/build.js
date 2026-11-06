// Merges the puzzle runs and bundles everything into one page (tempo-chess.html) plus a standalone copy.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const seen = new Set(), puzzles = [];
for (const f of fs.readdirSync(path.join(root, 'build')).filter(f => /^p\d+\.json$/.test(f)))
  for (const z of JSON.parse(rd('build/' + f))) if (!seen.has(z.f)) { seen.add(z.f); puzzles.push(z); }
puzzles.sort((a, b) => a.r - b.r);
fs.writeFileSync(path.join(root, 'build/puzzles.json'), JSON.stringify(puzzles));
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Instrument+Sans:wght@400;600;700&display=swap">';
const body = `<title>Tempo Chess</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${rd('src/style.css')}</style>
<div id="shell"><main id="main"></main><nav id="nav" aria-label="Main"></nav></div>
<script id="engine-src">${rd('src/engine.js')}</script>
<script>var PUZZLES=${JSON.stringify(puzzles)};
${rd('src/openings.js')}
${rd('src/content.js')}
${rd('src/core.js')}
${rd('src/app.js')}
${rd('src/app2.js')}
${rd('src/app3.js')}</script>`;
if (/<\/script>/i.test(rd('src/engine.js'))) throw new Error('engine source contains a closing script tag');
fs.writeFileSync(path.join(root, 'tempo-chess.html'), body);
// The standalone copy carries its own head so it can be hosted anywhere and added to an iPhone home screen.
fs.writeFileSync(path.join(root, 'tempo-chess-standalone.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Tempo"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style></head><body>${body}</body></html>`);
console.log('puzzles', puzzles.length, 'page KB', Math.round(fs.statSync(path.join(root, 'tempo-chess.html')).size / 1024));
