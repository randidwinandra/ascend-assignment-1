'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createSurvey, getCurrentUser } from '@/lib/api/client'
import { SurveyFormData, QuestionFormData, CreateSurveyRequest } from '@/types'

export default function CreateSurvey() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    description: '',
    questions: [
      {
        question_text: '',
        question_type: 'radio',
        options: ['Yes', 'No'],
        required: true
      }
    ]
  })

  const handleAddQuestion = () => {
    if (formData.questions.length >= 3) {
      toast.error('Maximum 3 questions allowed per survey')
      return
    }

    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_text: '',
          question_type: 'radio',
          options: ['Yes', 'No'],
          required: true
        }
      ]
    }))
  }

  const handleRemoveQuestion = (index: number) => {
    if (formData.questions.length <= 1) {
      toast.error('At least one question is required')
      return
    }

    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  const handleQuestionChange = (index: number, field: keyof QuestionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Survey title is required')
      return
    }

    if (formData.questions.some(q => !q.question_text.trim())) {
      toast.error('All questions must have text')
      return
    }

    setLoading(true)
    
    try {
      const user = await getCurrentUser()
      if (!user) {
        toast.error('You must be logged in to create a survey')
        return
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3) // 3 days from now

      const surveyData: CreateSurveyRequest = {
        title: formData.title,
        ...(formData.description && { description: formData.description }),
        questions: formData.questions.map((q, index) => ({
          question_text: q.question_text,
          options: q.options,
          required: q.required,
          order_index: index
        }))
      }

      const response = await createSurvey(surveyData)
      
      if (response.success && response.data) {
        toast.success('Survey created successfully!')
        router.push(`/admin/surveys/${response.data.id}`)
      } else {
        throw new Error(response.error || 'Failed to create survey')
      }
    } catch (error) {
      console.error('Error creating survey:', error)
      toast.error('Failed to create survey. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-semibold text-gray-900">Create New Survey</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Survey Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Survey Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                  placeholder="Enter survey title"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                  placeholder="Enter survey description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    id="expiry-date"
                    value={(() => {
                      const expiryDate = new Date()
                      expiryDate.setDate(expiryDate.getDate() + 3)
                      return expiryDate.toLocaleDateString()
                    })()}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                    title="Survey will expire 3 days from creation date"
                  />
                  <p className="text-xs text-gray-500 mt-1">Survey expires 3 days from creation</p>
                </div>

                <div>
                  <label htmlFor="max-votes" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Votes
                  </label>
                  <input
                    type="text"
                    id="max-votes"
                    value="100"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                    title="Maximum number of responses allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum responses allowed per survey</p>
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Questions</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={formData.questions.length >= 3}
                className="flex items-center px-3 py-2 text-sm font-medium text-survey-600 bg-survey-50 hover:bg-survey-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </button>
            </div>

            <div className="space-y-4">
              {formData.questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Question {index + 1}</h3>
                    {formData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Text *
                      </label>
                      <input
                        type="text"
                        value={question.question_text}
                        onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                        placeholder="Enter your question"
                        maxLength={200}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Type
                      </label>
                      <select
                        value={question.question_type}
                        onChange={(e) => handleQuestionChange(index, 'question_type', e.target.value as 'yes_no' | 'radio')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                      >
                        <option value="yes_no">Yes/No</option>
                        <option value="radio">Radio Button</option>
                      </select>
                    </div>

                    {question.question_type === 'radio' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={question.options.join(', ')}
                          onChange={(e) => handleQuestionChange(index, 'options', e.target.value.split(', ').filter(o => o.trim()))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={question.required}
                        onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                        className="h-4 w-4 text-survey-600 focus:ring-survey-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`required-${index}`} className="ml-2 text-sm text-gray-700">
                        Required question
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-survey-600 border border-transparent rounded-md hover:bg-survey-700 focus:outline-none focus:ring-2 focus:ring-survey-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Survey
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 