-- CreateEnum
CREATE TYPE "InputTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "input_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "InputTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stepper_inputs" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "inputTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orderNb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stepper_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "input_types_code_key" ON "input_types"("code");

-- CreateIndex
CREATE INDEX "input_types_status_sortOrder_idx" ON "input_types"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "stepper_inputs_stepId_idx" ON "stepper_inputs"("stepId");

-- CreateIndex
CREATE INDEX "stepper_inputs_stepId_orderNb_idx" ON "stepper_inputs"("stepId", "orderNb");

-- CreateIndex
CREATE INDEX "stepper_inputs_inputTypeId_idx" ON "stepper_inputs"("inputTypeId");

-- AddForeignKey
ALTER TABLE "stepper_inputs" ADD CONSTRAINT "stepper_inputs_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stepper_inputs" ADD CONSTRAINT "stepper_inputs_inputTypeId_fkey" FOREIGN KEY ("inputTypeId") REFERENCES "input_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
