'use client'

import { getSurveyByToken, submitSurveyResponse } from '@/lib/api/client'
import { Survey } from '@/types'
import { format } from 'date-fns'
import { CheckCircle, Clock, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { LoadingPage, Alert, BrandHeader, Button } from '@/components/ui'

export default function PublicSurvey() {
  const params = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [responses, setResponses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (params?.token) {
      loadSurvey(params.token as string)
    }
  }, [params?.token])

  const loadSurvey = async (token: string) => {
    try {
      setLoading(true)
      const response = await getSurveyByToken(token)
      
      if (!response.success || !response.data) {
        setError(response.error || 'Survey not found')
        return
      }

      if (!response.data.is_active || new Date(response.data.expires_at) <= new Date()) {
        setError('This survey has expired')
        return
      }

      setSurvey(response.data)
    } catch (error) {
      console.error('Error loading survey:', error)
      setError('Failed to load survey')
    } finally {
      setLoading(false)
    }
  }

  const handleResponseChange = (questionId: string, answer: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!survey) return

    const requiredQuestions = survey.questions?.filter(q => q.required) || []
    const missingResponses = requiredQuestions.filter(q => !responses[q.id])
    
    if (missingResponses.length > 0) {
      toast.error('Please answer all required questions')
      return
    }

    setSubmitting(true)
    
    try {
      const responseData = {
        survey_token: params?.token as string,
        responses: Object.entries(responses).map(([question_id, option_id]) => ({
          question_id,
          option_id
        }))
      }

      await submitSurveyResponse(responseData)
      setSubmitted(true)
      toast.success('Survey submitted successfully!')
    } catch (error: any) {
      console.error('Error submitting survey:', error)
      
      const errorMessage = error?.message || 'Failed to submit survey. Please try again.'
      
      if (error?.message?.includes('already submitted') || error?.message?.includes('already vote')) {
        setAlreadyVoted(true)
        toast.error(errorMessage, {
          duration: 8000,
          style: {
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontWeight: '500'
          }
        })
      } else {
        toast.error(errorMessage, {
          duration: 5000
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingPage message="Loading survey..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Alert variant="error" title="Survey Unavailable" className="mb-4">
            {error}
          </Alert>
          <p className="text-gray-600">Please check the survey link or contact the survey administrator.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-600">Your response has been submitted successfully.</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Survey Details</h3>
              <p className="text-sm text-gray-600 mb-1">{survey?.title}</p>
              <p className="text-xs text-gray-500">
                Submitted on {format(new Date(), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>

            <div className="text-sm text-gray-500">
              <p>This survey is powered by Flash Survey</p>
              <p className="mt-1">StoryStream Studios</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Alert variant="error" title="Survey Not Found">
            The survey you're looking for doesn't exist.
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <BrandHeader size="md" />
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Expires {format(new Date(survey.expires_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Max {survey.max_votes} responses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{survey.title}</h2>
            {survey.description && (
              <p className="text-gray-600 text-lg">{survey.description}</p>
            )}
          </div>

          {alreadyVoted && (
            <Alert variant="error" title="Response Already Submitted" className="mb-6">
              You have already submitted a response to this survey. Each person can only vote once per survey.
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {survey.questions?.map((question, index) => (
              <div key={question.id} className="survey-question">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {index + 1}. {question.question_text}
                    {question.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {question.question_options?.map((option) => (
                    <label
                      key={option.id}
                      className={`survey-option ${
                        responses[question.id] === option.id ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={responses[question.id] === option.id}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        className="h-4 w-4 text-survey-600 focus:ring-survey-500 border-gray-300 mr-3"
                      />
                      <span className="text-gray-700">{option.option_text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-6 border-t">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting || alreadyVoted}
                loading={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Survey'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 