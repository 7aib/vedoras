export type UserRole = 'user' | 'admin';

/** User shape returned by the API (mirrors server SafeUser). */
export interface SafeUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  phone: string | null;
  location: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseData {
  user: SafeUser;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
}
