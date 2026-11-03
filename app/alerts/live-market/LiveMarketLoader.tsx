'use client';

import dynamic from 'next/dynamic';

const LiveMarketClient = dynamic(() => import('./LiveMarketClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
      Loading live market…
    </div>
  ),
});

export default function LiveMarketLoader() {
  return <LiveMarketClient />;
}
