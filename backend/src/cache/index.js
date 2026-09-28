import { createClient } from 'redis'

let client

export async function connectCache() {
  if (!process.env.REDIS_URL) return

  client = createClient({ url: process.env.REDIS_URL })
  client.on('error', (error) => console.error('Redis client error:', error))
  await client.connect()
}

export async function getCache(key) {
  return client?.get(key) ?? null
}

export async function setCache(key, value, ttlSeconds = 60) {
  if (!client) return
  await client.set(key, value, { EX: ttlSeconds })
}

export async function closeCache() {
  if (!client?.isOpen) return
  await client.quit()
  client = undefined
}