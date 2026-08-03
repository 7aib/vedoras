import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Global rate limiting', () => {
  const app = createApp();

  it('allows requests up to the limit and blocks beyond it', async () => {
    let lastStatus = 0;

    for (let i = 0; i < 101; i += 1) {
      const res = await request(app).get('/api/v1/health/live');
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });

  it('returns the standard envelope when rate limited', async () => {
    const res = await request(app).get('/api/v1/health/live');
    expect(res.body.success).toBe(false);
    expect(res.status).toBe(429);
  });
});
