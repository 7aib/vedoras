import fs from 'node:fs';
import path from 'node:path';
import { isCloudinaryConfigured, cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadDir } from '../middleware/upload.js';

export interface StoredImage {
  url: string;
  storage: 'cloudinary' | 'local';
  publicId?: string;
}

async function storeCloudinary(filePath: string): Promise<StoredImage> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: env.CLOUDINARY_UPLOAD_FOLDER,
    transformation: [{ width: 1600, crop: 'limit' }],
  });
  await fs.promises.unlink(filePath).catch(() => undefined);
  return { url: result.secure_url, storage: 'cloudinary', publicId: result.public_id };
}

/** Stores an uploaded file — Cloudinary when configured, local disk otherwise. */
export async function storeImage(file: Express.Multer.File): Promise<StoredImage> {
  if (isCloudinaryConfigured()) {
    return storeCloudinary(file.path);
  }
  return { url: `/uploads/${path.basename(file.path)}`, storage: 'local' };
}

function publicIdFromUrl(url: string): string | null {
  const marker = '/image/upload/';
  const index = url.indexOf(marker);
  if (index === -1) return null;
  let rest = url.slice(index + marker.length);
  rest = rest.replace(/^v\d+\//, '');
  rest = rest.replace(/\.[a-z0-9]+$/i, '');
  return rest || null;
}

/** Removes a stored image by its public URL. No-ops for local files that are gone. */
export async function deleteStoredImage(url: string): Promise<void> {
  if (isCloudinaryConfigured() && /^https?:\/\//.test(url)) {
    const publicId = publicIdFromUrl(url);
    if (!publicId) throw ApiError.badRequest('Invalid image URL');
    await cloudinary.uploader.destroy(publicId);
    return;
  }

  if (!url.startsWith('/uploads/')) {
    throw ApiError.badRequest('Invalid image URL');
  }
  const filename = path.basename(url);
  const target = path.join(uploadDir, filename);
  if (path.resolve(target) !== path.join(uploadDir, filename)) {
    throw ApiError.badRequest('Invalid image URL');
  }
  await fs.promises.unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
