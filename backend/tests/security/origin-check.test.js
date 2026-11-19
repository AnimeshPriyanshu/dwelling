import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { normalizeOrigin } from '../../src/middleware/originCheck.js';

const ALLOWED_ORIGIN = normalizeOrigin(env.clientOrigin);
const FOREIGN_ORIGIN = 'http://evil.example';

const REJECTION = {
  code: 'ORIGIN_NOT_ALLOWED',
  message: 'Request origin is not allowed.',
};

/**
 * Origin/Referer enforcement (PR-27).
 *
 * `POST /api/auth/logout` is used as the probe because it is unauthenticated
 * and returns `204` whenever the request passes the transport guards, so a
 * `204` proves the Origin check allowed it and a `403` proves it did not.
 */
describe('Origin/Referer guard', () => {
  it('accepts a state-changing request with a matching Origin', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', ALLOWED_ORIGIN);

    expect(response.status).toBe(204);
  });

  it('accepts a matching Referer when Origin is absent', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Referer', `${ALLOWED_ORIGIN}/some/page`);

    expect(response.status).toBe(204);
  });

  it('rejects a foreign Origin', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', FOREIGN_ORIGIN);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(REJECTION);
  });

  it('rejects a request with neither Origin nor Referer', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(REJECTION);
  });

  it('rejects a foreign Referer when Origin is absent', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Referer', `${FOREIGN_ORIGIN}/page`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(REJECTION);
  });

  it('rejects the opaque origin `null`', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'null');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(REJECTION);
  });

  it('rejects a malformed Referer', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Referer', 'not a url');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(REJECTION);
  });

  it('does not let a valid Referer rescue a foreign Origin', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', FOREIGN_ORIGIN)
      .set('Referer', `${ALLOWED_ORIGIN}/page`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(REJECTION);
  });

  it('never echoes the supplied origin back to the client', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Origin', FOREIGN_ORIGIN);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('evil');
    expect(serialized).not.toContain(FOREIGN_ORIGIN);
  });

  it('guards PUT, PATCH, and DELETE as well as POST', async () => {
    const send = (method, origin) =>
      request(app)[method]('/api/auth/logout').set('Origin', origin);

    for (const method of ['put', 'patch', 'delete']) {
      const rejected = await send(method, FOREIGN_ORIGIN);

      expect(rejected.status, `${method} with foreign origin`).toBe(403);

      const allowed = await send(method, ALLOWED_ORIGIN);

      // No such route exists yet, so passing the guard yields the JSON 404.
      expect(allowed.status, `${method} with allowed origin`).toBe(404);
      expect(allowed.body).toHaveProperty('code', 'NOT_FOUND');
    }
  });

  it('does not block GET /api/auth/me', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('code', 'AUTH_REQUIRED');
  });

  it('does not block GET /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
