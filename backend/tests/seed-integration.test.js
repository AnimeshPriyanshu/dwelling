import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Real PrismaClient integration — connects to dwelling_test PostgreSQL.
// Tests the actual exported seed() function with real database.
// vitest runs with DATABASE_URL env var provided.

let prisma

beforeAll(async () => {
  const { PrismaClient } = await import('@prisma/client')
  prisma = new PrismaClient({
    log: ['error'],
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('PR-17: Seed script — real PostgreSQL integration', () => {
  // Core idempotency: first and second seed runs
  // These tests run sequentially on the same database connection.
  // First test creates data; second test verifies idempotency.

  it('1. First seed run creates all expected records', async () => {
    const module = await import('../../database/seed.js')
    await module.seed()

    const users = await prisma.user.count()
    const dwellings = await prisma.dwelling.count()
    const contacts = await prisma.contact.count()
    const conversations = await prisma.conversation.count()
    const messages = await prisma.message.count()

    expect(users).toBe(7)
    expect(dwellings).toBe(7)
    expect(contacts).toBe(12)
    expect(conversations).toBe(6)
    expect(messages).toBe(18)
  })

  it('2. Second seed run creates zero additional records (idempotent)', async () => {
    // Run seed again on same (now populated) database
    const module = await import('../../database/seed.js')
    await module.seed()

    const users = await prisma.user.count()
    const dwellings = await prisma.dwelling.count()
    const contacts = await prisma.contact.count()
    const conversations = await prisma.conversation.count()
    const messages = await prisma.message.count()

    // Counts must remain unchanged — no duplicates
    expect(users).toBe(7)
    expect(dwellings).toBe(7)
    expect(contacts).toBe(12)
    expect(conversations).toBe(6)
    expect(messages).toBe(18)
  })

  // Environment guards
  it('3. Seed aborts when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production'
    let threw = false
    try {
      const module = await import('../../database/seed.js')
      await module.seed()
    } catch (e) {
      threw = true
      expect(e.message).toBe(
        'Seed aborted: NODE_ENV=production. Seed script must be invoked explicitly via CLI, never during application startup.',
      )
    } finally {
      if (process.env.NODE_ENV) delete process.env.NODE_ENV
    }
    expect(threw).toBe(true)
  })

  it('4. Seed aborts when DEMO_PASSWORD not set', async () => {
    const prev = process.env.DEMO_PASSWORD
    delete process.env.DEMO_PASSWORD
    let threw = false
    try {
      const module = await import('../../database/seed.js')
      await module.seed()
    } catch (e) {
      threw = true
      expect(e.message).toBe(
        'Seed aborted: DEMO_PASSWORD not set. Add it to the local .env.local file (never commit real credentials).',
      )
    } finally {
      if (prev) process.env.DEMO_PASSWORD = prev
    }
    expect(threw).toBe(true)
  })
})