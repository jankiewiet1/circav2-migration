# AI-Powered Carbon Data Agent

## Overview

The AI-Powered Carbon Data Agent is a feature that uses artificial intelligence to streamline and automate the process of carbon data entry, extraction, and categorization. It's designed to save time, reduce errors, and make carbon accounting more accessible.

## Key Features

1. **Intelligent Data Extraction**
   - Extract structured data from CSV files, PDFs, and images
   - Automatically map fields to standardized carbon accounting data model
   - Confidence scoring for each extraction and mapping

2. **AI-Assisted Field Mapping**
   - Automatic detection of data fields from uploaded files
   - Smart suggestions for mapping custom fields to standard formats
   - Interactive corrections with AI guidance

3. **Interactive Chat Assistant**
   - Context-aware assistance for resolving ambiguous mappings
   - Help with carbon accounting terminology and best practices
   - Guidance for improving data quality

4. **Scheduled Data Syncing**
   - Set up automatic imports from various data sources
   - Schedule regular imports from email, APIs, or file storage
   - Automated processing and validation

5. **Error Handling and Monitoring**
   - Comprehensive error logging and monitoring
   - Detailed reporting on data quality issues
   - Suggestions for improving data inputs

## How It Works

### Data Upload Process

1. **Upload Files**
   - Drag and drop CSV, Excel, PDF, or image files
   - Or set up automated imports from email or API connections

2. **AI Processing**
   - The system uses GPT-4 to analyze the uploaded data
   - Identifies relevant fields for carbon accounting
   - Maps to standardized format with confidence scores

3. **Review and Validate**
   - Preview extracted data with confidence indicators
   - Make corrections with AI assistance if needed
   - Get help from the chat assistant for ambiguous fields

4. **Save to Database**
   - Validated data is saved to the structured data model
   - Ready for emissions calculations and reporting
   - Full audit trail of AI processing and human validation

## Technical Implementation

### Data Model

The system uses a structured data model designed for carbon accounting:

```sql
CREATE TABLE data_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  -- Basic data fields
  date DATE NOT NULL,
  source_type data_entry_source_type NOT NULL,
  supplier_vendor TEXT,
  activity_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  currency TEXT,
  cost NUMERIC,
  
  -- Categorization
  ghg_category ghg_category NOT NULL,
  emission_factor_reference TEXT,
  
  -- Metadata
  status data_entry_status NOT NULL DEFAULT 'raw',
  custom_tags JSONB,
  notes TEXT,
  
  -- AI processing tracking
  ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_confidence FLOAT,
  ai_notes TEXT,
  original_file_reference TEXT
);
```

### AI Integration

The system integrates with OpenAI's GPT-4 model to provide:

1. **Field Mapping**: Matching headers from imported data to standardized fields
2. **PDF Extraction**: Using GPT-4 Vision to extract structured data from PDFs and images
3. **Chat Assistance**: Providing context-aware help for data mapping and validation

### Services

The system includes several key services:

1. **AIDataProcessingService**: Handles AI-powered data extraction and field mapping
2. **DataEntryService**: Manages database operations for data entries
3. **ErrorMonitoringService**: Tracks and logs errors in the AI processing pipeline
4. **ScheduledSyncService**: Manages automated data imports and processing

## Best Practices

1. **Review AI Suggestions**
   - Always review field mappings with medium or low confidence
   - Use the chat assistant to resolve ambiguous mappings
   - Validate complex PDF extractions manually

2. **Improve Data Quality**
   - Use consistent formats for your source data
   - Include clear headers in CSV files
   - Provide complete information for each entry

3. **Monitor and Learn**
   - Review error logs to identify common issues
   - Improve input data based on AI feedback
   - Use the chat assistant to learn more about carbon accounting

## Security and Privacy

- All data processing occurs securely within the application
- AI models do not retain your data after processing
- File uploads are encrypted and stored securely
- Access controls ensure only authorized users can view and manage data

## Getting Help

If you need assistance using the AI-powered carbon data agent:

1. Use the built-in chat assistant for context-aware help
2. Contact support at info@circa.site
