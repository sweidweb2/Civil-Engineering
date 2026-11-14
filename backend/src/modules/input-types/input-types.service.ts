import type { AuthActor } from '../../authz/index.js'
import { isSuper } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import type {
  ActiveInputTypeRef,
  InputTypeRecord,
  InputTypesRepository,
} from './input-types.repository.js'
import type {
  CreateInputTypeBody,
  ListInputTypesQuery,
  UpdateInputTypeBody,
} from './input-types.schema.js'
import type { InputType, PaginatedInputTypes } from './input-types.types.js'

export type InputTypesService = {
  listInputTypes: (query: ListInputTypesQuery, actor: AuthActor) => Promise<PaginatedInputTypes>
  getInputTypeById: (id: string, actor: AuthActor) => Promise<InputType>
  /** Cross-module: resolve an ACTIVE catalog type or throw validation. */
  requireActiveInputType: (id: string) => Promise<ActiveInputTypeRef>
  createInputType: (input: CreateInputTypeBody, actor: AuthActor) => Promise<InputType>
  updateInputType: (id: string, input: UpdateInputTypeBody, actor: AuthActor) => Promise<InputType>
  deleteInputType: (id: string, actor: AuthActor) => Promise<void>
}

function assertSuper(actor: AuthActor) {
  if (!isSuper(actor.roles)) {
    throw forbidden('Only super admins can manage input types')
  }
}

function toDto(record: InputTypeRecord): InputType {
  return {
    id: record.id,
    code: record.code,
    label: record.label,
    status: record.status,
    sortOrder: record.sortOrder,
    usageCount: record.usageCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function createInputTypesService(repository: InputTypesRepository): InputTypesService {
  async function loadOrThrow(id: string): Promise<InputTypeRecord> {
    const row = await repository.findById(id)
    if (!row) throw notFound('Input type not found', 'INPUT_TYPE_NOT_FOUND')
    return row
  }

  return {
    async listInputTypes(query, actor) {
      const superUser = isSuper(actor.roles)
      const scopedQuery: ListInputTypesQuery = superUser ? query : { ...query, status: 'ACTIVE' }
      // Usage + status tallies are for SUPER admin; pickers skip those joins/queries.
      const includeUsage = superUser && query.includeUsage === true

      const itemsPromise = repository.findMany(scopedQuery, { includeUsage })
      const countsPromise = includeUsage
        ? repository.countByStatus()
        : Promise.resolve({ activeCount: 0, inactiveCount: 0 })

      const [{ items, total }, counts] = await Promise.all([itemsPromise, countsPromise])

      return {
        data: items.map(toDto),
        meta: {
          page: scopedQuery.page,
          limit: scopedQuery.limit,
          total,
          activeCount: includeUsage ? counts.activeCount : total,
          inactiveCount: includeUsage ? counts.inactiveCount : 0,
        },
      }
    },

    async getInputTypeById(id, actor) {
      const row = await loadOrThrow(id)
      if (!isSuper(actor.roles) && row.status !== 'ACTIVE') {
        throw notFound('Input type not found', 'INPUT_TYPE_NOT_FOUND')
      }
      return toDto(row)
    },

    async requireActiveInputType(id) {
      const row = await repository.findActiveById(id)
      if (!row) {
        throw validationError('Select an active input type')
      }
      return row
    },

    async createInputType(input, actor) {
      assertSuper(actor)
      const code = input.code.toUpperCase()
      const existing = await repository.findByCode(code)
      if (existing) {
        throw conflict('An input type with this code already exists', 'INPUT_TYPE_CODE_TAKEN')
      }
      return toDto(await repository.create({ ...input, code }))
    },

    async updateInputType(id, input, actor) {
      assertSuper(actor)
      const current = await loadOrThrow(id)

      if (current.usageCount > 0 && (input.code !== undefined || input.label !== undefined)) {
        throw conflict(
          'This input type is in use — only enable/disable (status) or sort order can change',
          'INPUT_TYPE_IN_USE',
        )
      }

      const code = input.code?.toUpperCase()
      if (code) {
        const existing = await repository.findByCode(code, id)
        if (existing) {
          throw conflict('An input type with this code already exists', 'INPUT_TYPE_CODE_TAKEN')
        }
      }
      return toDto(
        await repository.update(id, {
          status: input.status,
          sortOrder: input.sortOrder,
          ...(current.usageCount > 0 ? {} : { code, label: input.label }),
        }),
      )
    },

    async deleteInputType(id, actor) {
      assertSuper(actor)
      const row = await loadOrThrow(id)
      if (row.usageCount > 0) {
        throw conflict(
          'Disable this type instead — it is still used by templates or projects',
          'INPUT_TYPE_IN_USE',
        )
      }
      await repository.delete(id)
    },
  }
}
