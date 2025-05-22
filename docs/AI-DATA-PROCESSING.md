# AI Data Processing Configuration

This document explains how the AI-powered data extraction works in the Carbon Data Agent and how to troubleshoot common issues.

## Architecture

We use a secure architecture that keeps your OpenAI API key safe:

1. **Client-side:** The web application uploads files to Supabase Storage and calls Supabase Edge Functions
2. **Server-side:** The Supabase Edge Function uses your OpenAI API key to process files and extract data
3. **Security:** Your OpenAI API key is stored as a secret in Supabase, not in the client-side code

## Setting Up

### 1. Create and Deploy the Edge Function

```bash
# Deploy the edge function to your Supabase project
npm run deploy:functions
```

This script will:
- Check if you have the Supabase CLI installed
- Deploy the `process-ai-data` function to your Supabase project
- Set your OpenAI API key as a secret in Supabase

### 2. Configure Storage

Make sure you have the `data-uploads` bucket in Supabase Storage:

```bash
# Check and create the storage bucket if needed
npm run create-storage-bucket
```

## Supported File Types

The AI processing service supports the following file types:

### For Document Processing
- PDF files (`.pdf`)

### For Spreadsheet Data
- Excel files (`.xlsx`, `.xls`)
- CSV files (`.csv`)

## How It Works

The system uses a template-based approach to extract data:

1. **File Upload**: Files are uploaded to Supabase Storage
2. **Processing**: The Edge Function uses GPT-4o to generate a structured template based on the file type
3. **Extraction**: The system returns a JSON template with fields mapped to our carbon data model
4. **Manual Completion**: Users review and complete any missing fields

This approach ensures compatibility with different file types without requiring complex image processing.

## Troubleshooting

### "Bucket not found" Error

If you see "Bucket not found" errors, it means the Supabase Storage bucket isn't properly set up:

1. Go to your [Supabase Dashboard](https://app.supabase.io/project/vfdbyvnjhimmnbyhxyun/storage/buckets)
2. Create a bucket named exactly `data-uploads`
3. Make sure the bucket has the correct RLS policies (see `docs/carbon-data-agent-upload-fix.md`)

### "File is not a PDF" or "File is not an Excel" Error

If you see errors about unsupported file formats:

1. Ensure you're uploading one of the supported file types listed above
2. For documents, make sure you're using PDF format
3. For spreadsheets, use Excel (XLSX/XLS) or CSV formats

### "Timeout while downloading" Error

If you encounter timeout errors:

1. Check that your file isn't too large (keep files under 20MB if possible)
2. Ensure your network connection is stable
3. Try compressing or reducing the size of large files before uploading
4. For very large Excel files, consider exporting to CSV format first

### "401 Incorrect API key provided" Error

If you see authentication errors with OpenAI:

1. Check that you've deployed the edge function with a valid API key:
   ```bash
   npm run deploy:functions
   ```

2. Verify the key in your Supabase dashboard:
   - Go to [Supabase Dashboard > Functions > Secrets](https://app.supabase.io/project/vfdbyvnjhimmnbyhxyun/functions/secrets)
   - Check that `OPENAI_API_KEY` is set with your full API key

3. Make sure your OpenAI account has:
   - A valid payment method
   - GPT-4o API access enabled
   - Sufficient quota for API calls

## Clean Up Old Functions

If you have many unused functions cluttering your Supabase project:

1. Go to [Supabase Dashboard > Edge Functions](https://app.supabase.io/project/vfdbyvnjhimmnbyhxyun/functions)
2. Delete any unused or outdated functions
3. Run `npm run deploy:functions` and answer 'y' when asked to delete existing functions

## Code Structure

- `src/services/aiDataProcessingService.ts` - Client-side service that calls Supabase functions
- `supabase/functions/process-ai-data/index.ts` - Server-side Edge Function for AI processing
- `scripts/deploy-supabase-functions.js` - Deployment script for Edge Functions 