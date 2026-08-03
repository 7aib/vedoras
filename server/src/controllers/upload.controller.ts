import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deleteStoredImage, storeImage } from '../services/upload.service.js';
import { ApiError } from '../utils/ApiError.js';

export const uploadImagesHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw ApiError.badRequest('No images provided');
    }

    const stored = await Promise.all(files.map((file) => storeImage(file)));
    ApiResponse.send(res, 201, 'Images uploaded', { images: stored.map((image) => image.url) });
  },
);

export const deleteImageHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { url } = req.body as { url: string };
    await deleteStoredImage(url);
    ApiResponse.send(res, 200, 'Image deleted', null);
  },
);
