// Survey Types
export interface Survey {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  expires_at: string
  admin_id: string
  public_token: string
  is_active: boolean
  total_votes: number
  max_votes: number
  questions?: Question[]
  question_count?: number
  is_expired?: boolean
  response_rate?: number
}

export interface Question {
  id: string
  survey_id: string
  question_text: string
  question_type: 'radio'
  order_index: number
  required: boolean
  question_options?: QuestionOption[]
}

export interface QuestionOption {
  id: string
  question_id: string
  option_text: string
}

export interface Response {
  id: string
  survey_id: string
  question_id: string
  option_id: string
  submission_id: string
  submitted_at: string
  question_options?: QuestionOption
}

export interface AdminUser {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Survey Form Types
export interface CreateSurveyRequest {
  title: string
  description?: string
  questions: {
    question_text: string
    options: string[]
    required?: boolean
    order_index?: number
  }[]
}

export interface SurveyFormData {
  title: string
  description?: string
  questions: QuestionFormData[]
}

export interface QuestionFormData {
  question_text: string
  question_type: 'radio' | 'yes_no'
  options: string[]
  required: boolean
  order_index?: number
}

// Survey Response Types
export interface SurveyResponseData {
  survey_token: string
  responses: {
    question_id: string
    option_id: string
  }[]
}

// Analytics Types
export interface QuestionAnalytics {
  question_id: string
  question_text: string
  order_index: number
  required: boolean
  total_responses: number
  options: OptionAnalytics[]
}

export interface OptionAnalytics {
  option_id: string
  option_text: string
  count: number
  percentage: number
}

export interface SurveyAnalytics {
  survey: Survey
  questions: QuestionAnalytics[]
  stats: {
    total_responses: number
    unique_responders: number
    completion_rate: number
    avg_time_per_response?: number
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  error: string
  status?: number
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// Survey Status Types
export type SurveyStatus = 'draft' | 'active' | 'expired' | 'completed' | 'archived'

// Question Types
export type QuestionType = 'radio'

// Filter Types
export interface SurveyFilters {
  status?: SurveyStatus
  created_after?: string
  created_before?: string
  search?: string
  admin_id?: string
}

// Sort Types
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// Component Props Types
export interface SurveyCardProps {
  survey: Survey
  onEdit?: (survey: Survey) => void
  onDelete?: (surveyId: string) => void
  onView?: (survey: Survey) => void
  showActions?: boolean
}

export interface QuestionCardProps {
  question: Question
  onAnswer?: (questionId: string, answer: string) => void
  selectedAnswer?: string
  disabled?: boolean
  showResults?: boolean
  analytics?: QuestionAnalytics
}

// Form Props Types
export interface SurveyFormProps {
  initialData?: Partial<SurveyFormData>
  onSubmit: (data: SurveyFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

// Dashboard Types
export interface DashboardStats {
  total_surveys: number
  active_surveys: number
  total_responses: number
  today_responses: number
  completion_rates: {
    average: number
    trend: number
  }
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'survey_update' | 'new_response' | 'survey_expired' | 'rate_limit_hit'
  payload: any
  timestamp: string
}

// Cache Types
export interface CacheConfig {
  ttl: number
  key: string
  tags?: string[]
}

// Error Types
export interface AppError extends Error {
  code: string
  statusCode: number
  context?: Record<string, any>
}

// Configuration Types
export interface AppConfig {
  supabase: {
    url: string
    anonKey: string
    serviceRoleKey: string
  }
  redis: {
    url: string
    token: string
  }
  auth: {
    providers: string[]
    redirectUrl: string
  }
  survey: {
    maxQuestions: number
    maxVotes: number
    expirationDays: number
  }
  performance: {
    cacheEnabled: boolean
    cacheTTL: number
    rateLimitWindow: number
    rateLimitMax: number
  }
}

// Utility Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

// State Management Types
export interface AppState {
  user: AdminUser | null
  surveys: Survey[]
  currentSurvey: Survey | null
  loading: boolean
  error: string | null
}

export interface SurveyState {
  surveys: Survey[]
  currentSurvey: Survey | null
  analytics: SurveyAnalytics | null
  loading: boolean
  error: string | null
  filters: SurveyFilters
  sort: SortConfig
}

// Hook Types
export interface UseSurveyOptions {
  refetchInterval?: number
  enabled?: boolean
  onSuccess?: (data: Survey) => void
  onError?: (error: Error) => void
}

export interface UseAnalyticsOptions {
  surveyId: string
  realtime?: boolean
  refetchInterval?: number
}

// Form Validation Types
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | boolean
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

// Performance Types
export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  apiResponseTime: number
  cacheHitRate: number
}

// Survey List Item for Dashboard
export interface SurveyListItem {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  expires_at: string
  public_token: string
  is_active: boolean
  total_votes: number
  max_votes: number
  question_count: number
  is_expired: boolean
} 