-- Index coverage audit: add missing hot-path compounds/GIN; drop redundant prefixes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "notifications_receiverId_deletedAt_createdAt_idx"
  ON "notifications"("receiverId", "deletedAt", "createdAt");

DROP INDEX IF EXISTS "notifications_receiverId_deletedAt_idx";
DROP INDEX IF EXISTS "notifications_createdAt_idx";

-- ---------------------------------------------------------------------------
-- Worker profiles
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "worker_profiles_isPublic_updatedAt_idx"
  ON "worker_profiles"("isPublic", "updatedAt");
CREATE INDEX IF NOT EXISTS "worker_profiles_isPublic_availability_updatedAt_idx"
  ON "worker_profiles"("isPublic", "availability", "updatedAt");
CREATE INDEX IF NOT EXISTS "worker_profiles_country_trgm_idx"
  ON "worker_profiles" USING gin ("country" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "worker_profiles_headline_trgm_idx"
  ON "worker_profiles" USING gin ("headline" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "worker_profiles_bio_trgm_idx"
  ON "worker_profiles" USING gin ("bio" gin_trgm_ops);

DROP INDEX IF EXISTS "worker_profiles_city_country_idx";
DROP INDEX IF EXISTS "worker_profiles_availability_isPublic_idx";

-- ---------------------------------------------------------------------------
-- Providers
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "providers_status_createdAt_idx"
  ON "providers"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "providers_createdAt_idx"
  ON "providers"("createdAt");
CREATE INDEX IF NOT EXISTS "providers_email_trgm_idx"
  ON "providers" USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "providers_city_trgm_idx"
  ON "providers" USING gin ("city" gin_trgm_ops);

DROP INDEX IF EXISTS "providers_status_idx";
DROP INDEX IF EXISTS "providers_city_country_idx";

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "projects_ownerId_archivedAt_status_createdAt_idx"
  ON "projects"("ownerId", "archivedAt", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "projects_archivedAt_status_createdAt_idx"
  ON "projects"("archivedAt", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "projects_archivedAt_type_createdAt_idx"
  ON "projects"("archivedAt", "type", "createdAt");

DROP INDEX IF EXISTS "projects_ownerId_idx";
DROP INDEX IF EXISTS "projects_startDate_idx";
DROP INDEX IF EXISTS "projects_city_country_idx";
DROP INDEX IF EXISTS "projects_createdAt_idx";
DROP INDEX IF EXISTS "projects_archivedAt_idx";

-- ---------------------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "files_status_updatedAt_idx"
  ON "files"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "files_status_createdAt_idx"
  ON "files"("status", "createdAt");

DROP INDEX IF EXISTS "files_status_idx";

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "reviews_targetType_createdAt_idx"
  ON "reviews"("targetType", "createdAt");
CREATE INDEX IF NOT EXISTS "reviews_status_targetType_createdAt_idx"
  ON "reviews"("status", "targetType", "createdAt");

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "categories_scope_kind_sortOrder_idx"
  ON "categories"("scope", "kind", "sortOrder");
CREATE INDEX IF NOT EXISTS "categories_scope_kind_isActive_idx"
  ON "categories"("scope", "kind", "isActive");
CREATE INDEX IF NOT EXISTS "categories_name_trgm_idx"
  ON "categories" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "categories_nameAr_trgm_idx"
  ON "categories" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "categories_slug_trgm_idx"
  ON "categories" USING gin ("slug" gin_trgm_ops);

DROP INDEX IF EXISTS "categories_scope_kind_idx";

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "listings_categoryId_status_updatedAt_idx"
  ON "listings"("categoryId", "status", "updatedAt");

DROP INDEX IF EXISTS "listings_providerId_idx";
DROP INDEX IF EXISTS "listings_categoryId_idx";
DROP INDEX IF EXISTS "listings_status_idx";

-- ---------------------------------------------------------------------------
-- Gallery image prefix indexes (covered by compounds)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "listing_images_listingId_idx";
DROP INDEX IF EXISTS "project_images_projectId_idx";

-- ---------------------------------------------------------------------------
-- Unused
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "registration_attempts_ipAddress_idx";
