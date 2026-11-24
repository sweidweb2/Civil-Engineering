-- AlterEnum
ALTER TYPE "FileEntityType" ADD VALUE IF NOT EXISTS 'CATEGORY';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "imagePath" TEXT;
