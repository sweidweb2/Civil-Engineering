import type { DomainDefinition } from '../_shared/domain-definition.js'

export const workersDomain = {
  name: 'workers',
  responsibility:
    'Owns worker records and project assignments for labor on sites. Does not own User auth credentials or project metadata.',
  entities: [
    {
      name: 'Worker',
      description: 'Field worker profile (may optionally link to a User).',
    },
    {
      name: 'ProjectAssignment',
      description: 'Assignment of a worker to a project with role/dates.',
    },
  ],
  valueObjects: [
    {
      name: 'AssignmentRole',
      description: 'Role on a project crew (exact set TBD).',
    },
  ],
  useCases: [
    'listWorkers',
    'getWorkerById',
    'createWorker',
    'updateWorker',
    'assignWorkerToProject',
    'unassignWorkerFromProject',
  ],
  relationships: [
    'Worker.userId? → User (users).',
    'ProjectAssignment.projectId → Project (projects); projectId only, no deep imports.',
  ],
  externalAccessRules: [
    'Projects/expenses must not mutate worker tables; call workers public service.',
    'Assignment changes enforce project access via projects public API/service.',
  ],
} as const satisfies DomainDefinition
