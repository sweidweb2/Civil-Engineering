import { expect, test } from '@playwright/test'

import { authStatePath, openSeedHome } from './helpers/auth'

test.describe('provider shell navigation', () => {
  test.use({ storageState: authStatePath('provider') })

  test.beforeEach(async ({ page }) => {
    await openSeedHome(page, 'provider')
  })

  test('opens listings, analytics, profile, and notifications', async ({ page }) => {
    await page.getByRole('navigation').getByRole('link', { name: 'Listings', exact: true }).click()
    await expect(page).toHaveURL(/\/provider\/listings/)
    await expect(page.getByRole('heading', { name: 'Listings' })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Analytics', exact: true }).click()
    await expect(page).toHaveURL(/\/provider\/analytics/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Profile' }).click()
    await expect(page).toHaveURL(/\/provider\/profile/)
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()

    await page.goto('/provider/notifications')
    await expect(page).toHaveURL(/\/provider\/notifications/)
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('home CTAs reach listings and analytics', async ({ page }) => {
    await page.getByRole('link', { name: 'Manage listings' }).click()
    await expect(page).toHaveURL(/\/provider\/listings/)

    await page.goto('/provider')
    await page.getByRole('link', { name: 'View analytics' }).click()
    await expect(page).toHaveURL(/\/provider\/analytics/)
  })
})
