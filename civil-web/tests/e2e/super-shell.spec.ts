import { expect, test } from '@playwright/test'

import { authStatePath, openSeedHome } from './helpers/auth'

test.describe('super shell navigation', () => {
  test.use({ storageState: authStatePath('super') })

  test.beforeEach(async ({ page }) => {
    await openSeedHome(page, 'super')
  })

  test('opens users', async ({ page }) => {
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/super\/users/)
    await expect(page.getByRole('heading', { name: 'Manage users' })).toBeVisible()
  })

  test('opens activity, errors, notifications, and settings', async ({ page }) => {
    await page.getByRole('link', { name: 'Activity' }).click()
    await expect(page).toHaveURL(/\/super\/activity/)
    await expect(page.getByRole('heading', { name: 'Activity logs' })).toBeVisible()

    await page.getByRole('link', { name: 'Errors' }).click()
    await expect(page).toHaveURL(/\/super\/errors/)
    await expect(page.getByRole('heading', { name: 'Error logs' })).toBeVisible()

    await page.goto('/super/notifications')
    await expect(page).toHaveURL(/\/super\/notifications/)
    await expect(page.getByRole('heading', { name: 'Manage Notifications' })).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/super\/settings/)
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible()
  })
})
