// Admin utilities for tracking data usage and system performance

export interface DataUsageMetrics {
  apiCalls: number;
  dataPointsProcessed: number;
  cacheHits: number;
  cacheMisses: number;
  responseTime: number;
  timestamp: number;
}

export class AdminDataTracker {
  private static instance: AdminDataTracker;
  private metrics: DataUsageMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  static getInstance(): AdminDataTracker {
    if (!AdminDataTracker.instance) {
      AdminDataTracker.instance = new AdminDataTracker();
    }
    return AdminDataTracker.instance;
  }

  recordApiCall(responseTime: number, dataPoints: number): void {
    const metric: DataUsageMetrics = {
      apiCalls: 1,
      dataPointsProcessed: dataPoints,
      cacheHits: 0,
      cacheMisses: 1,
      responseTime,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.trimMetrics();
    this.saveToStorage();
  }

  recordCacheHit(dataPoints: number): void {
    const metric: DataUsageMetrics = {
      apiCalls: 0,
      dataPointsProcessed: dataPoints,
      cacheHits: 1,
      cacheMisses: 0,
      responseTime: 0,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.trimMetrics();
    this.saveToStorage();
  }

  getAggregatedStats(hoursBack: number = 24): {
    totalApiCalls: number;
    totalDataPoints: number;
    cacheHitRatio: number;
    avgResponseTime: number;
    lastUpdated: Date;
  } {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalApiCalls: 0,
        totalDataPoints: 0,
        cacheHitRatio: 0,
        avgResponseTime: 0,
        lastUpdated: new Date()
      };
    }

    const totals = recentMetrics.reduce((acc, metric) => ({
      apiCalls: acc.apiCalls + metric.apiCalls,
      dataPoints: acc.dataPoints + metric.dataPointsProcessed,
      cacheHits: acc.cacheHits + metric.cacheHits,
      cacheMisses: acc.cacheMisses + metric.cacheMisses,
      totalResponseTime: acc.totalResponseTime + metric.responseTime
    }), { apiCalls: 0, dataPoints: 0, cacheHits: 0, cacheMisses: 0, totalResponseTime: 0 });

    const totalCacheRequests = totals.cacheHits + totals.cacheMisses;
    const cacheHitRatio = totalCacheRequests > 0 ? (totals.cacheHits / totalCacheRequests) * 100 : 0;
    const avgResponseTime = totals.apiCalls > 0 ? totals.totalResponseTime / totals.apiCalls : 0;

    return {
      totalApiCalls: totals.apiCalls,
      totalDataPoints: totals.dataPoints,
      cacheHitRatio,
      avgResponseTime: Math.round(avgResponseTime),
      lastUpdated: new Date()
    };
  }

  exportMetrics(): DataUsageMetrics[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.saveToStorage();
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('admin_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save metrics to localStorage:', error);
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('admin_metrics');
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load metrics from localStorage:', error);
      this.metrics = [];
    }
  }
}

// Cache size calculator
export const calculateCacheSize = (): {
  totalSizeBytes: number;
  totalSizeMB: number;
  entryCount: number;
  entries: { key: string; sizeBytes: number }[];
} => {
  const cacheEntries: { key: string; sizeBytes: number }[] = [];
  let totalSize = 0;

  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('timeframe_cache_') ||
      key.startsWith('chart_data_') ||
      key.startsWith('processed_data_') ||
      key.startsWith('api_cache_')
    )) {
      const value = localStorage.getItem(key);
      if (value) {
        const sizeBytes = new Blob([value]).size;
        cacheEntries.push({ key, sizeBytes });
        totalSize += sizeBytes;
      }
    }
  }

  // Check sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('temp_cache_') ||
      key.startsWith('session_cache_')
    )) {
      const value = sessionStorage.getItem(key);
      if (value) {
        const sizeBytes = new Blob([value]).size;
        cacheEntries.push({ key: `[Session] ${key}`, sizeBytes });
        totalSize += sizeBytes;
      }
    }
  }

  return {
    totalSizeBytes: totalSize,
    totalSizeMB: totalSize / (1024 * 1024),
    entryCount: cacheEntries.length,
    entries: cacheEntries.sort((a, b) => b.sizeBytes - a.sizeBytes)
  };
};

// System health checker
export const checkSystemHealth = (): {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }[];
} => {
  const checks = [];
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

  // Check cache size
  const cacheInfo = calculateCacheSize();
  if (cacheInfo.totalSizeMB > 100) {
    checks.push({
      name: 'Cache Size',
      status: 'warning' as const,
      message: `Cache size is ${cacheInfo.totalSizeMB.toFixed(1)}MB (consider clearing)`
    });
    overallStatus = 'warning';
  } else {
    checks.push({
      name: 'Cache Size',
      status: 'pass' as const,
      message: `Cache size is ${cacheInfo.totalSizeMB.toFixed(1)}MB`
    });
  }

  // Check localStorage availability
  try {
    localStorage.setItem('health_check', 'test');
    localStorage.removeItem('health_check');
    checks.push({
      name: 'Local Storage',
      status: 'pass' as const,
      message: 'Local storage is accessible'
    });
  } catch (error) {
    checks.push({
      name: 'Local Storage',
      status: 'fail' as const,
      message: 'Local storage is not accessible'
    });
    overallStatus = 'critical';
  }

  // Check metrics tracking
  const tracker = AdminDataTracker.getInstance();
  const stats = tracker.getAggregatedStats(1); // Last hour
  if (stats.totalApiCalls > 0) {
    checks.push({
      name: 'Metrics Tracking',
      status: 'pass' as const,
      message: `Tracking ${stats.totalApiCalls} API calls in last hour`
    });
  } else {
    checks.push({
      name: 'Metrics Tracking',
      status: 'warning' as const,
      message: 'No recent API activity detected'
    });
  }

  // Check memory usage (rough estimate)
  const memoryUsed = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryLimit = (performance as any).memory?.jsHeapSizeLimit || 0;
  
  if (memoryUsed > 0 && memoryLimit > 0) {
    const memoryPercent = (memoryUsed / memoryLimit) * 100;
    if (memoryPercent > 80) {
      checks.push({
        name: 'Memory Usage',
        status: 'warning' as const,
        message: `Memory usage is ${memoryPercent.toFixed(1)}%`
      });
      overallStatus = 'warning';
    } else {
      checks.push({
        name: 'Memory Usage',
        status: 'pass' as const,
        message: `Memory usage is ${memoryPercent.toFixed(1)}%`
      });
    }
  }

  return { status: overallStatus, checks };
};
