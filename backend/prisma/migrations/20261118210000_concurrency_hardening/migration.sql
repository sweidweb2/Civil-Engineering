-- Invalidate refresh JWTs issued before a password change (compare to token iat).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refreshInvalidBefore" TIMESTAMP(3);

-- Race-safe uniqueness for platform category slug under the same kind + parent.
-- COALESCE so NULL parentId still participates in the unique key.
CREATE UNIQUE INDEX IF NOT EXISTS "categories_platform_kind_parent_slug_uidx"
  ON "categories" ("kind", (COALESCE("parentId", '')), "slug")
  WHERE "scope" = 'PLATFORM';
