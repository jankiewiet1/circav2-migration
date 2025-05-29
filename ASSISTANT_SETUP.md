# Carbon Accounting OpenAI Assistant Setup Guide

This guide will help you set up and optimize your OpenAI Assistant for carbon accounting emission calculations.

## 🎯 Overview

Your OpenAI Assistant is configured to:
- **Calculate CO2e emissions** from activity data using comprehensive emission factor databases
- **Lookup emission factors** from uploaded knowledge base (DEFRA, EPA, IPCC, RIVM, etc.)
- **Classify GHG scopes** according to the GHG Protocol
- **Validate calculations** with confidence scoring and quality assurance
- **Handle unit conversions** and normalization

## 📋 Prerequisites

1. **OpenAI API Key**: You need an OpenAI API key with access to GPT-4o and Assistants API
2. **Assistant ID**: Your existing assistant ID is `asst_lgIBVnkFbxotum0R29rIhTj`
3. **Knowledge Base**: Upload emission factor PDFs to your assistant's vector store

## 🚀 Quick Setup

### 1. Set Environment Variables

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

### 2. Update Your Assistant

Run the update script to apply the optimized configuration:

```bash
npm run update-assistant
```

This will:
- ✅ Update your assistant with the new emission calculation prompt
- ✅ Configure the tools for validation and classification
- ✅ Set optimal parameters (temperature: 0.1, model: gpt-4o)
- ✅ Test the assistant with a sample calculation

### 3. Verify Knowledge Base

Ensure your assistant has access to emission factor databases:

1. Go to [OpenAI Platform](https://platform.openai.com/assistants)
2. Find your assistant: `asst_lgIBVnkFbxotum0R29rIhTj`
3. Check that the "Carbon Accounting Knowledge Base" vector store contains:
   - ✅ DEFRA GHG Conversion Factors 2024
   - ✅ EPA Emission Factors
   - ✅ IPCC Guidelines
   - ✅ RIVM Emission Factors
   - ✅ Other relevant emission factor databases

## 🔧 Assistant Configuration

### Core Capabilities

Your assistant is optimized for:

```json
{
  "emission_factor_lookup": "Search comprehensive databases",
  "precise_calculations": "Activity Data × Emission Factor = CO2e",
  "ghg_scope_classification": "Scope 1, 2, 3 according to GHG Protocol",
  "unit_conversions": "Handle all common carbon accounting units",
  "quality_assurance": "Confidence scoring and validation",
  "source_validation": "Cross-reference multiple databases"
}
```

### Input Format

The assistant expects emission entries in this format:

```json
{
  "id": "uuid",
  "company_id": "uuid", 
  "date": "2024-05-27",
  "category": "fuel",
  "description": "Diesel fuel for company vehicles",
  "quantity": 100,
  "unit": "liters",
  "scope": 1,
  "notes": "Fleet vehicles"
}
```

### Output Format

The assistant returns calculations in this format:

```json
{
  "emission_factor": 2.68,
  "emission_factor_unit": "kg CO2e/liter",
  "total_emissions": 268.0,
  "emissions_unit": "kg CO2e",
  "scope": 1,
  "source": "DEFRA GHG Conversion Factors 2024",
  "confidence": 0.95,
  "calculation_details": "100 liters × 2.68 kg CO2e/liter = 268.0 kg CO2e",
  "warnings": [],
  "emission_breakdown": {
    "co2": 240.5,
    "ch4": 15.2,
    "n2o": 12.3
  },
  "factor_metadata": {
    "factor_id": "DEFRA_2024_DIESEL",
    "year": 2024,
    "region": "UK",
    "category": "Transport Fuels"
  }
}
```

## 🧪 Testing Your Assistant

### Test Single Calculation

```bash
npm run test-assistant
```

### Test in Your Application

Use the `AssistantEmissionCalculator` service:

```typescript
import { AssistantEmissionCalculator } from '@/services/assistantEmissionCalculator';

const calculator = new AssistantEmissionCalculator();

// Test single entry
const result = await calculator.testSingleEntryCalculation(companyId, false);
console.log('Test result:', result);

// Calculate for specific entries
const results = await calculator.calculateSelectedEntries(
  companyId, 
  ['entry-id-1', 'entry-id-2']
);
```

## 📊 Data Processing Workflow

### 1. Emission Factor Lookup
- Assistant searches uploaded knowledge base
- Matches activity description to appropriate factors
- Considers geographic and temporal relevance
- Validates against multiple sources

### 2. Calculation Process
```
Activity Data × Emission Factor = Total CO2e Emissions
```

### 3. Quality Assurance
- **Confidence Scoring**: 0.9-1.0 (exact), 0.7-0.9 (good), 0.5-0.7 (approximate)
- **Validation Checks**: Reasonable emission intensities, unit compatibility
- **Warning Flags**: Unusual values, outdated factors, missing data

### 4. Scope Classification
- **Scope 1**: Direct emissions (fuel combustion, company vehicles)
- **Scope 2**: Purchased energy (electricity, steam, heating)
- **Scope 3**: Value chain emissions (travel, purchased goods, waste)

## 🎯 Supported Activity Types

### Fuel Combustion (Scope 1)
- Diesel, petrol, natural gas, LPG
- Company vehicles, heating systems
- Generators, equipment

### Electricity (Scope 2)
- Grid electricity by country/region
- Renewable energy certificates
- Steam, heating, cooling

### Transportation (Scope 3)
- Business travel (flights, trains, cars)
- Employee commuting
- Freight transportation

### Other Activities
- Waste disposal and treatment
- Water consumption
- Purchased goods and services
- Industrial processes

## 🔍 Troubleshooting

### Common Issues

1. **Assistant Not Found (404)**
   - Verify assistant ID: `asst_lgIBVnkFbxotum0R29rIhTj`
   - Check OpenAI API key permissions

2. **Low Confidence Scores**
   - Upload more specific emission factor databases
   - Provide more detailed activity descriptions
   - Check unit compatibility

3. **Missing Emission Factors**
   - Ensure knowledge base contains relevant databases
   - Update with latest emission factor releases
   - Add region-specific factors

### Debug Mode

Enable detailed logging in your application:

```typescript
// In your environment variables
VITE_DEBUG_ASSISTANT=true
```

## 📈 Performance Optimization

### Batch Processing
- Process entries in batches of 5-10 for safety
- Use progress callbacks for user feedback
- Implement retry logic for failed calculations

### Cost Management
- Use test mode for development
- Implement calculation limits
- Cache common emission factors

### Accuracy Improvement
- Regularly update emission factor databases
- Collect user feedback on calculations
- Monitor confidence scores and warnings

## 🔄 Maintenance

### Regular Updates
1. **Monthly**: Update emission factor databases
2. **Quarterly**: Review and improve prompts
3. **Annually**: Update GHG Protocol compliance

### Monitoring
- Track calculation accuracy
- Monitor API usage and costs
- Review user feedback and corrections

## 📚 Additional Resources

- [GHG Protocol Standards](https://ghgprotocol.org/)
- [DEFRA Emission Factors](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024)
- [EPA Emission Factors](https://www.epa.gov/climateleadership/ghg-emission-factors-hub)
- [OpenAI Assistants API Documentation](https://platform.openai.com/docs/assistants/overview)

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the assistant logs in OpenAI platform
3. Test with the provided sample calculations
4. Verify your knowledge base is properly uploaded

Your assistant is now ready to provide accurate, GHG Protocol-compliant emission calculations! 🌱 