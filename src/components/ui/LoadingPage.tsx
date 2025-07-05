import LoadingSpinner from './LoadingSpinner'

interface LoadingPageProps {
  message?: string
  className?: string
}

export default function LoadingPage({ 
  message = 'Loading...', 
  className = '' 
}: LoadingPageProps) {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
} 