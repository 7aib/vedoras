import { Schema, model, type InferSchemaType } from 'mongoose';
import type { SafeCategory } from '../types/category.js';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 60,
    },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ parent: 1, order: 1 });

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export interface CategoryLean {
  _id: unknown;
  name: string;
  slug: string;
  parent: unknown;
  order: number;
  active: boolean;
  children?: CategoryLean[];
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeCategory(category: CategoryLean): SafeCategory {
  return {
    _id: String(category._id),
    name: category.name,
    slug: category.slug,
    parent: category.parent ? String(category.parent) : null,
    order: category.order,
    active: category.active,
    children: (category.children ?? []).map(toSafeCategory),
  };
}

export const Category = model('Category', categorySchema);
