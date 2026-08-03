export function PageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
      <div className="size-10 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-400" />
    </div>
  );
}
