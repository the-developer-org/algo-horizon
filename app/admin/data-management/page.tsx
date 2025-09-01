"use client";

import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "../../../components/app-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DataManagementPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-sidebar-border" />
              <h1 className="text-2xl font-bold text-white">Data Management</h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-gray-800 border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Data Sources</h3>
                <p className="text-gray-400 mb-4">Manage your data source connections</p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Configure Sources
                </Button>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Data Quality</h3>
                <p className="text-gray-400 mb-4">Monitor and ensure data quality</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  View Reports
                </Button>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Data Sync</h3>
                <p className="text-gray-400 mb-4">Synchronize data across systems</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Sync Now
                </Button>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Data Operations</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div>
                    <p className="text-white font-medium">Market data sync completed</p>
                    <p className="text-gray-400 text-sm">2 minutes ago</p>
                  </div>
                  <span className="text-green-400 text-sm">Success</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div>
                    <p className="text-white font-medium">Data quality check</p>
                    <p className="text-gray-400 text-sm">15 minutes ago</p>
                  </div>
                  <span className="text-yellow-400 text-sm">Warning</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div>
                    <p className="text-white font-medium">Database optimization</p>
                    <p className="text-gray-400 text-sm">1 hour ago</p>
                  </div>
                  <span className="text-green-400 text-sm">Completed</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
