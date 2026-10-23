import { expect, test } from '@playwright/test'

import { expectSignedInHome, loginAs, SEED_USERS } from './helpers/auth'

test.describe('PM shell navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SEED_USERS.pm.email)
    await expectSignedInHome(page, SEED_USERS.pm.home)
  })

  test('opens projects and directory', async ({ page }) => {
    await page.getByRole('link', { name: 'Manage projects' }).click()
    await expect(page).toHaveURL(/\/pm\/projects/)
    await expect(page.getByRole('heading', { name: 'Manage projects' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible()

    await page.getByRole('link', { name: 'Directory' }).click()
    await expect(page).toHaveURL(/\/pm\/directory/)
    await expect(page.getByRole('heading', { name: 'Directory' })).toBeVisible()
  })

  test('opens settings profile and steps tabs', async ({ page }) => {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/pm\/settings/)
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible()

    await page.getByRole('button', { name: /Steps/ }).click()
    await expect(page).toHaveURL(/tab=steps/)
    await expect(page.getByRole('heading', { name: 'Manage steps' })).toBeVisible()
  })

  test('creates a project from the PM projects page', async ({ page }) => {
    const name = `E2E Harbor ${Date.now()}`
    await page.getByRole('link', { name: 'Manage projects' }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(page.getByText('Create New Project')).toBeVisible()

    await page.locator('#create-name').fill(name)
    await page.getByRole('button', { name: 'Create Project' }).last().click()

    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 })
  })
})

