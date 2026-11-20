import { defineConfig } from 'vitest/config'

const shared = {
  environment: 'node' as const,
  exclude: ['tests/e2e/**', 'node_modules/**'],
  fileParallelism: false,
  maxWorkers: 1,
  hookTimeout: 60_000,
}

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          ...shared,
          name: 'unit',
          include: ['tests/unit/**/*.{test,spec}.ts'],
          setupFiles: ['tests/setup-unit-audit.ts'],
        },
      },
      {
        test: {
          ...shared,
          name: 'integration',
          include: ['tests/integration/**/*.{test,spec}.ts'],
        },
      },
    ],
  },
})
