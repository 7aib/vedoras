import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import logger from './config/logger.js';

let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    const app = createApp();
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (error) {
    logger.error('Bootstrap failed', { error });
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully...`);
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void bootstrap();
