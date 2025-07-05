interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }
  
  const colorClasses = {
    primary: 'border-survey-600',
    white: 'border-white',
    gray: 'border-gray-600'
  }
  
  return (
    <div className={`
      animate-spin rounded-full border-b-2 
      ${sizeClasses[size]} 
      ${colorClasses[color]} 
      ${className}
    `} />
  )
} 