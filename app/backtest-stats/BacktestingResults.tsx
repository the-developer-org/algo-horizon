"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BackTestStats } from '../../components/types/backtest-stats';
import { BackTestStatsTable } from '../../components/BackTestStatsTable';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function BackTestStatsPage() {
  // Use a simplified type matching the backend's Map<String, List<BackTestStats>>
  const [stats, setStats] = useState<Record<string, BackTestStats[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);

  useEffect(() => {
    fetchBackTestStats();
  }, []);

  const fetchBackTestStats = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${backEndBaseUrl}/api/chart-historical-data/back-test-stats`);
      console.log('API Response:', response.data.backTestStats); // Debug log
      
      // Store raw response for debugging
      setRawApiResponse(response.data.backTestStats);
      
      // Simply set the data directly - it's already in the format we expect
      if (response.data.backTestStats) {
        setStats(response.data.backTestStats);
        toast.success('Backtest stats loaded successfully');
      } else {
        console.error('API returned empty response');
        setError('API returned empty response');
        toast.error('Failed to load backtest stats');
      }
    } catch (err) {
      console.error('Error fetching backtest stats:', err);
      setError('Failed to fetch backtest stats data');
      toast.error('Failed to load backtest stats');
    } finally {
      setLoading(false);
    }
  };

  // Get the array of stats directly - simpler approach
  const statsArray = Object.values(stats).flat();

  // Determine what content to render based on state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      );
    }
    
    if (statsArray.length === 0) {
      return (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-medium">No backtest statistics available.</p>
          <p className="text-sm mt-2">The API returned successfully, but no data was found.</p>
        </div>
      );
    }
    
    return <BackTestStatsTable stats={statsArray} />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Overall Backtest Statistics</h1>
        <div className="flex gap-2">
          <Link 
            href="/chart"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Charts
          </Link>
          <Link 
            href="/incomplete-companies"
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Incomplete Companies
          </Link>
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md transition text-sm"
          >
            {showDevTools ? 'Hide Debug' : 'Show Debug'}
          </button>
          <button
            onClick={fetchBackTestStats}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition"
          >
            Refresh Stats
          </button>
        </div>
      </div>

      {showDevTools && rawApiResponse && (
        <div className="mb-6 p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto max-h-96">
          <h3 className="text-lg font-bold text-white mb-2">API Response Debug</h3>
          <div className="mb-4">
            <h4 className="text-md font-semibold text-yellow-300">Response Type:</h4>
            <pre className="text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded">
              {typeof rawApiResponse === 'object' 
                ? `Object with ${Object.keys(rawApiResponse).length} keys: [${Object.keys(rawApiResponse).join(', ')}]`
                : typeof rawApiResponse}
            </pre>
          </div>
          <div>
            <h4 className="text-md font-semibold text-yellow-300">Raw Response:</h4>
            <pre className="text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded">{JSON.stringify(rawApiResponse, null, 2)}</pre>
          </div>
          {statsArray.length > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-semibold text-yellow-300">Processed Data (First Item):</h4>
              <pre className="text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded">{JSON.stringify(statsArray[0], null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {renderContent()}
    </div>
  );
}
