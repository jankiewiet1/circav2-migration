CREATE OR REPLACE FUNCTION public.recalculate_scope1_emissions(p_company_id UUID)
RETURNS SETOF scope1_emissions
LANGUAGE plpgsql
AS $$
DECLARE
  emission RECORD;
  emission_factor FLOAT;
  factor_source TEXT;
  fallback_source TEXT := 'GHG Protocol Default';
  latest_year INT := 2024;  -- Using 2024 data
  matched_count INT := 0;
  fallback_count INT := 0;
  unmatched_count INT := 0;
BEGIN
  -- Get company's preferred emission source
  SELECT preferred_emission_source INTO factor_source
  FROM public.company_preferences
  WHERE company_id = p_company_id;

  IF factor_source IS NULL THEN
    factor_source := 'DEFRA'; -- default fallback
  END IF;

  -- Loop through all Scope 1 emissions for the company
  FOR emission IN 
    SELECT * FROM public.scope1_emissions
    WHERE company_id = p_company_id
  LOOP
    -- Try to find matching emission factor for the preferred source and scope 1
    -- Using the new column structure (Category_1 instead of fuel_type, UOM instead of unit)
    SELECT "GHG_Conversion_Factor_2024" INTO emission_factor
    FROM public.emission_factors
    WHERE LOWER(TRIM("Category_1")) = LOWER(TRIM(emission.fuel_type))
      AND LOWER(TRIM("UOM")) = LOWER(TRIM(emission.unit))
      AND "Source" = factor_source
      AND "Scope" = '1';

    -- Primary factor found
    IF emission_factor IS NOT NULL THEN
      UPDATE scope1_emissions
      SET emissions_co2e = (emission.amount * emission_factor),
          emission_factor_source = factor_source
      WHERE id = emission.id;

      matched_count := matched_count + 1;

    -- Try fallback if no primary factor
    ELSE
      SELECT "GHG_Conversion_Factor_2024" INTO emission_factor
      FROM public.emission_factors
      WHERE LOWER(TRIM("Category_1")) = LOWER(TRIM(emission.fuel_type))
        AND LOWER(TRIM("UOM")) = LOWER(TRIM(emission.unit))
        AND "Source" = fallback_source
        AND "Scope" = '1';

      IF emission_factor IS NOT NULL THEN
        UPDATE scope1_emissions
        SET emissions_co2e = (emission.amount * emission_factor),
            emission_factor_source = fallback_source
        WHERE id = emission.id;

        fallback_count := fallback_count + 1;

        INSERT INTO public.calculation_logs (
          company_id,
          log_type,
          log_message,
          related_id
        ) VALUES (
          p_company_id,
          'info',
          'Used fallback source: ' || fallback_source || ' for ' || emission.fuel_type || ' (' || emission.unit || ')',
          emission.id
        );
      ELSE
        unmatched_count := unmatched_count + 1;

        INSERT INTO public.calculation_logs (
          company_id,
          log_type,
          log_message,
          related_id
        ) VALUES (
          p_company_id,
          'warning',
          'No emission factor found for ' || emission.fuel_type || ' (' || emission.unit || ') in source: ' || factor_source || ' or fallback: ' || fallback_source,
          emission.id
        );
      END IF;
    END IF;

    RETURN NEXT emission;
  END LOOP;

  -- Log summary
  INSERT INTO public.calculation_logs (
    company_id,
    log_type,
    log_message
  ) VALUES (
    p_company_id,
    'info',
    'Recalculation complete: Matched = ' || matched_count || ', Fallback = ' || fallback_count || ', Unmatched = ' || unmatched_count
  );

  RETURN;
END;
$$;
