import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validates a request segment against a Zod schema. On failure it forwards
 * the ZodError to the central error handler (→ 400 with field details).
 * On success the parsed output replaces the original segment.
 */
export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new ZodError(result.error.issues));
      return;
    }
    if (source === 'query') {
      // In Express 5 `req.query` is a getter-only accessor; shadow it with
      // an own data property holding the validated result.
      Object.defineProperty(req, 'query', {
        value: result.data,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    } else {
      (req as Record<Source, unknown>)[source] = result.data;
    }
    next();
  };
}
