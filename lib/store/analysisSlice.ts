import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisResponse, metricsData } from '@/types/analysis';

export interface AnalysisState {
  strykeAnalysisList: AnalysisResponse[];
  algoAnalysisList: AnalysisResponse[];
  fiboAnalysisList: AnalysisResponse[];
  realTimeAnalysisList: AnalysisResponse[];
  strykeMetrics: metricsData | null;
  algoMetrics: metricsData | null;
  fiboMetrics: metricsData | null;
  keyMapping: { [companyName: string]: string };
  lastFetchedAt: number | null;
  isLoading: boolean;
}

const initialState: AnalysisState = {
  strykeAnalysisList: [],
  algoAnalysisList: [],
  fiboAnalysisList: [],
  realTimeAnalysisList: [],
  strykeMetrics: null,
  algoMetrics: null,
  fiboMetrics: null,
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
      fiboAnalysisList: AnalysisResponse[];
      realTimeAnalysisList: AnalysisResponse[];
      keyMapping: { [companyName: string]: string };
    }>) => {
      state.strykeAnalysisList = action.payload.strykeAnalysisList;
      state.algoAnalysisList = action.payload.algoAnalysisList;
      state.fiboAnalysisList = action.payload.fiboAnalysisList;
      state.realTimeAnalysisList = action.payload.realTimeAnalysisList;
      state.keyMapping = action.payload.keyMapping;
      state.lastFetchedAt = Date.now();
      state.isLoading = false;
    },
    setMetrics: (state, action: PayloadAction<{
      strykeMetrics: metricsData | null;
      algoMetrics: metricsData | null;
      fiboMetrics: metricsData | null;
    }>) => {
      state.strykeMetrics = action.payload.strykeMetrics;
      state.algoMetrics = action.payload.algoMetrics;
      state.fiboMetrics = action.payload.fiboMetrics;
    },
    clearAnalysisCache: (state) => {
      return initialState;
    },
  },
});

export const { setLoading, setAnalysisData, setMetrics, clearAnalysisCache } = analysisSlice.actions;
export default analysisSlice.reducer;
