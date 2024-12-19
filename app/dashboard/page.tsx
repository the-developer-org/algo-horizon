'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      fetchUserProfile(token)
    }
  }, [token])

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await fetch('https://api-v2.upstox.com/user/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Api-Version': '2.0',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      const data = await response.json()
      setUserProfile(data.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load user profile')
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to AlgoHorizon</h1>
      {userProfile && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-2">User Profile</h2>
          <p><strong>Name:</strong> {userProfile.user_name}</p>
          <p><strong>Email:</strong> {userProfile.email}</p>
          <p><strong>User ID:</strong> {userProfile.user_id}</p>
          <p><strong>Broker:</strong> {userProfile.broker}</p>
          <p><strong>Exchanges:</strong> {userProfile.exchanges.join(', ')}</p>
          <p><strong>Products:</strong> {userProfile.products.join(', ')}</p>
        </div>
      )}
      <Button onClick={() => window.location.href = '/'}>Logout</Button>
    </div>
  )
}

