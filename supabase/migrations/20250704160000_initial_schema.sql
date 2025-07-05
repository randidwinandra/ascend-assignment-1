-- Supabase Initial Schema

-- ============================================================================
-- Table Creation
-- ============================================================================

-- Admin Users Table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Surveys Table
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  admin_id UUID NOT NULL,
  public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT true NOT NULL,
  total_votes INTEGER DEFAULT 0 NOT NULL,
  max_votes INTEGER DEFAULT 100 NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT fk_surveys_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users (id) ON DELETE CASCADE
);

-- Questions Table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'radio' NOT NULL,
  order_index INTEGER NOT NULL,
  required BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT fk_questions_survey_id FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE,
  CONSTRAINT ck_question_type CHECK (question_type IN ('radio'))
);

-- Question Options Table
CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT fk_question_options_question_id FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);

-- Responses Table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL,
  question_id UUID NOT NULL,
  option_id UUID NOT NULL,
  submission_id UUID NOT NULL DEFAULT gen_random_uuid(),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT fk_responses_survey_id FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE,
  CONSTRAINT fk_responses_question_id FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
  CONSTRAINT fk_responses_option_id FOREIGN KEY (option_id) REFERENCES question_options (id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Admin Users indexes
CREATE INDEX idx_admin_users_email ON admin_users (email);

-- Surveys indexes
CREATE INDEX idx_surveys_admin_id ON surveys (admin_id);
CREATE INDEX idx_surveys_public_token ON surveys (public_token);
CREATE INDEX idx_surveys_active_unexpired ON surveys (is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_surveys_created_at ON surveys (created_at);

-- Questions indexes
CREATE INDEX idx_questions_survey_id ON questions (survey_id);
CREATE INDEX idx_questions_survey_order ON questions (survey_id, order_index);

-- Question Options indexes
CREATE INDEX idx_question_options_question_id ON question_options (question_id);

-- Responses indexes
CREATE INDEX idx_responses_survey_id ON responses (survey_id);
CREATE INDEX idx_responses_question_id ON responses (question_id);
CREATE INDEX idx_responses_option_id ON responses (option_id);
CREATE INDEX idx_responses_submission_id ON responses (submission_id);
CREATE INDEX idx_responses_survey_submission ON responses (survey_id, submission_id);
CREATE INDEX idx_responses_submitted_at ON responses (submitted_at);

-- ============================================================================
-- Triggers for Updated At
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_options_updated_at
  BEFORE UPDATE ON question_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security Setup
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - Admin Users
-- ============================================================================

-- Admin users can view and update their own profile
CREATE POLICY "Users can view their own profile"
ON admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON admin_users
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================================
-- RLS Policies - Surveys
-- ============================================================================

-- Public access to surveys by public_token
CREATE POLICY "Public surveys are viewable by public_token"
ON surveys
FOR SELECT
TO public
USING (
  is_active = true 
  AND expires_at > now()
  AND public_token IS NOT NULL
);

-- Admin users can manage their own surveys
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

-- ============================================================================
-- RLS Policies - Questions
-- ============================================================================

-- Public access to questions of public surveys
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

-- Admin users can manage questions of their surveys
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

-- ============================================================================
-- RLS Policies - Question Options
-- ============================================================================

-- Public access to question options of public surveys
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

-- Admin users can manage question options of their surveys
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

-- ============================================================================
-- RLS Policies - Responses
-- ============================================================================

-- Allow public insert to responses table for active surveys
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

-- ============================================================================
-- Comments for Documention
-- ============================================================================

COMMENT ON TABLE admin_users IS 'Stores admin user profiles who can create and manage surveys';
COMMENT ON TABLE surveys IS 'Main surveys table with public tokens for sharing';
COMMENT ON TABLE questions IS 'Survey questions, currently supports radio type only (as per task constrains)';
COMMENT ON TABLE question_options IS 'Options for radio button questions';
COMMENT ON TABLE responses IS 'Survey response submissions, grouped by submission_id (unique per survey per submission)';

COMMENT ON COLUMN surveys.public_token IS 'Unique token for public survey access without authentication';
COMMENT ON COLUMN surveys.max_votes IS 'Maximum number of responses allowed (default: 100 as per task constrains)';
COMMENT ON COLUMN surveys.expires_at IS 'Survey expiration date (default: 3 days from creation date as per task constrains)';
COMMENT ON COLUMN responses.submission_id IS 'Groups all responses from a single survey submission';

