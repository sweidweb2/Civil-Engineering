-- Shared idempotency keys for create endpoints (Postgres-backed; replaces in-process Map).
CREATE TABLE "idempotency_records" (
    "scope" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" INTEGER,
    "body" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("scope")
);

CREATE INDEX "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");
