import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('App bootstrap', () => {
  const app = createApp();

  it('serves the root endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBeDefined();
  });

  it('returns health payload with service metadata', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('vedoras-server');
    expect(res.body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(res.body.data.database.status).toBeDefined();
  });

  it('assigns and echoes a correlation id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('honors a client-provided request id', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'trace-123');
    expect(res.headers['x-request-id']).toBe('trace-123');
  });

  it('returns 404 with the error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
    expect(res.body.errors).toEqual([]);
  });
});
