import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

interface LogMeta {
  [key: string]: unknown;
  requestId?: string;
}

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const logMeta = meta as LogMeta;
  const requestId = logMeta.requestId ? ` [${logMeta.requestId}]` : '';
  const extras = Object.entries(logMeta)
    .filter(([key]) => key !== 'requestId')
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);
  const metaStr = extras.length ? ` ${extras.join(' ')}` : '';
  return `${ts} ${level}${requestId} ${String(message)}${metaStr}`;
});

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  defaultMeta: { service: 'vedoras-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
  );
}

export default logger;
