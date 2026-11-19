import fs from 'node:fs'
import path from 'node:path'

import { ar } from '@/i18n/ar'
import { en } from '@/i18n/en'

type Tree = { [key: string]: string | Tree }

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : leafKeys(value, `${prefix}${key}.`),
  )
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe('translations', () => {
  const enKeys = new Set(leafKeys(en))
  const arKeys = new Set(leafKeys(ar))

  it('Arabic defines exactly the same keys as English', () => {
    expect([...enKeys].filter((key) => !arKeys.has(key))).toEqual([])
    expect([...arKeys].filter((key) => !enKeys.has(key))).toEqual([])
  })

  it('has no empty strings', () => {
    const empty = (tree: Tree): boolean =>
      Object.values(tree).some((value) =>
        typeof value === 'string' ? !value.trim() : empty(value),
      )
    expect(empty(en)).toBe(false)
    expect(empty(ar)).toBe(false)
  })

  it('every translation key used in the source exists', () => {
    const namespaces = Object.keys(en).join('|')
    const pattern = new RegExp(`'((?:${namespaces})\\.[A-Za-z]+(?:\\.[A-Za-z]+)*)'`, 'g')
    const root = path.join(__dirname, '..', '..', 'src')
    const missing: string[] = []

    for (const file of sourceFiles(root)) {
      if (file.includes(`${path.sep}i18n${path.sep}`)) continue
      const text = fs.readFileSync(file, 'utf8')
      for (const match of text.matchAll(pattern)) {
        const key = match[1]!
        // i18next plurals: t('a.b', { count }) resolves to a.b_one / a.b_other.
        if (!enKeys.has(key) && !enKeys.has(`${key}_other`)) {
          missing.push(`${path.relative(root, file)}: ${key}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('covers every dynamic key group used by the screens', () => {
    const groups = [
      'nav.dashboard',
      'nav.users',
      'nav.providers',
      'nav.projects',
      'nav.more',
      'nav.directory',
      'nav.account',
      'nav.listings',
      'nav.profile',
      'more.links.queue.title',
      'more.links.categories.description',
      'account.theme.system',
      'enums.rentalUnit.HOUR',
      'stageFields.soilType',
    ]
    for (const key of groups) expect(enKeys.has(key)).toBe(true)
  })
})
