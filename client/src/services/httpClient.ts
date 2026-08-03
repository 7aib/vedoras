import axios, { type AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const httpClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attaches the access token when present.
 * Token handling/refresh is finalized in the auth milestone.
 */
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vedoras_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor — unwraps the standardized API envelope.
 * The backend always returns { success, message, data }.
 */
httpClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => Promise.reject(error),
);

export default httpClient;
