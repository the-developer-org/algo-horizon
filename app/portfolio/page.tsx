'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Position {
  symbol: string
  quantity: number
  last_price: number
  average_price: number
  close_price: number
  pnl: number
}

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      fetchPortfolio(token)
    }
  }, [token])

  const fetchPortfolio = async (accessToken: string) => {
    try {
      const response = await fetch('https://api-v2.upstox.com/portfolio/short-term-positions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Api-Version': '2.0',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio')
      }

      const data = await response.json()
      setPositions(data.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load portfolio')
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading portfolio...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Portfolio</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">Symbol</th>
              <th className="py-2 px-4 border-b">Quantity</th>
              <th className="py-2 px-4 border-b">Last Price</th>
              <th className="py-2 px-4 border-b">Average Price</th>
              <th className="py-2 px-4 border-b">P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-2 px-4 border-b">{position.symbol}</td>
                <td className="py-2 px-4 border-b text-right">{position.quantity}</td>
                <td className="py-2 px-4 border-b text-right">{position.last_price.toFixed(2)}</td>
                <td className="py-2 px-4 border-b text-right">{position.average_price.toFixed(2)}</td>
                <td className={`py-2 px-4 border-b text-right ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {position.pnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

