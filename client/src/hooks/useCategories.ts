import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCategories, selectCategoryMap } from '@/store/slices/categorySlice';
import { humanizeSlug } from '@/utils/constants';
import type { SafeCategory } from '@/types/category';

/**
 * Loads the category tree once and exposes helpers for rendering category
 * dropdowns and resolving slugs to display names.
 */
export function useCategories() {
  const { tree, status } = useAppSelector((state) => state.categories);
  const map = useAppSelector(selectCategoryMap);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchCategories());
    }
  }, [dispatch, status]);

  function categoryName(slug: string): string {
    return map[slug] ?? humanizeSlug(slug);
  }

  function subcategoriesOf(parentSlug: string): SafeCategory[] {
    return tree.find((category) => category.slug === parentSlug)?.children ?? [];
  }

  return {
    tree,
    status,
    categoryName,
    subcategoriesOf,
    isLoaded: status === 'succeeded',
  };
}
