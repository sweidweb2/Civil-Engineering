-- Allow draft / in-progress stage rows with incomplete fields.

ALTER TABLE "geotechnical_studies" ALTER COLUMN "soilType" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "soilBearingCapacity" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "foundationRecommendation" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "reportFilePath" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "consultantName" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "completionDate" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "geotechnical_studies" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

ALTER TABLE "project_designs" ALTER COLUMN "architecturalDesignPath" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "structuralDesignPath" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "mepDesignPath" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "architectName" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "structuralEngineerName" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "mepEngineerName" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "completionDate" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "project_designs" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

ALTER TABLE "project_licensings" ALTER COLUMN "permitNumber" DROP NOT NULL;
ALTER TABLE "project_licensings" ALTER COLUMN "issuingAuthority" DROP NOT NULL;
ALTER TABLE "project_licensings" ALTER COLUMN "applicationDate" DROP NOT NULL;
ALTER TABLE "project_licensings" ALTER COLUMN "permitFilePath" DROP NOT NULL;
ALTER TABLE "project_licensings" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "project_licensings" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

ALTER TABLE "material_procurements" ALTER COLUMN "supplierName" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "materialDescription" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "unit" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "totalCost" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "currency" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "originCountry" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "orderDate" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "expectedArrivalDate" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "invoiceFilePath" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "material_procurements" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

ALTER TABLE "project_maintenances" ALTER COLUMN "maintenanceType" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "responsiblePerson" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "scheduledDate" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "cost" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "reportFilePath" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "project_maintenances" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
