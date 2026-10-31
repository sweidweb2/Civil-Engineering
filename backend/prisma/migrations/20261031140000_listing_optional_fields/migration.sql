-- Only listing name is required; provider, category, unit, currency become optional.

ALTER TABLE "listings" ALTER COLUMN "providerId" DROP NOT NULL;
ALTER TABLE "listings" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "listings" ALTER COLUMN "unit" DROP NOT NULL;
ALTER TABLE "listings" ALTER COLUMN "currency" DROP NOT NULL;
