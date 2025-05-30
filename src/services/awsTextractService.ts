import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

interface TextractConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface TextractResult {
  text: string;
  tables: Array<{
    rows: string[][];
    confidence: number;
  }>;
  forms: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  confidence: number;
}

interface ProcessedDocument {
  extractedText: string;
  tables: Array<{
    headers: string[];
    rows: string[][];
    confidence: number;
  }>;
  keyValuePairs: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  overallConfidence: number;
  documentType: 'invoice' | 'receipt' | 'utility_bill' | 'statement' | 'other';
}

export class AWSTextractService {
  private textractClient: TextractClient;
  private s3Client: S3Client;
  private config: TextractConfig;

  constructor(config: TextractConfig) {
    this.config = config;
    this.textractClient = new TextractClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Process a PDF file using AWS Textract
   */
  async processPDF(fileBuffer: ArrayBuffer, fileName: string): Promise<ProcessedDocument> {
    try {
      console.log(`Processing document with Textract: ${fileName} (${fileBuffer.byteLength} bytes)`);
      
      // Convert ArrayBuffer to Uint8Array
      const documentBytes = new Uint8Array(fileBuffer);
      
      // Determine if we should use DetectDocumentText or AnalyzeDocument
      const isSimpleTextExtraction = fileName.toLowerCase().includes('simple') || 
                                   documentBytes.byteLength < 100000; // < 100KB
      
      let response;
      
      if (isSimpleTextExtraction) {
        // Use DetectDocumentText for simple text extraction (faster, cheaper)
        console.log('Using DetectDocumentText for simple extraction');
        const detectCommand = new DetectDocumentTextCommand({
          Document: {
            Bytes: documentBytes,
          },
        });
        
        response = await this.textractClient.send(detectCommand);
      } else {
        // Use AnalyzeDocument for comprehensive extraction (text, tables, forms)
        console.log('Using AnalyzeDocument for comprehensive extraction');
        const analyzeCommand = new AnalyzeDocumentCommand({
          Document: {
            Bytes: documentBytes,
          },
          FeatureTypes: ['TABLES', 'FORMS'],
        });

        response = await this.textractClient.send(analyzeCommand);
      }
      
      // Process the response
      const result = this.processTextractResponse(response);
      
      // Determine document type based on content
      const documentType = this.classifyDocument(result.text);
      
      console.log(`Textract processing completed: ${result.text.length} chars, ${result.tables.length} tables, ${result.forms.length} forms`);
      
      return {
        extractedText: result.text,
        tables: this.formatTables(result.tables),
        keyValuePairs: result.forms,
        overallConfidence: result.confidence,
        documentType,
      };
      
    } catch (error) {
      console.error('Error processing document with Textract:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('UnsupportedDocumentException')) {
          throw new Error('Document format not supported by Textract. Please ensure the file is a valid PDF, PNG, JPEG, or TIFF.');
        } else if (error.message.includes('InvalidParameterException')) {
          throw new Error('Invalid document parameters. The document may be corrupted or in an unsupported format.');
        } else if (error.message.includes('DocumentTooLargeException')) {
          throw new Error('Document is too large. Maximum size is 10 MB for synchronous processing.');
        } else if (error.message.includes('BadDocumentException')) {
          throw new Error('Document appears to be corrupted or unreadable.');
        } else if (error.message.includes('AccessDeniedException')) {
          throw new Error('AWS access denied. Please check your Textract permissions.');
        }
      }
      
      throw new Error(`Textract processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a PDF from URL (download first, then process)
   */
  async processPDFFromURL(url: string): Promise<ProcessedDocument> {
    try {
      console.log(`Downloading and processing PDF from URL: ${url}`);
      
      // Download the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log(`File content type: ${contentType}`);
      
      // Validate file type
      if (contentType && !this.isSupportedFileType(contentType)) {
        throw new Error(`Unsupported file type: ${contentType}. Supported types: PDF, PNG, JPEG, TIFF`);
      }
      
      const fileBuffer = await response.arrayBuffer();
      const fileName = url.split('/').pop() || 'document.pdf';
      
      // Validate file size (Textract has limits)
      const fileSizeMB = fileBuffer.byteLength / (1024 * 1024);
      console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
      
      if (fileSizeMB > 10) {
        throw new Error(`File too large: ${fileSizeMB.toFixed(2)} MB. Maximum size is 10 MB for synchronous processing.`);
      }
      
      // Validate PDF signature if it's a PDF
      if (contentType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
        if (!this.isValidPDF(fileBuffer)) {
          throw new Error('Invalid PDF file format');
        }
      }
      
      return await this.processPDF(fileBuffer, fileName);
      
    } catch (error) {
      console.error('Error processing PDF from URL:', error);
      throw new Error(`Failed to process PDF from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if content type is supported by Textract
   */
  private isSupportedFileType(contentType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/tiff',
      'image/tif'
    ];
    
    return supportedTypes.some(type => contentType.toLowerCase().includes(type));
  }

  /**
   * Validate PDF file signature
   */
  private isValidPDF(buffer: ArrayBuffer): boolean {
    const uint8Array = new Uint8Array(buffer);
    
    // Check PDF signature (%PDF-)
    const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-
    
    if (uint8Array.length < 5) {
      return false;
    }
    
    for (let i = 0; i < pdfSignature.length; i++) {
      if (uint8Array[i] !== pdfSignature[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Process Textract response and extract structured data
   */
  private processTextractResponse(response: any): TextractResult {
    const blocks = response.Blocks || [];
    let extractedText = '';
    const tables: Array<{ rows: string[][]; confidence: number }> = [];
    const forms: Array<{ key: string; value: string; confidence: number }> = [];
    
    // Group blocks by type
    const lineBlocks = blocks.filter((block: any) => block.BlockType === 'LINE');
    const tableBlocks = blocks.filter((block: any) => block.BlockType === 'TABLE');
    const keyValueBlocks = blocks.filter((block: any) => block.BlockType === 'KEY_VALUE_SET');
    
    // Extract text from LINE blocks
    lineBlocks.forEach((block: any) => {
      if (block.Text) {
        extractedText += block.Text + '\n';
      }
    });
    
    // Process tables
    tableBlocks.forEach((tableBlock: any) => {
      const table = this.extractTableFromBlock(tableBlock, blocks);
      if (table.rows.length > 0) {
        tables.push(table);
      }
    });
    
    // Process key-value pairs
    const keyValuePairs = this.extractKeyValuePairs(keyValueBlocks, blocks);
    forms.push(...keyValuePairs);
    
    // Calculate overall confidence
    const allConfidences = [
      ...lineBlocks.map((b: any) => b.Confidence || 0),
      ...tableBlocks.map((b: any) => b.Confidence || 0),
      ...keyValueBlocks.map((b: any) => b.Confidence || 0),
    ];
    
    const confidence = allConfidences.length > 0 
      ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length / 100
      : 0;
    
    return {
      text: extractedText.trim(),
      tables,
      forms,
      confidence,
    };
  }

  /**
   * Extract table data from Textract table block
   */
  private extractTableFromBlock(tableBlock: any, allBlocks: any[]): { rows: string[][]; confidence: number } {
    const rows: string[][] = [];
    const relationships = tableBlock.Relationships || [];
    
    // Find CHILD relationships to get cells
    const childRelationship = relationships.find((rel: any) => rel.Type === 'CHILD');
    if (!childRelationship) {
      return { rows: [], confidence: 0 };
    }
    
    const cellIds = childRelationship.Ids || [];
    const cells = allBlocks.filter((block: any) => 
      cellIds.includes(block.Id) && block.BlockType === 'CELL'
    );
    
    // Group cells by row
    const cellsByRow: { [key: number]: any[] } = {};
    cells.forEach((cell: any) => {
      const rowIndex = cell.RowIndex - 1; // Convert to 0-based index
      if (!cellsByRow[rowIndex]) {
        cellsByRow[rowIndex] = [];
      }
      cellsByRow[rowIndex][cell.ColumnIndex - 1] = cell;
    });
    
    // Extract text from each cell
    Object.keys(cellsByRow).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rowKey => {
      const rowCells = cellsByRow[parseInt(rowKey)];
      const rowData: string[] = [];
      
      rowCells.forEach((cell, colIndex) => {
        if (cell) {
          const cellText = this.extractTextFromCell(cell, allBlocks);
          rowData[colIndex] = cellText;
        } else {
          rowData[colIndex] = '';
        }
      });
      
      rows.push(rowData);
    });
    
    const confidence = tableBlock.Confidence || 0;
    return { rows, confidence: confidence / 100 };
  }

  /**
   * Extract text from a table cell
   */
  private extractTextFromCell(cell: any, allBlocks: any[]): string {
    const relationships = cell.Relationships || [];
    const childRelationship = relationships.find((rel: any) => rel.Type === 'CHILD');
    
    if (!childRelationship) {
      return '';
    }
    
    const wordIds = childRelationship.Ids || [];
    const words = allBlocks.filter((block: any) => 
      wordIds.includes(block.Id) && block.BlockType === 'WORD'
    );
    
    return words.map((word: any) => word.Text || '').join(' ');
  }

  /**
   * Extract key-value pairs from form data
   */
  private extractKeyValuePairs(keyValueBlocks: any[], allBlocks: any[]): Array<{ key: string; value: string; confidence: number }> {
    const pairs: Array<{ key: string; value: string; confidence: number }> = [];
    
    // Group key-value blocks
    const keyBlocks = keyValueBlocks.filter((block: any) => 
      block.EntityTypes && block.EntityTypes.includes('KEY')
    );
    
    keyBlocks.forEach((keyBlock: any) => {
      const keyText = this.extractTextFromKeyValueBlock(keyBlock, allBlocks);
      
      // Find corresponding value block
      const relationships = keyBlock.Relationships || [];
      const valueRelationship = relationships.find((rel: any) => rel.Type === 'VALUE');
      
      if (valueRelationship && valueRelationship.Ids) {
        const valueBlockId = valueRelationship.Ids[0];
        const valueBlock = allBlocks.find((block: any) => block.Id === valueBlockId);
        
        if (valueBlock) {
          const valueText = this.extractTextFromKeyValueBlock(valueBlock, allBlocks);
          const confidence = Math.min(keyBlock.Confidence || 0, valueBlock.Confidence || 0) / 100;
          
          pairs.push({
            key: keyText,
            value: valueText,
            confidence,
          });
        }
      }
    });
    
    return pairs;
  }

  /**
   * Extract text from key-value block
   */
  private extractTextFromKeyValueBlock(block: any, allBlocks: any[]): string {
    const relationships = block.Relationships || [];
    const childRelationship = relationships.find((rel: any) => rel.Type === 'CHILD');
    
    if (!childRelationship) {
      return '';
    }
    
    const childIds = childRelationship.Ids || [];
    const childBlocks = allBlocks.filter((b: any) => childIds.includes(b.Id));
    
    return childBlocks
      .filter((b: any) => b.BlockType === 'WORD')
      .map((b: any) => b.Text || '')
      .join(' ');
  }

  /**
   * Format tables with headers
   */
  private formatTables(tables: Array<{ rows: string[][]; confidence: number }>): Array<{ headers: string[]; rows: string[][]; confidence: number }> {
    return tables.map(table => {
      if (table.rows.length === 0) {
        return { headers: [], rows: [], confidence: table.confidence };
      }
      
      // Assume first row contains headers
      const headers = table.rows[0] || [];
      const dataRows = table.rows.slice(1);
      
      return {
        headers,
        rows: dataRows,
        confidence: table.confidence,
      };
    });
  }

  /**
   * Classify document type based on content
   */
  private classifyDocument(text: string): 'invoice' | 'receipt' | 'utility_bill' | 'statement' | 'other' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('invoice') || lowerText.includes('bill to') || lowerText.includes('invoice number')) {
      return 'invoice';
    }
    
    if (lowerText.includes('receipt') || lowerText.includes('thank you for your purchase')) {
      return 'receipt';
    }
    
    if (lowerText.includes('utility') || lowerText.includes('electric') || lowerText.includes('gas bill') || 
        lowerText.includes('kwh') || lowerText.includes('water bill')) {
      return 'utility_bill';
    }
    
    if (lowerText.includes('statement') || lowerText.includes('account summary')) {
      return 'statement';
    }
    
    return 'other';
  }

  /**
   * Create service instance from environment variables
   * ⚠️ SECURITY WARNING: AWS credentials should NEVER be in frontend code
   * This method is disabled for security reasons - use serverless functions instead
   */
  static fromEnvironment(): AWSTextractService {
    throw new Error(
      '🚫 AWS credentials cannot be used in frontend for security reasons. ' +
      'Use the serverless function /functions/v1/process-ai-data instead.'
    );
  }
} 