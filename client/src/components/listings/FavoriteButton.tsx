import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/store/slices/favoriteSlice';
import { useAuth } from '@/hooks/useAuth';

interface FavoriteButtonProps {
  listingId: string;
  isFavorited?: boolean;
  favoriteCount?: number;
  /** Renders the favorite count next to the heart. */
  showCount?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Heart button used on listing cards and the detail page. Guest clicks are
 * routed to the login page with a return-to path; authenticated clicks toggle
 * the favorite and optimistically reflect the returned server state.
 */
export function FavoriteButton({
  listingId,
  isFavorited = false,
  favoriteCount = 0,
  showCount = false,
  className = '',
  'aria-label': ariaLabel,
}: FavoriteButtonProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const pending = useAppSelector((state) => state.favorites.pendingIds.includes(listingId));

  const handleClick = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: location.pathname } } });
      return;
    }
    try {
      await dispatch(toggleFavorite(listingId)).unwrap();
    } catch {
      toast.error('Unable to update favorite. Please try again.');
    }
  };

  const active = isFavorited && !pending;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel ?? (active ? 'Remove from favorites' : 'Add to favorites')}
      aria-pressed={isFavorited}
      disabled={pending}
      className={`group/btn inline-flex items-center gap-1.5 disabled:opacity-60 ${className}`}
    >
      <svg
        className={`size-5 transition-colors ${
          active
            ? 'fill-rose-500 text-rose-500'
            : 'fill-transparent text-gray-500 group-hover/btn:text-rose-500 dark:text-gray-400'
        }`}
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {showCount && favoriteCount > 0 && (
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {favoriteCount}
        </span>
      )}
    </button>
  );
}
