# Model Context Protocol (MCP) Integration

## Overview

This PR integrates the OpenAI Model Context Protocol (MCP) into our carbon accounting platform. MCP enables AI models to access structured application context and perform actions, enhancing our AI capabilities for carbon data processing and analysis.

## Changes

- Created TypeScript interfaces for MCP context and actions in `src/types/mcp.ts`
- Implemented MCP context API endpoint at `/api/mcp-context.ts`
- Added MCP action for carbon footprint calculation in `/api/mcp-actions/calculate-carbon-footprint.ts`
- Created MCP server provider in `src/lib/mcp-server.ts` to manage context and actions
- Added React hook `useMCP` in `src/hooks/useMCP.ts` for component integration
- Updated OpenAI client with MCP support in `src/integrations/openai/client.ts`
- Enhanced Carbon Data Recognition Agent with MCP in `src/agents/data-recognition/`
- Added comprehensive documentation in `README-MCP-INTEGRATION.md`

## Testing

The MCP integration has been tested with:

1. Carbon data extraction from documents
2. Carbon footprint calculations
3. React component integration
4. OpenAI API interactions

## References

- [OpenAI MCP Documentation](https://platform.openai.com/docs/assistants/tools/model-context-protocol)
- [OpenAI MCP GitHub Repository](https://github.com/openai/openai-agents-python)

## Screenshots

[Include screenshots of the MCP integration in action]

## Deployment Checklist

- [ ] Deploy API routes to Vercel
- [ ] Update Supabase Edge Functions
- [ ] Set environment variables for OpenAI API
- [ ] Run database migrations if needed
- [ ] Update documentation

## Next Steps

- Implement additional MCP actions for compliance reporting
- Enhance error handling and fallback mechanisms
- Add more comprehensive tests
- Optimize token usage for large context scenarios 