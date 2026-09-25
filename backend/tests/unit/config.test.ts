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
})
