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

async function registerUser(
  overrides: Record<string, string> = {},
): Promise<{ token: string; userId: string; email: string }> {
  const email = `user_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      firstName: 'Grace',
      lastName: 'Hopper',
      email,
      password: 'StrongPass123',
      ...overrides,
    });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user._id as string,
    email: res.body.data.user.email as string,
  };
}

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

describe('Listings API', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('create', () => {
    it('creates a listing and returns the safe, populated shape', async () => {
      const { token } = await registerUser();
      const res = await request(app).post('/api/v1/listings').set(auth(token)).send(baseListing);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(baseListing.title);
      expect(res.body.data.price).toBe(150);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.views).toBe(0);
      expect(res.body.data.images).toEqual([]);
      expect(res.body.data.seller.firstName).toBe('Grace');
      expect(res.body.data.seller.password).toBeUndefined();
    });

    it('requires authentication', async () => {
      const res = await request(app).post('/api/v1/listings').send(baseListing);
      expect(res.status).toBe(401);
    });

    it('rejects an invalid category', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send({ ...baseListing, category: 'misc' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects a too-short title and a negative price', async () => {
      const { token } = await registerUser();
      const short = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send({ ...baseListing, title: 'abc' });
      expect(short.status).toBe(400);

      const negative = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send({ ...baseListing, price: -5 });
      expect(negative.status).toBe(400);
    });

    it('rejects a non-URL image entry', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send({ ...baseListing, images: ['not-a-url'] });
      expect(res.status).toBe(400);
    });
  });

  describe('read / list', () => {
    async function seedListings(): Promise<void> {
      const { token } = await registerUser();
      const listings = [
        { ...baseListing, title: 'Cheap desk lamp', price: 10, category: 'furniture' },
        { ...baseListing, title: 'Gaming laptop', price: 900, category: 'electronics' },
        { ...baseListing, title: 'Sofa bed', price: 300, category: 'furniture', condition: 'fair' },
      ];
      for (const listing of listings) {
        const res = await request(app).post('/api/v1/listings').set(auth(token)).send(listing);
        expect(res.status).toBe(201);
      }
    }

    it('lists only active listings by default, sorted newest first', async () => {
      await seedListings();
      const res = await request(app).get('/api/v1/listings');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.items).toHaveLength(3);
      expect(res.body.data.pages).toBe(1);
    });

    it('filters by category and condition', async () => {
      await seedListings();
      const res = await request(app).get('/api/v1/listings?category=furniture');
      expect(res.body.data.total).toBe(2);
      expect(
        res.body.data.items.every((l: { category: string }) => l.category === 'furniture'),
      ).toBe(true);

      const fair = await request(app).get('/api/v1/listings?category=furniture&condition=fair');
      expect(fair.body.data.total).toBe(1);
      expect(fair.body.data.items[0].title).toBe('Sofa bed');
    });

    it('filters by price range', async () => {
      await seedListings();
      const res = await request(app).get('/api/v1/listings?minPrice=50&maxPrice=500');
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].title).toBe('Sofa bed');
    });

    it('searches by keyword across title and description', async () => {
      await seedListings();
      const res = await request(app).get('/api/v1/listings?q=laptop');
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].title).toBe('Gaming laptop');
    });

    it('sorts by price ascending', async () => {
      await seedListings();
      const res = await request(app).get('/api/v1/listings?sort=price_asc');
      const prices = res.body.data.items.map((l: { price: number }) => l.price);
      expect(prices).toEqual([10, 300, 900]);
    });

    it('paginates results', async () => {
      await seedListings();
      const res = await request(app).get('/api/v1/listings?limit=2&page=2');
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.page).toBe(2);
    });

    it('rejects an out-of-range limit', async () => {
      const res = await request(app).get('/api/v1/listings?limit=999');
      expect(res.status).toBe(400);
    });

    it('fetches a single listing and increments its view count', async () => {
      const { token } = await registerUser();
      const created = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send(baseListing);
      const id = created.body.data._id as string;

      const first = await request(app).get(`/api/v1/listings/${id}`);
      const second = await request(app).get(`/api/v1/listings/${id}`);

      expect(first.status).toBe(200);
      expect(first.body.data.views).toBe(1);
      expect(second.body.data.views).toBe(2);
    });

    it('returns 404 for an unknown listing and 400 for a malformed id', async () => {
      const missing = await request(app).get('/api/v1/listings/000000000000000000000000');
      expect(missing.status).toBe(404);

      const malformed = await request(app).get('/api/v1/listings/not-an-id');
      expect(malformed.status).toBe(400);
    });
  });

  describe('update', () => {
    it('lets the owner update their listing', async () => {
      const { token } = await registerUser();
      const created = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send(baseListing);
      const id = created.body.data._id as string;

      const res = await request(app)
        .patch(`/api/v1/listings/${id}`)
        .set(auth(token))
        .send({ price: 175 });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(175);
      expect(res.body.data.title).toBe(baseListing.title);
    });

    it('rejects a non-owner update with 403', async () => {
      const { token } = await registerUser();
      const created = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send(baseListing);
      const id = created.body.data._id as string;

      const intruder = await registerUser();
      const res = await request(app)
        .patch(`/api/v1/listings/${id}`)
        .set(auth(intruder.token))
        .send({ price: 1 });

      expect(res.status).toBe(403);
    });

    it('returns 404 when updating an unknown listing', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .patch('/api/v1/listings/000000000000000000000000')
        .set(auth(token))
        .send({ price: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('delete', () => {
    it('lets the owner delete their listing', async () => {
      const { token } = await registerUser();
      const created = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send(baseListing);
      const id = created.body.data._id as string;

      const res = await request(app).delete(`/api/v1/listings/${id}`).set(auth(token));
      expect(res.status).toBe(200);

      const gone = await request(app).get(`/api/v1/listings/${id}`);
      expect(gone.status).toBe(404);
    });

    it('rejects a non-owner delete with 403', async () => {
      const { token } = await registerUser();
      const created = await request(app)
        .post('/api/v1/listings')
        .set(auth(token))
        .send(baseListing);
      const id = created.body.data._id as string;

      const intruder = await registerUser();
      const res = await request(app).delete(`/api/v1/listings/${id}`).set(auth(intruder.token));
      expect(res.status).toBe(403);
    });
  });

  describe('my listings', () => {
    it('returns only the authenticated users listings', async () => {
      const alice = await registerUser();
      const bob = await registerUser();

      await request(app).post('/api/v1/listings').set(auth(alice.token)).send(baseListing);
      await request(app)
        .post('/api/v1/listings')
        .set(auth(bob.token))
        .send({
          ...baseListing,
          title: 'Bob camera body',
        });

      const mine = await request(app).get('/api/v1/listings/mine').set(auth(alice.token));
      expect(mine.status).toBe(200);
      expect(mine.body.data.total).toBe(1);
      expect(mine.body.data.items[0].title).toBe(baseListing.title);

      const anon = await request(app).get('/api/v1/listings/mine');
      expect(anon.status).toBe(401);
    });
  });
});
