-- Durable refresh-token denylist (logout + rotation) independent of Redis.
CREATE TABLE IF NOT EXISTS "denied_refresh_tokens" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denied_refresh_tokens_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX IF NOT EXISTS "denied_refresh_tokens_expiresAt_idx" ON "denied_refresh_tokens"("expiresAt");
