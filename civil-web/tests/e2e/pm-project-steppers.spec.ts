import { expect, test } from '@playwright/test'

import { authStatePath, openSeedHome } from './helpers/auth'

/**
 * PM steppers UI flow against seeded step templates (Site survey / Foundation / Structure).
 * Requires seeded API (`db:seed`) so creating a project clones active templates.
 */
test.describe('PM project steppers flow', () => {
  test.use({ storageState: authStatePath('pm') })

  test('fills, saves, adds, and removes a project-only input', async ({ page }) => {
    await openSeedHome(page, 'pm')

    const name = `E2E Steppers ${Date.now()}`
    await page.getByRole('link', { name: 'Manage projects' }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await expect(page.getByText('Create New Project')).toBeVisible()
    await page.locator('#create-name').fill(name)

    const createResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/projects') &&
        res.request().method() === 'POST' &&
        !res.url().includes('/steppers'),
    )
    await page
      .locator('#create-name')
      .locator('xpath=ancestor::form')
      .evaluate((form) => {
        ;(form as HTMLFormElement).requestSubmit()
      })
    expect((await createResponse).ok()).toBeTruthy()

    await expect(page).toHaveURL(/\/pm\/projects\/[^/]+/, { timeout: 20_000 })
    await expect(page.getByRole('tab', { name: 'Steppers' })).toBeVisible()
    await page.getByRole('tab', { name: 'Steppers' }).click()

    await expect(page.getByText('Project workflow as connected nodes')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Site survey' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Fill fields for this stepper')).toBeVisible()
    const plotReference = page.getByRole('textbox', { name: 'Plot reference' })
    await expect(plotReference).toBeVisible()

    await plotReference.fill('Plot A-12')
    const saveResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/steppers/') &&
        res.url().includes('/values') &&
        res.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Save values' }).click()
    expect((await saveResponse).ok()).toBeTruthy()

    await expect(page.getByRole('button', { name: /Site survey.*1\/3 filled/ })).toBeVisible()

    await page.getByRole('button', { name: 'Add input' }).click()
    await expect(page.getByRole('heading', { name: 'Add project input' })).toBeVisible()
    await page.locator('#project-input-label').fill('E2E area note')
    await page.locator('#project-input-type').click()
    await page.getByRole('option', { name: /Text \(TEXT\)/i }).click()

    const addResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/steppers/') &&
        res.url().includes('/inputs') &&
        res.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    expect((await addResponse).ok()).toBeTruthy()

    await expect(page.getByRole('textbox', { name: 'E2E area note' })).toBeVisible()
    await expect(page.getByText('Project', { exact: true }).first()).toBeVisible()

    const deleteResponse = page.waitForResponse(
      (res) => res.url().includes('/inputs/') && res.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Remove E2E area note' }).click()
    expect((await deleteResponse).ok()).toBeTruthy()
    await expect(page.getByRole('textbox', { name: 'E2E area note' })).toHaveCount(0)
  })
})
