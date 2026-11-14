-- At most one main image per project / listing (partial unique indexes).
CREATE UNIQUE INDEX IF NOT EXISTS "project_images_one_main_per_project_idx"
  ON "project_images" ("projectId")
  WHERE "isMain" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "listing_images_one_main_per_listing_idx"
  ON "listing_images" ("listingId")
  WHERE "isMain" = true;
