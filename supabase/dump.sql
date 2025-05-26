

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."calculation_status" AS ENUM (
    'pending',
    'matched',
    'factor_not_found',
    'error'
);


ALTER TYPE "public"."calculation_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_emissions_climatiq"("entry_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  _entry RECORD;
  _company_id UUID;
  _preferred_source TEXT;
  _result JSONB;
BEGIN
  -- Get the entry details
  SELECT * INTO _entry FROM emission_entries WHERE id = entry_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Entry not found');
  END IF;
  
  _company_id := _entry.company_id;
  
  -- Get preferred emission source
  SELECT preferred_emission_source INTO _preferred_source 
  FROM company_preferences 
  WHERE company_id = _company_id;
  
  IF _preferred_source IS NULL THEN
    _preferred_source := 'DEFRA';
  END IF;
  
  -- In a real implementation, you would call the Climatiq API here
  -- This is a placeholder for the result that would be saved
  _result := jsonb_build_object(
    'total_emissions', 100.0, -- This would come from the API
    'emissions_unit', 'kg',
    'climatiq_category', _entry.category,
    'climatiq_source', _preferred_source,
    'climatiq_activity_id', 'placeholder',
    'scope', _entry.scope,
    'calculated_at', now()
  );
  
  -- Insert the result into the emission_calc_climatiq table
  INSERT INTO emission_calc_climatiq (
    company_id,
    entry_id,
    total_emissions,
    emissions_unit,
    climatiq_category,
    climatiq_source,
    climatiq_activity_id,
    scope,
    calculated_at
  ) VALUES (
    _company_id,
    entry_id,
    (_result->>'total_emissions')::float,
    _result->>'emissions_unit',
    _result->>'climatiq_category',
    _result->>'climatiq_source',
    _result->>'climatiq_activity_id',
    (_result->>'scope')::integer,
    now()
  );
  
  -- Update the entry status
  UPDATE emission_entries 
  SET match_status = 'matched' 
  WHERE id = entry_id;
  
  RETURN _result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."calculate_emissions_climatiq"("entry_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_ghg_emissions"("_company_id" "uuid") RETURNS TABLE("entry_id" "uuid", "co2_emissions" numeric, "ch4_emissions" numeric, "n2o_emissions" numeric, "total_emissions" numeric, "emission_factor" bigint, "match_status" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH to_calc AS (
    SELECT 
      e.id             AS entry_id,
      e.quantity,
      e.category::text AS cat,
      e.unit::text     AS uom,
      e.scope::text    AS scp
    FROM public.emission_entries e
    WHERE e.company_id = _company_id
  ), matched_co2 AS (
    SELECT
      t.entry_id,
      t.quantity,
      f."ID"                                AS emission_factor,
      f."GHG Conversion Factor 2024"      AS cf_co2,
      (SELECT f2."GHG Conversion Factor 2024"
       FROM public.emission_factors f2
       WHERE f2.category_1 = f.category_1
         AND f2.uom = f.uom
         AND f2.scope = f.scope
         AND f2."Source" = 'DEFRA'
         AND f2."GHG/Unit" ILIKE '%CH4%') AS cf_ch4,
      (SELECT f3."GHG Conversion Factor 2024"
       FROM public.emission_factors f3
       WHERE f3.category_1 = f.category_1
         AND f3.uom = f.uom
         AND f3.scope = f.scope
         AND f3."Source" = 'DEFRA'
         AND f3."GHG/Unit" ILIKE '%N2O%') AS cf_n2o
    FROM to_calc t
    JOIN public.emission_factors f
      ON lower(f.category_1) = lower(t.cat)
     AND lower(f.uom) = lower(t.uom)
     AND lower(f.scope) = lower(t.scp)
     AND f."Source" = 'DEFRA'
     AND f."GHG/Unit" ILIKE '%CO2%'
  )
  SELECT
    m.entry_id,
    (m.quantity * m.cf_co2)               AS co2_emissions,
    (m.quantity * m.cf_ch4)               AS ch4_emissions,
    (m.quantity * m.cf_n2o)               AS n2o_emissions,
    ((m.quantity * m.cf_co2) + (m.quantity * m.cf_ch4) + (m.quantity * m.cf_n2o)) AS total_emissions,
    m.emission_factor,
    'matched'                             AS match_status
  FROM matched_co2 m;
END;
$$;


ALTER FUNCTION "public"."calculate_ghg_emissions"("_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_scope_emissions"("p_company_id" "uuid", "p_scope" "text", "p_source" "text" DEFAULT NULL::"text") RETURNS TABLE("entry_id" "uuid", "category" "text", "unit" "text", "quantity" numeric, "date" "date", "co2_factor" numeric, "ch4_factor" numeric, "n2o_factor" numeric, "co2_emissions" numeric, "ch4_emissions" numeric, "n2o_emissions" numeric, "total_emissions" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_calculation_time timestamp with time zone;
    v_source text;
BEGIN
    -- Get the source from company preferences if not provided
    SELECT COALESCE(p_source, cp.preferred_emission_source) 
    INTO v_source
    FROM company_preferences cp 
    WHERE cp.company_id = p_company_id;

    IF v_source IS NULL THEN
        RAISE EXCEPTION 'No emission factor source found for company %', p_company_id;
    END IF;

    v_calculation_time := now();

    -- First delete all existing calculations for this scope/company
    DELETE FROM emission_calculations ec 
    WHERE ec.company_id = p_company_id 
    AND EXISTS (
        SELECT 1 FROM emission_entries ee 
        WHERE ee.id = ec.entry_id 
        AND ee.scope::text = p_scope
    );

    -- Insert new calculations with fuzzy matching
    INSERT INTO emission_calculations (
        company_id,
        entry_id,
        category,
        unit,
        quantity,
        date,
        co2_factor,
        ch4_factor,
        n2o_factor,
        co2_emissions,
        ch4_emissions,
        n2o_emissions,
        total_emissions,
        source,
        calculated_at
    )
    WITH emission_data AS (
        SELECT 
            e.id as e_id,
            e.category as e_category,
            e.unit as e_unit,
            e.scope::text as e_scope,
            e.quantity as e_quantity,
            e.date as e_date,
            e.description as e_description,
            CASE 
                WHEN e.category ILIKE '%flight%' OR e.category ILIKE '%air%' THEN (
                    -- For flights, use "Business travel- air" category
                    SELECT array_agg(ef."GHG Conversion Factor 2024" ORDER BY ef."GHG/Unit")
                    FROM emission_factors ef 
                    WHERE 
                        ef.category_1 ILIKE '%air%' 
                        AND ef.category_2 ILIKE '%flight%'
                        AND (
                            CASE 
                                WHEN e.description ILIKE '%domestic%' OR e.description ILIKE '%local%' OR e.description ILIKE '%paris%' THEN ef.category_3 ILIKE '%domestic%'
                                WHEN e.description ILIKE '%international%' OR e.description ILIKE '%foreign%' THEN ef.category_3 ILIKE '%international%'
                                ELSE true -- Match any if not specified
                            END
                        )
                        AND ef.scope = 'Scope ' || e.scope::text
                        AND ef."Source" = v_source
                        AND ef."GHG/Unit" IN (
                            'kg CO2e of CO2 per unit',
                            'kg CO2e of CH4 per unit',
                            'kg CO2e of N2O per unit'
                        )
                    LIMIT 3
                )
                WHEN e.category ILIKE '%electric%' THEN (
                    -- For electricity, use "UK electricity" category
                    SELECT array_agg(ef."GHG Conversion Factor 2024" ORDER BY ef."GHG/Unit")
                    FROM emission_factors ef 
                    WHERE 
                        ef.category_1 ILIKE '%electricity%'
                        AND ef.scope = 'Scope ' || e.scope::text
                        AND ef."Source" = v_source
                        AND ef."GHG/Unit" IN (
                            'kg CO2e of CO2 per unit',
                            'kg CO2e of CH4 per unit',
                            'kg CO2e of N2O per unit'
                        )
                    LIMIT 3
                )
                WHEN e.category ILIKE '%diesel%' OR e.category ILIKE '%fuel%' THEN (
                    -- For diesel, use "Fuels" > "Liquid fuels" > "Diesel" category
                    SELECT array_agg(ef."GHG Conversion Factor 2024" ORDER BY ef."GHG/Unit")
                    FROM emission_factors ef 
                    WHERE 
                        ef.category_1 = 'Fuels'
                        AND ef.category_2 = 'Liquid fuels'
                        AND ef.category_3 ILIKE '%diesel%'
                        AND ef.scope = 'Scope ' || e.scope::text
                        AND ef."Source" = v_source
                        AND ef."GHG/Unit" IN (
                            'kg CO2e of CO2 per unit',
                            'kg CO2e of CH4 per unit',
                            'kg CO2e of N2O per unit'
                        )
                    LIMIT 3
                )
                ELSE (
                    -- General fallback - try to find a match based on the category name
                    SELECT array_agg(ef."GHG Conversion Factor 2024" ORDER BY ef."GHG/Unit")
                    FROM emission_factors ef 
                    WHERE (
                        ef.category_1 ILIKE '%' || e.category || '%' OR
                        ef.category_2 ILIKE '%' || e.category || '%' OR
                        ef.category_3 ILIKE '%' || e.category || '%' OR
                        ef.category_4 ILIKE '%' || e.category || '%'
                    )
                    AND ef.scope = 'Scope ' || e.scope::text
                    AND ef."Source" = v_source
                    AND ef."GHG/Unit" IN (
                        'kg CO2e of CO2 per unit',
                        'kg CO2e of CH4 per unit',
                        'kg CO2e of N2O per unit'
                    )
                    LIMIT 3
                )
            END as e_factors
        FROM emission_entries e
        WHERE e.company_id = p_company_id
        AND e.scope::text = p_scope
    )
    SELECT
        p_company_id,
        ed.e_id,
        ed.e_category,
        ed.e_unit,
        ed.e_quantity,
        ed.e_date,
        (ed.e_factors)[1],
        (ed.e_factors)[2],
        (ed.e_factors)[3],
        COALESCE(ed.e_quantity * (ed.e_factors)[1], 0),
        COALESCE(ed.e_quantity * (ed.e_factors)[2], 0),
        COALESCE(ed.e_quantity * (ed.e_factors)[3], 0),
        COALESCE(ed.e_quantity * (ed.e_factors)[1], 0) + 
        COALESCE(ed.e_quantity * (ed.e_factors)[2], 0) + 
        COALESCE(ed.e_quantity * (ed.e_factors)[3], 0),
        v_source,
        v_calculation_time
    FROM emission_data ed;

    -- Return the calculated results
    RETURN QUERY
    SELECT 
        s.entry_id,
        s.category,
        s.unit,
        s.quantity,
        s.date,
        s.co2_factor,
        s.ch4_factor,
        s.n2o_factor,
        s.co2_emissions,
        s.ch4_emissions,
        s.n2o_emissions,
        s.total_emissions
    FROM emission_calculations s
    WHERE 
        s.company_id = p_company_id
        AND s.calculated_at = v_calculation_time
    ORDER BY s.date;
END;
$$;


ALTER FUNCTION "public"."calculate_scope_emissions"("p_company_id" "uuid", "p_scope" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_company_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.company_preferences (company_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_company_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_category_text"("category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN TRIM(CONCAT_WS(' ', 
        COALESCE(category_1, ''),
        COALESCE(category_2, ''),
        COALESCE(category_3, ''),
        COALESCE(category_4, '')
    ));
END;
$$;


ALTER FUNCTION "public"."generate_category_text"("category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_data"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$SELECT jsonb_build_object(
    'total_emissions', COALESCE(total.sum, 0),
    'team_members', COALESCE(members.count, 0),
    'emissions_by_scope', COALESCE(scope_data.jsonb_agg, '[]'::jsonb), -- Corrected access
    'monthly_trends', COALESCE(monthly.jsonb_agg, '[]'::jsonb),     -- Corrected access
    'unmatched_count', COALESCE(unmatched.count, 0)
)
FROM
    -- Total emissions
    (SELECT SUM(ec.total_emissions) as sum 
     FROM emission_calculations ec
     JOIN emission_entries ee ON ec.entry_id = ee.id
     WHERE ee.company_id = p_company_id) as total,
    
    -- Team members count
    (SELECT COUNT(*) as count 
     FROM company_members 
     WHERE company_id = p_company_id) as members,
    
    -- Emissions by scope
    (SELECT jsonb_agg(s) FROM ( -- This subquery result is named jsonb_agg
        SELECT 
            'Scope ' || ee.scope as scope,
            SUM(ec.total_emissions) as value 
        FROM emission_entries ee
        JOIN emission_calculations ec ON ee.id = ec.entry_id
        WHERE ee.company_id = p_company_id
        GROUP BY ee.scope
        ORDER BY ee.scope
     ) s) as scope_data,
    
    -- Monthly trends
    (SELECT jsonb_agg(m) FROM ( -- This subquery result is named jsonb_agg
        SELECT 
            to_char(date_trunc('month', ee.date), 'YYYY-MM') as month,
            SUM(ec.total_emissions) as total_monthly_emissions 
        FROM emission_entries ee
        JOIN emission_calculations ec ON ee.id = ec.entry_id
        WHERE ee.company_id = p_company_id AND ec.total_emissions IS NOT NULL
        GROUP BY date_trunc('month', ee.date)
        ORDER BY month
     ) m) as monthly,
     
    -- Unmatched entries (no calculation or null/zero total emissions)
    (SELECT COUNT(*) as count
     FROM emission_entries ee
     LEFT JOIN emission_calculations ec ON ee.id = ec.entry_id
     WHERE ee.company_id = p_company_id 
     AND (ec.id IS NULL OR ec.total_emissions IS NULL OR ec.total_emissions = 0)) as unmatched$$;


ALTER FUNCTION "public"."get_dashboard_data"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_emission_calculation_status"("p_company_id" "uuid", "p_scope" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_result json;
begin
  select json_build_object(
    'total_entries', (
      select count(*) 
      from emission_entries 
      where company_id = p_company_id 
      and scope = p_scope
    ),
    'matched', (
      select count(distinct e.id)
      from emission_entries e
      inner join emission_factors f on 
        lower(e.category) = lower(f.category_1)
        and lower(e.uom) = lower(f.uom)
        and lower(e.scope) = lower(f.scope)
      where e.company_id = p_company_id 
      and e.scope = p_scope
    ),
    'unmatched', (
      select count(distinct e.id)
      from emission_entries e
      left join emission_factors f on 
        lower(e.category) = lower(f.category_1)
        and lower(e.uom) = lower(f.uom)
        and lower(e.scope) = lower(f.scope)
      where e.company_id = p_company_id 
      and e.scope = p_scope
      and f.id is null
    )
  ) into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."get_emission_calculation_status"("p_company_id" "uuid", "p_scope" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer) RETURNS TABLE("id" "uuid", "company_id" "uuid", "date" "date", "category" "text", "description" "text", "quantity" numeric, "unit" "text", "scope" smallint, "notes" "text", "embedding" "public"."vector")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select 
    e.id,
    e.company_id,
    e.date,
    e.category,
    e.description,
    e.quantity,
    e.unit,
    e.scope,
    e.notes,
    e.embedding
  from emission_entries e
  left join emission_calculations c on e.id = c.entry_id
  where c.id is null
  limit batch_limit;
end;
$$;


ALTER FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."emission_entries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "upload_session_id" "uuid",
    "date" "date" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(12,4) NOT NULL,
    "unit" "text" NOT NULL,
    "scope" smallint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year" smallint GENERATED ALWAYS AS ((EXTRACT(year FROM "date"))::smallint) STORED,
    "notes" "text",
    "match_status" "text" DEFAULT 'unmatched'::"text",
    "embedding" "public"."vector"(1536),
    CONSTRAINT "emission_entries_scope_check" CHECK (("scope" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."emission_entries" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer DEFAULT 50, "cursor_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."emission_entries"
    LANGUAGE "sql"
    AS $$
    SELECT e.*
    FROM public.emission_entries e
    LEFT JOIN public.emission_calc_climatiq c ON c.entry_id = e.id
    WHERE c.entry_id IS NULL
    AND (cursor_id IS NULL OR e.id > cursor_id)
    ORDER BY e.id
    LIMIT batch_limit;
$$;


ALTER FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer, "cursor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_emission_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM public.process_single_emission_entry(NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_emission_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_notification_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_notification_settings (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_notification_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_categories"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "table_name" "text") RETURNS TABLE("id" bigint, "category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text", "uom" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      ef.id,
      ef.category_1,
      ef.category_2,
      ef.category_3,
      ef.category_4,
      ef.uom,
      1 - (ef.embedding <=> $1) as similarity
    FROM %I ef
    WHERE 1 - (ef.embedding <=> $1) > $2
    ORDER BY similarity DESC
    LIMIT $3
  ', table_name)
  USING query_embedding, match_threshold, match_count;
END;
$_$;


ALTER FUNCTION "public"."match_categories"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_categories_with_factors"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text", "similarity" double precision, "factors" "json")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH similar_categories AS (
    SELECT DISTINCT ON (
        ef.category_1,
        ef.category_2,
        ef.category_3,
        ef.category_4
      )
      ef.category_1,
      ef.category_2,
      ef.category_3,
      ef.category_4,
      1 - (ef.embedding <=> query_embedding) AS similarity
    FROM emission_factors ef
    WHERE ef.embedding IS NOT NULL
      AND 1 - (ef.embedding <=> query_embedding) > match_threshold
    ORDER BY
      ef.category_1,
      ef.category_2,
      ef.category_3,
      ef.category_4,
      1 - (ef.embedding <=> query_embedding) DESC
  ),
  conversion_factors AS (
    SELECT
      sc.category_1,
      sc.category_2,
      sc.category_3,
      sc.category_4,
      sc.similarity,
      json_agg(
        json_build_object(
          'uom',               ef.uom,
          'ghg_unit',          ef."GHG/Unit",
          'conversion_factor', ef."GHG Conversion Factor",
          'source',            ef."Source"
        )
      ) AS factors
    FROM similar_categories sc
    JOIN emission_factors ef
      ON ef.category_1 = sc.category_1
     AND COALESCE(ef.category_2, '') = COALESCE(sc.category_2, '')
     AND COALESCE(ef.category_3, '') = COALESCE(sc.category_3, '')
     AND COALESCE(ef.category_4, '') = COALESCE(sc.category_4, '')
    GROUP BY
      sc.category_1,
      sc.category_2,
      sc.category_3,
      sc.category_4,
      sc.similarity
  )
  SELECT
    cf.category_1,
    cf.category_2,
    cf.category_3,
    cf.category_4,
    cf.similarity,
    cf.factors
  FROM conversion_factors AS cf
  ORDER BY cf.similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_categories_with_factors"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_emission_factor"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7) RETURNS TABLE("id" bigint, "scope" "text", "category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text", "uom" "text", "source" "text", "conversion_factor" numeric, "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- First try to match with RIVM
    RETURN QUERY
    SELECT 
        ef.id,
        ef."Scope",
        ef.category_1,
        ef.category_2,
        ef.category_3,
        ef.category_4,
        ef.uom,
        ef."Source",
        ef."GHG Conversion Factor" as conversion_factor,
        1 - (ef.embedding <=> query_embedding) as similarity
    FROM emission_factors ef
    WHERE ef."Source" = 'RIVM'
        AND 1 - (ef.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT 1;

    -- If no RIVM match found, try DEFRA
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            ef.id,
            ef."Scope",
            ef.category_1,
            ef.category_2,
            ef.category_3,
            ef.category_4,
            ef.uom,
            ef."Source",
            ef."GHG Conversion Factor" as conversion_factor,
            1 - (ef.embedding <=> query_embedding) as similarity
        FROM emission_factors ef
        WHERE ef."Source" = 'DEFRA'
            AND 1 - (ef.embedding <=> query_embedding) > match_threshold
        ORDER BY similarity DESC
        LIMIT 1;
    END IF;
END;
$$;


ALTER FUNCTION "public"."match_emission_factor"("query_embedding" "public"."vector", "match_threshold" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_unit"("raw_value" numeric, "raw_unit" "text") RETURNS TABLE("norm_value" numeric, "norm_unit" "text")
    LANGUAGE "sql"
    AS $$
  SELECT
    raw_value * uc.multiplier,
    uc.standard_unit
  FROM public.unit_conversions uc
  WHERE lower(uc.unit_from) = lower(raw_unit)
  UNION ALL
  -- fallback: if no match, return original
  SELECT
    raw_value,
    raw_unit
  WHERE NOT EXISTS (
    SELECT 1 FROM public.unit_conversions
    WHERE lower(unit_from) = lower(raw_unit)
  );
$$;


ALTER FUNCTION "public"."normalize_unit"("raw_value" numeric, "raw_unit" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_all_emission_entries"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    r RECORD;
    match RECORD;
    co2_factor NUMERIC := 0;
    ch4_factor NUMERIC := 0;
    n2o_factor NUMERIC := 0;
    co2_emissions NUMERIC := 0;
    ch4_emissions NUMERIC := 0;
    n2o_emissions NUMERIC := 0;
    total_emissions NUMERIC := 0;
    match_source TEXT := NULL;
BEGIN
    FOR r IN
        SELECT * FROM emission_entries
        WHERE id NOT IN (SELECT entry_id FROM emission_calculations)
    LOOP
        -- 1. Match using embedding
        SELECT * INTO match
        FROM match_categories_with_factors(
            r.embedding::vector, 0.3, 1
        ) LIMIT 1;

        IF match IS NULL THEN
            RAISE WARNING 'No match found for entry %', r.id;
            CONTINUE;
        END IF;

        -- 2. Extract factors for the entry's unit, LIMIT 1 to avoid multiple rows
        SELECT
            (SELECT f->>'conversion_factor' FROM jsonb_array_elements(match.factors::jsonb) f WHERE f->>'uom' = r.unit AND f->>'ghg_unit' ILIKE '%CO2%' LIMIT 1)::NUMERIC,
            (SELECT f->>'conversion_factor' FROM jsonb_array_elements(match.factors::jsonb) f WHERE f->>'uom' = r.unit AND f->>'ghg_unit' ILIKE '%CH4%' LIMIT 1)::NUMERIC,
            (SELECT f->>'conversion_factor' FROM jsonb_array_elements(match.factors::jsonb) f WHERE f->>'uom' = r.unit AND f->>'ghg_unit' ILIKE '%N2O%' LIMIT 1)::NUMERIC,
            (SELECT f->>'source' FROM jsonb_array_elements(match.factors::jsonb) f WHERE f->>'uom' = r.unit LIMIT 1)
        INTO co2_factor, ch4_factor, n2o_factor, match_source;

        co2_factor := COALESCE(co2_factor, 0);
        ch4_factor := COALESCE(ch4_factor, 0);
        n2o_factor := COALESCE(n2o_factor, 0);

        -- 3. Calculate emissions
        co2_emissions := r.quantity * co2_factor;
        ch4_emissions := r.quantity * ch4_factor;
        n2o_emissions := r.quantity * n2o_factor;
        total_emissions := co2_emissions + ch4_emissions + n2o_emissions;

        -- 4. Save to emission_calculations
        INSERT INTO emission_calculations (
            entry_id, company_id, date,
            co2_factor, ch4_factor, n2o_factor,
            co2_emissions, ch4_emissions, n2o_emissions,
            total_emissions, source, status, calculated_at
        ) VALUES (
            r.id, r.company_id, r.date,
            co2_factor, ch4_factor, n2o_factor,
            co2_emissions, ch4_emissions, n2o_emissions,
            total_emissions, match_source, 'matched', now()
        )
        ON CONFLICT (entry_id) DO UPDATE SET
            co2_factor = EXCLUDED.co2_factor,
            ch4_factor = EXCLUDED.ch4_factor,
            n2o_factor = EXCLUDED.n2o_factor,
            co2_emissions = EXCLUDED.co2_emissions,
            ch4_emissions = EXCLUDED.ch4_emissions,
            n2o_emissions = EXCLUDED.n2o_emissions,
            total_emissions = EXCLUDED.total_emissions,
            source = EXCLUDED.source,
            status = EXCLUDED.status,
            calculated_at = EXCLUDED.calculated_at;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."process_all_emission_entries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_emission_entry"("entry_id" "uuid") RETURNS TABLE("calculation_id" "uuid", "matched_factor_id" bigint, "source" "text", "total_emissions" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_category text;
    v_quantity numeric;
    v_unit text;
    v_scope smallint;
    v_company_id uuid;
    v_date date;
    v_embedding vector(1536);
    v_match record;
    v_calculation_id uuid;
    v_total_emissions numeric;
BEGIN
    -- Get entry details
    SELECT 
        category,
        quantity,
        unit,
        scope,
        company_id,
        date,
        embedding
    INTO 
        v_category,
        v_quantity,
        v_unit,
        v_scope,
        v_company_id,
        v_date,
        v_embedding
    FROM emission_entries
    WHERE id = entry_id;

    -- If we don't have an embedding yet, return null (this should be handled by the edge function)
    IF v_embedding IS NULL THEN
        RETURN;
    END IF;

    -- Find matching emission factor
    SELECT * INTO v_match
    FROM match_emission_factor(v_embedding)
    LIMIT 1;

    -- If no match found, return null
    IF v_match IS NULL THEN
        RETURN;
    END IF;

    -- Calculate total emissions
    v_total_emissions := v_quantity * v_match.ghg_conversion_factor;

    -- Insert into emission_calculations
    INSERT INTO emission_calculations (
        company_id,
        entry_id,
        emission_factor_id,
        source,
        total_emissions,
        date,
        created_at,
        updated_at
    )
    VALUES (
        v_company_id,
        entry_id,
        v_match.id,
        v_match.source,
        v_total_emissions,
        v_date,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_calculation_id;

    -- Update emission entry status
    UPDATE emission_entries
    SET 
        match_status = 'matched',
        scope = COALESCE(scope, v_match.scope::smallint)
    WHERE id = entry_id;

    RETURN QUERY
    SELECT 
        v_calculation_id,
        v_match.id,
        v_match.source,
        v_total_emissions;
END;
$$;


ALTER FUNCTION "public"."process_emission_entry"("entry_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_calculate_emissions_on_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Don't trigger for already matched entries
  IF NEW.match_status = 'matched' THEN
    RETURN NEW;
  END IF;
  
  -- Schedule emission calculation (in a real implementation)
  -- This would likely call the calculate_emissions_climatiq function
  -- or queue the entry for processing
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_calculate_emissions_on_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_emission_calc_climatiq_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_emission_calc_climatiq_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "industry" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "country" "text",
    "kvk_number" "text",
    "vat_number" "text",
    "iban" "text",
    "bank_name" "text",
    "billing_email" "text",
    "phone_number" "text",
    "billing_address" "text",
    "postal_code" "text",
    "city" "text",
    "contact_name" "text",
    "contact_title" "text",
    "contact_email" "text",
    "setup_completed" boolean DEFAULT false,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "invited_by" "uuid",
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text"]))),
    CONSTRAINT "company_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."company_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "role" "text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."company_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "preferred_currency" "text" DEFAULT 'EUR'::"text",
    "fiscal_year_start_month" "text" DEFAULT '1'::"text",
    "reporting_frequency" "text" DEFAULT 'monthly'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "timezone" "text" DEFAULT 'Europe/Amsterdam'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "emission_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "default_view" "text" DEFAULT 'dashboard'::"text" NOT NULL,
    "preferred_emission_source" "text" DEFAULT 'DEFRA'::"text"
);


ALTER TABLE "public"."company_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emission_calc_climatiq" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "entry_id" "uuid",
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_emissions" double precision NOT NULL,
    "emissions_unit" character varying DEFAULT 'kg'::character varying NOT NULL,
    "scope" integer,
    "climatiq_activity_id" character varying,
    "climatiq_emissions_factor_id" character varying,
    "climatiq_factor_name" character varying,
    "climatiq_region" character varying,
    "climatiq_category" character varying,
    "climatiq_source" character varying,
    "climatiq_year" integer,
    "co2_emissions" double precision,
    "ch4_emissions" double precision,
    "n2o_emissions" double precision,
    "activity_data" "jsonb",
    "request_params" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."emission_calc_climatiq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emission_calculations_legacy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "date" "date",
    "co2_factor" numeric,
    "ch4_factor" numeric,
    "n2o_factor" numeric,
    "co2_emissions" numeric,
    "ch4_emissions" numeric,
    "n2o_emissions" numeric,
    "total_emissions" numeric,
    "source" "text",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."calculation_status" DEFAULT 'pending'::"public"."calculation_status" NOT NULL,
    "emission_factor_id" bigint,
    "matched_category_1" "text",
    "matched_category_2" "text",
    "matched_category_3" "text",
    "matched_category_4" "text",
    "matched_factor_id" "uuid",
    "matched_similarity" numeric,
    "matched_uom" "text",
    "matched_ghg_unit" "text"
);


ALTER TABLE "public"."emission_calculations_legacy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emission_factors_legacy" (
    "Scope" "text",
    "category_1" "text",
    "category_2" "text",
    "category_3" "text",
    "category_4" "text",
    "uom" "text",
    "GHG/Unit" "text",
    "GHG Conversion Factor" numeric,
    "Source" "text",
    "embedding" "public"."vector"(1536),
    "id" bigint NOT NULL
);


ALTER TABLE "public"."emission_factors_legacy" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."emission_factors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."emission_factors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."emission_factors_id_seq" OWNED BY "public"."emission_factors_legacy"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "phone_number" "text",
    "job_title" "text",
    "department" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "receive_upload_alerts" boolean DEFAULT true,
    "receive_deadline_notifications" boolean DEFAULT true,
    "receive_newsletter" boolean DEFAULT false,
    "theme" "text" DEFAULT 'system'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "timezone" "text" DEFAULT 'Europe/Amsterdam'::"text",
    "date_format" "text" DEFAULT 'YYYY-MM-DD'::"text",
    "preferred_currency" "text" DEFAULT 'EUR'::"text",
    "lock_team_changes" boolean DEFAULT false,
    "require_reviewer" boolean DEFAULT false,
    "audit_logging_enabled" boolean DEFAULT true,
    "default_member_role" "text" DEFAULT 'viewer'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "settings_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unit_conversions" (
    "unit_from" "text" NOT NULL,
    "standard_unit" "text" NOT NULL,
    "multiplier" numeric NOT NULL,
    "category" "text" NOT NULL
);


ALTER TABLE "public"."unit_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_settings" (
    "id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_notification_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_emissions_by_scope" AS
 SELECT "c"."name" AS "company_name",
    "e"."scope",
    "date_trunc"('month'::"text", "e"."calculated_at") AS "month",
    "sum"("e"."total_emissions") AS "total_emissions",
    "e"."emissions_unit"
   FROM ("public"."emission_calc_climatiq" "e"
     JOIN "public"."companies" "c" ON (("e"."company_id" = "c"."id")))
  WHERE ("e"."scope" IS NOT NULL)
  GROUP BY "c"."name", "e"."scope", ("date_trunc"('month'::"text", "e"."calculated_at")), "e"."emissions_unit"
  ORDER BY "c"."name", ("date_trunc"('month'::"text", "e"."calculated_at")), "e"."scope";


ALTER TABLE "public"."view_emissions_by_scope" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_entries_by_year_and_scope" AS
 SELECT "ee"."company_id",
    "ee"."scope",
    "ee"."year",
    ("sum"("ec"."total_emissions"))::numeric(14,2) AS "total_kg_co2e"
   FROM ("public"."emission_entries" "ee"
     JOIN "public"."emission_calculations_legacy" "ec" ON (("ec"."entry_id" = "ee"."id")))
  GROUP BY "ee"."company_id", "ee"."scope", "ee"."year";


ALTER TABLE "public"."view_entries_by_year_and_scope" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_monthly_by_scope" AS
 SELECT "ee"."company_id",
    "ee"."scope",
    ("date_trunc"('month'::"text", ("ee"."date")::timestamp with time zone))::"date" AS "month",
    ("sum"("ec"."total_emissions"))::numeric(14,2) AS "total_kg_co2e"
   FROM ("public"."emission_entries" "ee"
     JOIN "public"."emission_calculations_legacy" "ec" ON (("ec"."entry_id" = "ee"."id")))
  GROUP BY "ee"."company_id", "ee"."scope", ("date_trunc"('month'::"text", ("ee"."date")::timestamp with time zone));


ALTER TABLE "public"."view_monthly_by_scope" OWNER TO "postgres";


ALTER TABLE ONLY "public"."emission_factors_legacy" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."emission_factors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_preferences"
    ADD CONSTRAINT "company_preferences_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_preferences"
    ADD CONSTRAINT "company_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emission_calc_climatiq"
    ADD CONSTRAINT "emission_calc_climatiq_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emission_calculations_legacy"
    ADD CONSTRAINT "emission_calculations_company_id_entry_id_key" UNIQUE ("company_id", "entry_id");



ALTER TABLE ONLY "public"."emission_calculations_legacy"
    ADD CONSTRAINT "emission_calculations_entry_id_key" UNIQUE ("entry_id");



ALTER TABLE ONLY "public"."emission_calculations_legacy"
    ADD CONSTRAINT "emission_calculations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emission_entries"
    ADD CONSTRAINT "emission_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emission_factors_legacy"
    ADD CONSTRAINT "emission_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."emission_entries"
    ADD CONSTRAINT "unique_emission_entry" UNIQUE ("company_id", "date", "category", "unit", "scope");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("unit_from");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id");



CREATE INDEX "emission_calc_climatiq_calculated_at_idx" ON "public"."emission_calc_climatiq" USING "btree" ("calculated_at");



CREATE INDEX "emission_calc_climatiq_company_id_idx" ON "public"."emission_calc_climatiq" USING "btree" ("company_id");



CREATE INDEX "emission_calc_climatiq_entry_id_idx" ON "public"."emission_calc_climatiq" USING "btree" ("entry_id");



CREATE INDEX "emission_calc_climatiq_scope_idx" ON "public"."emission_calc_climatiq" USING "btree" ("scope");



CREATE INDEX "emission_calculations_company_date_idx" ON "public"."emission_calculations_legacy" USING "btree" ("company_id", "date");



CREATE INDEX "idx_company_preferences_lookup" ON "public"."company_preferences" USING "btree" ("company_id", "preferred_emission_source");



CREATE INDEX "idx_emission_calculations_entry" ON "public"."emission_calculations_legacy" USING "btree" ("entry_id");



CREATE INDEX "idx_emission_entries_category" ON "public"."emission_entries" USING "btree" ("category");



CREATE INDEX "idx_emission_entries_category_unit_scope" ON "public"."emission_entries" USING "btree" ("category", "unit", "scope");



CREATE INDEX "idx_emission_entries_company_id" ON "public"."emission_entries" USING "btree" ("company_id");



CREATE INDEX "idx_emission_entries_company_year" ON "public"."emission_entries" USING "btree" ("company_id", "year");



CREATE INDEX "idx_emission_entries_date" ON "public"."emission_entries" USING "btree" ("date");



CREATE INDEX "idx_emission_entries_scope" ON "public"."emission_entries" USING "btree" ("scope");



CREATE OR REPLACE TRIGGER "companies_updated_at_trigger" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "company_preferences_updated_at_trigger" BEFORE UPDATE ON "public"."company_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "create_company_preferences_trigger" AFTER INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."create_company_preferences"();



CREATE OR REPLACE TRIGGER "emission_calc_climatiq_updated_at" BEFORE UPDATE ON "public"."emission_calc_climatiq" FOR EACH ROW EXECUTE FUNCTION "public"."update_emission_calc_climatiq_updated_at"();



CREATE OR REPLACE TRIGGER "emission_entry_calculate_emissions" AFTER INSERT ON "public"."emission_entries" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_calculate_emissions_on_entry"();



CREATE OR REPLACE TRIGGER "settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_emission_entry_insert" AFTER INSERT ON "public"."emission_entries" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_emission_entry"();



CREATE OR REPLACE TRIGGER "update_company_preferences_updated_at" BEFORE UPDATE ON "public"."company_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_preferences"
    ADD CONSTRAINT "company_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."emission_calc_climatiq"
    ADD CONSTRAINT "emission_calc_climatiq_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emission_calc_climatiq"
    ADD CONSTRAINT "emission_calc_climatiq_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."emission_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emission_calculations_legacy"
    ADD CONSTRAINT "emission_calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."emission_calculations_legacy"
    ADD CONSTRAINT "emission_calculations_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."emission_entries"("id");



ALTER TABLE ONLY "public"."emission_entries"
    ADD CONSTRAINT "emission_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "	Users can insert companies" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Admins can insert company preferences" ON "public"."company_preferences" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update company preferences" ON "public"."company_preferences" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = 'admin'::"text")))));



CREATE POLICY "Allow all operations on profiles" ON "public"."profiles" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert their own emission entries" ON "public"."emission_entries" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IN ( SELECT "company_members"."user_id"
   FROM "public"."company_members"
  WHERE ("company_members"."company_id" = "emission_entries"."company_id"))));



CREATE POLICY "Allow insert for authenticated users" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow users to delete emission entries for their companies" ON "public"."emission_entries" FOR DELETE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "company_members"."user_id"
   FROM "public"."company_members"
  WHERE ("company_members"."company_id" = "emission_entries"."company_id"))));



CREATE POLICY "Allow users to update emission entries for their companies" ON "public"."emission_entries" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "company_members"."user_id"
   FROM "public"."company_members"
  WHERE ("company_members"."company_id" = "emission_entries"."company_id"))));



CREATE POLICY "Allow users to view emission entries for their companies" ON "public"."emission_entries" FOR SELECT TO "authenticated" USING (("auth"."uid"() IN ( SELECT "company_members"."user_id"
   FROM "public"."company_members"
  WHERE ("company_members"."company_id" = "emission_entries"."company_id"))));



CREATE POLICY "Company admins can delete emission calculations" ON "public"."emission_calc_climatiq" FOR DELETE USING (("auth"."uid"() IN ( SELECT "cm"."user_id"
   FROM "public"."company_members" "cm"
  WHERE (("cm"."company_id" = "emission_calc_climatiq"."company_id") AND ("cm"."role" = 'admin'::"text")))));



CREATE POLICY "Company admins can insert preferences" ON "public"."company_preferences" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = 'admin'::"text")))));



CREATE POLICY "Company admins can update emission calculations" ON "public"."emission_calc_climatiq" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "cm"."user_id"
   FROM "public"."company_members" "cm"
  WHERE (("cm"."company_id" = "emission_calc_climatiq"."company_id") AND ("cm"."role" = 'admin'::"text")))));



CREATE POLICY "Company admins can update preferences" ON "public"."company_preferences" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = 'admin'::"text")))));



CREATE POLICY "Company members can add emission calculations" ON "public"."emission_calc_climatiq" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "cm"."user_id"
   FROM "public"."company_members" "cm"
  WHERE ("cm"."company_id" = "emission_calc_climatiq"."company_id"))));



CREATE POLICY "Company members can view preferences" ON "public"."company_preferences" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Company members can view their companies" ON "public"."companies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "companies"."id") AND ("company_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Company members can view their company's emission calculations" ON "public"."emission_calc_climatiq" FOR SELECT USING (("auth"."uid"() IN ( SELECT "cm"."user_id"
   FROM "public"."company_members" "cm"
  WHERE ("cm"."company_id" = "emission_calc_climatiq"."company_id"))));



CREATE POLICY "Company members with admin or editor role can update companies" ON "public"."companies" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "companies"."id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."emission_entries" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Insert own membership" ON "public"."company_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own companies" ON "public"."companies" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by_user_id"));



CREATE POLICY "Users can delete invitations for their company" ON "public"."company_invitations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_invitations"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = 'admin'::"text")))));



CREATE POLICY "Users can delete their own companies" ON "public"."companies" FOR DELETE USING (("auth"."uid"() = "created_by_user_id"));



CREATE POLICY "Users can insert company preferences for their companies" ON "public"."company_preferences" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "company_preferences"."company_id") AND ("companies"."created_by_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert invitations for their company" ON "public"."company_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_invitations"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = 'admin'::"text")))));



CREATE POLICY "Users can insert their own membership" ON "public"."company_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own settings" ON "public"."settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own notification settings" ON "public"."user_notification_settings" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can select their company preferences" ON "public"."company_preferences" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "company_preferences"."company_id") AND ("companies"."created_by_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can select their own membership" ON "public"."company_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their company preferences" ON "public"."company_preferences" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "company_preferences"."company_id") AND ("companies"."created_by_user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))));



CREATE POLICY "Users can update their own companies" ON "public"."companies" FOR UPDATE USING (("auth"."uid"() = "created_by_user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view company preferences" ON "public"."company_preferences" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_preferences"."company_id") AND ("company_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view invitations for their company" ON "public"."company_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_members"
  WHERE (("company_members"."company_id" = "company_invitations"."company_id") AND ("company_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own companies" ON "public"."companies" FOR SELECT USING (("auth"."uid"() = "created_by_user_id"));



CREATE POLICY "Users can view their own manual calculations" ON "public"."emission_calc_climatiq" FOR SELECT USING ((("entry_id" IS NULL) AND ("company_id" IN ( SELECT "c"."id"
   FROM "public"."companies" "c"
  WHERE ("c"."created_by_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own settings" ON "public"."settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emission_calc_climatiq" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emission_calculations_legacy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emission_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emission_factors_legacy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_emissions_climatiq"("entry_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_emissions_climatiq"("entry_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_emissions_climatiq"("entry_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_ghg_emissions"("_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_ghg_emissions"("_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_ghg_emissions"("_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_scope_emissions"("p_company_id" "uuid", "p_scope" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_scope_emissions"("p_company_id" "uuid", "p_scope" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_scope_emissions"("p_company_id" "uuid", "p_scope" "text", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_company_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_company_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_company_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_category_text"("category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_category_text"("category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_category_text"("category_1" "text", "category_2" "text", "category_3" "text", "category_4" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_emission_calculation_status"("p_company_id" "uuid", "p_scope" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_emission_calculation_status"("p_company_id" "uuid", "p_scope" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_emission_calculation_status"("p_company_id" "uuid", "p_scope" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer) TO "service_role";



GRANT ALL ON TABLE "public"."emission_entries" TO "anon";
GRANT ALL ON TABLE "public"."emission_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."emission_entries" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer, "cursor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer, "cursor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entries_without_calculations"("batch_limit" integer, "cursor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_emission_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_emission_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_emission_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_notification_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_notification_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_notification_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_categories"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_categories"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_categories"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_categories_with_factors"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_categories_with_factors"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_categories_with_factors"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_emission_factor"("query_embedding" "public"."vector", "match_threshold" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."match_emission_factor"("query_embedding" "public"."vector", "match_threshold" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_emission_factor"("query_embedding" "public"."vector", "match_threshold" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_unit"("raw_value" numeric, "raw_unit" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_unit"("raw_value" numeric, "raw_unit" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_unit"("raw_value" numeric, "raw_unit" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_all_emission_entries"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_all_emission_entries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_all_emission_entries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_emission_entry"("entry_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_emission_entry"("entry_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_emission_entry"("entry_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_calculate_emissions_on_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_calculate_emissions_on_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_calculate_emissions_on_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_emission_calc_climatiq_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_emission_calc_climatiq_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_emission_calc_climatiq_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_invitations" TO "anon";
GRANT ALL ON TABLE "public"."company_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."company_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."company_members" TO "anon";
GRANT ALL ON TABLE "public"."company_members" TO "authenticated";
GRANT ALL ON TABLE "public"."company_members" TO "service_role";



GRANT ALL ON TABLE "public"."company_preferences" TO "anon";
GRANT ALL ON TABLE "public"."company_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."company_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."emission_calc_climatiq" TO "anon";
GRANT ALL ON TABLE "public"."emission_calc_climatiq" TO "authenticated";
GRANT ALL ON TABLE "public"."emission_calc_climatiq" TO "service_role";



GRANT ALL ON TABLE "public"."emission_calculations_legacy" TO "anon";
GRANT ALL ON TABLE "public"."emission_calculations_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."emission_calculations_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."emission_factors_legacy" TO "anon";
GRANT ALL ON TABLE "public"."emission_factors_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."emission_factors_legacy" TO "service_role";



GRANT ALL ON SEQUENCE "public"."emission_factors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."emission_factors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."emission_factors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."view_emissions_by_scope" TO "anon";
GRANT ALL ON TABLE "public"."view_emissions_by_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."view_emissions_by_scope" TO "service_role";



GRANT ALL ON TABLE "public"."view_entries_by_year_and_scope" TO "anon";
GRANT ALL ON TABLE "public"."view_entries_by_year_and_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."view_entries_by_year_and_scope" TO "service_role";



GRANT ALL ON TABLE "public"."view_monthly_by_scope" TO "anon";
GRANT ALL ON TABLE "public"."view_monthly_by_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."view_monthly_by_scope" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
