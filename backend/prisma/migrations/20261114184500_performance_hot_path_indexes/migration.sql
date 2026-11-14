-- Hot-path indexes for list sort/filter/search (performance audit).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Listings: sort by updatedAt, common filters, brand search
CREATE INDEX IF NOT EXISTS "listings_updatedAt_idx" ON "listings"("updatedAt");
CREATE INDEX IF NOT EXISTS "listings_status_updatedAt_idx" ON "listings"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "listings_providerId_status_updatedAt_idx"
  ON "listings"("providerId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "listings_brand_trgm_idx" ON "listings" USING gin ("brand" gin_trgm_ops);

-- Projects: archive filters + searchable text
CREATE INDEX IF NOT EXISTS "projects_archivedAt_idx" ON "projects"("archivedAt");
CREATE INDEX IF NOT EXISTS "projects_ownerId_archivedAt_createdAt_idx"
  ON "projects"("ownerId", "archivedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "projects_archivedAt_createdAt_idx"
  ON "projects"("archivedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "projects_name_trgm_idx" ON "projects" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "projects_code_trgm_idx" ON "projects" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "projects_city_trgm_idx" ON "projects" USING gin ("city" gin_trgm_ops);
