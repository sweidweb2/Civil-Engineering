import type { TFunction } from 'i18next'

import type { Messages } from '@/i18n/en'

type Tree = { [key: string]: string | Tree }

/** Resolve a dotted key against an en/ar catalog for schema unit tests (no i18n runtime). */
export function tFrom(catalog: Messages): TFunction {
  return ((key: string, options?: Record<string, unknown>) => {
    const parts = key.split('.')
    let node: unknown = catalog
    for (const part of parts) {
      if (node && typeof node === 'object' && part in (node as Tree)) {
        node = (node as Tree)[part]
      } else {
        return key
      }
    }
    if (typeof node !== 'string') return key
    return node.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ''))
  }) as TFunction
}
