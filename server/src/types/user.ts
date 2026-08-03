export type UserRole = 'user' | 'admin';

/** User object safe to send to clients — never includes password or tokens. */
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
  createdAt: Date;
  updatedAt: Date;
}
