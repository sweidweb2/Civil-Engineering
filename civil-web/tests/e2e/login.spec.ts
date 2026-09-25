import { expect, test } from '@playwright/test'

test.describe('login form', () => {
  test('shows field errors when submitted empty', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('rejects unknown credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('nobody@example.com')
    await page.locator('#password').fill('password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(/invalid email or password|could not sign in/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin seed account reaches the admin panel', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('admin@example.com')
    await page.locator('#password').fill('password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin\/?$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
