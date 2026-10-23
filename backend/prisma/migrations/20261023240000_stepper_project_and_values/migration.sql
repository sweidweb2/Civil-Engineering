-- Replace project_steps with stepper_project (projectId + stepId frozen at create).
-- Add stepper_input_values with flexible JSON value.

-- Drop old project_steps table (feature not yet in production use).
DROP TABLE IF EXISTS "project_steps";

-- CreateTable
CREATE TABLE "stepper_project" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "orderNb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stepper_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stepper_input_values" (
    "id" TEXT NOT NULL,
    "stepperProjectId" TEXT NOT NULL,
    "stepInputId" TEXT NOT NULL,
    "value" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stepper_input_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stepper_project_projectId_orderNb_idx" ON "stepper_project"("projectId", "orderNb");

-- CreateIndex
CREATE INDEX "stepper_project_stepId_idx" ON "stepper_project"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "stepper_project_projectId_stepId_key" ON "stepper_project"("projectId", "stepId");

-- CreateIndex
CREATE INDEX "stepper_input_values_stepInputId_idx" ON "stepper_input_values"("stepInputId");

-- CreateIndex
CREATE UNIQUE INDEX "stepper_input_values_stepperProjectId_stepInputId_key" ON "stepper_input_values"("stepperProjectId", "stepInputId");

-- AddForeignKey
ALTER TABLE "stepper_project" ADD CONSTRAINT "stepper_project_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stepper_project" ADD CONSTRAINT "stepper_project_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stepper_input_values" ADD CONSTRAINT "stepper_input_values_stepperProjectId_fkey" FOREIGN KEY ("stepperProjectId") REFERENCES "stepper_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stepper_input_values" ADD CONSTRAINT "stepper_input_values_stepInputId_fkey" FOREIGN KEY ("stepInputId") REFERENCES "stepper_inputs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
