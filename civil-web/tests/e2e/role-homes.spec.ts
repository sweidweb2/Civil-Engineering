import { expect, test } from '@playwright/test'

import { expectSignedInHome, loginAs, SEED_USERS } from './helpers/auth'

test.describe('role home redirects', () => {
  test('SUPER lands on /super', async ({ page }) => {
    await loginAs(page, SEED_USERS.super.email)
    await expectSignedInHome(page, SEED_USERS.super.home)
    await expect(page.getByRole('heading', { name: /super home/i })).toBeVisible()
  })

  test('ADMIN lands on /admin dashboard', async ({ page }) => {
    await loginAs(page, SEED_USERS.admin.email)
    await expectSignedInHome(page, SEED_USERS.admin.home)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('MANAGER lands on /pm analytics', async ({ page }) => {
    await loginAs(page, SEED_USERS.pm.email)
    await expectSignedInHome(page, SEED_USERS.pm.home)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  })

  test('PROVIDER lands on /provider', async ({ page }) => {
    await loginAs(page, SEED_USERS.provider.email)
    await expectSignedInHome(page, SEED_USERS.provider.home)
    await expect(page.getByRole('heading', { name: /provider home/i })).toBeVisible()
  })
})
