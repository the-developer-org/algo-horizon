import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, fetchAllUsersDirect } from '@/lib/api/algoHorizonApi';

export interface UsersState {
  users: UserProfile[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: UsersState = {
  users: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

// Async thunk to fetch all users from /api/user/get-all-users
export const fetchAllUsers = createAsyncThunk(
  'users/fetchAllUsers',
  async (force: boolean | void = false, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { users?: UsersState };
      // Cache check: return existing if available and not forced
      if (!force && state.users && state.users.users.length > 0) {
        return state.users.users;
      }

      const users = await fetchAllUsersDirect();
      return users;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch users');
    }
  }
);

export const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<UserProfile[]>) => {
      state.users = action.payload;
      state.lastFetchedAt = Date.now();
      state.error = null;
    },
    clearUsers: (state) => {
      state.users = [];
      state.lastFetchedAt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
        state.lastFetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch users';
      });
  },
});

export const { setUsers, clearUsers } = usersSlice.actions;
export default usersSlice.reducer;

/**
 * Reusable utility to get users from Redux or fetch them if not present.
 * 1. Checks Redux store state.
 * 2. If present and not empty, returns it immediately.
 * 3. Otherwise, dispatches `fetchAllUsers` which calls `/api/user/get-all-users`,
 *    stores the result in Redux, and returns the newly saved users.
 *
 * @param force If true, ignores cached data and forces a fresh network call.
 * @returns Promise<UserProfile[]>
 */
export async function getOrFetchAllUsers(force: boolean = false): Promise<UserProfile[]> {
  const { store } = await import('./store');
  const state = store.getState();
  const existing = state.users?.users;

  if (!force && existing && existing.length > 0) {
    return existing;
  }

  const result = await store.dispatch(fetchAllUsers(force));
  if (fetchAllUsers.fulfilled.match(result)) {
    return result.payload;
  }

  throw new Error(result.error?.message || 'Failed to fetch users');
}
