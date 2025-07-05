import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"
import { checkSurveyVoteLimit, recordVote, getClientIP } from "../_shared/redis.ts"

interface SubmitResponseRequest {
  survey_token: string
  responses: {
    question_id: string
    option_id: string
  }[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientIP = getClientIP(req)
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

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

    if (!survey.is_active || new Date(survey.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Survey is no longer active' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const rateLimit = await checkSurveyVoteLimit(survey.id, clientIP)
    if (!rateLimit.allowed) {
      let errorMessage = 'Rate limit exceeded'
      let retryAfter: number | undefined = 3600
      
      if (rateLimit.reason === 'IP already voted') {
        errorMessage = 'You have already submitted a response to this survey. Each person can only vote once per survey.'
        retryAfter = undefined
      } else if (rateLimit.reason === 'Survey vote limit reached') {
        errorMessage = 'This survey has reached its maximum number of responses and is no longer accepting new submissions.'
        retryAfter = undefined
      }
      
      const responseData: any = { error: errorMessage }
      if (retryAfter !== undefined) {
        responseData.retry_after = retryAfter
      }
      
      return new Response(
        JSON.stringify(responseData),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '1',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': retryAfter ? new Date(Date.now() + retryAfter * 1000).toISOString() : ''
          }
        }
      )
    }

    const { data: submissionData, error: countError } = await supabase
      .from('responses')
      .select('submission_id')
      .eq('survey_id', survey.id)

    if (countError) {
      console.error('Error counting submissions:', countError)
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

    const submissionId = crypto.randomUUID()
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
      return new Response(
        JSON.stringify({ error: 'Failed to record responses' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    try {
      await recordVote(survey.id, clientIP, responseInserts)
    } catch (redisError) {
      console.warn('Redis recording failed:', redisError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Responses recorded successfully',
        submission_id: submissionId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing survey response:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 