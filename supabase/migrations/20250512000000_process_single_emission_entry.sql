-- Create the missing process_single_emission_entry function
CREATE OR REPLACE FUNCTION public.process_single_emission_entry(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_entry_data record;
  v_query_embedding vector;
  v_match record;
  v_calc_id uuid;
BEGIN
  -- Get the entry data
  SELECT * INTO v_entry_data
  FROM emission_entries
  WHERE id = p_entry_id;
  
  IF v_entry_data IS NULL THEN
    RAISE EXCEPTION 'Entry not found with ID %', p_entry_id;
  END IF;
  
  -- If the entry already has an embedding, use it for matching
  -- If not, we'll consider it a simple entry that doesn't need matching
  IF v_entry_data.embedding IS NOT NULL THEN
    -- Find a matching emission factor
    SELECT * INTO v_match
    FROM public.match_emission_factor(v_entry_data.embedding)
    LIMIT 1;
    
    IF v_match IS NOT NULL THEN
      -- Insert calculation record
      INSERT INTO emission_calc_climatiq (
        company_id,
        entry_id,
        total_emissions,
        emissions_unit,
        climatiq_activity_id,
        climatiq_factor_name,
        climatiq_source,
        climatiq_year,
        calculated_at
      ) VALUES (
        v_entry_data.company_id,
        p_entry_id,
        v_entry_data.quantity * v_match.conversion_factor,
        'kg CO2e',
        v_match.category_1,
        CONCAT(v_match.category_1, ' - ', COALESCE(v_match.category_2, ''), ' - ', COALESCE(v_match.category_3, '')),
        v_match.source,
        EXTRACT(YEAR FROM CURRENT_DATE),
        NOW()
      )
      RETURNING id INTO v_calc_id;
      
      -- Update the entry status
      UPDATE emission_entries
      SET match_status = 'matched'
      WHERE id = p_entry_id;
    ELSE
      -- No match found
      UPDATE emission_entries
      SET match_status = 'factor_not_found'
      WHERE id = p_entry_id;
    END IF;
  ELSE
    -- For entries without embedding, we'll mark them as processed but without match
    UPDATE emission_entries
    SET match_status = 'pending'
    WHERE id = p_entry_id;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and update entry status
    RAISE NOTICE 'Error processing entry %: %', p_entry_id, SQLERRM;
    
    UPDATE emission_entries
    SET match_status = 'error'
    WHERE id = p_entry_id;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.process_single_emission_entry(uuid) IS 'Process a single emission entry and attempt to calculate emissions based on matching factors';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_single_emission_entry(uuid) TO authenticated; 