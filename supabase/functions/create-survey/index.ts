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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
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

    // Create Supabase client with service role key for server operations
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

    // Get current user using the JWT token
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

    // Parse request body
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

    // Start transaction
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (adminError) {
      // Create admin user if doesn't exist
      const { data: newAdminUser, error: createAdminError } = await supabase
        .from('admin_users')
        .insert({
          email: user.email!,
          name: user.user_metadata?.full_name || user.email!,
          avatar_url: user.user_metadata?.avatar_url
        })
        .select('id')
        .single()

      if (createAdminError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create admin user' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    const adminId = adminUser?.id || (await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .single()).data?.id

    // Generate public token
    const publicToken = crypto.randomUUID()
    
    // Calculate expiration date (3 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3)

    // Create survey
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

    // Create questions and options
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // Create question
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

      // Create options
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

    // Return created survey
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
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error creating survey:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 