import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/integrations/supabase/client';

const openai = new OpenAI();

export interface BatchRequest {
  custom_id: string;
  method: 'POST';
  url: string;
  body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
  };
}

export interface BatchResponse {
  id: string;
  custom_id: string;
  response: {
    status_code: number;
    request_id: string;
    body: {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        message: { role: string; content: string };
        logprobs: null;
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      system_fingerprint: string;
    };
  };
  error: null | {
    code: string;
    message: string;
  };
}

export class OpenAIBatchService {
  private static instance: OpenAIBatchService;
  private tempDir: string;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public static getInstance(): OpenAIBatchService {
    if (!OpenAIBatchService.instance) {
      OpenAIBatchService.instance = new OpenAIBatchService();
    }
    return OpenAIBatchService.instance;
  }

  /**
   * Create a batch file from an array of requests
   */
  private async createBatchFile(requests: BatchRequest[]): Promise<string> {
    const batchId = `batch_${Date.now()}`;
    const filePath = path.join(this.tempDir, `${batchId}.jsonl`);
    
    const fileContent = requests
      .map(request => JSON.stringify(request))
      .join('\n');
    
    fs.writeFileSync(filePath, fileContent);
    return filePath;
  }

  /**
   * Upload a batch file to OpenAI
   */
  private async uploadBatchFile(filePath: string): Promise<string> {
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'batch'
    });

    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    return file.id;
  }

  /**
   * Create and submit a batch job
   */
  public async createBatchJob(requests: BatchRequest[]): Promise<string> {
    try {
      // Create and upload the batch file
      const filePath = await this.createBatchFile(requests);
      const fileId = await this.uploadBatchFile(filePath);

      // Create the batch job
      const batch = await openai.batches.create({
        input_file_id: fileId,
        endpoint: '/v1/chat/completions',
        completion_window: '24h'
      });

      return batch.id;
    } catch (error) {
      console.error('Error creating batch job:', error);
      throw error;
    }
  }

  /**
   * Check the status of a batch job
   */
  public async getBatchStatus(batchId: string): Promise<{
    status: string;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const batch = await openai.batches.retrieve(batchId);
      
      return {
        status: batch.status,
        completed: batch.request_counts.completed,
        failed: batch.request_counts.failed,
        total: batch.request_counts.total
      };
    } catch (error) {
      console.error('Error getting batch status:', error);
      throw error;
    }
  }

  /**
   * Get the results of a completed batch job
   */
  public async getBatchResults(batchId: string): Promise<BatchResponse[]> {
    try {
      const batch = await openai.batches.retrieve(batchId);
      
      if (batch.status !== 'completed') {
        throw new Error(`Batch is not completed. Current status: ${batch.status}`);
      }

      if (!batch.output_file_id) {
        throw new Error('No output file available for this batch');
      }

      const fileResponse = await openai.files.content(batch.output_file_id);
      const fileContents = await fileResponse.text();
      
      return fileContents
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error getting batch results:', error);
      throw error;
    }
  }

  /**
   * Cancel a batch job
   */
  public async cancelBatchJob(batchId: string): Promise<void> {
    try {
      await openai.batches.cancel(batchId);
    } catch (error) {
      console.error('Error cancelling batch job:', error);
      throw error;
    }
  }

  /**
   * Get optimal batch size based on total number of entries
   * @param totalEntries - Total number of entries to process
   * @returns Optimal batch size
   */
  private getOptimalBatchSize(totalEntries: number): number {
    if (totalEntries >= 50) return 50;
    if (totalEntries >= 40) return 40;
    if (totalEntries >= 30) return 30;
    if (totalEntries >= 20) return 20;
    if (totalEntries >= 10) return 10;
    return totalEntries; // For very small numbers, process all at once
  }

  /**
   * Process emission entries using OpenAI Batch API
   */
  public async processEmissionEntries(
    companyId: string,
    entries: any[]
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    details: Array<{ entryId: string; success: boolean; message?: string }>;
  }> {
    try {
      // Calculate optimal batch size
      const optimalBatchSize = this.getOptimalBatchSize(entries.length);

      // Split entries into optimal batches
      const batches: any[][] = [];
      for (let i = 0; i < entries.length; i += optimalBatchSize) {
        batches.push(entries.slice(i, i + optimalBatchSize));
      }

      const allResults = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        details: [] as Array<{ entryId: string; success: boolean; message?: string }>
      };

      // Process each batch
      for (const batch of batches) {
        // Prepare batch requests
        const requests: BatchRequest[] = batch.map(entry => ({
          custom_id: entry.id,
          method: 'POST',
          url: '/v1/chat/completions',
          body: {
            model: 'gpt-3.5-turbo-0125',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant that helps calculate carbon emissions. Always respond with the emissions value in kg CO2e.'
              },
              {
                role: 'user',
                content: `Calculate emissions for the following entry:
                  Category: ${entry.category}
                  Quantity: ${entry.quantity}
                  Unit: ${entry.unit}
                  Region: ${entry.region || 'global'}
                  Mode: ${entry.mode || 'N/A'}`
              }
            ],
            max_tokens: 1000
          }
        }));

        // Create and submit batch job
        const batchId = await this.createBatchJob(requests);

        // Wait for completion (with timeout)
        const maxWaitTime = 24 * 60 * 60 * 1000; // 24 hours
        const startTime = Date.now();
        let status;

        while (Date.now() - startTime < maxWaitTime) {
          status = await this.getBatchStatus(batchId);
          
          if (status.status === 'completed' || status.status === 'failed') {
            break;
          }

          // Wait 5 minutes before checking again
          await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
        }

        if (status.status !== 'completed') {
          throw new Error(`Batch job did not complete within time limit. Final status: ${status.status}`);
        }

        // Get results
        const results = await this.getBatchResults(batchId);
        
        // Process results
        const processedResults = await Promise.all(
          results.map(async (result) => {
            try {
              if (result.error) {
                return {
                  entryId: result.custom_id,
                  success: false,
                  message: result.error.message
                };
              }

              // Parse the AI response and extract emissions data
              const content = result.response.body.choices[0].message.content;
              const emissionsMatch = content.match(/emissions:\s*([\d.]+)/i);
              const emissions = emissionsMatch ? parseFloat(emissionsMatch[1]) : null;

              if (!emissions) {
                return {
                  entryId: result.custom_id,
                  success: false,
                  message: 'Could not extract emissions value from AI response'
                };
              }

              // Store the result
              await supabase
                .from('emission_calc_openai')
                .insert({
                  company_id: companyId,
                  entry_id: parseInt(result.custom_id),
                  total_emissions: emissions,
                  source: 'OPENAI_BATCH',
                  calculated_at: new Date().toISOString()
                });

              // Update entry status
              await supabase
                .from('emission_entries')
                .update({ match_status: 'matched' })
                .eq('id', result.custom_id);

              return {
                entryId: result.custom_id,
                success: true
              };
            } catch (error) {
              return {
                entryId: result.custom_id,
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
              };
            }
          })
        );

        // Update overall results
        allResults.processed += processedResults.length;
        allResults.succeeded += processedResults.filter(r => r.success).length;
        allResults.failed += processedResults.filter(r => !r.success).length;
        allResults.details.push(...processedResults);
      }

      return allResults;
    } catch (error) {
      console.error('Error processing emission entries:', error);
      throw error;
    }
  }
} 