-- CreateEnum
CREATE TYPE "ProjectStageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "geotechnical_studies" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "soilBearingCapacity" DECIMAL(18,4) NOT NULL,
    "groundwaterLevel" DECIMAL(18,4),
    "foundationRecommendation" TEXT NOT NULL,
    "reportFilePath" TEXT NOT NULL,
    "consultantName" TEXT NOT NULL,
    "status" "ProjectStageStatus" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geotechnical_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_designs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "architecturalDesignPath" TEXT NOT NULL,
    "structuralDesignPath" TEXT NOT NULL,
    "mepDesignPath" TEXT NOT NULL,
    "architectName" TEXT NOT NULL,
    "structuralEngineerName" TEXT NOT NULL,
    "mepEngineerName" TEXT NOT NULL,
    "status" "ProjectStageStatus" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_licensings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "approvalDate" TIMESTAMP(3),
    "permitFilePath" TEXT NOT NULL,
    "status" "ProjectStageStatus" NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_licensings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_procurements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "materialDescription" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedArrivalDate" TIMESTAMP(3) NOT NULL,
    "actualArrivalDate" TIMESTAMP(3),
    "invoiceFilePath" TEXT NOT NULL,
    "status" "ProjectStageStatus" NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_procurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_maintenances" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsiblePerson" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "cost" DECIMAL(18,4) NOT NULL,
    "status" "ProjectStageStatus" NOT NULL,
    "reportFilePath" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geotechnical_studies_projectId_key" ON "geotechnical_studies"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_designs_projectId_key" ON "project_designs"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_licensings_projectId_key" ON "project_licensings"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "material_procurements_projectId_key" ON "material_procurements"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_maintenances_projectId_key" ON "project_maintenances"("projectId");

-- AddForeignKey
ALTER TABLE "geotechnical_studies" ADD CONSTRAINT "geotechnical_studies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_designs" ADD CONSTRAINT "project_designs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_licensings" ADD CONSTRAINT "project_licensings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_procurements" ADD CONSTRAINT "material_procurements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_maintenances" ADD CONSTRAINT "project_maintenances_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
