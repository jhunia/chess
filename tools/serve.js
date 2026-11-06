// Serves the built standalone page for local testing.
const http = require('http'), fs = require('fs'), path = require('path');
http.createServer((req, res) => {
  const f = path.join(__dirname, '..', 'tempo-chess-standalone.html');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(f));
}).listen(process.env.PORT || 5188, () => console.log('ready'));
