"use client";

import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { useMarketData } from "@/context/MarketDataContext";

export default function TickDataPage() {
  const { ltpData, isConnected, connectionStatus, reconnect } = useMarketData();

  return (
    <SidebarInset className="flex min-h-screen flex-col overflow-y-auto py-6 px-4 bg-gradient-to-b from-sky-50 via-[var(--upx-primary-50)] to-[rgba(84,32,135,0.1)] dark:from-[#0b1220] dark:via-[#0a0f1a] dark:to-black">
      <div className="max-w-8xl w-full mx-auto rounded-2xl bg-white/70 dark:bg-slate-900/40 ring-1 ring-black/10 dark:ring-white/10 shadow-sm backdrop-blur p-4 sm:p-6 relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
          <h1 className="text-2xl font-bold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">
            Live Tick Data
          </h1>
          <div className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {connectionStatus}
          </div>
          <button
            onClick={reconnect}
            disabled={isConnected}
            className={`ml-2 px-3 py-1 text-sm rounded-md transition-colors ${
              isConnected 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' 
                : 'bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80'
            }`}
          >
            Reconnect
          </button>
        </div>

        {/* Tick Data Table */}
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Instrument</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">LTP</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Change</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Change %</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ltpData).map(([instrument, data]) => (
                  <tr key={instrument} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{instrument}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-gray-100">
                      ₹{data?.price && typeof data.price === 'number' ? data.price.toFixed(2) : 'N/A'}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono ${
                      data?.change && data.change > 0 ? 'text-green-600 dark:text-green-400' :
                      data?.change && data.change < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {data?.change && typeof data.change === 'number' ? (data.change > 0 ? '+' : '') + data.change.toFixed(2) : '-'}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono ${
                      data?.changePercent && data.changePercent > 0 ? 'text-green-600 dark:text-green-400' :
                      data?.changePercent && data.changePercent < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {data?.changePercent && typeof data.changePercent === 'number' ? (data.changePercent > 0 ? '+' : '') + data.changePercent.toFixed(2) + '%' : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {Object.keys(ltpData).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          connectionStatus === 'Market Closed' 
                            ? 'bg-gray-100 dark:bg-gray-800' 
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}>
                          {connectionStatus === 'Market Closed' ? (
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="font-medium mb-2">
                            {connectionStatus === 'Market Closed' 
                              ? 'Market is Currently Closed' 
                              : 'No Live Data Available'
                            }
                          </p>
                          <p className="text-xs text-center max-w-md mb-4">
                            {connectionStatus === 'Market Closed'
                              ? 'Live market data is only available during market hours (9:15 AM to 3:30 PM, Monday to Friday). Please check back during trading hours.'
                              : 'Unable to connect to the backend service. Please ensure your Spring Boot server is running and the SSE endpoint is accessible.'
                            }
                          </p>
                          {connectionStatus !== 'Market Closed' && (
                            <button
                              onClick={reconnect}
                              disabled={isConnected}
                              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                isConnected 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' 
                                  : 'bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80'
                              }`}
                            >
                              Try Reconnecting
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Connection Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Connection Status</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'Market Closed' 
                      ? 'bg-gray-500' 
                      : isConnected 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                  }`}></div>
                  <span>
                    {connectionStatus === 'Market Closed'
                      ? 'Market is closed - data unavailable outside trading hours'
                      : isConnected
                        ? 'Connected to backend SSE stream'
                        : 'Backend service unavailable - check server logs'
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {connectionStatus === 'Market Closed'
                    ? 'Next trading session: 9:15 AM - 3:30 PM (Mon-Fri)'
                    : isConnected
                      ? 'Receiving real-time market data from Upstox'
                      : 'No data will be displayed until backend connection is restored'
                  }
                </p>
              </div>
              <button
                onClick={reconnect}
                disabled={isConnected}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  isConnected 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' 
                    : 'bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80'
                }`}
              >
                Reconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}