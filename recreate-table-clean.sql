-- Clean recreation of emission_factor_db table with exact CSV headers
-- This will delete everything and start fresh

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop all related objects first
DROP FUNCTION IF EXISTS find_similar_emission_factors(vector, numeric, integer) CASCADE;
DROP TRIGGER IF EXISTS update_emission_factor_db_updated_at ON emission_factor_db CASCADE;
DROP TABLE IF EXISTS public.emission_factor_db CASCADE;

-- Create the table with EXACT CSV column names
CREATE TABLE public.emission_factor_db (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Exact CSV headers (case-sensitive, with quotes)
    "Activity" TEXT NOT NULL,
    "Fuel" TEXT,
    "Country" TEXT,
    "GHG" TEXT,
    "EF_Value" DECIMAL(15,6) NOT NULL,
    "Unit" TEXT NOT NULL,
    "Source" TEXT NOT NULL,
    
    -- Additional fields for RAG system
    description TEXT,
    scope TEXT,
    embedding vector(1536),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_emission_factor_activity ON emission_factor_db("Activity");
CREATE INDEX idx_emission_factor_fuel ON emission_factor_db("Fuel");
CREATE INDEX idx_emission_factor_country ON emission_factor_db("Country");
CREATE INDEX idx_emission_factor_ghg ON emission_factor_db("GHG");
CREATE INDEX idx_emission_factor_source ON emission_factor_db("Source");
CREATE INDEX idx_emission_factor_scope ON emission_factor_db(scope);

-- Vector index for embeddings
CREATE INDEX idx_emission_factor_embedding 
ON emission_factor_db USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emission_factor_db_updated_at 
    BEFORE UPDATE ON emission_factor_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE emission_factor_db ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on emission_factor_db" 
ON emission_factor_db FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON emission_factor_db TO authenticated;
GRANT ALL ON emission_factor_db TO anon;

-- Recreate the similarity search function
CREATE OR REPLACE FUNCTION find_similar_emission_factors(
    query_embedding vector(1536),
    similarity_threshold DECIMAL DEFAULT 0.7,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    activity TEXT,
    fuel TEXT,
    country TEXT,
    ghg TEXT,
    ef_value DECIMAL,
    unit TEXT,
    source TEXT,
    description TEXT,
    scope TEXT,
    similarity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ef.id,
        ef."Activity"::TEXT as activity,
        ef."Fuel"::TEXT as fuel,
        ef."Country"::TEXT as country,
        ef."GHG"::TEXT as ghg,
        ef."EF_Value" as ef_value,
        ef."Unit"::TEXT as unit,
        ef."Source"::TEXT as source,
        ef.description,
        ef.scope,
        (1 - (ef.embedding <=> query_embedding))::DECIMAL(5,4) as similarity
    FROM emission_factor_db ef
    WHERE ef.embedding IS NOT NULL
        AND (1 - (ef.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ef.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Verify the table was created correctly
SELECT 'Table created successfully with columns:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'emission_factor_db' 
ORDER BY ordinal_position; 