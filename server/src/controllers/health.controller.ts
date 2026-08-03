import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1
      ? 'connected'
      : dbState === 2
        ? 'connecting'
        : dbState === 3
          ? 'disconnecting'
          : 'disconnected';

  ApiResponse.send(res, 200, 'Service is healthy', {
    service: 'vedoras-server',
    environment: process.env.NODE_ENV ?? 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: { status: dbStatus, name: mongoose.connection.name || null },
  });
});
