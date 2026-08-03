import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

/** Catches unknown routes and forwards a 404 ApiError to the error handler. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
