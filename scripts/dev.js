'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/book-call.js');
const root = path.resolve(__dirname, '../public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/book-call') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) { res.writeHead(413).end(); return; }
    }
    req.body = body;
    return handler(req, res);
  }
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const portArgument = process.argv.indexOf('--port');
const previewPort = Number(portArgument >= 0 ? process.argv[portArgument + 1] : process.env.PORT || 3000);
if (!Number.isInteger(previewPort) || previewPort < 1 || previewPort > 65535) throw new Error('Invalid preview port');
server.listen(previewPort, '0.0.0.0', () => console.log('Portfolio preview listening on port ' + server.address().port));
