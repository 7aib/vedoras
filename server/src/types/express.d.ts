import type { SafeUser } from './user.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id assigned by the requestId middleware. */
      id: string;
      /** Authenticated user id (set by the authenticate middleware). */
      userId: string;
      /** Authenticated user document (set by the authenticate middleware). */
      user: SafeUser;
    }
  }
}

export {};
