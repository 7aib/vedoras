import type { SafeUser } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'vedoras_access_token';
const USER_KEY = 'vedoras_user';

export type AuthBusEvent = 'session-expired';

type AuthBusListener = (event: AuthBusEvent) => void;

const listeners = new Set<AuthBusListener>();

/**
 * Tiny pub/sub used to notify the app when the session is no longer
 * recoverable (refresh failed), so it can redirect to the login page.
 */
export const authBus = {
  emit(event: AuthBusEvent) {
    listeners.forEach((listener) => listener(event));
  },
  subscribe(listener: AuthBusListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Persists the access token (and a cached copy of the user) outside the
 * Redux store so the axios interceptors can read it without React context.
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getUser(): SafeUser | null {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SafeUser;
    } catch {
      return null;
    }
  },
  setUser(user: SafeUser) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};
