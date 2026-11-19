import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../../src/app.js';
import { SESSION_COOKIE_NAME } from '../../src/auth/cookies.js';

function clearedCookieHeader(response) {
  const header = response.headers['set-cookie']?.[0];
  expect(header).toBeDefined();
  return header;
}

describe('POST /api/auth/logout', () => {
  it('returns 204 with no body', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(response.headers['content-type']).toBeUndefined();
  });

  it('expires the session cookie', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `${SESSION_COOKIE_NAME}=signed.jwt.value`);

    const header = clearedCookieHeader(response);

    expect(header).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(header).toContain('Max-Age=0');
    expect(header).toContain('Path=/');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');

    const expires = /Expires=([^;]+)/.exec(header)?.[1];
    expect(expires).toBeDefined();
    expect(new Date(expires).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('clears the cookie even when no session was sent', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(clearedCookieHeader(response)).toContain(`${SESSION_COOKIE_NAME}=;`);
  });

  it('accepts a bodyless POST without a Content-Type', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(204);
  });
});
