import express, { type NextFunction, type Request, type Response } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import {
  createIdempotencyStore,
  IDEMPOTENCY_REPLAYED_HEADER,
  idempotent,
} from '../../src/middleware/idempotency.js'

function buildApp(options: { failFirst?: boolean; slow?: boolean } = {}) {
  let created = 0
  let calls = 0
  let release: (() => void) | undefined
  const store = createIdempotencyStore({ ttlMs: 60_000 })
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    req.user = { id: req.get('x-test-user') ?? 'u1', roles: ['ADMIN'] }
    next()
  })
  app.post('/things', idempotent(store), async (req, res) => {
    calls += 1
    if (options.failFirst && calls === 1) {
      res.status(400).json({ error: { message: 'bad input' } })
      return
    }
    if (options.slow) await new Promise<void>((r) => (release = r))
    created += 1
    res.status(201).json({ data: { id: `thing-${created}`, name: req.body.name } })
  })
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as AppError
    res.status(e.status ?? 500).json({ error: { code: e.code, message: e.message } })
  })
  return { app, store, created: () => created, release: () => release?.() }
}

const KEY = 'key-0001-abcdef'

describe('idempotent() middleware', () => {
  let ctx: ReturnType<typeof buildApp>
  beforeEach(() => {
    ctx = buildApp()
  })

  it('replays the first 2xx response for a retry with the same key and body', async () => {
    const first = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    const retry = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    expect(first.status).toBe(201)
    expect(retry.status).toBe(201)
    expect(retry.body).toEqual(first.body)
    expect(retry.headers[IDEMPOTENCY_REPLAYED_HEADER]).toBe('true')
    expect(ctx.created()).toBe(1)
  })

  it('does nothing without the header', async () => {
    await request(ctx.app).post('/things').send({ name: 'a' })
    await request(ctx.app).post('/things').send({ name: 'a' })
    expect(ctx.created()).toBe(2)
  })

  it('scopes keys per user', async () => {
    await request(ctx.app).post('/things').set('Idempotency-Key', KEY).send({ name: 'a' })
    await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .set('x-test-user', 'u2')
      .send({ name: 'a' })
    expect(ctx.created()).toBe(2)
  })

  it('rejects reusing a key with a different body', async () => {
    await request(ctx.app).post('/things').set('Idempotency-Key', KEY).send({ name: 'a' })
    const res = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'b' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED')
    expect(ctx.created()).toBe(1)
  })

  it('does not store errors, so a corrected retry is processed', async () => {
    ctx = buildApp({ failFirst: true })
    const first = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    const retry = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    expect(first.status).toBe(400)
    expect(retry.status).toBe(201)
    expect(ctx.created()).toBe(1)
  })

  it('answers 409 while the first request is still running', async () => {
    ctx = buildApp({ slow: true })
    const first = request(ctx.app).post('/things').set('Idempotency-Key', KEY).send({ name: 'a' })
    const firstDone = first.then((r) => r)
    // Give the first request time to reach the handler.
    await new Promise((r) => setTimeout(r, 50))
    const concurrent = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    expect(concurrent.status).toBe(409)
    expect(concurrent.body.error.code).toBe('IDEMPOTENCY_IN_PROGRESS')
    ctx.release()
    expect((await firstDone).status).toBe(201)
  })

  it('replays instead of duplicating when the client timed out mid-request', async () => {
    ctx = buildApp({ slow: true })
    // Client gives up before the handler finishes (closes the socket).
    await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
      .timeout(50)
      .catch(() => undefined)
    // Retry while the first request is still running: blocked, not re-executed.
    const during = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    expect(during.status).toBe(409)
    expect(during.body.error.code).toBe('IDEMPOTENCY_IN_PROGRESS')

    ctx.release()
    await new Promise((r) => setTimeout(r, 50))

    const retry = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ name: 'a' })
    expect(retry.status).toBe(201)
    expect(retry.headers[IDEMPOTENCY_REPLAYED_HEADER]).toBe('true')
    expect(ctx.created()).toBe(1)
  })

  it('records outcomes of handlers that do not use res.json', async () => {
    let calls = 0
    const store = createIdempotencyStore({ ttlMs: 60_000 })
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      req.user = { id: 'u1', roles: ['ADMIN'] }
      next()
    })
    app.post('/noop', idempotent(store), (_req, res) => {
      calls += 1
      res.status(204).end()
    })
    await request(app).post('/noop').set('Idempotency-Key', KEY).send({ a: 1 })
    await new Promise((r) => setTimeout(r, 20))
    const retry = await request(app).post('/noop').set('Idempotency-Key', KEY).send({ a: 1 })
    expect(retry.status).toBe(204)
    expect(calls).toBe(1)
  })

  it('rejects malformed keys', async () => {
    const res = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', 'bad key!')
      .send({ name: 'a' })
    expect(res.status).toBe(400)
  })

  it('bounds memory with a max entry count', () => {
    const store = createIdempotencyStore({ maxEntries: 2 })
    for (const k of ['a', 'b', 'c']) {
      store.set(k, { state: 'pending', bodyHash: 'h', expiresAt: Date.now() + 1000 })
    }
    expect(store.size?.()).toBe(2)
    expect(store.get('a')).toBeUndefined()
  })

  it('treats key-reordered JSON bodies as the same request', async () => {
    await request(ctx.app).post('/things').set('Idempotency-Key', KEY).send({ name: 'a', extra: 1 })
    const retry = await request(ctx.app)
      .post('/things')
      .set('Idempotency-Key', KEY)
      .send({ extra: 1, name: 'a' })
    expect(retry.status).toBe(201)
    expect(retry.headers[IDEMPOTENCY_REPLAYED_HEADER]).toBe('true')
    expect(ctx.created()).toBe(1)
  })
})
