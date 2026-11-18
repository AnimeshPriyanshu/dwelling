import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
});

const nodeEnv = process.env.NODE_ENV ?? 'development';

/**
 * Centralized configuration.
 *
 * Every environment read in the backend belongs here. Secrets are exposed as
 * values only — they are never logged, defaulted, or echoed in errors.
 *
 * `jwtSecret` and `databaseUrl` may be `undefined`; `config/validateEnv.js`
 * decides which of them are required at startup. `validateEnv()` still owns
 * that check so importing this module never throws.
 */
export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
};
