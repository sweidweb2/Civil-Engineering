import { notFound, notImplemented } from '../../errors/app-error.js'
import type { MaterialsRepository } from './materials.repository.js'
import type {
  CreateMaterialBody,
  StockMovementBody,
  UpdateMaterialBody,
} from './materials.schema.js'
import type { Material, StockMovement } from './materials.types.js'

export type MaterialsService = {
  listMaterials: () => Promise<Material[]>
  getMaterialById: (id: string) => Promise<Material>
  createMaterial: (input: CreateMaterialBody) => Promise<Material>
  updateMaterial: (id: string, input: UpdateMaterialBody) => Promise<Material>
  recordStockMovement: (materialId: string, input: StockMovementBody) => Promise<StockMovement>
}

export function createMaterialsService(repository: MaterialsRepository): MaterialsService {
  return {
    async listMaterials() {
      return repository.findMany()
    },
    async getMaterialById(id) {
      const material = await repository.findById(id)
      if (!material) {
        throw notFound('Material not found', 'MATERIAL_NOT_FOUND')
      }
      return material
    },
    async createMaterial() {
      throw notImplemented('materials.createMaterial')
    },
    async updateMaterial() {
      throw notImplemented('materials.updateMaterial')
    },
    async recordStockMovement() {
      throw notImplemented('materials.recordStockMovement')
    },
  }
}
