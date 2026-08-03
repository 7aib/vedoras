import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCategoryTree } from '../services/category.service.js';

export const listCategoriesHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const tree = await getCategoryTree();
    ApiResponse.send(res, 200, 'Categories retrieved', { categories: tree });
  },
);
