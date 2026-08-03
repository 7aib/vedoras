import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

interface JwtPayloadBase {
  sub: string;
  type: 'access' | 'refresh';
  jti: string;
}

export interface AccessTokenPayload extends JwtPayloadBase {
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayloadBase {
  type: 'refresh';
}

export interface DecodedToken {
  sub: string;
  type: 'access' | 'refresh';
  exp: number;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access', jti: randomUUID() }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: env.JWT_ISSUER,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh', jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: env.JWT_ISSUER,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: env.JWT_ISSUER });
    if (typeof payload === 'string' || payload.type !== 'access') {
      throw new Error('Wrong token type');
    }
    return payload as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: env.JWT_ISSUER });
    if (typeof payload === 'string' || payload.type !== 'refresh') {
      throw new Error('Wrong token type');
    }
    return payload as RefreshTokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}

/** Decodes an unverified token to read its expiry (used for cookie maxAge). */
export function decodeToken(token: string): DecodedToken {
  const payload = jwt.decode(token);
  if (typeof payload === 'string' || payload === null || !payload.sub || !payload.exp) {
    throw new Error('Unable to decode token');
  }
  return { sub: payload.sub, type: payload.type as 'access' | 'refresh', exp: payload.exp };
}
