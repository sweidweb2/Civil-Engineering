-- CreateEnum
ALTER TYPE "FileEntityType" ADD VALUE IF NOT EXISTS 'DESIGN_OFFER';

-- CreateTable
CREATE TABLE "design_offers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceStart" DECIMAL(18,4) NOT NULL,
    "priceEnd" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "imagePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_offers_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "design_requests" ADD COLUMN "designOfferId" TEXT;

-- CreateIndex
CREATE INDEX "design_offers_isActive_sortOrder_idx" ON "design_offers"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "design_offers_sortOrder_idx" ON "design_offers"("sortOrder");

-- CreateIndex
CREATE INDEX "design_requests_designOfferId_idx" ON "design_requests"("designOfferId");

-- AddForeignKey
ALTER TABLE "design_requests" ADD CONSTRAINT "design_requests_designOfferId_fkey" FOREIGN KEY ("designOfferId") REFERENCES "design_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
