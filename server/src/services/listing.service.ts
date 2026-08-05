import type { FilterQuery } from 'mongoose';
import { Listing, toSafeListing, type ListingLean } from '../models/listing.model.js';
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from '../validators/listing.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { LISTING_CONDITIONS } from '../utils/constants.js';
import type { UserRole } from '../types/user.js';
import type {
  ListingFacets,
  ListingStatus,
  PaginatedListings,
  SafeListing,
} from '../types/listing.js';
import { getCategoryPath } from './category.service.js';
import { enrichListings } from './favorite.service.js';
import { notifyFavoritersOfListingStatus } from './notification.service.js';

const SELLER_POPULATE = { path: 'seller', select: '-password -refreshTokens' };

export interface ListListingsParams {
  query: ListListingsQuery;
  status?: ListingStatus;
  /** When present, sets `isFavorited` on returned listings (M8). */
  userId?: string;
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

async function enrichSingle(listing: ListingLean, userId?: string): Promise<SafeListing> {
  const [safe] = await enrichListings([toSafeListing(listing)], userId);
  return safe!;
}

export async function createListing(
  input: CreateListingInput,
  userId: string,
): Promise<SafeListing> {
  const categoryPath = await resolveCategory(input.category);
  const listing = await Listing.create({ ...input, categoryPath, seller: userId });
  return populateSafe(listing.toObject() as unknown as ListingLean);
}

export async function getListingById(id: string, userId?: string): Promise<SafeListing> {
  const listing = await Listing.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
    .populate(SELLER_POPULATE)
    .lean();

  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  return enrichSingle(listing as unknown as ListingLean, userId);
}

export async function listListings({
  query,
  status,
  userId,
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

  const conditions = parseConditions(query.condition);
  if (conditions.length > 0) {
    filter.condition = { $in: conditions };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }

  // Full-text search (M7): relevance-ranked via the text index on
  // title/description. Combined with any of the filters above via AND.
  const q = query.q;
  const useText = q !== undefined && q !== '';
  if (useText) {
    filter.$text = { $search: q as string, $caseSensitive: false };
  }

  const sort: Record<string, 1 | -1> | { score: { $meta: 'textScore' } } =
    query.sort === 'price_asc'
      ? { price: 1 }
      : query.sort === 'price_desc'
        ? { price: -1 }
        : query.sort === 'relevance' && useText
          ? { score: { $meta: 'textScore' } }
          : { createdAt: -1 };

  const projection = useText ? { score: { $meta: 'textScore' as const } } : {};

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [items, total, facets] = await Promise.all([
    Listing.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(SELLER_POPULATE)
      .lean(),
    Listing.countDocuments(filter),
    buildFacets(filter),
  ]);

  const enrichedItems = await enrichListings(
    (items as unknown as ListingLean[]).map(toSafeListing),
    userId,
  );

  return {
    items: enrichedItems,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    facets,
  };
}

/** Splits and validates the comma-separated condition filter. */
function parseConditions(raw: string | undefined): string[] {
  const conditions = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const invalid = conditions.filter(
    (condition) => !LISTING_CONDITIONS.includes(condition as (typeof LISTING_CONDITIONS)[number]),
  );
  if (invalid.length > 0) {
    throw ApiError.badRequest(`Invalid condition(s): ${invalid.join(', ')}`);
  }
  return conditions;
}

interface FacetBucket {
  _id: string;
  count: number;
}

interface FacetPriceBucket {
  min: number;
  max: number;
}

interface FacetsAggregation {
  categories: FacetBucket[];
  conditions: FacetBucket[];
  price: FacetPriceBucket[];
}

/**
 * Computes facet counts for the *current* search/filters, ignoring the
 * category/condition/price dimensions themselves so each facet reflects the
 * rest of the query. Price bounds are global across matching listings.
 */
async function buildFacets(baseFilter: FilterQuery<ListingLean>): Promise<ListingFacets> {
  const [result] = await Listing.aggregate<FacetsAggregation>([
    { $match: baseFilter },
    {
      $facet: {
        categories: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        conditions: [
          { $group: { _id: '$condition', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
      },
    },
  ]);

  const empty: FacetsAggregation = { categories: [], conditions: [], price: [] };
  const facetsResult = result ?? empty;

  return {
    categories: facetsResult.categories.map((bucket) => ({
      slug: bucket._id,
      count: bucket.count,
    })),
    conditions: facetsResult.conditions.map((bucket) => ({
      condition: bucket._id,
      count: bucket.count,
    })),
    price: facetsResult.price[0]
      ? { min: facetsResult.price[0].min, max: facetsResult.price[0].max }
      : { min: null, max: null },
  };
}

/** Returns recent active listings in the same top-level category. */
export async function getRelatedListings(
  id: string,
  limit = 4,
  userId?: string,
): Promise<SafeListing[]> {
  const listing = await Listing.findById(id).select('category categoryPath').lean();
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  const topCategory = (listing.categoryPath as string[] | undefined)?.[0] ?? listing.category;

  const items = await Listing.find({
    status: 'active',
    _id: { $ne: id },
    categoryPath: topCategory,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate(SELLER_POPULATE)
    .lean();

  return enrichListings((items as unknown as ListingLean[]).map(toSafeListing), userId);
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
    items: await enrichListings((items as unknown as ListingLean[]).map(toSafeListing), userId),
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

  const previousStatus = listing.status as ListingStatus;

  const updated = await Listing.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate(SELLER_POPULATE)
    .lean();
  if (!updated) {
    throw ApiError.notFound('Listing not found');
  }

  const nextStatus = updated.status as ListingStatus;
  if (previousStatus !== nextStatus && (nextStatus === 'sold' || nextStatus === 'removed')) {
    await notifyFavoritersOfListingStatus(id, updated.title, userId, nextStatus);
  }

  return enrichSingle(updated as unknown as ListingLean, userId);
}

export async function deleteListing(id: string, userId: string, role: UserRole): Promise<void> {
  const listing = await Listing.findById(id).lean();
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  assertOwnerOrAdmin(listing, userId, role);
  await Listing.findByIdAndDelete(id);
}
