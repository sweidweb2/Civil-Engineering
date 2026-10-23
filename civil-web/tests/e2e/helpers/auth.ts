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
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function expectSignedInHome(page: Page, home: RegExp): Promise<void> {
  await expect(page).toHaveURL(home, { timeout: 20_000 })
}

export async function signOutFromSidebar(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
}
