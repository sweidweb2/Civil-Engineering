-- Enforce unique step order per project (matches template clone matching + order allocation).
DROP INDEX IF EXISTS "stepper_project_projectId_orderNb_idx";

CREATE UNIQUE INDEX "stepper_project_projectId_orderNb_key" ON "stepper_project"("projectId", "orderNb");

CREATE INDEX "stepper_project_projectId_idx" ON "stepper_project"("projectId");
