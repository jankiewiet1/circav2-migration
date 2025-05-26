/**
 * Model Context Protocol (MCP) Types
 * 
 * This file contains the TypeScript interfaces for MCP implementation
 * in the carbon accounting platform.
 */

import { DataEntry, DataEntrySourceType, DataEntryStatus, GHGCategory } from './dataEntry';
import { EmissionSource, Scope, EmissionData, EmissionSummary } from './emissions';

/**
 * Main interface for the MCP context in carbon accounting
 * Following the Model Context Protocol schema
 */
export interface MCPContext {
  // Version info
  version: string;
  timestamp: string;
  
  // Company/Organization context 
  company: {
    id: string;
    name: string;
    industry?: string;
    size?: string;
    region?: string;
    reportingStandards?: string[];
    reportingPeriod?: {
      start: string;
      end: string;
    };
  };
  
  // Carbon accounting data
  carbonData: {
    // Current data entries
    entries: DataEntry[];
    
    // Summary statistics
    summary: {
      totalEmissions: EmissionSummary;
      breakdowns: {
        bySource: Record<EmissionSource, number>;
        byScope: Record<number, number>;
        byPeriod: Record<string, number>;
      };
      unit: string;
    };
    
    // Calculation settings and factors
    calculationSettings: {
      emissionFactors: EmissionFactor[];
      defaultUnit: string;
      precisionDecimals: number;
    };
    
    // Processing status
    status: {
      lastUpdated: string;
      pendingEntries: number;
      validatedEntries: number;
      errorEntries: number;
      totalEntries: number;
    };
  };
  
  // Database schema information
  schema: {
    dataEntry: Record<keyof DataEntry, SchemaField>;
    emissions: Record<keyof EmissionData, SchemaField>;
    // Add other relevant schema objects
  };
  
  // User context
  user: {
    id: string;
    role: string;
    permissions: string[];
  };
  
  // Optional custom contexts
  customContext?: Record<string, any>;
}

/**
 * Emission factor interface for calculations
 */
export interface EmissionFactor {
  id: string;
  source: string;
  category: string;
  scope: Scope;
  value: number;
  unit: string;
  year: number;
  region: string;
  description?: string;
  uncertainty?: number;
}

/**
 * Schema field description for MCP context
 */
export interface SchemaField {
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  format?: string;
  example?: any;
}

/**
 * MCP Action types for carbon accounting
 */
export enum MCPActionType {
  CALCULATE_CARBON_FOOTPRINT = 'calculateCarbonFootprint',
  NORMALIZE_DATA_UNITS = 'normalizeDataUnits',
  VALIDATE_DATA_ENTRY = 'validateDataEntry',
  GENERATE_COMPLIANCE_REPORT = 'generateComplianceReport',
  EXTRACT_DATA_FROM_DOCUMENT = 'extractDataFromDocument',
  SEND_COMPLIANCE_EMAIL = 'sendComplianceEmail',
  FETCH_EMISSION_FACTORS = 'fetchEmissionFactors',
  UPDATE_DATA_ENTRY = 'updateDataEntry',
  CREATE_DATA_ENTRY = 'createDataEntry',
  DELETE_DATA_ENTRY = 'deleteDataEntry'
}

/**
 * MCP Action input parameters
 */
export interface MCPActionInputs {
  [MCPActionType.CALCULATE_CARBON_FOOTPRINT]: {
    dataEntryIds: string[];
    includeIndirect?: boolean;
    emissionFactorSource?: string;
  };
  [MCPActionType.NORMALIZE_DATA_UNITS]: {
    sourceUnit: string;
    targetUnit: string;
    value: number;
  };
  [MCPActionType.VALIDATE_DATA_ENTRY]: {
    dataEntryId: string;
    validation: {
      field: keyof DataEntry;
      value: any;
      error?: string;
    }[];
  };
  [MCPActionType.GENERATE_COMPLIANCE_REPORT]: {
    reportType: 'GHG' | 'ESG' | 'CDP' | 'TCFD' | 'EU_CSRD';
    period: {
      start: string;
      end: string;
    };
    format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
    includeSourceData?: boolean;
  };
  [MCPActionType.EXTRACT_DATA_FROM_DOCUMENT]: {
    documentUrl: string;
    documentType: 'PDF' | 'EXCEL' | 'CSV' | 'IMAGE';
    extractionHints?: string[];
  };
  [MCPActionType.SEND_COMPLIANCE_EMAIL]: {
    recipient: string;
    subject?: string;
    reportIds?: string[];
    messageTone?: 'formal' | 'casual';
    attachmentIds?: string[];
  };
  [MCPActionType.FETCH_EMISSION_FACTORS]: {
    category: string;
    region?: string;
    year?: number;
    source?: string;
  };
  [MCPActionType.UPDATE_DATA_ENTRY]: {
    id: string;
    data: Partial<DataEntry>;
  };
  [MCPActionType.CREATE_DATA_ENTRY]: {
    data: Omit<DataEntry, 'id' | 'created_at' | 'updated_at'>;
  };
  [MCPActionType.DELETE_DATA_ENTRY]: {
    id: string;
  };
}

/**
 * MCP Action output parameters
 */
export interface MCPActionOutputs {
  [MCPActionType.CALCULATE_CARBON_FOOTPRINT]: {
    totalEmissions: number;
    unit: string;
    breakdown: {
      scope1: number;
      scope2: number;
      scope3: number;
    };
    calculationDetails: Array<{
      dataEntryId: string;
      emissions: number;
      emissionFactor: EmissionFactor;
    }>;
  };
  [MCPActionType.NORMALIZE_DATA_UNITS]: {
    originalValue: number;
    originalUnit: string;
    convertedValue: number;
    convertedUnit: string;
    conversionFactor: number;
  };
  [MCPActionType.VALIDATE_DATA_ENTRY]: {
    valid: boolean;
    dataEntryId: string;
    errors: Array<{
      field: string;
      message: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
    }>;
  };
  [MCPActionType.GENERATE_COMPLIANCE_REPORT]: {
    reportId: string;
    reportUrl: string;
    totalEmissions: number;
    reportPeriod: {
      start: string;
      end: string;
    };
    generatedAt: string;
    format: string;
  };
  [MCPActionType.EXTRACT_DATA_FROM_DOCUMENT]: {
    success: boolean;
    extractedEntries: Partial<DataEntry>[];
    confidence: number;
    unmappedFields: string[];
    warnings: string[];
  };
  [MCPActionType.SEND_COMPLIANCE_EMAIL]: {
    messageId: string;
    sentAt: string;
    recipient: string;
    status: 'sent' | 'failed' | 'pending';
    error?: string;
  };
  [MCPActionType.FETCH_EMISSION_FACTORS]: {
    factors: EmissionFactor[];
    source: string;
    lastUpdated: string;
  };
  [MCPActionType.UPDATE_DATA_ENTRY]: {
    success: boolean;
    id: string;
    updatedFields: string[];
  };
  [MCPActionType.CREATE_DATA_ENTRY]: {
    success: boolean;
    id: string;
  };
  [MCPActionType.DELETE_DATA_ENTRY]: {
    success: boolean;
    id: string;
  };
} 