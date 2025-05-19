-- Migration to add automatic emission calculation trigger
-- This will invoke the edge function when new entries are inserted

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION trigger_auto_calculate_emissions()
RETURNS trigger AS $$
DECLARE
  http_response RECORD;
  company_id_val TEXT;
  entry_ids TEXT[];
BEGIN
  -- Get the company ID
  company_id_val := NEW.company_id;
  
  -- Add the new entry ID to the array
  entry_ids := ARRAY[NEW.id];
  
  -- Set the match status to trigger calculation
  NEW.match_status := 'unmatched';
  
  -- Use pg_net to call the edge function asynchronously
  -- This avoids blocking the insert/update operation
  SELECT INTO http_response
    *
  FROM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/calculate-dynamic-emissions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'company_id', company_id_val,
        'entry_ids', entry_ids
      )
    );
  
  -- Log the response for debugging (optional)
  -- INSERT INTO calculation_logs (entry_id, response_status, response_body)
  -- VALUES (NEW.id, http_response.status, http_response.body);
  
  -- Return the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS auto_calculate_emissions_trigger ON emission_entries;
CREATE TRIGGER auto_calculate_emissions_trigger
  AFTER INSERT ON emission_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_calculate_emissions();

-- Add app settings for edge function calls
DO $$
BEGIN
  BEGIN
    PERFORM set_config('app.settings.supabase_url', 
      (SELECT value FROM config WHERE name = 'SUPABASE_URL'), 
      false);
  EXCEPTION
    WHEN OTHERS THEN
      -- If setting doesn't exist, create it
      PERFORM set_config('app.settings.supabase_url', 
        'https://YOUR_SUPABASE_URL', 
        false);
  END;
  
  BEGIN
    PERFORM set_config('app.settings.service_role_key', 
      (SELECT value FROM config WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'), 
      false);
  EXCEPTION
    WHEN OTHERS THEN
      -- If setting doesn't exist, create it
      PERFORM set_config('app.settings.service_role_key', 
        'YOUR_SERVICE_ROLE_KEY', 
        false);
  END;
END $$; 