import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIDataProcessingService } from '@/services/aiDataProcessingService';
import { DataEntryService } from '@/services/dataEntryService';
import { AIFunctions } from '@/integrations/supabase/ai-functions';
import { supabase } from '@/integrations/supabase/client';
import { openai } from '@/integrations/openai/client';

describe('AI Data Processing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Processing Flow', () => {
    it('should process a CSV file through the complete pipeline', async () => {
      // 1. Create test CSV file
      const csvContent = `Date,Activity Description,Quantity,Unit,Cost,Currency,GHG Category
2023-01-01,Electricity Usage,1000,kWh,150,EUR,Scope 2
2023-01-02,Natural Gas,500,m3,200,EUR,Scope 1`;
      
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      // 2. Upload file
      const { data: uploadData, error: uploadError } = await DataEntryService.uploadFile('test-company', csvFile);
      expect(uploadError).toBeNull();
      expect(uploadData).toBeDefined();
      
      // 3. Extract data
      const extractionResult = await AIDataProcessingService.extractFromCsv(csvFile);
      expect(extractionResult.success).toBe(true);
      expect(extractionResult.extracted_data.length).toBe(2);
      
      // 4. Transform and save data
      const transformedData = AIDataProcessingService.transformExtractedData(
        extractionResult.extracted_data,
        extractionResult.mappings,
        'test-company'
      );
      
      const { data: savedData, error: saveError } = await DataEntryService.createDataEntries(transformedData);
      expect(saveError).toBeNull();
      expect(savedData).toBeDefined();
    });

    it('should process a PDF file through the complete pipeline', async () => {
      // 1. Mock PDF file upload
      const mockPdfUrl = 'https://example.com/test-invoice.pdf';
      vi.spyOn(DataEntryService, 'uploadFile').mockResolvedValueOnce({
        data: { preview_url: mockPdfUrl },
        error: null
      });
      
      // 2. Mock PDF extraction
      const mockExtractionResult = {
        success: true,
        message: 'PDF processing completed',
        data: JSON.stringify({
          date: '2023-01-01',
          activity_description: 'Office Electricity',
          quantity: 1000,
          unit: 'kWh',
          ghg_category: 'Scope 2'
        }),
        confidence_score: 0.85
      };
      
      vi.spyOn(AIFunctions, 'extractFromPdf').mockResolvedValueOnce(mockExtractionResult);
      
      // 3. Process PDF
      const result = await AIDataProcessingService.extractFromPdf(mockPdfUrl);
      expect(result.success).toBe(true);
      expect(result.extracted_data.length).toBeGreaterThan(0);
      
      // 4. Save processed data
      const { data: savedData, error: saveError } = await DataEntryService.createDataEntries(
        result.extracted_data.map(entry => ({
          ...entry,
          company_id: 'test-company',
          status: 'processed',
          ai_processed: true
        }))
      );
      
      expect(saveError).toBeNull();
      expect(savedData).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should handle and recover from API failures', async () => {
      // 1. Mock API failure
      vi.spyOn(openai.chat.completions, 'create').mockRejectedValueOnce(new Error('API Error'));
      
      // 2. Attempt processing
      const csvContent = `Date,Activity,Value
2023-01-01,Electricity,1000`;
      
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await AIDataProcessingService.extractFromCsv(csvFile);
      
      // 3. Verify fallback behavior
      expect(result.success).toBe(true);
      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.confidence_score).toBeLessThan(0.7);
    });

    it('should handle database errors gracefully', async () => {
      // 1. Mock database error
      vi.spyOn(supabase.from, 'data_entry').mockReturnValueOnce({
        insert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: null,
            error: new Error('Database error')
          })
        })
      } as any);
      
      // 2. Attempt to save data
      const { data, error } = await DataEntryService.createDataEntries([
        {
          company_id: 'test-company',
          date: '2023-01-01',
          source_type: 'manual',
          activity_description: 'Test Activity',
          quantity: 100,
          unit: 'kWh',
          ghg_category: 'Scope 2',
          status: 'raw'
        }
      ]);
      
      // 3. Verify error handling
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should validate and correct data during processing', async () => {
      // 1. Create test data with validation issues
      const csvContent = `Date,Activity,Value,Unit
Invalid Date,Electricity,Not a Number,kWh`;
      
      const csvFile = new File([csvContent], 'validation-test.csv', { type: 'text/csv' });
      
      // 2. Process data
      const result = await AIDataProcessingService.extractFromCsv(csvFile);
      
      // 3. Verify validation
      expect(result.requires_user_review).toBe(true);
      expect(result.extracted_data[0].date).toBe(new Date().toISOString().split('T')[0]); // Should use default date
      expect(result.extracted_data[0].quantity).toBe(0); // Should handle invalid number
    });
  });
}); 