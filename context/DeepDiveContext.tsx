import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnalysisResponse } from '@/types/analysis';

interface DeepDiveContextType {
  deepDiveData: AnalysisResponse[];
  setDeepDiveData: (data: AnalysisResponse[]) => void;
}

const DeepDiveContext = createContext<DeepDiveContextType | undefined>(undefined);

export const useDeepDive = () => {
  const context = useContext(DeepDiveContext);
  if (context === undefined) {
    throw new Error('useDeepDive must be used within a DeepDiveProvider');
  }
  return context;
};

interface DeepDiveProviderProps {
  children: ReactNode;
}

export const DeepDiveProvider: React.FC<DeepDiveProviderProps> = ({ children }) => {
  const [deepDiveData, setDeepDiveData] = useState<AnalysisResponse[]>([]);

  return (
    <DeepDiveContext.Provider value={{ deepDiveData, setDeepDiveData }}>
      {children}
    </DeepDiveContext.Provider>
  );
};