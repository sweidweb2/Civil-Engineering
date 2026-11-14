import { expect, test } from '@playwright/test'

import { authStatePath, openSeedHome } from './helpers/auth'

test.describe('provider shell navigation', () => {
  test.use({ storageState: authStatePath('provider') })

  test.beforeEach(async ({ page }) => {
    await openSeedHome(page, 'provider')
  })

  test('lands on listings without sidebar, opens profile', async ({ page }) => {
    await expect(page).toHaveURL(/\/provider\/listings/)
    await expect(page.getByRole('heading', { name: 'Listings' })).toBeVisible()
    await expect(page.getByRole('navigation')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Civil Engineering' })).toBeVisible()

    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Profile' }).click()
    await expect(page).toHaveURL(/\/provider\/profile/)
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  })

  test('analytics redirects to listings', async ({ page }) => {
    await page.goto('/provider/analytics')
    await expect(page).toHaveURL(/\/provider\/listings/)
  })
})
