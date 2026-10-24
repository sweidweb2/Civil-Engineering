-- AlterTable
ALTER TABLE "project_step_inputs" ADD COLUMN "categoryId" TEXT;

-- AlterTable
ALTER TABLE "stepper_inputs" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "project_step_inputs_categoryId_idx" ON "project_step_inputs"("categoryId");

-- CreateIndex
CREATE INDEX "stepper_inputs_categoryId_idx" ON "stepper_inputs"("categoryId");

-- AddForeignKey
ALTER TABLE "project_step_inputs" ADD CONSTRAINT "project_step_inputs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stepper_inputs" ADD CONSTRAINT "stepper_inputs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
