import React from 'react';

interface Metrics {
  minProfitsAchieved: number,
  maxProfitsAchieved: number,
  lessThanMinProfits: number,
  supportsTouched: number,
  resistancesTouched: number,
  avgTimeTakenForProfits: number
  ErGap_L3: number,
  ErGap_G3: number
  ER_Gap_AR: number

  minProfitValue: number,
  maxProfitValue: number,
  avgProfitValue: number
}

interface MetricsDashboardProps {
  showMetrics: boolean;
  strykeMetrics: Metrics | null;
  algoMetrics: Metrics | null;
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  showMetrics,
  strykeMetrics,
  algoMetrics
}) => {
  if (!showMetrics) return null;

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-6 text-center">Metrics Dashboard - Comparative Analysis</h3>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Min Profits Achieved Comparison */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Min Profits Achieved  - Crossed ER-Gap</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-medium">Stryke:</span>
              <span className="text-xl font-bold text-blue-600">{strykeMetrics?.minProfitsAchieved || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-600 font-medium">Algo:</span>
              <span className="text-xl font-bold text-green-600">{algoMetrics?.minProfitsAchieved || 0}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Difference:</span>
                <span className={`font-bold ${(strykeMetrics?.minProfitsAchieved || 0) > (algoMetrics?.minProfitsAchieved || 0) ? 'text-blue-600' : (strykeMetrics?.minProfitsAchieved || 0) < (algoMetrics?.minProfitsAchieved || 0) ? 'text-green-600' : 'text-amber-500'}`}>
                  {Math.abs((strykeMetrics?.minProfitsAchieved || 0) - (algoMetrics?.minProfitsAchieved || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Max Profits Achieved Comparison */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Max Profits Achieved - Crossed the Target</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-medium">Stryke:</span>
              <span className="text-xl font-bold text-blue-600">{strykeMetrics?.maxProfitsAchieved || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-600 font-medium">Algo:</span>
              <span className="text-xl font-bold text-green-600">{algoMetrics?.maxProfitsAchieved || 0}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Difference:</span>
                <span className={`font-bold ${(strykeMetrics?.maxProfitsAchieved || 0) > (algoMetrics?.maxProfitsAchieved || 0) ? 'text-blue-600' : (strykeMetrics?.maxProfitsAchieved || 0) < (algoMetrics?.maxProfitsAchieved || 0) ? 'text-green-600' : 'text-amber-500'}`}>
                  {Math.abs((strykeMetrics?.maxProfitsAchieved || 0) - (algoMetrics?.maxProfitsAchieved || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Less Than Min Profits Comparison */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Less Than Min Profits - Less than ER-Gap</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-medium">Stryke:</span>
              <span className="text-xl font-bold text-red-600">{strykeMetrics?.lessThanMinProfits || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-600 font-medium">Algo:</span>
              <span className="text-xl font-bold text-red-600">{algoMetrics?.lessThanMinProfits || 0}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Difference:</span>
                <span className={`font-bold ${(strykeMetrics?.lessThanMinProfits || 0) < (algoMetrics?.lessThanMinProfits || 0) ? 'text-green-600' : (strykeMetrics?.lessThanMinProfits || 0) > (algoMetrics?.lessThanMinProfits || 0) ? 'text-red-600' : 'text-amber-500'}`}>
                  {Math.abs((strykeMetrics?.lessThanMinProfits || 0) - (algoMetrics?.lessThanMinProfits || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ER Gap Distribution Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-lg font-semibold text-blue-700 mb-4 text-center">Stryke Analysis - ER Gap Distribution</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{strykeMetrics?.ErGap_L3 || 0}</div>
              <div className="text-xs text-gray-600">{'< 3%'}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{strykeMetrics?.ErGap_G3 || 0}</div>
              <div className="text-xs text-gray-600">≥ 3%</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-600">{strykeMetrics?.ER_Gap_AR || 0}</div>
              <div className="text-xs text-gray-600">Above Resistance</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-lg font-semibold text-green-700 mb-4 text-center">Algo Analysis - ER Gap Distribution</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{algoMetrics?.ErGap_L3 || 0}</div>
              <div className="text-xs text-gray-600">{'< 3%'}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{algoMetrics?.ErGap_G3 || 0}</div>
              <div className="text-xs text-gray-600">≥ 3%</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-600">{algoMetrics?.ER_Gap_AR || 0}</div>
              <div className="text-xs text-gray-600">Above Resistance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Values and Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stryke Analysis Detailed Metrics */}
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h4 className="text-lg font-semibold text-blue-700 mb-4">Stryke Analysis Metrics</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded">
                <div className="font-medium text-gray-700">Supports Touched</div>
                <div className="text-xl font-bold text-amber-500">{strykeMetrics?.supportsTouched || 0}</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="font-medium text-gray-700">Resistances Touched</div>
                <div className="text-xl font-bold text-amber-500">{strykeMetrics?.resistancesTouched || 0}</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-gray-700 mb-2">Profit Values (%)</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-blue-600 font-bold">{strykeMetrics?.minProfitValue || 0}%</div>
                  <div className="text-xs">Min</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-bold">{strykeMetrics?.maxProfitValue || 0}%</div>
                  <div className="text-xs">Max</div>
                </div>
                <div className="text-center">
                  <div className="text-amber-500 font-bold">{strykeMetrics?.avgProfitValue || 0}%</div>
                  <div className="text-xs">Average</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-gray-700">Avg Time to Profits</div>
              <div className="text-xl font-bold text-blue-600">{strykeMetrics?.avgTimeTakenForProfits || 0} days</div>
            </div>
          </div>
        </div>

        {/* Algo Analysis Detailed Metrics */}
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <h4 className="text-lg font-semibold text-green-700 mb-4">Algo Analysis Metrics</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded">
                <div className="font-medium text-gray-700">Supports Touched</div>
                <div className="text-xl font-bold text-amber-500">{algoMetrics?.supportsTouched || 0}</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="font-medium text-gray-700">Resistances Touched</div>
                <div className="text-xl font-bold text-amber-500">{algoMetrics?.resistancesTouched || 0}</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-gray-700 mb-2">Profit Values (%)</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-blue-600 font-bold">{algoMetrics?.minProfitValue || 0}%</div>
                  <div className="text-xs">Min</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-bold">{algoMetrics?.maxProfitValue || 0}%</div>
                  <div className="text-xs">Max</div>
                </div>
                <div className="text-center">
                  <div className="text-amber-500 font-bold">{algoMetrics?.avgProfitValue || 0}%</div>
                  <div className="text-xs">Average</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-gray-700">Avg Time to Profits</div>
              <div className="text-xl font-bold text-blue-600">{algoMetrics?.avgTimeTakenForProfits || 0} days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison Progress Bar */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-4 text-center">Performance Comparison</h4>
        {(() => {
          const comparisons = [
            // Min Profits Achieved (higher is better)
            (strykeMetrics?.minProfitsAchieved || 0) > (algoMetrics?.minProfitsAchieved || 0) ? 'stryke' :
              (algoMetrics?.minProfitsAchieved || 0) > (strykeMetrics?.minProfitsAchieved || 0) ? 'algo' : null,

            // Max Profits Achieved (higher is better)
            (strykeMetrics?.maxProfitsAchieved || 0) > (algoMetrics?.maxProfitsAchieved || 0) ? 'stryke' :
              (algoMetrics?.maxProfitsAchieved || 0) > (strykeMetrics?.maxProfitsAchieved || 0) ? 'algo' : null,

            // Less Than Min Profits (lower is better)
            (strykeMetrics?.lessThanMinProfits || 0) < (algoMetrics?.lessThanMinProfits || 0) ? 'stryke' :
              (algoMetrics?.lessThanMinProfits || 0) < (strykeMetrics?.lessThanMinProfits || 0) ? 'algo' : null,

            // Supports Touched (higher is better)
            (strykeMetrics?.supportsTouched || 0) > (algoMetrics?.supportsTouched || 0) ? 'stryke' :
              (algoMetrics?.supportsTouched || 0) > (strykeMetrics?.supportsTouched || 0) ? 'algo' : null,

            // Resistances Touched (higher is better)
            (strykeMetrics?.resistancesTouched || 0) > (algoMetrics?.resistancesTouched || 0) ? 'stryke' :
              (algoMetrics?.resistancesTouched || 0) > (strykeMetrics?.resistancesTouched || 0) ? 'algo' : null,

            // Average Time to Profits (lower is better)
            (strykeMetrics?.avgTimeTakenForProfits || 0) < (algoMetrics?.avgTimeTakenForProfits || 0) ? 'stryke' :
              (algoMetrics?.avgTimeTakenForProfits || 0) < (strykeMetrics?.avgTimeTakenForProfits || 0) ? 'algo' : null,

            // Min Profit Value (higher is better)
            (strykeMetrics?.minProfitValue || 0) > (algoMetrics?.minProfitValue || 0) ? 'stryke' :
              (algoMetrics?.minProfitValue || 0) > (strykeMetrics?.minProfitValue || 0) ? 'algo' : null,

            // ER Gap < 3% (lower is better - fewer stocks below 3% gap is better)
            (strykeMetrics?.ErGap_L3 || 0) < (algoMetrics?.ErGap_L3 || 0) ? 'stryke' :
              (algoMetrics?.ErGap_L3 || 0) < (strykeMetrics?.ErGap_L3 || 0) ? 'algo' : null,

            // Above Resistance (AR) (lower is better - fewer AR cases is better)
            (strykeMetrics?.ER_Gap_AR || 0) < (algoMetrics?.ER_Gap_AR || 0) ? 'stryke' :
              (algoMetrics?.ER_Gap_AR || 0) < (strykeMetrics?.ER_Gap_AR || 0) ? 'algo' : null,

            // ER Gap >= 3% (higher is better)
            (strykeMetrics?.ErGap_G3 || 0) > (algoMetrics?.ErGap_G3 || 0) ? 'stryke' :
              (algoMetrics?.ErGap_G3 || 0) > (strykeMetrics?.ErGap_G3 || 0) ? 'algo' : null,

            // Average Profit Value (higher is better)
            (strykeMetrics?.avgProfitValue || 0) > (algoMetrics?.avgProfitValue || 0) ? 'stryke' :
              (algoMetrics?.avgProfitValue || 0) > (strykeMetrics?.avgProfitValue || 0) ? 'algo' : null,

            // Max Profit Value (higher is better)
            (strykeMetrics?.maxProfitValue || 0) > (algoMetrics?.maxProfitValue || 0) ? 'stryke' :
              (algoMetrics?.maxProfitValue || 0) > (strykeMetrics?.maxProfitValue || 0) ? 'algo' : null
          ];

          const strykeWins = comparisons.filter(result => result === 'stryke').length;
          const algoWins = comparisons.filter(result => result === 'algo').length;
          const totalComparisons = comparisons.filter(result => result !== null).length;

          const strykePercentage = totalComparisons > 0 ? (strykeWins / totalComparisons) * 100 : 0;
          const algoPercentage = totalComparisons > 0 ? (algoWins / totalComparisons) * 100 : 0;

          return (
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-blue-600 font-semibold">Stryke: {strykeWins} wins</span>
                <span className="text-green-600 font-semibold">Algo: {algoWins} wins</span>
              </div>

              <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${strykePercentage}%` }}
                >
                  {strykeWins > 0 && (
                    <span className="text-white text-xs font-semibold">{strykeWins}</span>
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full bg-green-500 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${algoPercentage}%` }}
                >
                  {algoWins > 0 && (
                    <span className="text-white text-xs font-semibold">{algoWins}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">{strykePercentage.toFixed(1)}%</span>
                <span className="text-sm font-medium text-gray-800">
                  {strykeWins > algoWins ? '🏆 Stryke Leads' :
                    algoWins > strykeWins ? '🏆 Algo Leads' :
                      '🤝 Tied Performance'}
                </span>
                <span className="text-sm text-gray-600">{algoPercentage.toFixed(1)}%</span>
              </div>

              <div className="text-center mt-2">
                <span className="text-xs text-gray-500">
                  Based on {totalComparisons} performance metrics
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default MetricsDashboard;