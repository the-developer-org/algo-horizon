'use client';

import React, { useState } from 'react';
import { AnalysisResponse } from '@/types/analysis';
import { useDeepDive } from '@/context/DeepDiveContext';

export default function DeepDivePage() {
  // Deep Dive view mode: NONE | RR_1_1 | RR_1_2 - default to RR_1_2 (1:2 mode)
  const [deepDiveMode, setDeepDiveMode] = useState<'NONE' | 'RR_1_1' | 'RR_1_2'>('RR_1_2');

  // Get data from context
  const { deepDiveData } = useDeepDive();

  // Derived deep dive list based on current mode & existing filtered list
  const deepDiveList = React.useMemo(() => {
    if (deepDiveMode === 'NONE') return [] as AnalysisResponse[];
    return deepDiveData.filter(item => {
      if (!item.analysisDeepDive) return false;
      if (deepDiveMode === 'RR_1_1') return !!item.analysisDeepDive.swingLabels1;
      if (deepDiveMode === 'RR_1_2') return !!item.analysisDeepDive.swingLabels2;
      return false;
    });
  }, [deepDiveMode, deepDiveData]);

  return (
    <div className="flex justify-start py-4 px-4 bg-cream">
      <div className="w-full max-w-screen-2xl ml-24 mr-0">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Deep Dive Analysis</h1>
            <a
              href="/strike-analysis"
              className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
            >
              Back to Strike Analysis
            </a>
          </div>
        </div>

        {/* Deep Dive Controls */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <span className="text-lg font-semibold text-gray-700">Deep Dive Mode:</span>

          {/* Deep Dive Buttons */}
          <div className="flex gap-2 ml-2">
            <button
              className={`px-3 py-1 rounded-md text-white transition-colors ${deepDiveMode === 'RR_1_1' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'}`}
              onClick={() => setDeepDiveMode(prev => prev === 'RR_1_1' ? 'NONE' : 'RR_1_1')}
              title="Toggle Deep Dive 1:1 (swingLabels1)"
            >
              Deep Dive 1:1
            </button>
            <button
              className={`px-3 py-1 rounded-md text-white transition-colors ${deepDiveMode === 'RR_1_2' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'}`}
              onClick={() => setDeepDiveMode(prev => prev === 'RR_1_2' ? 'NONE' : 'RR_1_2')}
              title="Toggle Deep Dive 1:2 (swingLabels2)"
            >
              Deep Dive 1:2
            </button>
          </div>

          <span className="text-lg font-bold ml-4">Count: {deepDiveList.length}</span>
        </div>

        {/* Deep Dive Panel */}
        {deepDiveMode !== 'NONE' && (
          <div className="w-full bg-white border border-gray-300 rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-gray-800">
                Deep Dive View: {deepDiveMode === 'RR_1_1' ? '1:1 (swingLabels1)' : '1:2 (swingLabels2)'}
              </h3>
              <span className="text-sm text-gray-600">Matches: {deepDiveList.length}</span>
            </div>
            {deepDiveList.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No Deep Dive candidates found for current filters.
                {deepDiveData.length === 0 && " Please navigate from Strike Analysis page with filtered data."}
              </div>
            ) : (
              <div className="overflow-auto max-h-[600px]">
                <table className="table-auto w-full border-collapse border border-gray-300 text-center text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-3 py-2">Slno</th>
                      <th className="border border-gray-300 px-3 py-2">Company</th>
                      <th className="border border-gray-300 px-3 py-2">Prev Label</th>
                      <th className="border border-gray-300 px-3 py-2">Current Label</th>
                      <th className="border border-gray-300 px-3 py-2">Swing Label</th>
                      <th className="border border-gray-300 px-3 py-2">Prelude</th>
                      <th className="border border-gray-300 px-3 py-2">Passing</th>
                      <th className="border border-gray-300 px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deepDiveList.map((item, idx) => {
                      const dd = item.analysisDeepDive;
                      const isOneOne = deepDiveMode === 'RR_1_1';
                      const swingLabel = isOneOne ? dd?.swingLabels1 : dd?.swingLabels2;
                      const prelude = isOneOne ? dd?.prelude1 : dd?.prelude2;
                      const passing = isOneOne ? dd?.passing1 : dd?.passing2;
                      // Color logic: both prelude & passing true => green, else amber.
                      const statusColor = prelude && passing ? 'bg-green-100 text-green-700 border-green-300' : 'bg-amber-100 text-amber-700 border-amber-300';
                      return (
                        <tr key={`${item.uuid}-${deepDiveMode}`} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-1">{idx + 1}</td>
                          <td className="border border-gray-200 px-3 py-1 text-left">{item.companyName}</td>
                          <td className="border border-gray-200 px-3 py-1">{item.prevSwingLabel}</td>
                          <td className="border border-gray-200 px-3 py-1">{item.currentSwingLabel}</td>
                          <td className="border border-gray-200 px-3 py-1 font-mono text-xs">{swingLabel || '—'}</td>
                          <td className="border border-gray-200 px-3 py-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${prelude ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{prelude ? 'Yes' : 'No'}</span>
                          </td>
                          <td className="border border-gray-200 px-3 py-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${passing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{passing ? 'Yes' : 'No'}</span>
                          </td>
                          <td className="border border-gray-200 px-3 py-1">
                            <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${statusColor}`}>{prelude && passing ? 'Ready' : 'Building'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {deepDiveMode === 'NONE' && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Select a Deep Dive mode to view analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}