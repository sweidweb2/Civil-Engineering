# Decision — Storage (Cloudflare R2)

**Status:** LOCKED  
**Date:** 2026-09-20  
**Applies to:** `backend/` (presign + metadata + authz), `civil-web/` / `civil-mobile/` (optimize + direct PUT), Postgres (`File` rows)

---

## Provider

| Piece | Choice |
| --- | --- |
| Provider | **Cloudflare R2** (S3-compatible API) |
| Bucket | Single bucket `civil-bucket` |
| Client | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` |
| Public CDN / custom domain | **Deferred** — private docs use short-lived presigned GET only |

Local credential mapping: `Docs/[1] Main App/[5] Credentials/Storage - Cloudflare.md` (do not commit secrets). Env keys only in code/docs.

---

## Object key convention

```text
{env}/{entity}/{entityId}/{yyyy}/{mm}/{fileId}-{safeOriginalName}
```

Example: `dev/projects/clxyz/2026/09/cuid-site-plan.pdf`

| Segment | Rule |
| --- | --- |
| `env` | From `NODE_ENV`: `development`→`dev`, `test`→`test`, `staging`→`staging`, `production`→`prod` |
| `entity` | Plural resource segment (`projects`, `users`, …) — never a bare user id as the only path segment |
| `entityId` | Owning resource id |
| `yyyy` / `mm` | UTC date of create |
| `fileId` | Cuid of the `File` row |
| `safeOriginalName` | Sanitized basename (alnum, `.`, `-`, `_`) |

**Store the full `key` in Postgres.** Do not rebuild keys ad hoc when issuing download/delete.

---

## Upload / download flow

```text
Client (optimize images) → API authz + validate → PENDING File row
  → short-lived presigned PUT → R2
  → POST /api/v1/files/:id/complete → READY
Download: API authz → short-lived presigned GET (~5–15 min, default 10)
```

| Rule | Detail |
| --- | --- |
| Presign PUT TTL | Default **600s** (`STORAGE_UPLOAD_URL_TTL_SEC`) |
| Presign GET TTL | Default **600s** (`STORAGE_DOWNLOAD_URL_TTL_SEC`) |
| Content-Type | Locked on PUT to the MIME validated at presign |
| Express proxy | **Forbidden** for large uploads — API issues URLs + metadata only |
| Public URLs | None for private project/user files |

---

## Postgres `File` metadata

Blob stays in R2. Postgres is source of truth for who/what/where:

`id`, `key`, `bucket`, `mime`, `size`, `originalName`, `status` (`PENDING` \| `READY` \| `DELETED`), `uploadedById`, `entityType`, `entityId`, timestamps.

---

## Validation

Before presign:

- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`,  
  `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,  
  `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Max size: default **25 MB** (`STORAGE_MAX_BYTES`)

On complete: `HeadObject` — reject missing object or size/MIME surprises; leave row `PENDING` / fail the complete call.

---

## Access control

Same as other domains: **authn + resource ownership/role on the entity**, not “anyone with the key.”

| `entityType` | Gate |
| --- | --- |
| `PROJECT` | `projects.assertAccessible` (owner or admin) |
| `USER` | `assertSelfOrAdmin` |
| Others | Reject until domain ownership exists |

Presign / download / delete only after that check.

---

## Image optimization (client, before upload)

Images **must** run through a client optimize pipeline **before** `presign` / PUT:

- Max edge **1920px**, quality ~0.8, output MIME on allowlist (`image/jpeg` or `image/webp`)
- Web: canvas / compression helper
- Mobile: `expo-image-manipulator`
- PDF / office: skip optimize

---

## Deletion / CDN / backups

| Topic | Bedrock |
| --- | --- |
| Delete | Soft-delete `status=DELETED`, then `enqueueDeleteStorageObject` hard-deletes R2 (sync stub → BullMQ later) |
| CDN / public domain | Skip for private files |
| Backups | Rely on R2 versioning / object-lock later — not required day one |

---

## Env vars

| Key | Purpose |
| --- | --- |
| `STORAGE_PROVIDER` | `r2` |
| `STORAGE_ENDPOINT` | R2 S3 API endpoint |
| `STORAGE_BUCKET` | `civil-bucket` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | R2 S3 credentials |
| `STORAGE_PUBLIC_BASE_URL` | Optional; unused for private docs |
| `STORAGE_UPLOAD_URL_TTL_SEC` | Default `600` |
| `STORAGE_DOWNLOAD_URL_TTL_SEC` | Default `600` |
| `STORAGE_MAX_BYTES` | Default `25000000` |

---

## API surface

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/files/presign` | Authz + validate → PENDING + `{ fileId, key, uploadUrl, headers }` |
| `POST` | `/api/v1/files/:id/complete` | HeadObject + READY |
| `GET` | `/api/v1/files/:id/download-url` | Authz + READY → `{ downloadUrl }` |
| `DELETE` | `/api/v1/files/:id` | Soft-delete + enqueue R2 purge |
