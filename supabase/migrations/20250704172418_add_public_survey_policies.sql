-- Add RLS policies for public survey access
-- These policies allow public (anonymous) access to surveys, questions, and question_options
-- when accessed via the public_token

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public surveys are viewable by public_token" ON surveys;
DROP POLICY IF EXISTS "Public survey questions are viewable" ON questions;
DROP POLICY IF EXISTS "Public survey question options are viewable" ON question_options;

-- Policy for public access to surveys by public_token
CREATE POLICY "Public surveys are viewable by public_token"
ON surveys
FOR SELECT
TO public
USING (
  is_active = true 
  AND expires_at > now()
  AND public_token IS NOT NULL
);

-- Policy for public access to questions of public surveys
CREATE POLICY "Public survey questions are viewable"
ON questions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = questions.survey_id 
    AND surveys.is_active = true 
    AND surveys.expires_at > now()
    AND surveys.public_token IS NOT NULL
  )
);

-- Policy for public access to question options of public surveys
CREATE POLICY "Public survey question options are viewable"
ON question_options
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM questions 
    JOIN surveys ON surveys.id = questions.survey_id
    WHERE questions.id = question_options.question_id 
    AND surveys.is_active = true 
    AND surveys.expires_at > now()
    AND surveys.public_token IS NOT NULL
  )
);

-- Add policies for admin users to manage their own surveys
CREATE POLICY "Admin users can view their own surveys"
ON surveys
FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

CREATE POLICY "Admin users can insert their own surveys"
ON surveys
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admin users can update their own surveys"
ON surveys
FOR UPDATE
TO authenticated
USING (admin_id = auth.uid());

CREATE POLICY "Admin users can delete their own surveys"
ON surveys
FOR DELETE
TO authenticated
USING (admin_id = auth.uid());

-- Questions policies
CREATE POLICY "Admin users can view questions of their surveys"
ON questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = questions.survey_id 
    AND surveys.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin users can insert questions to their surveys"
ON questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = questions.survey_id 
    AND surveys.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin users can update questions of their surveys"
ON questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = questions.survey_id 
    AND surveys.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete questions of their surveys"
ON questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = questions.survey_id 
    AND surveys.admin_id = auth.uid()
  )
);

-- Question options policies
CREATE POLICY "Admin users can view question options of their surveys"
ON question_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM questions 
    JOIN surveys ON surveys.id = questions.survey_id
    WHERE questions.id = question_options.question_id 
    AND surveys.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin users can insert question options to their surveys"
ON question_options
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM questions 
    JOIN surveys ON surveys.id = questions.survey_id
    WHERE questions.id = question_options.question_id 
    AND surveys.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin users can update question options of their surveys"
ON question_options
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM questions 
    JOIN surveys ON surveys.id = questions.survey_id
    WHERE questions.id = question_options.question_id 
    AND surveys.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete question options of their surveys"
ON question_options
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM questions 
    JOIN surveys ON surveys.id = questions.survey_id
    WHERE questions.id = question_options.question_id 
    AND surveys.admin_id = auth.uid()
  )
);

-- Allow public insert to responses table
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

-- Allow admin users to view responses to their surveys
CREATE POLICY "Admin users can view responses to their surveys"
ON responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = responses.survey_id 
    AND surveys.admin_id = auth.uid()
  )
); 