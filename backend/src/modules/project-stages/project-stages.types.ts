export type ProjectStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'

export type StageKey = 'geotechnical' | 'design' | 'licensing' | 'materials' | 'maintenance'

export type GeotechnicalStudy = {
  id: string
  projectId: string
  soilType: string | null
  soilBearingCapacity: string | null
  groundwaterLevel: string | null
  foundationRecommendation: string | null
  reportFilePath: string | null
  consultantName: string | null
  status: ProjectStageStatus
  startDate: string | null
  completionDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectDesign = {
  id: string
  projectId: string
  architecturalDesignPath: string | null
  structuralDesignPath: string | null
  mepDesignPath: string | null
  architectName: string | null
  structuralEngineerName: string | null
  mepEngineerName: string | null
  status: ProjectStageStatus
  startDate: string | null
  completionDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectLicensing = {
  id: string
  projectId: string
  permitNumber: string | null
  issuingAuthority: string | null
  applicationDate: string | null
  approvalDate: string | null
  permitFilePath: string | null
  status: ProjectStageStatus
  expiryDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type MaterialProcurement = {
  id: string
  projectId: string
  supplierName: string | null
  materialDescription: string | null
  quantity: string | null
  unit: string | null
  totalCost: string | null
  currency: string | null
  originCountry: string | null
  orderDate: string | null
  expectedArrivalDate: string | null
  actualArrivalDate: string | null
  invoiceFilePath: string | null
  status: ProjectStageStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectMaintenance = {
  id: string
  projectId: string
  maintenanceType: string | null
  description: string | null
  responsiblePerson: string | null
  scheduledDate: string | null
  completionDate: string | null
  cost: string | null
  status: ProjectStageStatus
  reportFilePath: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type StageSlot<T> = {
  exists: boolean
  isComplete: boolean
  missingCount: number
  data: T | null
}

export type ProjectStagesSummary = {
  geotechnical: StageSlot<GeotechnicalStudy>
  design: StageSlot<ProjectDesign>
  licensing: StageSlot<ProjectLicensing>
  materials: StageSlot<MaterialProcurement>
  maintenance: StageSlot<ProjectMaintenance>
}
