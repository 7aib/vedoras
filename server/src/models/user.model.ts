import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { hashPassword } from '../utils/password.js';
import type { SafeUser, UserRole } from '../types/user.js';

export interface RefreshTokenEntry {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false, minlength: 8, maxlength: 72 },
    avatar: { type: String, default: null },
    phone: { type: String, default: null, trim: true },
    location: { type: String, default: null, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    refreshTokens: {
      type: [
        {
          token: { type: String, required: true },
          expiresAt: { type: Date, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Hash the password whenever it changes (create or update).
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hashPassword(this.password);
  return next();
});

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>> & {
  toSafeUser: () => SafeUser;
};

export interface UserLean {
  _id: unknown;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string | null;
  phone?: string | null;
  location?: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Maps a user document (lean or hydrated) to its public, safe shape. */
export function toSafeUser(user: UserLean): SafeUser {
  return {
    _id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role as UserRole,
    avatar: user.avatar ?? null,
    phone: user.phone ?? null,
    location: user.location ?? null,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

userSchema.methods.toSafeUser = function (): SafeUser {
  return toSafeUser(this as unknown as UserLean);
};

export const User = model('User', userSchema);
