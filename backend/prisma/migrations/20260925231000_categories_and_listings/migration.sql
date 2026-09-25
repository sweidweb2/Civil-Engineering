-- AlterEnum
ALTER TYPE "FileEntityType" ADD VALUE 'LISTING';

-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('PLATFORM', 'PROVIDER');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('MATERIAL', 'EQUIPMENT', 'SERVICE', 'WORKER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('MATERIAL', 'EQUIPMENT', 'SERVICE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RentalUnit" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "scope" "CategoryScope" NOT NULL,
    "providerId" TEXT,
    "kind" "CategoryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_scope_provider_chk" CHECK (
        ("scope" = 'PLATFORM' AND "providerId" IS NULL)
        OR ("scope" = 'PROVIDER' AND "providerId" IS NOT NULL)
    ),
    CONSTRAINT "categories_parent_not_self_chk" CHECK ("parentId" IS NULL OR "parentId" <> "id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "unit" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "rentalPrice" DECIMAL(18,4),
    "rentalUnit" "RentalUnit",
    "quantityAvailable" DECIMAL(18,4),
    "specs" JSONB,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_variations" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "quantityAvailable" DECIMAL(18,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_offers" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(18,4) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_scope_kind_idx" ON "categories"("scope", "kind");

-- CreateIndex
CREATE INDEX "categories_providerId_idx" ON "categories"("providerId");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_platform_slug_key" ON "categories"("slug") WHERE "scope" = 'PLATFORM';

-- CreateIndex
CREATE UNIQUE INDEX "categories_provider_slug_key" ON "categories"("providerId", "slug") WHERE "providerId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "listings_providerId_idx" ON "listings"("providerId");

-- CreateIndex
CREATE INDEX "listings_categoryId_idx" ON "listings"("categoryId");

-- CreateIndex
CREATE INDEX "listings_type_status_idx" ON "listings"("type", "status");

-- CreateIndex
CREATE INDEX "listing_variations_listingId_idx" ON "listing_variations"("listingId");

-- CreateIndex
CREATE INDEX "listing_offers_listingId_idx" ON "listing_offers"("listingId");

-- CreateIndex
CREATE INDEX "listing_offers_isActive_startsAt_endsAt_idx" ON "listing_offers"("isActive", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_variations" ADD CONSTRAINT "listing_variations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_offers" ADD CONSTRAINT "listing_offers_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
