import { expect, test } from '@playwright/test'

test.describe('public home', () => {
  test('shows the marketing landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Civil Engineering').first()).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: /workspace for civil projects/i,
      }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('navigates to login from the header', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
