-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "steps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderNb" INTEGER NOT NULL DEFAULT 0,
    "status" "StepStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_steps" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepId" TEXT,
    "name" TEXT NOT NULL,
    "orderNb" INTEGER NOT NULL DEFAULT 0,
    "status" "StepStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "steps_userId_idx" ON "steps"("userId");

-- CreateIndex
CREATE INDEX "steps_userId_status_idx" ON "steps"("userId", "status");

-- CreateIndex
CREATE INDEX "steps_userId_orderNb_idx" ON "steps"("userId", "orderNb");

-- CreateIndex
CREATE INDEX "project_steps_projectId_idx" ON "project_steps"("projectId");

-- CreateIndex
CREATE INDEX "project_steps_projectId_orderNb_idx" ON "project_steps"("projectId", "orderNb");

-- CreateIndex
CREATE INDEX "project_steps_stepId_idx" ON "project_steps"("stepId");

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_steps" ADD CONSTRAINT "project_steps_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_steps" ADD CONSTRAINT "project_steps_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
