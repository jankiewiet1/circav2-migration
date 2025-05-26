/**
 * MCP Context API Endpoint
 * 
 * This API endpoint provides the MCP context for AI agents using the
 * Model Context Protocol (MCP) specification.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { MCPContext, EmissionFactor, SchemaField } from '@/types/mcp';
import { DataEntry } from '@/types/dataEntry';
import { EmissionSource, Scope, EmissionData, EmissionSummary } from '@/types/emissions';

/**
 * Main handler for the /api/mcp-context endpoint
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get companyId from authenticated user or query parameter
    const companyId = req.query.companyId as string;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Get user ID and role from auth session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build the MCP context
    const mcpContext = await buildMCPContext(companyId, userId);
    
    // Return the MCP context as JSON
    return res.status(200).json(mcpContext);
  } catch (error) {
    console.error('Error fetching MCP context:', error);
    return res.status(500).json({ error: 'Failed to fetch MCP context' });
  }
}

/**
 * Build the full MCP context object for a specific company
 */
async function buildMCPContext(companyId: string, userId: string): Promise<MCPContext> {
  // Get company data
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, industry, size, region, reporting_standards, reporting_period')
    .eq('id', companyId)
    .single();

  if (companyError) {
    throw new Error(`Failed to fetch company data: ${companyError.message}`);
  }

  // Get user permissions
  const { data: userRole, error: userError } = await supabase
    .from('company_members')
    .select('role, permissions')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();

  if (userError) {
    throw new Error(`Failed to fetch user permissions: ${userError.message}`);
  }

  // Get data entries
  const { data: dataEntries, error: entriesError } = await supabase
    .from('data_entry')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false });

  if (entriesError) {
    throw new Error(`Failed to fetch data entries: ${entriesError.message}`);
  }

  // Get emission factors
  const { data: emissionFactors, error: factorsError } = await supabase
    .from('emission_factors_legacy')
    .select('*')
    .limit(100); // Limit to avoid large payload

  if (factorsError) {
    throw new Error(`Failed to fetch emission factors: ${factorsError.message}`);
  }

  // Calculate emission summaries
  const summary = calculateEmissionSummary(dataEntries);

  // Build data entry schema information
  const dataEntrySchema: Record<string, SchemaField> = buildDataEntrySchema();
  const emissionsSchema: Record<string, SchemaField> = buildEmissionsSchema();

  // Assemble the complete MCP context
  const mcpContext: MCPContext = {
    // Version info
    version: '1.0',
    timestamp: new Date().toISOString(),
    
    // Company/Organization context
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      size: company.size,
      region: company.region,
      reportingStandards: company.reporting_standards,
      reportingPeriod: company.reporting_period,
    },
    
    // Carbon accounting data
    carbonData: {
      // Current data entries
      entries: dataEntries as DataEntry[],
      
      // Summary statistics
      summary: {
        totalEmissions: summary.totalEmissions,
        breakdowns: {
          bySource: summary.bySource,
          byScope: summary.byScope,
          byPeriod: summary.byPeriod,
        },
        unit: 'kgCO2e',
      },
      
      // Calculation settings and factors
      calculationSettings: {
        emissionFactors: emissionFactors as EmissionFactor[],
        defaultUnit: 'kgCO2e',
        precisionDecimals: 2,
      },
      
      // Processing status
      status: {
        lastUpdated: new Date().toISOString(),
        pendingEntries: countEntriesByStatus(dataEntries, 'raw'),
        validatedEntries: countEntriesByStatus(dataEntries, 'validated'),
        errorEntries: countEntriesByStatus(dataEntries, 'error'),
        totalEntries: dataEntries.length,
      },
    },
    
    // Database schema information
    schema: {
      dataEntry: dataEntrySchema,
      emissions: emissionsSchema,
    },
    
    // User context
    user: {
      id: userId,
      role: userRole.role,
      permissions: userRole.permissions || [],
    },
  };

  return mcpContext;
}

/**
 * Calculate emission summaries from data entries
 */
function calculateEmissionSummary(dataEntries: any[]): {
  totalEmissions: EmissionSummary;
  bySource: Record<EmissionSource, number>;
  byScope: Record<number, number>;
  byPeriod: Record<string, number>;
} {
  // Initialize summary objects
  const totalEmissions: EmissionSummary = {
    scope1: 0,
    scope2: 0,
    scope3: 0,
    total: 0,
    unit: 'kgCO2e',
  };
  
  const bySource: Record<EmissionSource, number> = {
    [EmissionSource.ELECTRICITY]: 0,
    [EmissionSource.TRANSPORT]: 0,
    [EmissionSource.FUEL]: 0,
    [EmissionSource.WASTE]: 0,
    [EmissionSource.WATER]: 0,
    [EmissionSource.OTHER]: 0,
  };
  
  const byScope: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
  };
  
  const byPeriod: Record<string, number> = {};
  
  // Process each data entry
  dataEntries.forEach(entry => {
    // Skip entries without emissions data
    if (!entry.emissions_value) return;
    
    // Add to total emissions by scope
    if (entry.ghg_category === 'Scope 1') {
      totalEmissions.scope1 += entry.emissions_value;
      byScope[1] += entry.emissions_value;
    } else if (entry.ghg_category === 'Scope 2') {
      totalEmissions.scope2 += entry.emissions_value;
      byScope[2] += entry.emissions_value;
    } else if (entry.ghg_category === 'Scope 3') {
      totalEmissions.scope3 += entry.emissions_value;
      byScope[3] += entry.emissions_value;
    }
    
    totalEmissions.total += entry.emissions_value;
    
    // Map activity to emission source
    const source = mapActivityToSource(entry.activity_description);
    bySource[source] += entry.emissions_value;
    
    // Add to period breakdown (by month or quarter)
    const period = entry.date.substring(0, 7); // YYYY-MM format
    byPeriod[period] = (byPeriod[period] || 0) + entry.emissions_value;
  });
  
  return {
    totalEmissions,
    bySource,
    byScope,
    byPeriod,
  };
}

/**
 * Map activity descriptions to emission sources
 */
function mapActivityToSource(activity: string): EmissionSource {
  const activityLower = activity.toLowerCase();
  
  if (activityLower.includes('electricity') || activityLower.includes('power')) {
    return EmissionSource.ELECTRICITY;
  }
  if (activityLower.includes('transport') || activityLower.includes('vehicle') || 
      activityLower.includes('flight') || activityLower.includes('travel')) {
    return EmissionSource.TRANSPORT;
  }
  if (activityLower.includes('fuel') || activityLower.includes('gas') || 
      activityLower.includes('oil') || activityLower.includes('diesel')) {
    return EmissionSource.FUEL;
  }
  if (activityLower.includes('waste') || activityLower.includes('disposal')) {
    return EmissionSource.WASTE;
  }
  if (activityLower.includes('water')) {
    return EmissionSource.WATER;
  }
  
  return EmissionSource.OTHER;
}

/**
 * Count data entries by status
 */
function countEntriesByStatus(entries: any[], status: string): number {
  return entries.filter(entry => entry.status === status).length;
}

/**
 * Build data entry schema information
 */
function buildDataEntrySchema(): Record<string, SchemaField> {
  return {
    id: {
      type: 'string',
      description: 'Unique identifier for the data entry',
      required: true,
      format: 'uuid',
    },
    company_id: {
      type: 'string',
      description: 'Company ID that owns this data entry',
      required: true,
      format: 'uuid',
    },
    date: {
      type: 'string',
      description: 'Date when the activity occurred',
      required: true,
      format: 'date',
      example: '2023-01-15',
    },
    source_type: {
      type: 'string',
      description: 'Source of the data entry',
      required: true,
      enum: ['invoice', 'utility bill', 'ERP', 'API', 'manual entry', 'email', 'pdf', 'csv', 'excel', 'image'],
      example: 'utility bill',
    },
    supplier_vendor: {
      type: 'string',
      description: 'Supplier or vendor name',
      required: false,
      example: 'Green Energy Co.',
    },
    activity_description: {
      type: 'string',
      description: 'Description of the activity',
      required: true,
      example: 'January 2023 office electricity consumption',
    },
    quantity: {
      type: 'number',
      description: 'Quantity of the activity',
      required: true,
      example: 1250.5,
    },
    unit: {
      type: 'string',
      description: 'Unit of measurement',
      required: true,
      example: 'kWh',
    },
    ghg_category: {
      type: 'string',
      description: 'GHG Protocol scope category',
      required: true,
      enum: ['Scope 1', 'Scope 2', 'Scope 3'],
      example: 'Scope 2',
    },
    status: {
      type: 'string',
      description: 'Processing status of the entry',
      required: true,
      enum: ['raw', 'processed', 'validated', 'error'],
      example: 'validated',
    },
  };
}

/**
 * Build emissions schema information
 */
function buildEmissionsSchema(): Record<string, SchemaField> {
  return {
    id: {
      type: 'string',
      description: 'Unique identifier for the emission record',
      required: true,
      format: 'uuid',
    },
    co2e: {
      type: 'number',
      description: 'CO2 equivalent emissions value',
      required: true,
      example: 125.75,
    },
    co2e_unit: {
      type: 'string',
      description: 'Unit of CO2e measurement',
      required: true,
      example: 'kgCO2e',
    },
    source: {
      type: 'string',
      description: 'Emission source category',
      required: true,
      enum: Object.values(EmissionSource),
      example: 'electricity',
    },
    category: {
      type: 'string',
      description: 'Detailed category of emissions',
      required: true,
      example: 'purchased_electricity',
    },
    scope: {
      type: 'number',
      description: 'GHG Protocol scope (1, 2, or 3)',
      required: true,
      enum: [1, 2, 3],
      example: 2,
    },
  };
} 