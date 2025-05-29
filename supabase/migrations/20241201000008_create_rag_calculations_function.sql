-- Create function to get RAG calculations with emission entry details
CREATE OR REPLACE FUNCTION get_rag_calculations(company_id_param UUID)
RETURNS TABLE (
  id UUID,
  entry_id UUID,
  raw_input TEXT,
  total_emissions DECIMAL,
  emissions_unit TEXT,
  emission_factor DECIMAL,
  similarity_score DECIMAL,
  confidence_score DECIMAL,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ,
  category TEXT,
  description TEXT,
  quantity DECIMAL,
  unit TEXT,
  scope INTEGER,
  source TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.entry_id,
    r.raw_input,
    r.total_emissions,
    r.emissions_unit,
    r.emission_factor,
    r.similarity_score,
    r.confidence_score,
    r.processing_time_ms,
    r.created_at,
    e.category,
    e.description,
    e.quantity,
    e.unit,
    e.scope,
    ef.source
  FROM emission_calc_rag r
  LEFT JOIN emission_entries e ON r.entry_id = e.id
  LEFT JOIN emission_factor_db ef ON r.matched_factor_id = ef.id
  WHERE r.company_id = company_id_param
  ORDER BY r.created_at DESC;
END;
$$; 