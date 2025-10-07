"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PaperTradingDashboard } from './PaperTradingDashboard';
import { PaperTradingOrderForm } from './PaperTradingOrderForm';
import { PaperTradingOrdersTable } from './PaperTradingOrdersTable';
import { ResetAccountModal } from '../../components/ResetAccountModal';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, BarChart3, DollarSign, RotateCcw, UserPlus } from "lucide-react";
import toast from 'react-hot-toast';
import axios from 'axios';

export default function PaperTradingPage() {
  const [dashboardData, setDashboardData] = useState<PaperTradeDashboard | null>(null);
  const [allOrders, setAllOrders] = useState<PaperTradeOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<PaperTradeOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<PaperTradeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [timeDisplayTrigger, setTimeDisplayTrigger] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<string>('Main');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);

  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/paper-trade`;

  // Get current user and admin status
  useEffect(() => {
    const user = localStorage.getItem('currentUser') || '';
    const adminStatus = user === 'Abrar';
    setCurrentUser(user);
    setIsAdmin(adminStatus);
    setSelectedAccount(adminStatus ? 'Main' : user);
  }, []);

  // Fetch available accounts from API
  const fetchAvailableAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/all-users`);
      const data = response.data;
      
      if (data.result && Array.isArray(data.result)) {
        if (isAdmin) {
          // Admin can see all accounts
          setAvailableAccounts(data.result);
        } else {
          // Regular users can see their own account, Main, and any accounts they created
          const userAccounts = data.result.filter((account: string) => 
            account === currentUser || 
            account === 'Main' || 
            account.startsWith(currentUser + '-')
          );
          setAvailableAccounts(userAccounts);
        }
      } else {
        console.error('Invalid API response format:', data);
        // Fallback to default accounts if API fails
        setAvailableAccounts(isAdmin ? ['Main', 'Abrar', 'Sadiq', 'Nawaz'] : [currentUser, 'Main'].filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching available accounts:', error);
      // Fallback to default accounts if API fails
      setAvailableAccounts(isAdmin ? ['Main', 'Abrar', 'Sadiq', 'Nawaz'] : [currentUser, 'Main'].filter(Boolean));
    }
  };

  // Fetch available accounts when component mounts or when user/admin status changes
  useEffect(() => {
    if (currentUser) {
      fetchAvailableAccounts();
    }
  }, [currentUser, isAdmin, refreshTrigger]);

  // Format last refresh time for display
  const lastRefreshDisplay = useMemo(() => {
    if (!lastRefreshTime) return 'Never';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastRefreshTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  }, [lastRefreshTime, timeDisplayTrigger]);

  // Check if current time is within market hours (Mon-Fri, 9:15 AM to 3:30 PM IST)
  const isMarketHours = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Get current time in IST
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
    const marketStart = 9 * 60 + 15; // 9:15 AM = 555 minutes
    const marketEnd = 15 * 60 + 30;  // 3:30 PM = 930 minutes
    console.log(`Current IST Time: ${currentHour}:${currentMinute < 10 ? '0' : ''}${currentMinute} (${currentTimeMinutes} minutes)`);
    console.log(`Market Hours: ${marketStart} to ${marketEnd} minutes`);
    return currentTimeMinutes >= marketStart && currentTimeMinutes <= marketEnd;
  };

  // Fetch all data
  const fetchData = async (account: string = selectedAccount) => {
    try {
      setIsLoading(true);
      const [dashboard, all, active, completed] = await Promise.all([
        getPaperTradeDashboard(account),
        getAllPaperTradeOrders(account),
        getActivePaperTradeOrders(account),
        getCompletedPaperTradeOrders(account)
      ]);

      setDashboardData(dashboard);
      setAllOrders(all);
      setActiveOrders(active);
      setCompletedOrders(completed);
      
      // Update last refresh time on successful data fetch
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching paper trading data:', error);
      toast.error('Failed to load paper trading data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (selectedAccount) {
      fetchData(selectedAccount);
    }
  }, [selectedAccount, refreshTrigger]);

  // Auto-refresh every 5 minutes during market hours
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMarketHours()) {
        console.log('Market hours - Auto-refreshing paper trading data');
        fetchData();
      } else {
        console.log('Outside market hours - Skipping auto-refresh');
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Update the "time ago" display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update the "time ago" text
      setTimeDisplayTrigger(prev => prev + 1);
    }, 60 * 1000); // 1 minute

    return () => clearInterval(interval);
  }, [lastRefreshTime]);

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

  // Generate the next available account name
  // Check if current user can reset the selected account
  const canResetAccount = () => {
    // Main account can be reset by anyone
    if (selectedAccount === 'Main') {
      return true;
    }
    
    // Individual accounts can only be reset by the account owner
    // Account owner is determined by the account name matching the current user
    // or the account being a sub-account of the current user (e.g., "Abrar-1" owned by "Abrar")
    const accountOwner = selectedAccount.includes('-') 
      ? selectedAccount.split('-')[0] 
      : selectedAccount;
    
    return currentUser === accountOwner;
  };

  const generateNextAccountName = () => {
    let counter = 1;
    let suggestedName = `${currentUser}-${counter}`;
    
    while (availableAccounts.includes(suggestedName)) {
      counter++;
      suggestedName = `${currentUser}-${counter}`;
    }
    
    return suggestedName;
  };

  const handleCreateAccount = async () => {
    const newAccountName = generateNextAccountName();
    
    // Set loading state
    setIsCreatingAccount(true);
    
    try {
      console.log(`🚀 Creating account: ${newAccountName}`);
      console.log(`📡 API URL: ${API_BASE}/create/${newAccountName}`);
      
      // Make API call to create the account
      const response = await axios.post(`${API_BASE}/create/${newAccountName}`);
      
      console.log('📥 API Response:', response);
      console.log('📊 Response Status:', response.status);
      console.log('📄 Response Data:', response.data);
      
      // Check for successful response (status 200-299 range)
      if (response.status >= 200 && response.status < 300) {
        // Show success message
        toast.success(`🎉 Account "${newAccountName}" created successfully!`);
        
        // Add the new account to the available accounts list immediately
        setAvailableAccounts(prev => [...prev, newAccountName]);
        
        // Switch to the newly created account
        setSelectedAccount(newAccountName);
        
        // Refresh available accounts list from API to ensure consistency
        try {
          await fetchAvailableAccounts();
        } catch (fetchError) {
          console.warn('⚠️ Warning: Failed to refresh accounts from API, but using local update:', fetchError);
          // Continue with local update - account was already added to the list
        }
        
        // Trigger refresh to update the dashboard data
        handleRefresh();
        
        // Additional success feedback
        console.log(`✅ Successfully created account: ${newAccountName}`);
      } else {
        console.error('❌ Unexpected response status:', response.status);
        toast.error(`❌ Failed to create account. Status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('💥 Error creating account:', error);
      console.error('📋 Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response) {
        // Server responded with error status
        toast.error(`❌ Server error: ${error.response.status} - ${error.response.data?.message || 'Failed to create account'}`);
      } else if (error.request) {
        // Request was made but no response received
        toast.error('❌ Network error: Unable to reach server');
      } else {
        // Something else happened
        toast.error('❌ Failed to create account. Please try again.');
      }
    } finally {
      // Reset loading state
      setIsCreatingAccount(false);
    }
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
              Paper Trading - {selectedAccount}
            </h1>
            <p className="text-gray-600 mt-1">
              Practice trading with virtual capital and track your performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Account Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Account:</span>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map(account => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Refresh
              <span className="text-xs text-gray-500 ml-1">({lastRefreshDisplay})</span>
            </Button>
            {/* Create Account Button - Only show when current user can create accounts for themselves */}
            {selectedAccount !== 'Main' && selectedAccount === currentUser && (
              <Button
                onClick={handleCreateAccount}
                disabled={isCreatingAccount}
                variant="outline"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingAccount ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={() => setShowResetModal(true)}
              disabled={!canResetAccount()}
              variant="outline"
              className={`flex items-center gap-2 ${
                canResetAccount() 
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={(() => {
                if (canResetAccount()) {
                  return 'Reset this account';
                }
                const accountOwner = selectedAccount.includes('-') 
                  ? selectedAccount.split('-')[0] 
                  : selectedAccount;
                return `Only ${accountOwner} can reset this account`;
              })()}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Account
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
                  user={selectedAccount}
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
                  user={selectedAccount}
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
                  user={selectedAccount}
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
            user={selectedAccount}
          />
        )}

        {/* Reset Account Modal */}
        {showResetModal && (
          <ResetAccountModal
            isOpen={showResetModal}
            onClose={() => setShowResetModal(false)}
            onSuccess={handleRefresh}
            currentCapital={dashboardData?.currentCapital || 0}
            user={selectedAccount}
          />
        )}


      </div>
    </div>
  );
}