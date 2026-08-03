import { Category, toSafeCategory, type CategoryLean } from '../models/category.model.js';
import type { SafeCategory } from '../types/category.js';

interface SeedChild {
  slug: string;
  name: string;
}
interface SeedCategory {
  slug: string;
  name: string;
  children: SeedChild[];
}

/** Base category tree (OLX-style). Seeded idempotently by slug. */
const CATEGORY_TREE: SeedCategory[] = [
  {
    slug: 'vehicles',
    name: 'Vehicles',
    children: [
      { slug: 'vehicles-cars', name: 'Cars' },
      { slug: 'vehicles-motorcycles', name: 'Motorcycles' },
      { slug: 'vehicles-boats', name: 'Boats' },
      { slug: 'vehicles-parts', name: 'Parts & Accessories' },
    ],
  },
  {
    slug: 'real-estate',
    name: 'Real Estate',
    children: [
      { slug: 'real-estate-apartments', name: 'Apartments' },
      { slug: 'real-estate-houses', name: 'Houses' },
      { slug: 'real-estate-commercial', name: 'Commercial' },
      { slug: 'real-estate-land', name: 'Land' },
    ],
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    children: [
      { slug: 'electronics-phones', name: 'Phones' },
      { slug: 'electronics-computers', name: 'Computers' },
      { slug: 'electronics-tvs-audio', name: 'TV & Audio' },
      { slug: 'electronics-cameras', name: 'Cameras' },
      { slug: 'electronics-video-games', name: 'Video Games' },
    ],
  },
  {
    slug: 'furniture',
    name: 'Furniture',
    children: [
      { slug: 'furniture-sofas', name: 'Sofas' },
      { slug: 'furniture-tables', name: 'Tables' },
      { slug: 'furniture-chairs', name: 'Chairs' },
      { slug: 'furniture-beds', name: 'Beds' },
      { slug: 'furniture-wardrobes', name: 'Wardrobes' },
    ],
  },
  {
    slug: 'jobs',
    name: 'Jobs',
    children: [
      { slug: 'jobs-full-time', name: 'Full-time' },
      { slug: 'jobs-part-time', name: 'Part-time' },
      { slug: 'jobs-freelance', name: 'Freelance' },
      { slug: 'jobs-internships', name: 'Internships' },
    ],
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    children: [
      { slug: 'fashion-mens', name: "Men's" },
      { slug: 'fashion-womens', name: "Women's" },
      { slug: 'fashion-kids', name: 'Kids' },
      { slug: 'fashion-shoes', name: 'Shoes' },
      { slug: 'fashion-accessories', name: 'Accessories' },
    ],
  },
];

/** Upserts the base category tree. Safe to call repeatedly. */
export async function seedCategories(): Promise<void> {
  for (const [index, top] of CATEGORY_TREE.entries()) {
    const parent = await Category.findOneAndUpdate(
      { slug: top.slug },
      { $set: { name: top.name, order: index, active: true }, $setOnInsert: { parent: null } },
      { upsert: true, new: true },
    );
    for (const [childIndex, child] of top.children.entries()) {
      await Category.findOneAndUpdate(
        { slug: child.slug },
        {
          $set: { name: child.name, order: childIndex, active: true },
          $setOnInsert: { parent: parent._id },
        },
        { upsert: true, new: true },
      );
    }
  }
}

function buildTree(categories: CategoryLean[]): SafeCategory[] {
  const byId = new Map<string, CategoryLean>();
  for (const category of categories) {
    byId.set(String(category._id), { ...category, children: [] });
  }

  const roots: CategoryLean[] = [];
  for (const category of categories) {
    const node = byId.get(String(category._id))!;
    if (category.parent && byId.has(String(category.parent))) {
      byId.get(String(category.parent))!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots.map(toSafeCategory);
}

export async function getCategoryTree(): Promise<SafeCategory[]> {
  const categories = await Category.find({ active: true }).sort({ order: 1 }).lean();
  return buildTree(categories as unknown as CategoryLean[]);
}

/** Returns the ancestor chain of slugs (self last) or null when unknown. */
export async function getCategoryPath(slug: string): Promise<string[] | null> {
  const category = await Category.findOne({ slug, active: true }).lean();
  if (!category) return null;

  const path = [category.slug as string];
  let parentId: unknown = category.parent;
  while (parentId) {
    const parent = await Category.findById(parentId).lean();
    if (!parent) break;
    path.unshift(parent.slug as string);
    parentId = parent.parent;
  }
  return path;
}
