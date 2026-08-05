import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

/**
 * Requires an admin role. Must run after `authenticate` so `req.user` is set.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    next(ApiError.forbidden('Admin access required'));
    return;
  }
  next();
}
