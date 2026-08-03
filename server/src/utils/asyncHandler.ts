import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so rejected promises are forwarded
 * to the central error-handling middleware automatically.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
