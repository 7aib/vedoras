import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import logger from './config/logger.js';

type ServerHandle = ReturnType<ReturnType<typeof createApp>['listen']>;

let server: ServerHandle | undefined;
let shuttingDown = false;

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    const app = createApp();
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (error) {
    logger.error('Bootstrap failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully...`);

  // Force exit if graceful shutdown stalls.
  setTimeout(() => process.exit(exitCode), 10_000).unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDatabase();
    logger.info('Shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  } finally {
    process.exit(exitCode);
  }
}

// --- Process-level safety ---
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception, shutting down', {
    message: error.message,
    stack: error.stack,
  });
  void shutdown('uncaughtException', 1);
});

void bootstrap();
