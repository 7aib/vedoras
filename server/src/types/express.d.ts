import type { SafeUser } from './user.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id assigned by the requestId middleware. */
      id: string;
      /** Authenticated user id (set by authenticate / optionalAuthenticate). */
      userId?: string;
      /** Authenticated user document (set by authenticate / optionalAuthenticate). */
      user?: SafeUser;
    }
  }
}

export {};
