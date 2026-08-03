import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAppVersion } from '../utils/appInfo.js';

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function dbStatus(): { status: string; name: string | null } {
  const state = mongoose.connection.readyState;
  return {
    status: DB_STATES[state] ?? 'unknown',
    name: mongoose.connection.name ?? null,
  };
}

/** Full health check: service, process, and database status. */
export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  ApiResponse.send(res, 200, 'Service is healthy', {
    service: 'vedoras-server',
    version: getAppVersion(),
    environment: env.NODE_ENV,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      },
    },
    database: dbStatus(),
  });
});

/** Liveness probe — the process is up and serving. */
export const liveness = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Alive',
    data: { timestamp: new Date().toISOString() },
  });
};

/** Readiness probe — 200 only when required dependencies are available. */
export const readiness = (_req: Request, res: Response): void => {
  const ready = mongoose.connection.readyState === 1;
  const status = ready ? 200 : 503;
  res.status(status).json({
    success: ready,
    message: ready ? 'Ready' : 'Not ready',
    data: { database: dbStatus() },
  });
};
