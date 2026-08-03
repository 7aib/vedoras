import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app = createApp();

const validUser = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'StrongPass123',
};

function refreshCookieHeader(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('vedoras_refresh='));
  if (!cookie) throw new Error('refresh cookie not set');
  return cookie;
}

function refreshCookieValue(cookieHeader: string): string {
  return cookieHeader.split(';')[0] as string;
}

describe('Auth API', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it('registers a user and returns safe data, access token, and an httpOnly cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('ada@example.com');
    expect(res.body.data.user.firstName).toBe('Ada');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.refreshTokens).toBeUndefined();
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.accessToken).toBeTruthy();

    const cookieHeader = refreshCookieHeader(res);
    expect(cookieHeader).toContain('HttpOnly');
    expect(refreshCookieValue(cookieHeader)).toMatch(/^vedoras_refresh=/);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('ada@example.com');
  });

  it('rejects a wrong password with 401', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'WrongPass123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('exposes the current user through the protected /me route', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = register.body.data.accessToken as string;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('ada@example.com');
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects /me with an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  it('refreshes tokens from the httpOnly cookie and rotates the refresh token', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validUser);
    const oldCookie = refreshCookieValue(refreshCookieHeader(register));

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(refreshCookieValue(refreshCookieHeader(res))).not.toBe(oldCookie);

    // The old refresh token is rotated away — replaying it must fail.
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);
  });

  it('logs out and revokes the refresh token', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validUser);
    const cookie = refreshCookieValue(refreshCookieHeader(register));

    const logout = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });

  it('rejects a refresh attempt without a cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});
