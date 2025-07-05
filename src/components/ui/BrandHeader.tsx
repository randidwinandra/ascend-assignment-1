import { BarChart3 } from 'lucide-react'

interface BrandHeaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function BrandHeader({ size = 'md', className = '' }: BrandHeaderProps) {
  const sizeConfig = {
    sm: {
      icon: 'h-6 w-6',
      title: 'text-lg',
      subtitle: 'text-xs'
    },
    md: {
      icon: 'h-8 w-8',
      title: 'text-2xl',
      subtitle: 'text-sm'
    },
    lg: {
      icon: 'h-10 w-10',
      title: 'text-3xl',
      subtitle: 'text-base'
    }
  }
  
  const config = sizeConfig[size]
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="p-2 bg-survey-600 rounded-lg">
        <BarChart3 className={`${config.icon} text-white`} />
      </div>
      <div>
        <h1 className={`${config.title} font-bold text-gray-900`}>Flash Survey</h1>
        <p className={`${config.subtitle} text-gray-600`}>StoryStream Studios</p>
      </div>
    </div>
  )
} 