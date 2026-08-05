import type { FilterQuery } from 'mongoose';
import { User, toSafeUser, type UserLean } from '../models/user.model.js';
import { Listing, toSafeListing, type ListingLean } from '../models/listing.model.js';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { Favorite } from '../models/favorite.model.js';
import { ApiError } from '../utils/ApiError.js';
import type { AdminListingsQuery, AdminUsersQuery } from '../validators/admin.validator.js';
import type { AdminPaginatedListings, AdminStats, PaginatedAdminUsers } from '../types/admin.js';
import type { UserRole } from '../types/user.js';
import type { ListingStatus, SafeListing } from '../types/listing.js';
import { deleteListing, updateListing } from './listing.service.js';

const SELLER_POPULATE = { path: 'seller', select: '-password -refreshTokens' };

export async function getAdminStats(): Promise<AdminStats> {
  const [users, admins, listings, active, sold, removed, conversations, messages, favorites] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'sold' }),
      Listing.countDocuments({ status: 'removed' }),
      Conversation.countDocuments(),
      Message.countDocuments(),
      Favorite.countDocuments(),
    ]);

  return {
    users: { total: users, admins },
    listings: { total: listings, active, sold, removed },
    conversations,
    messages,
    favorites,
  };
}

export async function listAdminUsers(query: AdminUsersQuery): Promise<PaginatedAdminUsers> {
  const filter: FilterQuery<UserLean> = {};
  if (query.role) {
    filter.role = query.role;
  }
  if (query.q) {
    const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
  }

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: (items as unknown as UserLean[]).map(toSafeUser),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ _id: string; role: UserRole }> {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'admin' && role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw ApiError.badRequest('Cannot demote the last admin');
    }
  }

  await User.findByIdAndUpdate(userId, { role }, { runValidators: true });
  return { _id: String(user._id), role };
}

export async function listAdminListings(
  query: AdminListingsQuery,
): Promise<AdminPaginatedListings> {
  const filter: FilterQuery<ListingLean> = {};
  if (query.status) {
    filter.status = query.status;
  }
  if (query.q) {
    filter.title = { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(SELLER_POPULATE)
      .lean(),
    Listing.countDocuments(filter),
  ]);

  return {
    items: (items as unknown as ListingLean[]).map(toSafeListing),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

/** Admin moderation: mark a listing active/sold/removed (reuses owner flow). */
export function updateListingStatus(
  id: string,
  adminId: string,
  status: ListingStatus,
): Promise<SafeListing> {
  return updateListing(id, adminId, 'admin', { status });
}

export async function removeListing(id: string, adminId: string): Promise<void> {
  await deleteListing(id, adminId, 'admin');
}
