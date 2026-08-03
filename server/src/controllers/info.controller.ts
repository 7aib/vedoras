import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAppVersion } from '../utils/appInfo.js';
import { API_PREFIX } from '../utils/constants.js';

/** Service metadata and public surface area, served at the API root. */
export const apiInfo = asyncHandler(async (_req: Request, res: Response) => {
  ApiResponse.send(res, 200, 'Vedoras API', {
    name: 'Vedoras API',
    version: getAppVersion(),
    environment: env.NODE_ENV,
    apiPrefix: API_PREFIX,
    currentVersion: env.API_VERSION,
    endpoints: {
      health: '/api/v1/health',
      liveness: '/api/v1/health/live',
      readiness: '/api/v1/health/ready',
    },
    docs: '/docs', // placeholder — API documentation milestone
  });
});
