import { expect, test } from '@playwright/test'

import { authStatePath, openSeedHome } from './helpers/auth'

test.describe('route guards', () => {
  test('anonymous users are sent to login for /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('anonymous users are sent to login for /pm', async ({ page }) => {
    await page.goto('/pm/projects')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unknown routes show 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
  })

  test('admin cannot open the PM shell', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authStatePath('admin') })
    const page = await context.newPage()
    await openSeedHome(page, 'admin')
    await page.goto('/pm')
    await expect(page).toHaveURL(/\/$|\/admin/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toHaveCount(0)
    await context.close()
  })

  test('pm cannot open the admin shell', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authStatePath('pm') })
    const page = await context.newPage()
    await openSeedHome(page, 'pm')
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/$|\/pm/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0)
    await context.close()
  })
})
