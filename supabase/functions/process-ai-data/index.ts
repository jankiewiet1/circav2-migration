import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// AWS Textract integration
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from 'npm:@aws-sdk/client-textract'

interface ProcessAIDataRequest {
  operation: 'extract_from_pdf' | 'batch_process' | 'process_text'
  fileUrl?: string
  fileUrls?: string[]
  content?: string
  enhanced_processing?: boolean
  companyId?: string
  batchId?: string
}

interface TextractResult {
  extractedText: string
  tables: Array<{
    headers: string[]
    rows: string[][]
    confidence: number
  }>
  keyValuePairs: Array<{
    key: string
    value: string
    confidence: number
  }>
  documentType: 'invoice' | 'receipt' | 'utility_bill' | 'statement' | 'other'
  overallConfidence: number
  pageCount?: number
  processingMethod: 'textract_analyze' | 'textract_detect' | 'fallback'
}

interface CarbonEntry {
  date: string
  activity_description: string
  quantity: number
  unit: string
  ghg_category: 'Scope 1' | 'Scope 2' | 'Scope 3'
  supplier_vendor?: string
  cost?: number
  currency?: string
  notes?: string
  confidence: number
}

interface TextChunk {
  content: string
  type: 'text' | 'table' | 'key_value'
  metadata?: any
  tokenCount: number
}

class EnhancedAWSTextractService {
  private textractClient: TextractClient

  constructor() {
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const region = Deno.env.get('AWS_REGION') || 'eu-central-1'

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured')
    }

    this.textractClient = new TextractClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async processPDFFromURL(url: string): Promise<TextractResult> {
    try {
      console.log(`=== ENHANCED TEXTRACT PROCESSING ===`)
      console.log(`Processing PDF: ${url}`)
      
      // Download and validate file
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }
      
      const fileBuffer = await response.arrayBuffer()
      const documentBytes = new Uint8Array(fileBuffer)
      
      console.log(`File downloaded: ${documentBytes.byteLength} bytes`)
      
      // Validate PDF
      this.validatePDF(documentBytes)
      
      // Try enhanced processing first (AnalyzeDocument)
      try {
        console.log('Attempting AnalyzeDocument with TABLES and FORMS...')
        const analyzeCommand = new AnalyzeDocumentCommand({
          Document: { Bytes: documentBytes },
          FeatureTypes: ['TABLES', 'FORMS'],
        })

        const response = await this.textractClient.send(analyzeCommand)
        console.log('✅ AnalyzeDocument successful')
        return this.processAnalyzeResponse(response)
        
      } catch (analyzeError) {
        console.warn('AnalyzeDocument failed, trying DetectDocumentText:', analyzeError.message)
        
        // Fallback to basic text detection
        const detectCommand = new DetectDocumentTextCommand({
          Document: { Bytes: documentBytes },
        })

        const response = await this.textractClient.send(detectCommand)
        console.log('✅ DetectDocumentText successful (fallback)')
        return this.processDetectResponse(response)
      }
      
    } catch (error) {
      console.error('Textract processing failed:', error)
      throw new Error(`Textract processing failed: ${error.message}`)
    }
  }

  private validatePDF(documentBytes: Uint8Array): void {
    const fileSizeMB = documentBytes.byteLength / (1024 * 1024)
    
    if (fileSizeMB > 10) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max 10MB for Textract)`)
    }
    
    const fileHeader = Array.from(documentBytes.slice(0, 8))
      .map(byte => String.fromCharCode(byte))
      .join('')
    
    if (!fileHeader.startsWith('%PDF')) {
      throw new Error(`Invalid PDF file. Header: ${fileHeader}`)
    }
    
    // Check for encryption
    const fileString = Array.from(documentBytes.slice(0, 2048))
      .map(byte => String.fromCharCode(byte))
      .join('')
    
    if (fileString.includes('/Encrypt')) {
      throw new Error('Encrypted PDFs are not supported')
    }
    
    console.log(`PDF validation passed: ${fileSizeMB.toFixed(2)}MB`)
  }

  private processAnalyzeResponse(response: any): TextractResult {
    const blocks = response.Blocks || []
    let extractedText = ''
    const tables: Array<{ headers: string[]; rows: string[][]; confidence: number }> = []
    const keyValuePairs: Array<{ key: string; value: string; confidence: number }> = []
    
    // Extract text blocks
    const textBlocks = blocks.filter((block: any) => block.BlockType === 'LINE')
    extractedText = textBlocks.map((block: any) => block.Text || '').join('\n')
    
    // Extract tables
    const tableBlocks = blocks.filter((block: any) => block.BlockType === 'TABLE')
    for (const tableBlock of tableBlocks) {
      const table = this.extractTableFromBlock(tableBlock, blocks)
      if (table.headers.length > 0 || table.rows.length > 0) {
        tables.push(table)
      }
    }
    
    // Extract key-value pairs
    const keyValueBlocks = blocks.filter((block: any) => 
      block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')
    )
    
    for (const kvBlock of keyValueBlocks) {
      const pair = this.extractKeyValuePair(kvBlock, blocks)
      if (pair) {
        keyValuePairs.push(pair)
      }
    }
    
    const overallConfidence = this.calculateConfidence(blocks)
    const documentType = this.classifyDocument(extractedText)
    
    console.log(`Extracted: ${extractedText.length} chars, ${tables.length} tables, ${keyValuePairs.length} KV pairs`)
    
    return {
      extractedText,
      tables,
      keyValuePairs,
      documentType,
      overallConfidence,
      processingMethod: 'textract_analyze'
    }
  }

  private processDetectResponse(response: any): TextractResult {
    const blocks = response.Blocks || []
    const textBlocks = blocks.filter((block: any) => block.BlockType === 'LINE')
    const extractedText = textBlocks.map((block: any) => block.Text || '').join('\n')
    
    const overallConfidence = this.calculateConfidence(blocks)
    const documentType = this.classifyDocument(extractedText)
    
    console.log(`Extracted (detect mode): ${extractedText.length} chars`)
    
    return {
      extractedText,
      tables: [],
      keyValuePairs: [],
      documentType,
      overallConfidence,
      processingMethod: 'textract_detect'
    }
  }

  private extractTableFromBlock(tableBlock: any, allBlocks: any[]): { headers: string[]; rows: string[][]; confidence: number } {
    const cells = allBlocks.filter((block: any) => 
      block.BlockType === 'CELL' && 
      block.Relationships?.some((rel: any) => rel.Type === 'CHILD' && tableBlock.Id === rel.Ids?.[0])
    )
    
    if (cells.length === 0) {
      return { headers: [], rows: [], confidence: 0 }
    }
    
    // Group cells by row and column
    const cellGrid: { [row: number]: { [col: number]: string } } = {}
    let maxRow = 0
    let maxCol = 0
    
    for (const cell of cells) {
      const rowIndex = (cell.RowIndex || 1) - 1
      const colIndex = (cell.ColumnIndex || 1) - 1
      
      maxRow = Math.max(maxRow, rowIndex)
      maxCol = Math.max(maxCol, colIndex)
      
      if (!cellGrid[rowIndex]) cellGrid[rowIndex] = {}
      cellGrid[rowIndex][colIndex] = this.extractTextFromCell(cell, allBlocks)
    }
    
    // Convert to headers and rows
    const headers: string[] = []
    const rows: string[][] = []
    
    // First row as headers
    if (cellGrid[0]) {
      for (let col = 0; col <= maxCol; col++) {
        headers.push(cellGrid[0][col] || '')
      }
    }
    
    // Remaining rows as data
    for (let row = 1; row <= maxRow; row++) {
      if (cellGrid[row]) {
      const rowData: string[] = []
        for (let col = 0; col <= maxCol; col++) {
          rowData.push(cellGrid[row][col] || '')
        }
      rows.push(rowData)
      }
    }
    
    const confidence = cells.reduce((sum: number, cell: any) => sum + (cell.Confidence || 0), 0) / cells.length
    
    return { headers, rows, confidence: confidence / 100 }
  }

  private extractTextFromCell(cell: any, allBlocks: any[]): string {
    if (!cell.Relationships) return ''
    
    const childIds = cell.Relationships
      .filter((rel: any) => rel.Type === 'CHILD')
      .flatMap((rel: any) => rel.Ids || [])
    
    const childBlocks = allBlocks.filter((block: any) => childIds.includes(block.Id))
    return childBlocks.map((block: any) => block.Text || '').join(' ')
  }

  private extractKeyValuePair(keyBlock: any, allBlocks: any[]): { key: string; value: string; confidence: number } | null {
    const keyText = this.extractTextFromBlock(keyBlock, allBlocks)
    
    // Find corresponding value block
    const valueRelation = keyBlock.Relationships?.find((rel: any) => rel.Type === 'VALUE')
    if (!valueRelation?.Ids?.[0]) return null
    
    const valueBlock = allBlocks.find((block: any) => block.Id === valueRelation.Ids[0])
    if (!valueBlock) return null
    
    const valueText = this.extractTextFromBlock(valueBlock, allBlocks)
    const confidence = ((keyBlock.Confidence || 0) + (valueBlock.Confidence || 0)) / 200
    
    return {
      key: keyText.trim(),
      value: valueText.trim(),
      confidence
    }
  }

  private extractTextFromBlock(block: any, allBlocks: any[]): string {
    if (!block.Relationships) return block.Text || ''
    
    const childIds = block.Relationships
      .filter((rel: any) => rel.Type === 'CHILD')
      .flatMap((rel: any) => rel.Ids || [])
    
    const childBlocks = allBlocks.filter((block: any) => childIds.includes(block.Id))
    return childBlocks.map((block: any) => block.Text || '').join(' ')
  }

  private calculateConfidence(blocks: any[]): number {
    const confidenceBlocks = blocks.filter((block: any) => block.Confidence !== undefined)
    if (confidenceBlocks.length === 0) return 0.7
    
    const totalConfidence = confidenceBlocks.reduce((sum: number, block: any) => sum + block.Confidence, 0)
    return totalConfidence / (confidenceBlocks.length * 100)
  }

  private classifyDocument(text: string): 'invoice' | 'receipt' | 'utility_bill' | 'statement' | 'other' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('invoice') || lowerText.includes('factuur')) return 'invoice'
    if (lowerText.includes('receipt') || lowerText.includes('bon')) return 'receipt'
    if (lowerText.includes('utility') || lowerText.includes('energy') || lowerText.includes('gas') || lowerText.includes('electricity')) return 'utility_bill'
    if (lowerText.includes('statement') || lowerText.includes('overzicht')) return 'statement'
    
    return 'other'
  }
}

class GPT4CarbonProcessor {
  private openaiKey: string
  private maxTokensPerChunk = 6000 // Conservative limit for GPT-4 Turbo
  
  constructor(openaiKey: string) {
    this.openaiKey = openaiKey
  }

  async processTextractResult(textractResult: TextractResult): Promise<CarbonEntry[]> {
    console.log('=== GPT-4 CARBON PROCESSING ===')
    
    // Create chunks from Textract result
    const chunks = this.createIntelligentChunks(textractResult)
    console.log(`Created ${chunks.length} intelligent chunks`)
    
    const allEntries: CarbonEntry[] = []
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.tokenCount} tokens)`)
      
      try {
        const entries = await this.processChunk(chunk, textractResult.documentType)
        allEntries.push(...entries)
        console.log(`Chunk ${i + 1} extracted ${entries.length} entries`)
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error.message)
        // Continue with other chunks
      }
    }
    
    // Deduplicate and validate entries
    const uniqueEntries = this.deduplicateEntries(allEntries)
    console.log(`Final result: ${uniqueEntries.length} unique carbon entries`)
    
    return uniqueEntries
  }

  private createIntelligentChunks(textractResult: TextractResult): TextChunk[] {
    const chunks: TextChunk[] = []
    
    // Chunk 1: Main text content
    if (textractResult.extractedText.length > 0) {
      const textChunks = this.chunkText(textractResult.extractedText, 4000)
      textChunks.forEach(text => {
        chunks.push({
          content: text,
          type: 'text',
          tokenCount: this.estimateTokens(text)
        })
      })
    }
    
    // Chunk 2: Tables (each table as separate chunk)
    textractResult.tables.forEach((table, index) => {
      const tableText = this.formatTableForGPT(table)
      if (tableText.length > 0) {
        chunks.push({
          content: tableText,
          type: 'table',
          metadata: { tableIndex: index, confidence: table.confidence },
          tokenCount: this.estimateTokens(tableText)
        })
      }
    })
    
    // Chunk 3: Key-value pairs (grouped)
    if (textractResult.keyValuePairs.length > 0) {
      const kvText = this.formatKeyValuePairsForGPT(textractResult.keyValuePairs)
      chunks.push({
        content: kvText,
        type: 'key_value',
        tokenCount: this.estimateTokens(kvText)
      })
    }
    
    return chunks.filter(chunk => chunk.tokenCount > 10) // Filter out tiny chunks
  }

  private chunkText(text: string, maxChars: number): string[] {
    if (text.length <= maxChars) return [text]
    
    const chunks: string[] = []
    const sentences = text.split(/[.!?]\s+/)
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChars && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }

  private formatTableForGPT(table: { headers: string[]; rows: string[][]; confidence: number }): string {
    if (table.headers.length === 0 && table.rows.length === 0) return ''
    
    let formatted = `TABLE (Confidence: ${(table.confidence * 100).toFixed(1)}%):\n`
    
    if (table.headers.length > 0) {
      formatted += `Headers: ${table.headers.join(' | ')}\n`
    }
    
    table.rows.forEach((row, index) => {
      formatted += `Row ${index + 1}: ${row.join(' | ')}\n`
    })
    
    return formatted
  }

  private formatKeyValuePairsForGPT(pairs: Array<{ key: string; value: string; confidence: number }>): string {
    let formatted = 'KEY-VALUE PAIRS:\n'
    pairs.forEach(pair => {
      formatted += `${pair.key}: ${pair.value} (${(pair.confidence * 100).toFixed(1)}%)\n`
    })
    return formatted
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  private async processChunk(chunk: TextChunk, documentType: string): Promise<CarbonEntry[]> {
    const prompt = this.createOptimizedPrompt(chunk, documentType)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // Use GPT-4 Turbo for better performance
      messages: [
        { 
          role: 'system', 
            content: 'You are a carbon accounting expert. Extract emission-related data and return ONLY valid JSON arrays. If no carbon data exists, return [].' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
        response_format: { type: 'json_object' }
    }),
  })

  if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
    const content = data.choices[0]?.message?.content || '{}'
    
    try {
      const parsed = JSON.parse(content)
      
      // Handle different response formats
    if (Array.isArray(parsed)) {
        return this.validateEntries(parsed)
    } else if (parsed.entries && Array.isArray(parsed.entries)) {
        return this.validateEntries(parsed.entries)
      } else if (parsed.carbon_entries && Array.isArray(parsed.carbon_entries)) {
        return this.validateEntries(parsed.carbon_entries)
    } else {
        console.log('No carbon entries found in chunk')
      return []
    }
  } catch (error) {
    console.error('Failed to parse GPT-4 response:', content)
    return []
    }
  }

  private createOptimizedPrompt(chunk: TextChunk, documentType: string): string {
    return `Extract carbon accounting data from this ${chunk.type} content from a ${documentType}.

CONTENT:
${chunk.content}

EXTRACTION RULES:
1. Look for fuel purchases, energy consumption, travel expenses, material purchases
2. Each transaction/consumption period = ONE entry
3. For fuel receipts: Extract EACH individual purchase separately
4. Use actual consumption amounts (not cumulative readings)
5. Classify GHG scope correctly:
   - Scope 1: Direct fuel combustion (gasoline, diesel, natural gas)
   - Scope 2: Purchased electricity, steam, heating/cooling
   - Scope 3: Business travel, purchased materials, waste

REQUIRED JSON FORMAT:
{
  "carbon_entries": [
    {
      "date": "YYYY-MM-DD",
      "activity_description": "Clear description",
      "quantity": numeric_value,
      "unit": "liters|kWh|MWh|m³|km|kg",
      "ghg_category": "Scope 1|Scope 2|Scope 3",
      "supplier_vendor": "Company name or null",
      "cost": numeric_value_or_null,
      "currency": "EUR|USD|etc or null",
      "notes": "Additional context or null",
      "confidence": 0.0_to_1.0
    }
  ]
}

Return ONLY the JSON object. If no carbon data found, return {"carbon_entries": []}`
  }

  private validateEntries(entries: any[]): CarbonEntry[] {
    return entries
      .filter(entry => this.isValidEntry(entry))
      .map(entry => this.normalizeEntry(entry))
  }

  private isValidEntry(entry: any): boolean {
    return (
      entry &&
      typeof entry === 'object' &&
      entry.date &&
      entry.activity_description &&
      typeof entry.quantity === 'number' &&
      entry.quantity > 0 &&
      entry.unit &&
      ['Scope 1', 'Scope 2', 'Scope 3'].includes(entry.ghg_category)
    )
  }

  private normalizeEntry(entry: any): CarbonEntry {
    return {
      date: this.normalizeDate(entry.date),
      activity_description: String(entry.activity_description).trim(),
      quantity: Number(entry.quantity),
      unit: String(entry.unit).trim(),
      ghg_category: entry.ghg_category,
      supplier_vendor: entry.supplier_vendor ? String(entry.supplier_vendor).trim() : undefined,
      cost: entry.cost ? Number(entry.cost) : undefined,
      currency: entry.currency ? String(entry.currency).trim() : undefined,
      notes: entry.notes ? String(entry.notes).trim() : undefined,
      confidence: Math.min(Math.max(Number(entry.confidence) || 0.7, 0), 1)
    }
  }

  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        // Try parsing common European formats
        const parts = dateStr.split(/[-/.]/)
        if (parts.length === 3) {
          // Assume DD-MM-YYYY or DD/MM/YYYY
          const day = parseInt(parts[0])
          const month = parseInt(parts[1])
          const year = parseInt(parts[2])
          
          if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new Date(year, month - 1, day).toISOString().split('T')[0]
          }
        }
        throw new Error('Invalid date format')
      }
      return date.toISOString().split('T')[0]
    } catch {
      // Fallback to current date if parsing fails
      return new Date().toISOString().split('T')[0]
    }
  }

  private deduplicateEntries(entries: CarbonEntry[]): CarbonEntry[] {
    const seen = new Set<string>()
    return entries.filter(entry => {
      const key = `${entry.date}-${entry.activity_description}-${entry.quantity}-${entry.unit}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const requestData: ProcessAIDataRequest = await req.json()
    console.log('=== ENHANCED AI PROCESSING REQUEST ===')
    console.log('Operation:', requestData.operation)
    console.log('Enhanced processing:', requestData.enhanced_processing)

    if (requestData.operation === 'extract_from_pdf' && requestData.fileUrl) {
      // Validate environment
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured')
      }

      // Initialize services
      const textractService = new EnhancedAWSTextractService()
      const gpt4Processor = new GPT4CarbonProcessor(openaiKey)

      // Step 1: Extract with Textract
      console.log('Step 1: Textract extraction...')
      const textractResult = await textractService.processPDFFromURL(requestData.fileUrl)
      
      // Step 2: Process with GPT-4 Turbo
      console.log('Step 2: GPT-4 processing...')
      const carbonEntries = await gpt4Processor.processTextractResult(textractResult)

      // Step 3: Format response
      const result = {
        document_type: textractResult.documentType,
        extraction_confidence: textractResult.overallConfidence,
        entries: carbonEntries,
        warnings: carbonEntries.length === 0 ? ['No carbon accounting data found in document'] : [],
        suggestions: [],
        metadata: {
          extractionMethod: `${textractResult.processingMethod}+gpt4-turbo`,
          processingTime: Date.now(),
          chunksProcessed: carbonEntries.length > 0 ? 'multiple' : 'none',
          textractTables: textractResult.tables.length,
          textractKeyValues: textractResult.keyValuePairs.length
        }
      }

      console.log('=== PROCESSING COMPLETE ===')
      console.log(`Extracted ${carbonEntries.length} carbon entries`)
      console.log(`Document type: ${textractResult.documentType}`)
      console.log(`Confidence: ${(textractResult.overallConfidence * 100).toFixed(1)}%`)

      return new Response(
        JSON.stringify({
          success: true,
          data: JSON.stringify(result),
          message: `Successfully extracted ${carbonEntries.length} carbon entries using enhanced Textract + GPT-4 Turbo`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Unsupported operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== PROCESSING ERROR ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Processing failed',
        error: error.toString(),
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 