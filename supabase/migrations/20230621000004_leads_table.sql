-- Create leads table for storing contact information from the CO2 calculator
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  calculator_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'new',
  calendly_url TEXT,
  notes TEXT
);

-- Add RLS policies for the leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Enable insert access for lead submission" ON public.leads;

-- Only allow authenticated users to view leads
CREATE POLICY "Enable read access for all authenticated users" 
ON public.leads FOR SELECT 
TO authenticated USING (true);

-- Only allow authorized roles to insert/update leads
CREATE POLICY "Enable insert access for lead submission" 
ON public.leads FOR INSERT 
TO anon, authenticated WITH CHECK (true);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads (email); 