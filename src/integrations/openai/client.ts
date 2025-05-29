import OpenAI from 'openai';
import { MCPContext, MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';

// Get API key from environment variables with better browser compatibility
const getApiKey = () => {
  // Try different environment variable patterns
  if (typeof window !== 'undefined') {
    // Browser environment - use import.meta.env
    return import.meta.env.VITE_OPENAI_API_KEY || '';
  } else {
    // Node.js environment (for scripts)
    return process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  }
};

const OPENAI_API_KEY = getApiKey();

// Check if key is valid (handle both traditional and project-scoped keys)
const isValidKey = (key: string) => {
  return key && 
    ((key.startsWith('sk-') && key.length > 30) || 
     (key.startsWith('sk-proj-') && key.length > 30));
};

// Initialize the OpenAI client with better error handling
let openai: OpenAI;
let isConfigured = false;

try {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY || 'dummy-key', // Provide dummy key to prevent initialization errors
    dangerouslyAllowBrowser: true, // Only for development, in production use server-side API calls
    baseURL: "https://api.openai.com/v1", // Explicitly set the base URL
  });
  
  isConfigured = isValidKey(OPENAI_API_KEY);
} catch (error) {
  console.warn('OpenAI client initialization failed:', error);
  // Create a dummy client to prevent import errors
  openai = {} as OpenAI;
  isConfigured = false;
}

// Log OpenAI configuration for debugging (without showing the full key)
console.log('OpenAI Client Config:', { 
  keyStartsWith: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'not set',
  keyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0,
  isConfigValid: isConfigured
});

// Check if API key is valid
if (!isConfigured && OPENAI_API_KEY) {
  console.warn('OpenAI API key appears invalid. AI features will use demo mode.');
} else if (!OPENAI_API_KEY) {
  console.info('OpenAI API key not set. AI features will use demo mode.');
  console.info('To enable real AI: Set VITE_OPENAI_API_KEY in your .env.local file');
}

export { openai, isConfigured };

/**
 * MCP integration for OpenAI client
 */
export class MCPOpenAIClient {
  private context: MCPContext | null = null;
  private functionDefinitions: any[] = [];
  
  /**
   * Set the MCP context for AI interactions
   */
  setContext(context: MCPContext): void {
    this.context = context;
  }
  
  /**
   * Register MCP action function definitions for tool use
   */
  registerFunctionDefinitions(definitions: any[]): void {
    this.functionDefinitions = definitions;
  }
  
  /**
   * Get a simplified context to avoid token limits
   */
  private getSimplifiedContext(): any {
    if (!this.context) return null;
    
    return {
      company: this.context.company,
      carbonData: {
        summary: this.context.carbonData.summary,
        status: this.context.carbonData.status
      },
      user: {
        role: this.context.user.role,
        permissions: this.context.user.permissions
      }
    };
  }
  
  /**
   * Create a chat completion with MCP context
   */
  async createChatCompletionWithMCP(
    prompt: string, 
    systemMessage = "You are a helpful carbon accounting assistant with access to company data.",
    executeAction?: <T extends MCPActionType>(
      actionType: T,
      inputs: MCPActionInputs[T]
    ) => Promise<MCPActionOutputs[T]>
  ): Promise<string> {
    if (!isConfigured) {
      throw new Error('OpenAI client is not configured');
    }
    
    if (!this.context) {
      throw new Error('MCP context not set. Call setContext() first.');
    }
    
    try {
      // Create a simplified context to avoid token limits
      const simplifiedContext = this.getSimplifiedContext();
      
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
        tools: this.functionDefinitions.map(def => ({
          type: 'function',
          function: def
        })),
        temperature: 0.3,
        max_tokens: 1000
      });
      
      const responseMessage = completion.choices[0].message;
      
      // Check if the model requested to use a tool and we have an executeAction function
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0 && executeAction) {
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
      console.error('Error creating chat completion with MCP context:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
  
  /**
   * Process a document using MCP context
   */
  async processDocumentWithMCP(
    documentUrl: string,
    documentType: string,
    executeAction?: <T extends MCPActionType>(
      actionType: T,
      inputs: MCPActionInputs[T]
    ) => Promise<MCPActionOutputs[T]>
  ): Promise<any> {
    if (!executeAction) {
      throw new Error('executeAction function is required for document processing');
    }
    
    // Use the EXTRACT_DATA_FROM_DOCUMENT action
    return executeAction(MCPActionType.EXTRACT_DATA_FROM_DOCUMENT, {
      documentUrl,
      documentType: documentType as any,
      extractionHints: ['carbon', 'emissions', 'energy']
    });
  }
}

// Create and export a singleton instance
export const mcpOpenAI = new MCPOpenAIClient();

export default openai; 