import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app: Express = createApp();

const baseListing = {
  title: 'Vintage bicycle for sale',
  description: 'A well maintained vintage road bike in great shape, recently serviced.',
  price: 150,
  currency: 'USD',
  category: 'vehicles',
  condition: 'good',
  location: 'Lisbon',
};

async function registerUser(): Promise<{ token: string; userId: string }> {
  const email = `fav_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app).post('/api/v1/auth/register').send({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email,
    password: 'StrongPass123',
  });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user._id as string,
  };
}

async function createListing(token: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send(baseListing);
  expect(res.status).toBe(201);
  return res.body.data._id as string;
}

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

describe('Favorites API', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('toggle', () => {
    it('adds and removes a favorite idempotently via PUT', async () => {
      const { token } = await registerUser();
      const listingId = await createListing(token);

      const add = await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(token));
      expect(add.status).toBe(200);
      expect(add.body.data).toEqual({
        listingId,
        isFavorited: true,
        favoriteCount: 1,
      });

      const remove = await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(token));
      expect(remove.body.data).toEqual({
        listingId,
        isFavorited: false,
        favoriteCount: 0,
      });

      const reAdd = await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(token));
      expect(reAdd.body.data.isFavorited).toBe(true);
      expect(reAdd.body.data.favoriteCount).toBe(1);
    });

    it('removes a favorite via DELETE', async () => {
      const { token } = await registerUser();
      const listingId = await createListing(token);

      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(token));
      const res = await request(app).delete(`/api/v1/favorites/${listingId}`).set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        listingId,
        isFavorited: false,
        favoriteCount: 0,
      });
    });

    it('is a no-op when DELETE targets a non-favorited listing', async () => {
      const { token } = await registerUser();
      const listingId = await createListing(token);
      const res = await request(app).delete(`/api/v1/favorites/${listingId}`).set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.isFavorited).toBe(false);
    });

    it('returns 404 for an unknown listing', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .put('/api/v1/favorites/000000000000000000000000')
        .set(auth(token));
      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed listing id', async () => {
      const { token } = await registerUser();
      const res = await request(app).put('/api/v1/favorites/not-an-id').set(auth(token));
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const { token } = await registerUser();
      const listingId = await createListing(token);
      const putRes = await request(app).put(`/api/v1/favorites/${listingId}`);
      const deleteRes = await request(app).delete(`/api/v1/favorites/${listingId}`);
      expect(putRes.status).toBe(401);
      expect(deleteRes.status).toBe(401);
    });

    it('counts one favorite per user across multiple users', async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      const listingId = await createListing(alice.token);

      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(alice.token));
      const bobAdd = await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(bob.token));

      expect(bobAdd.body.data.favoriteCount).toBe(2);
    });
  });

  describe('list', () => {
    it('lists the users favorites newest first with populated listings', async () => {
      const { token } = await registerUser();
      const firstId = await createListing(token);
      const secondId = await createListing(token);

      await request(app).put(`/api/v1/favorites/${firstId}`).set(auth(token));
      await request(app).put(`/api/v1/favorites/${secondId}`).set(auth(token));

      const res = await request(app).get('/api/v1/favorites').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.pages).toBe(1);
      const items = res.body.data.items;
      expect(items.map((l: { _id: string }) => l._id)).toEqual([secondId, firstId]);
      expect(items[0].favoriteCount).toBe(1);
      expect(items[0].isFavorited).toBe(true);
      expect(items[0].seller.firstName).toBe('Ada');
      expect(items[0].seller.password).toBeUndefined();
    });

    it('paginates favorites', async () => {
      const { token } = await registerUser();
      const ids: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        const id = await createListing(token);
        ids.push(id);
        await request(app).put(`/api/v1/favorites/${id}`).set(auth(token));
      }

      const res = await request(app).get('/api/v1/favorites?limit=2&page=2').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.items[0]._id).toBe(ids[0]);
    });

    it('returns an empty list for a user without favorites', async () => {
      const { token } = await registerUser();
      const res = await request(app).get('/api/v1/favorites').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });

    it('does not list another users favorites', async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      const listingId = await createListing(bob.token);

      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(bob.token));
      const res = await request(app).get('/api/v1/favorites').set(auth(alice.token));
      expect(res.body.data.items).toEqual([]);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/favorites');
      expect(res.status).toBe(401);
    });
  });

  describe('listing payload enrichment', () => {
    it('exposes favoriteCount to anonymous readers', async () => {
      const { token } = await registerUser();
      const listingId = await createListing(token);
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(token));

      const res = await request(app).get('/api/v1/listings');
      expect(res.status).toBe(200);
      const item = res.body.data.items.find((l: { _id: string }) => l._id === listingId);
      expect(item.favoriteCount).toBe(1);
      expect(item.isFavorited).toBeUndefined();
    });

    it('sets isFavorited per authenticated user on list and detail reads', async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      const listingId = await createListing(alice.token);
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(alice.token));

      const bobList = await request(app).get('/api/v1/listings').set(auth(bob.token));
      const bobItem = bobList.body.data.items.find((l: { _id: string }) => l._id === listingId);
      expect(bobItem.isFavorited).toBe(false);
      expect(bobItem.favoriteCount).toBe(1);

      const aliceList = await request(app).get('/api/v1/listings').set(auth(alice.token));
      const aliceItem = aliceList.body.data.items.find((l: { _id: string }) => l._id === listingId);
      expect(aliceItem.isFavorited).toBe(true);

      const aliceDetail = await request(app)
        .get(`/api/v1/listings/${listingId}`)
        .set(auth(alice.token));
      expect(aliceDetail.body.data.isFavorited).toBe(true);
      expect(aliceDetail.body.data.favoriteCount).toBe(1);
    });

    it('flags favorites on related listings for the requesting user', async () => {
      const { token } = await registerUser();
      const first = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send({ ...baseListing, title: 'Leather couch', category: 'furniture' });
      const second = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send({ ...baseListing, title: 'Oak table', category: 'furniture' });
      const secondId = second.body.data._id as string;
      await request(app).put(`/api/v1/favorites/${secondId}`).set(auth(token));

      const res = await request(app)
        .get(`/api/v1/listings/${first.body.data._id}/related`)
        .set(auth(token));
      expect(res.status).toBe(200);
      const faved = res.body.data.find((l: { _id: string }) => l._id === secondId);
      expect(faved.isFavorited).toBe(true);
      expect(faved.favoriteCount).toBe(1);
    });

    it('treats an invalid/expired token as anonymous on public reads', async () => {
      const { token } = await registerUser();
      const listingId = await createListing(token);

      const res = await request(app).get('/api/v1/listings').set(auth('not-a-real-token'));
      expect(res.status).toBe(200);
      const item = res.body.data.items.find((l: { _id: string }) => l._id === listingId);
      expect(item.isFavorited).toBeUndefined();
    });
  });
});
