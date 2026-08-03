import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import type { LoginInput, RegisterInput, SafeUser } from '@/types/auth';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: tokenStorage.getUser(),
  accessToken: tokenStorage.getAccessToken(),
  status: 'idle',
};

export const login = createAsyncThunk('auth/login', async (input: LoginInput) => loginUser(input));

export const register = createAsyncThunk('auth/register', async (input: RegisterInput) =>
  registerUser(input),
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await logoutUser();
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => fetchCurrentUser());

function persistCredentials(user: SafeUser, accessToken: string) {
  tokenStorage.setAccessToken(accessToken);
  tokenStorage.setUser(user);
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: SafeUser; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
      persistCredentials(action.payload.user, action.payload.accessToken);
    },
    setUnauthenticated(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
      tokenStorage.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.status = 'authenticated';
        persistCredentials(action.payload.user, action.payload.accessToken);
      })
      .addCase(login.rejected, (state) => {
        state.status = state.accessToken ? 'authenticated' : 'unauthenticated';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.status = 'authenticated';
        persistCredentials(action.payload.user, action.payload.accessToken);
      })
      .addCase(register.rejected, (state) => {
        state.status = state.accessToken ? 'authenticated' : 'unauthenticated';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'unauthenticated';
        tokenStorage.clear();
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'unauthenticated';
        tokenStorage.clear();
      })
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.accessToken = tokenStorage.getAccessToken();
        state.status = 'authenticated';
        tokenStorage.setUser(action.payload);
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'unauthenticated';
        tokenStorage.clear();
      });
  },
});

export const { setCredentials, setUnauthenticated } = authSlice.actions;
export default authSlice.reducer;
