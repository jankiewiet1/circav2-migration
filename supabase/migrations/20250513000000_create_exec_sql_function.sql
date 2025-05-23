-- Create a function to execute arbitrary SQL (for admin use only)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- runs with privileges of the function creator
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant permission to use the function to authenticated users
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

-- Function to safely insert an emission entry without triggering the process_single_emission_entry function
CREATE OR REPLACE FUNCTION insert_emission_entry(
  p_company_id UUID,
  p_date DATE,
  p_category TEXT,
  p_description TEXT,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_scope INTEGER,
  p_notes TEXT
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO emission_entries(
    company_id, date, category, description, 
    quantity, unit, scope, notes,
    created_at, updated_at, match_status
  ) VALUES (
    p_company_id, p_date, p_category, p_description, 
    p_quantity, p_unit, p_scope, p_notes,
    NOW(), NOW(), 'pending'
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use the function to authenticated users
GRANT EXECUTE ON FUNCTION insert_emission_entry(
  UUID, DATE, TEXT, TEXT, NUMERIC, TEXT, INTEGER, TEXT
) TO authenticated;

-- Optionally, create a temporary disabled version of the trigger
CREATE OR REPLACE FUNCTION public.handle_new_emission_entry() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disabled, just return NEW
  RETURN NEW;
END;
$$; 