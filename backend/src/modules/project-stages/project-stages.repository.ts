import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { prisma } from '../../database/prisma.js'
import type { ProjectStageStatus as PrismaStageStatus } from '../../generated/prisma/client.js'
import type {
  UpsertDesignBody,
  UpsertGeotechnicalBody,
  UpsertLicensingBody,
  UpsertMaintenanceBody,
  UpsertMaterialsBody,
} from './project-stages.schema.js'
import type {
  GeotechnicalStudy,
  MaterialProcurement,
  ProjectDesign,
  ProjectLicensing,
  ProjectMaintenance,
  ProjectStageStatus,
} from './project-stages.types.js'

function toIso(date: Date): string {
  return date.toISOString()
}

function toDate(value: string): Date {
  return new Date(value)
}

function decimalToString(value: { toString(): string } | null | undefined): string | null {
  return value == null ? null : value.toString()
}

function mapGeotechnical(row: {
  id: string
  projectId: string
  soilType: string
  soilBearingCapacity: { toString(): string }
  groundwaterLevel: { toString(): string } | null
  foundationRecommendation: string
  reportFilePath: string
  consultantName: string
  status: PrismaStageStatus
  startDate: Date
  completionDate: Date
  notes: string
  createdAt: Date
  updatedAt: Date
}): GeotechnicalStudy {
  return {
    id: row.id,
    projectId: row.projectId,
    soilType: row.soilType,
    soilBearingCapacity: row.soilBearingCapacity.toString(),
    groundwaterLevel: decimalToString(row.groundwaterLevel),
    foundationRecommendation: row.foundationRecommendation,
    reportFilePath: row.reportFilePath,
    consultantName: row.consultantName,
    status: row.status as ProjectStageStatus,
    startDate: toIso(row.startDate),
    completionDate: toIso(row.completionDate),
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function mapDesign(row: {
  id: string
  projectId: string
  architecturalDesignPath: string
  structuralDesignPath: string
  mepDesignPath: string
  architectName: string
  structuralEngineerName: string
  mepEngineerName: string
  status: PrismaStageStatus
  startDate: Date
  completionDate: Date
  notes: string
  createdAt: Date
  updatedAt: Date
}): ProjectDesign {
  return {
    id: row.id,
    projectId: row.projectId,
    architecturalDesignPath: row.architecturalDesignPath,
    structuralDesignPath: row.structuralDesignPath,
    mepDesignPath: row.mepDesignPath,
    architectName: row.architectName,
    structuralEngineerName: row.structuralEngineerName,
    mepEngineerName: row.mepEngineerName,
    status: row.status as ProjectStageStatus,
    startDate: toIso(row.startDate),
    completionDate: toIso(row.completionDate),
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function mapLicensing(row: {
  id: string
  projectId: string
  permitNumber: string
  issuingAuthority: string
  applicationDate: Date
  approvalDate: Date | null
  permitFilePath: string
  status: PrismaStageStatus
  expiryDate: Date | null
  notes: string
  createdAt: Date
  updatedAt: Date
}): ProjectLicensing {
  return {
    id: row.id,
    projectId: row.projectId,
    permitNumber: row.permitNumber,
    issuingAuthority: row.issuingAuthority,
    applicationDate: toIso(row.applicationDate),
    approvalDate: row.approvalDate ? toIso(row.approvalDate) : null,
    permitFilePath: row.permitFilePath,
    status: row.status as ProjectStageStatus,
    expiryDate: row.expiryDate ? toIso(row.expiryDate) : null,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function mapMaterials(row: {
  id: string
  projectId: string
  supplierName: string
  materialDescription: string
  quantity: { toString(): string }
  unit: string
  totalCost: { toString(): string }
  currency: string
  originCountry: string
  orderDate: Date
  expectedArrivalDate: Date
  actualArrivalDate: Date | null
  invoiceFilePath: string
  status: PrismaStageStatus
  notes: string
  createdAt: Date
  updatedAt: Date
}): MaterialProcurement {
  return {
    id: row.id,
    projectId: row.projectId,
    supplierName: row.supplierName,
    materialDescription: row.materialDescription,
    quantity: row.quantity.toString(),
    unit: row.unit,
    totalCost: row.totalCost.toString(),
    currency: row.currency,
    originCountry: row.originCountry,
    orderDate: toIso(row.orderDate),
    expectedArrivalDate: toIso(row.expectedArrivalDate),
    actualArrivalDate: row.actualArrivalDate ? toIso(row.actualArrivalDate) : null,
    invoiceFilePath: row.invoiceFilePath,
    status: row.status as ProjectStageStatus,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function mapMaintenance(row: {
  id: string
  projectId: string
  maintenanceType: string
  description: string
  responsiblePerson: string
  scheduledDate: Date
  completionDate: Date | null
  cost: { toString(): string }
  status: PrismaStageStatus
  reportFilePath: string
  notes: string
  createdAt: Date
  updatedAt: Date
}): ProjectMaintenance {
  return {
    id: row.id,
    projectId: row.projectId,
    maintenanceType: row.maintenanceType,
    description: row.description,
    responsiblePerson: row.responsiblePerson,
    scheduledDate: toIso(row.scheduledDate),
    completionDate: row.completionDate ? toIso(row.completionDate) : null,
    cost: row.cost.toString(),
    status: row.status as ProjectStageStatus,
    reportFilePath: row.reportFilePath,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

export type ProjectStagesRepository = {
  findAllByProjectId: (projectId: string) => Promise<{
    geotechnical: GeotechnicalStudy | null
    design: ProjectDesign | null
    licensing: ProjectLicensing | null
    materials: MaterialProcurement | null
    maintenance: ProjectMaintenance | null
  }>
  findGeotechnical: (projectId: string) => Promise<GeotechnicalStudy | null>
  upsertGeotechnical: (
    projectId: string,
    input: UpsertGeotechnicalBody,
  ) => Promise<GeotechnicalStudy>
  findDesign: (projectId: string) => Promise<ProjectDesign | null>
  upsertDesign: (projectId: string, input: UpsertDesignBody) => Promise<ProjectDesign>
  findLicensing: (projectId: string) => Promise<ProjectLicensing | null>
  upsertLicensing: (projectId: string, input: UpsertLicensingBody) => Promise<ProjectLicensing>
  findMaterials: (projectId: string) => Promise<MaterialProcurement | null>
  upsertMaterials: (projectId: string, input: UpsertMaterialsBody) => Promise<MaterialProcurement>
  findMaintenance: (projectId: string) => Promise<ProjectMaintenance | null>
  upsertMaintenance: (
    projectId: string,
    input: UpsertMaintenanceBody,
  ) => Promise<ProjectMaintenance>
}

export function createProjectStagesRepository(): ProjectStagesRepository {
  return {
    async findAllByProjectId(projectId) {
      const [geotechnical, design, licensing, materials, maintenance] = await Promise.all([
        prisma.geotechnicalStudy.findUnique({ where: { projectId } }),
        prisma.projectDesign.findUnique({ where: { projectId } }),
        prisma.projectLicensing.findUnique({ where: { projectId } }),
        prisma.materialProcurement.findUnique({ where: { projectId } }),
        prisma.projectMaintenance.findUnique({ where: { projectId } }),
      ])
      return {
        geotechnical: geotechnical ? mapGeotechnical(geotechnical) : null,
        design: design ? mapDesign(design) : null,
        licensing: licensing ? mapLicensing(licensing) : null,
        materials: materials ? mapMaterials(materials) : null,
        maintenance: maintenance ? mapMaintenance(maintenance) : null,
      }
    },

    async findGeotechnical(projectId) {
      const row = await prisma.geotechnicalStudy.findUnique({ where: { projectId } })
      return row ? mapGeotechnical(row) : null
    },

    async upsertGeotechnical(projectId, input) {
      const data = {
        soilType: input.soilType,
        soilBearingCapacity: input.soilBearingCapacity,
        groundwaterLevel: input.groundwaterLevel ?? null,
        foundationRecommendation: input.foundationRecommendation,
        reportFilePath: input.reportFilePath,
        consultantName: input.consultantName,
        status: input.status,
        startDate: toDate(input.startDate),
        completionDate: toDate(input.completionDate),
        notes: input.notes,
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.geotechnicalStudy.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapGeotechnical(row)
      })
    },

    async findDesign(projectId) {
      const row = await prisma.projectDesign.findUnique({ where: { projectId } })
      return row ? mapDesign(row) : null
    },

    async upsertDesign(projectId, input) {
      const data = {
        architecturalDesignPath: input.architecturalDesignPath,
        structuralDesignPath: input.structuralDesignPath,
        mepDesignPath: input.mepDesignPath,
        architectName: input.architectName,
        structuralEngineerName: input.structuralEngineerName,
        mepEngineerName: input.mepEngineerName,
        status: input.status,
        startDate: toDate(input.startDate),
        completionDate: toDate(input.completionDate),
        notes: input.notes,
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.projectDesign.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapDesign(row)
      })
    },

    async findLicensing(projectId) {
      const row = await prisma.projectLicensing.findUnique({ where: { projectId } })
      return row ? mapLicensing(row) : null
    },

    async upsertLicensing(projectId, input) {
      const data = {
        permitNumber: input.permitNumber,
        issuingAuthority: input.issuingAuthority,
        applicationDate: toDate(input.applicationDate),
        approvalDate: input.approvalDate ? toDate(input.approvalDate) : null,
        permitFilePath: input.permitFilePath,
        status: input.status,
        expiryDate: input.expiryDate ? toDate(input.expiryDate) : null, // null clears optional dates
        notes: input.notes,
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.projectLicensing.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapLicensing(row)
      })
    },

    async findMaterials(projectId) {
      const row = await prisma.materialProcurement.findUnique({ where: { projectId } })
      return row ? mapMaterials(row) : null
    },

    async upsertMaterials(projectId, input) {
      const data = {
        supplierName: input.supplierName,
        materialDescription: input.materialDescription,
        quantity: input.quantity,
        unit: input.unit,
        totalCost: input.totalCost,
        currency: input.currency,
        originCountry: input.originCountry,
        orderDate: toDate(input.orderDate),
        expectedArrivalDate: toDate(input.expectedArrivalDate),
        actualArrivalDate: input.actualArrivalDate ? toDate(input.actualArrivalDate) : null,
        invoiceFilePath: input.invoiceFilePath,
        status: input.status,
        notes: input.notes,
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.materialProcurement.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapMaterials(row)
      })
    },

    async findMaintenance(projectId) {
      const row = await prisma.projectMaintenance.findUnique({ where: { projectId } })
      return row ? mapMaintenance(row) : null
    },

    async upsertMaintenance(projectId, input) {
      const data = {
        maintenanceType: input.maintenanceType,
        description: input.description,
        responsiblePerson: input.responsiblePerson,
        scheduledDate: toDate(input.scheduledDate),
        completionDate: input.completionDate ? toDate(input.completionDate) : null,
        cost: input.cost,
        status: input.status,
        reportFilePath: input.reportFilePath,
        notes: input.notes,
      }
      return translateUniqueConflict(async () => {
        const row = await prisma.projectMaintenance.upsert({
          where: { projectId },
          create: { projectId, ...data },
          update: data,
        })
        return mapMaintenance(row)
      })
    },
  }
}
