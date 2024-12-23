import { HistoricalInsights } from "../components/HistoricalInsights"
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{
      backgroundImage: `url('https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
    }}>
      <div className="min-h-screen bg-black bg-opacity-60">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8 text-center text-white">AlgoHorizon</h1>
          <HistoricalInsights />
        </div>
      </div>
    </div>
  )
}

