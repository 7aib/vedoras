import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Central error handler. Translates known errors (ApiError, Zod, Mongoose)
 * into the standardized error envelope and logs unexpected failures.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((e) => ({ field: e.path, message: e.message })),
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: 'Invalid identifier format' });
    return;
  }

  logger.error('Unhandled error', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: req.originalUrl,
  });

  res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
}
