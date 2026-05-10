import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisResponse, metricsData } from '@/types/analysis';

export interface AnalysisState {
  strykeAnalysisList: AnalysisResponse[];
  algoAnalysisList: AnalysisResponse[];
  algoV2AnalysisList: AnalysisResponse[];
  strykeMetrics: metricsData | null;
  algoMetrics: metricsData | null;
  algoV2Metrics: metricsData | null;
  keyMapping: { [companyName: string]: string };
  lastFetchedAt: number | null;
  isLoading: boolean;
}

const initialState: AnalysisState = {
  strykeAnalysisList: [],
  algoAnalysisList: [],
  algoV2AnalysisList: [],
  strykeMetrics: null,
  algoMetrics: null,
  algoV2Metrics: null,
  keyMapping: {},
  lastFetchedAt: null,
  isLoading: false,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAnalysisData: (state, action: PayloadAction<{
      strykeAnalysisList: AnalysisResponse[];
      algoAnalysisList: AnalysisResponse[];
      algoV2AnalysisList: AnalysisResponse[];
      keyMapping: { [companyName: string]: string };
    }>) => {
      state.strykeAnalysisList = action.payload.strykeAnalysisList;
      state.algoAnalysisList = action.payload.algoAnalysisList;
      state.algoV2AnalysisList = action.payload.algoV2AnalysisList;
      state.keyMapping = action.payload.keyMapping;
      state.lastFetchedAt = Date.now();
      state.isLoading = false;
    },
    setMetrics: (state, action: PayloadAction<{
      strykeMetrics: metricsData | null;
      algoMetrics: metricsData | null;
      algoV2Metrics: metricsData | null;
    }>) => {
      state.strykeMetrics = action.payload.strykeMetrics;
      state.algoMetrics = action.payload.algoMetrics;
      state.algoV2Metrics = action.payload.algoV2Metrics;
    },
    clearAnalysisCache: (state) => {
      return initialState;
    },
  },
});

export const { setLoading, setAnalysisData, setMetrics, clearAnalysisCache } = analysisSlice.actions;
export default analysisSlice.reducer;
