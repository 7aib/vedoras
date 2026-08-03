import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchCategories as apiFetchCategories } from '@/services/category';
import type { SafeCategory } from '@/types/category';
import type { RootState } from '@/store';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface CategoryState {
  tree: SafeCategory[];
  status: RequestStatus;
}

const initialState: CategoryState = {
  tree: [],
  status: 'idle',
};

export const fetchCategories = createAsyncThunk('categories/list', () => apiFetchCategories());

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<SafeCategory[]>) => {
        state.tree = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export default categorySlice.reducer;

/** Selects a { slug: name } lookup map from the loaded category tree. */
export function selectCategoryMap(state: RootState): Record<string, string> {
  const map: Record<string, string> = {};
  const walk = (nodes: SafeCategory[]): void => {
    for (const node of nodes) {
      map[node.slug] = node.name;
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(state.categories.tree);
  return map;
}
