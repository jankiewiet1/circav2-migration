/**
 * MCP Action: Extract Data From Document
 * 
 * This API endpoint implements the extractDataFromDocument action
 * following the Model Context Protocol (MCP) specification.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';
import { DataEntry, DataEntrySourceType, GHGCategory } from '@/types/dataEntry';

/**
 * Main handler for the /api/mcp-actions/extract-data endpoint
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
    const actionInput = req.body as MCPActionInputs[MCPActionType.EXTRACT_DATA_FROM_DOCUMENT];
    
    if (!actionInput || !actionInput.documentUrl || !actionInput.documentType) {
      return res.status(400).json({ error: 'Invalid input parameters. documentUrl and documentType are required.' });
    }
    
    // Extract data from document
    const result = await extractDataFromDocument(
      actionInput.documentUrl,
      actionInput.documentType,
      actionInput.extractionHints || [],
      userId
    );
    
    // Return the extraction result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error extracting data from document:', error);
    return res.status(500).json({ error: 'Failed to extract data from document' });
  }
}

/**
 * Extract carbon accounting data from documents
 */
async function extractDataFromDocument(
  documentUrl: string,
  documentType: 'PDF' | 'EXCEL' | 'CSV' | 'IMAGE',
  extractionHints: string[],
  userId: string
): Promise<MCPActionOutputs[MCPActionType.EXTRACT_DATA_FROM_DOCUMENT]> {
  // Get user's company for validation
  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership) {
    throw new Error('User company membership not found');
  }

  // Simulate document processing
  // In a real implementation, this would:
  // 1. Download/fetch the document from the URL
  // 2. Use OCR or parsing libraries to extract text/data
  // 3. Use AI/NLP to identify carbon accounting relevant fields
  // 4. Map extracted data to DataEntry structure

  const extractedEntries: Partial<DataEntry>[] = [];
  const warnings: string[] = [];
  const unmappedFields: string[] = [];
  let confidence = 0.8; // Base confidence

  try {
    // Simulate different extraction logic based on document type
    switch (documentType) {
      case 'PDF':
        const pdfResults = await extractFromPDF(documentUrl, extractionHints);
        extractedEntries.push(...pdfResults.entries);
        warnings.push(...pdfResults.warnings);
        unmappedFields.push(...pdfResults.unmappedFields);
        confidence = pdfResults.confidence;
        break;
        
      case 'EXCEL':
        const excelResults = await extractFromExcel(documentUrl, extractionHints);
        extractedEntries.push(...excelResults.entries);
        warnings.push(...excelResults.warnings);
        unmappedFields.push(...excelResults.unmappedFields);
        confidence = excelResults.confidence;
        break;
        
      case 'CSV':
        const csvResults = await extractFromCSV(documentUrl, extractionHints);
        extractedEntries.push(...csvResults.entries);
        warnings.push(...csvResults.warnings);
        unmappedFields.push(...csvResults.unmappedFields);
        confidence = csvResults.confidence;
        break;
        
      case 'IMAGE':
        const imageResults = await extractFromImage(documentUrl, extractionHints);
        extractedEntries.push(...imageResults.entries);
        warnings.push(...imageResults.warnings);
        unmappedFields.push(...imageResults.unmappedFields);
        confidence = imageResults.confidence;
        break;
        
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    return {
      success: extractedEntries.length > 0,
      extractedEntries: extractedEntries,
      confidence: confidence,
      unmappedFields: unmappedFields,
      warnings: warnings
    };

  } catch (error) {
    console.error('Document extraction error:', error);
    return {
      success: false,
      extractedEntries: [],
      confidence: 0,
      unmappedFields: [],
      warnings: [`Failed to extract data: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Extract data from PDF documents
 */
async function extractFromPDF(documentUrl: string, hints: string[]) {
  // Simulate PDF extraction
  // In real implementation: use PDF.js, pdfplumber, or similar
  
  const mockEntries: Partial<DataEntry>[] = [
    {
      activity_description: 'Electricity consumption - Office Building',
      quantity: 1250,
      unit: 'kWh',
      ghg_category: 'Scope 2' as GHGCategory,
      source_type: 'pdf' as DataEntrySourceType,
      date: '2024-01-01',
      notes: 'Extracted from utility bill PDF'
    },
    {
      activity_description: 'Natural gas heating',
      quantity: 500,
      unit: 'm3',
      ghg_category: 'Scope 1' as GHGCategory,
      source_type: 'pdf' as DataEntrySourceType,
      date: '2024-01-01',
      notes: 'Extracted from utility bill PDF'
    }
  ];

  return {
    entries: mockEntries,
    warnings: ['Date format may need verification'],
    unmappedFields: ['invoice_number', 'billing_address'],
    confidence: 0.85
  };
}

/**
 * Extract data from Excel files
 */
async function extractFromExcel(documentUrl: string, hints: string[]) {
  // Simulate Excel extraction
  // In real implementation: use xlsx, exceljs, or similar
  
  const mockEntries: Partial<DataEntry>[] = [
    {
      activity_description: 'Business travel - flights',
      quantity: 2500,
      unit: 'km',
      ghg_category: 'Scope 3' as GHGCategory,
      source_type: 'excel' as DataEntrySourceType,
      date: '2024-01-15',
      cost: 450,
      currency: 'EUR'
    },
    {
      activity_description: 'Fuel consumption - company vehicles',
      quantity: 200,
      unit: 'L',
      ghg_category: 'Scope 1' as GHGCategory,
      source_type: 'excel' as DataEntrySourceType,
      date: '2024-01-15',
      cost: 320,
      currency: 'EUR'
    }
  ];

  return {
    entries: mockEntries,
    warnings: ['Some rows contain incomplete data'],
    unmappedFields: ['vehicle_type', 'route_details'],
    confidence: 0.92
  };
}

/**
 * Extract data from CSV files
 */
async function extractFromCSV(documentUrl: string, hints: string[]) {
  // Simulate CSV extraction
  // In real implementation: parse CSV with proper library
  
  const mockEntries: Partial<DataEntry>[] = [
    {
      activity_description: 'Office equipment electricity',
      quantity: 800,
      unit: 'kWh',
      ghg_category: 'Scope 2' as GHGCategory,
      source_type: 'csv' as DataEntrySourceType,
      date: '2024-01-20'
    }
  ];

  return {
    entries: mockEntries,
    warnings: [],
    unmappedFields: ['department', 'cost_center'],
    confidence: 0.95
  };
}

/**
 * Extract data from images using OCR
 */
async function extractFromImage(documentUrl: string, hints: string[]) {
  // Simulate image OCR extraction
  // In real implementation: use Tesseract.js, Google Vision API, or similar
  
  const mockEntries: Partial<DataEntry>[] = [
    {
      activity_description: 'Waste disposal',
      quantity: 150,
      unit: 'kg',
      ghg_category: 'Scope 3' as GHGCategory,
      source_type: 'image' as DataEntrySourceType,
      date: '2024-01-25',
      notes: 'Extracted from receipt image via OCR'
    }
  ];

  return {
    entries: mockEntries,
    warnings: ['OCR confidence may be lower for handwritten text'],
    unmappedFields: ['supplier_name', 'receipt_number'],
    confidence: 0.75
  };
} 