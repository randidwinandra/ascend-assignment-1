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

    const { data: surveys, error: surveysError } = await supabase
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
        max_votes,
        questions (
          id
        )
      `)
      .eq('admin_id', adminUser.id)
      .order('created_at', { ascending: false })

    if (surveysError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch surveys' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const surveyIds = surveys?.map(s => s.id) || []
    let responseCounts: { [key: string]: number } = {}

    if (surveyIds.length > 0) {
      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .select('survey_id, submission_id')
        .in('survey_id', surveyIds)

      if (!responseError && responseData) {
        const responsesBySurvey = responseData.reduce((acc, response) => {
          if (!acc[response.survey_id]) {
            acc[response.survey_id] = new Set()
          }
          acc[response.survey_id].add(response.submission_id)
          return acc
        }, {} as { [key: string]: Set<string> })

        responseCounts = Object.keys(responsesBySurvey).reduce((acc, surveyId) => {
          acc[surveyId] = responsesBySurvey[surveyId].size
          return acc
        }, {} as { [key: string]: number })
      }
    }

    const surveysWithStats = surveys?.map(survey => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      created_at: survey.created_at,
      updated_at: survey.updated_at,
      expires_at: survey.expires_at,
      public_token: survey.public_token,
      is_active: survey.is_active,
      total_votes: responseCounts[survey.id] || 0, // Use actual count instead of database field
      max_votes: survey.max_votes,
      question_count: survey.questions?.length || 0,
      is_expired: new Date(survey.expires_at) <= new Date()
    })) || []

    return new Response(
      JSON.stringify({
        success: true,
        data: surveysWithStats
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error fetching surveys:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 