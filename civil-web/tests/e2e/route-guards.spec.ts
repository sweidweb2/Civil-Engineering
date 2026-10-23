import { expect, test } from '@playwright/test'

import { expectSignedInHome, loginAs, SEED_USERS } from './helpers/auth'

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

  test('admin cannot open the PM shell', async ({ page }) => {
    await loginAs(page, SEED_USERS.admin.email)
    await expectSignedInHome(page, SEED_USERS.admin.home)
    await page.goto('/pm')
    await expect(page).toHaveURL(/\/$|\/admin/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toHaveCount(0)
  })

  test('pm cannot open the admin shell', async ({ page }) => {
    await loginAs(page, SEED_USERS.pm.email)
    await expectSignedInHome(page, SEED_USERS.pm.home)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/$|\/pm/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0)
  })
})
