import { notFound, notImplemented } from '../../errors/app-error.js'
import type { WorkersRepository } from './workers.repository.js'
import type {
  AssignWorkerBody,
  CreateWorkerBody,
  UpdateWorkerBody,
} from './workers.schema.js'
import type { ProjectAssignment, Worker } from './workers.types.js'

export type WorkersService = {
  listWorkers: () => Promise<Worker[]>
  getWorkerById: (id: string) => Promise<Worker>
  createWorker: (input: CreateWorkerBody) => Promise<Worker>
  updateWorker: (id: string, input: UpdateWorkerBody) => Promise<Worker>
  assignWorkerToProject: (
    workerId: string,
    input: AssignWorkerBody
  ) => Promise<ProjectAssignment>
  unassignWorkerFromProject: (
    workerId: string,
    projectId: string
  ) => Promise<void>
}

export function createWorkersService(
  repository: WorkersRepository
): WorkersService {
  return {
    async listWorkers() {
      return repository.findMany()
    },
    async getWorkerById(id) {
      const worker = await repository.findById(id)
      if (!worker) {
        throw notFound('Worker not found', 'WORKER_NOT_FOUND')
      }
      return worker
    },
    async createWorker() {
      throw notImplemented('workers.createWorker')
    },
    async updateWorker() {
      throw notImplemented('workers.updateWorker')
    },
    async assignWorkerToProject() {
      throw notImplemented('workers.assignWorkerToProject')
    },
    async unassignWorkerFromProject() {
      throw notImplemented('workers.unassignWorkerFromProject')
    },
  }
}
