import { hash } from '@dwelling/shared';

import { prisma } from '../db/prisma.js';
import { EmailTakenError } from './errors.js';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
};

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
