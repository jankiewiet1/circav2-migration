import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIDataProcessingService } from '@/services/aiDataProcessingService';
import { DataEntryService } from '@/services/dataEntryService';
import { ErrorMonitoringService } from '@/services/errorMonitoringService';
import { AISecurityService } from '@/integrations/security/aiSecurityConfig';
import { AIFieldMapping, DataEntry, DataEntryInsert, DataEntrySourceType } from '@/types/dataEntry';
import { openai } from '@/integrations/openai/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: {}, error: null })),
          range: vi.fn(() => ({ data: [], error: null, count: 0 })),
        })),
        in: vi.fn(() => ({
          select: vi.fn(() => ({ data: [], error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ data: [{ id: 'test-id' }], error: null })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ data: {}, error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
        group: vi.fn(() => ({ data: [], error: null })),
        order: vi.fn(() => ({ range: vi.fn(() => ({ data: [], error: null, count: 0 })) })),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => ({ data: { path: 'test-path' }, error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test-url.com' } })),
        })),
      },
    }),
  },
}));

// Mock OpenAI
vi.mock('@/integrations/openai/client', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(() => ({
          choices: [{
            message: {
              content: JSON.stringify({
                mappings: [
                  { original_header: 'Date', mapped_field: 'date', confidence: 0.9 },
                  { original_header: 'Description', mapped_field: 'activity_description', confidence: 0.85 },
                ],
              }),
            },
          }],
        })),
      },
    },
  },
  isConfigured: true,
}));

describe('AI Data Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AIDataProcessingService', () => {
    it('should extract data from CSV files', async () => {
      // Create a mock CSV file
      const csvContent = 'Date,Description,Quantity,Unit\n2023-01-01,Electricity Usage,100,kWh';
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      // Mock FileReader
      const originalFileReader = global.FileReader;
      
      class MockFileReader {
        onload: any;
        
        readAsText() {
          setTimeout(() => {
            this.onload({ target: { result: csvContent } });
          }, 0);
        }
      }
      
      global.FileReader = MockFileReader as any;
      
      // Test extractFromCsv
      const result = await AIDataProcessingService.extractFromCsv(csvFile);
      
      // Restore FileReader
      global.FileReader = originalFileReader;
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.extracted_data.length).toBeGreaterThan(0);
      expect(result.mappings.length).toBeGreaterThan(0);
    });
    
    it('should map headers to data model fields', async () => {
      const headers = ['Date', 'Activity', 'Amount', 'Unit'];
      
      const mappings = await AIDataProcessingService.mapHeadersToDataEntryFields(headers);
      
      expect(mappings.length).toBe(headers.length);
      expect(mappings.some(m => m.mapped_field === 'date')).toBe(true);
      expect(mappings.some(m => m.mapped_field === 'activity_description')).toBe(true);
    });
    
    it('should fall back to basic mapping when AI is not available', async () => {
      // Mock OpenAI as not configured
      const originalIsConfigured = require('@/integrations/openai/client').isConfigured;
      require('@/integrations/openai/client').isConfigured = false;
      
      const headers = ['Date', 'Activity', 'Amount', 'Unit'];
      
      const mappings = await AIDataProcessingService.mapHeadersToDataEntryFields(headers);
      
      // Restore isConfigured
      require('@/integrations/openai/client').isConfigured = originalIsConfigured;
      
      expect(mappings.length).toBe(headers.length);
      expect(mappings.some(m => m.mapped_field === 'date')).toBe(true);
    });
    
    it('should calculate overall confidence correctly', () => {
      const mappings: AIFieldMapping[] = [
        { original_header: 'Date', mapped_field: 'date', confidence: 0.9 },
        { original_header: 'Description', mapped_field: 'activity_description', confidence: 0.7 },
      ];
      
      const confidence = AIDataProcessingService.calculateOverallConfidence(mappings);
      
      expect(confidence).toBe(0.8);
    });

    describe('CSV Processing', () => {
      it('should handle complex CSV files with mixed data types', async () => {
        const csvContent = `Date,Activity Description,Quantity,Unit,Cost,Currency,GHG Category
2023-01-01,Electricity Usage,1000,kWh,150,EUR,Scope 2
2023-01-02,Natural Gas,500,m3,200,EUR,Scope 1`;
        
        const csvFile = new File([csvContent], 'complex.csv', { type: 'text/csv' });
        const result = await AIDataProcessingService.extractFromCsv(csvFile);
        
        expect(result.success).toBe(true);
        expect(result.extracted_data.length).toBe(2);
        expect(result.confidence_score).toBeGreaterThan(0.7);
        expect(result.requires_user_review).toBe(false);
      });

      it('should handle ambiguous field mappings', async () => {
        const csvContent = `Transaction Date,Item,Value,Measurement,Price,Type
2023-01-01,Office Supplies,100,pieces,500,EUR`;
        
        const csvFile = new File([csvContent], 'ambiguous.csv', { type: 'text/csv' });
        const result = await AIDataProcessingService.extractFromCsv(csvFile);
        
        expect(result.ambiguous_fields.length).toBeGreaterThan(0);
        expect(result.requires_user_review).toBe(true);
      });
    });

    describe('PDF Processing', () => {
      it('should extract data from PDF invoices', async () => {
        const mockPdfUrl = 'https://example.com/test-invoice.pdf';
        const result = await AIDataProcessingService.extractFromPdf(mockPdfUrl);
        
        expect(result.success).toBe(true);
        expect(result.extracted_data.length).toBeGreaterThan(0);
        expect(result.requires_user_review).toBe(true);
      });

      it('should handle PDF extraction errors gracefully', async () => {
        const mockPdfUrl = 'https://example.com/invalid.pdf';
        const result = await AIDataProcessingService.extractFromPdf(mockPdfUrl);
        
        expect(result.success).toBe(false);
        expect(result.extracted_data.length).toBe(0);
      });
    });

    describe('Field Mapping', () => {
      it('should correctly map common field variations', async () => {
        const headers = [
          'Transaction Date',
          'Activity Description',
          'Amount',
          'Unit of Measure',
          'Cost in EUR',
          'GHG Scope'
        ];
        
        const mappings = await AIDataProcessingService.mapHeadersToDataEntryFields(headers);
        
        expect(mappings.some(m => m.mapped_field === 'date')).toBe(true);
        expect(mappings.some(m => m.mapped_field === 'activity_description')).toBe(true);
        expect(mappings.some(m => m.mapped_field === 'quantity')).toBe(true);
        expect(mappings.some(m => m.mapped_field === 'unit')).toBe(true);
        expect(mappings.some(m => m.mapped_field === 'cost')).toBe(true);
        expect(mappings.some(m => m.mapped_field === 'ghg_category')).toBe(true);
      });

      it('should provide suggestions for ambiguous mappings', async () => {
        const headers = ['Value', 'Type', 'Category'];
        const mappings = await AIDataProcessingService.mapHeadersToDataEntryFields(headers);
        
        const ambiguousMapping = mappings.find(m => m.confidence < 0.7);
        expect(ambiguousMapping?.suggestions).toBeDefined();
        expect(ambiguousMapping?.suggestions?.length).toBeGreaterThan(0);
      });
    });

    describe('Data Transformation', () => {
      it('should transform raw data with user corrections', async () => {
        const rawData = [
          { 'Transaction Date': '2023-01-01', 'Value': '100', 'Unit': 'kWh' }
        ];
        
        const mappings: AIFieldMapping[] = [
          { original_header: 'Transaction Date', mapped_field: 'date', confidence: 0.9 },
          { original_header: 'Value', mapped_field: 'quantity', confidence: 0.8 },
          { original_header: 'Unit', mapped_field: 'unit', confidence: 0.95 }
        ];
        
        const corrections = [
          { originalHeader: 'Value', correctedField: 'quantity' as keyof DataEntry }
        ];
        
        const correctedMappings = AIDataProcessingService.applyUserCorrections(mappings, corrections);
        const transformedData = AIDataProcessingService.transformExtractedData(
          rawData,
          correctedMappings,
          'test-company'
        );
        
        expect(transformedData[0].quantity).toBe(100);
        expect(transformedData[0].unit).toBe('kWh');
        expect(transformedData[0].date).toBe('2023-01-01');
      });
    });

    describe('Error Handling', () => {
      it('should handle malformed CSV files', async () => {
        const csvContent = `Invalid,CSV,Content
No,Proper,Headers
Just,Raw,Data`;
        
        const csvFile = new File([csvContent], 'malformed.csv', { type: 'text/csv' });
        const result = await AIDataProcessingService.extractFromCsv(csvFile);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('error');
      });

      it('should handle API failures gracefully', async () => {
        // Mock OpenAI API failure
        vi.spyOn(openai.chat.completions, 'create').mockRejectedValueOnce(new Error('API Error'));
        
        const headers = ['Date', 'Activity', 'Value'];
        const mappings = await AIDataProcessingService.mapHeadersToDataEntryFields(headers);
        
        expect(mappings.length).toBe(headers.length);
        expect(mappings[0].confidence).toBeLessThan(0.7); // Should use fallback mapping
      });
    });
  });
  
  describe('DataEntryService', () => {
    it('should create data entries', async () => {
      const entries = [
        {
          company_id: 'test-company',
          date: '2023-01-01',
          source_type: 'csv',
          activity_description: 'Test Activity',
          quantity: 100,
          unit: 'kWh',
          ghg_category: 'Scope 2',
          status: 'raw',
        },
      ];
      
      const result = await DataEntryService.createDataEntries(entries);
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.ids.length).toBe(1);
    });
    
    it('should upload files', async () => {
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
      
      const result = await DataEntryService.uploadFile(file, 'test-company');
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });
  });
  
  describe('AISecurityService', () => {
    it('should validate file types', () => {
      expect(AISecurityService.isFileTypeAllowed('test.csv')).toBe(true);
      expect(AISecurityService.isFileTypeAllowed('test.pdf')).toBe(true);
      expect(AISecurityService.isFileTypeAllowed('test.exe')).toBe(false);
    });
    
    it('should validate file sizes', () => {
      expect(AISecurityService.isFileSizeAllowed('test.csv', 5 * 1024 * 1024)).toBe(true);
      expect(AISecurityService.isFileSizeAllowed('test.csv', 20 * 1024 * 1024)).toBe(false);
    });
    
    it('should sanitize user input', () => {
      const maliciousInput = '<script>alert("XSS")</script>Carbon data';
      const sanitized = AISecurityService.sanitizeUserInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Carbon data');
    });
  });
  
  describe('Error Handling', () => {
    it('should log errors properly', async () => {
      const logSpy = vi.spyOn(ErrorMonitoringService, 'logError');
      
      await ErrorMonitoringService.logAIError(
        'TestComponent',
        'Test error message',
        { detail: 'error detail' },
        'test-user',
        'test-company'
      );
      
      expect(logSpy).toHaveBeenCalledWith({
        component: 'TestComponent',
        message: 'Test error message',
        error_details: { detail: 'error detail' },
        user_id: 'test-user',
        company_id: 'test-company',
        severity: 'error',
        source: 'ai'
      });
    });
  });
}); 