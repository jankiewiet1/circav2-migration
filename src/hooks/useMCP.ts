/**
 * useMCP Hook
 * 
 * This React hook provides integration with the Model Context Protocol (MCP)
 * for AI-powered components in the carbon accounting platform.
 */

import { useState, useEffect, useCallback } from 'react';
import { openai, isConfigured } from '@/integrations/openai/client';
import { MCPContext, MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';
import { mcpServer } from '@/lib/mcp-server';

// Define the return type for the hook
interface UseMCPReturn {
  loading: boolean;
  error: Error | null;
  mcpContext: MCPContext | null;
  executeAction: <T extends MCPActionType>(
    actionType: T,
    inputs: MCPActionInputs[T]
  ) => Promise<MCPActionOutputs[T]>;
  completeChatWithContext: (
    prompt: string,
    systemMessage?: string
  ) => Promise<string>;
}

/**
 * MCP integration hook for React components
 * 
 * @param companyId - The company ID to retrieve context for
 * @returns MCP integration functions and state
 */
export function useMCP(companyId: string): UseMCPReturn {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [mcpContext, setMcpContext] = useState<MCPContext | null>(null);
  
  // Fetch MCP context on component mount
  useEffect(() => {
    async function fetchMCPContext() {
      if (!companyId) return;
      
      try {
        setLoading(true);
        const context = await mcpServer.getMCPContext(companyId);
        setMcpContext(context);
        setError(null);
      } catch (err) {
        console.error('Error fetching MCP context:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }
    
    fetchMCPContext();
  }, [companyId]);
  
  /**
   * Execute an MCP action
   */
  const executeAction = useCallback(async <T extends MCPActionType>(
    actionType: T,
    inputs: MCPActionInputs[T]
  ): Promise<MCPActionOutputs[T]> => {
    try {
      return await mcpServer.executeAction(actionType, inputs);
    } catch (err) {
      console.error(`Error executing MCP action ${actionType}:`, err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, []);
  
  /**
   * Complete a chat query with MCP context
   */
  const completeChatWithContext = useCallback(async (
    prompt: string,
    systemMessage = "You are a helpful carbon accounting assistant with access to company data."
  ): Promise<string> => {
    if (!isConfigured) {
      throw new Error('OpenAI client is not configured');
    }
    
    if (!mcpContext) {
      throw new Error('MCP context not available');
    }
    
    try {
      // Get function definitions for all MCP actions
      const functionDefinitions = mcpServer.getFunctionDefinitions();
      
      // Create a simplified context to avoid token limits
      const simplifiedContext = {
        company: mcpContext.company,
        carbonData: {
          summary: mcpContext.carbonData.summary,
          status: mcpContext.carbonData.status
        },
        user: {
          role: mcpContext.user.role,
          permissions: mcpContext.user.permissions
        }
      };
      
      // Prepare the system message with MCP context
      const systemMessageWithContext = `
${systemMessage}

MCP CONTEXT (Carbon Accounting Platform):
${JSON.stringify(simplifiedContext, null, 2)}

You can use the following tools to interact with the carbon accounting platform:
- calculateCarbonFootprint: Calculate carbon footprint for specific data entries
- normalizeDataUnits: Convert between different units of measurement
- validateDataEntry: Validate data entry fields for correctness
- extractDataFromDocument: Extract carbon data from documents
- generateComplianceReport: Generate compliance reports

Always use these tools when appropriate to provide accurate information.
`;
      
      // Call the OpenAI API with MCP context
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemMessageWithContext },
          { role: 'user', content: prompt }
        ],
        tools: functionDefinitions.map(def => ({
          type: 'function',
          function: def
        })),
        temperature: 0.3,
        max_tokens: 1000
      });
      
      const responseMessage = completion.choices[0].message;
      
      // Check if the model requested to use a tool
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        
        // Get the function name and arguments
        const functionName = toolCall.function.name as MCPActionType;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        // Execute the requested function
        const functionResult = await executeAction(functionName, functionArgs);
        
        // Send the function result back to get the final response
        const secondCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemMessageWithContext },
            { role: 'user', content: prompt },
            { role: 'assistant', content: responseMessage.content || '', tool_calls: responseMessage.tool_calls },
            { 
              role: 'tool', 
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });
        
        return secondCompletion.choices[0].message.content || '';
      }
      
      return responseMessage.content || '';
    } catch (err) {
      console.error('Error completing chat with MCP context:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, [mcpContext, executeAction]);
  
  return {
    loading,
    error,
    mcpContext,
    executeAction,
    completeChatWithContext
  };
} 