import { describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { hash, compare } from '../src/password.js'

describe('password hash()', () => {
  it('returns a valid bcrypt hash with cost factor 10', async () => {
    const result = await hash('my-password')
    expect(result).toMatch(/^\$2[aby]\$10\$/)
  })

  it('rejects empty password', async () => {
    await expect(hash('')).rejects.toThrow('Password must not be empty or whitespace-only')
  })

  it('rejects whitespace-only password', async () => {
    await expect(hash('   ')).rejects.toThrow('Password must not be empty or whitespace-only')
  })

  it('generates a fresh random salt for every hash', async () => {
    const h1 = await hash('password')
    const h2 = await hash('password')
    expect(h1).not.toBe(h2)
  })
})

describe('password compare()', () => {
  it('returns true for a password and its generated hash', async () => {
    const hashValue = await hash('my-password')
    const result = await compare('my-password', hashValue)
    expect(result).toBe(true)
  })

  it('returns false for an incorrect password', async () => {
    const hashValue = await hash('my-password')
    const result = await compare('wrong-password', hashValue)
    expect(result).toBe(false)
  })

  it('returns false for a malformed hash', async () => {
    const result = await compare('password', 'not-a-valid-bcrypt-hash')
    expect(result).toBe(false)
  })

  it('returns false for null hash', async () => {
    const result = await compare('password', null)
    expect(result).toBe(false)
  })

  it('returns false for undefined hash', async () => {
    const result = await compare('password', undefined)
    expect(result).toBe(false)
  })

  it('returns false for empty string hash', async () => {
    const result = await compare('password', '')
    expect(result).toBe(false)
  })

  it('returns false for non-string hash', async () => {
    const result = await compare('password', 12345)
    expect(result).toBe(false)
  })

  it('returns false for empty/whitespace-only password', async () => {
    const hashValue = await hash('my-password')
    await expect(compare('', hashValue)).resolves.toBe(false)
    await expect(compare('   ', hashValue)).resolves.toBe(false)
  })

  it('returns false for null, undefined, and non-string passwords', async () => {
    const hashValue = await hash('my-password')
    await expect(compare(null, hashValue)).resolves.toBe(false)
    await expect(compare(undefined, hashValue)).resolves.toBe(false)
    await expect(compare(123, hashValue)).resolves.toBe(false)
  })

  it('returns false for unusable password and hash together without throwing', async () => {
    await expect(compare('', '$2a$10$hash')).resolves.toBe(false)
    await expect(compare(null, null)).resolves.toBe(false)
  })

  it('propagates bcrypt errors from comparison', async () => {
    const compareSpy = vi.spyOn(bcrypt, 'compare')
      .mockRejectedValueOnce(new Error('Unexpected bcrypt internal error'))
    const hashValue = await hash('my-password')
    await expect(compare('my-password', hashValue)).rejects.toThrow('Unexpected bcrypt internal error')
    compareSpy.mockRestore()
  })
})