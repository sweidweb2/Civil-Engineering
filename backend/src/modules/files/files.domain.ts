import type { DomainDefinition } from '../_shared/domain-definition.js'

export const filesDomain = {
  name: 'files',
  responsibility:
    'Owns file metadata and upload/download lifecycle. Blobs live in Cloudflare R2; browser may upload via API proxy (CORS-safe) or presigned PUT.',
  entities: [
    {
      name: 'File',
      description:
        'Metadata row: key, bucket, mime, size, status, entity link, uploader. Blob in R2.',
    },
  ],
  valueObjects: [
    {
      name: 'FileStatus',
      description: 'PENDING | READY | DELETED',
    },
    {
      name: 'FileEntityType',
      description: 'PROJECT | USER | EXPENSE | MATERIAL | WORKER | LISTING',
    },
  ],
  useCases: [
    'presignUpload',
    'uploadBytes',
    'completeUpload',
    'getDownloadUrl',
    'softDeleteFile',
  ],
  relationships: [
    'File.uploadedById → User.',
    'File.entityType + entityId → owning domain resource (polymorphic).',
  ],
  externalAccessRules: [
    'Other modules must not import files.repository.',
    'Attachment authz uses owning domain assertAccessible / self-or-admin — never key possession.',
  ],
} as const satisfies DomainDefinition
