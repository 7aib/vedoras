import type { Response } from 'express';

/** Standard success envelope: { success: true, message, data } */
export class ApiResponse<T = unknown> {
  public readonly success = true;
  public readonly message: string;
  public readonly data: T;

  constructor(message: string, data: T) {
    this.message = message;
    this.data = data;
  }

  static send<T>(res: Response, statusCode: number, message: string, data: T): Response {
    return res.status(statusCode).json(new ApiResponse(message, data));
  }
}
