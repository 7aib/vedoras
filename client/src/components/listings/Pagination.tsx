import { cn } from '@/utils/cn';

interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

function pageItems(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const items: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) items.push('…');
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < pages - 1) items.push('…');
  items.push(pages);
  return items;
}

export function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Previous
      </button>
      {pageItems(page, pages).map((item, index) =>
        item === '…' ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 py-2 text-sm text-gray-400 dark:text-gray-500"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'grid size-10 place-items-center rounded-xl border text-sm font-medium transition-colors',
              item === page
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Next
      </button>
    </nav>
  );
}
