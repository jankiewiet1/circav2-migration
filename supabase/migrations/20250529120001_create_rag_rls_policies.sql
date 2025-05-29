-- Enable RLS on new tables
ALTER TABLE emission_factor_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_calc_rag ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emission_factor_db
-- Allow read access to all authenticated users (emission factors are public data)
CREATE POLICY "Allow read access to emission factors" ON emission_factor_db
    FOR SELECT TO authenticated
    USING (true);

-- Allow insert/update only to service role (for data loading)
CREATE POLICY "Allow service role to manage emission factors" ON emission_factor_db
    FOR ALL TO service_role
    USING (true);

-- RLS Policies for emission_calc_rag
-- Users can only see calculations for their own company
CREATE POLICY "Users can view own company calculations" ON emission_calc_rag
    FOR SELECT TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert calculations for their own company
CREATE POLICY "Users can create calculations for own company" ON emission_calc_rag
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update calculations for their own company
CREATE POLICY "Users can update own company calculations" ON emission_calc_rag
    FOR UPDATE TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete calculations for their own company (if they have admin role)
CREATE POLICY "Company admins can delete calculations" ON emission_calc_rag
    FOR DELETE TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM company_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Service role has full access
CREATE POLICY "Service role full access to calculations" ON emission_calc_rag
    FOR ALL TO service_role
    USING (true);

-- Grant necessary permissions
GRANT SELECT ON emission_factor_db TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emission_calc_rag TO authenticated;
GRANT ALL ON emission_factor_db TO service_role;
GRANT ALL ON emission_calc_rag TO service_role;

-- Grant access to the similarity search function
GRANT EXECUTE ON FUNCTION find_similar_emission_factors TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_emission_factors TO service_role; 