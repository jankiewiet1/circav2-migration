import { openai, isConfigured } from '@/integrations/openai/client';
import { AIDataExtractionResponse, DataEntry } from '@/types/dataEntry';

interface AssistantResponse {
  document_analysis: {
    document_type: 'fuel_receipt' | 'utility_bill' | 'invoice' | 'travel_expense' | 'other';
    confidence: number;
    processing_notes: string;
    quality_flags: string[];
  };
  carbon_entries: Array<{
    date: string;
    activity_description: string;
    quantity: number;
    unit: string;
    ghg_category: 'Scope 1' | 'Scope 2' | 'Scope 3';
    supplier_vendor?: string;
    cost?: number;
    currency?: string;
    notes?: string;
    confidence: number;
    validation_flags: string[];
  }>;
  summary: {
    total_entries: number;
    scope_1_entries: number;
    scope_2_entries: number;
    scope_3_entries: number;
    average_confidence: number;
    requires_review: boolean;
    review_reasons: string[];
  };
}

export class OpenAIAssistantService {
  private assistantId: string;
  private threadId: string | null = null;

  constructor(assistantId: string) {
    this.assistantId = assistantId;
  }

  /**
   * Process a file using the OpenAI Assistant
   */
  async processFile(fileUrl: string, fileName: string): Promise<AIDataExtractionResponse> {
    if (!isConfigured) {
      throw new Error('OpenAI is not configured');
    }

    try {
      console.log('=== OPENAI ASSISTANT PROCESSING ===');
      console.log(`Processing file: ${fileName}`);
      console.log(`Assistant ID: ${this.assistantId}`);

      // Step 1: Upload file to OpenAI
      const fileResponse = await fetch(fileUrl);
      const fileBlob = await fileResponse.blob();
      
      const file = await openai.files.create({
        file: new File([fileBlob], fileName, { type: fileBlob.type }),
        purpose: 'assistants'
      });

      console.log(`File uploaded to OpenAI: ${file.id}`);

      // Step 2: Create or use existing thread
      if (!this.threadId) {
        const thread = await openai.beta.threads.create();
        this.threadId = thread.id;
        console.log(`Created new thread: ${this.threadId}`);
      }

      // Step 3: Add message with file attachment
      await openai.beta.threads.messages.create(this.threadId, {
        role: 'user',
        content: `Please analyze this ${fileName} file and extract all carbon accounting data. Follow the structured JSON format and ensure GHG Protocol compliance.`,
        attachments: [
          {
            file_id: file.id,
            tools: [{ type: 'file_search' }, { type: 'code_interpreter' }]
          }
        ]
      });

      // Step 4: Run the assistant
      const run = await openai.beta.threads.runs.create(this.threadId, {
        assistant_id: this.assistantId,
        instructions: `Analyze the uploaded file and extract carbon accounting data. Pay special attention to:
        - Fuel receipts: Extract each individual fuel purchase
        - Utility bills: Extract consumption amounts, not cumulative readings
        - Invoices: Look for energy, fuel, or travel-related expenses
        - Ensure proper GHG scope classification
        - Provide confidence scores for all extracted data
        - Flag any uncertain or ambiguous entries for review`
      });

      console.log(`Started assistant run: ${run.id}`);

      // Step 5: Wait for completion
      const result = await this.waitForCompletion(this.threadId, run.id);

      // Step 6: Parse and transform response
      const extractionResponse = this.transformAssistantResponse(result, fileName);

      // Step 7: Cleanup uploaded file
      try {
        await openai.files.del(file.id);
        console.log(`Cleaned up uploaded file: ${file.id}`);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      return extractionResponse;

    } catch (error) {
      console.error('OpenAI Assistant processing failed:', error);
      throw new Error(`Assistant processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process text content using the assistant
   */
  async processTextContent(content: string, documentType: string): Promise<AIDataExtractionResponse> {
    if (!isConfigured) {
      throw new Error('OpenAI is not configured');
    }

    try {
      console.log('=== OPENAI ASSISTANT TEXT PROCESSING ===');
      console.log(`Processing ${documentType} content (${content.length} chars)`);

      // Create or use existing thread
      if (!this.threadId) {
        const thread = await openai.beta.threads.create();
        this.threadId = thread.id;
      }

      // Add message with text content
      await openai.beta.threads.messages.create(this.threadId, {
        role: 'user',
        content: `Please analyze this ${documentType} content and extract carbon accounting data:

${content}

Follow the structured JSON format and ensure GHG Protocol compliance.`
      });

      // Run the assistant
      const run = await openai.beta.threads.runs.create(this.threadId, {
        assistant_id: this.assistantId
      });

      // Wait for completion and transform response
      const result = await this.waitForCompletion(this.threadId, run.id);
      return this.transformAssistantResponse(result, `${documentType}_content`);

    } catch (error) {
      console.error('OpenAI Assistant text processing failed:', error);
      throw new Error(`Assistant text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for assistant run completion
   */
  private async waitForCompletion(threadId: string, runId: string): Promise<AssistantResponse> {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);
      
      console.log(`Run status: ${run.status} (attempt ${attempts + 1}/${maxAttempts})`);

      if (run.status === 'completed') {
        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(threadId);
        const assistantMessage = messages.data.find(msg => 
          msg.role === 'assistant' && 
          msg.run_id === runId
        );

        if (!assistantMessage) {
          throw new Error('No assistant response found');
        }

        const content = assistantMessage.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from assistant');
        }

        try {
          const parsed = JSON.parse(content.text.value);
          return parsed as AssistantResponse;
        } catch (parseError) {
          console.error('Failed to parse assistant response:', content.text.value);
          throw new Error('Invalid JSON response from assistant');
        }
      }

      if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Assistant run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
      }

      if (run.status === 'requires_action') {
        // Handle function calls if needed
        await this.handleRequiredActions(threadId, runId, run);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      attempts++;
    }

    throw new Error('Assistant run timed out');
  }

  /**
   * Handle function calls from the assistant
   */
  private async handleRequiredActions(threadId: string, runId: string, run: any): Promise<void> {
    if (!run.required_action?.submit_tool_outputs) {
      return;
    }

    const toolOutputs = [];

    for (const toolCall of run.required_action.submit_tool_outputs.tool_calls) {
      console.log(`Handling function call: ${toolCall.function.name}`);
      
      try {
        const output = await this.executeFunction(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );
        
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(output)
        });
      } catch (error) {
        console.error(`Function call failed: ${toolCall.function.name}`, error);
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({ error: error instanceof Error ? error.message : 'Function execution failed' })
        });
      }
    }

    // Submit tool outputs
    await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
      tool_outputs: toolOutputs
    });
  }

  /**
   * Execute custom functions
   */
  private async executeFunction(functionName: string, args: any): Promise<any> {
    switch (functionName) {
      case 'validate_emission_factor':
        return this.validateEmissionFactor(args);
      
      case 'classify_ghg_scope':
        return this.classifyGHGScope(args);
      
      case 'normalize_units':
        return this.normalizeUnits(args);
      
      case 'parse_date_formats':
        return this.parseDateFormats(args);
      
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Validate emission factors
   */
  private validateEmissionFactor(args: any): any {
    // Implement emission factor validation logic
    // This could connect to external databases like EPA, DEFRA, etc.
    return {
      valid: true,
      suggested_factor: null,
      notes: 'Validation logic not implemented yet'
    };
  }

  /**
   * Classify GHG scope
   */
  private classifyGHGScope(args: any): any {
    const { activity_description } = args;
    const lower = activity_description.toLowerCase();

    if (lower.includes('fuel') || lower.includes('gasoline') || lower.includes('diesel') || lower.includes('natural gas')) {
      return { scope: 'Scope 1', reasoning: 'Direct fuel combustion' };
    }
    
    if (lower.includes('electricity') || lower.includes('kwh') || lower.includes('power')) {
      return { scope: 'Scope 2', reasoning: 'Purchased electricity' };
    }
    
    if (lower.includes('travel') || lower.includes('flight') || lower.includes('hotel')) {
      return { scope: 'Scope 3', reasoning: 'Business travel' };
    }

    return { scope: 'Scope 3', reasoning: 'Default classification for indirect emissions' };
  }

  /**
   * Normalize units
   */
  private normalizeUnits(args: any): any {
    const { value, from_unit, to_unit } = args;
    
    // Implement unit conversion logic
    const conversions: { [key: string]: { [key: string]: number } } = {
      'gallons': { 'liters': 3.78541 },
      'miles': { 'km': 1.60934 },
      'pounds': { 'kg': 0.453592 },
      'therms': { 'kWh': 29.3001 }
    };

    const conversionFactor = conversions[from_unit.toLowerCase()]?.[to_unit.toLowerCase()];
    
    if (conversionFactor) {
      return {
        converted_value: value * conversionFactor,
        conversion_factor: conversionFactor,
        success: true
      };
    }

    return {
      converted_value: value,
      conversion_factor: 1,
      success: false,
      note: `No conversion available from ${from_unit} to ${to_unit}`
    };
  }

  /**
   * Parse date formats
   */
  private parseDateFormats(args: any): any {
    const { date_string, region_hint } = args;
    
    try {
      // Try various date formats
      const formats = [
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,  // DD-MM-YYYY or MM-DD-YYYY
        /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,  // YYYY-MM-DD
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/         // DD.MM.YYYY
      ];

      for (const format of formats) {
        const match = date_string.match(format);
        if (match) {
          let day, month, year;
          
          if (region_hint === 'US') {
            [, month, day, year] = match;
          } else {
            [, day, month, year] = match;
          }
          
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (!isNaN(date.getTime())) {
            return {
              iso_date: date.toISOString().split('T')[0],
              success: true,
              format_detected: format.source
            };
          }
        }
      }

      return {
        iso_date: new Date().toISOString().split('T')[0],
        success: false,
        note: 'Could not parse date, using current date as fallback'
      };
    } catch (error) {
      return {
        iso_date: new Date().toISOString().split('T')[0],
        success: false,
        error: error instanceof Error ? error.message : 'Date parsing failed'
      };
    }
  }

  /**
   * Transform assistant response to our format
   */
  private transformAssistantResponse(assistantResponse: AssistantResponse, fileName: string): AIDataExtractionResponse {
    const mappings = assistantResponse.carbon_entries.map((entry, index) => ({
      original_header: `entry_${index}`,
      mapped_field: 'activity_description' as keyof DataEntry,
      confidence: entry.confidence,
      suggestions: [entry.activity_description]
    }));

    const extractedData = assistantResponse.carbon_entries.map(entry => ({
      date: entry.date,
      activity_description: entry.activity_description,
      quantity: entry.quantity,
      unit: entry.unit,
      ghg_category: entry.ghg_category,
      supplier_vendor: entry.supplier_vendor,
      cost: entry.cost,
      currency: entry.currency,
      notes: entry.notes,
      source_type: 'API' as const,
      ai_processed: true,
      ai_confidence: entry.confidence,
      status: 'processed' as const
    }));

    return {
      success: true,
      message: `Successfully processed ${fileName} using OpenAI Assistant`,
      confidence_score: assistantResponse.summary.average_confidence,
      mappings,
      extracted_data: extractedData,
      unmapped_fields: assistantResponse.document_analysis.quality_flags,
      ambiguous_fields: mappings.filter(m => m.confidence < 0.8),
      requires_user_review: assistantResponse.summary.requires_review
    };
  }

  /**
   * Reset thread for new conversation
   */
  async resetThread(): Promise<void> {
    if (this.threadId) {
      try {
        await openai.beta.threads.del(this.threadId);
        console.log(`Deleted thread: ${this.threadId}`);
      } catch (error) {
        console.warn('Failed to delete thread:', error);
      }
    }
    this.threadId = null;
  }

  /**
   * Get thread messages for debugging
   */
  async getThreadMessages(): Promise<any[]> {
    if (!this.threadId) {
      return [];
    }

    try {
      const messages = await openai.beta.threads.messages.list(this.threadId);
      return messages.data;
    } catch (error) {
      console.error('Failed to get thread messages:', error);
      return [];
    }
  }
} 