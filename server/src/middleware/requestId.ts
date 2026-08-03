import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Assigns a correlation id to every request. Accepts a client-provided
 * `x-request-id` header (useful for tracing across services) and echoes it
 * back on the `X-Request-Id` response header for debugging.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.header('x-request-id') ?? randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
