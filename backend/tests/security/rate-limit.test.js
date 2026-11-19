import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import {
  AUTH_RATE_LIMIT,
  GLOBAL_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
  createRateLimiter,
} from '../../src/middleware/rateLimit.js';

const ALLOWED_ORIGIN = env.clientOrigin;

const RATE_LIMITED = {
  code: 'RATE_LIMITED',
  message: 'Too many requests. Try again later.',
};

/** A minimal app so a limiter can be exercised without the real routes. */
function buildProbeApp(limiter) {
  const probe = express();
  probe.use(limiter);
  probe.get('/ping', (_request, response) => response.json({ ok: true }));
  return probe;
}

function expectRateLimited(response) {
  expect(response.status).toBe(429);
  expect(response.body).toEqual(RATE_LIMITED);
  expect(response.headers['content-type']).toContain('application/json');

  const retryAfter = response.headers['retry-after'];
  expect(retryAfter).toMatch(/^\d+$/);
  expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
}

describe('Rate limiting', () => {
  it('uses the documented windows and limits', () => {
    expect(RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
    expect(GLOBAL_RATE_LIMIT).toBe(300);
    expect(AUTH_RATE_LIMIT).toBe(10);
  });

  it('answers 429 with the documented envelope and Retry-After', async () => {
    const probe = buildProbeApp(
      createRateLimiter({ windowMs: 60_000, limit: 2 })
    );

    expect((await request(probe).get('/ping')).status).toBe(200);
    expect((await request(probe).get('/ping')).status).toBe(200);

    const limited = await request(probe).get('/ping');

    expectRateLimited(limited);
    expect(limited.headers.ratelimit).toBeDefined();
    expect(limited.headers['ratelimit-policy']).toBeDefined();
    // Legacy headers are disabled.
    expect(limited.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('keeps counters isolated between limiter instances', async () => {
    const first = buildProbeApp(
      createRateLimiter({ windowMs: 60_000, limit: 1 })
    );
    const second = buildProbeApp(
      createRateLimiter({ windowMs: 60_000, limit: 1 })
    );

    expect((await request(first).get('/ping')).status).toBe(200);
    expect((await request(first).get('/ping')).status).toBe(429);

    // A fresh instance must not inherit the exhausted counter.
    expect((await request(second).get('/ping')).status).toBe(200);
  });

  it('limits login and signup to the stricter auth budget', async () => {
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .set('Origin', ALLOWED_ORIGIN)
        .send({});

    // The limiter runs before validation, so rejected payloads still count.
    for (let index = 0; index < AUTH_RATE_LIMIT; index += 1) {
      const response = await attempt();
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_FAILED');
    }

    expectRateLimited(await attempt());

    // Signup shares the same stricter limiter (and IP key).
    const signup = await request(app)
      .post('/api/signup')
      .set('Origin', ALLOWED_ORIGIN)
      .send({});

    expectRateLimited(signup);
  });

  it('does not apply the stricter limiter to logout or /api/auth/me', async () => {
    // Run after the auth limiter has been exhausted, so these routes can only
    // succeed if they are outside it.
    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Origin', ALLOWED_ORIGIN);

    expect(logout.status).toBe(204);

    const me = await request(app).get('/api/auth/me');

    expect(me.status).toBe(401);
    expect(me.body).toHaveProperty('code', 'AUTH_REQUIRED');
  });

  it('limits the whole API and keeps health available', async () => {
    // GET requests to an unknown route consume the global budget and answer
    // 404 until the limiter trips.
    let limited;
    for (let index = 0; index <= GLOBAL_RATE_LIMIT + 5; index += 1) {
      const response = await request(app).get('/api/rate-limit-probe');

      if (response.status === 429) {
        limited = response;
        break;
      }

      expect(response.status).toBe(404);
    }

    expect(limited).toBeDefined();
    expectRateLimited(limited);

    // The health check is exempt, so it still answers after exhaustion.
    const health = await request(app).get('/api/health');

    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
  });
});
