-- Rename worker primaryTrade → specialty (stable specialty key from client dictionary).
ALTER TABLE "worker_profiles" RENAME COLUMN "primaryTrade" TO "specialty";

DROP INDEX IF EXISTS "worker_profiles_primaryTrade_trgm_idx";

CREATE INDEX "worker_profiles_specialty_trgm_idx" ON "worker_profiles" USING GIN ("specialty" gin_trgm_ops);
