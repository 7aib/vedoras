import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Health probes & API info', () => {
  const app = createApp();

  it('GET /api/v1 exposes service metadata', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Vedoras API');
    expect(res.body.data.currentVersion).toBe('v1');
    expect(res.body.data.endpoints.health).toBe('/api/v1/health');
  });

  it('liveness probe always reports alive', async () => {
    const res = await request(app).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('readiness probe reports not ready without a database', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.database.status).toBeDefined();
  });

  it('health check includes process metadata', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data.process).toBeDefined();
    expect(res.body.data.process.pid).toBeGreaterThan(0);
    expect(res.body.data.environment).toBe('test');
  });
});
