import type { DomainDefinition } from '../_shared/domain-definition.js'

export const materialsDomain = {
  name: 'materials',
  responsibility:
    'Owns material catalog and stock movements for construction supplies. Quantities and units live here; project linkage is by projectId.',
  entities: [
    {
      name: 'Material',
      description: 'Catalog item (name, unit, SKU/notes).',
    },
    {
      name: 'StockMovement',
      description: 'Inbound/outbound quantity change, optionally project-scoped.',
    },
  ],
  valueObjects: [
    {
      name: 'Quantity',
      description: 'Non-negative decimal amount with unit code.',
    },
    {
      name: 'UnitCode',
      description: 'Unit of measure (kg, m3, pcs, …) — exact set TBD.',
    },
  ],
  useCases: [
    'listMaterials',
    'getMaterialById',
    'createMaterial',
    'updateMaterial',
    'recordStockMovement',
  ],
  relationships: [
    'StockMovement.projectId? → Project (projects).',
    'Expenses may reference materialId for cost lines (expenses module).',
  ],
  externalAccessRules: [
    'Only materials module adjusts stock balances.',
    'Other modules call public materials service — never materials.repository.',
  ],
} as const satisfies DomainDefinition
