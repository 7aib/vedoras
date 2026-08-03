import mongoose from 'mongoose';
import logger from './logger.js';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.connection.on('connected', () => {
      logger.info(`🗄️  MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
