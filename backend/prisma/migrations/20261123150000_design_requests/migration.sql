-- CreateEnum
CREATE TYPE "DesignRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "FileEntityType" ADD VALUE 'DESIGN_REQUEST';

-- CreateTable
CREATE TABLE "design_requests" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DesignRequestStatus" NOT NULL DEFAULT 'PENDING',
    "neededBy" TIMESTAMP(3) NOT NULL,
    "requirementFilePath" TEXT,
    "responseFilePath" TEXT,
    "projectId" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "design_requests_requestedById_createdAt_idx" ON "design_requests"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "design_requests_status_createdAt_idx" ON "design_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "design_requests_projectId_createdAt_idx" ON "design_requests"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "design_requests" ADD CONSTRAINT "design_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_requests" ADD CONSTRAINT "design_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
