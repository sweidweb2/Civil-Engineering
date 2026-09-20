import type { AppConfig } from '../config/index.js'

const ENV_SEGMENT: Record<AppConfig['env'], string> = {
  development: 'dev',
  test: 'test',
  staging: 'staging',
  production: 'prod',
}

/** Plural path segment for object keys (never a bare user id alone). */
export const ENTITY_KEY_SEGMENT: Record<string, string> = {
  PROJECT: 'projects',
  USER: 'users',
  EXPENSE: 'expenses',
  MATERIAL: 'materials',
  WORKER: 'workers',
}

export function storageEnvSegment(env: AppConfig['env']): string {
  return ENV_SEGMENT[env]
}

/** Sanitize original filename for object keys — keep extension when present. */
export function sanitizeOriginalName(originalName: string): string {
  const trimmed = originalName.trim().replace(/\\/g, '/').split('/').pop() || 'file'
  const lastDot = trimmed.lastIndexOf('.')
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed
  const ext = lastDot > 0 ? trimmed.slice(lastDot + 1) : ''

  const cleanBase = base
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100)
    .toLowerCase()

  const cleanExt = ext
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 12)
    .toLowerCase()

  if (!cleanBase && !cleanExt) return 'file'
  if (!cleanExt) return cleanBase || 'file'
  return `${cleanBase || 'file'}.${cleanExt}`
}

export type BuildObjectKeyInput = {
  env: AppConfig['env']
  entityType: keyof typeof ENTITY_KEY_SEGMENT | string
  entityId: string
  fileId: string
  originalName: string
  /** UTC instant used for yyyy/mm; defaults to now */
  at?: Date
}

/**
 * Full object key — store this string in Postgres; do not rebuild ad hoc.
 * `{env}/{entity}/{entityId}/{yyyy}/{mm}/{fileId}-{safeOriginalName}`
 */
export function buildObjectKey(input: BuildObjectKeyInput): string {
  const entity = ENTITY_KEY_SEGMENT[input.entityType]
  if (!entity) {
    throw new Error(`Unknown entity type for object key: ${input.entityType}`)
  }

  const at = input.at ?? new Date()
  const yyyy = String(at.getUTCFullYear())
  const mm = String(at.getUTCMonth() + 1).padStart(2, '0')
  const safeName = sanitizeOriginalName(input.originalName)

  return [
    storageEnvSegment(input.env),
    entity,
    input.entityId,
    yyyy,
    mm,
    `${input.fileId}-${safeName}`,
  ].join('/')
}
