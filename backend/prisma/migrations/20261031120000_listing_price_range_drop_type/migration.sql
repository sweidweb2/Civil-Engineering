-- Listing type is derived from category.kind; pricing can be fixed or a min/max range.

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "priceMin" DECIMAL(18,4),
ADD COLUMN "priceMax" DECIMAL(18,4);

ALTER TABLE "listings" ALTER COLUMN "price" DROP NOT NULL;

-- DropIndex
DROP INDEX "listings_type_status_idx";

-- AlterTable
ALTER TABLE "listings" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ListingType";

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");
