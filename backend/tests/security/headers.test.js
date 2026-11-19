import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../../src/app.js';

/**
 * Helmet hardening (PR-27).
 *
 * These assert the defaults that are actually shipped, not every header the
 * package can emit: a header disappearing is a regression, a new default is not
 * necessarily a failure.
 */
describe('Security headers', () => {
  it('sets Helmet headers on a normal API response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'"
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('does not advertise the Express framework', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('sets Helmet headers on rejection responses too', async () => {
    // Rejected before any route handler: a 403 from the Origin guard.
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(403);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('keeps the documented JSON error envelope with Helmet enabled', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'The requested resource could not be found.',
    });
    expect(response.headers['content-type']).toContain('application/json');
  });
});
