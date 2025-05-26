# Carbon Data Recognition Agent

This document provides an overview of the Carbon Data Recognition Agent, its setup, and how to use it in your application.

## Overview

The Carbon Data Recognition Agent is a powerful AI agent built using the OpenAI Agents SDK. It's designed to process various file formats (PDF, Excel, CSV, images) and extract structured carbon emissions data for carbon accounting purposes.

### Key Capabilities

- **Automated Data Extraction**: Extract carbon data from various file formats
- **Schema Mapping**: Map extracted data to our standard carbon accounting schema
- **Data Validation**: Validate and normalize data fields
- **Error Handling**: Provide clear feedback when data is incomplete
- **Interactive Correction**: Allow users to correct and complete data

## Setup

### Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- OpenAI API key
- Supabase project setup

### Installation

1. Clone the repository and navigate to the project directory:

```bash
git clone [repository-url]
cd [project-directory]
```

2. Install JavaScript dependencies:

```bash
npm install
```

3. Set up Python environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install openai-agents
```

4. Set your OpenAI API key:

Create a file at `src/integrations/openai/config.local.ts` with:

```typescript
export const OPENAI_API_KEY = 'your-api-key-here';
```

### Deployment

Deploy both the Supabase Edge Function and the Carbon Data Agent:

```bash
npm run deploy:functions
```

The script will guide you through setting up both components.

## Usage

### Frontend Integration

Use the `AgentUpload` component in your React application:

```jsx
import { AgentUpload } from '@/components/AgentUpload';

function CarbonDataPage() {
  const companyId = "your-company-id";
  
  const handleDataExtracted = (data) => {
    console.log("Extracted data:", data);
    // Use the data in your application
  };
  
  return (
    <div>
      <h1>Carbon Data Extraction</h1>
      <AgentUpload 
        companyId={companyId} 
        onDataExtracted={handleDataExtracted} 
      />
    </div>
  );
}
```

### Direct API Usage

You can also use the agent directly in your JavaScript code:

```javascript
import { createCarbonDataAgent } from '@/agents/data-recognition';

// Create agent instance
const agent = createCarbonDataAgent();

// Process a file
const result = await agent.processFile(file, companyId);

if (result.success) {
  // Use the extracted data
  console.log(result.data);
  
  // Check if data needs review
  if (result.requires_review) {
    // Show review UI
  }
} else {
  // Handle error
  console.error(result.message);
}
```

## Architecture

The Carbon Data Agent architecture consists of the following components:

1. **Agent Core (Python)**: Built with the OpenAI Agents SDK, handling the complex data extraction logic
2. **JavaScript Wrapper**: Provides a convenient interface for frontend integration
3. **Supabase Edge Function**: Handles file processing on the server
4. **React Component**: Provides a user interface for file uploads and data review

### Directory Structure

```
src/
  agents/
    data-recognition/
      agent.py         # Core agent implementation
      index.js         # JavaScript wrapper
  components/
    AgentUpload.tsx    # React component
supabase/
  functions/
    process-ai-data/   # Edge function
scripts/
  deploy-agent.js      # Agent deployment script
  deploy-supabase-functions.js  # Supabase deployment script
```

## Schema Format

The Carbon Data Agent extracts data in the following format:

```json
{
  "date": "2023-01-15",
  "type": "electricity",
  "region": "Netherlands",
  "amount": 1250.5,
  "amount_unit": "kWh",
  "year": 2023,
  "supplier": "Green Energy Co.",
  "energy_source": "renewable",
  "connection_type": "grid",
  "loss_factor": 0.02,
  "recs": "yes",
  "invoice_id": "INV-20230115-001",
  "description": "January 2023 office electricity consumption"
}
```

## Troubleshooting

### Common Issues

- **File Upload Failures**: Check Supabase storage configuration and bucket permissions
- **Agent Not Responding**: Verify OpenAI API key and quotas
- **Edge Function Errors**: Check Supabase logs for detailed error messages

### Debugging

- Enable debug logging by adding `?debug=true` to the URL
- Check browser console for detailed error messages
- Review Supabase Function logs in the Supabase dashboard

## Future Enhancements

- Support for more file formats
- Improved data extraction accuracy
- Batch processing capabilities
- Custom schema mapping
- Integration with carbon calculation engine

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the terms specified in the LICENSE file.

## Contact

For questions or support, please contact the development team. 