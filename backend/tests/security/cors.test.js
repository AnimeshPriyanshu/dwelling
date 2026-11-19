import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { normalizeOrigin } from '../../src/middleware/originCheck.js';

const ALLOWED_ORIGIN = normalizeOrigin(env.clientOrigin);
const FOREIGN_ORIGIN = 'http://evil.example';

describe('CORS', () => {
  it('returns the allowed origin and allows credentials', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', ALLOWED_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      ALLOWED_ORIGIN
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers.vary).toContain('Origin');
  });

  it('answers an OPTIONS preflight for a state-changing route', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      ALLOWED_ORIGIN
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toMatch(
      /content-type/i
    );
    expect(Number(response.headers['access-control-max-age'])).toBeGreaterThan(
      0
    );
  });

  it('does not allow a foreign origin on a simple request', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', FOREIGN_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials']
    ).toBeUndefined();
  });

  it('does not allow a foreign origin on a preflight', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', FOREIGN_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never answers with a wildcard origin', async () => {
    for (const origin of [ALLOWED_ORIGIN, FOREIGN_ORIGIN]) {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', origin);

      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    }
  });

  it('adds no CORS headers for requests without an Origin header', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
