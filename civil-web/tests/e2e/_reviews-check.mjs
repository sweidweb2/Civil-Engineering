import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const notes = []

try {
  await page.goto('http://localhost:5174/login')
  await page.locator('#email').fill('admin@example.com')
  await page.locator('#password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/admin/)
  await page.goto('http://localhost:5174/admin/reviews')
  await page.getByRole('heading', { name: 'Manage reviews' }).waitFor()
  await page.getByRole('columnheader', { name: 'Target' }).waitFor()

  const commentHeader = await page.getByRole('columnheader', { name: 'Comment' }).count()
  notes.push(`comment column headers: ${commentHeader}`)

  const view = page.getByRole('button', { name: 'View' }).first()
  const viewCount = await page.getByRole('button', { name: 'View' }).count()
  notes.push(`view buttons: ${viewCount}`)
  if (viewCount === 0) throw new Error('No View button. Table may be empty.')

  const layout = await page.locator('tbody tr').first().evaluate((row) => {
    const cells = [...row.querySelectorAll('td')]
    const target = cells.find((cell) => cell.querySelector('[data-slot="badge"]'))
    if (!target) return { error: 'no badge cell' }
    const rowBox = target.querySelector('div')
    const name = target.querySelector('p')
    const badge = target.querySelector('[data-slot="badge"]')
    if (!rowBox || !name || !badge) return { error: 'missing name or badge' }
    const nameBox = name.getBoundingClientRect()
    const badgeBox = badge.getBoundingClientRect()
    return {
      flex: getComputedStyle(rowBox).flexDirection,
      align: getComputedStyle(rowBox).alignItems,
      sameLine: Math.abs(nameBox.top - badgeBox.top) < 8,
      badgeRightOfName: badgeBox.left >= nameBox.left,
    }
  })
  notes.push(`target layout: ${JSON.stringify(layout)}`)

  await view.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('heading', { name: 'Review details' }).waitFor()
  const labels = ['Author', 'Email', 'Target', 'Rating', 'Status', 'Created', 'Updated', 'Comment']
  for (const label of labels) {
    const count = await dialog.getByText(label, { exact: true }).count()
    notes.push(`${label}: ${count}`)
  }
  const commentValue = await dialog.locator('#review-view-comment').inputValue()
  notes.push(`comment length: ${commentValue.length}`)
  console.log(notes.join('\n'))
} catch (error) {
  console.log(notes.join('\n'))
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
