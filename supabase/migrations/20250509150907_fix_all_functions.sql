-- Drop all existing functions and triggers
DROP TRIGGER IF EXISTS trg_calc_emissions ON public.emission_entries;
DROP FUNCTION IF EXISTS public.trg_after_emission_entry();
DROP FUNCTION IF EXISTS public.calculate_emissions_for_entry(entry_id bigint);
DROP FUNCTION IF EXISTS public.get_entries_without_calculations(integer, bigint);

-- Create pagination RPC function for Climatiq
CREATE OR REPLACE FUNCTION public.get_entries_without_calculations(
    batch_limit integer DEFAULT 50,
    cursor_id bigint DEFAULT NULL
)
RETURNS TABLE (
    id bigint
)
LANGUAGE sql
AS $$
    SELECT e.id
    FROM public.emission_entries e
    LEFT JOIN public.emission_calc_climatiq c ON c.entry_id = e.id
    WHERE c.entry_id IS NULL
    AND (cursor_id IS NULL OR e.id > cursor_id)
    ORDER BY e.id
    LIMIT batch_limit;
$$; 