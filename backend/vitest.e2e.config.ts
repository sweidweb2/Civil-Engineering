import { defineConfig } from 'vitest/config'

/** E2E suite — real Test Postgres (Docker or embedded) */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.{test,spec}.ts'],
    globalSetup: ['./tests/e2e/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
