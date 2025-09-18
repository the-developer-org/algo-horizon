"use client";

import React, { Suspense } from 'react';
import { OHLCChartDemo } from '../../components/OHLCChartDemo';

function BoomDaysLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );
}

export default function BoomDaysPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Boom Days Analysis</h1>
      <p className="mb-6 text-gray-600">
        Search for a stock to view its boom days analysis. Boom days are defined as days with 
        exceptional volume and price movement that may indicate potential trading opportunities.
      </p>
      <Suspense fallback={<BoomDaysLoading />}>
        <OHLCChartDemo />
      </Suspense>
    </div>
  );
}
