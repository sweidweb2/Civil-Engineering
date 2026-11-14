export type ProjectStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'

export type StageKey = 'geotechnical' | 'design' | 'licensing' | 'materials' | 'maintenance'

export type GeotechnicalStudy = {
  id: string
  projectId: string
  soilType: string
  soilBearingCapacity: string
  groundwaterLevel: string | null
  foundationRecommendation: string
  reportFilePath: string
  consultantName: string
  status: ProjectStageStatus
  startDate: string
  completionDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type ProjectDesign = {
  id: string
  projectId: string
  architecturalDesignPath: string
  structuralDesignPath: string
  mepDesignPath: string
  architectName: string
  structuralEngineerName: string
  mepEngineerName: string
  status: ProjectStageStatus
  startDate: string
  completionDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type ProjectLicensing = {
  id: string
  projectId: string
  permitNumber: string
  issuingAuthority: string
  applicationDate: string
  approvalDate: string | null
  permitFilePath: string
  status: ProjectStageStatus
  expiryDate: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export type MaterialProcurement = {
  id: string
  projectId: string
  supplierName: string
  materialDescription: string
  quantity: string
  unit: string
  totalCost: string
  currency: string
  originCountry: string
  orderDate: string
  expectedArrivalDate: string
  actualArrivalDate: string | null
  invoiceFilePath: string
  status: ProjectStageStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export type ProjectMaintenance = {
  id: string
  projectId: string
  maintenanceType: string
  description: string
  responsiblePerson: string
  scheduledDate: string
  completionDate: string | null
  cost: string
  status: ProjectStageStatus
  reportFilePath: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type StageSlot<T> = {
  exists: boolean
  isComplete: boolean
  data: T | null
}

export type ProjectStagesSummary = {
  geotechnical: StageSlot<GeotechnicalStudy>
  design: StageSlot<ProjectDesign>
  licensing: StageSlot<ProjectLicensing>
  materials: StageSlot<MaterialProcurement>
  maintenance: StageSlot<ProjectMaintenance>
}
