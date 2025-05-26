# Model Context Protocol (MCP) Integration

This document provides an overview of the Model Context Protocol (MCP) integration in our carbon accounting platform, following the OpenAI MCP specification.

## Overview

The Model Context Protocol (MCP) is a standardized way for AI models to access and interact with application context and perform actions. Our carbon accounting platform implements MCP to provide AI agents with access to carbon data, emissions calculations, and other platform features.

### Key Components

- **MCP Context**: Structured carbon accounting data provided to AI models
- **MCP Actions**: Functions that AI models can call to perform operations
- **MCP Server**: Backend implementation that manages context and actions
- **MCP Client**: Frontend integration for React components

## Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   OpenAI API  │     │  MCP Server   │     │   Supabase    │
│   (GPT-4o)    │◄────┤  Provider     │◄────┤   Database    │
└───────────────┘     └───────────────┘     └───────────────┘
        ▲                     ▲                    ▲
        │                     │                    │
        │                     │                    │
        │                     │                    │
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  React UI     │     │  API Routes   │     │  Carbon Data  │
│  Components   │◄────┤  /api/mcp-*   │◄────┤  Agent (MCP)  │
└───────────────┘     └───────────────┘     └───────────────┘
```

## MCP Context

The MCP context provides structured data about the carbon accounting platform, including:

- Company information
- Carbon data entries
- Emission summaries
- Calculation settings
- User permissions

### Context Schema

The main context schema is defined in `src/types/mcp.ts` as the `MCPContext` interface:

```typescript
export interface MCPContext {
  // Version info
  version: string;
  timestamp: string;
  
  // Company/Organization context 
  company: {
    id: string;
    name: string;
    // ...other company fields
  };
  
  // Carbon accounting data
  carbonData: {
    entries: DataEntry[];
    summary: {
      totalEmissions: EmissionSummary;
      // ...other summary fields
    };
    // ...other carbon data fields
  };
  
  // ...other context sections
}
```

### Context API Endpoint

The MCP context is exposed via the `/api/mcp-context` API endpoint, which:

1. Authenticates the requesting user
2. Retrieves company and carbon data from Supabase
3. Formats the data according to the MCP context schema
4. Returns the structured context as JSON

## MCP Actions

MCP actions are functions that AI models can call to perform operations on the carbon accounting platform. These actions include:

- `calculateCarbonFootprint`: Calculate emissions for data entries
- `normalizeDataUnits`: Convert between different units of measurement
- `validateDataEntry`: Validate data entry fields
- `extractDataFromDocument`: Extract carbon data from documents
- `generateComplianceReport`: Generate compliance reports
- `sendComplianceEmail`: Send compliance emails

### Action Schema

Actions are defined in `src/types/mcp.ts` using TypeScript interfaces:

```typescript
export interface MCPActionInputs {
  [MCPActionType.CALCULATE_CARBON_FOOTPRINT]: {
    dataEntryIds: string[];
    includeIndirect?: boolean;
    emissionFactorSource?: string;
  };
  // ...other action input types
}

export interface MCPActionOutputs {
  [MCPActionType.CALCULATE_CARBON_FOOTPRINT]: {
    totalEmissions: number;
    unit: string;
    breakdown: {
      scope1: number;
      scope2: number;
      scope3: number;
    };
    // ...other output fields
  };
  // ...other action output types
}
```

### Action API Endpoints

Each MCP action is exposed via a dedicated API endpoint under `/api/mcp-actions/`:

- `/api/mcp-actions/calculate-carbon-footprint`
- `/api/mcp-actions/normalize-data-units`
- `/api/mcp-actions/validate-data`
- `/api/mcp-actions/extract-data`
- `/api/mcp-actions/generate-report`
- `/api/mcp-actions/send-compliance-email`

## Integration with OpenAI

The platform integrates with OpenAI's API to provide MCP functionality:

1. The `MCPOpenAIClient` class in `src/integrations/openai/client.ts` provides methods for working with MCP
2. The `useMCP` React hook in `src/hooks/useMCP.ts` makes MCP available to React components
3. The `mcpServer` in `src/lib/mcp-server.ts` manages MCP actions and context

### Example Usage in React Components

```jsx
function CarbonDataAnalyzer({ companyId }) {
  const { loading, mcpContext, executeAction, completeChatWithContext } = useMCP(companyId);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  
  const handleAsk = async () => {
    const response = await completeChatWithContext(question);
    setAnswer(response);
  };
  
  // ... component rendering
}
```

## Carbon Data Recognition Agent with MCP

The Carbon Data Recognition Agent has been updated to use MCP:

1. The Python agent in `src/agents/data-recognition/agent.py` implements MCP context and actions
2. The JavaScript wrapper in `src/agents/data-recognition/index.js` uses MCP for document processing
3. The agent can extract data from documents using the `extractDataFromDocument` MCP action

## Security Considerations

The MCP implementation includes several security measures:

1. **Authentication**: All MCP endpoints require authentication
2. **Authorization**: Actions check user permissions before execution
3. **Rate Limiting**: API endpoints have rate limiting to prevent abuse
4. **Data Validation**: All inputs are validated before processing

## Testing MCP Integration

To test the MCP integration:

1. Run the development server: `npm run dev`
2. Use the Carbon Data Recognition Agent to process a document
3. Check the console logs to verify MCP actions are being called
4. Use the React Developer Tools to inspect the MCP context in components

## References

- [OpenAI MCP Documentation](https://platform.openai.com/docs/assistants/tools/model-context-protocol)
- [OpenAI MCP GitHub Repository](https://github.com/openai/openai-agents-python)
- [Carbon Accounting Platform Documentation](./README.md) 