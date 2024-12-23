'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface HistoricalResponse {
  companyName: string
  formattedLastBoomDataUpdatedAt: string
  formattedBoomDayDatesMap: {
    [key: string]: string
  }
}

interface ApiResponse {
  message: string
  sortedHistoricalResponses: {
    [key: string]: HistoricalResponse[]
  }
}

const getModelColor = (model: string) => {
  switch (model.toLowerCase()) {
    case 'model1':
      return 'bg-red-100 text-red-800'
    case 'model2':
      return 'bg-orange-100 text-orange-800'
    case 'model3':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function HistoricalInsights() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8050/api/historical-data/fetchPreviousInsights')
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
    }

    fetchData()
  }, [])

  if (loading) return <div className="text-center">Loading...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!data) return <div className="text-center">No data available</div>

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-4 text-blue-900">Historical Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.sortedHistoricalResponses).flatMap(([companyName, responses]) =>
          responses.map((response, index) => (
            <Card key={`${companyName}-${index}`} className="border border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-800">{companyName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2 text-gray-600">Last Updated: {response.formattedLastBoomDataUpdatedAt}</p>
                {Object.entries(response.formattedBoomDayDatesMap).map(([model, date]) => (
                  <div key={model} className={`text-sm p-2 rounded-md mb-2 ${getModelColor(model)}`}>
                    <span className="font-semibold">{model}:</span> {date}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

