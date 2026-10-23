import { expect, test } from '@playwright/test'

test.describe('register form', () => {
  test('shows validation errors when submitted empty', async ({ page }) => {
    await page.goto('/register')
    await page.locator('form[data-slot="form"]').evaluate((form) => {
      ;(form as HTMLFormElement).requestSubmit()
    })
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  })

  test('links back to sign in', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
