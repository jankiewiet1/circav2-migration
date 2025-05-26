# AWS Textract Integration Setup Guide

This guide will help you set up AWS Textract for enhanced PDF processing in your Carbon Data Agent application.

## Overview

The enhanced AI data processing system combines:
- **AWS Textract**: High-accuracy text and table extraction from PDFs
- **GPT-4**: Intelligent interpretation of extracted data for carbon accounting
- **Fallback System**: Graceful degradation to GPT-4 Vision if Textract is unavailable

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Installed and configured (optional but recommended)
3. **IAM Permissions**: Access to Textract and S3 services

## Step 1: Create AWS IAM User

1. **Log into AWS Console**: Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)

2. **Create New User**:
   - Click "Users" → "Add users"
   - Username: `carbon-data-textract-user`
   - Access type: ✅ Programmatic access

3. **Attach Policies**:
   - Click "Attach existing policies directly"
   - Search and select:
     - `AmazonTextractFullAccess`
     - `AmazonS3ReadOnlyAccess` (for downloading files)

4. **Create User**:
   - Review and create
   - **IMPORTANT**: Save the Access Key ID and Secret Access Key

## Step 2: Configure Environment Variables

Add your AWS credentials to the `.env` file:

```bash
# AWS Configuration for Textract
VITE_AWS_ACCESS_KEY_ID=AKIA...your_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
VITE_AWS_REGION=us-east-1
```

**Security Note**: In production, use AWS IAM roles or AWS Secrets Manager instead of environment variables.

## Step 3: Test AWS Textract Access

Create a test script to verify your setup:

```javascript
// test-textract.js
import { AWSTextractService } from './src/services/awsTextractService.js';

async function testTextract() {
  try {
    const service = AWSTextractService.fromEnvironment();
    console.log('✅ AWS Textract service initialized successfully');
    
    // Test with a sample PDF URL
    const testUrl = 'https://example.com/sample.pdf';
    // const result = await service.processPDFFromURL(testUrl);
    // console.log('✅ Textract processing test successful');
    
  } catch (error) {
    console.error('❌ Textract setup error:', error.message);
  }
}

testTextract();
```

## Step 4: Verify Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Check the AI Uploader**:
   - Navigate to the Data Upload page
   - Look for the "Enhanced" badge next to "AI-Powered Data Upload"
   - You should see: "Enhanced AI with AWS Textract for superior PDF text and table extraction"

3. **Test with a PDF**:
   - Upload a PDF file
   - Check the browser console for Textract processing logs
   - Verify enhanced extraction accuracy

## Step 5: AWS Regions and Pricing

### Supported Regions
AWS Textract is available in these regions:
- `us-east-1` (N. Virginia) - **Recommended**
- `us-east-2` (Ohio)
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-2` (Sydney)

### Pricing (as of 2024)
- **DetectDocumentText**: $0.0015 per page
- **AnalyzeDocument**: $0.05 per page (includes tables and forms)
- **Free Tier**: 1,000 pages per month for first 3 months

## Step 6: Production Considerations

### Security Best Practices

1. **Use IAM Roles** (recommended for production):
   ```javascript
   // Instead of access keys, use IAM roles
   const textractClient = new TextractClient({
     region: 'us-east-1',
     // Credentials automatically obtained from IAM role
   });
   ```

2. **Restrict IAM Permissions**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "textract:DetectDocumentText",
           "textract:AnalyzeDocument"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. **Environment-specific Configuration**:
   ```javascript
   // Use different credentials for different environments
   const config = {
     development: {
       accessKeyId: process.env.DEV_AWS_ACCESS_KEY_ID,
       secretAccessKey: process.env.DEV_AWS_SECRET_ACCESS_KEY,
     },
     production: {
       // Use IAM roles in production
       region: 'us-east-1'
     }
   };
   ```

### Performance Optimization

1. **File Size Limits**:
   - Maximum file size: 10 MB for synchronous processing
   - For larger files, use asynchronous processing

2. **Caching Strategy**:
   ```javascript
   // Cache Textract results to avoid reprocessing
   const cacheKey = `textract_${fileHash}`;
   const cachedResult = await cache.get(cacheKey);
   if (cachedResult) {
     return cachedResult;
   }
   ```

3. **Batch Processing**:
   ```javascript
   // Process multiple files efficiently
   const results = await Promise.allSettled(
     files.map(file => textractService.processPDF(file))
   );
   ```

## Troubleshooting

### Common Issues

1. **"AWS credentials not found"**:
   - Verify `.env` file has correct AWS credentials
   - Check environment variable names match exactly
   - Restart development server after adding credentials

2. **"Access Denied" errors**:
   - Verify IAM user has `AmazonTextractFullAccess` policy
   - Check AWS region is supported
   - Ensure credentials are for the correct AWS account

3. **"Region not supported"**:
   - Change `VITE_AWS_REGION` to a supported region (e.g., `us-east-1`)
   - Update IAM policies if region-specific

4. **High processing costs**:
   - Monitor usage in AWS Cost Explorer
   - Implement caching to avoid reprocessing
   - Consider file size limits

### Fallback Behavior

If Textract fails, the system automatically falls back to GPT-4 Vision:

```javascript
// Automatic fallback is built into the enhanced service
const enhancedService = new EnhancedAIDataProcessingService();
const result = await enhancedService.extractFromPDF(url);
// Will use Textract if available, GPT-4 Vision if not
```

## Monitoring and Logging

### AWS CloudWatch
Monitor Textract usage and errors:
- API call volume
- Error rates
- Processing latency

### Application Logging
```javascript
// Enhanced logging for debugging
console.log('Textract processing:', {
  textLength: result.extractedText.length,
  tablesCount: result.tables.length,
  confidence: result.overallConfidence,
  processingTime: Date.now() - startTime
});
```

## Next Steps

1. **Test with Various PDF Types**:
   - Utility bills
   - Invoices
   - Receipts
   - Financial statements

2. **Monitor Performance**:
   - Track extraction accuracy
   - Monitor processing times
   - Analyze cost per document

3. **Optimize for Your Use Case**:
   - Fine-tune confidence thresholds
   - Customize document type classification
   - Implement domain-specific validation

## Support

For issues with this integration:
1. Check the browser console for error messages
2. Verify AWS credentials and permissions
3. Test with the AWS CLI: `aws textract detect-document-text --document '{"Bytes":"..."}'`
4. Review AWS CloudWatch logs for API errors

For AWS Textract specific issues, consult the [AWS Textract Documentation](https://docs.aws.amazon.com/textract/). 