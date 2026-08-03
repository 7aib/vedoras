import type { NextFunction, Request, Response } from 'express';
import { User, toSafeUser } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Protects routes behind a valid Bearer access token. Loads the freshest
 * user from the database (excluding secrets) so role/status changes apply
 * immediately, and attaches it to the request.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-password -refreshTokens').lean();

    if (!user) {
      throw ApiError.unauthorized('Account no longer exists');
    }

    req.userId = String(user._id);
    req.user = toSafeUser(user);
    next();
  } catch (error) {
    next(error);
  }
}
