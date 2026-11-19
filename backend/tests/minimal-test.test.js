import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $transaction: async (fn) => fn(),
    user: { findUnique: vi.fn(), create: vi.fn() },
    dwelling: { findUnique: vi.fn(), create: vi.fn() },
    contact: { findUnique: vi.fn(), create: vi.fn() },
    conversation: { findUnique: vi.fn(), create: vi.fn() },
    message: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    $disconnect: vi.fn(),
  })),
}))

let seed

beforeEach(async () => {
  process.env.DEMO_PASSWORD = 'test-password123'
  const module = await import('/Users/rishabh/Desktop/dwelling/database/seed.js')
  seed = module.seed
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('minimal test', () => {
  it('test wrong email', async () => {
    const prisma = new (await import('@prisma/client')).PrismaClient()
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'demo-alex', email: 'wrong@email.com', passwordHash: '$2a$10$hashed-password', displayName: 'Alex' })
    try { await seed(); throw new Error('Should have thrown') }
    catch (e) { expect(e.message).toContain('wrong email') }
  })
})
