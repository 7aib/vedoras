import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFavorites } from '@/store/slices/favoriteSlice';
import { ListingCard } from '@/components/listings/ListingCard';
import { EmptyState } from '@/components/listings/EmptyState';
import { Pagination } from '@/components/listings/Pagination';

const LIMIT = 12;

export function FavoritesPage() {
  const dispatch = useAppDispatch();
  const { items, total, pages, status } = useAppSelector((state) => state.favorites.list);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchFavorites({ page, limit: LIMIT }));
  }, [dispatch, page]);

  const isLoading = status === 'idle' || status === 'loading';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Favorites
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {total} saved {total === 1 ? 'listing' : 'listings'}
        </p>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: LIMIT }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No favorites yet"
            description="Tap the heart on any listing to save it here."
            action={
              <Link
                to="/listings"
                className="inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Browse listings
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>
    </div>
  );
}
