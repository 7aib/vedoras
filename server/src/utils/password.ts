import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Deterministic fingerprint of a high-entropy token (refresh tokens are
 * signed JWTs), used for storage and lookup. SHA-256 keeps tokens unrecoverable
 * from a DB leak while remaining replay-checkable.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
