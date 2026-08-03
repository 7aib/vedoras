import httpClient from './httpClient';
import type { AuthResponseData, LoginInput, RegisterInput, SafeUser } from '@/types/auth';

/**
 * NOTE: the httpClient response interceptor already unwraps the standard
 * envelope, so the axios generic is the *payload* type (the response `.data`).
 */
export async function loginUser(input: LoginInput): Promise<AuthResponseData> {
  const res = await httpClient.post<AuthResponseData>('/auth/login', input);
  return res.data;
}

export async function registerUser(input: RegisterInput): Promise<AuthResponseData> {
  const res = await httpClient.post<AuthResponseData>('/auth/register', input);
  return res.data;
}

export async function logoutUser(): Promise<void> {
  await httpClient.post<null>('/auth/logout');
}

export async function fetchCurrentUser(): Promise<SafeUser> {
  const res = await httpClient.get<{ user: SafeUser }>('/auth/me');
  return res.data.user;
}
