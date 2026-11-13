const REQUIRED_ENV_VARS = [
  {
    name: 'JWT_SECRET',
    description: 'Secret key for signing JWTs',
  },
];

export function validateEnv(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter(({ name }) => {
    const value = env[name];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    const names = missing.map(({ name }) => name).join(', ');

    throw new Error(`Missing required environment variable(s): ${names}`);
  }
}
