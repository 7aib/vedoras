import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';

function limitedApp(limit: number): Express {
  const app = express();
  app.get('/api/v1/flood', createRateLimiter({ limit, windowMs: 60_000 }), (_req, res) => {
    res.json({ success: true });
  });
  return app;
}

describe('Global rate limiting', () => {
  it('allows requests up to the limit and blocks beyond it', async () => {
    const app = limitedApp(5);
    let lastStatus = 0;

    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).get('/api/v1/flood');
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });

  it('returns the standard envelope when rate limited', async () => {
    const app = limitedApp(5);
    for (let i = 0; i < 5; i += 1) {
      await request(app).get('/api/v1/flood');
    }

    const res = await request(app).get('/api/v1/flood');
    expect(res.body.success).toBe(false);
    expect(res.status).toBe(429);
  });
});
