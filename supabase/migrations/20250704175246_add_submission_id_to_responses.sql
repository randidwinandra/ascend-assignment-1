-- Add submission_id to responses table to track complete survey submissions
-- This allows us to count survey submissions rather than individual question responses

ALTER TABLE responses 
ADD COLUMN submission_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Add index for better performance when counting submissions
CREATE INDEX IF NOT EXISTS idx_responses_submission_id ON responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey_submission ON responses(survey_id, submission_id);

-- Add constraint to ensure submission_id is consistent within a survey
-- (optional: could add a check constraint if needed)

-- Update the RLS policy for responses to include submission_id context
DROP POLICY IF EXISTS "Anyone can submit survey responses" ON responses;

CREATE POLICY "Anyone can submit survey responses"
ON responses
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = responses.survey_id 
    AND surveys.is_active = true 
    AND surveys.expires_at > now()
    AND surveys.public_token IS NOT NULL
  )
); 