/**
 * One-off: assign specialty keys to existing worker_profiles (and create profiles
 * for WORKER users that still lack one) so they appear under PM specialty cards.
 */
import 'dotenv/config'
import pg from 'pg'

const SPECIALTIES = [
  'masonry',
  'steel-fixing',
  'equipment-operators',
  'carpentry-formwork',
  'electricians',
  'plumbers',
  'welders',
  'painters-finishers',
  'site-engineers',
  'foremen',
]

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

function cuid() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = 'c'
  for (let i = 0; i < 24; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

try {
  const { rows: profiles } = await pool.query(`
    SELECT
      wp.id,
      wp."userId",
      wp.specialty,
      wp."isPublic",
      wp.headline,
      u.email,
      u."verificationStatus",
      u."isVerified",
      p."displayName",
      p."firstName",
      p."lastName"
    FROM worker_profiles wp
    JOIN users u ON u.id = wp."userId"
    LEFT JOIN profiles p ON p."userId" = u.id
    ORDER BY wp."createdAt" ASC
  `)

  console.log(`Found ${profiles.length} worker profile(s)`)

  if (profiles.length === 0) {
    const { rows: workers } = await pool.query(`
      SELECT
        u.id,
        u.email,
        u."verificationStatus",
        u."isVerified",
        p."firstName",
        p."lastName"
      FROM users u
      LEFT JOIN profiles p ON p."userId" = u.id
      LEFT JOIN worker_profiles wp ON wp."userId" = u.id
      WHERE u.role = 'WORKER' AND wp.id IS NULL
      ORDER BY u."createdAt" ASC
    `)
    console.log(`WORKER users without profile: ${workers.length}`)

    for (const [index, user] of workers.entries()) {
      const specialty = SPECIALTIES[index % SPECIALTIES.length]
      const headline = `${user.firstName ?? 'Worker'} · ${specialty}`
      const id = cuid()
      const now = new Date()
      await pool.query(
        `
        INSERT INTO worker_profiles
          (id, "userId", specialty, headline, "isPublic", availability, "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, $4, true, 'AVAILABLE', $5, $5)
        `,
        [id, user.id, specialty, headline, now],
      )
      await pool.query(
        `
        UPDATE users
        SET status = 'ACTIVE',
            "verificationStatus" = 'VERIFIED',
            "isVerified" = true,
            "updatedAt" = $2
        WHERE id = $1
        `,
        [user.id, now],
      )
      console.log(`created profile ${id} → ${user.email} → ${specialty}`)
    }
  } else {
    for (const [index, row] of profiles.entries()) {
      const specialty =
        row.specialty && SPECIALTIES.includes(row.specialty)
          ? row.specialty
          : SPECIALTIES[index % SPECIALTIES.length]
      const now = new Date()
      await pool.query(
        `
        UPDATE worker_profiles
        SET specialty = $2,
            "isPublic" = true,
            "updatedAt" = $3
        WHERE id = $1
        `,
        [row.id, specialty, now],
      )
      await pool.query(
        `
        UPDATE users
        SET status = 'ACTIVE',
            "verificationStatus" = 'VERIFIED',
            "isVerified" = true,
            "updatedAt" = $2
        WHERE id = $1
        `,
        [row.userId, now],
      )
      const name =
        row.displayName || [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email
      console.log(`patched ${row.id} → ${name} → ${specialty}`)
    }
  }

  const { rows: counts } = await pool.query(`
    SELECT specialty, COUNT(*)::int AS count
    FROM worker_profiles
    WHERE specialty IS NOT NULL
    GROUP BY specialty
    ORDER BY specialty
  `)
  console.log('specialtyCounts:', Object.fromEntries(counts.map((r) => [r.specialty, r.count])))
} finally {
  await pool.end()
}
