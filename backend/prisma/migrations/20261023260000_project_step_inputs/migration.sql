-- Cloned project step inputs replace stepper_input_values.
-- Template changes no longer affect existing projects.

-- CreateTable
CREATE TABLE "project_step_inputs" (
    "id" TEXT NOT NULL,
    "stepperProjectId" TEXT NOT NULL,
    "inputTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orderNb" INTEGER NOT NULL DEFAULT 0,
    "value" JSONB,
    "sourceStepInputId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_step_inputs_pkey" PRIMARY KEY ("id")
);

-- Migrate existing value rows into cloned project inputs (stable unique order per stepper).
INSERT INTO "project_step_inputs" (
  "id",
  "stepperProjectId",
  "inputTypeId",
  "label",
  "orderNb",
  "value",
  "sourceStepInputId",
  "createdAt",
  "updatedAt"
)
SELECT
  siv."id",
  siv."stepperProjectId",
  si."inputTypeId",
  si."label",
  (ROW_NUMBER() OVER (
    PARTITION BY siv."stepperProjectId"
    ORDER BY si."orderNb" ASC, si."label" ASC, siv."id" ASC
  ) - 1)::INTEGER AS "orderNb",
  siv."value",
  siv."stepInputId",
  siv."createdAt",
  siv."updatedAt"
FROM "stepper_input_values" siv
INNER JOIN "stepper_inputs" si ON si."id" = siv."stepInputId";

-- DropTable
DROP TABLE IF EXISTS "stepper_input_values";

-- CreateIndex
CREATE UNIQUE INDEX "project_step_inputs_stepperProjectId_orderNb_key" ON "project_step_inputs"("stepperProjectId", "orderNb");

-- CreateIndex
CREATE INDEX "project_step_inputs_stepperProjectId_idx" ON "project_step_inputs"("stepperProjectId");

-- CreateIndex
CREATE INDEX "project_step_inputs_inputTypeId_idx" ON "project_step_inputs"("inputTypeId");

-- CreateIndex
CREATE INDEX "project_step_inputs_sourceStepInputId_idx" ON "project_step_inputs"("sourceStepInputId");

-- Normalize template orders before unique indexes (no row deletes).
WITH ranked_steps AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "orderNb" ASC, "createdAt" ASC, "id" ASC) - 1)::INTEGER AS "newOrder"
  FROM "steps"
)
UPDATE "steps" AS s
SET "orderNb" = ranked_steps."newOrder"
FROM ranked_steps
WHERE s."id" = ranked_steps."id";

WITH ranked_inputs AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (PARTITION BY "stepId" ORDER BY "orderNb" ASC, "createdAt" ASC, "id" ASC) - 1)::INTEGER AS "newOrder"
  FROM "stepper_inputs"
)
UPDATE "stepper_inputs" AS si
SET "orderNb" = ranked_inputs."newOrder"
FROM ranked_inputs
WHERE si."id" = ranked_inputs."id";

-- CreateIndex
CREATE UNIQUE INDEX "steps_userId_orderNb_key" ON "steps"("userId", "orderNb");

-- CreateIndex
CREATE UNIQUE INDEX "stepper_inputs_stepId_orderNb_key" ON "stepper_inputs"("stepId", "orderNb");

-- AddForeignKey
ALTER TABLE "project_step_inputs" ADD CONSTRAINT "project_step_inputs_stepperProjectId_fkey" FOREIGN KEY ("stepperProjectId") REFERENCES "stepper_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_step_inputs" ADD CONSTRAINT "project_step_inputs_inputTypeId_fkey" FOREIGN KEY ("inputTypeId") REFERENCES "input_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_step_inputs" ADD CONSTRAINT "project_step_inputs_sourceStepInputId_fkey" FOREIGN KEY ("sourceStepInputId") REFERENCES "stepper_inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
