"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast, { Toaster } from 'react-hot-toast';
import { Timeframe } from './utils/timeframeUtils';
import { useAdminTracking } from './useAdminTracking';
import { calculateCacheSize, checkSystemHealth } from './utils/adminUtils';

interface DataUsageStats {
  totalApiCalls: number;
  dataPointsProcessed: number;
  cacheHitRatio: number;
  avgResponseTime: number;
  lastUpdated: Date;
}

interface BulkDownloadProgress {
  isRunning: boolean;
  currentSymbol: string;
  completed: number;
  total: number;
  errors: string[];
}

export const AdminPanel: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'data' | 'cache' | 'monitoring' | 'bulk'>('data');
  const { getStats, clearData } = useAdminTracking();
  
  // Data Management State
  const [selectedTimeframes, setSelectedTimeframes] = useState<Timeframe[]>(['1d']);
  const [symbolList, setSymbolList] = useState<string>('');
  const [batchSize, setBatchSize] = useState<number>(10);
  
  // Cache Management State
  const [cacheInfo, setCacheInfo] = useState({ totalSizeMB: 0, entryCount: 0, entries: [] as any[] });
  
  // Monitoring State
  const [dataUsage, setDataUsage] = useState({
    totalApiCalls: 0,
    totalDataPoints: 0,
    cacheHitRatio: 0,
    avgResponseTime: 0,
    lastUpdated: new Date()
  });
  
  // Bulk Download State
  const [bulkProgress, setBulkProgress] = useState<BulkDownloadProgress>({
    isRunning: false,
    currentSymbol: '',
    completed: 0,
    total: 0,
    errors: []
  });

  // System Health State
  const [systemHealth, setSystemHealth] = useState<{ status: 'healthy' | 'warning' | 'critical'; checks: { name: string; status: 'pass' | 'warning' | 'fail'; message: string; }[] }>({
    status: 'healthy',
    checks: []
  });

  // Initialize admin data
  useEffect(() => {
    loadCacheStats();
    loadDataUsageStats();
    loadSystemHealth();
  }, []);

  const loadCacheStats = useCallback(() => {
    try {
      const info = calculateCacheSize();
      setCacheInfo(info);
    } catch (error) {
      console.error('Error loading cache stats:', error);
      toast.error('Failed to load cache statistics');
    }
  }, []);

  const loadDataUsageStats = useCallback(() => {
    try {
      const stats = getStats(24);
      setDataUsage(stats);
    } catch (error) {
      console.error('Error loading data usage stats:', error);
      toast.error('Failed to load usage statistics');
    }
  }, [getStats]);

  const loadSystemHealth = useCallback(() => {
    try {
      const health = checkSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Error checking system health:', error);
      toast.error('Failed to check system health');
    }
  }, []);

  const clearAllCaches = useCallback(() => {
    const loadingToast = toast.loading('Clearing all caches...');
    try {
      // Clear timeframe and chart caches
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('timeframe_cache_') || 
        key.startsWith('chart_data_') ||
        key.startsWith('processed_data_')
      );
      
      cacheKeys.forEach(key => localStorage.removeItem(key));
      
      // Clear session storage caches
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('temp_cache_') || 
        key.startsWith('api_cache_')
      );
      
      sessionKeys.forEach(key => sessionStorage.removeItem(key));
      
      loadCacheStats();
      toast.success(`Cleared ${cacheKeys.length + sessionKeys.length} cache entries`, {
        id: loadingToast
      });
    } catch (error) {
      toast.error('Failed to clear caches', { id: loadingToast });
      console.error('Error clearing caches:', error);
    }
  }, [loadCacheStats]);

  const bulkDownloadData = useCallback(async () => {
    if (!symbolList.trim()) {
      toast.error('Please enter symbol list');
      return;
    }

    const symbols = symbolList.split(',').map(s => s.trim()).filter(s => s);
    const loadingToast = toast.loading('Starting bulk download...');
    
    setBulkProgress({
      isRunning: true,
      currentSymbol: '',
      completed: 0,
      total: symbols.length * selectedTimeframes.length,
      errors: []
    });

    try {
      const errors: string[] = [];
      let completed = 0;

      for (const symbol of symbols) {
        for (const timeframe of selectedTimeframes) {
          setBulkProgress(prev => ({
            ...prev,
            currentSymbol: `${symbol} (${timeframe})`,
            completed
          }));

          try {
            // Simulate API call - replace with actual bulk download logic
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Here you would call fetchPaginatedUpstoxData or similar
            // const result = await fetchPaginatedUpstoxData({
            //   instrumentKey: symbol,
            //   timeframe,
            //   ...otherParams
            // });
            
            completed++;
          } catch (error) {
            errors.push(`${symbol} (${timeframe}): ${error}`);
          }
        }
      }

      setBulkProgress(prev => ({
        ...prev,
        isRunning: false,
        completed,
        errors
      }));

      toast.success(`Bulk download completed. ${completed}/${symbols.length * selectedTimeframes.length} successful`, {
        id: loadingToast
      });
    } catch (error) {
      toast.error('Bulk download failed', { id: loadingToast });
      setBulkProgress(prev => ({ ...prev, isRunning: false }));
    }
  }, [symbolList, selectedTimeframes]);

  const optimizeDatabase = useCallback(async () => {
    const loadingToast = toast.loading('Optimizing database...');
    try {
      // Simulate database optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Database optimization completed', { id: loadingToast });
    } catch (error) {
      toast.error('Database optimization failed', { id: loadingToast });
    }
  }, []);

  const TabButton = ({ tab, label, isActive, onClick }: {
    tab: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <Button
      onClick={onClick}
      className={`px-6 py-2 rounded-lg font-medium transition-all ${
        isActive
          ? 'bg-green-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label}
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Control data-intensive operations and system optimization</p>
        </div>
        <Button
          onClick={() => router.push('/')}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          ← Back to Dashboard
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton
          tab="data"
          label="Data Management"
          isActive={activeTab === 'data'}
          onClick={() => setActiveTab('data')}
        />
        <TabButton
          tab="cache"
          label="Cache Control"
          isActive={activeTab === 'cache'}
          onClick={() => setActiveTab('cache')}
        />
        <TabButton
          tab="monitoring"
          label="System Monitoring"
          isActive={activeTab === 'monitoring'}
          onClick={() => setActiveTab('monitoring')}
        />
        <TabButton
          tab="bulk"
          label="Bulk Operations"
          isActive={activeTab === 'bulk'}
          onClick={() => setActiveTab('bulk')}
        />
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Data Processing Control</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Batch Processing Size</Label>
                  <Input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    min="1"
                    max="100"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Data Retention (Days)</Label>
                  <Input
                    type="number"
                    defaultValue="30"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    min="1"
                    max="365"
                  />
                </div>
                
                <Button
                  onClick={optimizeDatabase}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Optimize Database
                </Button>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">API Rate Limiting</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Requests per Minute</Label>
                  <Input
                    type="number"
                    defaultValue="60"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    min="1"
                    max="300"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Concurrent Requests</Label>
                  <Input
                    type="number"
                    defaultValue="5"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    min="1"
                    max="20"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    Pause API
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Resume API
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Cache Control Tab */}
        {activeTab === 'cache' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Cache Statistics</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Cache Size:</span>
                  <span className="text-white font-mono">{cacheInfo.totalSizeMB.toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Cache Entries:</span>
                  <span className="text-white font-mono">{cacheInfo.entryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Hit Ratio:</span>
                  <span className="text-green-400 font-mono">{dataUsage.cacheHitRatio.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <Button
                  onClick={clearAllCaches}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Clear All Caches
                </Button>
                <Button
                  onClick={loadCacheStats}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Refresh Stats
                </Button>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Cache Management</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Cache Expiry (Hours)</Label>
                  <Input
                    type="number"
                    defaultValue="24"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    min="1"
                    max="168"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Max Cache Size (MB)</Label>
                  <Input
                    type="number"
                    defaultValue="500"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    min="10"
                    max="2000"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    Compress Cache
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    Export Cache
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* System Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Performance</h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm">Total API Calls</div>
                  <div className="text-white text-2xl font-mono">{dataUsage.totalApiCalls.toLocaleString()}</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm">Data Points</div>
                  <div className="text-white text-2xl font-mono">{dataUsage.totalDataPoints.toLocaleString()}</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm">Avg Response</div>
                  <div className="text-white text-2xl font-mono">{dataUsage.avgResponseTime}ms</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm">Cache Hit Rate</div>
                  <div className="text-green-400 text-2xl font-mono">{dataUsage.cacheHitRatio.toFixed(1)}%</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Health</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Overall Status:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    systemHealth.status === 'healthy' ? 'bg-green-600 text-white' :
                    systemHealth.status === 'warning' ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                  </span>
                </div>
                
                {systemHealth.checks.map((check, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-300">{check.name}:</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        check.status === 'pass' ? 'bg-green-600 text-white' :
                        check.status === 'warning' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Last Update:</span>
                  <span className="text-white text-sm">{dataUsage.lastUpdated.toLocaleString()}</span>
                </div>
                
                <Button
                  onClick={loadSystemHealth}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                >
                  Refresh Health Check
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Bulk Operations Tab */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Bulk Data Download</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Symbol List (comma-separated)</Label>
                  <textarea
                    value={symbolList}
                    onChange={(e) => setSymbolList(e.target.value)}
                    className="w-full h-32 bg-gray-700 border-gray-600 text-white mt-1 p-2 rounded"
                    placeholder="AAPL, GOOGL, MSFT, TSLA..."
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Timeframes</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {(['1m', '5m', '15m', '1h', '4h', '1d'] as Timeframe[]).map(tf => (
                      <label key={tf} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedTimeframes.includes(tf)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTimeframes([...selectedTimeframes, tf]);
                            } else {
                              setSelectedTimeframes(selectedTimeframes.filter(t => t !== tf));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-white text-sm">{tf}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <Button
                  onClick={bulkDownloadData}
                  disabled={bulkProgress.isRunning}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {bulkProgress.isRunning ? 'Downloading...' : 'Start Bulk Download'}
                </Button>
              </div>
            </Card>

            {/* Bulk Progress */}
            {bulkProgress.isRunning && (
              <Card className="bg-gray-800 border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Download Progress</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Current:</span>
                    <span className="text-white">{bulkProgress.currentSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Progress:</span>
                    <span className="text-white">{bulkProgress.completed}/{bulkProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
