import { describe, expect, it } from 'vitest'

import { loadConfig } from '../../src/config/index.js'

describe('loadConfig', () => {
  it('treats empty optional env strings as unset', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      PORT: '3000',
      CORS_ORIGINS: 'http://localhost:5173',
      TRUST_PROXY: 'false',
      STORAGE_PUBLIC_BASE_URL: '',
    })

    expect(config.storage).toBeUndefined()
    expect(config.port).toBe(3000)
  })

  it('rejects JWT secrets shorter than 32 characters', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'test',
        PORT: '3000',
        CORS_ORIGINS: 'http://localhost:5173',
        JWT_ACCESS_SECRET: 'too-short',
        JWT_REFRESH_SECRET: 'also-too-short',
      }),
    ).toThrow(/Invalid configuration/)
  })

  it('requires JWT secrets in staging', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'staging',
        PORT: '3000',
        CORS_ORIGINS: 'https://app.example.com',
      }),
    ).toThrow(/JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required/)
  })
})
