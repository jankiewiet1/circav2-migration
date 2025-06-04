# Unified Emission Calculation System

## Overview

The emission calculation system has been consolidated into a single, unified approach that simplifies the previously complex multi-service architecture. This document outlines the new system structure and migration path.

## System Architecture

### ✅ What's Active

1. **Edge Functions (Specialized)**:
   - `rag-emissions-calculator` - RAG-based calculations using vector similarity
   - `calculate-emissions` - OpenAI Assistant batch calculations

2. **Unified Service** (New):
   - `src/services/unifiedCalculationService.ts` - Main calculation orchestrator
   - Handles RAG->OpenAI fallback logic automatically
   - Provides simple, consistent API for all calculation needs

3. **Unified Database**:
   - `emission_calc` table - Single source of truth for all calculations
   - `calculation_method` field distinguishes between 'RAG' and 'OPENAI'
   - All edge functions save to this unified table

### ⚠️ What's Deprecated

1. **Old Services** (Now Wrappers):
   - `assistantEmissionCalculator.ts` - Wrapper with deprecation warnings
   - `hybridEmissionCalculator.ts` - Wrapper with deprecation warnings  
   - `emissionService.ts` - Partially deprecated, some Climatiq functions remain

2. **Old Tables** (Should be empty):
   - `emission_calc_openai` - No longer used
   - `emission_calc_rag` - No longer used

## How to Use the New System

### Basic Usage

```typescript
import { unifiedCalculationService } from '@/services/unifiedCalculationService';

// Calculate single entry (with automatic fallback)
const result = await unifiedCalculationService.calculateSingleEntry(entry, true); // true = prefer RAG

// Calculate batch entries
const batchResult = await unifiedCalculationService.calculateBatchEntries(entries);

// Calculate all company emissions
const companyResult = await unifiedCalculationService.calculateCompanyEmissions(companyId);

// Get calculation statistics
const stats = await unifiedCalculationService.getCalculationStats(companyId);

// Test the system
const testResult = await unifiedCalculationService.testCalculation(companyId);
```

### Migration from Old Services

**Before (Complex):**
```typescript
// Old way - multiple services, complex logic
import { assistantCalculator } from '@/services/assistantEmissionCalculator';
import { hybridEmissionCalculator } from '@/services/hybridEmissionCalculator';
import { ragEmissionsService } from '@/services/ragEmissionsService';

// Complex fallback logic
const ragResult = await ragEmissionsService.calculateEmissions(request);
if (ragResult.similarity < 0.75) {
  const openaiResult = await assistantCalculator.calculateSingleEntry(entry);
  // Handle different response formats...
}
```

**After (Simple):**
```typescript
// New way - one service, automatic fallback
import { unifiedCalculationService } from '@/services/unifiedCalculationService';

const result = await unifiedCalculationService.calculateSingleEntry(entry);
// Automatically tries RAG first, falls back to OpenAI if needed
// Consistent response format regardless of method used
```

## Key Features

### 1. Automatic Fallback Logic
- **RAG First**: Tries RAG calculation with similarity threshold (0.75)
- **OpenAI Fallback**: If RAG fails or confidence too low, automatically uses OpenAI
- **Transparent**: Method used is indicated in response (`method_used: 'RAG' | 'OPENAI'`)

### 2. Unified Response Format
```typescript
interface CalculationResult {
  success: boolean;
  method_used: 'RAG' | 'OPENAI' | 'FAILED';
  calculation_id?: string;
  total_emissions: number;
  emissions_unit: string;
  confidence: number;
  processing_time_ms: number;
  source: string;
  error?: string;
  entry_id: string;
}
```

### 3. Batch Processing
- **Small batches**: Processed individually with progress callbacks
- **Large batches**: Use optimized edge functions
- **Mixed success**: Some entries can succeed while others fail

### 4. Error Handling
- **Graceful degradation**: If one method fails, try the other
- **Detailed errors**: Clear error messages for debugging
- **Partial success**: Batch operations can have mixed results

## Edge Function Details

### RAG Emissions Calculator
- **Endpoint**: `/functions/v1/rag-emissions-calculator`
- **Method**: Uses vector similarity search against emission factors database
- **Input**: Raw text description of emission activity
- **Output**: Matched emission factor with similarity score
- **Saves to**: `emission_calc` table with `calculation_method: 'RAG'`

### Calculate Emissions (OpenAI)
- **Endpoint**: `/functions/v1/calculate-emissions`
- **Method**: Uses OpenAI Assistant API for batch processing
- **Input**: Array of entry IDs or company ID for all unmatched entries
- **Output**: Calculated emissions using AI reasoning
- **Saves to**: `emission_calc` table with `calculation_method: 'OPENAI'`

## Database Schema

### Unified Table: `emission_calc`
```sql
CREATE TABLE emission_calc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  entry_id UUID REFERENCES emission_entries(id),
  calculation_method TEXT CHECK (calculation_method IN ('RAG', 'OPENAI')),
  total_emissions NUMERIC,
  emissions_unit TEXT DEFAULT 'kg CO2e',
  activity_id TEXT,
  factor_name TEXT,
  source TEXT,
  activity_data JSONB DEFAULT '{}',
  -- RAG-specific fields
  similarity_score NUMERIC,
  processing_time_ms INTEGER,
  raw_input TEXT,
  matched_factor_id UUID,
  -- Common fields
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Configuration

### Similarity Threshold
The RAG similarity threshold can be adjusted in `unifiedCalculationService.ts`:
```typescript
private ragSimilarityThreshold = 0.75; // Minimum similarity for RAG to be considered reliable
```

### API Endpoints
Edge function URLs are configured in the service:
```typescript
private readonly SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
private readonly SUPABASE_ANON_KEY = "...";
```

## Monitoring and Debugging

### Check Calculation Statistics
```typescript
const stats = await unifiedCalculationService.getCalculationStats(companyId);
console.log(stats);
// {
//   total_entries: 100,
//   calculated_entries: 95,
//   pending_entries: 5,
//   rag_calculations: 60,
//   openai_calculations: 35,
//   total_emissions: 1250.5,
//   completion_percentage: 95
// }
```

### Test the System
```typescript
const test = await unifiedCalculationService.testCalculation(companyId);
if (test.success) {
  console.log(`Test passed: ${test.message}`);
} else {
  console.error(`Test failed: ${test.message}`);
}
```

### View Calculation Data
```sql
-- See recent calculations
SELECT 
  calculation_method,
  COUNT(*) as count,
  SUM(total_emissions) as total_emissions,
  AVG(similarity_score) as avg_similarity
FROM emission_calc 
WHERE calculated_at >= NOW() - INTERVAL '24 hours'
GROUP BY calculation_method;

-- Check for failures
SELECT entry_id, error 
FROM failed_calculations -- Error tracking would need to be added
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

## Best Practices

### 1. Use Unified Service
Always use `unifiedCalculationService` for new code. The old services are kept for backward compatibility but will show deprecation warnings.

### 2. Handle Progress Updates
For batch operations, provide progress callbacks:
```typescript
await unifiedCalculationService.calculateBatchEntries(entries, (completed, total) => {
  console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
});
```

### 3. Check Results
Always check the `success` field and handle errors:
```typescript
const result = await unifiedCalculationService.calculateSingleEntry(entry);
if (!result.success) {
  console.error(`Calculation failed: ${result.error}`);
  // Handle error appropriately
}
```

### 4. Monitor Performance
Track which method is being used more frequently:
```typescript
// Log method usage for monitoring
console.log(`Calculation completed using ${result.method_used} in ${result.processing_time_ms}ms`);
```

## Troubleshooting

### Common Issues

1. **"RAG similarity too low"**
   - The RAG system couldn't find a good match (similarity < 0.75)
   - System automatically falls back to OpenAI
   - This is normal behavior

2. **"Both RAG and OpenAI failed"**
   - Network issues or API limits
   - Check edge function logs in Supabase
   - Verify API keys are configured

3. **"No unmatched entries found"**
   - All entries have already been calculated
   - Use `includeMatched: true` to recalculate

### Performance Optimization

1. **Batch Size**: For large datasets, use the batch functions
2. **Similarity Threshold**: Adjust RAG threshold based on accuracy needs
3. **Caching**: Results are automatically saved to avoid recalculation

## Future Improvements

1. **Caching Layer**: Add Redis cache for frequently calculated patterns
2. **Batch RAG**: Implement batch processing for RAG calculations
3. **Quality Scoring**: Add quality metrics to track accuracy over time
4. **Auto-tuning**: Automatically adjust similarity thresholds based on success rates

## Getting Help

- Check the Supabase Edge Function logs for detailed error messages
- Use the test functions to verify system health
- Monitor the `emission_calc` table for calculation results
- Review deprecation warnings in console for migration guidance 