import mongoose from 'mongoose';

/** Connects to the in-memory MongoDB started by global-setup. */
export async function connectTestDb(): Promise<void> {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri) throw new Error('TEST_MONGO_URI not set — globalSetup may be missing');
  await mongoose.connect(uri);
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.disconnect();
}

/** Wipes all collections between tests for a clean slate. */
export async function clearDb(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}
