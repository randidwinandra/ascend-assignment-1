interface StatusBadgeProps {
  status: 'active' | 'expired' | 'draft'
  className?: string
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      text: 'Active',
      classes: 'bg-green-100 text-green-800'
    },
    expired: {
      text: 'Expired',
      classes: 'bg-gray-100 text-gray-800'
    },
    draft: {
      text: 'Draft',
      classes: 'bg-yellow-100 text-yellow-800'
    }
  }
  
  const config = statusConfig[status]
  
  return (
    <span className={`
      px-2 py-1 text-xs font-medium rounded-full
      ${config.classes}
      ${className}
    `}>
      {config.text}
    </span>
  )
} 