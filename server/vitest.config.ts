import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/vedoras_test',
      CLIENT_URL: 'http://localhost:5173',
    },
  },
});
