import { Schema, model } from 'mongoose';

const favoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
  },
  { timestamps: true },
);

// A user can favorite a listing at most once.
favoriteSchema.index({ user: 1, listing: 1 }, { unique: true });
// Fast lookups of a listing's favorited-by sets and a user's favorites list.
favoriteSchema.index({ listing: 1, createdAt: -1 });

export const Favorite = model('Favorite', favoriteSchema);
