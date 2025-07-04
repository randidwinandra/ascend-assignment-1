import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

interface SubmitResponseRequest {
  survey_token: string
  responses: {
    question_id: string
    option_id: string
  }[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { survey_token, responses }: SubmitResponseRequest = await req.json()

    if (!survey_token || !responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Survey token and responses are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get survey to validate
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        id,
        is_active,
        expires_at,
        max_votes,
        total_votes,
        questions (
          id,
          required,
          question_options (
            id
          )
        )
      `)
      .eq('public_token', survey_token)
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

    // Check if survey is active and not expired
    if (!survey.is_active || new Date(survey.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Survey is no longer active' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if survey has reached max votes by counting distinct submissions
    const { data: submissionData, error: countError } = await supabase
      .from('responses')
      .select('submission_id')
      .eq('survey_id', survey.id)

    if (countError) {
      console.error('Error counting submissions:', countError)
      // Continue anyway, don't block submission
    }

    const uniqueSubmissions = submissionData ? 
      new Set(submissionData.map(r => r.submission_id)).size : 0
    
    if (uniqueSubmissions >= survey.max_votes) {
      return new Response(
        JSON.stringify({ error: 'Survey has reached maximum responses' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate responses
    const requiredQuestions = survey.questions.filter((q: any) => q.required)
    const providedQuestionIds = responses.map(r => r.question_id)
    const missingRequired = requiredQuestions.filter((q: any) => 
      !providedQuestionIds.includes(q.id)
    )

    if (missingRequired.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Missing responses for required questions' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate option IDs exist for their questions
    for (const response of responses) {
      const question = survey.questions.find((q: any) => q.id === response.question_id)
      if (!question) {
        return new Response(
          JSON.stringify({ error: 'Invalid question ID' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const validOption = question.question_options.find((opt: any) => opt.id === response.option_id)
      if (!validOption) {
        return new Response(
          JSON.stringify({ error: 'Invalid option ID' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Generate a single submission_id for all responses in this survey submission
    const submissionId = crypto.randomUUID()

    // Insert responses with the same submission_id
    const responseInserts = responses.map(response => ({
      survey_id: survey.id,
      question_id: response.question_id,
      option_id: response.option_id,
      submission_id: submissionId
    }))

    const { error: insertError } = await supabase
      .from('responses')
      .insert(responseInserts)

    if (insertError) {
      console.error('Error inserting responses:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save responses' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Note: We no longer update total_votes in surveys table
    // Instead, we count distinct submission_ids from responses table

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Response submitted successfully'
      }),
      { 
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error submitting response:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 