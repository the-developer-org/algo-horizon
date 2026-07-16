"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { UserProfile, algoHorizonApi } from '@/lib/api/algoHorizonApi';

export default function UpstoxUserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await algoHorizonApi.getAllUsers();
        setUsers(users);
      } catch (e: any) {
        setError(e.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Upstox Connection's Management</h1>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading users...</div>}
      {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {users.map((u, index) => {
          const connected = !!u.tokenId;
          return (
            <Card key={`${u.phoneNumber}-${index}`} className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex flex-col">
                  <span>{u.name.toLocaleUpperCase() || 'Unnamed User'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-semibold">Phone Number:</span> {u.phoneNumber ?? '-'}</p>
                  <p><span className="font-semibold">Pin:</span> {u.pin ?? '-'}</p>
                </div>
        <Button
                  variant={connected ? 'secondary' : 'default'}
                  disabled={connected}
                  className={`${connected ? 'bg-green-500 hover:bg-green-500 cursor-default' : 'bg-red-500 hover:bg-red-600'} w-full h-9 text-white text-sm`}
                  onClick={async () => {
                    if (!connected) {
                      const phoneParam = encodeURIComponent(String(u.phoneNumber ?? ''));
                      if (!phoneParam) {
                        alert('Missing phone number for this user');
                        return;
                      }
                      
                      try {
                        // Fetch the auth URL from our API
                        const response = await fetch(`/api/auth/login?phone=${phoneParam}`);
                        const data = await response.json();
                        debugger
                        if (data.authUrl) {
                          // Open in new tab
                          window.open(data.authUrl, '_blank');
                        } else {
                          console.error('No auth URL received');
                          alert('Failed to get authentication URL');
                        }
                      } catch (error) {
                        console.error('Failed to get auth URL:', error);
                        alert('Failed to initiate authentication');
                      }
                    }
                  }}
                >{connected ? `Upstox Connected` : `Connect Upstox`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {!loading && users.length === 0 && !error && (
          <div className="text-sm text-muted-foreground col-span-full">No users found.</div>
        )}
      </div>
    </div>
  );
}
