import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const r = await pool.query(`
  select
    to_regclass('public.worker_profiles') as worker_profiles,
    to_regclass('public.worker_experiences') as worker_experiences,
    to_regclass('public.worker_education') as worker_education,
    to_regclass('public.worker_certifications') as worker_certifications,
    to_regclass('public.worker_skills') as worker_skills
`)
console.log(r.rows[0])
await pool.end()
