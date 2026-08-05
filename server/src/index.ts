import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import logger from './config/logger.js';
import { closeSocket, getSocketServer, initSocket } from './socket/index.js';

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
    initSocket(server);
    // Surface startup failures (e.g. EADDRINUSE during dev restarts) instead
    // of silently wedging the process with no listening socket.
    server.on('error', (error) => {
      logger.error('Failed to start HTTP server', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
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
  const forceExit = setTimeout(() => {
    logger.warn('Graceful shutdown timed out, forcing exit');
    process.exit(exitCode);
  }, 5_000);

  try {
    // The socket server wraps the HTTP server; closing it drains both.
    if (getSocketServer()) {
      await closeSocket();
    } else if (server) {
      // Drop idle keep-alive connections so close() completes promptly on
      // rapid restarts instead of waiting for the keep-alive timeout.
      server.closeIdleConnections();
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }
    await disconnectDatabase();
    logger.info('Shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  } finally {
    clearTimeout(forceExit);
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
