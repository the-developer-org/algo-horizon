import { ReactNode } from 'react'

interface CardProps {
  readonly children: ReactNode
  readonly className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`px-6 py-4 bg-blue-100 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h3 className={`text-lg font-semibold text-blue-800 ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }: CardProps) {
  return <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

