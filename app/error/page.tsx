"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error') || 'An unknown error occurred';
  const details = searchParams?.get('details');
  
  let parsedDetails = null;
  try {
    parsedDetails = details ? JSON.parse(details) : null;
  } catch (e) {
    console.error('Failed to parse error details:', e);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">🚨 Upstox Authentication Error</h2>
            <p className="text-gray-600 text-lg mb-4">{error}</p>
          </div>
          
          {parsedDetails && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">🔍 Debug Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(parsedDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                href="/auth/upstox-management"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔙 Back to Upstox Management
              </Link>
              <Link 
                href="/"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                🏠 Return to Home
              </Link>
            </div>
            
            <div className="text-sm text-gray-500 mt-4">
              <p>💡 <strong>Tips:</strong></p>
              <ul className="text-left mt-2 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Verify environment variables are set correctly</li>
                <li>• Ensure Upstox app credentials are valid</li>
                <li>• Check server logs for more details</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}