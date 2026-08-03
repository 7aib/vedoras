import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { comparePassword, hashPassword, hashToken } from '../../src/utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  decodeToken,
} from '../../src/utils/jwt.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requestId } from '../../src/middleware/requestId.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import type { SafeUser } from '../../src/types/user.js';

const USER_ID = '507f1f77bcf86cd799439011';

describe('Password utils', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('StrongPass123');
    expect(hash).not.toBe('StrongPass123');
    expect(await comparePassword('StrongPass123', hash)).toBe(true);
    expect(await comparePassword('WrongPass', hash)).toBe(false);
  });

  it('produces distinct hashes for the same input (salting)', async () => {
    expect(await hashPassword('SamePass123')).not.toBe(await hashPassword('SamePass123'));
  });

  it('fingerprints refresh tokens deterministically', () => {
    const hash = hashToken('some.refresh.token');
    expect(hash).not.toContain('some.refresh.token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('some.refresh.token')).toBe(hash);
  });
});

describe('JWT utils', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken(USER_ID);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.type).toBe('access');
  });

  it('rejects a refresh token used as an access token', () => {
    const refresh = signRefreshToken(USER_ID);
    expect(() => verifyAccessToken(refresh)).toThrow();
  });

  it('rejects tampered tokens', () => {
    const token = signAccessToken(USER_ID);
    expect(() => verifyAccessToken(`${token}x`)).toThrow();
  });

  it('decodes an unverified token to read its expiry', () => {
    const token = signRefreshToken(USER_ID);
    const decoded = decodeToken(token);
    expect(decoded.sub).toBe(USER_ID);
    expect(decoded.type).toBe('refresh');
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe('authorize middleware', () => {
  function makeApp(role: SafeUser['role']) {
    const app = express();
    app.use(requestId);
    app.get(
      '/admin-only',
      (req, _res, next) => {
        req.user = {
          _id: USER_ID,
          firstName: 'T',
          lastName: 'User',
          email: 't@example.com',
          role,
          avatar: null,
          phone: null,
          location: null,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        next();
      },
      authorize('admin'),
      (_req, res) => {
        res.json({ ok: true });
      },
    );
    app.use(errorHandler);
    return app;
  }

  it('allows matching roles through', async () => {
    const res = await request(makeApp('admin')).get('/admin-only');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('blocks users without the required role', async () => {
    const res = await request(makeApp('user')).get('/admin-only');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
