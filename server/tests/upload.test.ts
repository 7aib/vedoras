import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';
import { uploadDir } from '../src/middleware/upload.js';

const app: Express = createApp();

async function registerUser(): Promise<{ token: string }> {
  const email = `upload_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ firstName: 'Linus', lastName: 'Torvalds', email, password: 'StrongPass123' });
  expect(res.status).toBe(201);
  return { token: res.body.data.accessToken as string };
}

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

function localPaths(urls: string[]): string[] {
  return urls.map((url) => path.join(uploadDir, path.basename(url)));
}

describe('Uploads API', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('upload images', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/images')
        .attach('images', Buffer.from('not-an-image'), {
          filename: 'photo.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(401);
    });

    it('stores images to local storage and returns public urls', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/v1/uploads/images')
        .set(auth(token))
        .attach('images', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .attach('images', Buffer.from('jpeg-bytes'), {
          filename: 'photo2.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(201);
      const urls = res.body.data.images as string[];
      expect(urls).toHaveLength(2);

      for (const url of urls) {
        expect(url).toMatch(/^\/uploads\//);
        expect(fs.existsSync(path.join(uploadDir, path.basename(url)))).toBe(true);
      }

      const served = await request(app).get(urls[0]!);
      expect(served.status).toBe(200);

      for (const file of localPaths(urls)) {
        await fs.promises.unlink(file).catch(() => undefined);
      }
    });

    it('rejects non-image files', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/v1/uploads/images')
        .set(auth(token))
        .attach('images', Buffer.from('<svg></svg>'), {
          filename: 'vector.svg',
          contentType: 'image/svg+xml',
        });
      expect(res.status).toBe(400);
    });

    it('rejects an empty upload', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/v1/uploads/images')
        .set(auth(token))
        .field('foo', 'bar');
      expect(res.status).toBe(400);
    });
  });

  describe('delete image', () => {
    it('deletes a locally stored image', async () => {
      const { token } = await registerUser();
      const uploaded = await request(app)
        .post('/api/v1/uploads/images')
        .set(auth(token))
        .attach('images', Buffer.from('png-bytes'), {
          filename: 'photo.png',
          contentType: 'image/png',
        });
      expect(uploaded.status).toBe(201);
      const url = (uploaded.body.data.images as string[])[0]!;
      const file = path.join(uploadDir, path.basename(url));
      expect(fs.existsSync(file)).toBe(true);

      const res = await request(app)
        .delete('/api/v1/uploads/images')
        .set(auth(token))
        .send({ url });
      expect(res.status).toBe(200);
      expect(fs.existsSync(file)).toBe(false);
    });

    it('requires authentication and a valid url', async () => {
      const anon = await request(app)
        .delete('/api/v1/uploads/images')
        .send({ url: '/uploads/whatever.png' });
      expect(anon.status).toBe(401);

      const { token } = await registerUser();
      const bad = await request(app)
        .delete('/api/v1/uploads/images')
        .set(auth(token))
        .send({ url: 'https://evil.example.com/file.png' });
      expect(bad.status).toBe(400);

      const missing = await request(app)
        .delete('/api/v1/uploads/images')
        .set(auth(token))
        .send({ url: '/uploads/does-not-exist.png' });
      expect(missing.status).toBe(200);
    });
  });
});
