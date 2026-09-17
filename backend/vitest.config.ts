import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.{test,spec}.ts',
      'tests/integration/**/*.{test,spec}.ts',
    ],
    // E2E skipped for now — wire later
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
})
