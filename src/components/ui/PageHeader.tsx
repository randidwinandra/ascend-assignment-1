import { ArrowLeft, LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import Button from './Button'

interface PageHeaderProps {
  title: string
  icon?: LucideIcon
  showBackButton?: boolean
  onBackClick?: () => void
  actions?: ReactNode
  className?: string
}

export default function PageHeader({
  title,
  icon: Icon,
  showBackButton = false,
  onBackClick,
  actions,
  className = ''
}: PageHeaderProps) {
  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                icon={ArrowLeft}
                className="text-gray-600 hover:text-gray-900"
              >
                Back
              </Button>
            )}
            <div className="flex items-center space-x-2">
              {Icon && (
                <div className="p-2 bg-survey-600 rounded-lg">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              )}
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
          </div>
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 