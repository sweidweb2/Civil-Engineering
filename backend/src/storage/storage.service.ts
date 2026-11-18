import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { StorageConfig } from '../config/index.js'
import { serviceUnavailable } from '../errors/app-error.js'
import { createR2Client } from './r2.client.js'

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String((error as { name: unknown }).name) : ''
  const message = error instanceof Error ? error.message : ''
  return (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    name === 'TimeoutErrorException' ||
    /timed out|timeout|aborted/i.test(message)
  )
}

async function withStorageTimeouts<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (isTimeoutError(error)) {
      throw serviceUnavailable('STORAGE_TIMEOUT', 'Storage request timed out')
    }
    throw error
  }
}

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
  putObject: (input: { key: string; body: Buffer; contentType: string }) => Promise<void>
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
      return withStorageTimeouts(async () => {
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
      })
    },

    async putObject({ key, body, contentType }) {
      await withStorageTimeouts(() =>
        client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
          }),
        ),
      )
    },

    async deleteObject(key) {
      await withStorageTimeouts(async () => {
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
      })
    },
  }
}
