import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan, { type TokenIndexer } from 'morgan';
import type { Request } from 'express';
import { env } from './config/env.js';
import logger from './config/logger.js';
import v1Routes from './routes/v1/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { ensureUploadDir, uploadDir } from './middleware/upload.js';
import { mountSpa } from './middleware/spa.js';
import { apiRoot } from './utils/constants.js';

// Morgan token exposing the correlation id assigned by requestId middleware.
morgan.token('requestId', (req: Request & TokenIndexer<Request>) => req.id);

const httpLogFormat =
  ':requestId :method :url HTTP/:http-version :status :response-time ms - :remote-addr :user-agent';

export function createApp(): Express {
  const app = express();

  // Local upload fallback directory.
  ensureUploadDir();

  // Trust the first hop when running behind a reverse proxy (env-controlled).
  app.set('trust proxy', env.TRUST_PROXY);

  // --- Correlation ids for every request ---
  app.use(requestId);

  // --- Security headers ---
  app.use(helmet());

  // --- CORS ---
  // In development the server reflects any local origin (Vite may pick a
  // different port); in production it stays locked to the allow-list.
  const allowedOrigins = env.CLIENT_URL.split(',');
  app.use(
    cors({
      origin: env.NODE_ENV === 'development' ? true : allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  );

  // --- Request parsing ---
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // --- Compression ---
  app.use(compression());

  // --- Static uploads (local fallback storage) ---
  app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

  // --- Structured HTTP logging ---
  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan(httpLogFormat, {
        stream: { write: (msg: string) => logger.http(msg.trim()) },
        skip: (req) => req.originalUrl === apiRoot,
      }),
    );
  }

  // --- Global rate limiting ---
  app.use(createRateLimiter());

  // --- API routes (versioned) ---
  app.use(apiRoot, v1Routes);

  // --- Built SPA served same-origin (shared hosting without a reverse proxy) ---
  mountSpa(app, env.CLIENT_DIST);

  // --- Health for the root path (only when no SPA is mounted) ---
  if (!env.CLIENT_DIST) {
    app.get('/', (_req, res) => {
      res.json({ success: true, message: 'Vedoras API', data: { version: env.API_VERSION } });
    });
  }

  // --- 404 + centralized error handling ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
