"use client";

import { useEffect } from 'react';
import { AdminDataTracker } from './utils/adminUtils';

// Hook to automatically track data usage in admin panel
export const useAdminTracking = () => {
  const tracker = AdminDataTracker.getInstance();

  useEffect(() => {
    // Load existing metrics on mount
    tracker.loadFromStorage();
  }, [tracker]);

  // Functions to track different operations
  const trackApiCall = (responseTime: number, dataPoints: number) => {
    tracker.recordApiCall(responseTime, dataPoints);
  };

  const trackCacheHit = (dataPoints: number) => {
    tracker.recordCacheHit(dataPoints);
  };

  const getStats = (hoursBack: number = 24) => {
    return tracker.getAggregatedStats(hoursBack);
  };

  const exportData = () => {
    return tracker.exportMetrics();
  };

  const clearData = () => {
    tracker.clearMetrics();
  };

  return {
    trackApiCall,
    trackCacheHit,
    getStats,
    exportData,
    clearData
  };
};
