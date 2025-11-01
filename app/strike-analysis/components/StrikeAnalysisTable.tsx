import React from 'react';
import { AnalysisResponse } from '@/components/types/strike-analysis';

interface StrikeAnalysisTableProps {
  showMetrics: boolean;
  filteredAnalysisList: AnalysisResponse[];
  setFilteredAnalysisList: (list: AnalysisResponse[]) => void;
  strykeAnalysisList: AnalysisResponse[];
  algoAnalysisList: AnalysisResponse[];
  activeFilter: any;
  setActiveFilter: (filter: any) => void;
  chartDropdownOpen: string | null;
  setChartDropdownOpen: (id: string | null) => void;
  swingLabelsDropdownOpen: boolean;
  setSwingLabelsDropdownOpen: (open: boolean) => void;
  erGapDropdownOpen: boolean;
  setErGapDropdownOpen: (open: boolean) => void;
  profitsDropdownOpen: boolean;
  setProfitsDropdownOpen: (open: boolean) => void;
  supportDropdownOpen: boolean;
  setSupportDropdownOpen: (open: boolean) => void;
  resistanceDropdownOpen: boolean;
  setResistanceDropdownOpen: (open: boolean) => void;
  crossoverModal: {
    open: boolean;
    companyName: string;
    timeframe: string;
    list: string[];
  };
  openCrossoverModal: (item: AnalysisResponse, label: string, timeframe: string) => void;
  closeCrossoverModal: () => void;
  timeframes: string[];
  navigateToChart: (instrumentKey: string, timeframe: string) => void;
  getEmaBadgeProps: (item: AnalysisResponse, label: string, timeframe: string) => {
    title: string;
    cls: string;
    count: number;
  };
  formatReadableDate: (date: string) => string;
  calculatePercentageDifference: (entry: number, target: number) => number;
}

const StrikeAnalysisTable: React.FC<StrikeAnalysisTableProps> = ({
  showMetrics,
  filteredAnalysisList,
  setFilteredAnalysisList,
  strykeAnalysisList,
  algoAnalysisList,
  activeFilter,
  setActiveFilter,
  chartDropdownOpen,
  setChartDropdownOpen,
  swingLabelsDropdownOpen,
  setSwingLabelsDropdownOpen,
  erGapDropdownOpen,
  setErGapDropdownOpen,
  profitsDropdownOpen,
  setProfitsDropdownOpen,
  supportDropdownOpen,
  setSupportDropdownOpen,
  resistanceDropdownOpen,
  setResistanceDropdownOpen,
  crossoverModal,
  openCrossoverModal,
  closeCrossoverModal,
  timeframes,
  navigateToChart,
  getEmaBadgeProps,
  formatReadableDate,
  calculatePercentageDifference,
}) => {
  return (
    <>
      {/* Show table when showMetrics is false */}
      {!showMetrics && (
        <table className="table-auto w-full border-collapse border border-gray-700 text-center">
          <thead>
            <tr className="bg-gray-400 sticky top-0 z-10">
              <th className="border border-gray-700 px-4 py-2">Slno</th>
              <th className="border border-gray-700 px-12 py-2 min-w-[100px]">
                <div className="flex items-center ml-10">
                  <span>Company</span>
                  <button
                    onClick={() => {
                      const newOrder = activeFilter.name === 'asc' ? 'desc' : activeFilter.name === 'desc' ? null : 'asc';
                      setActiveFilter({ ...activeFilter, name: newOrder });
                      if (newOrder) {
                        setFilteredAnalysisList(
                          [...filteredAnalysisList].sort((a, b) =>
                            newOrder === 'asc'
                              ? a.companyName.localeCompare(b.companyName)
                              : b.companyName.localeCompare(a.companyName)
                          )
                        );
                      } else {

                        setFilteredAnalysisList(filteredAnalysisList);
                      }
                    }}
                    className="ml-1 p-1 hover:bg-gray-300 rounded"
                    title={`Sort by Company ${activeFilter.name === 'asc' ? '(A-Z)' : activeFilter.name === 'desc' ? '(Z-A)' : '(Off)'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.name === 'asc'
                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                      : activeFilter.name === 'desc'
                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {activeFilter.name === 'asc' ? '▲' : activeFilter.name === 'desc' ? '▼' : '⇅'}
                    </span>
                  </button>
                </div>
              </th>
              <th className="border border-gray-700 px-4 py-2 min-w-[60px]">Chart</th>
              <th className="border border-gray-700 px-12 py-2 min-w-[160px]">
                <div className="flex items-center justify-between">
                  <span>Entry Date</span>
                  <button
                    onClick={() => {
                      const newOrder = activeFilter.date === 'asc' ? 'desc' : activeFilter.date === 'desc' ? null : 'asc';
                      setActiveFilter({ ...activeFilter, date: newOrder });
                      if (newOrder) {
                        setFilteredAnalysisList(
                          [...filteredAnalysisList].sort((a, b) =>
                            newOrder === 'asc'
                              ? new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
                              : new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
                          )
                        );
                      } else {
                        setFilteredAnalysisList([...filteredAnalysisList]);
                      }
                    }}
                    className="hover:bg-gray-300 rounded"
                    title={`Sort by Date ${activeFilter.date === 'asc' ? '(Oldest First)' : activeFilter.date === 'desc' ? '(Newest First)' : '(Off)'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.date === 'asc'
                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                      : activeFilter.date === 'desc'
                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {activeFilter.date === 'asc' ? '▲' : activeFilter.date === 'desc' ? '▼' : '⇅'}
                    </span>
                  </button>
                </div>
              </th>
              <th className="border border-gray-700 px-8 py-2">
                <div className="flex items-center justify-between">
                  <span>Entry</span>
                  <button
                    onClick={() => {
                      const newOrder = activeFilter.entry === 'asc' ? 'desc' : activeFilter.entry === 'desc' ? null : 'asc';
                      setActiveFilter({ ...activeFilter, entry: newOrder });
                      if (newOrder) {
                        setFilteredAnalysisList(
                          [...filteredAnalysisList].sort((a, b) => {
                            const aPrice = a.entryCandleClose ?? 0;
                            const bPrice = b.entryCandleClose ?? 0;
                            return newOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
                          })
                        );
                      } else {
                        setFilteredAnalysisList([...filteredAnalysisList]);
                      }
                    }}
                    className="ml-1 p-1 hover:bg-gray-300 rounded"
                    title={`Sort by Entry Price ${activeFilter.entry === 'asc' ? '(Low to High)' : activeFilter.entry === 'desc' ? '(High to Low)' : '(Off)'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.entry === 'asc'
                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                      : activeFilter.entry === 'desc'
                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {activeFilter.entry === 'asc' ? '▲' : activeFilter.entry === 'desc' ? '▼' : '⇅'}
                    </span>
                  </button>
                </div>
              </th>
              <th className="border border-gray-700 px-8 py-2 min-w-[180px]">
                <div className="flex items-center justify-between">
                  <span>Target</span>
                  <button
                    onClick={() => {
                      const newOrder = activeFilter.target === 'asc' ? 'desc' : activeFilter.target === 'desc' ? null : 'asc';
                      setActiveFilter({ ...activeFilter, target: newOrder });
                      if (newOrder) {
                        setFilteredAnalysisList(
                          [...filteredAnalysisList].sort((a, b) => {
                            const aTarget = a.target || 0;
                            const bTarget = b.target || 0;
                            return newOrder === 'asc' ? aTarget - bTarget : bTarget - aTarget;
                          })
                        );
                      } else {
                        setFilteredAnalysisList([...filteredAnalysisList]);
                      }
                    }}
                    className="ml-1 p-1 hover:bg-gray-300 rounded"
                    title={`Sort by Target ${activeFilter.target === 'asc' ? '(Low to High)' : activeFilter.target === 'desc' ? '(High to Low)' : '(Off)'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.target === 'asc'
                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                      : activeFilter.target === 'desc'
                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {activeFilter.target === 'asc' ? '▲' : activeFilter.target === 'desc' ? '▼' : '⇅'}
                    </span>
                  </button>
                </div>
              </th>
              <th className="border border-gray-700 px-8 py-2 min-w-[180px]">
                <div className="flex items-center justify-between">
                  <span>Stop Loss</span>
                  <button
                    onClick={() => {
                      const newOrder = activeFilter.stopLoss === 'asc' ? 'desc' : activeFilter.stopLoss === 'desc' ? null : 'asc';
                      setActiveFilter({ ...activeFilter, stopLoss: newOrder });
                      if (newOrder) {
                        setFilteredAnalysisList(
                          [...filteredAnalysisList].sort((a, b) => {
                            const aStopLoss = a.stopLoss || 0;
                            const bStopLoss = b.stopLoss || 0;
                            return newOrder === 'asc' ? aStopLoss - bStopLoss : bStopLoss - aStopLoss;
                          })
                        );
                      } else {
                        setFilteredAnalysisList([...filteredAnalysisList]);
                      }
                    }}
                    className="ml-1 p-1 hover:bg-gray-300 rounded"
                    title={`Sort by Stop Loss ${activeFilter.stopLoss === 'asc' ? '(Low to High)' : activeFilter.stopLoss === 'desc' ? '(High to Low)' : '(Off)'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.stopLoss === 'asc'
                      ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                      : activeFilter.stopLoss === 'desc'
                        ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {activeFilter.stopLoss === 'asc' ? '▲' : activeFilter.stopLoss === 'desc' ? '▼' : '⇅'}
                    </span>
                  </button>
                </div>
              </th>
              <th className="border border-gray-700 px-8 py-2 min-w-[150px] relative">
                <div className="flex items-center justify-between">
                  <span>Swing Labels</span>
                  <button
                    onClick={() => setSwingLabelsDropdownOpen(!swingLabelsDropdownOpen)}
                    className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                    title={`Filter by Swing Label Combination ${activeFilter.swingLabelCombo ? `(${activeFilter.swingLabelCombo})` : '(All)'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.swingLabelCombo
                        ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {activeFilter.swingLabelCombo ? '◆' : '⚏'}
                    </span>
                  </button>

                  {swingLabelsDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px] py-2">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                        Select Swing Pattern
                      </div>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, swingLabelCombo: null });
                          setSwingLabelsDropdownOpen(false);
                          // Reset to show all items
                          setFilteredAnalysisList(filteredAnalysisList);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.swingLabelCombo
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        All Patterns
                      </button>
                      {[
                        'LL<-HH', 'HL<-HH',
                        'HH<-HL', 'LH<-HL',
                        'HH<-LH', 'LL<-LH',
                        'HH<-LL', 'LH<-LL',
                        'HH<-HH', 'HL<-HL', 'LH<-LH', 'LL<-LL'
                      ]
                        .map((combo) => (
                          <button
                            key={combo}
                            onClick={() => {
                              setActiveFilter({ ...activeFilter, swingLabelCombo: combo as any });
                              setSwingLabelsDropdownOpen(false);
                              // Apply filter to both lists
                              const [prev, curr] = combo.split('<-');
                             debugger
                              setFilteredAnalysisList([...filteredAnalysisList].filter(item =>
                                item.prevSwingLabel === prev && item.currentSwingLabel === curr
                              ));
                            }}
                            className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.swingLabelCombo === combo
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <span className="font-mono text-xs">{combo}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </th>
              <th title='Entry - Resistance Gap' className="border border-gray-700 px-12 py-2 min-w-[130px] relative">
                <div className="flex items-center justify-between">
                  <span>ER-Gap</span>
                  <div className="flex items-center">
                    {/* Sort Button */}
                    <button
                      onClick={() => {
                        const newOrder = activeFilter.erSort === 'asc' ? 'desc' : activeFilter.erSort === 'desc' ? null : 'asc';
                        setActiveFilter({ ...activeFilter, erSort: newOrder });
                        if (newOrder) {
                          setFilteredAnalysisList(
                            [...filteredAnalysisList].sort((a, b) => {
                              const aGap = a.minSwingProfits ?? 0;
                              const bGap = b.minSwingProfits ?? 0;
                              return newOrder === 'asc' ? aGap - bGap : bGap - aGap;
                            })
                          );
                        } else {
                          setFilteredAnalysisList([...filteredAnalysisList]);
                        }
                      }}
                      className="ml-1 p-1 hover:bg-gray-300 rounded"
                      title={`Sort by ER-Gap ${activeFilter.erSort === 'asc' ? '(Low to High)' : activeFilter.erSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.erSort === 'asc'
                        ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                        : activeFilter.erSort === 'desc'
                          ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                          : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.erSort === 'asc' ? '▲' : activeFilter.erSort === 'desc' ? '▼' : '⇅'}
                      </span>
                    </button>

                    {/* Filter Button */}
                    <button
                      onClick={() => setErGapDropdownOpen(!erGapDropdownOpen)}
                      className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                      title={`Filter by ER-Gap ${activeFilter.erLabel ? `(${activeFilter.erLabel})` : '(All)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.erLabel
                        ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.erLabel ? '◆' : '⚏'}
                      </span>
                    </button>
                  </div>

                  {erGapDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                        Filter by ER-Gap
                      </div>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, erLabel: null });
                          setErGapDropdownOpen(false);
                          // Reset to show all items - restore original data
                          setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.erLabel
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        All Values
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, erLabel: 'BELOW_3' });
                          setErGapDropdownOpen(false);
                          // Filter for values < 3% from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.minSwingProfits ?? 0) > 0 && (item.minSwingProfits ?? 0) < 3
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.erLabel === 'BELOW_3'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">&lt; 3%</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, erLabel: 'ABOVE_3' });
                          setErGapDropdownOpen(false);
                          // Filter for values >= 3% from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.minSwingProfits ?? 0) >= 3
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.erLabel === 'ABOVE_3'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">≥ 3%</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, erLabel: 'AR' });
                          setErGapDropdownOpen(false);
                          // Filter for Above Resistance (value <= 0) from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.minSwingProfits ?? 0) <= 0
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.erLabel === 'AR'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">Above Resistance</span>
                      </button>
                    </div>
                  )}
                </div>
              </th>
              <th className="border border-gray-700 px-12 py-2 min-w-[160px] relative">
                <div className="flex items-center justify-between">
                  <span>Max Profits</span>
                  <div className="flex items-center">
                    {/* Sort Button */}
                    <button
                      onClick={() => {
                        const newOrder = activeFilter.profitSort === 'asc' ? 'desc' : activeFilter.profitSort === 'desc' ? null : 'asc';
                        setActiveFilter({ ...activeFilter, profitSort: newOrder });
                        if (newOrder) {
                          setFilteredAnalysisList(
                            [...filteredAnalysisList].sort((a, b) => {
                              const aProfit = a.maxSwingProfits ?? 0;
                              const bProfit = b.maxSwingProfits ?? 0;
                              return newOrder === 'asc' ? aProfit - bProfit : bProfit - aProfit;
                            })
                          );
                        } else {
                          setFilteredAnalysisList([...filteredAnalysisList]);
                        }
                      }}
                      className="ml-1 p-1 hover:bg-gray-300 rounded"
                      title={`Sort by Max Profits ${activeFilter.profitSort === 'asc' ? '(Low to High)' : activeFilter.profitSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.profitSort === 'asc'
                        ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                        : activeFilter.profitSort === 'desc'
                          ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                          : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.profitSort === 'asc' ? '▲' : activeFilter.profitSort === 'desc' ? '▼' : '⇅'}
                      </span>
                    </button>

                    {/* Filter Button */}
                    <button
                      onClick={() => setProfitsDropdownOpen(!profitsDropdownOpen)}
                      className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                      title={`Filter by Max Profits ${activeFilter.profitLabel ? `(${activeFilter.profitLabel})` : '(All)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.profitLabel
                        ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.profitLabel ? '◆' : '⚏'}
                      </span>
                    </button>
                  </div>

                  {profitsDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                        Filter by Max Profits
                      </div>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, profitLabel: null });
                          setProfitsDropdownOpen(false);
                          // Reset to show all items - restore original data
                          setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.profitLabel
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        All Values
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, profitLabel: 'BELOW_3' });
                          setProfitsDropdownOpen(false);
                          // Filter for values < 3% from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.maxSwingProfits ?? 0) > 0 && (item.maxSwingProfits ?? 0) < 3
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.profitLabel === 'BELOW_3'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">&lt; 3%</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, profitLabel: 'ABOVE_3' });
                          setProfitsDropdownOpen(false);
                          // Filter for values >= 3% from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.maxSwingProfits ?? 0) >= 3
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.profitLabel === 'ABOVE_3'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">≥ 3%</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, profitLabel: 'NEGATIVE' });
                          setProfitsDropdownOpen(false);
                          // Filter for negative values (value <= 0) from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.maxSwingProfits ?? 0) <= 0
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.profitLabel === 'NEGATIVE'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">Negative/Zero</span>
                      </button>
                    </div>
                  )}
                </div>
              </th>
              <th title='Time Take for Stock to Hit Support' className="border border-gray-700 px-8 py-2 relative">
                <div className="flex items-center justify-between">
                  <span>Support</span>
                  <div className="flex items-center">
                    {/* Sort Button */}
                    <button
                      onClick={() => {
                        const newOrder = activeFilter.supportSort === 'asc' ? 'desc' : activeFilter.supportSort === 'desc' ? null : 'asc';
                        setActiveFilter({ ...activeFilter, supportSort: newOrder });
                        if (newOrder) {
                          setFilteredAnalysisList(
                            [...filteredAnalysisList].sort((a, b) => {
                              const aSupport = a.daysTakenForSupportTouch ?? 0;
                              const bSupport = b.daysTakenForSupportTouch ?? 0;
                              return newOrder === 'asc' ? aSupport - bSupport : bSupport - aSupport;
                            })
                          );
                        } else {
                          setFilteredAnalysisList([...filteredAnalysisList]);
                        }
                      }}
                      className="ml-1 p-1 hover:bg-gray-300 rounded"
                      title={`Sort by Support ${activeFilter.supportSort === 'asc' ? '(Low to High)' : activeFilter.supportSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.supportSort === 'asc'
                        ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                        : activeFilter.supportSort === 'desc'
                          ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                          : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.supportSort === 'asc' ? '▲' : activeFilter.supportSort === 'desc' ? '▼' : '⇅'}
                      </span>
                    </button>

                    {/* Filter Button */}
                    <button
                      onClick={() => setSupportDropdownOpen(!supportDropdownOpen)}
                      className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                      title={`Filter by Support ${activeFilter.supportLabel ? `(${activeFilter.supportLabel})` : '(All)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.supportLabel
                        ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.supportLabel ? '◆' : '⚏'}
                      </span>
                    </button>
                  </div>

                  {supportDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                        Filter by Support Hit
                      </div>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, supportLabel: null });
                          setSupportDropdownOpen(false);
                          // Reset to show all items - restore original data
                          setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.supportLabel
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        All Values
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, supportLabel: 'HIT' });
                          setSupportDropdownOpen(false);
                          // Filter for items that hit support (value > 0) from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.daysTakenForSupportTouch ?? 0) > 0
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.supportLabel === 'HIT'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">Hit Support</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, supportLabel: 'NO_HIT' });
                          setSupportDropdownOpen(false);
                          // Filter for items that didn't hit support (value = 0) from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.daysTakenForSupportTouch ?? 0) === 0
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.supportLabel === 'NO_HIT'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">No Hit</span>
                      </button>
                    </div>
                  )}
                </div>
              </th>
              <th title='Time Take for Stock to Hit Resistance' className="border border-gray-700 px-8 py-2 min-w-[80px] relative">
                <div className="flex items-center justify-between">
                  <span>Resistance</span>
                  <div className="flex items-center">
                    {/* Sort Button */}
                    <button
                      onClick={() => {
                        const newOrder = activeFilter.resistanceSort === 'asc' ? 'desc' : activeFilter.resistanceSort === 'desc' ? null : 'asc';
                        setActiveFilter({ ...activeFilter, resistanceSort: newOrder });
                        if (newOrder) {
                          setFilteredAnalysisList(
                            [...filteredAnalysisList].sort((a, b) => {
                              const aResistance = a.daysTakenForResistanceTouch ?? 0;
                              const bResistance = b.daysTakenForResistanceTouch ?? 0;
                              return newOrder === 'asc' ? aResistance - bResistance : bResistance - aResistance;
                            })
                          );
                        } else {
                          setFilteredAnalysisList([...filteredAnalysisList]);
                        }
                      }}
                      className="ml-1 p-1 hover:bg-gray-300 rounded"
                      title={`Sort by Resistance ${activeFilter.resistanceSort === 'asc' ? '(Low to High)' : activeFilter.resistanceSort === 'desc' ? '(High to Low)' : '(Off)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.resistanceSort === 'asc'
                        ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                        : activeFilter.resistanceSort === 'desc'
                          ? 'bg-red-100 border-red-500 text-red-700 shadow-sm'
                          : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.resistanceSort === 'asc' ? '▲' : activeFilter.resistanceSort === 'desc' ? '▼' : '⇅'}
                      </span>
                    </button>

                    {/* Filter Button */}
                    <button
                      onClick={() => setResistanceDropdownOpen(!resistanceDropdownOpen)}
                      className="ml-1 p-1 hover:bg-gray-300 rounded relative"
                      title={`Filter by Resistance ${activeFilter.resistanceLabel ? `(${activeFilter.resistanceLabel})` : '(All)'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-all duration-200 ${activeFilter.resistanceLabel
                        ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {activeFilter.resistanceLabel ? '◆' : '⚏'}
                      </span>
                    </button>
                  </div>

                  {resistanceDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-2">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                        Filter by Resistance Hit
                      </div>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, resistanceLabel: null });
                          setResistanceDropdownOpen(false);
                          // Reset to show all items - restore original data
                          setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList]);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${!activeFilter.resistanceLabel
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        All Values
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, resistanceLabel: 'HIT' });
                          setResistanceDropdownOpen(false);
                          // Filter for items that hit resistance (value > 0) from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.daysTakenForResistanceTouch ?? 0) > 0
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.resistanceLabel === 'HIT'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">Hit Resistance</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveFilter({ ...activeFilter, resistanceLabel: 'NO_HIT' });
                          setResistanceDropdownOpen(false);
                          // Filter for items that didn't hit resistance (value = 0) from original data
                          const filtered = filteredAnalysisList.filter(item =>
                            (item.daysTakenForResistanceTouch ?? 0) === 0
                          );
                          setFilteredAnalysisList(filtered);
                        }}
                        className={`flex items-center justify-start w-full px-3 py-2 text-sm transition-colors duration-150 ${activeFilter.resistanceLabel === 'NO_HIT'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-xs">No Hit</span>
                      </button>
                    </div>
                  )}
                </div>
              </th>
              <th title='EMA Cross Overs' className="border border-gray-700 px-8 py-2 min-w-[200px]" colSpan={2}>Ema Position</th>
              <th title='EMA Cross Overs' className="border border-gray-700 px-8 py-2">Ema Cross Overs</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnalysisList.map((stryke, index) => {

              return (
                <React.Fragment key={stryke.uuid || index}>

                  <tr className={`${
                    stryke.label === "STRYKE" ? 'bg-green-100 hover:bg-green-200 border-l-4 border-green-500' :
                    stryke.label === "ALGO" ? 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500' :
                    stryke.label === "FIBO" ? 'bg-purple-100 hover:bg-purple-200 border-l-4 border-purple-500' :
                    'bg-gray-100 hover:bg-gray-200 border-l-4 border-gray-500'
                  }`}>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{index + 1}</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle truncate max-w-[280px]" title={stryke.companyName}>
                      <div className="flex flex-col">
                        <span className="font-medium">{stryke.companyName}</span>
                        <div className="flex flex-wrap gap-1 mt-1 justify-center">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            stryke.label === "STRYKE" ? 'bg-green-100 text-green-600' :
                            stryke.label === "ALGO" ? 'bg-blue-100 text-blue-600' :
                            stryke.label === "FIBO" ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>{
                            stryke.label === "STRYKE" ? "Stryke" :
                            stryke.label === "ALGO" ? "Algo" :
                            stryke.label === "FIBO" ? "Fibo" :
                            "Unknown"
                          }</span>
                          {stryke.strykeType && (
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              stryke.strykeType === "OLD" ? 'bg-amber-100 text-amber-600' :
                              stryke.strykeType === "NEW" ? 'bg-emerald-100 text-emerald-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {stryke.strykeType}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Chart Dropdown */}
                    <td className="border border-gray-700 px-2 py-2 text-center align-middle relative">
                      <div className="relative">
                        <button
                          onClick={() => setChartDropdownOpen(chartDropdownOpen === `algo-${stryke.uuid}` ? null : `algo-${stryke.uuid}`)}
                          className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 transition-all duration-200 rounded-md border border-green-200 hover:border-green-400"
                          title="View Chart"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>

                        {chartDropdownOpen === `algo-${stryke.uuid}` && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[120px] py-2">
                            <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
                              Select Timeframe
                            </div>
                            {timeframes.map((tf) => (
                              <button
                                key={tf}
                                onClick={() => navigateToChart(stryke.instrumentKey, tf)}
                                className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 first:rounded-t last:rounded-b"
                              >
                                <span className="font-medium">{tf.toUpperCase()}</span>
                                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{stryke?.entryTime ? formatReadableDate(stryke?.entryTime) : 'N/A'}</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{stryke?.entryCandleClose ? `₹${stryke?.entryCandleClose.toFixed(2)}` : (stryke.entryTime ?? 'N/A')}</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        const entry = Number(stryke?.entryCandleClose ?? 0);
                        const maxPct = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : NaN;
                        const targetPct = isFinite(entry) && stryke?.target != null ? calculatePercentageDifference(entry, Number(stryke?.target)) : NaN;
                        let cls = 'text-gray-700';
                        if (isFinite(maxPct) && isFinite(targetPct)) {
                          if (maxPct > targetPct) cls = 'text-green-700 font-semibold';
                          else if (maxPct > 0 && maxPct < targetPct) cls = 'text-amber-500 font-semibold';
                        }
                        return <span className={cls}>₹{stryke?.target?.toFixed(2)} ({isFinite(targetPct) ? `${targetPct}` : 'N/A'} %)</span>;
                      })()
                    }</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        const entry = Number(stryke?.entryCandleClose ?? 0);
                        const maxPct = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : NaN;
                        const stopPct = isFinite(entry) && stryke?.stopLoss != null ? calculatePercentageDifference(entry, Number(stryke?.stopLoss)) : NaN;
                        let cls = 'text-gray-700';
                        if (isFinite(maxPct) && isFinite(stopPct)) {
                          if (maxPct < stopPct) cls = 'text-red-700 font-semibold';
                          else if (maxPct < 0) cls = 'text-amber-500 font-semibold';
                        }
                        return <span className={cls}>₹{stryke?.stopLoss?.toFixed(2)} ({isFinite(stopPct) ? `${stopPct}` : 'N/A'} %)</span>;
                      })()
                    }</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        const clsFor = (lab?: string | null) => {
                          if (!lab) return 'text-gray-600';
                          const v = (lab || '').toUpperCase();
                          if (v === 'LL' || v === 'LH') return 'text-amber-500 font-semibold';
                          if (v === 'HH' || v === 'HL') return 'text-green-700 font-semibold';
                          return 'text-gray-600';
                        };
                        return (
                          <>
                            <span className={clsFor(stryke?.prevSwingLabel)}>{stryke?.prevSwingLabel ?? 'N/A'}</span>
                            <span className="px-1">{' <- '}</span>
                            <span className={clsFor(stryke?.currentSwingLabel)}>{stryke?.currentSwingLabel ?? 'N/A'}</span>
                          </>
                        );
                      })()
                    }</td>

                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        const v = stryke?.minSwingProfits;
                        if (v == null) return 'N/A';
                        const num = Number(v);
                        const value = stryke?.minSwingProfits && stryke.minSwingProfits > 0 ? `${num.toFixed(2)} %` : "Above Resistance";
                        const cls = num > 3
                          ? 'text-green-700 font-semibold'
                          : (num >= 0.01 ? 'text-amber-500 font-semibold' : 'text-red-700 font-semibold');
                        return <span className={cls}>{value}</span>;
                      })()
                    }</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        const max = stryke?.maxSwingProfits != null ? Number(stryke.maxSwingProfits) : null;
                        const min = stryke?.minSwingProfits != null ? Number(stryke.minSwingProfits) : null;
                        const days = stryke?.daysTakenForMaxSwingProfits != null ? Number(stryke.daysTakenForMaxSwingProfits) : null;
                        if (max == null || !isFinite(max)) return 'N/A';

                        const display = Number(max).toFixed(2);
                        let cls = 'text-amber-500 font-semibold';
                        if (Number(max) === 0) cls = 'text-red-700 font-semibold';
                        else if (min != null && isFinite(min) && max > min) cls = 'text-green-700 font-semibold';

                        return (
                          <span className={cls}>{display}{" % "} {days != null ? `(${days} d)` : '(N/A)'}</span>
                        );
                      })()
                    }</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        if (stryke?.daysTakenForSupportTouch == null) return 'N/A';
                        if (Number(stryke.daysTakenForSupportTouch) === 0) {
                          const cls = 'text-green-600 font-semibold';
                          return <span className={cls}>{`No Hit`}</span>;
                        }
                        const supportDays = Number(stryke.daysTakenForSupportTouch);
                        const maxDays = stryke?.daysTakenForMaxSwingProfits != null && isFinite(Number(stryke.daysTakenForMaxSwingProfits))
                          ? Number(stryke.daysTakenForMaxSwingProfits)
                          : null;
                        const cls = (maxDays != null && supportDays < maxDays) ? 'text-red-700 font-semibold' : 'text-amber-500 font-semibold';
                        return <span className={cls}>{`${supportDays} days`}</span>;
                      })()
                    }</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">{
                      (() => {
                        if (stryke?.daysTakenForResistanceTouch == null) return 'N/A';
                        if (Number(stryke.daysTakenForResistanceTouch) === 0) {
                          const cls = 'text-red-700 font-semibold';
                          return <span className={cls}>{`No Hit`}</span>;
                        }
                        const resDays = Number(stryke.daysTakenForResistanceTouch);
                        const maxDays = stryke?.daysTakenForMaxSwingProfits != null && isFinite(Number(stryke.daysTakenForMaxSwingProfits))
                          ? Number(stryke.daysTakenForMaxSwingProfits)
                          : null;
                        let cls = 'text-amber-500 font-semibold';
                        if (maxDays != null) {
                          if (maxDays > resDays) cls = 'text-green-700 font-semibold';
                          else if (maxDays < resDays) cls = 'text-red-700 font-semibold';
                          else cls = 'text-green-700 font-semibold';
                        }
                        return <span className={cls}>{`${resDays} days`}</span>;
                      })()
                    }</td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">

                      {stryke && (() => {
                        console.log('algoAnalysis:', stryke);
                        console.log('algoAnalysis.emacross:', stryke.emacross);
                        console.log('algoAnalysis.emacross.emaData1H:', stryke.emacross?.emaData1H);

                        const cls = (stryke?.emacross?.emaData1H?.ema8 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                        console.log('Ema 1H-8', stryke?.emacross?.emaData1H?.ema8, stryke?.entryCandleClose, cls);
                        return (<span
                          role="button"
                          tabIndex={0}
                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                        >
                          <span>1H-8</span>
                        </span>);
                      })()}

                      {stryke && (() => {
                        const cls = (stryke?.emacross?.emaDataDay?.ema8 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                        return (<span
                          role="button"
                          tabIndex={0}
                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                        >
                          <span>1D-8</span>
                        </span>);
                      })()}

                    </td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">

                      {stryke && (() => {
                        const cls = (stryke?.emacross?.emaData1H?.ema30 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                        return (<span
                          role="button"
                          tabIndex={0}
                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                        >
                          <span>1H-30</span>
                        </span>);
                      })()}

                      {stryke && (() => {
                        const cls = (stryke?.emacross?.emaDataDay?.ema30 ?? 0) > (stryke?.entryCandleClose ?? 0) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800';
                        return (<span
                          role="button"
                          tabIndex={0}
                          className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${cls} cursor-pointer`}
                        >
                          <span>1D-30</span>
                        </span>);
                      })()}

                    </td>
                    <td className="border border-gray-700 px-4 py-2 text-center align-middle">
                      <div className="flex items-center justify-center space-x-2">
                        {(() => {
                          const p = getEmaBadgeProps(stryke, "algo", '15M');
                          return (
                            <span
                              title={p.title}
                              role="button"
                              tabIndex={0}
                              onClick={() => openCrossoverModal(stryke, "algo", '15M')}
                              onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '15M'); }}
                              className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                            >
                              <span>15M</span>
                              {(p.count ?? 0) > 0 && (
                                <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                              )}
                            </span>
                          );
                        })()}
                        {(() => {
                          const p = getEmaBadgeProps(stryke, "algo", '1H');
                          return (
                            <span
                              title={p.title}
                              role="button"
                              tabIndex={0}
                              onClick={() => openCrossoverModal(stryke, "algo", '1H')}
                              onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '1H'); }}
                              className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                            >
                              <span>1H</span>
                              {(p.count ?? 0) > 0 && (
                                <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                              )}
                            </span>
                          );
                        })()}
                        {(() => {
                          const p = getEmaBadgeProps(stryke, "algo", '4H');
                          return (
                            <span
                              title={p.title}
                              role="button"
                              tabIndex={0}
                              onClick={() => openCrossoverModal(stryke, "algo", '4H')}
                              onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '4H'); }}
                              className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                            >
                              <span>4H</span>
                              {(p.count ?? 0) > 0 && (
                                <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                              )}
                            </span>
                          );
                        })()}
                        {(() => {
                          const p = getEmaBadgeProps(stryke, "algo", '1D');
                          return (
                            <span
                              title={p.title}
                              role="button"
                              tabIndex={0}
                              onClick={() => openCrossoverModal(stryke, "algo", '1D')}
                              onKeyDown={(e) => { if (e.key === 'Enter') openCrossoverModal(stryke, "algo", '1D'); }}
                              className={`relative inline-flex items-center text-xs px-2 py-0.5 rounded-md ${p.cls} cursor-pointer`}
                            >
                              <span>1D</span>
                              {(p.count ?? 0) > 0 && (
                                <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] px-1 rounded-full">{p.count}</span>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Crossover Modal */}
      {crossoverModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{crossoverModal.companyName} — {crossoverModal.timeframe} Crossovers</h3>
              <button onClick={closeCrossoverModal} className="text-gray-600 hover:text-gray-900">Close</button>
            </div>
            {crossoverModal.list.length === 0 ? (
              <p className="text-sm text-gray-500">No crossover dates available.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-auto">
                {crossoverModal.list.map((dt, i) => (
                  <li key={dt + i} className="text-sm">{(() => {
                    if (!dt) return 'N/A';
                    const p = new Date(dt);
                    if (isNaN(p.getTime())) return dt;
                    // Show human-friendly date and time (avoid repeating the date twice)
                    return `${formatReadableDate(dt)} — ${p.toLocaleTimeString()}`;
                  })()}</li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={closeCrossoverModal} className="px-3 py-1 rounded-md bg-blue-500 text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StrikeAnalysisTable;