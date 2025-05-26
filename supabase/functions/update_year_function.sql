
CREATE OR REPLACE FUNCTION public.update_emission_entries_year()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update year column from date column (extract year only)
  UPDATE public.emission_entries 
  SET year = EXTRACT(YEAR FROM date)::smallint
  WHERE year IS NULL AND date IS NOT NULL;
END;
$$;
