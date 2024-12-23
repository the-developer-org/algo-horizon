'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from 'lucide-react'

interface HistoricalResponse {
  companyName: string
  formattedLastBoomDataUpdatedAt: string
  formattedBoomDayDatesMap: {
    [key: string]: string
  }
  isBelowParLevel: {
    [key: string]: boolean
  }
}

interface ApiResponse {
  message: string
  sortedHistoricalResponses: {
    [key: string]: HistoricalResponse[]
  }
}

const getModelColor = (model: string, isBelowPar: boolean | undefined) => {
  const baseColors = {
    Model_1: ['from-red-500 to-red-300', 'text-red-800'],
    Model_2: ['from-orange-500 to-orange-300', 'text-orange-800'],
    Model_3: ['from-green-500 to-green-300', 'text-green-800'],
    default: ['from-gray-500 to-gray-300', 'text-gray-800'],
  };

  const [bgGradient, textColor] = baseColors[model as keyof typeof baseColors] || baseColors.default;
  const opacity = isBelowPar === undefined ? 'bg-opacity-50' : isBelowPar ? 'bg-opacity-30' : 'bg-opacity-70';

  return `bg-gradient-to-r ${bgGradient} ${opacity} ${textColor}`;
}

export function HistoricalInsights() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8050/api/historical-data/fetch-previous-insights')
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const result: ApiResponse = await response.json()
      setData(result)
    } catch (err) {
      setError('An error occurred while fetching data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData()
  }

  const sortedData = data?.sortedHistoricalResponses ? Object.fromEntries(
    Object.entries(data.sortedHistoricalResponses).sort(([a], [b]) => 
      sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    )
  ) : null

  if (error) return <div className="text-center text-red-300">{error}</div>

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Historical Insights</h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleRefresh}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300 flex items-center"
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Sort {sortOrder === 'asc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      {loading && !data ? (
        <div className="text-center text-white">Loading...</div>
      ) : !sortedData ? (
        <div className="text-center text-white">No data available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(sortedData).flatMap(([companyName, responses]) =>
            (responses || []).map((response, index) => (
              <Card key={`${companyName}-${index}`} className="border border-blue-200 overflow-hidden bg-white bg-opacity-90">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-400 h-24 flex items-center justify-center">
                  <CardTitle className="text-white text-center">{companyName}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm mb-2 text-gray-700">Last Updated: {response?.formattedLastBoomDataUpdatedAt || 'N/A'}</p>
                  {Object.entries(response?.formattedBoomDayDatesMap || {}).map(([model, date]) => {
                    const isBelowPar = response?.isBelowParLevel?.[model]
                    return (
                      <div key={model} className={`text-sm p-2 rounded-md mb-2 ${getModelColor(model, isBelowPar)}`}>
                        <span className="font-semibold">{model}:</span> {date || 'N/A'}
                        <span className="ml-2 font-semibold">
                          {isBelowPar === undefined ? '?' : isBelowPar ? '↓' : '↑'}
                        </span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

