import fs from 'node:fs'
import path from 'node:path'
import { expect, test as setup } from '@playwright/test'

import { loginAs, SEED_USERS } from './helpers/auth'

const authDir = path.join(process.cwd(), 'playwright/.auth')

setup.beforeAll(() => {
  fs.mkdirSync(authDir, { recursive: true })
})

for (const [role, account] of Object.entries(SEED_USERS)) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await loginAs(page, account.email)
    await expect(page).toHaveURL(account.home, { timeout: 20_000 })
    await page.context().storageState({ path: path.join(authDir, `${role}.json`) })
  })
}
