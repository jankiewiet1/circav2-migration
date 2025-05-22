-- Enable Row Level Security
ALTER TABLE data_entry ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see data from their own company
CREATE POLICY "Users can view data from their company" ON data_entry
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  ));

-- Create policy for users to insert data to their own company
CREATE POLICY "Users can insert data to their company" ON data_entry
  FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  ));

-- Create policy for users to update data from their own company
CREATE POLICY "Users can update data from their company" ON data_entry
  FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  ));

-- Create policy for users to delete data from their own company
CREATE POLICY "Users can delete data from their company" ON data_entry
  FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  )); 