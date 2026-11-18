import { describe, test, expect } from 'vitest';
import http from 'node:http';
import app from '../src/app.js';
import request from 'supertest';
import { errorHandler } from '../src/app.js';

// Imperative HTTP helpers so tests can control the exact wire headers.
// Supertest auto-assigns a Content-Type when `.send()` receives a string,
// so a genuinely header-less body has to be sent with node:http directly.

function startServer() {
  const server = app.listen(0);
  return new Promise((resolve) => {
    server.once('listening', () => resolve(server));
  });
}

async function stopServer(server) {
  // Drop keep-alive sockets first so close() cannot hang.
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

// Sends a raw request and resolves once the response has been fully received.
function rawRequest({ port, path, method = 'POST', headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method, headers },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            raw,
            sentHeaders: req.getHeaders(),
          })
        );
        res.on('error', reject);
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('PR-12 Error handling', () => {
  test('unknown route returns 404 with error envelope', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body).toHaveProperty('message');
  });

  test('bodyless POST without Content-Type is allowed through guard', async () => {
    // No Content-Type and no body: the guard must not reject this.
    const response = await request(app).post('/api/auth/logout');
    expect(response.status).not.toBe(400);
  });

  test('POST with a body and no Content-Type returns 400 BAD_REQUEST', async () => {
    const server = await startServer();

    try {
      const { port } = server.address();
      const payload = '{"email":"test@test.com"}';

      const { status, raw, sentHeaders } = await rawRequest({
        port,
        path: '/api/auth/signup',
        // Content-Length, deliberately no Content-Type.
        headers: { 'Content-Length': Buffer.byteLength(payload) },
        body: payload,
      });

      // Prove the wire request really had a body and no Content-Type.
      expect(sentHeaders['content-type']).toBeUndefined();
      expect(Number(sentHeaders['content-length'])).toBeGreaterThan(0);

      expect(status).toBe(400);
      expect(JSON.parse(raw)).toEqual({
        code: 'BAD_REQUEST',
        message: expect.any(String),
      });
    } finally {
      await stopServer(server);
    }
  });

  test('chunked POST without Content-Type returns 400 BAD_REQUEST', async () => {
    const payload = '{"email":"chunked@test.com"}';

    // Step 1: send the identical request shape to a probe server that records
    // what actually arrives on the wire. This proves the request is genuinely
    // chunked, has no Content-Type, and carries a non-empty body — rather than
    // relying on shell experiments or Supertest's implicit headers.
    const probe = http.createServer((req, res) => {
      let bytes = 0;
      req.on('data', (chunk) => {
        bytes += chunk.length;
      });
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ headers: req.headers, bytes }));
      });
    });
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));

    let wire;
    try {
      const probeResult = await rawRequest({
        port: probe.address().port,
        path: '/api/auth/signup',
        headers: { 'Transfer-Encoding': 'chunked' },
        body: payload,
      });
      wire = JSON.parse(probeResult.raw);
    } finally {
      probe.closeAllConnections?.();
      await new Promise((resolve) => probe.close(resolve));
    }

    expect(wire.headers['transfer-encoding']).toBe('chunked');
    expect(wire.headers['content-type']).toBeUndefined();
    expect(wire.headers['content-length']).toBeUndefined();
    expect(wire.bytes).toBe(Buffer.byteLength(payload));

    // Step 2: same shape against the real app; the guard must reject it.
    const server = await startServer();

    try {
      const { status, raw } = await rawRequest({
        port: server.address().port,
        path: '/api/auth/signup',
        // Node's HTTP client frames the chunked encoding itself.
        headers: { 'Transfer-Encoding': 'chunked' },
        body: payload,
      });

      expect(status).toBe(400);
      expect(JSON.parse(raw)).toEqual({
        code: 'BAD_REQUEST',
        message: expect.any(String),
      });
    } finally {
      await stopServer(server);
    }
  });

  test('POST with text/plain Content-Type returns 400 BAD_REQUEST', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'text/plain')
      .send('email=test@test.com&password=pass');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(response.body).toHaveProperty('message');
  });

  test('POST with application/json Content-Type is accepted', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('{"email":"test@test.com"}');

    // Guard accepts it; the route itself does not exist yet, so 404 is fine.
    expect(response.status).not.toBe(400);
  });

  test('POST with application/json; charset=utf-8 Content-Type is accepted', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json; charset=utf-8')
      .send('{"email":"test@test.com"}');

    expect(response.status).not.toBe(400);
  });

  test('POST with uppercase APPLICATION/JSON Content-Type is accepted', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'APPLICATION/JSON')
      .send('{"email":"test@test.com"}');

    expect(response.status).not.toBe(400);
  });

  test('POST with application/jsonp Content-Type returns 400 BAD_REQUEST', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/jsonp')
      .send('{"email":"test@test.com"}');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('code', 'BAD_REQUEST');
  });

  test('OPTIONS request is not rejected by Content-Type guard', async () => {
    const response = await request(app).options('/api/auth/signup');
    expect(response.status).not.toBe(400);
  });

  test('malformed JSON with application/json returns 400 BAD_REQUEST', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('not valid json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).not.toContain('stack');
    expect(response.body.message).not.toContain('node_modules');
  });

  test('POST to /apix/... with text/plain is not rejected by Content-Type guard', async () => {
    // /apix does NOT start with /api, so the Content-Type guard should not apply.
    // The request falls through to the unknown-route 404 handler.
    const response = await request(app)
      .post('/apix/auth/signup')
      .set('Content-Type', 'text/plain')
      .send('email=test@test.com&password=pass');

    // The guard does not run, so we get the unknown-route 404.
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body).toHaveProperty('message');
  });

  test('genuine raw HTTP chunked POST with CHUNKED (uppercase) and no Content-Type returns 400 BAD_REQUEST', async () => {
    // Verify the uppercase CHUNKED normalization fix from the middleware.
    // Use raw node:http so Supertest does not auto-assign a Content-Type.
    // Path is /api/auth/signup so the guard applies; uppercase CHUNKED tests the normalization.
    const server = await startServer();

    try {
      const { port } = server.address();
      const payload = '{"email":"chunkedupper@test.com"}';

      const { status, raw } = await rawRequest({
        port,
        path: '/api/auth/signup',
        headers: { 'Transfer-Encoding': 'CHUNKED' },
        body: payload,
      });

      // The guard runs because path is /api/... and method is POST.
      // Uppercase CHUNKED must be normalized to lowercase before comparison.
      expect(status).toBe(400);
      expect(JSON.parse(raw)).toEqual({
        code: 'BAD_REQUEST',
        message: expect.any(String),
      });
    } finally {
      await stopServer(server);
    }
  });

  test('genuine unexpected error returns sanitized INTERNAL 500', () => {
    // Invoke the exported error handler directly so no test-only route is needed.
    // The error is a real Error carrying real internal detail; nothing about it
    // may reach the client.
    const mockRes = {
      statusCode: null,
      body: null,
      headersSent: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    const mockNext = () => {};

    const sensitiveErr = new Error(
      'Sensitive internal data that must not leak'
    );
    sensitiveErr.code = 'SENSITIVE_CODE';

    errorHandler(sensitiveErr, {}, mockRes, mockNext);

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes.body).toEqual({
      code: 'INTERNAL',
      message: 'Internal server error',
    });
    // The envelope has exactly the two documented keys, no stack or code leaks.
    expect(Object.keys(mockRes.body)).toEqual(['code', 'message']);

    const serialized = JSON.stringify(mockRes.body);
    expect(serialized).not.toContain(sensitiveErr.message);
    expect(serialized).not.toContain('SENSITIVE_CODE');
    expect(serialized).not.toContain('node_modules');
    // No frame from the original stack is echoed back to the client.
    for (const frame of sensitiveErr.stack.split('\n').slice(1)) {
      expect(serialized).not.toContain(frame.trim());
    }
  });
});
