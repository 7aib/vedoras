export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Vedoras. Buy &amp; sell nearby.
        </p>
        <nav className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <a href="#" className="transition-colors hover:text-gray-900 dark:hover:text-white">
            About
          </a>
          <a href="#" className="transition-colors hover:text-gray-900 dark:hover:text-white">
            Privacy
          </a>
          <a href="#" className="transition-colors hover:text-gray-900 dark:hover:text-white">
            Terms
          </a>
        </nav>
      </div>
    </footer>
  );
}
