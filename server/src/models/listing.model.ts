import { Schema, model, type InferSchemaType } from 'mongoose';
import type { SafeListing } from '../types/listing.js';
import { LISTING_CONDITIONS } from '../utils/constants.js';
import { toSafeUser, type UserLean } from './user.model.js';

const listingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    price: { type: Number, required: true, min: 0, max: 1_000_000_000 },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    category: { type: String, required: true, index: true },
    categoryPath: { type: [String], required: true, default: [], index: true },
    condition: { type: String, enum: LISTING_CONDITIONS, default: 'good' },
    location: { type: String, default: null, trim: true, maxlength: 100 },
    images: { type: [String], default: [], maxlength: 10 },
    status: { type: String, enum: ['active', 'sold', 'removed'], default: 'active', index: true },
    views: { type: Number, default: 0, min: 0 },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

listingSchema.index({ category: 1, status: 1, createdAt: -1 });
listingSchema.index({ status: 1, createdAt: -1 });

export type ListingDocument = InferSchemaType<typeof listingSchema>;

export interface ListingLean {
  _id: unknown;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  categoryPath: string[];
  condition: string;
  location: string | null;
  images: string[];
  status: string;
  views: number;
  seller: UserLean;
  createdAt: Date;
  updatedAt: Date;
}

/** Maps a listing document (lean, seller populated) to its public shape. */
export function toSafeListing(listing: ListingLean): SafeListing {
  return {
    _id: String(listing._id),
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    category: listing.category as SafeListing['category'],
    categoryPath: listing.categoryPath,
    condition: listing.condition as SafeListing['condition'],
    location: listing.location ?? null,
    images: listing.images,
    status: listing.status as SafeListing['status'],
    views: listing.views,
    seller: toSafeUser(listing.seller),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export const Listing = model('Listing', listingSchema);
