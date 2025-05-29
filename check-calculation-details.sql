-- Query to check calculation details for electricity entries
SELECT 
    e.description,
    e.category,
    e.quantity,
    e.unit,
    c.total_emissions,
    c.emissions_unit,
    c.factor_name,
    c.region,
    c.source,
    c.activity_data->>'emission_factor' as emission_factor,
    c.activity_data->>'emission_factor_unit' as emission_factor_unit,
    c.activity_data->>'confidence' as confidence,
    c.activity_data->>'calculation_details' as calculation_details,
    c.activity_data->>'assistant_response' as full_ai_response,
    c.calculated_at
FROM emission_entries e
JOIN emission_calc_openai c ON e.id = c.entry_id
WHERE e.category ILIKE '%electricity%'
ORDER BY c.calculated_at DESC; 