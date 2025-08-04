"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SupportAndResistance } from '../../components/types/support-resistance';
import { IncompleteCompaniesTable } from '../../components/IncompleteCompaniesTable';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function IncompleteCompaniesPage() {
  const [companies, setCompanies] = useState<Record<string, SupportAndResistance>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);

  useEffect(() => {
    fetchIncompleteCompanies();
  }, []);

  const fetchIncompleteCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${backEndBaseUrl}/api/local-historical-data/get-incomplete-companies`);
      console.log('API Response:', response.data.incompleteList);
      
      // Store raw response for debugging
      setRawApiResponse(response.data.incompleteList);
      
      if (response.data.incompleteList) {
        setCompanies(response.data.incompleteList);
        toast.success('Incomplete companies data loaded successfully');
      } else {
        console.error('API returned empty response');
        setError('API returned empty response');
        toast.error('Failed to load incomplete companies data');
      }
    } catch (err) {
      console.error('Error fetching incomplete companies:', err);
      setError('Failed to fetch incomplete companies data');
      toast.error('Failed to load incomplete companies data');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
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
    
    if (Object.keys(companies).length === 0) {
      return (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-medium">No incomplete companies data available.</p>
          <p className="text-sm mt-2">The API returned successfully, but no data was found.</p>
        </div>
      );
    }
    
    return <IncompleteCompaniesTable data={companies} />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Incomplete Companies</h1>
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
            href="/backtest-stats"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2h10a1 1 0 100-2H3zm0 4a1 1 0 000 2h6a1 1 0 100-2H3zm0 4a1 1 0 100 2h6a1 1 0 100-2H3z" clipRule="evenodd" />
            </svg>
            Backtest Stats
          </Link>
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md transition text-sm"
          >
            {showDevTools ? 'Hide Debug' : 'Show Debug'}
          </button>
          <button
            onClick={fetchIncompleteCompanies}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {showDevTools && rawApiResponse && (
        <div className="mb-6 p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto max-h-96">
          <h3 className="text-lg font-bold text-white mb-2">API Response Debug</h3>
          <div className="mb-4">
            <h4 className="text-md font-semibold text-yellow-300">Response Type:</h4>
            <pre className="text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded">
              {(() => {
                if (typeof rawApiResponse === 'object') {
                  const keys = Object.keys(rawApiResponse);
                  const keysCount = keys.length;
                  const displayKeys = keys.slice(0, 10).join(', ');
                  const suffix = keysCount > 10 ? '...' : '';
                  return `Object with ${keysCount} keys: [${displayKeys}${suffix}]`;
                }
                return typeof rawApiResponse;
              })()}
            </pre>
          </div>
          <div>
            <h4 className="text-md font-semibold text-yellow-300">Raw Response Sample:</h4>
            <pre className="text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(rawApiResponse).slice(0, 5)
                ), 
                null, 2
              )}
              {Object.keys(rawApiResponse).length > 5 ? '\n... (showing 5 of ' + Object.keys(rawApiResponse).length + ' items)' : ''}
            </pre>
          </div>
        </div>
      )}

      {renderContent()}
    </div>
  );
}
