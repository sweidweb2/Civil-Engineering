import path from 'node:path'
import { expect, type Page } from '@playwright/test'

/** Seed passwords from `backend/prisma/seed.ts` (Supabase + migrate + seed). */
export const SEED_PASSWORD = 'password'

export const SEED_USERS = {
  super: { email: 'super@example.com', home: /\/super\/?$/ },
  admin: { email: 'admin@example.com', home: /\/admin\/?$/ },
  pm: { email: 'pm@example.com', home: /\/pm\/?$/ },
  provider: { email: 'provider@example.com', home: /\/provider\/?$/ },
} as const

export type SeedRole = keyof typeof SEED_USERS

export function authStatePath(role: SeedRole): string {
  return path.join(process.cwd(), 'playwright/.auth', `${role}.json`)
}

/**
 * UI login (uses form submit). Prefer `test.use({ storageState })` from auth.setup
 * so the suite does not burn the auth rate limiter.
 */
export async function loginAs(page: Page, email: string, password = SEED_PASSWORD): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
  )
  await page.locator('form[data-slot="form"]').evaluate((form) => {
    ;(form as HTMLFormElement).requestSubmit()
  })
  const res = await loginResponse
  expect(
    res.ok(),
    `login failed for ${email}: HTTP ${res.status()} — re-seed DB or wait out auth rate limit`,
  ).toBeTruthy()
}

export async function expectSignedInHome(page: Page, home: RegExp): Promise<void> {
  await expect(page).toHaveURL(home, { timeout: 20_000 })
}

export async function openSeedHome(page: Page, role: SeedRole): Promise<void> {
  const { home } = SEED_USERS[role]
  const target =
    role === 'admin' ? '/admin' : role === 'pm' ? '/pm' : role === 'super' ? '/super' : '/provider'
  await page.goto(target)
  await expect(page).toHaveURL(home, { timeout: 20_000 })
}
