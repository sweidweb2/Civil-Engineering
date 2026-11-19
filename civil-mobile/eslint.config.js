// @ts-check
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const simpleImportSort = require('eslint-plugin-simple-import-sort')

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:', '^react$', '^react-native$', '^expo', '^@?\\w'],
            ['^@/'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      // Hydration / fetch-on-mount patterns used in shared hooks
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Vendor / gluestack primitives — do not rewrite for lint purity
    ignores: [
      'dist/**',
      '.expo/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      'resources/**',
      'src/components/ui/**',
    ],
  },
])
