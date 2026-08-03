import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listFavorites, removeFavorite, toggleFavorite } from '../services/favorite.service.js';
import type { ListFavoritesQuery } from '../validators/favorite.validator.js';

export const listFavoritesHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listFavorites(req.userId!, req.query as unknown as ListFavoritesQuery);
    ApiResponse.send(res, 200, 'Favorites retrieved', result);
  },
);

export const addFavoriteHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await toggleFavorite(req.params.listingId as string, req.userId!);
    ApiResponse.send(res, 200, 'Listing favorited', result);
  },
);

export const removeFavoriteHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await removeFavorite(req.params.listingId as string, req.userId!);
    ApiResponse.send(res, 200, 'Listing unfavorited', result);
  },
);
