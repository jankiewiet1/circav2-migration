-- Fix emission_factor_db table structure to match CSV columns EXACTLY
-- CSV columns: Activity,Fuel,Country,GHG,EF_Value,Unit,Source

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing function first
DROP FUNCTION IF EXISTS find_similar_emission_factors(vector, numeric, integer);

-- First, drop the foreign key constraint from emission_calc_rag
ALTER TABLE IF EXISTS public.emission_calc_rag 
DROP CONSTRAINT IF EXISTS emission_calc_rag_matched_factor_id_fkey;

-- Now we can safely drop and recreate the emission_factor_db table
DROP TABLE IF EXISTS public.emission_factor_db CASCADE;

-- Create new table structure that EXACTLY matches your CSV column names
CREATE TABLE public.emission_factor_db (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- EXACT CSV column names (case-sensitive)
    "Activity" TEXT NOT NULL,         -- Activity column
    "Fuel" TEXT,                      -- Fuel column  
    "Country" TEXT,                   -- Country column
    "GHG" TEXT,                       -- GHG column
    "EF_Value" DECIMAL(15,6) NOT NULL, -- EF_Value column
    "Unit" TEXT NOT NULL,             -- Unit column
    "Source" TEXT NOT NULL,           -- Source column
    
    -- Additional computed/derived fields
    description TEXT,                 -- Generated: Activity + Fuel + Country
    scope TEXT,                       -- Computed: Scope 1/2/3 based on activity
    
    -- Embedding for RAG semantic search
    embedding vector(1536),           -- OpenAI embedding (1536 dimensions)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_emission_factor_db_activity ON emission_factor_db("Activity");
CREATE INDEX idx_emission_factor_db_fuel ON emission_factor_db("Fuel");
CREATE INDEX idx_emission_factor_db_country ON emission_factor_db("Country");
CREATE INDEX idx_emission_factor_db_ghg ON emission_factor_db("GHG");
CREATE INDEX idx_emission_factor_db_source ON emission_factor_db("Source");
CREATE INDEX idx_emission_factor_db_scope ON emission_factor_db(scope);

-- Create vector index for embedding similarity search
CREATE INDEX idx_emission_factor_db_embedding 
ON emission_factor_db USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emission_factor_db_updated_at 
    BEFORE UPDATE ON emission_factor_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE emission_factor_db ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on emission_factor_db" ON emission_factor_db
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON emission_factor_db TO authenticated;
GRANT ALL ON emission_factor_db TO anon;

-- Recreate the foreign key constraint for emission_calc_rag if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emission_calc_rag') THEN
        ALTER TABLE public.emission_calc_rag 
        ADD CONSTRAINT emission_calc_rag_matched_factor_id_fkey 
        FOREIGN KEY (matched_factor_id) REFERENCES emission_factor_db(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create function for vector similarity search (for RAG system)
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
        ef."Activity" as activity,
        ef."Fuel" as fuel,
        ef."Country" as country,
        ef."GHG" as ghg,
        ef."EF_Value" as ef_value,
        ef."Unit" as unit,
        ef."Source" as source,
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