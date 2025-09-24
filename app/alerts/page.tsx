"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AddAlertModal } from "./AddAlertModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS = ["ACTIVE", "COMPLETED", "CANCELLED"];

function statusIcon(status: string) {
  switch (status) {
    case "ACTIVE": return <Clock className="text-blue-500" />;
    case "COMPLETED": return <CheckCircle className="text-green-500" />;
    case "CANCELLED": return <XCircle className="text-red-500" />;
    default: return <Bell />;
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ACTIVE");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/alerts/${tab.toLowerCase()}`)
      .then(res => res.json())
      .then(data => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [tab]);

  // ...existing code...
  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-100 py-10 px-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-green-700 mb-6 tracking-tight">Alerts</h1>
      <Tabs value={tab} onValueChange={setTab} className="w-full max-w-4xl mb-8">
        <TabsList className="flex gap-2 justify-center">
          {STATUS.map(s => (
            <TabsTrigger key={s} value={s} className="px-6 py-2 rounded-lg text-lg font-semibold">
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        {STATUS.map(s => (
          <TabsContent key={s} value={s} className="pt-4">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No alerts found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {alerts.map((alert: any) => (
                  <Card key={alert.id} className="shadow-lg border border-gray-200 bg-white">
                    <CardHeader className="flex items-center gap-3">
                      {statusIcon(alert.status)}
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-800">{alert.companyName}</div>
                        <div className="text-xs text-gray-500">{alert.instrumentKey}</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">
                        {alert.alertType.replace(/_/g, " ")}
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-4 text-sm">
                        <span>Target: <b>{alert.targetPrice ?? '-'}</b></span>
                        <span>Support: <b>{alert.supportLevel ?? '-'}</b></span>
                        <span>Resistance: <b>{alert.resistanceLevel ?? '-'}</b></span>
                      </div>
                      <div className="text-gray-600 text-sm">{alert.message}</div>
                    </CardContent>
                    <div className="flex justify-between items-center text-xs text-gray-400 px-4 pb-2">
                      <span>Created: {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}</span>
                      {alert.triggeredAt && <span>Triggered: {new Date(alert.triggeredAt).toLocaleString()}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <Button className="mt-8 px-6 py-3 text-lg font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow" onClick={() => setShowAddModal(true)}>
        + Add Alert
      </Button>
      <AddAlertModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={async (newAlert) => {
          // Call backend to add alert
          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/alerts/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAlert)
          });
          setShowAddModal(false);
          setTab("ACTIVE");
        }}
      />
    </div>
    </>
  );
}

