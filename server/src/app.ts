import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import logger from './config/logger.js';
import v1Routes from './routes/v1/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // --- Security headers ---
  app.use(helmet());

  // --- CORS (allow-list from env) ---
  const allowedOrigins = env.CLIENT_URL.split(',');
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // --- Request parsing ---
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // --- Compression ---
  app.use(compression());

  // --- HTTP logging ---
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
  }

  // --- Global rate limiting ---
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  // --- API routes (versioned) ---
  app.use(`/api/${env.API_VERSION}`, v1Routes);

  // --- Health for the root path ---
  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'Vedoras API', data: { version: env.API_VERSION } });
  });

  // --- 404 + centralized error handling ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
