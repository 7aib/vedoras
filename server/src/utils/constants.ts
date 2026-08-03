import { env } from '../config/env.js';

export const API_PREFIX = '/api';
export const API_VERSION = env.API_VERSION;

/** Root path for the current API version, e.g. `/api/v1`. */
export const apiRoot = `${API_PREFIX}/${API_VERSION}`;

/** Builds a versioned API path from a route path, e.g. `/health` → `/api/v1/health`. */
export function apiPath(path: string): string {
  return path.startsWith('/') ? `${apiRoot}${path}` : `${apiRoot}/${path}`;
}
