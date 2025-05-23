-- Fix RLS policies for data_entry table to use company_members instead of company_users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company's data entries" ON data_entry;
DROP POLICY IF EXISTS "Users can insert data entries for their company" ON data_entry;
DROP POLICY IF EXISTS "Users can update their company's data entries" ON data_entry;
DROP POLICY IF EXISTS "Users can delete their company's data entries" ON data_entry;

-- Create corrected RLS policies using company_members table
CREATE POLICY "Users can view their company's data entries"
  ON data_entry
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_members WHERE company_id = data_entry.company_id
    )
  );

CREATE POLICY "Users can insert data entries for their company"
  ON data_entry
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_members WHERE company_id = data_entry.company_id
    )
  );

CREATE POLICY "Users can update their company's data entries"
  ON data_entry
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_members WHERE company_id = data_entry.company_id
    )
  );

CREATE POLICY "Users can delete their company's data entries"
  ON data_entry
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_members WHERE company_id = data_entry.company_id
    )
  ); 