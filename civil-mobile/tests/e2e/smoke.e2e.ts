/// <reference types="detox" />
/// <reference types="jest" />

/**
 * Detox E2E smoke — requires Android emulator + Expo prebuild/dev client.
 * Run: npm run test:e2e (after emulator is up and `npm run test:e2e:build`)
 */
describe('mobile e2e (smoke)', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  it('launches the app', async () => {
    await expect(element(by.id('e2e-root'))).toBeVisible()
  })
})
