import { describe, it, expect, vi } from 'vitest'

// Class-based mock - should work with new
class MockPrismaClient {
  constructor() {
    this.user = { findUnique: vi.fn(), create: vi.fn() }
    this.dwelling = { findUnique: vi.fn(), create: vi.fn() }
    this.contact = { findUnique: vi.fn(), create: vi.fn() }
    this.conversation = { findUnique: vi.fn(), create: vi.fn() }
    this.message = { findMany: vi.fn(), count: vi.fn(), create: vi.fn() }
    this.$disconnect = vi.fn()
  }
  $transaction = async (fn) => fn()
}

vi.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
}))

describe('Class-based PrismaClient mock', () => {
  it('should be instantiable with new', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const instance = new PrismaClient()
    expect(instance).toBeDefined()
    expect(typeof instance.$transaction).toBe('function')
    expect(typeof instance.user.findUnique).toBe('function')
  })

  it('should have findUnique that can be mocked', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const instance = new PrismaClient()
    instance.user.findUnique.mockResolvedValueOnce({ id: 'test', email: 'test@test.com' })
    const result = await instance.user.findUnique({ where: { id: 'test' } })
    expect(result).toEqual({ id: 'test', email: 'test@test.com' })
  })

  it('should work with $transaction', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const instance = new PrismaClient()
    await instance.$transaction(async (tx) => {
      expect(tx).toBeDefined()
    })
  })
})