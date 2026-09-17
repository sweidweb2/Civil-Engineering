import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.{test,spec}.ts',
      'tests/integration/**/*.{test,spec}.ts',
    ],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
})
