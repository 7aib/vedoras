import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';

const app: Express = createApp();

interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  children: CategoryNode[];
}

describe('Categories API', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('list tree', () => {
    it('returns the seeded category tree without authentication', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);

      const roots = res.body.data.categories as CategoryNode[];
      const slugs = roots.map((c: CategoryNode) => c.slug);
      expect(slugs).toEqual([
        'vehicles',
        'real-estate',
        'electronics',
        'furniture',
        'jobs',
        'fashion',
      ]);

      for (const root of roots) {
        expect(root.parent).toBeNull();
        expect(root.children.length).toBeGreaterThan(0);
        for (const child of root.children) {
          expect(child.parent).toBe(root._id);
        }
      }
    });

    it('is idempotent across re-seeds', async () => {
      await clearDb();
      const first = await request(app).get('/api/v1/categories');
      const firstRoots = first.body.data.categories as CategoryNode[];

      await clearDb();
      const second = await request(app).get('/api/v1/categories');
      const secondRoots = second.body.data.categories as CategoryNode[];

      expect(secondRoots).toHaveLength(firstRoots.length);
      expect(secondRoots.map((c) => c.slug)).toEqual(firstRoots.map((c) => c.slug));
    });

    it('returns children under their parent with full shape', async () => {
      const res = await request(app).get('/api/v1/categories');
      const vehicles = (res.body.data.categories as CategoryNode[]).find(
        (c) => c.slug === 'vehicles',
      );
      expect(vehicles).toBeDefined();
      expect(vehicles!.children.map((c) => c.slug)).toEqual([
        'vehicles-cars',
        'vehicles-motorcycles',
        'vehicles-boats',
        'vehicles-parts',
      ]);
      for (const child of vehicles!.children) {
        expect(child.name).toBeTruthy();
        expect(child._id).toMatch(/^[0-9a-f]{24}$/i);
      }
    });
  });
});
