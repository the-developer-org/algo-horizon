import React from 'react';
import { Button } from '@/components/ui/button';

interface FilterControlsProps {
  // Search and filter state
  strykeList: any[];
  filteredAnalysisList: any[];
  setFilteredAnalysisList: (list: any[]) => void;

  // Month filter
  selectedMonth: string | null;
  setSelectedMonth: (month: string | null) => void;

  // Analysis type toggles
  showAlgoAnalysis: boolean;
  setShowAlgoAnalysis: (show: boolean) => void;
  showStrykeAnalysis: boolean;
  setShowStrykeAnalysis: (show: boolean) => void;
  showFiboAnalysis: boolean;
  setShowFiboAnalysis: (show: boolean) => void;
  showOldAnalysis: boolean;
  setShowOldAnalysis: (show: boolean) => void;
  showAppAnalysis: boolean;
  setShowAppAnalysis: (show: boolean) => void;
  showDiscordAnalysis: boolean;
  setShowDiscordAnalysis: (show: boolean) => void;

  // Export function
  exportSwingStatsToExcel: () => void;

  // Active filter state
  activeFilter: any;
  setActiveFilter: (filter: any) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  strykeList,
  filteredAnalysisList,
  setFilteredAnalysisList,
  selectedMonth,
  setSelectedMonth,
  showAlgoAnalysis,
  setShowAlgoAnalysis,
  showStrykeAnalysis,
  setShowStrykeAnalysis,
  showFiboAnalysis,
  setShowFiboAnalysis,
  showOldAnalysis,
  setShowOldAnalysis,
  showAppAnalysis,
  setShowAppAnalysis,
  showDiscordAnalysis,
  setShowDiscordAnalysis,
  exportSwingStatsToExcel,
  activeFilter,
  setActiveFilter,
}) => {
  return (
    <div className="flex flex-wrap gap-1 items-center mb-4">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search by name..."
        className="border border-gray-300 rounded-md px-2 py-1"
        onChange={(e) => {
          const query = e.target.value.toLowerCase();
          setFilteredAnalysisList(
            strykeList.filter((stryke) =>
              stryke.companyName.toLowerCase().includes(query)
            )
          );
        }}
      />

      {/* Month Filter */}
      <select
        className="border border-gray-300 rounded-md px-2 py-1"
        value={selectedMonth || ''}
        onChange={(e) => {
          const monthYear = e.target.value;
          setSelectedMonth(monthYear || null);
          setFilteredAnalysisList(
            monthYear
              ? strykeList.filter((stryke) => {
                const addedMonthYear = new Date(stryke.entryTime).toLocaleString('default', { month: 'long', year: 'numeric' });
                return addedMonthYear === monthYear;
              })
              : strykeList
          );
        }}
      >
        <option value="">All Months</option>
        {Array.from(new Set(
          strykeList.map((stryke) =>
            new Date(stryke.entryTime).toLocaleString('default', { month: 'long', year: 'numeric' })
          )
        )).map((monthYear) => (
          <option key={monthYear} value={monthYear}>
            {monthYear}
          </option>
        ))}
      </select>

      {/* Export Swing Stats Button */}
      <button
        className="px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
        onClick={exportSwingStatsToExcel}
      >
        Export Swing Stats
      </button>

      {/* Reset Filters Button */}
      <button
        className="px-3 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white"
        onClick={() => {
          // Reset all active filters to their default state
          setActiveFilter({
            date: null,
            name: null,
            avgVolume: null,
            target: null,
            entry: null,
            stopLoss: null,
            trend: null,
            inResistanceZone: null,
            onePercChange: null,
            swingLabel: null,
            swingLabel2: null,
            swingLabelCombo: null,
            erLabel: null,
            erSort: null,
            profitSort: null,
            supportSort: null,
            resistanceSort: null,
            profitLabel: null,
            supportLabel: null,
            resistanceLabel: null,
          });

          setShowAlgoAnalysis(true)
          setShowStrykeAnalysis(true)
          setShowFiboAnalysis(true)
          setShowOldAnalysis(true)   // Reset OLD toggle
          setShowAppAnalysis(true)   // Reset APP toggle
          setShowDiscordAnalysis(true)   // Reset DISCORD toggle

          // Reset month selection
          setSelectedMonth(null);

          // Reset filtered list to original lists - this will be handled by the useEffect
          // setFilteredAnalysisList([...strykeAnalysisList, ...algoAnalysisList, ...fiboAnalysisList]);
        }}
      >
        Reset Filters
      </button>

      {/* Row 3: Analysis Toggle Buttons */}
      <div className="inline-flex items-center gap-2">
        <div className="flex flex-wrap gap-1 items-center">
          {!showAlgoAnalysis && (
            <Button
              onClick={() => {
                setShowAlgoAnalysis(true)
                // Filtered list will be updated by useEffect
              }}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 text-sm rounded-md transition"
            >
              Show Algo Analysis
            </Button>
          )}

          {showAlgoAnalysis && (
            <Button
              onClick={() => {
                setShowAlgoAnalysis(false)
                // Filtered list will be updated by useEffect
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Hide Algo Analysis
            </Button>
          )}

          {!showStrykeAnalysis && (
            <Button
              onClick={() => {
                setShowStrykeAnalysis(true)
                // Filtered list will be updated by useEffect
              }}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Show Stryke Analysis
            </Button>
          )}

          {showStrykeAnalysis && (
            <Button
              onClick={() => {
                setShowStrykeAnalysis(false)
                // Filtered list will be updated by useEffect
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Hide Stryke Analysis
            </Button>
          )}

          {!showFiboAnalysis && (
            <Button
              onClick={() => {
                setShowFiboAnalysis(true)
                // Filtered list will be updated by useEffect
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Show Fibo Analysis
            </Button>
          )}

          {showFiboAnalysis && (
            <Button
              onClick={() => {
                setShowFiboAnalysis(false)
                // Filtered list will be updated by useEffect
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Hide Fibo Analysis
            </Button>
          )}

          {/* NEW: OLD/APP/DISCORD Analysis Toggles */}
          {!showOldAnalysis && (
            <Button
              onClick={() => {
                setShowOldAnalysis(true)
                // Filtered list will be updated by useEffect
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Show OLD
            </Button>
          )}

          {showOldAnalysis && (
            <Button
              onClick={() => {
                setShowOldAnalysis(false)
                // Filtered list will be updated by useEffect
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Hide OLD
            </Button>
          )}

          {!showAppAnalysis && (
            <Button
              onClick={() => {
                setShowAppAnalysis(true)
                // Filtered list will be updated by useEffect
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Show APP
            </Button>
          )}

          {showAppAnalysis && (
            <Button
              onClick={() => {
                setShowAppAnalysis(false)
                // Filtered list will be updated by useEffect
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Hide APP
            </Button>
          )}

          {!showDiscordAnalysis && (
            <Button
              onClick={() => {
                setShowDiscordAnalysis(true)
                // Filtered list will be updated by useEffect
              }}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Show Discord
            </Button>
          )}

          {showDiscordAnalysis && (
            <Button
              onClick={() => {
                setShowDiscordAnalysis(false)
                // Filtered list will be updated by useEffect
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm rounded-md transition"
            >
              Hide Discord
            </Button>
          )}
        </div>
      </div>

      <span className="text-lg font-bold">Count: {filteredAnalysisList.length}</span>
    </div>
  );
};

export default FilterControls;