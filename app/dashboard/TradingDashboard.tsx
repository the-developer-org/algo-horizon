"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have the upstox_token cookie
    const checkAuthentication = async () => {
      try {
        // You can add an API endpoint to validate the token if needed
        const token = document.cookie.includes('upstox_token');
        
        if (!token) {
          // If no token is found, redirect to home page
          router.push('/');
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to authenticate. Please try logging in again.');
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h1>
            <p className="text-gray-600">
              You have successfully authenticated with Upstox!
            </p>
            {/* Add your dashboard content here */}
          </div>
        </div>
      </div>
    </div>
  );
}