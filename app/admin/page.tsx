"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPanel } from '../../components/AdminPanel';

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and has admin privileges
    const isAuthorized = sessionStorage.getItem('isUserAuthorised');
    const currentUser = localStorage.getItem('currentUser');
    
    if (isAuthorized !== 'true') {
      router.replace('/auth');
    } else if (currentUser !== 'Abrar') {
      router.replace('/');
    } else {
      setIsAuthenticated(true);
      setIsAdmin(true);
      sessionStorage.setItem('isAdmin', 'true');
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <AdminPanel />
    </main>
  );
}
