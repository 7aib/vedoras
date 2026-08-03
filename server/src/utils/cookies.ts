import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { decodeToken } from './jwt.js';

export const REFRESH_COOKIE_NAME = 'vedoras_refresh';

/** Cookie is only sent to auth endpoints, keeping it off other request paths. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  // Align the cookie lifetime with the JWT's own expiry.
  const maxAge = decodeToken(refreshToken).exp * 1000 - Date.now();
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...baseCookieOptions(), maxAge });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
