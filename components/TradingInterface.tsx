'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export default function TradingInterface({ token }: { token: string }) {
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [transactionType, setTransactionType] = useState('BUY')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const placeOrder = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('https://api-v2.upstox.com/order/place', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Api-Version': '2.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: parseInt(quantity),
          product: 'D',
          validity: 'DAY',
          price: 0,
          tag: 'AlgoHorizon',
          instrument_token: symbol,
          order_type: 'MARKET',
          transaction_type: transactionType,
          disclosed_quantity: 0,
          trigger_price: 0,
          is_amo: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to place order')
      }

      const data = await response.json()
      setSuccess(`Order placed successfully. Order ID: ${data.data.order_id}`)
    } catch (err) {
      setError('Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Place Order</h2>
      <div className="space-y-4">
        <Input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Enter symbol (e.g., NSE_EQ|INE848E01016)"
        />
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
        />
        <Select value={transactionType} onValueChange={setTransactionType}>
          <Select.Trigger>
            <Select.Value placeholder="Select transaction type" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="BUY">Buy</Select.Item>
            <Select.Item value="SELL">Sell</Select.Item>
          </Select.Content>
        </Select>
        <Button onClick={placeOrder} disabled={loading}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {success && <p className="text-green-500 mt-4">{success}</p>}
    </div>
  )
}

