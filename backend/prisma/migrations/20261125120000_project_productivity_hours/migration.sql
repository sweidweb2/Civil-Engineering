-- CreateTable
CREATE TABLE "project_productivity_hours" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "hours" DECIMAL(4,1) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_productivity_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_productivity_hours_projectId_workDate_idx" ON "project_productivity_hours"("projectId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "project_productivity_hours_projectId_workDate_key" ON "project_productivity_hours"("projectId", "workDate");

-- AddForeignKey
ALTER TABLE "project_productivity_hours" ADD CONSTRAINT "project_productivity_hours_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
