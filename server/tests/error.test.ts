import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestId } from '../src/middleware/requestId.js';
import { ApiError } from '../src/utils/ApiError.js';
import { notFoundHandler } from '../src/middleware/notFound.js';

function buildErrorApp() {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use(requestId);

  app.get('/api-error', () => {
    throw ApiError.conflict('Resource already exists');
  });

  app.get('/generic', () => {
    throw new Error('boom');
  });

  app.get('/status-error', () => {
    const error = new Error('Upstream failed') as Error & { statusCode: number };
    error.statusCode = 502;
    throw error;
  });

  app.post('/invalid-json', () => {
    void undefined; // handler never reached — body parsing fails first
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('Error handler', () => {
  const app = buildErrorApp();

  it('serializes ApiError into the standard envelope', async () => {
    const res = await request(app).get('/api-error');
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Resource already exists',
      errors: [],
    });
  });

  it('includes the request id in the error body', async () => {
    const res = await request(app).get('/api-error').set('X-Request-Id', 'err-trace');
    expect(res.body.requestId).toBe('err-trace');
  });

  it('hides internals for unexpected errors but keeps 500', async () => {
    const res = await request(app).get('/generic');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });

  it('respects a statusCode carried by third-party errors', async () => {
    const res = await request(app).get('/status-error');
    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Upstream failed');
  });

  it('rejects payloads over the body limit with 413', async () => {
    const res = await request(app)
      .post('/invalid-json')
      .send({ data: 'x'.repeat(2048) });
    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/invalid-json')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid JSON payload');
  });
});
