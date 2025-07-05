import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
    const surveyId = url.pathname.split('/').pop()

    if (!surveyId) {
      return new Response(
        JSON.stringify({ error: 'Survey ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin user not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        expires_at,
        public_token,
        is_active,
        total_votes,
        max_votes,
        questions (
          id,
          question_text,
          order_index,
          required,
          question_options (
            id,
            option_text
          )
        )
      `)
      .eq('id', surveyId)
      .eq('admin_id', adminUser.id)
      .single()

    if (surveyError || !survey) {
      return new Response(
        JSON.stringify({ error: 'Survey not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        question_id,
        option_id,
        submission_id,
        submitted_at,
        question_options (
          option_text
        )
      `)
      .eq('survey_id', surveyId)

    if (responsesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responses' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const totalSubmissions = responses ? 
      new Set(responses.map((r: any) => r.submission_id)).size : 0

    const questionsWithAnalytics = survey.questions
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((question: any) => {
        const questionResponses = responses?.filter((r: any) => r.question_id === question.id) || []

        const optionAnalytics = question.question_options.map((option: any) => {
          const optionResponses = questionResponses.filter((r: any) => r.option_id === option.id)
          const count = optionResponses.length
          const percentage = totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0

          return {
            option_id: option.id,
            option_text: option.option_text,
            count,
            percentage: Math.round(percentage * 100) / 100
          }
        })

        return {
          question_id: question.id,
          question_text: question.question_text,
          order_index: question.order_index,
          required: question.required,
          total_responses: totalSubmissions,
          options: optionAnalytics
        }
      })

    const responseRate = survey.max_votes > 0 ? (totalSubmissions / survey.max_votes) * 100 : 0
    const isExpired = new Date(survey.expires_at) <= new Date()

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          survey: {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            created_at: survey.created_at,
            updated_at: survey.updated_at,
            expires_at: survey.expires_at,
            public_token: survey.public_token,
            is_active: survey.is_active,
            total_votes: totalSubmissions,
            max_votes: survey.max_votes,
            is_expired: isExpired,
            response_rate: Math.round(responseRate * 100) / 100
          },
          questions: questionsWithAnalytics,
          stats: {
            total_responses: totalSubmissions,
            response_rate: Math.round(responseRate * 100) / 100,
            is_expired: isExpired,
            completion_percentage: Math.round(responseRate * 100) / 100
          }
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error fetching survey analytics:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 