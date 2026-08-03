import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Absolute path to the local upload directory (fallback storage). */
export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

export function ensureUploadDir(): void {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = EXTENSIONS[file.mimetype] ?? '';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

/**
 * Accepts up to UPLOAD_MAX_FILES images (jpeg/png/webp), each capped at
 * UPLOAD_MAX_SIZE_MB. Rejects other types with a 400 via the error handler.
 */
export const uploadImages = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest('Only JPEG, PNG and WebP images are allowed'));
  },
});
