import type { ListingCondition, ListingSort } from '@/types/listing';

/** Converts a slug to a human label, e.g. `vehicles-cars` → `Vehicles Cars`. */
export function humanizeSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const SORT_LABELS: Record<ListingSort, string> = {
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

/** Formats a price with its currency code, e.g. `$150.00` / `150 USD`. */
export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}
