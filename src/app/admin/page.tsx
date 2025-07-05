'use client'

import { getCurrentUser, getSurveys, signOut } from '@/lib/api/client'
import { DashboardStats, SurveyListItem } from '@/types'
import { format } from 'date-fns'
import { BarChart3, Clock, Copy, Eye, Plus, TrendingUp, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total_surveys: 0,
    active_surveys: 0,
    total_responses: 0,
    today_responses: 0,
    completion_rates: { average: 0, trend: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all')

  useEffect(() => {
    initializeUser()
  }, [])

  const initializeUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/admin/login')
        return
      }
      setUser(currentUser)
      await loadSurveys()
      await loadStats()
    } catch (error) {
      console.error('Error initializing user:', error)
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const loadSurveys = async () => {
    try {
      const response = await getSurveys()
      if (response.success && response.data) {
        setSurveys(response.data)
      } else {
        console.error('Error loading surveys:', response.error)
        toast.error('Failed to load surveys')
      }
    } catch (error) {
      console.error('Error loading surveys:', error)
      toast.error('Failed to load surveys')
    }
  }

  const loadStats = async () => {
    try {
      const response = await getSurveys()
      if (response.success && response.data) {
        const surveyList = response.data
        const activeSurveys = surveyList.filter((s: SurveyListItem) => s.is_active && new Date(s.expires_at) > new Date())
        const totalResponses = surveyList.reduce((sum: number, s: SurveyListItem) => sum + (s.total_votes || 0), 0)
        
        setStats({
          total_surveys: surveyList.length,
          active_surveys: activeSurveys.length,
          total_responses: totalResponses,
          today_responses: 0,
          completion_rates: { average: 85, trend: 5 }
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const handleCreateSurvey = () => {
    router.push('/admin/surveys/create')
  }

  const handleViewSurvey = (survey: SurveyListItem) => {
    router.push(`/admin/surveys/${survey.id}`)
  }

  const handleCopyLink = (survey: SurveyListItem) => {
    const link = `${window.location.origin}/survey/${survey.public_token}`
    navigator.clipboard.writeText(link)
    toast.success('Survey link copied to clipboard')
  }

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && survey.is_active && new Date(survey.expires_at) > new Date()) ||
      (filterStatus === 'expired' && (!survey.is_active || new Date(survey.expires_at) <= new Date()))
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-survey-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Flash Survey Tool
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {/* Default avatar data URI contains: gray circle with user icon (32x32 SVG) */}
                <img
                  src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0U1RTdFQiIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTIiIHI9IjUiIGZpbGw9IiM5Q0EzQUYiLz4KICA8cGF0aCBkPSJNNiAyN2MwLTUuNTIzIDQuNDc3LTEwIDEwLTEwczEwIDQuNDc3IDEwIDEwIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg=='}
                  alt={user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
                  className="w-8 h-8 rounded-full bg-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    // Only set fallback if we're not already using it and haven't failed before
                    if (!target.src.startsWith('data:image/svg+xml;base64,') && !target.dataset.fallbackFailed) {
                      target.dataset.fallbackFailed = 'true'
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0U1RTdFQiIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTIiIHI9IjUiIGZpbGw9IiM5Q0EzQUYiLz4KICA8cGF0aCBkPSJNNiAyN2MwLTUuNTIzIDQuNDc3LTEwIDEwLTEwczEwIDQuNDc3IDEwIDEwIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg=='
                    }
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stats-card">
            <div className="flex items-center">
              <div className="p-2 bg-survey-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-survey-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Surveys</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_surveys}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <Clock className="h-6 w-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Surveys</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active_surveys}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_responses}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Surveys</h2>
              <button
                onClick={handleCreateSurvey}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-survey-600 hover:bg-survey-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-survey-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'expired')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-survey-500 focus:border-survey-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {filteredSurveys.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {surveys.length === 0 ? "Get started by creating your first survey." : "Try adjusting your search or filter."}
                </p>
                {surveys.length === 0 && (
                  <button
                    onClick={handleCreateSurvey}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-survey-600 hover:bg-survey-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Survey
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredSurveys.map((survey) => (
                  <div key={survey.id} className="survey-card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {survey.title}
                        </h3>
                        {survey.description && (
                          <p className="text-sm text-gray-600 mb-3">{survey.description}</p>
                        )}
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>{survey.question_count || 0} questions</span>
                          <span>{survey.total_votes || 0} responses</span>
                          <span>
                            {new Date(survey.expires_at) > new Date() ? (
                              <span className="text-success-600">Active</span>
                            ) : (
                              <span className="text-gray-400">Expired</span>
                            )}
                          </span>
                          <span>Created {format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewSurvey(survey)}
                          className="p-2 text-gray-400 hover:text-survey-600 hover:bg-survey-50 rounded-lg"
                          title="View Results"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCopyLink(survey)}
                          className="p-2 text-gray-400 hover:text-survey-600 hover:bg-survey-50 rounded-lg"
                          title="Copy Survey Link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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