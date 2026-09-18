const http = require('http');

const PORT = parseInt(process.env.PORT || '8080', 10);
const INTERNAL_PORT = 3000;

// Start Next.js standalone server on internal port 3000
process.env.PORT = String(INTERNAL_PORT);
process.env.HOSTNAME = '127.0.0.1';

require('./apps/web/server.js');

function forwardRequest(req, res, targetPort) {
  const headers = { ...req.headers };
  delete headers['upgrade'];
  delete headers['http2-settings'];
  if (headers['connection']) {
    headers['connection'] = headers['connection'].replace(/upgrade/gi, '').trim();
    if (!headers['connection']) delete headers['connection'];
  }

  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders['transfer-encoding'];
      responseHeaders['content-length'] = String(body.length);
      responseHeaders['connection'] = 'close';

      res.writeHead(proxyRes.statusCode, responseHeaders);
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain', 'connection': 'close' });
    }
    res.end('Gateway Error: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  forwardRequest(req, res, INTERNAL_PORT);
});

server.on('upgrade', (req, socket, head) => {
  const upgradeHeader = (req.headers.upgrade || '').toLowerCase();

  if (upgradeHeader === 'h2c') {
    // Client (Floci Java HttpClient) attempted HTTP/2 cleartext upgrade.
    // Wrap the raw socket in a standard ServerResponse and proxy w
    // ith explicit Content-Length.
    const res = new http.ServerResponse(req);
    res.assignSocket(socket);
    forwardRequest(req, res, INTERNAL_PORT);
  } else {
    // Forward websocket upgrades to Next.js
    const options = {
      hostname: '127.0.0.1',
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options);
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      let headStr = `HTTP/1.1 101 Switching Protocols\r\n`;
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (Array.isArray(v)) {
          for (const val of v) headStr += `${k}: ${val}\r\n`;
        } else {
          headStr += `${k}: ${v}\r\n`;
        }
      }
      headStr += '\r\n';
      socket.write(headStr);
      if (proxyHead && proxyHead.length > 0) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', () => socket.destroy());
    proxyReq.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Application ready on port ${PORT}`);
});
