import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import analysisReducer from './analysisSlice';

const persistConfig = {
  key: 'analysis-cache',
  storage,
  whitelist: ['strykeAnalysisList', 'algoAnalysisList', 'fiboAnalysisList', 'realTimeAnalysisList', 'strykeMetrics', 'algoMetrics', 'fiboMetrics', 'keyMapping', 'lastFetchedAt']
};

const persistedReducer = persistReducer(persistConfig, analysisReducer);

export const makeStore = () => {
  return configureStore({
    reducer: {
      analysis: persistedReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const persistor = persistStore(makeStore());
