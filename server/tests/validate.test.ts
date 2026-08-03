import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app = createApp();

const baseUser = {
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  password: 'StrongPass123',
};

describe('Auth validation', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it('returns 400 with field-level errors for an invalid payload', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: '',
      lastName: 'Hopper',
      email: 'not-an-email',
      password: 'weak',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain('firstName');
    expect(fields).toContain('email');
    expect(fields).toContain('password');
  });

  it('requires a strong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...baseUser, password: 'onlylowercase1' });

    expect(res.status).toBe(400);
    const messages = res.body.errors.map((e: { message: string }) => e.message);
    expect(messages.some((m: string) => m.includes('uppercase'))).toBe(true);
  });

  it('normalizes email to lowercase on registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...baseUser, email: 'GRACE@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('grace@example.com');
  });
});
