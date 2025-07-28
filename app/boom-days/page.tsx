"use client";

import React from 'react';
import { OHLCChartDemo } from '../../components/OHLCChartDemo';

export default function BoomDaysPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Boom Days Analysis</h1>
      <p className="mb-6 text-gray-600">
        Search for a stock to view its boom days analysis. Boom days are defined as days with 
        exceptional volume and price movement that may indicate potential trading opportunities.
      </p>
      <OHLCChartDemo />
    </div>
  );
}
