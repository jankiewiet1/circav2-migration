-- Add missing columns for RAG functionality
ALTER TABLE emission_factor_db 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS scope TEXT,
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS emission_factor_db_embedding_idx 
ON emission_factor_db USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100); 