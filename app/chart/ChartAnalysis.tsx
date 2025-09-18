"use client";

import React, { Suspense } from 'react';
import { OHLCChartDemo } from "../../components/OHLCChartDemo";

function ChartLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <Suspense fallback={<ChartLoading />}>
        <OHLCChartDemo />
      </Suspense>
    </main>
  );
}