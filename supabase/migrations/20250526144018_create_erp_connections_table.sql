-- Create ERP connections table for storing integration credentials and status
CREATE TABLE IF NOT EXISTS erp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    system_type TEXT NOT NULL CHECK (system_type IN ('sap', 'odoo', 'hubspot', 'dynamics', 'quickbooks', 'xero')),
    system_name TEXT NOT NULL,
    credentials JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one connection per system per company
    UNIQUE(company_id, system_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_erp_connections_company_id ON erp_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_connections_system_type ON erp_connections(system_type);

-- Enable RLS
ALTER TABLE erp_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company's ERP connections" ON erp_connections
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ERP connections for their company" ON erp_connections
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company's ERP connections" ON erp_connections
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their company's ERP connections" ON erp_connections
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_erp_connections_updated_at 
    BEFORE UPDATE ON erp_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
