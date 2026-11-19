import { compare, hash } from '@dwelling/shared';

import { prisma } from '../db/prisma.js';
import { EmailTakenError, InvalidCredentialsError } from './errors.js';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
};

const LOGIN_USER_FIELDS = {
  ...PUBLIC_USER_FIELDS,
  passwordHash: true,
};

/**
 * A valid bcrypt hash of a value no account uses. Comparing against it when the
 * email is unknown keeps login timing close to a wrong-password attempt, so the
 * response does not reveal whether an address is registered.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$10$ETKqbwmREq/YfWfdbxHN7ONRVkqOiHmAQNld2NVpC5tiAG6CVgdtu';

/**
 * Loads the public profile for a session's user id.
 *
 * Returns `null` when the account no longer exists, so the route can answer
 * with the same `401` it uses for any other unusable session.
 *
 * @param {string} userId
 * @returns {Promise<{ id: string, email: string, displayName: string, createdAt: Date } | null>}
 */
export async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_FIELDS,
  });
}

export async function signupUser({ email, password, displayName }) {
  const passwordHash = await hash(password);

  try {
    return await prisma.user.create({
      data: { email, passwordHash, displayName },
      select: PUBLIC_USER_FIELDS,
    });
  } catch (error) {
    // The database's unique index is the only reliable guard against
    // concurrent signups racing past an application-level check.
    if (error?.code === 'P2002') {
      throw new EmailTakenError();
    }

    throw error;
  }
}

/**
 * Authenticates an email/password pair.
 *
 * Returns only the public user fields. Both an unknown email and a wrong
 * password throw the same InvalidCredentialsError, and the password comparison
 * always runs so the two paths stay similar in cost.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ id: string, email: string, displayName: string, createdAt: Date }>}
 */
export async function loginUser({ email, password }) {
  const record = await prisma.user.findUnique({
    where: { email },
    select: LOGIN_USER_FIELDS,
  });

  const matches = await compare(
    password,
    record?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!record || !matches) {
    throw new InvalidCredentialsError();
  }

  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt,
  };
}
