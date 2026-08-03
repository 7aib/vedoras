import { User, toSafeUser } from '../models/user.model.js';
import { comparePassword, hashToken } from '../utils/password.js';
import {
  decodeToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import type { LoginInput, RegisterInput } from '../validators/auth.validator.js';
import type { SafeUser } from '../types/user.js';

/** Cap stored refresh tokens per user; oldest are evicted first. */
const MAX_REFRESH_TOKENS = 5;

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

async function addRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const expiresAt = new Date(decodeToken(refreshToken).exp * 1000);
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        refreshTokens: {
          $each: [{ token: hashToken(refreshToken), expiresAt, createdAt: new Date() }],
          $slice: -MAX_REFRESH_TOKENS,
        },
      },
    },
  );
}

async function issueTokens(userId: string): Promise<AuthResult> {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  await addRefreshToken(userId, refreshToken);
  const user = await getUserById(userId);
  return { user, accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const exists = await User.exists({ email: input.email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create(input);
  return issueTokens(String(user._id));
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await comparePassword(input.password, user.password);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  return issueTokens(String(user._id));
}

/** Revokes a specific refresh token (device-scoped logout). */
export async function logoutUser(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  const hashed = hashToken(refreshToken);
  await User.updateOne(
    { refreshTokens: { $elemMatch: { token: hashed } } },
    { $pull: { refreshTokens: { token: hashed } } },
  );
}

/**
 * Rotates a refresh token: validates the stored (hashed) token, issues a new
 * pair, and retires the old token so it can never be replayed.
 */
export async function refreshUserSession(refreshToken?: string): Promise<AuthResult> {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token missing');

  const payload = verifyRefreshToken(refreshToken);
  const hashed = hashToken(refreshToken);

  const user = await User.findOne({ _id: payload.sub, 'refreshTokens.token': hashed });
  if (!user) throw ApiError.unauthorized('Invalid refresh token');

  const entry = user.refreshTokens.find((t) => t.token === hashed);
  if (!entry || entry.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Refresh token expired');
  }

  // Retire the old token so it can never be replayed, then issue a new pair.
  await User.updateOne(
    { _id: payload.sub, 'refreshTokens.token': hashed },
    { $pull: { refreshTokens: { token: hashed } } },
  );

  return issueTokens(String(payload.sub));
}

export async function getUserById(userId: string): Promise<SafeUser> {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound('User not found');
  return toSafeUser(user);
}
