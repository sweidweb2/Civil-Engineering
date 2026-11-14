import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import EmbeddedPostgres from 'embedded-postgres'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const suite = process.argv[2] === 'e2e' ? 'e2e' : 'integration'
const PORT = suite === 'e2e' ? 55432 : 5433
const dataDir = path.join(os.tmpdir(), `civil-pg-${suite}-${process.pid}`)

fs.mkdirSync(dataDir, { recursive: true })
const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: false,
})

await server.initialise()
await server.start()
await server.createDatabase('civil_test')

const url = `postgresql://postgres:postgres@127.0.0.1:${PORT}/civil_test`
const env = {
  ...process.env,
  DATABASE_URL: url,
  DIRECT_URL: url,
  FORCE_EMBEDDED_PG: '1',
  SKIP_EMBEDDED_PG: suite === 'e2e' ? '1' : undefined,
}

const script = suite === 'e2e' ? 'test:e2e' : 'test:integration'
const result = spawnSync('npm', ['run', script], {
  cwd: backendRoot,
  env,
  encoding: 'utf8',
  shell: true,
  stdio: 'inherit',
})

try {
  await server.stop()
} catch {
  // ignore
}
try {
  fs.rmSync(dataDir, { recursive: true, force: true })
} catch {
  // ignore
}

process.exit(result.status ?? 1)
