import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${metaStr}`;
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
