import type {
  AssignWorkerBody,
  CreateWorkerBody,
  UpdateWorkerBody,
} from './workers.schema.js'
import type { ProjectAssignment, Worker } from './workers.types.js'

export type WorkersRepository = {
  findMany: () => Promise<Worker[]>
  findById: (id: string) => Promise<Worker | null>
  create: (input: CreateWorkerBody) => Promise<Worker>
  update: (id: string, input: UpdateWorkerBody) => Promise<Worker>
  assign: (
    workerId: string,
    input: AssignWorkerBody
  ) => Promise<ProjectAssignment>
}

export function createWorkersRepository(): WorkersRepository {
  return {
    async findMany() {
      return []
    },
    async findById() {
      return null
    },
    async create() {
      throw new Error('workers.repository.create requires Prisma')
    },
    async update() {
      throw new Error('workers.repository.update requires Prisma')
    },
    async assign() {
      throw new Error('workers.repository.assign requires Prisma')
    },
  }
}
