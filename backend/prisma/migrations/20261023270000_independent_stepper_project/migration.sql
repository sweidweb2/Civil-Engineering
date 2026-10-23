-- Make project steppers fully independent: clone name, drop stepId link.
-- Snapshot input type code/label on project_step_inputs; drop sourceStepInputId.

-- StepperProject: add name, backfill, drop stepId
ALTER TABLE "stepper_project" ADD COLUMN "name" TEXT;

UPDATE "stepper_project" AS sp
SET "name" = s."name"
FROM "steps" AS s
WHERE sp."stepId" = s."id";

UPDATE "stepper_project" SET "name" = 'Step' WHERE "name" IS NULL OR "name" = '';

ALTER TABLE "stepper_project" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "stepper_project" DROP CONSTRAINT IF EXISTS "stepper_project_stepId_fkey";
DROP INDEX IF EXISTS "stepper_project_projectId_stepId_key";
DROP INDEX IF EXISTS "stepper_project_stepId_idx";
ALTER TABLE "stepper_project" DROP COLUMN "stepId";

-- ProjectStepInput: snapshot type fields, isProjectOnly, drop sourceStepInputId
ALTER TABLE "project_step_inputs" ADD COLUMN "inputTypeCode" TEXT;
ALTER TABLE "project_step_inputs" ADD COLUMN "inputTypeLabel" TEXT;
ALTER TABLE "project_step_inputs" ADD COLUMN "isProjectOnly" BOOLEAN NOT NULL DEFAULT false;

UPDATE "project_step_inputs" AS psi
SET
  "inputTypeCode" = it."code",
  "inputTypeLabel" = it."label",
  "isProjectOnly" = (psi."sourceStepInputId" IS NULL)
FROM "input_types" AS it
WHERE psi."inputTypeId" = it."id";

UPDATE "project_step_inputs"
SET "inputTypeCode" = 'TEXT', "inputTypeLabel" = 'Text'
WHERE "inputTypeCode" IS NULL OR "inputTypeLabel" IS NULL;

ALTER TABLE "project_step_inputs" ALTER COLUMN "inputTypeCode" SET NOT NULL;
ALTER TABLE "project_step_inputs" ALTER COLUMN "inputTypeLabel" SET NOT NULL;

ALTER TABLE "project_step_inputs" DROP CONSTRAINT IF EXISTS "project_step_inputs_sourceStepInputId_fkey";
DROP INDEX IF EXISTS "project_step_inputs_sourceStepInputId_idx";
ALTER TABLE "project_step_inputs" DROP COLUMN IF EXISTS "sourceStepInputId";
