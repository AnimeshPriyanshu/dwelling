import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { env } from '../../src/config/env.js';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  sessionCookieOptions,
  setSessionCookie,
} from '../../src/auth/cookies.js';
import { SESSION_TTL_SECONDS } from '../../src/auth/jwt.js';

/** Minimal stand-in for an Express response. */
function fakeResponse() {
  return { cookie: vi.fn() };
}

/** Runs a cookie helper through a real Express response and returns the header. */
async function emittedCookieHeader(writeCookie) {
  const app = express();
  app.get('/session', (_request, response) => {
    writeCookie(response);
    response.status(204).end();
  });

  const response = await request(app).get('/session');
  return response.headers['set-cookie'][0];
}

describe('session cookie helpers', () => {
  it('uses the documented cookie name', () => {
    expect(SESSION_COOKIE_NAME).toBe('dwelling_session');
  });

  it('applies the ADR-0022 attributes', () => {
    expect(sessionCookieOptions({ isProduction: false })).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
  });

  it('matches the seven-day token lifetime', () => {
    expect(sessionCookieOptions().maxAge).toBe(604800 * 1000);
  });

  it('sets Secure only in production', () => {
    expect(sessionCookieOptions({ isProduction: true }).secure).toBe(true);
    expect(sessionCookieOptions({ isProduction: false }).secure).toBe(false);
  });

  it('defaults the environment-dependent flags from the config module', () => {
    const options = sessionCookieOptions();

    expect(options.secure).toBe(env.isProduction);
  });

  it('sets the session cookie on a response', () => {
    const response = fakeResponse();

    setSessionCookie(response, 'signed.jwt.value', { isProduction: false });

    expect(response.cookie).toHaveBeenCalledTimes(1);
    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      'signed.jwt.value',
      sessionCookieOptions({ isProduction: false })
    );
  });

  it('clears the cookie with the same attributes and Max-Age=0', () => {
    const response = fakeResponse();

    clearSessionCookie(response, { isProduction: true });

    expect(response.cookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 0,
    });
  });

  it('emits the ADR-0022 attributes in the Set-Cookie header', async () => {
    const header = await emittedCookieHeader((response) =>
      setSessionCookie(response, 'signed.jwt.value', { isProduction: false })
    );

    expect(header).toContain(`${SESSION_COOKIE_NAME}=signed.jwt.value`);
    expect(header).toContain('Max-Age=604800');
    expect(header).toContain('Path=/');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).not.toContain('Secure');
  });

  it('adds Secure to the header only in production', async () => {
    const header = await emittedCookieHeader((response) =>
      setSessionCookie(response, 'signed.jwt.value', { isProduction: true })
    );

    expect(header).toContain('Secure');
    expect(header).toContain('HttpOnly');
  });

  it('expires the cookie in the header when cleared', async () => {
    const header = await emittedCookieHeader((response) =>
      clearSessionCookie(response, { isProduction: true })
    );

    expect(header).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(header).toContain('Max-Age=0');
    expect(header).toContain('Path=/');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header).toContain('SameSite=Lax');

    // The browser drops a cookie whose Expires is in the past or now.
    const expires = /Expires=([^;]+)/.exec(header)?.[1];
    expect(expires).toBeDefined();
    expect(new Date(expires).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('rejects invalid arguments', () => {
    expect(() => setSessionCookie(null, 'token')).toThrow(TypeError);
    expect(() => setSessionCookie(fakeResponse(), '')).toThrow(TypeError);
    expect(() => clearSessionCookie(null)).toThrow(TypeError);
  });
});
