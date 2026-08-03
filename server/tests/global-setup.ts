import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

/**
 * Boots an in-memory MongoDB for the whole test run and exposes its URI
 * through TEST_MONGO_URI. Shuts it down after all test files finish.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  mongod = await MongoMemoryServer.create();
  process.env.TEST_MONGO_URI = mongod.getUri();
  return async () => {
    await mongod?.stop();
  };
}
