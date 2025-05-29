-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create emission_factor_db table for the comprehensive emission factors database
CREATE TABLE IF NOT EXISTS public.emission_factor_db (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL, -- DEFRA, EPA, IPCC, etc.
    category_1 TEXT,
    category_2 TEXT,
    category_3 TEXT,
    category_4 TEXT,
    subcategory TEXT,
    fuel_type TEXT,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    ghg_unit TEXT NOT NULL,
    co2_factor DECIMAL(15,6),
    ch4_factor DECIMAL(15,6),
    n2o_factor DECIMAL(15,6),
    total_factor DECIMAL(15,6) NOT NULL,
    year_published INTEGER,
    region TEXT DEFAULT 'Global',
    scope TEXT, -- Scope 1, 2, 3
    activity_type TEXT,
    embedding vector(1536), -- OpenAI embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create emission_calc_rag table for RAG-based calculations
CREATE TABLE IF NOT EXISTS public.emission_calc_rag (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES emission_entries(id) ON DELETE CASCADE,
    
    -- Input data
    raw_input TEXT NOT NULL,
    parsed_data JSONB NOT NULL, -- GPT-4 parsed structure
    
    -- Matching process
    query_embedding vector(1536),
    matched_factor_id UUID REFERENCES emission_factor_db(id),
    similarity_score DECIMAL(5,4), -- 0-1 similarity score
    
    -- Calculation results
    quantity DECIMAL(15,4) NOT NULL,
    unit TEXT NOT NULL,
    emission_factor DECIMAL(15,6) NOT NULL,
    total_emissions DECIMAL(15,6) NOT NULL,
    emissions_unit TEXT DEFAULT 'kg CO2e',
    
    -- Breakdown by gas type
    co2_emissions DECIMAL(15,6),
    ch4_emissions DECIMAL(15,6),
    n2o_emissions DECIMAL(15,6),
    
    -- Metadata
    scope INTEGER CHECK (scope IN (1, 2, 3)),
    confidence_score DECIMAL(5,4), -- Overall confidence
    calculation_method TEXT DEFAULT 'RAG',
    
    -- Audit trail
    gpt_model_used TEXT,
    embedding_model_used TEXT,
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emission_factor_db_embedding 
ON emission_factor_db USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_emission_factor_db_source ON emission_factor_db(source);
CREATE INDEX IF NOT EXISTS idx_emission_factor_db_category ON emission_factor_db(category_1, category_2);
CREATE INDEX IF NOT EXISTS idx_emission_factor_db_scope ON emission_factor_db(scope);
CREATE INDEX IF NOT EXISTS idx_emission_factor_db_year ON emission_factor_db(year_published);

CREATE INDEX IF NOT EXISTS idx_emission_calc_rag_company ON emission_calc_rag(company_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_rag_entry ON emission_calc_rag(entry_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_rag_created ON emission_calc_rag(created_at);
CREATE INDEX IF NOT EXISTS idx_emission_calc_rag_similarity ON emission_calc_rag(similarity_score);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_emission_factor_db_updated_at 
    BEFORE UPDATE ON emission_factor_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emission_calc_rag_updated_at 
    BEFORE UPDATE ON emission_calc_rag 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION find_similar_emission_factors(
    query_embedding vector(1536),
    similarity_threshold DECIMAL DEFAULT 0.7,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    description TEXT,
    total_factor DECIMAL,
    unit TEXT,
    ghg_unit TEXT,
    scope TEXT,
    source TEXT,
    similarity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ef.id,
        ef.description,
        ef.total_factor,
        ef.unit,
        ef.ghg_unit,
        ef.scope,
        ef.source,
        (1 - (ef.embedding <=> query_embedding))::DECIMAL(5,4) as similarity
    FROM emission_factor_db ef
    WHERE ef.embedding IS NOT NULL
        AND (1 - (ef.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ef.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql; 