'use client'

import { getCurrentUser, getSurveyAnalytics } from '@/lib/api/client'
import { SurveyAnalytics } from '@/types'
import { format } from 'date-fns'
import { BarChart3, Calendar, Copy, ExternalLink, TrendingUp, Users } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { LoadingPage, Alert, Button, PageHeader, StatsCard } from '@/components/ui'

export default function SurveyResults() {
  const router = useRouter()
  const params = useParams()
  const [surveyData, setSurveyData] = useState<SurveyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadSurveyData(params.id as string)
    }
  }, [params.id])

  const loadSurveyData = async (surveyId: string) => {
    try {
      setLoading(true)
      
      const user = await getCurrentUser()
      if (!user) {
        router.push('/admin/login')
        return
      }

      const response = await getSurveyAnalytics(surveyId)
      
      if (response.success && response.data) {
        setSurveyData(response.data)
      } else {
        setError(response.error || 'Failed to load survey data')
      }
    } catch (error) {
      console.error('Error loading survey data:', error)
      setError('Failed to load survey data')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPublicLink = () => {
    if (!surveyData?.survey) return
    
    const publicLink = `${window.location.origin}/survey/${surveyData.survey.public_token}`
    navigator.clipboard.writeText(publicLink)
    toast.success('Public link copied to clipboard!')
  }

  const handleOpenPublicLink = () => {
    if (!surveyData?.survey) return
    
    const publicLink = `${window.location.origin}/survey/${surveyData.survey.public_token}`
    window.open(publicLink, '_blank')
  }

  if (loading) {
    return <LoadingPage message="Loading survey data..." />
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Alert variant="error" title="Survey Not Found" className="mb-4">
            {error || 'The survey you\'re looking for doesn\'t exist.'}
          </Alert>
          <Button
            variant="primary"
            onClick={() => router.push('/admin')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const { survey, questions, stats } = surveyData
  const isActive = survey.is_active && new Date(survey.expires_at) > new Date()
  const totalResponses = stats.total_responses

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Survey Results"
        icon={BarChart3}
        showBackButton={true}
        onBackClick={() => router.push('/admin')}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleCopyPublicLink}
              icon={Copy}
              size="sm"
            >
              Copy Link
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenPublicLink}
              icon={ExternalLink}
              size="sm"
            >
              View Public
            </Button>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h2>
          <p className="text-gray-600 mb-4">{survey.description}</p>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Created {format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Expires {format(new Date(survey.expires_at), 'MMM d, yyyy')}</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isActive ? 'Active' : 'Expired'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Responses"
            value={totalResponses}
            icon={Users}
          />
          <StatsCard
            title="Completion Rate"
            value={`${Math.round((totalResponses / survey.max_votes) * 100)}%`}
            icon={TrendingUp}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Questions"
            value={questions.length}
            icon={BarChart3}
            iconColor="text-blue-600"
          />
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Question Results</h3>
            
            {questions.length === 0 ? (
              <Alert variant="info">
                No questions found for this survey.
              </Alert>
            ) : (
              <div className="space-y-8">
                {questions.map((question, index) => (
                  <div key={question.question_id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <h4 className="font-medium text-gray-900 mb-4">
                      {index + 1}. {question.question_text}
                    </h4>
                    
                    {question.options && question.options.length > 0 ? (
                      <div className="space-y-3">
                        {question.options.map((option) => {
                          const percentage = totalResponses > 0 
                            ? Math.round((option.count / totalResponses) * 100)
                            : 0
                          
                          return (
                            <div key={option.option_id} className="flex items-center space-x-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {option.option_text}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {option.count} votes ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-survey-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <Alert variant="warning">
                        No options available for this question.
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 