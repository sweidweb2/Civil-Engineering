/** Extract File.id from a storage key: `…/{fileId}-{safeOriginalName}` (same rule as civil-web). */
export function fileIdFromStorageKey(key: string): string | null {
  const basename = key.trim().split('/').pop()
  if (!basename) return null
  const dash = basename.indexOf('-')
  if (dash <= 0) return null
  const fileId = basename.slice(0, dash).trim()
  return fileId.length > 0 ? fileId : null
}
