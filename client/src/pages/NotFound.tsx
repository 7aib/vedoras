import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-display text-7xl font-bold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        Page not found
      </h1>
      <p className="max-w-md text-gray-600 dark:text-gray-400">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}
