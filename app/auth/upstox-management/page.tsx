"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfile {
  id: string;
  phoneNumber: number;
  name: string;
  email: string;
  group: string;
  tokenId: string | null;
  sandBoxTokenId: string | null;
  pin: number | null;
}

export default function UpstoxUserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [env, setEnv] = useState<'prod' | 'sandbox'>('sandbox');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/get-all-users`);
        if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
        const data = await resp?.json();
        setUsers(Array.isArray(data) ? data : data.userProfiles || []);
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
        <div className="flex items-center gap-3 bg-muted/40 rounded-md px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Environment</span>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setEnv('prod')}
              className={`px-3 py-1 rounded-md border text-xs font-semibold transition ${env==='prod' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-100'}`}
            >Prod</button>
            <button
              onClick={() => setEnv('sandbox')}
              className={`px-3 py-1 rounded-md border text-xs font-semibold transition ${env==='sandbox' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-300 hover:bg-gray-100'}`}
            >Sandbox</button>
          </div>
        </div>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading users...</div>}
      {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {users.map(u => {
          const connected = env === 'prod' ? !!u.tokenId : !!u.sandBoxTokenId;
          return (
            <Card key={u.id} className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex flex-col">
                  <span>{u.name.toLocaleUpperCase() || 'Unnamed User'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-gray-600 space-y-1">
                  <p><span className="font-semibold">Phone:</span> {u.phoneNumber || '—'}</p>
                  <p><span className="font-semibold">Group:</span> {u.group || '—'}</p>
                  <p><span className="font-semibold">Email:</span> {u.email ?? '—'}</p>
                </div>
        <Button
                  variant={connected ? 'secondary' : 'default'}
                  disabled={connected}
                  className={`${connected ? 'bg-green-500 hover:bg-green-500 cursor-default' : 'bg-red-500 hover:bg-red-600'} w-full h-9 text-white text-sm`}
                  onClick={() => {
                    if (!connected) {
                      const phoneParam = encodeURIComponent(String(u.phoneNumber ?? ''));
                      if (!phoneParam) {
                        alert('Missing phone number for this user');
                        return;
                      }
            window.location.href = `/api/auth/login?phone=${phoneParam}&env=${env}`;
                    }
                  }}
                >
          {connected ? `Upstox Connected (${env})` : `Connect Upstox (${env})`}
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
