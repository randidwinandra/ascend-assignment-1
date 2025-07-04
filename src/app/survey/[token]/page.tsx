'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, BarChart3, Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { getSurveyByToken, submitSurveyResponse } from '@/lib/api/client'
import { Survey, SurveyResponseData } from '@/types'

export default function PublicSurvey() {
  const params = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responses, setResponses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (params.token) {
      loadSurvey(params.token as string)
    }
  }, [params.token])

  const loadSurvey = async (token: string) => {
    try {
      setLoading(true)
      const response = await getSurveyByToken(token)
      
      if (!response.success || !response.data) {
        setError(response.error || 'Survey not found')
        return
      }

      // Check if survey is expired
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

    // Validate required questions
    const requiredQuestions = survey.questions?.filter(q => q.required) || []
    const missingResponses = requiredQuestions.filter(q => !responses[q.id])
    
    if (missingResponses.length > 0) {
      toast.error('Please answer all required questions')
      return
    }

    setSubmitting(true)
    
    try {
      // Prepare response data
      const responseData = {
        survey_token: params.token as string,
        responses: Object.entries(responses).map(([question_id, option_id]) => ({
          question_id,
          option_id
        }))
      }

      await submitSurveyResponse(responseData)
      setSubmitted(true)
      toast.success('Survey submitted successfully!')
    } catch (error) {
      console.error('Error submitting survey:', error)
      toast.error('Failed to submit survey. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-survey-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-lg mb-4">
            <h2 className="text-2xl font-bold text-red-800 mb-2">Survey Unavailable</h2>
            <p className="text-red-600">{error}</p>
          </div>
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Survey Not Found</h2>
          <p className="text-gray-600">The survey you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-survey-600 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Flash Survey</h1>
                <p className="text-sm text-gray-600">StoryStream Studios</p>
              </div>
            </div>
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

      {/* Survey Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Survey Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{survey.title}</h2>
            {survey.description && (
              <p className="text-gray-600 text-lg">{survey.description}</p>
            )}
          </div>

          {/* Survey Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {survey.questions?.map((question, index) => (
              <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {index + 1}. {question.question_text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {question.question_type === 'radio' ? 'Select one option' : 'Select one option'}
                  </p>
                </div>

                <div className="space-y-3">
                  {question.question_options?.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={responses[question.id] === option.id}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        className="h-4 w-4 text-survey-600 focus:ring-survey-500 border-gray-300"
                      />
                      <span className="text-gray-900 font-medium">{option.option_text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-survey-600 text-white font-medium rounded-lg hover:bg-survey-700 focus:outline-none focus:ring-2 focus:ring-survey-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Survey'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Flash Survey • StoryStream Studios</p>
          <p className="mt-1">Your responses are anonymous and secure</p>
        </div>
      </div>
    </div>
  )
} 