-- Create a table to track AI processing activities
CREATE TABLE ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  operation TEXT NOT NULL,
  details JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  processing_time FLOAT, -- in seconds
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_ai_processing_logs_company ON ai_processing_logs(company_id);
CREATE INDEX idx_ai_processing_logs_user ON ai_processing_logs(user_id);
CREATE INDEX idx_ai_processing_logs_created ON ai_processing_logs(created_at);

-- Enable RLS
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view AI logs from their company" ON ai_processing_logs
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  ));

-- Allow inserts from edge functions and authenticated users
CREATE POLICY "Users can insert AI logs to their company" ON ai_processing_logs
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  ) OR auth.role() = 'service_role');

-- Add trigger to set user_id automatically
CREATE OR REPLACE FUNCTION set_ai_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ai_log_user_id_trigger
BEFORE INSERT ON ai_processing_logs
FOR EACH ROW
WHEN (NEW.user_id IS NULL)
EXECUTE FUNCTION set_ai_log_user_id(); 