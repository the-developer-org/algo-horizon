import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">AlgoHorizon</h1>
      <p className="text-xl mb-8">Connect your Upstox account to get started</p>
      <Link href="/api/auth/login">
        <Button>Connect Upstox</Button>
      </Link>
    </div>
  )
}

