import { describe, it, expect, vi } from 'vitest'

// Class-based mock
class MockPrismaClient {
  constructor() {
    this.user = { findUnique: vi.fn(), create: vi.fn() }
    this.dwelling = { findUnique: vi.fn(), create: vi.fn() }
    this.$disconnect = vi.fn()
  }
  $transaction = async (fn) => fn()
}

vi.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
}))

describe('Debug PrismaClient', () => {
  it('should create instance with user property', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const instance = new PrismaClient()
    console.log('instance.user:', instance.user)
    expect(instance.user).toBeDefined()
    expect(typeof instance.user.findUnique).toBe('function')
  })
})