import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, toggleTheme } from '@/store/slices/uiSlice';

const STORAGE_KEY = 'vedoras_theme';

/**
 * Applies the current theme to the <html> element and keeps it persisted.
 * The initial class is applied by an inline script in index.html to avoid FOUC.
 */
export function useDarkMode() {
  const theme = useAppSelector((state) => state.ui.theme);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark',
    toggle: () => dispatch(toggleTheme()),
    setTheme: (value: 'light' | 'dark') => dispatch(setTheme(value)),
  };
}
