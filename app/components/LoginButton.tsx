import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function LoginButton() {
  const [isTokenAvailable, setIsTokenAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkTokenAvailability()
  }, [])

  const checkTokenAvailability = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/is-token-available`)
      const data = await response.json()
      setIsTokenAvailable(data.isTokenAvailable)
    } catch (error) {
      console.error('Error checking token:', error)
      setIsTokenAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = () => {
    // Redirect to our login API endpoint
    window.location.href = '/api/auth/login'
  }

  const buttonClass = "w-[200px] h-[48px] text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center"

  if (isLoading) {
    return (
      <Button 
        disabled
        className={`${buttonClass} bg-gray-400 opacity-50 cursor-not-allowed`}
      >
        Loading...
      </Button>
    )
  }

  return (
    <Button 
      onClick={handleLogin}
      className={`${buttonClass} ${
        isTokenAvailable 
          ? 'bg-green-500 hover:bg-green-600' 
          : 'bg-red-500 hover:bg-red-600'
      }`}
    >
      {isTokenAvailable ? 'Connected to Upstox' : 'Connect Upstox'}
    </Button>
  )
} 