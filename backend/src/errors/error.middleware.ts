import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

import { AppError } from './app-error.js'
import { ErrorCodes } from './error-codes.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(ErrorCodes.NOT_FOUND, 'Route not found', 404))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: err.flatten(),
    })
    return
  }

  console.error(err)

  res.status(500).json({
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'Internal server error',
  })
}
