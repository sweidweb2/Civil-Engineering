import { expect, test } from '@playwright/test'

import { authStatePath, expectSignedInHome, SEED_USERS } from './helpers/auth'

test.describe('login form', () => {
  test('shows field errors when submitted empty', async ({ page }) => {
    await page.goto('/login')
    await page.locator('form[data-slot="form"]').evaluate((form) => {
      ;(form as HTMLFormElement).requestSubmit()
    })
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('rejects unknown credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('nobody@example.com')
    await page.locator('#password').fill('password')
    const loginResponse = page.waitForResponse(
      (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
    )
    await page.locator('form[data-slot="form"]').evaluate((form) => {
      ;(form as HTMLFormElement).requestSubmit()
    })
    const res = await loginResponse
    expect([401, 429]).toContain(res.status())
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByText(/invalid email or password|could not sign in|too many requests/i),
    ).toBeVisible()
  })

  test('can open register from login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Register' }).click()
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  })

  test('admin seed session reaches the admin dashboard', async ({ browser }) => {
    // Setup project already exercised the login form; this asserts the persisted session.
    const context = await browser.newContext({ storageState: authStatePath('admin') })
    const page = await context.newPage()
    await page.goto('/admin')
    await expectSignedInHome(page, SEED_USERS.admin.home)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await context.close()
  })
})

