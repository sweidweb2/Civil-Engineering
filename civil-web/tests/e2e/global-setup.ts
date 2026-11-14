/**
 * Ensures the API is reachable before seeded Playwright flows run.
 * Local: Supabase Postgres + `cd backend && npm run dev` (+ seed once).
 */
async function globalSetup() {
  const apiBase =
    process.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000/api/v1'
  const healthUrl = `${apiBase}/health`

  try {
    const res = await fetch(healthUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      [
        `E2E global setup: API health check failed (${healthUrl}): ${reason}`,
        'Start the API with seed data (Supabase via backend/.env):',
        '  cd backend && npx prisma migrate deploy && npm run prisma:seed && npm run dev',
      ].join('\n'),
      { cause: error },
    )
  }
}

export default globalSetup
