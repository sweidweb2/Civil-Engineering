-- Trigram indexes make case-insensitive contains search indexable.
-- Status and createdAt indexes serve the directory count filters.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE INDEX "users_email_trgm_idx" ON "users" USING gin ("email" gin_trgm_ops);

CREATE INDEX "profiles_firstName_trgm_idx" ON "profiles" USING gin ("firstName" gin_trgm_ops);
CREATE INDEX "profiles_lastName_trgm_idx" ON "profiles" USING gin ("lastName" gin_trgm_ops);
CREATE INDEX "profiles_displayName_trgm_idx" ON "profiles" USING gin ("displayName" gin_trgm_ops);
CREATE INDEX "profiles_phone_trgm_idx" ON "profiles" USING gin ("phone" gin_trgm_ops);

CREATE INDEX "providers_name_trgm_idx" ON "providers" USING gin ("name" gin_trgm_ops);
CREATE INDEX "listings_name_trgm_idx" ON "listings" USING gin ("name" gin_trgm_ops);
CREATE INDEX "reviews_comment_trgm_idx" ON "reviews" USING gin ("comment" gin_trgm_ops);
