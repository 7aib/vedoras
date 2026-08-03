declare global {
  namespace Express {
    interface Request {
      /** Correlation id assigned by the requestId middleware. */
      id: string;
    }
  }
}

export {};
