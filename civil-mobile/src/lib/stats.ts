/** Rows from a settled list response, or [] when the request failed. */
export function fulfilledRows<T>(result: PromiseSettledResult<{ data: T[] }>): T[] {
  return result.status === 'fulfilled' ? result.value.data : []
}
