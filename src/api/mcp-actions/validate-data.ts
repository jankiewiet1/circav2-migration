/**
 * MCP Action: Validate Data Entry
 * 
 * This API endpoint implements the validateDataEntry action
 * following the Model Context Protocol (MCP) specification.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';
import { DataEntry, GHGCategory, DataEntrySourceType, DataEntryStatus } from '@/types/dataEntry';

/**
 * Main handler for the /api/mcp-actions/validate-data endpoint
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from auth session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse action input parameters
    const actionInput = req.body as MCPActionInputs[MCPActionType.VALIDATE_DATA_ENTRY];
    
    if (!actionInput || !actionInput.dataEntryId || !actionInput.validation) {
      return res.status(400).json({ error: 'Invalid input parameters. dataEntryId and validation are required.' });
    }
    
    // Perform data validation
    const result = await validateDataEntry(
      actionInput.dataEntryId,
      actionInput.validation,
      userId
    );
    
    // Return the validation result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error validating data entry:', error);
    return res.status(500).json({ error: 'Failed to validate data entry' });
  }
}

/**
 * Validate data entry fields and values
 */
async function validateDataEntry(
  dataEntryId: string,
  validations: { field: keyof DataEntry; value: any; error?: string }[],
  userId: string
): Promise<MCPActionOutputs[MCPActionType.VALIDATE_DATA_ENTRY]> {
  // Fetch the data entry
  const { data: dataEntry, error: fetchError } = await supabase
    .from('data_entry')
    .select('*')
    .eq('id', dataEntryId)
    .single();

  if (fetchError || !dataEntry) {
    throw new Error(`Failed to fetch data entry: ${fetchError?.message || 'Not found'}`);
  }

  // Check if user has permission to access this data entry
  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('company_id', dataEntry.company_id)
    .single();

  if (membershipError || !membership) {
    throw new Error('User does not have permission to access this data entry');
  }

  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Validate each field
  for (const validation of validations) {
    const fieldValidation = validateField(validation.field, validation.value, dataEntry);
    
    if (fieldValidation.error) {
      errors.push({
        field: validation.field,
        message: validation.error || fieldValidation.error
      });
    }
    
    if (fieldValidation.warning) {
      warnings.push({
        field: validation.field,
        message: fieldValidation.warning
      });
    }
  }

  // If there are no errors, optionally update the data entry status
  if (errors.length === 0) {
    const { error: updateError } = await supabase
      .from('data_entry')
      .update({ 
        status: 'validated' as DataEntryStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', dataEntryId);

    if (updateError) {
      console.warn('Failed to update data entry status:', updateError);
    }
  }

  return {
    valid: errors.length === 0,
    dataEntryId: dataEntryId,
    errors: errors,
    warnings: warnings
  };
}

/**
 * Validate a specific field value
 */
function validateField(
  field: keyof DataEntry, 
  value: any, 
  existingEntry: any
): { error?: string; warning?: string } {
  switch (field) {
    case 'activity_description':
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return { error: 'Activity description is required and cannot be empty' };
      }
      if (value.length > 500) {
        return { error: 'Activity description cannot exceed 500 characters' };
      }
      break;

    case 'quantity':
      if (value === null || value === undefined || isNaN(Number(value))) {
        return { error: 'Quantity must be a valid number' };
      }
      if (Number(value) <= 0) {
        return { error: 'Quantity must be greater than zero' };
      }
      if (Number(value) > 1000000) {
        return { warning: 'Quantity is unusually large, please verify' };
      }
      break;

    case 'unit':
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return { error: 'Unit is required' };
      }
      // Check if unit is recognized
      const recognizedUnits = ['kWh', 'MWh', 'GWh', 'L', 'kg', 'tonnes', 'm3', 'km', 'miles'];
      if (!recognizedUnits.includes(value)) {
        return { warning: `Unit "${value}" may not be recognized. Recognized units: ${recognizedUnits.join(', ')}` };
      }
      break;

    case 'ghg_category':
      const validCategories: GHGCategory[] = ['Scope 1', 'Scope 2', 'Scope 3'];
      if (!validCategories.includes(value as GHGCategory)) {
        return { error: `GHG category must be one of: ${validCategories.join(', ')}` };
      }
      break;

    case 'date':
      if (!value) {
        return { error: 'Date is required' };
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { error: 'Date must be a valid date' };
      }
      const now = new Date();
      if (date > now) {
        return { warning: 'Date is in the future' };
      }
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      if (date < twoYearsAgo) {
        return { warning: 'Date is more than 2 years old' };
      }
      break;

    case 'source_type':
      const validSourceTypes: DataEntrySourceType[] = [
        'invoice', 'utility bill', 'ERP', 'API', 'manual entry',
        'email', 'pdf', 'csv', 'excel', 'image'
      ];
      if (!validSourceTypes.includes(value as DataEntrySourceType)) {
        return { error: `Source type must be one of: ${validSourceTypes.join(', ')}` };
      }
      break;

    case 'cost':
      if (value !== null && value !== undefined) {
        if (isNaN(Number(value))) {
          return { error: 'Cost must be a valid number' };
        }
        if (Number(value) < 0) {
          return { error: 'Cost cannot be negative' };
        }
      }
      break;

    case 'currency':
      if (value && typeof value === 'string') {
        const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
        if (!validCurrencies.includes(value.toUpperCase())) {
          return { warning: `Currency "${value}" may not be recognized. Common currencies: ${validCurrencies.join(', ')}` };
        }
      }
      break;

    default:
      return { warning: `Unknown field: ${field}` };
  }

  return {};
} 