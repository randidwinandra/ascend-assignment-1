import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"
import { getCachedSurveyByToken, setCachedSurveyByToken } from "../_shared/redis.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get token from URL
    const url = new URL(req.url)
    const token = url.pathname.split('/').pop()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Try to get survey from Redis cache first
    const cachedSurvey = await getCachedSurveyByToken(token)
    if (cachedSurvey) {
      console.log('Cache hit for survey token:', token)
      return new Response(
        JSON.stringify({
          success: true,
          data: cachedSurvey,
          meta: {
            cached: true,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Cache miss for survey token:', token)

    // Create Supabase client (no auth needed for public surveys)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get survey with vote count from database
    const { data: survey, error } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        description,
        created_at,
        expires_at,
        max_votes,
        is_active,
        public_token,
        questions (
          id,
          question_text,
          question_type,
          required,
          order_index,
          question_options (
            id,
            option_text
          )
        )
      `)
      .eq('public_token', token)
      .single()

    console.log('Survey query result:', { survey, error, token })

    if (error || !survey) {
      console.log('Survey not found:', { error: error?.message, token })
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Survey not found',
          debug: { token, error: error?.message }
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if survey is active and not expired (but don't block access if is_active is null/undefined)
    const isExpired = new Date(survey.expires_at) <= new Date()
    const isInactive = survey.is_active === false // Only block if explicitly set to false
    
    if (isExpired) {
      console.log('Survey expired:', { token, expires_at: survey.expires_at })
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Survey has expired',
          debug: { token, expires_at: survey.expires_at, now: new Date().toISOString() }
        }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (isInactive) {
      console.log('Survey inactive:', { token, is_active: survey.is_active })
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Survey is inactive',
          debug: { token, is_active: survey.is_active }
        }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Count distinct submissions for this survey
    const { data: submissionData, error: countError } = await supabase
      .from('responses')
      .select('submission_id')
      .eq('survey_id', survey.id)

    let totalVotes = 0
    if (countError) {
      console.error('Error counting submissions:', countError)
      // Continue with 0 votes if count fails
    } else {
      totalVotes = submissionData ? 
        new Set(submissionData.map((r: any) => r.submission_id)).size : 0
    }

    // Sort questions by order_index
    if (survey.questions) {
      survey.questions.sort((a: any, b: any) => a.order_index - b.order_index)
      
      // Note: question_options don't have order_index, so we keep them as-is
      // The options will be displayed in the order they were created
    }

    // Add the calculated vote count to the survey data
    const surveyWithVotes = {
      ...survey,
      total_votes: totalVotes,
      remaining_votes: survey.max_votes - totalVotes,
      is_full: totalVotes >= survey.max_votes
    }

    // Cache the survey data in Redis for 5 minutes (300 seconds)
    // Use shorter TTL for active surveys to ensure real-time vote counts
    const cacheResult = await setCachedSurveyByToken(token, surveyWithVotes, 300)
    
    if (cacheResult.success) {
      console.log('Survey cached successfully for token:', token)
    } else {
      console.warn('Failed to cache survey:', cacheResult.redis_error)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: surveyWithVotes,
        meta: {
          cached: false,
          timestamp: new Date().toISOString(),
          cache_ttl: 300
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error fetching survey:', error)
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