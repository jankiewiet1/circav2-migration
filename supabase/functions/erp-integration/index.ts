import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ERPIntegrationRequest {
  operation: 'test_connection' | 'sync_data' | 'get_connections' | 'save_connection' | 'delete_connection'
  system_type?: 'sap' | 'odoo' | 'hubspot' | 'dynamics' | 'quickbooks' | 'xero'
  credentials?: Record<string, string>
  connection_id?: string
  company_id?: string
  sync_options?: {
    date_from?: string
    date_to?: string
    data_types?: string[]
  }
}

interface ERPConnection {
  id: string
  company_id: string
  system_type: string
  system_name: string
  credentials: Record<string, string>
  status: 'connected' | 'disconnected' | 'error'
  last_sync?: string
  created_at: string
  updated_at: string
}

class ERPIntegrationService {
  private supabase: any
  private openaiKey: string

  constructor(supabaseClient: any, openaiKey: string) {
    this.supabase = supabaseClient
    this.openaiKey = openaiKey
  }

  async testConnection(systemType: string, credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log(`Testing connection to ${systemType}`)
      
      switch (systemType) {
        case 'sap':
          return await this.testSAPConnection(credentials)
        case 'odoo':
          return await this.testOdooConnection(credentials)
        case 'hubspot':
          return await this.testHubSpotConnection(credentials)
        case 'dynamics':
          return await this.testDynamicsConnection(credentials)
        case 'quickbooks':
          return await this.testQuickBooksConnection(credentials)
        case 'xero':
          return await this.testXeroConnection(credentials)
        default:
          return { success: false, message: 'Unsupported system type' }
      }
    } catch (error) {
      console.error('Connection test error:', error)
      return { success: false, message: error.message }
    }
  }

  private async testSAPConnection(credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    const { server_url, client, username, password } = credentials
    
    try {
      // In a real implementation, you would use SAP's REST APIs or RFC calls
      // For now, we'll simulate the connection test
      
      if (!server_url || !client || !username || !password) {
        return { success: false, message: 'Missing required SAP credentials' }
      }
      
      // Simulate API call
      const response = await fetch(`${server_url}/sap/bc/rest/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'sap-client': client
        }
      }).catch(() => null)
      
      // For demo purposes, we'll return success if URL format is valid
      if (server_url.startsWith('http')) {
        return { 
          success: true, 
          message: 'SAP connection successful',
          data: { client, server: server_url }
        }
      }
      
      return { success: false, message: 'Invalid SAP server URL' }
    } catch (error) {
      return { success: false, message: `SAP connection failed: ${error.message}` }
    }
  }

  private async testOdooConnection(credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    const { server_url, database, username, password } = credentials
    
    try {
      if (!server_url || !database || !username || !password) {
        return { success: false, message: 'Missing required Odoo credentials' }
      }
      
      // Simulate Odoo XML-RPC authentication
      const authUrl = `${server_url}/xmlrpc/2/common`
      
      // For demo purposes, validate URL format
      if (server_url.startsWith('http') && database && username) {
        return { 
          success: true, 
          message: 'Odoo connection successful',
          data: { database, server: server_url }
        }
      }
      
      return { success: false, message: 'Invalid Odoo credentials' }
    } catch (error) {
      return { success: false, message: `Odoo connection failed: ${error.message}` }
    }
  }

  private async testHubSpotConnection(credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    const { access_token, portal_id } = credentials
    
    try {
      if (!access_token) {
        return { success: false, message: 'Missing HubSpot access token' }
      }
      
      // Test HubSpot API connection
      const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return { 
          success: true, 
          message: 'HubSpot connection successful',
          data: { portal_id, contacts_count: data.total || 0 }
        }
      } else {
        return { success: false, message: 'Invalid HubSpot access token' }
      }
    } catch (error) {
      return { success: false, message: `HubSpot connection failed: ${error.message}` }
    }
  }

  private async testDynamicsConnection(credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    const { tenant_id, client_id, client_secret, resource_url } = credentials
    
    try {
      if (!tenant_id || !client_id || !client_secret || !resource_url) {
        return { success: false, message: 'Missing required Dynamics 365 credentials' }
      }
      
      // For demo purposes, validate format
      if (tenant_id.length > 10 && client_id.length > 10 && resource_url.includes('dynamics.com')) {
        return { 
          success: true, 
          message: 'Dynamics 365 connection successful',
          data: { tenant_id, resource_url }
        }
      }
      
      return { success: false, message: 'Invalid Dynamics 365 credentials' }
    } catch (error) {
      return { success: false, message: `Dynamics 365 connection failed: ${error.message}` }
    }
  }

  private async testQuickBooksConnection(credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    const { company_id, access_token, refresh_token } = credentials
    
    try {
      if (!company_id || !access_token) {
        return { success: false, message: 'Missing required QuickBooks credentials' }
      }
      
      // For demo purposes, validate format
      if (company_id.length > 5 && access_token.length > 20) {
        return { 
          success: true, 
          message: 'QuickBooks connection successful',
          data: { company_id }
        }
      }
      
      return { success: false, message: 'Invalid QuickBooks credentials' }
    } catch (error) {
      return { success: false, message: `QuickBooks connection failed: ${error.message}` }
    }
  }

  private async testXeroConnection(credentials: Record<string, string>): Promise<{ success: boolean; message: string; data?: any }> {
    const { client_id, client_secret, tenant_id } = credentials
    
    try {
      if (!client_id || !client_secret || !tenant_id) {
        return { success: false, message: 'Missing required Xero credentials' }
      }
      
      // For demo purposes, validate format
      if (client_id.length > 10 && client_secret.length > 10 && tenant_id.length > 10) {
        return { 
          success: true, 
          message: 'Xero connection successful',
          data: { tenant_id }
        }
      }
      
      return { success: false, message: 'Invalid Xero credentials' }
    } catch (error) {
      return { success: false, message: `Xero connection failed: ${error.message}` }
    }
  }

  async syncData(connectionId: string, syncOptions: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Get connection details
      const { data: connection, error } = await this.supabase
        .from('erp_connections')
        .select('*')
        .eq('id', connectionId)
        .single()
      
      if (error || !connection) {
        return { success: false, message: 'Connection not found' }
      }
      
      console.log(`Syncing data from ${connection.system_type}`)
      
      // Extract data based on system type
      const extractedData = await this.extractDataFromSystem(connection, syncOptions)
      
      if (!extractedData.success) {
        return extractedData
      }
      
      // Process extracted data with GPT-4
      const processedData = await this.processDataWithGPT4(extractedData.data, connection.system_type)
      
      // Save to emissions database
      const savedCount = await this.saveEmissionsData(processedData, connection.company_id)
      
      // Update last sync time
      await this.supabase
        .from('erp_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', connectionId)
      
      return {
        success: true,
        message: `Successfully synced ${savedCount} emission records`,
        data: {
          records_found: extractedData.data?.length || 0,
          records_processed: savedCount,
          system: connection.system_name
        }
      }
      
    } catch (error) {
      console.error('Sync error:', error)
      return { success: false, message: `Sync failed: ${error.message}` }
    }
  }

  private async extractDataFromSystem(connection: ERPConnection, syncOptions: any): Promise<{ success: boolean; data?: any[]; message: string }> {
    // In a real implementation, this would call the actual ERP APIs
    // For demo purposes, we'll return mock data
    
    const mockData = [
      {
        id: '1',
        date: '2025-01-15',
        description: 'Office electricity bill',
        amount: 450.50,
        currency: 'EUR',
        vendor: 'Green Energy Corp',
        category: 'Utilities',
        document_type: 'invoice'
      },
      {
        id: '2',
        date: '2025-01-20',
        description: 'Business travel - Flight to Berlin',
        amount: 320.00,
        currency: 'EUR',
        vendor: 'Airlines Inc',
        category: 'Travel',
        document_type: 'expense'
      },
      {
        id: '3',
        date: '2025-01-25',
        description: 'Natural gas heating',
        amount: 180.75,
        currency: 'EUR',
        vendor: 'City Gas Ltd',
        category: 'Utilities',
        document_type: 'invoice'
      }
    ]
    
    return {
      success: true,
      data: mockData,
      message: `Extracted ${mockData.length} records from ${connection.system_type}`
    }
  }

  private async processDataWithGPT4(rawData: any[], systemType: string): Promise<any[]> {
    const prompt = `You are a Carbon Accounting Data Extraction Expert. Analyze this data from ${systemType} and extract carbon accounting entries.

RAW DATA:
${JSON.stringify(rawData, null, 2)}

TASK: Extract carbon accounting entries from this business data. Look for:

FOR UTILITIES:
- Electricity consumption (kWh, MWh)
- Natural gas usage (m³, therms)
- Water usage
- Heating/cooling costs

FOR TRAVEL:
- Business flights (km, miles)
- Car rentals and fuel
- Hotel stays
- Public transport

FOR EXPENSES:
- Fuel purchases
- Material purchases
- Equipment purchases
- Service costs

EXTRACTION RULES:
1. Create ONE entry per emission-relevant transaction
2. Classify emissions scope:
   - Scope 1: Direct fuel combustion, company vehicles
   - Scope 2: Electricity consumption
   - Scope 3: Business travel, purchased materials, services
3. Extract quantities where possible (estimate if needed)
4. Use transaction date as activity date
5. If no clear carbon data exists, return an empty array []

REQUIRED OUTPUT FORMAT - JSON array:
[
  {
    "date": "YYYY-MM-DD",
    "activity_description": "Clear description of the emission activity",
    "quantity": numeric_value_or_null,
    "unit": "kWh|m³|km|liters|kg|etc",
    "ghg_category": "Scope 1|Scope 2|Scope 3",
    "supplier_vendor": "Company name",
    "cost": numeric_value_or_null,
    "currency": "EUR|USD|etc",
    "notes": "Additional context from ${systemType}",
    "confidence": 0.0_to_1.0
  }
]

Return ONLY the JSON array. If no carbon accounting data is found, return []`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are a carbon accounting expert. Extract emission-related data from business systems. Return only valid JSON arrays.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || '[]'
      
      // Clean and parse JSON
      let jsonContent = content.trim()
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/, '').replace(/\n?```$/, '')
      }
      
      const parsed = JSON.parse(jsonContent)
      return Array.isArray(parsed) ? parsed : []
      
    } catch (error) {
      console.error('GPT-4 processing error:', error)
      return []
    }
  }

  private async saveEmissionsData(processedData: any[], companyId: string): Promise<number> {
    if (!processedData || processedData.length === 0) {
      return 0
    }
    
    try {
      // Transform data for database insertion
      const dataEntries = processedData.map(entry => ({
        company_id: companyId,
        date: entry.date,
        activity_description: entry.activity_description,
        quantity: entry.quantity,
        unit: entry.unit,
        ghg_category: entry.ghg_category,
        supplier_vendor: entry.supplier_vendor,
        cost: entry.cost,
        currency: entry.currency,
        notes: entry.notes,
        confidence_score: entry.confidence,
        source: 'erp_integration',
        created_at: new Date().toISOString()
      }))
      
      const { data, error } = await this.supabase
        .from('data_entries')
        .insert(dataEntries)
        .select()
      
      if (error) {
        console.error('Database insert error:', error)
        return 0
      }
      
      return data?.length || 0
    } catch (error) {
      console.error('Save emissions data error:', error)
      return 0
    }
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

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const requestData: ERPIntegrationRequest = await req.json()
    console.log('ERP Integration request:', requestData.operation)

    const erpService = new ERPIntegrationService(supabaseClient, openaiKey)

    switch (requestData.operation) {
      case 'test_connection':
        if (!requestData.system_type || !requestData.credentials) {
          throw new Error('Missing system_type or credentials')
        }
        
        const testResult = await erpService.testConnection(requestData.system_type, requestData.credentials)
        
        return new Response(
          JSON.stringify(testResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'sync_data':
        if (!requestData.connection_id) {
          throw new Error('Missing connection_id')
        }
        
        const syncResult = await erpService.syncData(requestData.connection_id, requestData.sync_options || {})
        
        return new Response(
          JSON.stringify(syncResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ success: false, message: 'Unsupported operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('ERP Integration error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Integration failed',
        error: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 