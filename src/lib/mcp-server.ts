/**
 * MCP Server Provider
 * 
 * This module implements the Model Context Protocol server
 * to expose carbon accounting resources and tools to AI assistants.
 */

import { MCPContext, MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';

/**
 * Interface for registering MCP actions
 */
interface MCPAction<T extends MCPActionType> {
  type: T;
  description: string;
  execute: (input: MCPActionInputs[T]) => Promise<MCPActionOutputs[T]>;
  requiredPermissions?: string[];
}

/**
 * MCP Server Provider class to handle MCP context and actions
 */
export class MCPServerProvider {
  private actions: Map<MCPActionType, MCPAction<any>> = new Map();
  private contextUrl = '/api/mcp-context';
  
  /**
   * Register an MCP action with the server
   */
  public registerAction<T extends MCPActionType>(action: MCPAction<T>): void {
    this.actions.set(action.type, action);
    console.info(`Registered MCP action: ${action.type}`);
  }
  
  /**
   * Get the registered MCP actions as function schema
   */
  public getFunctionDefinitions(): any[] {
    return Array.from(this.actions.values()).map(action => {
      return {
        name: action.type,
        description: action.description,
        // Function parameters would be defined here based on input schema
        // This is a simplified example
        parameters: {
          type: 'object',
          properties: this.getActionParameters(action.type),
          required: this.getRequiredParameters(action.type)
        }
      };
    });
  }
  
  /**
   * Get the action parameters schema for a specific action type
   */
  private getActionParameters(actionType: MCPActionType): Record<string, any> {
    // Note: In a complete implementation, these would be generated from TypeScript types
    // This is a simplified example for demonstration
    switch (actionType) {
      case MCPActionType.CALCULATE_CARBON_FOOTPRINT:
        return {
          dataEntryIds: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of data entry IDs to calculate emissions for'
          },
          includeIndirect: {
            type: 'boolean',
            description: 'Whether to include indirect emissions in the calculation'
          },
          emissionFactorSource: {
            type: 'string',
            description: 'Preferred source for emission factors'
          }
        };
      case MCPActionType.NORMALIZE_DATA_UNITS:
        return {
          sourceUnit: {
            type: 'string',
            description: 'Source unit to convert from'
          },
          targetUnit: {
            type: 'string',
            description: 'Target unit to convert to'
          },
          value: {
            type: 'number',
            description: 'Value to convert'
          }
        };
      // Add cases for other actions
      default:
        return {};
    }
  }
  
  /**
   * Get the required parameters for a specific action type
   */
  private getRequiredParameters(actionType: MCPActionType): string[] {
    switch (actionType) {
      case MCPActionType.CALCULATE_CARBON_FOOTPRINT:
        return ['dataEntryIds'];
      case MCPActionType.NORMALIZE_DATA_UNITS:
        return ['sourceUnit', 'targetUnit', 'value'];
      // Add cases for other actions
      default:
        return [];
    }
  }
  
  /**
   * Execute an MCP action
   */
  public async executeAction<T extends MCPActionType>(
    actionType: T,
    inputs: MCPActionInputs[T]
  ): Promise<MCPActionOutputs[T]> {
    const action = this.actions.get(actionType);
    
    if (!action) {
      throw new Error(`MCP action not found: ${actionType}`);
    }
    
    try {
      return await action.execute(inputs);
    } catch (error) {
      console.error(`Error executing MCP action ${actionType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the MCP context for a company
   */
  public async getMCPContext(companyId: string): Promise<MCPContext> {
    try {
      const response = await fetch(`${this.contextUrl}?companyId=${companyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for authentication
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch MCP context: ${response.statusText}`);
      }
      
      return await response.json() as MCPContext;
    } catch (error) {
      console.error('Error fetching MCP context:', error);
      throw error;
    }
  }
  
  /**
   * Initialize the MCP server with all available actions
   */
  public async initialize(): Promise<void> {
    // Register all MCP actions
    this.registerCarbonFootprintAction();
    this.registerNormalizeUnitsAction();
    this.registerExtractDataAction();
    this.registerGenerateReportAction();
    this.registerValidateDataAction();
    
    console.info('MCP server initialized with actions:', Array.from(this.actions.keys()));
  }
  
  /**
   * Register the calculateCarbonFootprint action
   */
  private registerCarbonFootprintAction(): void {
    this.registerAction({
      type: MCPActionType.CALCULATE_CARBON_FOOTPRINT,
      description: 'Calculate carbon footprint for specified data entries',
      execute: async (input: MCPActionInputs[MCPActionType.CALCULATE_CARBON_FOOTPRINT]) => {
        const response = await fetch('/api/mcp-actions/calculate-carbon-footprint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to calculate carbon footprint: ${response.statusText}`);
        }
        
        return await response.json() as MCPActionOutputs[MCPActionType.CALCULATE_CARBON_FOOTPRINT];
      },
      requiredPermissions: ['view:emissions']
    });
  }
  
  /**
   * Register the normalizeDataUnits action
   */
  private registerNormalizeUnitsAction(): void {
    this.registerAction({
      type: MCPActionType.NORMALIZE_DATA_UNITS,
      description: 'Convert values between different units of measurement',
      execute: async (input: MCPActionInputs[MCPActionType.NORMALIZE_DATA_UNITS]) => {
        const response = await fetch('/api/mcp-actions/normalize-data-units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to normalize units: ${response.statusText}`);
        }
        
        return await response.json() as MCPActionOutputs[MCPActionType.NORMALIZE_DATA_UNITS];
      }
    });
  }
  
  /**
   * Register the extractDataFromDocument action
   */
  private registerExtractDataAction(): void {
    this.registerAction({
      type: MCPActionType.EXTRACT_DATA_FROM_DOCUMENT,
      description: 'Extract carbon data from uploaded documents',
      execute: async (input: MCPActionInputs[MCPActionType.EXTRACT_DATA_FROM_DOCUMENT]) => {
        const response = await fetch('/api/mcp-actions/extract-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to extract data: ${response.statusText}`);
        }
        
        return await response.json() as MCPActionOutputs[MCPActionType.EXTRACT_DATA_FROM_DOCUMENT];
      },
      requiredPermissions: ['create:data_entry']
    });
  }
  
  /**
   * Register the generateComplianceReport action
   */
  private registerGenerateReportAction(): void {
    this.registerAction({
      type: MCPActionType.GENERATE_COMPLIANCE_REPORT,
      description: 'Generate a compliance report for the specified period',
      execute: async (input: MCPActionInputs[MCPActionType.GENERATE_COMPLIANCE_REPORT]) => {
        const response = await fetch('/api/mcp-actions/generate-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate report: ${response.statusText}`);
        }
        
        return await response.json() as MCPActionOutputs[MCPActionType.GENERATE_COMPLIANCE_REPORT];
      },
      requiredPermissions: ['view:reports']
    });
  }
  
  /**
   * Register the validateDataEntry action
   */
  private registerValidateDataAction(): void {
    this.registerAction({
      type: MCPActionType.VALIDATE_DATA_ENTRY,
      description: 'Validate data entry fields for correctness',
      execute: async (input: MCPActionInputs[MCPActionType.VALIDATE_DATA_ENTRY]) => {
        const response = await fetch('/api/mcp-actions/validate-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to validate data: ${response.statusText}`);
        }
        
        return await response.json() as MCPActionOutputs[MCPActionType.VALIDATE_DATA_ENTRY];
      }
    });
  }
}

// Create and export a singleton instance
export const mcpServer = new MCPServerProvider();

// Initialize the server
mcpServer.initialize().catch(error => {
  console.error('Failed to initialize MCP server:', error);
});

export default mcpServer; 