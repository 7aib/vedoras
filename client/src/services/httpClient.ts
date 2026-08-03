import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage, authBus } from './tokenStorage';
import type { AuthResponseData } from '@/types/auth';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const httpClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attaches the access token when present.
 */
httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Single-flight refresh: concurrent 401s share one refresh call, then the
 * original requests are replayed with the fresh access token.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = httpClient
      .post<AuthResponseData>('/auth/refresh')
      .then((res) => {
        const token = res.data.accessToken;
        tokenStorage.setAccessToken(token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

/**
 * Response interceptor — unwraps the standardized API envelope and transparently
 * refreshes the access token once when a 401 is hit on a protected request.
 */
httpClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const config = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const url = config?.url ?? '';

    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    if (status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return httpClient(config);
      }
      tokenStorage.clear();
      authBus.emit('session-expired');
    }

    return Promise.reject(error);
  },
);

export default httpClient;
