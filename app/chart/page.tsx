"use client";

import React, { Suspense } from 'react';
import { OHLCChartDemo } from "../../components/OHLCChartDemo";

function ChartLoading() {
  return (
    <div className="app-loading-shell">
      <div className="app-loading-spinner" />
    </div>
  );
}

export default function ChartPage() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <Suspense fallback={<ChartLoading />}>
        <OHLCChartDemo />
      </Suspense>
    </main>
  );
}