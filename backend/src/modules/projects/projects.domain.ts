import type { DomainDefinition } from '../_shared/domain-definition.js'

export const projectsDomain = {
  name: 'projects',
  responsibility:
    'Owns construction projects lifecycle and project metadata. Coordinates references to workers/expenses/materials by id — does not own their internals.',
  entities: [
    {
      name: 'Project',
      description: 'A job/site with name, status, owner, and schedule fields.',
    },
  ],
  valueObjects: [
    {
      name: 'ProjectStatus',
      description: 'draft | active | on_hold | completed | archived',
    },
  ],
  useCases: ['listProjects', 'getProjectById', 'createProject', 'updateProject', 'archiveProject'],
  relationships: [
    'Project.ownerId → User (users).',
    'Expenses/materials/workers reference projectId (owned by those modules).',
  ],
  externalAccessRules: [
    'Cross-module access only via projects public service (e.g. assertAccessible).',
    'Never import project.repository from expenses/workers/materials.',
    'Resource ownership checks happen in project service / authz helpers.',
  ],
} as const satisfies DomainDefinition
