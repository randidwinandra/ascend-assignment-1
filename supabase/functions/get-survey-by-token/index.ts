import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

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

    // Create Supabase client (no auth needed for public access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get survey by token
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        description,
        expires_at,
        is_active,
        max_votes,
        total_votes,
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
      .eq('public_token', token)
      .eq('is_active', true)
      .single()

    if (surveyError || !survey) {
      return new Response(
        JSON.stringify({ error: 'Survey not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if survey is expired
    if (new Date(survey.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Survey has expired' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if survey has reached max votes
    if (survey.total_votes >= survey.max_votes) {
      return new Response(
        JSON.stringify({ error: 'Survey has reached maximum responses' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sort questions by order_index
    const sortedQuestions = survey.questions.sort((a: any, b: any) => a.order_index - b.order_index)

    // Return survey data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          expires_at: survey.expires_at,
          is_active: survey.is_active,
          max_votes: survey.max_votes,
          total_votes: survey.total_votes,
          questions: sortedQuestions
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
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 