import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],

    setupFiles: ['./vitest.db.setup.js'],

    coverage: {
      reporter: ['text', 'html'],
    },
  },

  // When TEST_DATABASE_URL is missing, emit a noticeable startup message so
  // developers running `npm test` locally know why database tests are absent.
  // This is handled in vitest.db.setup.js via console.error.
});
