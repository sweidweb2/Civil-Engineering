import { expect, type Page } from '@playwright/test'

/** Seed passwords from `backend/prisma/seed.ts` (local Docker + migrate + seed). */
export const SEED_PASSWORD = 'password'

export const SEED_USERS = {
  super: { email: 'super@example.com', home: /\/super\/?$/ },
  admin: { email: 'admin@example.com', home: /\/admin\/?$/ },
  pm: { email: 'pm@example.com', home: /\/pm\/?$/ },
  provider: { email: 'provider@example.com', home: /\/provider\/?$/ },
} as const

export async function loginAs(
  page: Page,
  email: string,
  password = SEED_PASSWORD,
): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  // Base UI Button + Playwright click does not always submit the native form.
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
  )
  await page.locator('form[data-slot="form"]').evaluate((form) => {
    ;(form as HTMLFormElement).requestSubmit()
  })
  const res = await loginResponse
  expect(res.ok(), `login failed for ${email}: HTTP ${res.status()}`).toBeTruthy()
  // GuestOnly redirects after Zustand user is set.
}

export async function expectSignedInHome(page: Page, home: RegExp): Promise<void> {
  await expect(page).toHaveURL(home, { timeout: 20_000 })
}

export async function signOutFromSidebar(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
}
