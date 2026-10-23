import { expect, test } from '@playwright/test'

import { expectSignedInHome, loginAs, SEED_USERS } from './helpers/auth'

test.describe('admin shell navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SEED_USERS.admin.email)
    await expectSignedInHome(page, SEED_USERS.admin.home)
  })

  test('opens queue, users, projects, directory, steps', async ({ page }) => {
    await page.getByRole('link', { name: 'Queue' }).click()
    await expect(page).toHaveURL(/\/admin\/queue/)
    await expect(page.getByRole('heading', { name: 'User queue' })).toBeVisible()

    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('heading', { name: 'Manage users' })).toBeVisible()

    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page).toHaveURL(/\/admin\/projects/)
    await expect(page.getByRole('heading', { name: 'Manage projects' })).toBeVisible()

    await page.getByRole('link', { name: 'Directory' }).click()
    await expect(page).toHaveURL(/\/admin\/directory/)
    await expect(page.getByRole('heading', { name: 'Directory' })).toBeVisible()

    await page.getByRole('link', { name: 'Steps' }).click()
    await expect(page).toHaveURL(/\/admin\/steps/)
    await expect(page.getByRole('heading', { name: 'Manage steps' })).toBeVisible()
  })

  test('opens marketplace pages', async ({ page }) => {
    await page.getByRole('link', { name: 'Providers' }).click()
    await expect(page).toHaveURL(/\/admin\/providers/)
    await expect(page.getByRole('heading', { name: 'Manage providers' })).toBeVisible()

    await page.getByRole('link', { name: 'Listings' }).click()
    await expect(page).toHaveURL(/\/admin\/listings/)
    await expect(page.getByRole('heading', { name: 'Listings' })).toBeVisible()

    await page.getByRole('link', { name: 'Categories' }).click()
    await expect(page).toHaveURL(/\/admin\/categories/)
    await expect(page.getByRole('heading', { name: 'Manage categories' })).toBeVisible()

    await page.getByRole('link', { name: 'Reviews' }).click()
    await expect(page).toHaveURL(/\/admin\/reviews/)
    await expect(page.getByRole('heading', { name: 'Manage reviews' })).toBeVisible()
  })
})
