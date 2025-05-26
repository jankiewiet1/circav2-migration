# Climatiq API Integration Guide

## Overview

This application uses the [Climatiq API](https://www.climatiq.io/) to calculate carbon emissions for various activities. The integration is fully functional and can be used to:

1. Calculate emissions for electricity consumption
2. Calculate emissions for transportation
3. Calculate emissions for fuel consumption
4. Process emission entries from the database

## How It Works

The integration consists of several components:

1. **Climatiq API Client** (`src/integrations/climatiq/client.ts`): Provides direct access to the Climatiq API
2. **Emission Service** (`src/services/emissionService.ts`): Business logic for emission calculations
3. **Database Tables**: Stores emission entries and calculation results
   - `emission_entries`: Raw data about activities that produce emissions
   - `emission_calc_climatiq`: Calculated emissions using the Climatiq API

## Using the Climatiq API

### 1. Calculate Emissions for Specific Activities

```typescript
import { ClimatiqEmissionService } from '@/services/emissionService';

// Calculate electricity emissions
const electricityResult = await ClimatiqEmissionService.calculateElectricityEmissions(
  1000, // kWh
  'GB'  // country code (optional)
);

// Calculate transport emissions
const transportResult = await ClimatiqEmissionService.calculateTransportEmissions(
  100,  // distance
  'car', // mode of transport
  'km'   // unit
);

// Calculate fuel emissions
const fuelResult = await ClimatiqEmissionService.calculateFuelEmissions(
  50,      // quantity
  'diesel', // fuel type
  'L'      // unit
);

// Save calculation results to the database
await ClimatiqEmissionService.saveEmissionData(result, companyId);
```

### 2. Batch Process Emission Entries

```typescript
import { ClimatiqEmissionService } from '@/services/emissionService';

// Process all unmatched entries for a company
const batchResult = await ClimatiqEmissionService.calculateFromEmissionEntries(companyId);

console.log(`Processed ${batchResult.processed} entries`);
console.log(`Successfully calculated ${batchResult.succeeded} entries`);
console.log(`Failed to calculate ${batchResult.failed} entries`);
```

### 3. Run Diagnostics on Emission Setup

```typescript
import { runEmissionDiagnostics } from '@/services/emissionService';

// Check for entries without calculations
const diagnostics = await runEmissionDiagnostics(companyId);

console.log(`Missing calculations: ${diagnostics.missingCalculations}`);
console.log('Diagnostic logs:', diagnostics.logs);
```

### 4. Recalculate All Emissions

```typescript
import { recalculateCompanyEmissions } from '@/services/emissionService';

// Trigger recalculation of all emissions for a company
await recalculateCompanyEmissions(companyId);
```

## Database Structure

### 1. Emission Entries Table

This table stores the raw data for activities that produce emissions:

- `id`: UUID primary key
- `company_id`: Foreign key to the company table
- `date`: Date of the activity
- `category`: Type of activity (e.g., electricity, diesel, employee_commute)
- `description`: Human-readable description
- `quantity`: Numerical value of the activity
- `unit`: Unit of measurement (e.g., kWh, km, L)
- `match_status`: Status of the entry (unmatched, matched, error)

### 2. Emission Calculations Table (emission_calc_climatiq)

This table stores the calculated emissions using the Climatiq API:

- `id`: UUID primary key
- `company_id`: Foreign key to the company table
- `entry_id`: Foreign key to the emission_entries table (can be null for manual calculations)
- `total_emissions`: Numerical value of the emissions
- `emissions_unit`: Unit of the emissions (usually kg CO2e)
- `climatiq_category`: Category used in the Climatiq API
- `climatiq_activity_id`: Activity ID used in the Climatiq API
- `scope`: Emissions scope (1, 2, or 3)
- `created_at`: Timestamp of the calculation

## Troubleshooting

1. **API Key**: The API key is set in `src/integrations/climatiq/client.ts`. In production, this should be set via an environment variable.

2. **Missing Calculations**: If entries are not being calculated, check:
   - The `match_status` field in emission_entries
   - Run diagnostics with `runEmissionDiagnostics`
   - Check the mapping logic in `findClimatiqActivityId`

3. **Error Handling**: All API calls include error handling that will log detailed errors to the console.

## API Documentation

For more information on the Climatiq API, visit:
- [Climatiq API Documentation](https://www.climatiq.io/docs)
- [Emission Factors](https://www.climatiq.io/docs/emission-factors) 