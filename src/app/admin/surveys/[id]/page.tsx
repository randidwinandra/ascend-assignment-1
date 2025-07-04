'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { ArrowLeft, Copy, Users, BarChart3, Calendar, TrendingUp, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { getSurveyAnalytics, getCurrentUser } from '@/lib/api/client'
import { Survey, SurveyAnalytics } from '@/types'

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-survey-600"></div>
      </div>
    )
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Survey Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The survey you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-survey-600 text-white rounded-md hover:bg-survey-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const { survey, questions, stats } = surveyData
  const isActive = survey.is_active && new Date(survey.expires_at) > new Date()
  const totalResponses = stats.total_responses

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-survey-600 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Survey Results</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyPublicLink}
                className="flex items-center px-3 py-2 text-sm font-medium text-survey-600 bg-survey-50 hover:bg-survey-100 rounded-md"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Link
              </button>
              <button
                onClick={handleOpenPublicLink}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-survey-600 hover:bg-survey-700 rounded-md"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Public
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Survey Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{survey.title}</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isActive ? 'Active' : 'Expired'}
              </span>
            </div>
          </div>
          
          {survey.description && (
            <p className="text-gray-600 mb-4">{survey.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Responses</p>
                <p className="text-lg font-semibold">{totalResponses}/{survey.max_votes}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-lg font-semibold">{format(new Date(survey.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Expires</p>
                <p className="text-lg font-semibold">{format(new Date(survey.expires_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions and Results */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.question_id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Question {index + 1}: {question.question_text}
                </h3>
                <p className="text-sm text-gray-600">
                  {question.total_responses} responses • Multiple Choice
                </p>
              </div>

              {question.options.length > 0 ? (
                <div className="space-y-3">
                  {question.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{option.option_text}</span>
                          <span className="text-sm text-gray-500">
                            {option.count} ({option.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-survey-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${option.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No responses yet</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Public Link Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Public Survey Link</h3>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={`${window.location.origin}/survey/${survey.public_token}`}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm"
            />
            <button
              onClick={handleCopyPublicLink}
              className="px-4 py-2 bg-survey-600 text-white rounded-md hover:bg-survey-700 text-sm font-medium"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Share this link with your audience to collect responses. 
            {isActive ? ' This survey is currently active.' : ' This survey has expired.'}
          </p>
        </div>
      </div>
    </div>
  )
} 