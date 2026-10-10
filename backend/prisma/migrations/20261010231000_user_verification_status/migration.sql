-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'REQUESTED', 'VERIFIED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- Existing verified accounts stay verified.
UPDATE "users" SET "verificationStatus" = 'VERIFIED' WHERE "isVerified" = true;

-- CreateIndex
CREATE INDEX "users_role_verificationStatus_idx" ON "users"("role", "verificationStatus");
