import { expect, test } from '@playwright/test'

import { authStatePath, openSeedHome, SEED_USERS } from './helpers/auth'

test.describe('role home redirects', () => {
  test('SUPER lands on /super', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authStatePath('super') })
    const page = await context.newPage()
    await openSeedHome(page, 'super')
    await expect(page).toHaveURL(SEED_USERS.super.home)
    await expect(page.getByRole('heading', { name: /super home/i })).toBeVisible()
    await context.close()
  })

  test('ADMIN lands on /admin dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authStatePath('admin') })
    const page = await context.newPage()
    await openSeedHome(page, 'admin')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await context.close()
  })

  test('MANAGER lands on /pm projects', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authStatePath('pm') })
    const page = await context.newPage()
    await openSeedHome(page, 'pm')
    await expect(page.getByRole('heading', { name: 'Manage projects' })).toBeVisible()
    await context.close()
  })

  test('PROVIDER lands on /provider listings', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authStatePath('provider') })
    const page = await context.newPage()
    await openSeedHome(page, 'provider')
    await expect(page.getByRole('heading', { name: 'Listings' })).toBeVisible()
    await context.close()
  })
})
