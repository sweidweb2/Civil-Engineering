/** Simulated latency for mock-backed screens so skeleton presets are visible. */
export const MOCK_LOAD_MS = 600

export function loadMock<T>(data: T, ms = MOCK_LOAD_MS): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), ms)
  })
}
