/**
 * Source extraction utility for emission calculations
 * Handles both RAG and OpenAI data structures to extract proper emission factor sources
 */

interface CalculationRecord {
  calculation_method: 'RAG' | 'OPENAI';
  source?: string;
  factor_name?: string;
  activity_data?: any;
  request_params?: any;
}

/**
 * Extract clean source names from factor names or descriptions
 * Examples:
 * - "AI Assistant - DEFRA GHG Conversion Factor" → "DEFRA"
 * - "Transportation Factor - EPA 2024" → "EPA"
 * - "DEFRA 2024 Emission Factor" → "DEFRA"
 */
export function extractSourceFromFactorName(factorName: string): string | null {
  if (!factorName) return null;
  
  // Common patterns to extract sources
  const sourcePatterns = [
    // "AI Assistant - DEFRA GHG Conversion Factor" → "DEFRA"
    /AI Assistant\s*-\s*([A-Z]+)/i,
    // "DEFRA 2024 Emission Factor" → "DEFRA"
    /^([A-Z]{2,})\s+\d{4}/i,
    // "Transportation Factor - EPA 2024" → "EPA"
    /Factor\s*-\s*([A-Z]+)/i,
    // "DEFRA GHG Conversion Factor" → "DEFRA"
    /^([A-Z]{2,})\s+GHG/i,
    // "EPA Transportation Factor" → "EPA"
    /^([A-Z]{2,})\s+\w+\s+Factor/i,
    // Direct source match at beginning
    /^(DEFRA|EPA|IPCC|IEA|RIVM|ADEME|BEIS|GHG|DOE|UNFCCC)/i
  ];
  
  for (const pattern of sourcePatterns) {
    const match = factorName.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Extract the proper emission factor source from a calculation record
 */
export function extractCalculationSource(calc: CalculationRecord): string {
  if (calc.calculation_method === 'RAG') {
    // For RAG calculations, prioritize different sources
    
    // 1. Check if we have a clean source field that's not generic
    if (calc.source && 
        calc.source !== 'OPENAI_ASSISTANT_API' && 
        calc.source !== 'RAG Database' &&
        calc.source !== 'OpenAI Analysis') {
      return calc.source;
    }
    
    // 2. Try to extract from factor_name
    if (calc.factor_name) {
      const extractedSource = extractSourceFromFactorName(calc.factor_name);
      if (extractedSource) {
        return extractedSource;
      }
    }
    
    // 3. Check activity_data for source information
    if (calc.activity_data?.factor_details?.source) {
      const source = calc.activity_data.factor_details.source;
      if (source !== 'OPENAI_ASSISTANT_API') {
        return source;
      }
    }
    
    // 4. Fallback
    return 'RAG Database';
    
  } else if (calc.calculation_method === 'OPENAI') {
    // For OpenAI calculations
    
    // 1. Try factor_name first (most reliable for OpenAI)
    if (calc.factor_name) {
      const extractedSource = extractSourceFromFactorName(calc.factor_name);
      if (extractedSource) {
        return extractedSource;
      }
    }
    
    // 2. Check activity_data for emission factor info
    if (calc.activity_data?.emission_factor_info?.source) {
      const source = calc.activity_data.emission_factor_info.source;
      if (source !== 'OPENAI_ASSISTANT_API') {
        return source;
      }
    }
    
    // 3. Check request_params
    if (calc.request_params?.emission_factor_source) {
      return calc.request_params.emission_factor_source;
    }
    
    // 4. Check activity_data for general source
    if (calc.activity_data?.source && calc.activity_data.source !== 'OPENAI_ASSISTANT_API') {
      return calc.activity_data.source;
    }
    
    // 5. Fallback
    return 'OpenAI Analysis';
  }
  
  return 'Unknown';
}

/**
 * Get emission factor value and unit from calculation record
 */
export function extractEmissionFactorInfo(calc: CalculationRecord): {
  factor: number;
  unit: string;
} {
  if (calc.calculation_method === 'RAG') {
    return {
      factor: calc.activity_data?.emission_factor || 0,
      unit: calc.activity_data?.emission_factor_unit || ''
    };
  } else if (calc.calculation_method === 'OPENAI') {
    // Check different possible locations for OpenAI data
    const factor = calc.activity_data?.emission_factor_info?.value || 
                  calc.activity_data?.emission_factor || 0;
    const unit = calc.activity_data?.emission_factor_info?.unit || 
                calc.activity_data?.emission_factor_unit || '';
    
    return { factor, unit };
  }
  
  return { factor: 0, unit: '' };
}

/**
 * Get additional metadata from calculation record
 */
export function extractCalculationMetadata(calc: CalculationRecord): {
  confidence: number;
  similarity_score?: number;
  processing_time_ms?: number;
  raw_input?: string;
  matched_factor_id?: string;
} {
  if (calc.calculation_method === 'RAG') {
    return {
      confidence: calc.activity_data?.confidence || 0,
      similarity_score: (calc as any).similarity_score,
      processing_time_ms: (calc as any).processing_time_ms,
      raw_input: (calc as any).raw_input,
      matched_factor_id: (calc as any).matched_factor_id
    };
  } else if (calc.calculation_method === 'OPENAI') {
    return {
      confidence: calc.activity_data?.confidence || 0.95,
      processing_time_ms: (calc as any).processing_time_ms
    };
  }
  
  return { confidence: 0 };
} 