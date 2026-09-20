import type { DomainDefinition } from '../_shared/domain-definition.js'

export const usersDomain = {
  name: 'users',
  responsibility:
    'Owns user identity profile and role membership used across the app. Does not issue tokens (auth) or project business data.',
  entities: [
    {
      name: 'User',
      description: 'Account profile: identity, contact, status.',
    },
  ],
  valueObjects: [
    {
      name: 'UserRole',
      description: 'Application role (e.g. project_manager, worker) — exact set TBD.',
    },
    {
      name: 'EmailAddress',
      description: 'Normalized unique email.',
    },
  ],
  useCases: [
    'listUsers',
    'getUserById',
    'createUser',
    'updateUser',
    'deactivateUser',
  ],
  relationships: [
    'Referenced by auth (userId), projects (ownerId), workers (optional link), expenses (createdBy).',
  ],
  externalAccessRules: [
    'Other modules read users only via public users service (e.g. getById), never user.repository.',
    'Role changes are authorized in users service — UI checks are not enough.',
  ],
} as const satisfies DomainDefinition
