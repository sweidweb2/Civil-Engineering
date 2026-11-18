import { S3Client } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'

import type { StorageConfig } from '../config/index.js'

/** Time to establish a TCP/TLS connection to R2. */
const R2_CONNECTION_TIMEOUT_MS = 5_000
/** Overall per-request budget (put/get/head/delete) — aligned with client upload timeouts. */
const R2_REQUEST_TIMEOUT_MS = 60_000

export function createR2Client(storage: StorageConfig): S3Client {
  return new S3Client({
    region: storage.region || 'auto',
    endpoint: storage.endpoint,
    credentials: {
      accessKeyId: storage.accessKey,
      secretAccessKey: storage.secretKey,
    },
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: R2_CONNECTION_TIMEOUT_MS,
      requestTimeout: R2_REQUEST_TIMEOUT_MS,
    }),
  })
}
