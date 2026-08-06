import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { apiRoot } from '../utils/constants.js';

/**
 * Serves the built SPA from `clientDist` so the API and frontend share one
 * origin. Used on shared hosting where the Node process handles every request.
 *
 * Mounted after the API routes: static assets are served directly, unknown
 * deep links fall back to index.html, and API/upload/socket paths keep their
 * normal handlers. No-op when `clientDist` is unset or the build is missing.
 */
export function mountSpa(app: Express, clientDist: string | undefined): void {
  if (!clientDist) return;

  const dist = path.resolve(clientDist);
  if (!existsSync(path.join(dist, 'index.html'))) return;

  app.use(
    express.static(dist, {
      maxAge: '1h',
      index: 'index.html',
      fallthrough: true,
    }),
  );

  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith(apiRoot) ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(dist, 'index.html'));
  });
}
