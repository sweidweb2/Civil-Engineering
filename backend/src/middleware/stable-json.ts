/**
 * Deterministic JSON for hashing: object keys sorted recursively so
 * `{a:1,b:2}` and `{b:2,a:1}` share one digest.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value))
}

function normalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(normalize)
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    out[key] = normalize(obj[key])
  }
  return out
}
