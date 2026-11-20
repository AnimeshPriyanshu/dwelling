import { describe, expect, it } from 'vitest';

import {
  decodeMessageCursor,
  encodeMessageCursor,
} from '../../src/messages/cursor.js';
import { InvalidMessageCursorError } from '../../src/messages/errors.js';

const CREATED_AT = new Date('2026-11-14T10:05:00.000Z');

describe('encodeMessageCursor', () => {
  it('round-trips the position through decodeMessageCursor', () => {
    const token = encodeMessageCursor({ id: 'msg_2', createdAt: CREATED_AT });

    expect(decodeMessageCursor(token)).toEqual({
      createdAt: CREATED_AT,
      id: 'msg_2',
    });
  });

  it('emits a base64url token with no padding or JSON-safe characters', () => {
    const token = encodeMessageCursor({ id: 'msg_2', createdAt: CREATED_AT });

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain('=');
    expect(Buffer.from(token, 'base64url').toString('utf8')).toContain(
      CREATED_AT.toISOString()
    );
  });

  it.each([
    ['missing message', undefined],
    ['empty id', { id: '', createdAt: CREATED_AT }],
    ['non-string id', { id: 7, createdAt: CREATED_AT }],
    ['string createdAt', { id: 'msg_2', createdAt: CREATED_AT.toISOString() }],
    ['invalid Date', { id: 'msg_2', createdAt: new Date('nope') }],
  ])('rejects a %s', (_label, message) => {
    expect(() => encodeMessageCursor(message)).toThrow(TypeError);
  });
});

describe('decodeMessageCursor', () => {
  const token = encodeMessageCursor({ id: 'msg_2', createdAt: CREATED_AT });

  it.each([
    ['missing cursor', undefined],
    ['null cursor', null],
    ['empty cursor', ''],
    ['non-string cursor', 42],
    ['standard-base64 padding', `${token}=`],
    ['non-base64url characters', 'not a token!'],
  ])('rejects a %s', (_label, value) => {
    expect(() => decodeMessageCursor(value)).toThrow(InvalidMessageCursorError);
  });

  it.each([
    ['non-JSON payload', 'not-json'],
    ['JSON array', '[]'],
    ['JSON string', '"msg"'],
    ['missing id', JSON.stringify({ createdAt: CREATED_AT.toISOString() })],
    [
      'empty id',
      JSON.stringify({ id: '', createdAt: CREATED_AT.toISOString() }),
    ],
    ['missing createdAt', JSON.stringify({ id: 'msg_2' })],
    [
      'impossible date',
      JSON.stringify({ id: 'msg_2', createdAt: '2026-13-45T99:99:99.000Z' }),
    ],
    [
      'non-canonical timestamp',
      JSON.stringify({ id: 'msg_2', createdAt: '2026-11-14T10:05:00Z' }),
    ],
  ])('rejects a %s payload', (_label, payload) => {
    const encoded = Buffer.from(payload, 'utf8').toString('base64url');

    expect(() => decodeMessageCursor(encoded)).toThrow(
      InvalidMessageCursorError
    );
  });

  it('rejects a cursor larger than the accepted length', () => {
    const oversized = Buffer.from(
      JSON.stringify({
        id: 'x'.repeat(600),
        createdAt: CREATED_AT.toISOString(),
      })
    ).toString('base64url');

    expect(() => decodeMessageCursor(oversized)).toThrow(
      InvalidMessageCursorError
    );
  });
});
