import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';

const DEFAULT_MESSAGE = 'Too many requests, please try again later.';

/**
 * Rate-limiter factory. Applies sensible defaults from the environment so
 * route-specific limiters (e.g. stricter auth limits) can be created easily.
 * Responses use the standard error envelope.
 */
export function createRateLimiter(options: Partial<Options> = {}): ReturnType<typeof rateLimit> {
  const message = options.message ?? DEFAULT_MESSAGE;
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message,
    handler: (req: Request, res: Response, _next, handlerOptions) => {
      res.status(handlerOptions.statusCode).json({
        success: false,
        message,
        errors: [],
        requestId: req.id,
      });
    },
    ...options,
  });
}
