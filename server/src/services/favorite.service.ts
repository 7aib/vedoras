import { Types } from 'mongoose';
import { Favorite } from '../models/favorite.model.js';
import { Listing, toSafeListing, type ListingLean } from '../models/listing.model.js';
import type { FavoriteToggleResult, PaginatedListings, SafeListing } from '../types/listing.js';
import type { ListFavoritesQuery } from '../validators/favorite.validator.js';
import { ApiError } from '../utils/ApiError.js';

const SELLER_POPULATE = { path: 'seller', select: '-password -refreshTokens' };

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.map((id) => new Types.ObjectId(id));
}

/** Toggles a favorite: adds when absent, removes when present (idempotent). */
export async function toggleFavorite(
  listingId: string,
  userId: string,
): Promise<FavoriteToggleResult> {
  const listing = await Listing.findById(listingId).select('_id').lean();
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  const existing = await Favorite.findOneAndDelete({ user: userId, listing: listingId });
  if (!existing) {
    await Favorite.create({ user: userId, listing: listingId });
  }
  const favoriteCount = await Favorite.countDocuments({ listing: listingId });
  return { listingId, isFavorited: !existing, favoriteCount };
}

/** Removes a favorite without creating one (no-op when not favorited). */
export async function removeFavorite(
  listingId: string,
  userId: string,
): Promise<FavoriteToggleResult> {
  const listing = await Listing.findById(listingId).select('_id').lean();
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  await Favorite.deleteOne({ user: userId, listing: listingId });
  const favoriteCount = await Favorite.countDocuments({ listing: listingId });
  return { listingId, isFavorited: false, favoriteCount };
}

/** Paginated list of the user's favorited listings, newest favorites first. */
export async function listFavorites(
  userId: string,
  query: ListFavoritesQuery,
): Promise<PaginatedListings> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    Favorite.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'listing', populate: SELLER_POPULATE })
      .lean(),
    Favorite.countDocuments({ user: userId }),
  ]);

  const items = (favorites as unknown as { listing: ListingLean }[]).map((favorite) =>
    toSafeListing(favorite.listing),
  );

  const counts = await getFavoriteCounts(items.map((item) => item._id));
  for (const item of items) {
    item.favoriteCount = counts[item._id] ?? 0;
    item.isFavorited = true;
  }

  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

/** Count of favorites per listing id (empty list → empty map). */
export async function getFavoriteCounts(listingIds: string[]): Promise<Record<string, number>> {
  if (listingIds.length === 0) {
    return {};
  }
  const rows = await Favorite.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { listing: { $in: toObjectIds(listingIds) } } },
    { $group: { _id: '$listing', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

/** Set of listing ids favorited by the given user (for isFavorited flags). */
export async function getFavoriteIdsByUser(
  userId: string,
  listingIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) {
    return new Set();
  }
  const favorites = await Favorite.find({ user: userId, listing: { $in: toObjectIds(listingIds) } })
    .select('listing')
    .lean();
  return new Set(favorites.map((favorite) => String(favorite.listing)));
}

/**
 * Attaches favoriteCount (always) and isFavorited (when a user id is given)
 * to a set of safe listings in a single round-trip per dimension.
 */
export async function enrichListings(
  items: SafeListing[],
  userId?: string,
): Promise<SafeListing[]> {
  if (items.length === 0) {
    return items;
  }
  const ids = items.map((item) => item._id);
  const counts = await getFavoriteCounts(ids);
  for (const item of items) {
    item.favoriteCount = counts[item._id] ?? 0;
  }
  if (userId) {
    const favoriteIds = await getFavoriteIdsByUser(userId, ids);
    for (const item of items) {
      item.isFavorited = favoriteIds.has(item._id);
    }
  }
  return items;
}
