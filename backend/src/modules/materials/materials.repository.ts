import type {
  CreateMaterialBody,
  StockMovementBody,
  UpdateMaterialBody,
} from './materials.schema.js'
import type { Material, StockMovement } from './materials.types.js'

export type MaterialsRepository = {
  findMany: () => Promise<Material[]>
  findById: (id: string) => Promise<Material | null>
  create: (input: CreateMaterialBody) => Promise<Material>
  update: (id: string, input: UpdateMaterialBody) => Promise<Material>
  recordMovement: (
    materialId: string,
    input: StockMovementBody
  ) => Promise<StockMovement>
}

export function createMaterialsRepository(): MaterialsRepository {
  return {
    async findMany() {
      return []
    },
    async findById() {
      return null
    },
    async create() {
      throw new Error('materials.repository.create requires Prisma')
    },
    async update() {
      throw new Error('materials.repository.update requires Prisma')
    },
    async recordMovement() {
      throw new Error('materials.repository.recordMovement requires Prisma')
    },
  }
}
