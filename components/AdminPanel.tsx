"use client";

import React, { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import toast from 'react-hot-toast';

export const AdminPanel: React.FC = () => {
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [isRedeployed, setIsRedeployed] = useState(false);

  const checkHealthStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch('https://algo-horizon.store/api/admin/health-check/check');
      if (!response.ok) {
        return false;
      }

      const result = await response.text();
      return result.trim() === 'Health Check Done';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  };

  const pollHealthCheck = async () => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      const isHealthy = await checkHealthStatus();

      if (isHealthy) {
        setIsRedeploying(false);
        setIsRedeployed(true);
        toast.success('Server redeployed successfully and is healthy!');
        return;
      }

      if (attempts >= maxAttempts) {
        setIsRedeploying(false);
        toast.error('Health check timeout. Please verify server status manually.');
        return;
      }

      setTimeout(poll, 5000);
    };

    setTimeout(poll, 10000);
  };

  const handleRedeploy = async () => {
    if (isRedeploying || isRedeployed) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to redeploy the server? This may cause downtime.');
    if (!confirmed) {
      return;
    }

    try {
      setIsRedeploying(true);
      setIsRedeployed(false);

      const response = await fetch('https://algo-horizon.store/api/admin/redeploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      toast.success('Redeploy triggered successfully. Monitoring health status...');
      await pollHealthCheck();
    } catch (error) {
      console.error('Redeploy failed:', error);
      setIsRedeploying(false);
      toast.error('Failed to trigger redeploy');
    }
  };

  let redeployButtonClass = 'bg-rose-600 hover:bg-rose-700';
  let redeployButtonLabel = 'Redeploy Server';

  if (isRedeploying) {
    redeployButtonClass = 'bg-yellow-500 cursor-not-allowed';
    redeployButtonLabel = 'Redeploying...';
  } else if (isRedeployed) {
    redeployButtonClass = 'bg-green-600 cursor-not-allowed';
    redeployButtonLabel = 'Redeployed';
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Header with sidebar trigger */}
          <div className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-sidebar-border" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="aspect-video rounded-xl bg-muted/50 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Stats</h3>
                <p className="text-gray-400">System overview and key metrics</p>
              </div>
              <div className="aspect-video rounded-xl bg-muted/50 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
                <p className="text-gray-400">Latest system activities and logs</p>
              </div>
              <div className="aspect-video rounded-xl bg-muted/50 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">System Health</h3>
                <p className="text-gray-400 mb-3">Current system status and health</p>
                <button
                  className={`px-3 py-2 rounded-md text-white text-sm ${redeployButtonClass}`}
                  onClick={handleRedeploy}
                  disabled={isRedeploying || isRedeployed}
                >
                  {redeployButtonLabel}
                </button>
                {isRedeploying && (
                  <p className="text-yellow-700 text-xs mt-2">Checking server health after redeploy...</p>
                )}
                {isRedeployed && (
                  <p className="text-green-700 text-xs mt-2">Health check passed and server is live.</p>
                )}
              </div>
            </div>
            
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Admin Panel</h2>
                <p className="text-gray-400 mb-4">Select an option from the sidebar to get started</p>
                <p className="text-sm text-gray-500">This is your clean slate for building admin functionality</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
