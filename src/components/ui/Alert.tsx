import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { ReactNode } from 'react'

interface AlertProps {
  variant: 'error' | 'success' | 'warning' | 'info'
  title?: string
  children: ReactNode
  className?: string
}

export default function Alert({ variant, title, children, className = '' }: AlertProps) {
  const variantConfig = {
    error: {
      icon: XCircle,
      containerClasses: 'bg-red-50 border-red-200',
      iconClasses: 'text-red-400',
      titleClasses: 'text-red-800',
      textClasses: 'text-red-700'
    },
    success: {
      icon: CheckCircle,
      containerClasses: 'bg-green-50 border-green-200',
      iconClasses: 'text-green-400',
      titleClasses: 'text-green-800',
      textClasses: 'text-green-700'
    },
    warning: {
      icon: AlertTriangle,
      containerClasses: 'bg-yellow-50 border-yellow-200',
      iconClasses: 'text-yellow-400',
      titleClasses: 'text-yellow-800',
      textClasses: 'text-yellow-700'
    },
    info: {
      icon: Info,
      containerClasses: 'bg-blue-50 border-blue-200',
      iconClasses: 'text-blue-400',
      titleClasses: 'text-blue-800',
      textClasses: 'text-blue-700'
    }
  }
  
  const config = variantConfig[variant]
  const Icon = config.icon
  
  return (
    <div className={`
      border rounded-lg p-4 
      ${config.containerClasses}
      ${className}
    `}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconClasses}`} />
        </div>
        <div className="ml-3">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleClasses}`}>
              {title}
            </h3>
          )}
          <div className={`${title ? 'mt-2' : ''} text-sm ${config.textClasses}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 