import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

interface CreateSurveyRequest {
  title: string
  description?: string
  questions: {
    question_text: string
    options: string[]
    required?: boolean
    order_index?: number
  }[]
}

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

    const { title, description, questions }: CreateSurveyRequest = await req.json()

    if (!title || !questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Title and questions are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (questions.length > 3) {
      return new Response(
        JSON.stringify({ error: 'Maximum 3 questions allowed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return new Response(
        JSON.stringify({ 
          error: 'Admin user not found. Please logout and login again to create your admin profile.', 
          details: adminError?.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const adminId = adminUser.id
    const publicToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3)

    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title,
        description,
        admin_id: adminId,
        public_token: publicToken,
        expires_at: expiresAt.toISOString(),
        max_votes: 100,
        is_active: true
      })
      .select()
      .single()

    if (surveyError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create survey' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          survey_id: survey.id,
          question_text: question.question_text,
          question_type: 'radio',
          order_index: question.order_index || i,
          required: question.required !== false
        })
        .select()
        .single()

      if (questionError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create question' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      for (const optionText of question.options) {
        const { error: optionError } = await supabase
          .from('question_options')
          .insert({
            question_id: questionData.id,
            option_text: optionText
          })

        if (optionError) {
          return new Response(
            JSON.stringify({ error: 'Failed to create option' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          public_token: survey.public_token,
          expires_at: survey.expires_at,
          is_active: survey.is_active,
          max_votes: survey.max_votes,
          created_at: survey.created_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 