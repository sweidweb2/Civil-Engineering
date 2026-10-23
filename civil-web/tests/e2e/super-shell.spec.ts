import { expect, test } from '@playwright/test'

import { expectSignedInHome, loginAs, SEED_USERS } from './helpers/auth'

test.describe('super shell navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SEED_USERS.super.email)
    await expectSignedInHome(page, SEED_USERS.super.home)
  })

  test('opens users, steps, and input types', async ({ page }) => {
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/super\/users/)
    await expect(page.getByRole('heading', { name: 'Manage users' })).toBeVisible()

    await page.getByRole('link', { name: 'Steps' }).click()
    await expect(page).toHaveURL(/\/super\/steps/)
    await expect(page.getByRole('heading', { name: 'Manage steps' })).toBeVisible()

    await page.getByRole('link', { name: 'Input types' }).click()
    await expect(page).toHaveURL(/\/super\/input-types/)
    await expect(page.getByRole('heading', { name: 'Input types' })).toBeVisible()
  })
})
