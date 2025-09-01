"use client";

import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export const AdminPanel: React.FC = () => {
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
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="aspect-video rounded-xl bg-muted/50 p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Quick Stats</h3>
                <p className="text-gray-400">System overview and key metrics</p>
              </div>
              <div className="aspect-video rounded-xl bg-muted/50 p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Recent Activity</h3>
                <p className="text-gray-400">Latest system activities and logs</p>
              </div>
              <div className="aspect-video rounded-xl bg-muted/50 p-4">
                <h3 className="text-lg font-semibold text-white mb-2">System Health</h3>
                <p className="text-gray-400">Current system status and health</p>
              </div>
            </div>
            
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-white mb-4">Welcome to Admin Panel</h2>
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
