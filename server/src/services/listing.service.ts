import type { FilterQuery } from 'mongoose';
import { Listing, toSafeListing, type ListingLean } from '../models/listing.model.js';
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from '../validators/listing.validator.js';
import { ApiError } from '../utils/ApiError.js';
import type { UserRole } from '../types/user.js';
import type { ListingStatus, PaginatedListings, SafeListing } from '../types/listing.js';
import { getCategoryPath } from './category.service.js';

const SELLER_POPULATE = { path: 'seller', select: '-password -refreshTokens' };

export interface ListListingsParams {
  query: ListListingsQuery;
  status?: ListingStatus;
}

async function resolveCategory(category: string): Promise<string[]> {
  const path = await getCategoryPath(category);
  if (!path) {
    throw ApiError.badRequest(`Unknown category: ${category}`);
  }
  return path;
}

function sellerIdOf(seller: unknown): string {
  if (typeof seller === 'object' && seller !== null && '_id' in seller) {
    return String((seller as { _id: unknown })._id);
  }
  return String(seller);
}

function assertOwnerOrAdmin(listing: { seller: unknown }, userId: string, role: UserRole): void {
  if (sellerIdOf(listing.seller) !== userId && role !== 'admin') {
    throw ApiError.forbidden('You can only manage your own listings');
  }
}

async function populateSafe(listing: ListingLean): Promise<SafeListing> {
  const populated = await Listing.populate(listing, SELLER_POPULATE);
  return toSafeListing(populated as unknown as ListingLean);
}

export async function createListing(
  input: CreateListingInput,
  userId: string,
): Promise<SafeListing> {
  const categoryPath = await resolveCategory(input.category);
  const listing = await Listing.create({ ...input, categoryPath, seller: userId });
  return populateSafe(listing.toObject() as unknown as ListingLean);
}

export async function getListingById(id: string): Promise<SafeListing> {
  const listing = await Listing.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
    .populate(SELLER_POPULATE)
    .lean();

  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  return toSafeListing(listing as unknown as ListingLean);
}

export async function listListings({
  query,
  status,
}: ListListingsParams): Promise<PaginatedListings> {
  const filter: FilterQuery<ListingLean> = {};

  if (status) {
    filter.status = status;
  } else if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = 'active';
  }

  if (query.category) {
    filter.$or = [{ category: query.category }, { categoryPath: query.category }];
  }
  if (query.condition) filter.condition = query.condition;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }

  if (query.q) {
    const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const sort: Record<string, 1 | -1> =
    query.sort === 'price_asc'
      ? { price: 1 }
      : query.sort === 'price_desc'
        ? { price: -1 }
        : { createdAt: -1 };

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Listing.find(filter).sort(sort).skip(skip).limit(limit).populate(SELLER_POPULATE).lean(),
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

export async function listMyListings(
  userId: string,
  query: ListListingsQuery,
): Promise<PaginatedListings> {
  const filter: FilterQuery<ListingLean> = { seller: userId };
  if (query.status) filter.status = query.status;

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

export async function updateListing(
  id: string,
  userId: string,
  role: UserRole,
  input: UpdateListingInput,
): Promise<SafeListing> {
  const listing = await Listing.findById(id).lean();
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  assertOwnerOrAdmin(listing, userId, role);

  const updates: UpdateListingInput & { categoryPath?: string[] } = { ...input };
  if (input.category) {
    updates.categoryPath = await resolveCategory(input.category);
  }

  const updated = await Listing.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate(SELLER_POPULATE)
    .lean();
  if (!updated) {
    throw ApiError.notFound('Listing not found');
  }
  return toSafeListing(updated as unknown as ListingLean);
}

export async function deleteListing(id: string, userId: string, role: UserRole): Promise<void> {
  const listing = await Listing.findById(id).lean();
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  assertOwnerOrAdmin(listing, userId, role);
  await Listing.findByIdAndDelete(id);
}
