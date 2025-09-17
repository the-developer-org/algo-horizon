"use client";

import React, { useState, useEffect } from 'react';
import { PaperTradingDashboard } from './PaperTradingDashboard';
import { PaperTradingOrderForm } from './PaperTradingOrderForm';
import { PaperTradingOrdersTable } from './PaperTradingOrdersTable';
import { PaperTradeDashboard, PaperTradeOrder } from '../../components/types/paper-trading';
import { 
  getPaperTradeDashboard, 
  getAllPaperTradeOrders,
  getActivePaperTradeOrders,
  getCompletedPaperTradeOrders 
} from '../../components/utils/paperTradeApi';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, BarChart3, DollarSign } from "lucide-react";
import toast from 'react-hot-toast';

export default function PaperTradingPage() {
  const [dashboardData, setDashboardData] = useState<PaperTradeDashboard | null>(null);
  const [allOrders, setAllOrders] = useState<PaperTradeOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<PaperTradeOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<PaperTradeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch all data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [dashboard, all, active, completed] = await Promise.all([
        getPaperTradeDashboard(),
        getAllPaperTradeOrders(),
        getActivePaperTradeOrders(),
        getCompletedPaperTradeOrders()
      ]);

      setDashboardData(dashboard);
      setAllOrders(all);
      setActiveOrders(active);
      setCompletedOrders(completed);
    } catch (error) {
      console.error('Error fetching paper trading data:', error);
      toast.error('Failed to load paper trading data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOrderCreated = () => {
    setShowOrderForm(false);
    handleRefresh();
    toast.success('Order created successfully!');
  };

  const handleOrderAction = () => {
    handleRefresh();
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              Paper Trading
            </h1>
            <p className="text-gray-600 mt-1">
              Practice trading with virtual capital and track your performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowOrderForm(true)}
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        {dashboardData && (
          <PaperTradingDashboard data={dashboardData} />
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="all-orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="all-orders" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              All Orders ({allOrders.length})
            </TabsTrigger>
            <TabsTrigger value="active-orders" className="flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed-orders" className="flex items-center gap-2">
              <span className="h-2 w-2 bg-gray-500 rounded-full"></span>
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>
                  Complete history of all paper trading orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaperTradingOrdersTable 
                  orders={allOrders} 
                  onOrderAction={handleOrderAction}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Orders</CardTitle>
                <CardDescription>
                  Orders currently open and active in the market
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaperTradingOrdersTable 
                  orders={activeOrders} 
                  onOrderAction={handleOrderAction}
                  showActions={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Completed Orders</CardTitle>
                <CardDescription>
                  Orders that have been closed through exit or cancellation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaperTradingOrdersTable 
                  orders={completedOrders} 
                  onOrderAction={handleOrderAction}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Form Modal */}
        {showOrderForm && (
          <PaperTradingOrderForm
            onClose={() => setShowOrderForm(false)}
            onSuccess={handleOrderCreated}
            currentCapital={dashboardData?.currentCapital || 0}
          />
        )}
      </div>
    </div>
  );
}