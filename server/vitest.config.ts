import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/vedoras_test',
      CLIENT_URL: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test_access_secret_at_least_32_characters_long',
      JWT_REFRESH_SECRET: 'test_refresh_secret_at_least_32_characters_long',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '30d',
      JWT_ISSUER: 'vedoras-test',
      COOKIE_SAME_SITE: 'lax',
      AUTH_RATE_LIMIT_MAX: '500',
      RATE_LIMIT_MAX: '500',
    },
  },
});
