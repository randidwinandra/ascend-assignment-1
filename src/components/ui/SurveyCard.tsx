import { format } from 'date-fns'
import { Copy, Eye } from 'lucide-react'
import { SurveyListItem } from '@/types'
import StatusBadge from './StatusBadge'
import Button from './Button'

interface SurveyCardProps {
  survey: SurveyListItem
  onView: (survey: SurveyListItem) => void
  onCopyLink: (survey: SurveyListItem) => void
  className?: string
}

export default function SurveyCard({ 
  survey, 
  onView, 
  onCopyLink, 
  className = '' 
}: SurveyCardProps) {
  const isActive = survey.is_active && new Date(survey.expires_at) > new Date()
  
  return (
    <div className={`
      border rounded-lg p-4 hover:bg-gray-50 transition-colors
      ${className}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{survey.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
            <span>Created {format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
            <span>Expires {format(new Date(survey.expires_at), 'MMM d, yyyy')}</span>
            <span>{survey.total_votes || 0} responses</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={isActive ? 'active' : 'expired'} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCopyLink(survey)}
            icon={Copy}
            title="Copy survey link"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => onView(survey)}
            icon={Eye}
            title="View survey"
          />
        </div>
      </div>
    </div>
  )
} 