/**
 * Seed entry for Prisma (`prisma db seed` / migrate seed).
 * No sample users by default — register via API or add seeds intentionally.
 */
async function main() {
  console.info('[prisma seed] No seed rows — create accounts via /api/v1/auth/register')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
