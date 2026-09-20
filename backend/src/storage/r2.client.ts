import { S3Client } from '@aws-sdk/client-s3'

import type { StorageConfig } from '../config/index.js'

export function createR2Client(storage: StorageConfig): S3Client {
  return new S3Client({
    region: storage.region || 'auto',
    endpoint: storage.endpoint,
    credentials: {
      accessKeyId: storage.accessKey,
      secretAccessKey: storage.secretKey,
    },
    forcePathStyle: true,
  })
}
