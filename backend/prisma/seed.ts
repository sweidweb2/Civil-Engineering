/**
 * Seed entry for Prisma (`prisma db seed` / migrate seed).
 * No-op until domain models exist — do not invent sample rows against an unfinished schema.
 */
async function main() {
  console.info(
    '[prisma seed] Skipped — no models yet. Add seed data after the schema is locked.'
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
