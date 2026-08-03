/**
 * Standard API error with an HTTP status code and optional detail list.
 * Extends the native Error so it can be thrown anywhere and handled centrally.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown[];
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errors: unknown[] = [], isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(429, message);
  }
}
