import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ColumnMapping {
  activity_description: string
  quantity: string
  unit: string
  emission_factor?: string
  ghg_category: string
  activity_date: string
  notes?: string
  supplier_vendor?: string
  cost?: string
  currency?: string
}

interface FileUploadRequest {
  file_content: string // Base64 encoded file content
  file_name: string
  column_mapping: ColumnMapping
  has_header_row?: boolean
}

// Simple CSV parser
function parseCSV(content: string, hasHeader: boolean = true): string[][] {
  const lines = content.trim().split('\n')
  const result: string[][] = []
  
  for (const line of lines) {
    // Simple CSV parsing - handles basic cases
    const row = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
    result.push(row)
  }
  
  return hasHeader && result.length > 0 ? result.slice(1) : result
}

// Validate GHG category
function validateGHGCategory(value: string): 'scope1' | 'scope2' | 'scope3' | null {
  const normalized = value.toLowerCase().trim()
  
  // Handle Scope 1 patterns
  if (
    normalized.includes('scope 1') || 
    normalized.includes('scope1') || 
    normalized.includes('scope_1') ||
    normalized.includes('direct') ||
    normalized === '1'
  ) {
    return 'scope1'
  }
  
  // Handle Scope 2 patterns
  if (
    normalized.includes('scope 2') || 
    normalized.includes('scope2') || 
    normalized.includes('scope_2') ||
    normalized.includes('indirect') && !normalized.includes('other') ||
    normalized.includes('electricity') ||
    normalized === '2'
  ) {
    return 'scope2'
  }
  
  // Handle Scope 3 patterns
  if (
    normalized.includes('scope 3') || 
    normalized.includes('scope3') || 
    normalized.includes('scope_3') ||
    normalized.includes('other indirect') ||
    normalized.includes('supply chain') ||
    normalized === '3'
  ) {
    return 'scope3'
  }
  
  return null
}

// Get column value by mapping
function getColumnValue(row: string[], mapping: ColumnMapping, column: keyof ColumnMapping): string {
  const columnIndex = parseInt(mapping[column] || '0')
  return columnIndex >= 0 && columnIndex < row.length ? row[columnIndex] : ''
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Extract the request data
    const requestJSON = await req.json()
    console.log('Request received:', JSON.stringify(requestJSON, null, 2))
    
    // Check if data is nested or at top level
    const requestData: FileUploadRequest = requestJSON.data || requestJSON
    console.log('Request data parsed:', JSON.stringify(requestData, null, 2))

    // Validate request
    if (!requestData.file_content || !requestData.column_mapping) {
      console.error('Missing required fields:', {
        hasFileContent: !!requestData.file_content,
        hasColumnMapping: !!requestData.column_mapping
      })
      return new Response(
        JSON.stringify({ error: 'Missing file content or column mapping' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user and company information
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'User authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get user's company from company_members table
    const { data: membership, error: membershipError } = await supabaseClient
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership?.company_id) {
      console.error('Company membership error:', membershipError)
      return new Response(
        JSON.stringify({ error: 'User company membership not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Company membership found:', membership.company_id)

    // Decode file content
    let fileContent: string
    try {
      fileContent = atob(requestData.file_content)
      console.log('File decoded successfully, length:', fileContent.length)
    } catch (error) {
      console.error('File decoding error:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid file encoding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse CSV
    const rows = parseCSV(fileContent, requestData.has_header_row ?? true)
    console.log('CSV parsed, row count:', rows.length)
    
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data rows found in file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process rows and prepare data entries
    const dataEntries: any[] = []
    const errors: string[] = []
    const failedRows: { rowNumber: number; rowData: string[]; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1 + (requestData.has_header_row ? 1 : 0) // Account for header row

      try {
        console.log(`Processing row ${rowNum}:`, row)
        
        const activity_description = getColumnValue(row, requestData.column_mapping, 'activity_description')
        const quantityStr = getColumnValue(row, requestData.column_mapping, 'quantity')
        const unit = getColumnValue(row, requestData.column_mapping, 'unit')
        const ghgCategoryStr = getColumnValue(row, requestData.column_mapping, 'ghg_category')
        const activity_date = getColumnValue(row, requestData.column_mapping, 'activity_date')
        
        console.log(`Row ${rowNum} extracted values:`, {
          activity_description,
          quantityStr,
          unit,
          ghgCategoryStr,
          activity_date
        })
        
        // Validate required fields
        if (!activity_description || !quantityStr || !unit || !ghgCategoryStr) {
          const missing: string[] = []
          if (!activity_description) missing.push('activity_description')
          if (!quantityStr) missing.push('quantity')
          if (!unit) missing.push('unit')
          if (!ghgCategoryStr) missing.push('ghg_category')
          
          const errorMsg = `Missing required fields: ${missing.join(', ')}`
          console.error(`Row ${rowNum}: ${errorMsg}`)
          errors.push(`Row ${rowNum}: ${errorMsg}`)
          failedRows.push({ rowNumber: rowNum, rowData: row, error: errorMsg })
          continue
        }

        // Parse quantity
        const quantity = parseFloat(quantityStr)
        if (isNaN(quantity)) {
          const errorMsg = `Invalid quantity "${quantityStr}"`
          console.error(`Row ${rowNum}: ${errorMsg}`)
          errors.push(`Row ${rowNum}: ${errorMsg}`)
          failedRows.push({ rowNumber: rowNum, rowData: row, error: errorMsg })
          continue
        }

        // Validate GHG category
        const ghg_category = validateGHGCategory(ghgCategoryStr)
        if (!ghg_category) {
          const errorMsg = `Invalid GHG category "${ghgCategoryStr}"`
          console.error(`Row ${rowNum}: ${errorMsg}`)
          errors.push(`Row ${rowNum}: ${errorMsg}`)
          failedRows.push({ rowNumber: rowNum, rowData: row, error: errorMsg })
          continue
        }

        // Parse and validate date
        let formattedDate: string
        try {
          // Handle different date formats
          let dateObj: Date
          
          // Check if it's in DD-MM-YYYY format (common in Europe)
          if (activity_date.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
            const parts = activity_date.split(/[-/]/)
            if (parts.length === 3) {
              const day = parseInt(parts[0])
              const month = parseInt(parts[1])
              const year = parseInt(parts[2])
              
              // Create date object (month is 0-indexed in JS)
              dateObj = new Date(year, month - 1, day)
              
              // Validate the date is real (handles invalid dates like 31-02-2025)
              if (dateObj.getFullYear() !== year || 
                  dateObj.getMonth() !== (month - 1) || 
                  dateObj.getDate() !== day) {
                throw new Error('Invalid date values')
              }
            } else {
              throw new Error('Invalid date format')
            }
          } else {
            // Try standard date parsing for other formats
            dateObj = new Date(activity_date)
          }
          
          if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date')
          }
          
          // Format as YYYY-MM-DD for PostgreSQL
          formattedDate = dateObj.toISOString().split('T')[0]
        } catch (dateError) {
          const errorMsg = `Invalid date format "${activity_date}"`
          console.error(`Row ${rowNum}: ${errorMsg}`)
          errors.push(`Row ${rowNum}: ${errorMsg}`)
          failedRows.push({ rowNumber: rowNum, rowData: row, error: errorMsg })
          continue
        }

        // Parse optional emission factor
        let emission_factor: number | null = null
        const emissionFactorStr = getColumnValue(row, requestData.column_mapping, 'emission_factor')
        if (emissionFactorStr) {
          const parsedFactor = parseFloat(emissionFactorStr)
          if (isNaN(parsedFactor)) {
            const errorMsg = `Invalid emission factor "${emissionFactorStr}"`
            errors.push(`Row ${rowNum}: ${errorMsg}`)
            failedRows.push({ rowNumber: rowNum, rowData: row, error: errorMsg })
            continue
          }
          emission_factor = parsedFactor
        }

        // Get optional notes
        const notes = getColumnValue(row, requestData.column_mapping, 'notes') || null

        // Get optional supplier/vendor
        const supplier_vendor = getColumnValue(row, requestData.column_mapping, 'supplier_vendor') || null

        // Get optional cost
        let cost: number | null = null
        const costStr = getColumnValue(row, requestData.column_mapping, 'cost')
        if (costStr) {
          const parsedCost = parseFloat(costStr)
          if (!isNaN(parsedCost)) {
            cost = parsedCost
          }
        }

        // Get optional currency
        const currency = getColumnValue(row, requestData.column_mapping, 'currency') || null

        // Map the ghg_category to the enum format for the data_entry table
        const ghgCategoryMap = {
          scope1: 'Scope 1',
          scope2: 'Scope 2', 
          scope3: 'Scope 3'
        }

        // Add to data_entry table entries
        dataEntries.push({
          company_id: membership.company_id,
          activity_description,
          quantity,
          unit,
          date: formattedDate,
          ghg_category: ghgCategoryMap[ghg_category],
          notes,
          supplier_vendor,
          cost,
          currency,
          source_type: 'csv',
          status: 'validated',
          created_by: user.id,
          created_at: new Date().toISOString()
        })

      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // If there are errors but some valid entries, we can still proceed
    if (dataEntries.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid data entries found',
          validation_errors: errors,
          failed_rows: failedRows
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert all valid entries to data_entry table
    console.log('Attempting to insert', dataEntries.length, 'entries:', JSON.stringify(dataEntries[0], null, 2))
    
    const { data, error } = await supabaseClient
      .from('data_entry')
      .insert(dataEntries)
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save entries to database', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed_rows: dataEntries.length,
        total_rows: rows.length,
        validation_errors: errors,
        data: data,
        message: `Successfully processed ${dataEntries.length} entries from ${requestData.file_name}`,
        failed_rows: failedRows
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
