/** Standard success envelope returned by every API endpoint. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

/** Standard error envelope returned by every API endpoint. */
export interface ApiError {
  success: false;
  message: string;
  errors: {
    field?: string;
    message: string;
  }[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface HealthData {
  service: string;
  environment: string;
  uptime: number;
  timestamp: string;
  database: {
    status: string;
    name: string | null;
  };
}
