'use client'

import { getCurrentUser, getSurveys, signOut } from '@/lib/api/client'
import { DashboardStats, SurveyListItem } from '@/types'
import { BarChart3, Clock, Plus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { LoadingPage, Button, StatsCard, SurveyCard } from '@/components/ui'

const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0U1RTdFQiIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTIiIHI9IjUiIGZpbGw9IiM5Q0EzQUYiLz4KICA8cGF0aCBkPSJNNiAyN2MwLTUuNTIzIDQuNDc3LTEwIDEwLTEwczEwIDQuNDc3IDEwIDEwIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg=='

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
    return <LoadingPage />
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
                <img
                  src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || DEFAULT_AVATAR}
                  alt={user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
                  className="w-8 h-8 rounded-full bg-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (!target.src.startsWith('data:image/svg+xml;base64,') && !target.dataset.fallbackFailed) {
                      target.dataset.fallbackFailed = 'true'
                      target.src = DEFAULT_AVATAR
                    }
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Surveys"
            value={stats.total_surveys}
            icon={BarChart3}
          />
          <StatsCard
            title="Active Surveys"
            value={stats.active_surveys}
            icon={Clock}
            iconColor="text-success-600"
          />
          <StatsCard
            title="Total Responses"
            value={stats.total_responses}
            icon={Users}
            iconColor="text-purple-600"
          />
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Your Surveys</h2>
              <Button
                variant="primary"
                onClick={handleCreateSurvey}
                icon={Plus}
              >
                Create Survey
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <input
                type="text"
                placeholder="Search surveys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input max-w-md"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'expired')}
                className="input max-w-xs"
              >
                <option value="all">All Surveys</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="overflow-hidden">
              {filteredSurveys.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No surveys found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSurveys.map((survey) => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      onView={handleViewSurvey}
                      onCopyLink={handleCopyLink}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}