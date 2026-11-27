-- CreateEnum
CREATE TYPE "ProjectWorkerStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "project_workers" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workerUserId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "ProjectWorkerStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" DATE,
    "assigneeProjectWorkerId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_workers_workerUserId_status_idx" ON "project_workers"("workerUserId", "status");

-- CreateIndex
CREATE INDEX "project_workers_projectId_status_idx" ON "project_workers"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_workers_projectId_workerUserId_key" ON "project_workers"("projectId", "workerUserId");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_status_idx" ON "project_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_tasks_assigneeProjectWorkerId_idx" ON "project_tasks"("assigneeProjectWorkerId");

-- AddForeignKey
ALTER TABLE "project_workers" ADD CONSTRAINT "project_workers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workers" ADD CONSTRAINT "project_workers_workerUserId_fkey" FOREIGN KEY ("workerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workers" ADD CONSTRAINT "project_workers_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigneeProjectWorkerId_fkey" FOREIGN KEY ("assigneeProjectWorkerId") REFERENCES "project_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
