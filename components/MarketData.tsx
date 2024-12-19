'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MarketQuote {
  symbol: string
  last_price: number
  change: number
  volume: number
}

export default function MarketData({ token }: { token: string }) {
  const [quotes, setQuotes] = useState<MarketQuote[]>([])
  const [symbol, setSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarketData = async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://api-v2.upstox.com/market-quote/ltp?symbol=${encodeURIComponent(symbol)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Api-Version': '2.0',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch market data')
      }

      const data = await response.json()
      const quote: MarketQuote = {
        symbol: symbol,
        last_price: data.data[symbol].last_price,
        change: data.data[symbol].last_price - data.data[symbol].open,
        volume: data.data[symbol].volume,
      }
      setQuotes(prevQuotes => [...prevQuotes, quote])
    } catch (err) {
      setError('Failed to load market data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Market Data</h2>
      <div className="flex space-x-2 mb-4">
        <Input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Enter symbol (e.g., NSE_EQ|INE848E01016)"
          className="flex-grow"
        />
        <Button onClick={fetchMarketData} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </Button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {quotes.length > 0 && (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">Symbol</th>
              <th className="py-2 px-4 border-b">Last Price</th>
              <th className="py-2 px-4 border-b">Change</th>
              <th className="py-2 px-4 border-b">Volume</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-2 px-4 border-b">{quote.symbol}</td>
                <td className="py-2 px-4 border-b text-right">{quote.last_price.toFixed(2)}</td>
                <td className={`py-2 px-4 border-b text-right ${quote.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {quote.change.toFixed(2)}
                </td>
                <td className="py-2 px-4 border-b text-right">{quote.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

