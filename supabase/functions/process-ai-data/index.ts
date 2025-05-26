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
}

class AWSTextractService {
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
      console.log(`=== TEXTRACT PROCESSING DEBUG ===`)
      console.log(`Processing PDF with Textract: ${url}`)
      
      // Download the file
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }
      
      const fileBuffer = await response.arrayBuffer()
      const documentBytes = new Uint8Array(fileBuffer)
      
      console.log(`File downloaded successfully:`)
      console.log(`- File size: ${documentBytes.byteLength} bytes`)
      console.log(`- Content-Type: ${response.headers.get('content-type')}`)
      console.log(`- File URL: ${url}`)
      
      // Check file size limits (Textract has a 10MB limit for synchronous processing)
      const fileSizeMB = documentBytes.byteLength / (1024 * 1024)
      console.log(`- File size in MB: ${fileSizeMB.toFixed(2)}`)
      
      if (fileSizeMB > 10) {
        throw new Error(`File too large for Textract: ${fileSizeMB.toFixed(2)}MB (max 10MB)`)
      }
      
      // Check if it's actually a PDF by looking at the file header
      const fileHeader = Array.from(documentBytes.slice(0, 8))
        .map(byte => String.fromCharCode(byte))
        .join('')
      
      console.log(`- File header: ${fileHeader}`)
      console.log(`- Is PDF: ${fileHeader.startsWith('%PDF')}`)
      
      if (!fileHeader.startsWith('%PDF')) {
        throw new Error(`File is not a valid PDF. Header: ${fileHeader}`)
      }
      
      // Additional PDF validation - check for common PDF issues
      const pdfVersion = fileHeader.substring(1, 8) // Extract PDF version
      console.log(`- PDF Version: ${pdfVersion}`)
      
      // Check for encrypted/password-protected PDFs
      const fileString = Array.from(documentBytes.slice(0, 1024))
        .map(byte => String.fromCharCode(byte))
        .join('')
      
      if (fileString.includes('/Encrypt')) {
        throw new Error('PDF appears to be encrypted or password-protected, which is not supported by Textract')
      }
      
      // Additional PDF format checks
      const hasXref = fileString.includes('xref')
      const hasTrailer = fileString.includes('trailer')
      const hasStartxref = fileString.includes('startxref')
      
      console.log(`- PDF Structure Check:`)
      console.log(`  - Has xref table: ${hasXref}`)
      console.log(`  - Has trailer: ${hasTrailer}`)
      console.log(`  - Has startxref: ${hasStartxref}`)
      
      // Check for linearized PDF (web-optimized)
      const isLinearized = fileString.includes('/Linearized')
      console.log(`  - Is linearized: ${isLinearized}`)
      
      // Check for common problematic PDF features
      const hasJavaScript = fileString.includes('/JavaScript')
      const hasEmbeddedFiles = fileString.includes('/EmbeddedFiles')
      const hasAnnotations = fileString.includes('/Annots')
      
      console.log(`  - Has JavaScript: ${hasJavaScript}`)
      console.log(`  - Has embedded files: ${hasEmbeddedFiles}`)
      console.log(`  - Has annotations: ${hasAnnotations}`)
      
      console.log(`Sending to Textract...`)
      
      // Try with DetectDocumentText first (simpler, more compatible)
      try {
        console.log('Attempting DetectDocumentText (simpler method)...')
        const detectCommand = new DetectDocumentTextCommand({
          Document: {
            Bytes: documentBytes,
          },
        })

        const detectResponse = await this.textractClient.send(detectCommand)
        console.log('✅ Textract DetectDocumentText completed successfully')
        return this.processDetectTextResponse(detectResponse)
        
      } catch (detectError) {
        console.error('DetectDocumentText failed:', detectError.name, detectError.message)
        
        // Try with AnalyzeDocument as fallback
        try {
          console.log('Attempting AnalyzeDocument (advanced method)...')
          const analyzeCommand = new AnalyzeDocumentCommand({
            Document: {
              Bytes: documentBytes,
            },
            FeatureTypes: ['TABLES', 'FORMS'],
          })

          const textractResponse = await this.textractClient.send(analyzeCommand)
          console.log('✅ Textract AnalyzeDocument completed successfully')
          return this.processTextractResponse(textractResponse)
          
        } catch (analyzeError) {
          console.error('AnalyzeDocument also failed:', analyzeError.name, analyzeError.message)
          
          // If both Textract methods fail with UnsupportedDocumentException,
          // try basic text extraction as final fallback
          if (detectError.name === 'UnsupportedDocumentException' && 
              analyzeError.name === 'UnsupportedDocumentException') {
            
            console.log('🔄 Both Textract methods failed with UnsupportedDocumentException')
            console.log('   Attempting basic text extraction fallback...')
            
            try {
              // Extract basic text content from PDF using simple parsing
              const basicText = this.extractBasicTextFromPDF(documentBytes)
              
              if (basicText && basicText.length > 10) {
                console.log('✅ Basic text extraction successful')
                console.log(`   Extracted ${basicText.length} characters`)
                
                return {
                  extractedText: basicText,
                  tables: [],
                  keyValuePairs: [],
                  documentType: this.classifyDocument(basicText),
                  overallConfidence: 0.6 // Lower confidence for basic extraction
                }
              } else {
                console.log('❌ Basic text extraction failed - insufficient text')
              }
            } catch (basicError) {
              console.error('Basic text extraction failed:', basicError.message)
            }
          }
          
          // Provide detailed error information
          const errorDetails = {
            detectError: {
              name: detectError.name,
              message: detectError.message,
              code: detectError.code || 'Unknown'
            },
            analyzeError: {
              name: analyzeError.name,
              message: analyzeError.message,
              code: analyzeError.code || 'Unknown'
            },
            pdfInfo: {
              version: pdfVersion,
              size: fileSizeMB,
              hasXref,
              hasTrailer,
              hasStartxref,
              isLinearized,
              hasJavaScript,
              hasEmbeddedFiles,
              hasAnnotations
            }
          }
          
          console.error('=== DETAILED TEXTRACT ERROR INFO ===')
          console.error(JSON.stringify(errorDetails, null, 2))
          
          throw new Error(`All text extraction methods failed. This PDF format is not compatible with Textract. DetectText: ${detectError.message}, AnalyzeDocument: ${analyzeError.message}`)
        }
      }
      
    } catch (error) {
      console.error('=== TEXTRACT ERROR ===')
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Full error:', error)
      throw new Error(`Textract processing failed: ${error.message}`)
    }
  }

  private processTextractResponse(response: any): TextractResult {
    const blocks = response.Blocks || []
    let extractedText = ''
    const tables: Array<{ headers: string[]; rows: string[][]; confidence: number }> = []
    const keyValuePairs: Array<{ key: string; value: string; confidence: number }> = []
    
    // Extract text from LINE blocks
    const lineBlocks = blocks.filter((block: any) => block.BlockType === 'LINE')
    lineBlocks.forEach((block: any) => {
      if (block.Text) {
        extractedText += block.Text + '\n'
      }
    })
    
    // Process tables
    const tableBlocks = blocks.filter((block: any) => block.BlockType === 'TABLE')
    tableBlocks.forEach((tableBlock: any) => {
      const table = this.extractTableFromBlock(tableBlock, blocks)
      if (table.rows.length > 0) {
        tables.push(table)
      }
    })
    
    // Process key-value pairs
    const keyValueBlocks = blocks.filter((block: any) => block.BlockType === 'KEY_VALUE_SET')
    const pairs = this.extractKeyValuePairs(keyValueBlocks, blocks)
    keyValuePairs.push(...pairs)
    
    // Calculate confidence
    const allConfidences = [
      ...lineBlocks.map((b: any) => b.Confidence || 0),
      ...tableBlocks.map((b: any) => b.Confidence || 0),
      ...keyValueBlocks.map((b: any) => b.Confidence || 0),
    ]
    
    const confidence = allConfidences.length > 0 
      ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length / 100
      : 0
    
    // Classify document
    const documentType = this.classifyDocument(extractedText)
    
    return {
      extractedText: extractedText.trim(),
      tables,
      keyValuePairs,
      documentType,
      overallConfidence: confidence,
    }
  }

  private extractTableFromBlock(tableBlock: any, allBlocks: any[]): { headers: string[]; rows: string[][]; confidence: number } {
    const rows: string[][] = []
    const relationships = tableBlock.Relationships || []
    
    const childRelationship = relationships.find((rel: any) => rel.Type === 'CHILD')
    if (!childRelationship) {
      return { headers: [], rows: [], confidence: 0 }
    }
    
    const cellIds = childRelationship.Ids || []
    const cells = allBlocks.filter((block: any) => 
      cellIds.includes(block.Id) && block.BlockType === 'CELL'
    )
    
    // Group cells by row
    const cellsByRow: { [key: number]: any[] } = {}
    cells.forEach((cell: any) => {
      const rowIndex = cell.RowIndex - 1
      if (!cellsByRow[rowIndex]) {
        cellsByRow[rowIndex] = []
      }
      cellsByRow[rowIndex][cell.ColumnIndex - 1] = cell
    })
    
    // Extract text from each cell
    Object.keys(cellsByRow).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rowKey => {
      const rowCells = cellsByRow[parseInt(rowKey)]
      const rowData: string[] = []
      
      rowCells.forEach((cell, colIndex) => {
        if (cell) {
          const cellText = this.extractTextFromCell(cell, allBlocks)
          rowData[colIndex] = cellText
        } else {
          rowData[colIndex] = ''
        }
      })
      
      rows.push(rowData)
    })
    
    const headers = rows.length > 0 ? rows[0] : []
    const dataRows = rows.slice(1)
    const confidence = tableBlock.Confidence || 0
    
    return { headers, rows: dataRows, confidence: confidence / 100 }
  }

  private extractTextFromCell(cell: any, allBlocks: any[]): string {
    const relationships = cell.Relationships || []
    const childRelationship = relationships.find((rel: any) => rel.Type === 'CHILD')
    
    if (!childRelationship) {
      return ''
    }
    
    const wordIds = childRelationship.Ids || []
    const words = allBlocks.filter((block: any) => 
      wordIds.includes(block.Id) && block.BlockType === 'WORD'
    )
    
    return words.map((word: any) => word.Text || '').join(' ')
  }

  private extractKeyValuePairs(keyValueBlocks: any[], allBlocks: any[]): Array<{ key: string; value: string; confidence: number }> {
    const pairs: Array<{ key: string; value: string; confidence: number }> = []
    
    const keyBlocks = keyValueBlocks.filter((block: any) => 
      block.EntityTypes && block.EntityTypes.includes('KEY')
    )
    
    keyBlocks.forEach((keyBlock: any) => {
      const keyText = this.extractTextFromKeyValueBlock(keyBlock, allBlocks)
      
      const relationships = keyBlock.Relationships || []
      const valueRelationship = relationships.find((rel: any) => rel.Type === 'VALUE')
      
      if (valueRelationship && valueRelationship.Ids) {
        const valueBlockId = valueRelationship.Ids[0]
        const valueBlock = allBlocks.find((block: any) => block.Id === valueBlockId)
        
        if (valueBlock) {
          const valueText = this.extractTextFromKeyValueBlock(valueBlock, allBlocks)
          const confidence = Math.min(keyBlock.Confidence || 0, valueBlock.Confidence || 0) / 100
          
          pairs.push({
            key: keyText,
            value: valueText,
            confidence,
          })
        }
      }
    })
    
    return pairs
  }

  private extractTextFromKeyValueBlock(block: any, allBlocks: any[]): string {
    const relationships = block.Relationships || []
    const childRelationship = relationships.find((rel: any) => rel.Type === 'CHILD')
    
    if (!childRelationship) {
      return ''
    }
    
    const childIds = childRelationship.Ids || []
    const childBlocks = allBlocks.filter((b: any) => childIds.includes(b.Id))
    
    return childBlocks
      .filter((b: any) => b.BlockType === 'WORD')
      .map((b: any) => b.Text || '')
      .join(' ')
  }

  private classifyDocument(text: string): 'invoice' | 'receipt' | 'utility_bill' | 'statement' | 'other' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('invoice') || lowerText.includes('bill to')) {
      return 'invoice'
    }
    
    if (lowerText.includes('receipt') || lowerText.includes('thank you')) {
      return 'receipt'
    }
    
    if (lowerText.includes('utility') || lowerText.includes('electric') || lowerText.includes('kwh')) {
      return 'utility_bill'
    }
    
    if (lowerText.includes('statement')) {
      return 'statement'
    }
    
    return 'other'
  }

  private processDetectTextResponse(response: any): TextractResult {
    const blocks = response.Blocks || []
    let extractedText = ''
    
    // Extract text from LINE blocks for DetectDocumentText
    const lineBlocks = blocks.filter((block: any) => block.BlockType === 'LINE')
    lineBlocks.forEach((block: any) => {
      if (block.Text) {
        extractedText += block.Text + '\n'
      }
    })
    
    // Calculate confidence
    const allConfidences = lineBlocks.map((b: any) => b.Confidence || 0)
    const confidence = allConfidences.length > 0 
      ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length / 100
      : 0
    
    // Classify document
    const documentType = this.classifyDocument(extractedText)
    
    return {
      extractedText: extractedText.trim(),
      tables: [], // DetectDocumentText doesn't extract tables
      keyValuePairs: [], // DetectDocumentText doesn't extract key-value pairs
      documentType,
      overallConfidence: confidence,
    }
  }

  private extractBasicTextFromPDF(documentBytes: Uint8Array): string {
    try {
      // Convert PDF bytes to string for basic text extraction
      const pdfString = Array.from(documentBytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
      
      // Look for text content between stream objects
      const textMatches = []
      
      // Pattern 1: Look for text in stream objects
      const streamRegex = /stream\s*(.*?)\s*endstream/gs
      let match
      while ((match = streamRegex.exec(pdfString)) !== null) {
        const streamContent = match[1]
        
        // Look for readable text (letters, numbers, common punctuation)
        const readableText = streamContent.match(/[A-Za-z0-9\s\.,;:!?\-€$%()]+/g)
        if (readableText) {
          textMatches.push(...readableText)
        }
      }
      
      // Pattern 2: Look for text objects with Tj or TJ operators
      const textObjectRegex = /\((.*?)\)\s*Tj/g
      while ((match = textObjectRegex.exec(pdfString)) !== null) {
        const text = match[1]
        if (text && text.length > 1) {
          textMatches.push(text)
        }
      }
      
      // Pattern 3: Look for text arrays with TJ operator
      const textArrayRegex = /\[(.*?)\]\s*TJ/g
      while ((match = textArrayRegex.exec(pdfString)) !== null) {
        const textArray = match[1]
        // Extract text from array format
        const arrayTextMatches = textArray.match(/\((.*?)\)/g)
        if (arrayTextMatches) {
          arrayTextMatches.forEach(arrayMatch => {
            const text = arrayMatch.replace(/[()]/g, '')
            if (text && text.length > 1) {
              textMatches.push(text)
            }
          })
        }
      }
      
      // Clean and combine extracted text
      const extractedText = textMatches
        .filter(text => text && text.trim().length > 0)
        .map(text => text.trim())
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
      
      console.log(`Basic extraction found ${textMatches.length} text fragments`)
      console.log(`Combined text length: ${extractedText.length}`)
      
      return extractedText
      
    } catch (error) {
      console.error('Basic text extraction error:', error.message)
      return ''
    }
  }
}

async function processWithGPT4(textractResult: TextractResult, openaiKey: string): Promise<any> {
  console.log('=== DEBUGGING GPT-4 PROCESSING ===')
  console.log('Document Type:', textractResult.documentType)
  console.log('Confidence:', textractResult.overallConfidence)
  console.log('Extracted Text Length:', textractResult.extractedText.length)
  console.log('Number of Tables:', textractResult.tables.length)
  console.log('Number of Key-Value Pairs:', textractResult.keyValuePairs.length)
  
  // Log first 500 characters of extracted text
  console.log('Extracted Text Preview:', textractResult.extractedText.substring(0, 500))
  
  // Log table details
  textractResult.tables.forEach((table, index) => {
    console.log(`Table ${index + 1} Headers:`, table.headers)
    console.log(`Table ${index + 1} Row Count:`, table.rows.length)
    if (table.rows.length > 0) {
      console.log(`Table ${index + 1} First Row:`, table.rows[0])
    }
  })
  
  // Log key-value pairs
  console.log('Key-Value Pairs:', textractResult.keyValuePairs.slice(0, 10)) // First 10 pairs
  
  const prompt = `You are a Carbon Accounting Data Extraction Expert. Analyze this Textract extraction and extract carbon accounting entries.

DOCUMENT TYPE: ${textractResult.documentType}
CONFIDENCE: ${textractResult.overallConfidence}

EXTRACTED TEXT:
${textractResult.extractedText}

TABLES:
${textractResult.tables.map((table, index) => 
  `Table ${index + 1}:\nHeaders: ${table.headers.join(' | ')}\n${table.rows.map(row => row.join(' | ')).join('\n')}`
).join('\n\n')}

KEY-VALUE PAIRS:
${textractResult.keyValuePairs.map(pair => `${pair.key}: ${pair.value}`).join('\n')}

TASK: Extract carbon accounting entries from this document. Look for:

FOR FUEL RECEIPTS (Gas Stations):
- Fuel types: "Euro 95", "E10", "Diesel", "Benzine", "Gasoil", "Unleaded"
- Volume data in liters (L), gallons, or similar units
- Purchase dates (look for date patterns like DD-MM-YY, DD/MM/YYYY)
- Fuel station names (Shell, BP, Esso, ABS, Total, etc.)
- Individual transaction lines with volume and cost
- Each fuel purchase = ONE Scope 1 emission entry

FOR UTILITY BILLS:
- Energy consumption (kWh, MWh, therms, m³ gas)
- Billing periods and dates
- Supplier/utility company names
- Costs and currencies
- Meter readings and consumption amounts

FOR INVOICES/RECEIPTS:
- Fuel purchases (liters, gallons)
- Travel expenses (km, miles)
- Material purchases
- Service costs

EXTRACTION RULES:
1. Create ONE entry per fuel purchase transaction or consumption period
2. For fuel receipts: Extract EACH individual fuel purchase as a separate entry
3. Use the transaction date as the activity date
4. For consumption data, extract the actual usage amount (not cumulative readings)
5. Classify emissions scope:
   - Scope 1: Fuel combustion (gasoline, diesel, natural gas)
   - Scope 2: Electricity consumption
   - Scope 3: Business travel, purchased materials
6. If no clear carbon data exists, return an empty array []

FUEL RECEIPT EXAMPLE:
If you see fuel purchases like:
- Date: 05-04-25, Euro 95 E10, 13.60 L, €25.13
- Date: 06-04-25, Euro 95 E10, 12.84 L, €23.74

Extract as:
[
  {
    "date": "2025-04-05",
    "activity_description": "Fuel purchase - Euro 95 E10",
    "quantity": 13.60,
    "unit": "liters",
    "ghg_category": "Scope 1",
    "supplier_vendor": "ABS",
    "cost": 25.13,
    "currency": "EUR",
    "notes": "Gasoline purchase for vehicle",
    "confidence": 0.9
  },
  {
    "date": "2025-04-06", 
    "activity_description": "Fuel purchase - Euro 95 E10",
    "quantity": 12.84,
    "unit": "liters", 
    "ghg_category": "Scope 1",
    "supplier_vendor": "ABS",
    "cost": 23.74,
    "currency": "EUR",
    "notes": "Gasoline purchase for vehicle",
    "confidence": 0.9
  }
]

REQUIRED OUTPUT FORMAT - JSON array:
[
  {
    "date": "YYYY-MM-DD",
    "activity_description": "Clear description of the emission activity",
    "quantity": numeric_value,
    "unit": "liters|kWh|MWh|m³|km|kg|etc",
    "ghg_category": "Scope 1|Scope 2|Scope 3",
    "supplier_vendor": "Company name",
    "cost": numeric_value_or_null,
    "currency": "EUR|USD|etc",
    "notes": "Additional context",
    "confidence": 0.0_to_1.0
  }
]

IMPORTANT: Return ONLY the JSON array. If no carbon accounting data is found, return []`

  console.log('=== SENDING TO GPT-4 ===')
  console.log('Prompt length:', prompt.length)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are a carbon accounting expert. Extract emission-related data from documents. Return only valid JSON arrays. If no carbon accounting data exists, return [].' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    console.error('GPT-4 API Error:', response.status, response.statusText)
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || '[]'
  
  console.log('=== GPT-4 RESPONSE ===')
  console.log('Full GPT-4 response:', content)
  console.log('Response length:', content.length)
  
  try {
    // Clean the response to extract JSON
    let jsonContent = content.trim()
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/, '').replace(/\n?```$/, '')
    }
    
    console.log('Cleaned JSON content:', jsonContent)
    
    const parsed = JSON.parse(jsonContent)
    
    // Ensure we return an array
    if (Array.isArray(parsed)) {
      console.log('Parsed array with', parsed.length, 'entries')
      return parsed
    } else if (parsed.entries && Array.isArray(parsed.entries)) {
      console.log('Parsed object with entries array containing', parsed.entries.length, 'entries')
      return parsed.entries
    } else {
      console.log('GPT-4 returned non-array response, returning empty array')
      return []
    }
  } catch (error) {
    console.error('Failed to parse GPT-4 response:', content)
    console.error('Parse error:', error)
    return []
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
    console.log('Processing AI data request:', requestData.operation)

    if (requestData.operation === 'extract_from_pdf' && requestData.fileUrl) {
      let textractResult: TextractResult | null = null
      let carbonEntries: any[] = []

      // Always use Textract for PDF processing - no fallback
      if (requestData.enhanced_processing) {
        console.log('=== ATTEMPTING TEXTRACT INITIALIZATION ===')
        console.log('AWS_ACCESS_KEY_ID exists:', !!Deno.env.get('AWS_ACCESS_KEY_ID'))
        console.log('AWS_SECRET_ACCESS_KEY exists:', !!Deno.env.get('AWS_SECRET_ACCESS_KEY'))
        console.log('AWS_REGION:', Deno.env.get('AWS_REGION'))
        
        const textractService = new AWSTextractService()
        console.log('✅ Textract service created successfully')
        
        textractResult = await textractService.processPDFFromURL(requestData.fileUrl)
        console.log('✅ Textract extraction successful')
      } else {
        // If enhanced processing is disabled, throw error - we require Textract
        throw new Error('Enhanced processing with Textract is required for PDF processing')
      }

      // Use GPT-4 to interpret the Textract extracted data
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured')
      }

      if (textractResult) {
        // Process Textract results with GPT-4
        carbonEntries = await processWithGPT4(textractResult, openaiKey)
      } else {
        throw new Error('Textract processing failed - no extracted data available')
      }

      // Format response
      const result = {
        document_type: textractResult?.documentType || 'other',
        extraction_confidence: textractResult?.overallConfidence || 0.7,
        entries: carbonEntries,
        warnings: [],
        suggestions: [],
        metadata: {
          extractionMethod: 'textract+gpt4',
          processingTime: Date.now()
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: JSON.stringify(result),
          message: `Extracted ${carbonEntries.length} entries using Textract + GPT-4`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Unsupported operation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process AI data error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Processing failed',
        error: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 