'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('message') || 'An unknown error occurred'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4 text-red-600">Error</h1>
      <p className="text-xl mb-8">{errorMessage}</p>
      <Link href="/">
        <Button>Go Back Home</Button>
      </Link>
    </div>
  )
}

