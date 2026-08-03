import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createListing,
  deleteListing,
  getListingById,
  listListings,
  listMyListings,
  updateListing,
} from '../services/listing.service.js';
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from '../validators/listing.validator.js';

export const createListingHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const listing = await createListing(req.body as CreateListingInput, req.userId);
    ApiResponse.send(res, 201, 'Listing created', listing);
  },
);

export const getListingHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const listing = await getListingById(req.params.id as string);
    ApiResponse.send(res, 200, 'Listing retrieved', listing);
  },
);

export const listListingsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listListings({ query: req.query as unknown as ListListingsQuery });
    ApiResponse.send(res, 200, 'Listings retrieved', result);
  },
);

export const listMyListingsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listMyListings(req.userId, req.query as unknown as ListListingsQuery);
    ApiResponse.send(res, 200, 'My listings retrieved', result);
  },
);

export const updateListingHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const listing = await updateListing(
      req.params.id as string,
      req.userId,
      req.user.role,
      req.body as UpdateListingInput,
    );
    ApiResponse.send(res, 200, 'Listing updated', listing);
  },
);

export const deleteListingHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await deleteListing(req.params.id as string, req.userId, req.user.role);
    ApiResponse.send(res, 200, 'Listing deleted', null);
  },
);
