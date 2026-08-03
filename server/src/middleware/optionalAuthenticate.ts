import type { NextFunction, Request, Response } from 'express';
import { User, toSafeUser } from '../models/user.model.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Best-effort authentication. When a valid Bearer token is present it loads
 * the user and attaches it (like `authenticate`), but it never rejects the
 * request — anonymous callers simply pass through. Used on public endpoints
 * whose payloads gain personalization (e.g. `isFavorited`) for logged-in users.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      next();
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-password -refreshTokens').lean();

    if (user) {
      req.userId = String(user._id);
      req.user = toSafeUser(user);
    }
    next();
  } catch {
    // Invalid/expired token: treat as anonymous.
    next();
  }
}
