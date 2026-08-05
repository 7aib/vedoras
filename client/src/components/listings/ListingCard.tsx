import { Link } from 'react-router';
import { useAppSelector } from '@/store/hooks';
import { selectCategoryMap } from '@/store/slices/categorySlice';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { humanizeSlug, CONDITION_LABELS, formatPrice } from '@/utils/constants';
import type { SafeListing } from '@/types/listing';

export function ListingCard({ listing }: { listing: SafeListing }) {
  const cover = listing.images[0];
  const categoryMap = useAppSelector(selectCategoryMap);
  const categoryName = categoryMap[listing.category] ?? humanizeSlug(listing.category);

  return (
    <Link
      to={`/listings/${listing._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <svg
              className="size-12 text-gray-300 dark:text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}
        {listing.status !== 'active' && (
          <span className="absolute left-3 top-3 rounded-full bg-gray-900/80 px-2.5 py-1 text-xs font-semibold capitalize text-white">
            {listing.status}
          </span>
        )}
        <FavoriteButton
          listingId={listing._id}
          isFavorited={listing.isFavorited}
          favoriteCount={listing.favoriteCount}
          showCount
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur dark:bg-gray-900/90"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {categoryName}
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {CONDITION_LABELS[listing.condition]}
          </span>
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
          {listing.title}
        </h3>

        <p className="font-display mt-auto text-lg font-bold tracking-tight text-brand-600 dark:text-brand-400">
          {formatPrice(listing.price, listing.currency)}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{listing.location ?? listing.seller.location ?? 'Vedoras'}</span>
          <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}
