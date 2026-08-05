import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app: Express = createApp();

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser(): Promise<{ token: string; userId: string; email: string }> {
  const email = `admin_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app).post('/api/v1/auth/register').send({
    firstName: 'Grace',
    lastName: 'Hopper',
    email,
    password: 'StrongPass123',
  });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user._id as string,
    email,
  };
}

/** Creates an admin directly in the DB, then logs in to get a token. */
async function createAdmin(): Promise<{ token: string; userId: string }> {
  const email = `admin_root_${Math.random().toString(36).slice(2)}@example.com`;
  const doc = await User.create({
    firstName: 'Root',
    lastName: 'Admin',
    email,
    password: 'StrongPass123',
    role: 'admin',
  });
  const res = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'StrongPass123',
  });
  expect(res.status).toBe(200);
  return { token: res.body.data.accessToken as string, userId: String(doc._id) };
}

const baseListing = {
  title: 'Admin dashboard test listing',
  description: 'A listing used to verify admin listing management and moderation.',
  price: 99,
  currency: 'USD',
  category: 'vehicles',
  condition: 'good',
  location: 'Lahore',
};

async function createListing(token: string): Promise<string> {
  const res = await request(app).post('/api/v1/listings').set(auth(token)).send(baseListing);
  expect(res.status).toBe(201);
  return res.body.data._id as string;
}

describe('Admin API', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('authorization', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/admin/stats');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users with 403', async () => {
      const { token } = await registerUser();
      const res = await request(app).get('/api/v1/admin/stats').set(auth(token));
      expect(res.status).toBe(403);
    });
  });

  describe('stats', () => {
    it('returns zeroed counts on an empty database', async () => {
      const admin = await createAdmin();
      const res = await request(app).get('/api/v1/admin/stats').set(auth(admin.token));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        users: { total: 1, admins: 1 },
        listings: { total: 0, active: 0, sold: 0, removed: 0 },
        conversations: 0,
        messages: 0,
        favorites: 0,
      });
    });

    it('reflects users, listings and favorites', async () => {
      const admin = await createAdmin();
      const { token } = await registerUser();
      const listingId = await createListing(token);
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(admin.token));

      const res = await request(app).get('/api/v1/admin/stats').set(auth(admin.token));
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.users.total).toBe(2);
      expect(data.listings).toEqual({ total: 1, active: 1, sold: 0, removed: 0 });
      expect(data.favorites).toBe(1);
    });
  });

  describe('users', () => {
    it('lists users with pagination and a role filter', async () => {
      const admin = await createAdmin();
      const { email } = await registerUser();

      const all = await request(app).get('/api/v1/admin/users').set(auth(admin.token));
      expect(all.status).toBe(200);
      expect(all.body.data.items).toHaveLength(2);
      expect(all.body.data.total).toBe(2);

      const usersOnly = await request(app)
        .get('/api/v1/admin/users')
        .query({ role: 'user' })
        .set(auth(admin.token));
      expect(usersOnly.body.data.items).toHaveLength(1);
      expect(usersOnly.body.data.items[0].email).toBe(email);

      const searched = await request(app)
        .get('/api/v1/admin/users')
        .query({ q: email })
        .set(auth(admin.token));
      expect(searched.body.data.items).toHaveLength(1);
    });

    it('promotes a user to admin and back', async () => {
      const admin = await createAdmin();
      const { token, userId } = await registerUser();

      const promote = await request(app)
        .patch(`/api/v1/admin/users/${userId}/role`)
        .set(auth(admin.token))
        .send({ role: 'admin' });
      expect(promote.status).toBe(200);
      expect(promote.body.data).toEqual({ _id: userId, role: 'admin' });

      const canAccess = await request(app).get('/api/v1/admin/stats').set(auth(token));
      expect(canAccess.status).toBe(200);

      const demote = await request(app)
        .patch(`/api/v1/admin/users/${userId}/role`)
        .set(auth(admin.token))
        .send({ role: 'user' });
      expect(demote.status).toBe(200);
      expect(demote.body.data.role).toBe('user');
    });

    it('returns 404 for an unknown user', async () => {
      const admin = await createAdmin();
      const res = await request(app)
        .patch(`/api/v1/admin/users/${'0'.repeat(24)}/role`)
        .set(auth(admin.token))
        .send({ role: 'admin' });
      expect(res.status).toBe(404);
    });

    it('refuses to demote the last admin', async () => {
      const admin = await createAdmin();
      const res = await request(app)
        .patch(`/api/v1/admin/users/${admin.userId}/role`)
        .set(auth(admin.token))
        .send({ role: 'user' });
      expect(res.status).toBe(400);
    });
  });

  describe('listings', () => {
    it('lists listings of every status, with search and status filters', async () => {
      const admin = await createAdmin();
      const { token } = await registerUser();
      const listingId = await createListing(token);
      await request(app)
        .patch(`/api/v1/listings/${listingId}`)
        .set(auth(token))
        .send({ status: 'sold' });

      const all = await request(app).get('/api/v1/admin/listings').set(auth(admin.token));
      expect(all.status).toBe(200);
      expect(all.body.data.items).toHaveLength(1);
      expect(all.body.data.items[0].status).toBe('sold');

      const activeOnly = await request(app)
        .get('/api/v1/admin/listings')
        .query({ status: 'active' })
        .set(auth(admin.token));
      expect(activeOnly.body.data.total).toBe(0);

      const searched = await request(app)
        .get('/api/v1/admin/listings')
        .query({ q: 'dashboard test' })
        .set(auth(admin.token));
      expect(searched.body.data.total).toBe(1);
    });

    it('moderates listing status as admin', async () => {
      const admin = await createAdmin();
      const { token } = await registerUser();
      const listingId = await createListing(token);

      const removed = await request(app)
        .patch(`/api/v1/admin/listings/${listingId}/status`)
        .set(auth(admin.token))
        .send({ status: 'removed' });
      expect(removed.status).toBe(200);
      expect(removed.body.data.status).toBe('removed');
    });

    it('deletes a listing as admin', async () => {
      const admin = await createAdmin();
      const { token } = await registerUser();
      const listingId = await createListing(token);

      const deleted = await request(app)
        .delete(`/api/v1/admin/listings/${listingId}`)
        .set(auth(admin.token));
      expect(deleted.status).toBe(200);

      const adminList = await request(app).get('/api/v1/admin/listings').set(auth(admin.token));
      expect(adminList.body.data.total).toBe(0);
    });
  });
});
