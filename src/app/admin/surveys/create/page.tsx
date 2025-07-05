'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createSurvey, getCurrentUser } from '@/lib/api/client'
import { SurveyFormData, QuestionFormData, CreateSurveyRequest } from '@/types'
import { PageHeader, Button, Alert } from '@/components/ui'

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
        options: ['Option 1', 'Option 2'],
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
          options: ['Option 1', 'Option 2'],
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

  const handleAddOption = (questionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? { ...q, options: [...q.options, ''] } : q
      )
    }))
  }

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? { 
          ...q, 
          options: q.options.filter((_, oi) => oi !== optionIndex)
        } : q
      )
    }))
  }

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? { 
          ...q, 
          options: q.options.map((opt, oi) => oi === optionIndex ? value : opt)
        } : q
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

    if (formData.questions.some(q => q.question_type === 'radio' && q.options.length < 2)) {
      toast.error('All radio button questions must have at least 2 options')
      return
    }

    if (formData.questions.some(q => q.options.some(opt => !opt.trim()))) {
      toast.error('All options must have text')
      return
    }

    setLoading(true)
    
    try {
      const user = await getCurrentUser()
      if (!user) {
        toast.error('You must be logged in to create a survey')
        return
      }

      const surveyData: CreateSurveyRequest = {
        title: formData.title,
        ...(formData.description && { description: formData.description }),
        questions: formData.questions.map((q, index) => ({
          question_text: q.question_text,
          options: q.options.filter(opt => opt.trim()).map(opt => opt.trim()),
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
      <PageHeader
        title="Create New Survey"
        icon={BarChart3}
        showBackButton
        onBackClick={() => router.push('/admin')}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Questions</h2>
              <Button
                type="button"
                onClick={handleAddQuestion}
                disabled={formData.questions.length >= 3}
                variant="secondary"
                size="sm"
                icon={Plus}
              >
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {formData.questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Question {index + 1}</h3>
                    {formData.questions.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => handleRemoveQuestion(index)}
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                      />
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
                        onChange={(e) => {
                          const newType = e.target.value as 'yes_no' | 'radio'
                          handleQuestionChange(index, 'question_type', newType)
                          if (newType === 'yes_no') {
                            handleQuestionChange(index, 'options', ['Yes', 'No'])
                          } else if (newType === 'radio' && question.question_type === 'yes_no') {
                            handleQuestionChange(index, 'options', ['Option 1', 'Option 2'])
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                      >
                        <option value="yes_no">Yes/No</option>
                        <option value="radio">Radio Button</option>
                      </select>
                    </div>

                    {(question.question_type === 'radio' || question.question_type === 'yes_no') && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options
                          </label>
                          {question.question_type === 'radio' && (
                            <Button
                              type="button"
                              onClick={() => handleAddOption(index)}
                              variant="ghost"
                              size="sm"
                              icon={Plus}
                            >
                              Add Option
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500 ${
                                  question.question_type === 'yes_no' ? 'bg-gray-50 cursor-not-allowed' : ''
                                }`}
                                placeholder={`Option ${optionIndex + 1}`}
                                disabled={question.question_type === 'yes_no'}
                                readOnly={question.question_type === 'yes_no'}
                              />
                              {question.question_type === 'radio' && question.options.length > 2 && (
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveOption(index, optionIndex)}
                                  variant="ghost"
                                  size="sm"
                                  icon={Trash2}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        {question.question_type === 'radio' && question.options.length < 2 && (
                          <Alert variant="warning" className="mt-2">
                            At least 2 options are required
                          </Alert>
                        )}
                        {question.question_type === 'yes_no' && (
                          <p className="text-xs text-gray-500 mt-1">Yes/No questions use fixed options</p>
                        )}
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

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={() => router.push('/admin')}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              variant="primary"
              icon={Save}
            >
              Create Survey
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 