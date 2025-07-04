import { createClient } from '@supabase/supabase-js'
import { 
  Survey, 
  SurveyListItem, 
  SurveyAnalytics, 
  CreateSurveyRequest, 
  SurveyResponseData, 
  ApiResponse 
} from '@/types'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Base URL for Edge Functions
const EDGE_FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

// API Client Class
class ApiClient {
  private async getAuthHeaders(): Promise<Headers> {
    const { data: { session } } = await supabase.auth.getSession()
    
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    
    return headers
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${EDGE_FUNCTIONS_URL}/${endpoint}`
      
      const headers = requireAuth ? await this.getAuthHeaders() : new Headers()
      if (!requireAuth) {
        headers.set('Content-Type', 'application/json')
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...Object.fromEntries(headers),
          ...options.headers
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      const data = await response.json()
      return data as ApiResponse<T>
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      
      if (error instanceof ApiError) {
        throw error
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500
      )
    }
  }

  // Survey Management
  async createSurvey(surveyData: CreateSurveyRequest): Promise<ApiResponse<Survey>> {
    return this.makeRequest<Survey>('create-survey', {
      method: 'POST',
      body: JSON.stringify(surveyData)
    }, true)
  }

  async getSurveys(): Promise<ApiResponse<SurveyListItem[]>> {
    return this.makeRequest<SurveyListItem[]>('get-surveys', {
      method: 'GET'
    }, true)
  }

  async getSurveyAnalytics(surveyId: string): Promise<ApiResponse<SurveyAnalytics>> {
    return this.makeRequest<SurveyAnalytics>(`get-survey-analytics/${surveyId}`, {
      method: 'GET'
    }, true)
  }

  // Public Survey Access
  async getSurveyByToken(token: string): Promise<ApiResponse<Survey>> {
    return this.makeRequest<Survey>(`get-survey-by-token/${token}`, {
      method: 'GET'
    }, false)
  }

  async submitSurveyResponse(responseData: SurveyResponseData): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('submit-response', {
      method: 'POST',
      body: JSON.stringify(responseData)
    }, false)
  }

  // Authentication helpers
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/callback`
      }
    })
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Session management
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Custom Error Class
class ApiError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
    this.name = 'ApiError'
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export individual functions for backward compatibility
export const createSurvey = (data: CreateSurveyRequest) => apiClient.createSurvey(data)
export const getSurveys = () => apiClient.getSurveys()
export const getSurveyAnalytics = (id: string) => apiClient.getSurveyAnalytics(id)
export const getSurveyByToken = (token: string) => apiClient.getSurveyByToken(token)
export const submitSurveyResponse = (data: SurveyResponseData) => apiClient.submitSurveyResponse(data)
export const getCurrentUser = () => apiClient.getCurrentUser()
export const signInWithGoogle = () => apiClient.signInWithGoogle()
export const signOut = () => apiClient.signOut()
export const onAuthStateChange = (callback: (event: string, session: any) => void) => 
  apiClient.onAuthStateChange(callback)

// Export types
export { ApiError }
export type { ApiResponse } 