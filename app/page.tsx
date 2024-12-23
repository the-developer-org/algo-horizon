import { HistoricalInsights } from "../components/HistoricalInsights"
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">AlgoHorizon</h1>
        <HistoricalInsights />
      </div>
    </div>
  )
}

