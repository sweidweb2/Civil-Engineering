import { test, expect } from '@playwright/test'

test.describe('web e2e (smoke)', () => {
  test('home page shows Get started', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible()
  })

  test('counter increments', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: /Count is/i })
    await expect(button).toHaveText('Count is 0')
    await button.click()
    await expect(button).toHaveText('Count is 1')
  })
})
