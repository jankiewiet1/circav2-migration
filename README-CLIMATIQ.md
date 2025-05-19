# Climatiq API Integration

This document explains how to set up and use the Climatiq API integration for carbon emission calculations.

## What is Climatiq?

[Climatiq](https://www.climatiq.io) is a carbon calculation engine that provides reliable, up-to-date emissions factors via API. It allows for accurate carbon footprint calculations based on various activities.

## Setup Instructions

### 1. Run Database Migration

To create the required database table for storing Climatiq calculations, run the SQL migration:

```bash
# Connect to your Postgres database
psql -d your_database_name

# Inside psql, run the migration script
\i run_emissions_migration.sql
```

### 2. API Key Configuration

The Climatiq API key is already set in the code:

```typescript
// src/integrations/climatiq/client.ts
const CLIMATIQ_API_KEY = '2EJNHK4KN957591GX5J7Q6ZR9M';
```

If needed, you can change this key to use your own Climatiq API credentials.

## Features

### 1. Manual Emission Calculations

The manual calculator allows users to calculate emissions for:

- Electricity consumption with regional specificity
- Transportation based on distance and mode of transport
- Fuel consumption by type and volume

### 2. Batch Processing

The batch processing feature:

1. Retrieves unmatched emission entries from the database
2. Gets the preferred emission factor source from company preferences
3. Finds appropriate Climatiq emission factors for each entry
4. Calculates emissions and stores them in the `emission_calc_climatiq` table

## How It Works

### Calculation Flow

1. **Emission Entries**: The system retrieves emission entries from your database
2. **Company Preferences**: It checks for the preferred emission data source in company preferences
3. **Climatiq API**: Entries are processed using the Climatiq API with the preferred source
4. **Storage**: Results are saved in the new `emission_calc_climatiq` table

### Database Schema

The new `emission_calc_climatiq` table stores:

- Basic calculation data (emissions, scope, etc.)
- Climatiq-specific fields (activity ID, factor details, etc.)
- Gas breakdown (CO2, CH4, N2O)
- Activity data and request parameters

## Testing the Integration

To test the integration:

1. Start the application and navigate to the Emissions > Calculate page
2. Try both the manual calculator and batch processing tabs
3. Check the database to verify that calculations are being stored correctly

## Troubleshooting

If you encounter issues:

- Check the browser console for API error responses
- Verify your database connection and table structure
- Ensure the Climatiq API key is valid and has sufficient quota 