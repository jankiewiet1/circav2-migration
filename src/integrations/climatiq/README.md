# Climatiq API Integration

This directory contains the integration with the Climatiq API for carbon emissions calculations.

## Setup

1. Sign up for a Climatiq API key at [https://www.climatiq.io/](https://www.climatiq.io/)
2. Create a `.env.local` file in the root of your project
3. Add your API key to the `.env.local` file:
   ```
   NEXT_PUBLIC_CLIMATIQ_API_KEY=your_climatiq_api_key_here
   ```

## Features

The integration currently supports the following Climatiq API endpoints:

1. **Basic Estimate**: Calculate emissions for any activity by multiplying activity data by emission factors.
2. **Procurement**: Calculate emissions from purchased goods and services based on spend data.
3. **Electricity**: Calculate scope 2 emissions (and associated scope 3) from electricity consumption.

Additional endpoints that can be added in the future:
- Fuel Combustion
- Vehicles
- Flights
- Search Emission Factors

## Usage

All components are accessible through the main ClimatiqCalculator component:

```tsx
import { ClimatiqCalculator } from '../components/climatiq/ClimatiqCalculator';

export default function YourPage() {
  return (
    <main>
      <ClimatiqCalculator />
    </main>
  );
}
```

Or you can use individual calculators directly:

```tsx
import { BasicEstimateForm } from '../components/climatiq/BasicEstimateForm';
import { ProcurementForm } from '../components/climatiq/ProcurementForm';
import { ElectricityForm } from '../components/climatiq/ElectricityForm';

export default function YourPage() {
  return (
    <div>
      <BasicEstimateForm />
      <ProcurementForm />
      <ElectricityForm />
    </div>
  );
}
```

## API Client

The API client is available for direct use if you need to build custom components:

```tsx
import {
  estimate,
  estimateProcurement,
  estimateElectricity,
  estimateFuelCombustion,
  estimateVehicleEmissions,
  searchEmissionFactors,
  // Types
  EstimateRequest,
  ProcurementRequest,
  ElectricityRequest,
  // ...etc
} from '../integrations/climatiq';

// Example usage
const calculateEmissions = async () => {
  try {
    const response = await estimate({
      emission_factor: {
        activity_id: 'electricity-supply_grid-source_residual_mix',
        region: 'GB',
      },
      parameters: {
        energy: 1000,
        energy_unit: 'kWh',
      },
    });
    
    console.log(`Emissions: ${response.co2e} ${response.co2e_unit}`);
  } catch (error) {
    console.error('Error calculating emissions:', error);
  }
};
```

## Documentation

For more information on the Climatiq API, please refer to the official documentation:

- [Climatiq API Documentation](https://docs.climatiq.io/)
- [Emission Factor Database](https://www.climatiq.io/explorer) 