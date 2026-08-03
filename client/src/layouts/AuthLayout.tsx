import { Link, Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white">
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z"
            />
          </svg>
        </span>
        <span className="font-display text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          vedoras
        </span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <Outlet />
      </div>

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        Not sure what you're looking for?{' '}
        <Link
          to="/"
          className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Browse listings
        </Link>
      </p>
    </div>
  );
}
