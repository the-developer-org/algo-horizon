import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { KeyMapping, fetchKeyMappingDirect } from '@/utils/apiUtils';

export interface InstrumentsState {
  keyMapping: KeyMapping;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: InstrumentsState = {
  keyMapping: {},
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

// Async thunk to fetch key mapping from /api/instruments/get-mapping
export const fetchInstrumentsMapping = createAsyncThunk(
  'instruments/fetchMapping',
  async (force: boolean | void = false, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { instruments?: InstrumentsState };
      // Cache check: return existing if available and not forced
      if (!force && state.instruments && Object.keys(state.instruments.keyMapping).length > 0) {
        return state.instruments.keyMapping;
      }

      const mapping = await fetchKeyMappingDirect();
      return mapping;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch instruments mapping');
    }
  }
);

export const instrumentsSlice = createSlice({
  name: 'instruments',
  initialState,
  reducers: {
    setKeyMapping: (state, action: PayloadAction<KeyMapping>) => {
      state.keyMapping = action.payload;
      state.lastFetchedAt = Date.now();
      state.error = null;
    },
    clearKeyMapping: (state) => {
      state.keyMapping = {};
      state.lastFetchedAt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInstrumentsMapping.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInstrumentsMapping.fulfilled, (state, action) => {
        state.isLoading = false;
        state.keyMapping = action.payload;
        state.lastFetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchInstrumentsMapping.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch mapping';
      });
  },
});

export const { setKeyMapping, clearKeyMapping } = instrumentsSlice.actions;
export default instrumentsSlice.reducer;

/**
 * Reusable utility to get key mapping from Redux or fetch it if not present.
 * 1. Checks Redux store state.
 * 2. If present and not empty, returns it immediately.
 * 3. Otherwise, dispatches `fetchInstrumentsMapping` which calls `/api/instruments/get-mapping`,
 *    stores the result in Redux, and returns the newly saved mapping.
 *
 * @param force If true, ignores cached data and forces a fresh network call.
 * @returns Promise<KeyMapping>
 */
export async function getOrFetchKeyMapping(force: boolean = false): Promise<KeyMapping> {
  const { store } = await import('./store');
  const state = store.getState();
  const existing = state.instruments?.keyMapping;

  if (!force && existing && Object.keys(existing).length > 0) {
    return existing;
  }

  const result = await store.dispatch(fetchInstrumentsMapping(force));
  if (fetchInstrumentsMapping.fulfilled.match(result)) {
    return result.payload;
  }

  throw new Error(result.error?.message || 'Failed to fetch instruments mapping');
}
