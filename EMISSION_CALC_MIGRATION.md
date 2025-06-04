# Emission Calculation Table Migration

## Overview

We have consolidated the emission calculation storage from two separate tables (`emission_calc_openai` and `emission_calc_rag`) into a single unified table called `emission_calc`. This simplifies the architecture and provides a single source of truth for all calculations.

## New Table Structure

The `emission_calc` table combines the best of both previous tables:

### Key Fields:
- `calculation_method`: `'RAG' | 'OPENAI'` - Tracks how the calculation was performed
- `total_emissions`: The calculated emission value
- `emissions_unit`: Unit of measurement (default: 'kg CO2e')
- `entry_id`: References the original emission_entries record
- `company_id`: Company ownership for RLS
- `calculated_at`: When the calculation was performed

### Method-Specific Fields:
- **RAG calculations**: `similarity_score`, `processing_time_ms`, `raw_input`, `matched_factor_id`
- **OpenAI calculations**: Structured `activity_data` JSONB field with emission factors and confidence

## Database Setup

1. Run the SQL script in `database-setup.sql` to create the new table
2. The table includes proper indexes, RLS policies, and constraints
3. Update your Supabase types by running: `supabase gen types typescript`

## Code Changes Made

### 1. Unified Calculation Service (`src/services/unifiedCalculationService.ts`)
- ✅ Updated to query single `emission_calc` table
- ✅ Changed method types from `'ASSISTANT'` to `'OPENAI'`
- ✅ Simplified data fetching logic
- ✅ Enhanced logging for debugging

### 2. Dashboard Data Hook (`src/hooks/useDashboardData.ts`)
- ✅ Updated method references to use `'OPENAI'`
- ✅ Consistent logging with new method names

### 3. Match Status Hook (`src/hooks/useEntryMatchStatus.ts`)
- ✅ Updated method references to use `'OPENAI'`
- ✅ Consistent logging with new method names

## Data Migration Strategy

Since you're in testing mode, no data migration is needed. For production environments:

1. **Backup existing data** from `emission_calc_openai` and `emission_calc_rag`
2. **Create the new table** using the provided SQL script
3. **Migrate data** with appropriate `calculation_method` values:
   ```sql
   -- Migrate OpenAI calculations
   INSERT INTO emission_calc (company_id, entry_id, calculation_method, total_emissions, ...)
   SELECT company_id, entry_id, 'OPENAI', total_emissions, ...
   FROM emission_calc_openai;
   
   -- Migrate RAG calculations  
   INSERT INTO emission_calc (company_id, entry_id, calculation_method, total_emissions, ...)
   SELECT company_id, entry_id, 'RAG', total_emissions, ...
   FROM emission_calc_rag;
   ```
4. **Verify data integrity** and update application code
5. **Drop old tables** after successful migration

## Benefits

1. **Single Source of Truth**: All calculations in one place
2. **Simplified Queries**: No complex JOINs or UNION operations
3. **Better Performance**: Single table with proper indexing
4. **Consistent API**: Unified interface for all calculation methods
5. **Easier Maintenance**: Single schema to manage

## Testing

The application will now:
- ✅ Display unified calculation counts in dashboard and traceability
- ✅ Show both RAG and OpenAI calculations in the same views
- ✅ Properly track calculation methods for filtering and reporting
- ✅ Maintain data consistency across all components

## Next Steps

1. Execute the `database-setup.sql` script in your Supabase dashboard
2. Test the application with some sample data
3. Verify calculations are being stored and retrieved correctly
4. Update Supabase TypeScript types when ready 