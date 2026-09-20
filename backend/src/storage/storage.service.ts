import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { StorageConfig } from '../config/index.js'
import { createR2Client } from './r2.client.js'

export type HeadObjectResult = {
  contentLength?: number
  contentType?: string
}

export type StorageService = {
  bucket: string
  presignPut: (input: {
    key: string
    contentType: string
    expiresInSec?: number
  }) => Promise<string>
  presignGet: (input: { key: string; expiresInSec?: number }) => Promise<string>
  headObject: (key: string) => Promise<HeadObjectResult | null>
  deleteObject: (key: string) => Promise<void>
}

export function createStorageService(storage: StorageConfig): StorageService {
  const client = createR2Client(storage)
  const bucket = storage.bucket

  return {
    bucket,

    async presignPut({ key, contentType, expiresInSec }) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      })
      return getSignedUrl(client, command, {
        expiresIn: expiresInSec ?? storage.uploadUrlTtlSec,
      })
    },

    async presignGet({ key, expiresInSec }) {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
      return getSignedUrl(client, command, {
        expiresIn: expiresInSec ?? storage.downloadUrlTtlSec,
      })
    },

    async headObject(key) {
      try {
        const result = await client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        )
        return {
          contentLength: result.ContentLength,
          contentType: result.ContentType,
        }
      } catch (error) {
        const name =
          error && typeof error === 'object' && 'name' in error
            ? String((error as { name: unknown }).name)
            : ''
        const status =
          error && typeof error === 'object' && '$metadata' in error
            ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
            : undefined
        if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) {
          return null
        }
        throw error
      }
    },

    async deleteObject(key) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        )
      } catch (error) {
        const status =
          error && typeof error === 'object' && '$metadata' in error
            ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
            : undefined
        if (status === 404) {
          return
        }
        throw error
      }
    },
  }
}
