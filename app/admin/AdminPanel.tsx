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
    const adminPrivileges = sessionStorage.getItem('isAdmin') || localStorage.getItem('isAdmin');
    
    if (isAuthorized !== 'true') {
      router.replace('/auth');
    } else if (adminPrivileges !== 'true') {
      router.replace('/');
    } else {
      setIsAuthenticated(true);
      setIsAdmin(true);
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
    <main
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
      }}
    >
      <div className="min-h-screen bg-black bg-opacity-70">
        <AdminPanel />
      </div>
    </main>
  );
}
