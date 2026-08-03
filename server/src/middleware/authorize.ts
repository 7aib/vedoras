import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { UserRole } from '../types/user.js';

/**
 * Restricts a route to one or more roles. Must run after `authenticate`.
 * e.g. router.get('/admin', authenticate, authorize('admin'), handler)
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have permission to access this resource'));
      return;
    }
    next();
  };
}
