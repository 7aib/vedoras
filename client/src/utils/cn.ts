import { clsx, type ClassValue } from 'clsx';

/**
 * Merge Tailwind class names conditionally.
 * De-duplicates conflicting utilities while keeping custom classes intact.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
