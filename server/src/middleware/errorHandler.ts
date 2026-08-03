import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import multer from 'multer';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

interface ErrorPayload {
  statusCode: number;
  message: string;
  errors: unknown[];
}

function errorPayload(error: unknown): ErrorPayload {
  if (error instanceof ApiError) {
    return { statusCode: error.statusCode, message: error.message, errors: error.errors };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((e) => ({ field: e.path, message: e.message })),
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return { statusCode: 400, message: 'Invalid identifier format', errors: [] };
  }

  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE'
      ? { statusCode: 413, message: 'File too large', errors: [] }
      : { statusCode: 400, message: `Upload error: ${error.code}`, errors: [] };
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    return { statusCode: 400, message: 'Invalid JSON payload', errors: [] };
  }

  const maybe = error as Record<string, unknown>;
  if (maybe.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request payload too large', errors: [] };
  }

  // Generic fallback for errors that already carry an HTTP status code.
  if (typeof maybe.statusCode === 'number' && maybe.statusCode >= 400 && maybe.statusCode < 600) {
    return {
      statusCode: maybe.statusCode,
      message: typeof maybe.message === 'string' ? maybe.message : 'Request failed',
      errors: [],
    };
  }

  return { statusCode: 500, message: 'Internal server error', errors: [] };
}

/**
 * Central error handler. Translates known errors (ApiError, Zod, Mongoose,
 * body-parser) into the standardized error envelope, always echoing the
 * request id for correlation, and logs unexpected failures.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { statusCode, message, errors } = errorPayload(error);

  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      requestId: req.id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: req.originalUrl,
    });
  } else {
    logger.warn('Request error', {
      requestId: req.id,
      statusCode,
      message,
      url: req.originalUrl,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    requestId: req.id,
  });
}
