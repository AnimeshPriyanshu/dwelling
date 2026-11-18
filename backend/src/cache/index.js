import { createClient } from 'redis';
import { env } from '../config/env.js';

let client;

export async function connectCache() {
  if (!env.redisUrl) return;

  client = createClient({ url: env.redisUrl });
  client.on('error', (error) => console.error('Redis client error:', error));
  await client.connect();
}

export async function getCache(key) {
  return client?.get(key) ?? null;
}

export async function setCache(key, value, ttlSeconds = 60) {
  if (!client) return;
  await client.set(key, value, { EX: ttlSeconds });
}

export async function closeCache() {
  if (!client?.isOpen) return;
  await client.quit();
  client = undefined;
}
