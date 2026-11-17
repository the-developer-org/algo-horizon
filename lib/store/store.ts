import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import analysisReducer from './analysisSlice';
import instrumentsReducer from './instrumentsSlice';
import usersReducer from './usersSlice';

const createNoopStorage = () => ({
  getItem: async () => null,
  setItem: async (_key: string, value: string) => value,
  removeItem: async () => undefined,
});

const storage =
  typeof window === 'undefined'
    ? createNoopStorage()
    : require('redux-persist/lib/storage').default;

const persistConfig = {
  key: 'analysis-cache',
  storage,
  whitelist: ['strykeAnalysisList', 'algoAnalysisList', 'fiboAnalysisList', 'realTimeAnalysisList', 'strykeMetrics', 'algoMetrics', 'fiboMetrics', 'keyMapping', 'lastFetchedAt']
};

const instrumentsPersistConfig = {
  key: 'instruments-cache',
  storage,
  whitelist: ['keyMapping', 'lastFetchedAt'],
};

const usersPersistConfig = {
  key: 'users-cache',
  storage,
  whitelist: ['users', 'lastFetchedAt'],
};

const persistedReducer = persistReducer(persistConfig, analysisReducer);
const persistedInstrumentsReducer = persistReducer(instrumentsPersistConfig, instrumentsReducer);
const persistedUsersReducer = persistReducer(usersPersistConfig, usersReducer);

export const store = configureStore({
  reducer: {
    analysis: persistedReducer,
    instruments: persistedInstrumentsReducer,
    users: persistedUsersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export const makeStore = () => store;

// Infer the type of store
export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
