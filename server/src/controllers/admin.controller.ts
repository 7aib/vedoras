import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getAdminStats,
  listAdminListings,
  listAdminUsers,
  removeListing,
  updateListingStatus,
  updateUserRole,
} from '../services/admin.service.js';
import type { AdminListingsQuery, AdminUsersQuery } from '../validators/admin.validator.js';
import type { ListingStatus } from '../types/listing.js';
import type { UserRole } from '../types/user.js';

export const getAdminStatsHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stats = await getAdminStats();
    ApiResponse.send(res, 200, 'Admin stats retrieved', stats);
  },
);

export const listAdminUsersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listAdminUsers(req.query as unknown as AdminUsersQuery);
    ApiResponse.send(res, 200, 'Users retrieved', result);
  },
);

export const updateUserRoleHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await updateUserRole(
      req.params.id as string,
      (req.body as { role: UserRole }).role,
    );
    ApiResponse.send(res, 200, 'User role updated', result);
  },
);

export const listAdminListingsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listAdminListings(req.query as unknown as AdminListingsQuery);
    ApiResponse.send(res, 200, 'Listings retrieved', result);
  },
);

export const updateListingStatusHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const listing = await updateListingStatus(
      req.params.id as string,
      req.userId!,
      (req.body as { status: ListingStatus }).status,
    );
    ApiResponse.send(res, 200, 'Listing status updated', listing);
  },
);

export const removeListingHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await removeListing(req.params.id as string, req.userId!);
    ApiResponse.send(res, 200, 'Listing removed', null);
  },
);
