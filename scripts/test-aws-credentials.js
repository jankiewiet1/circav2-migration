#!/usr/bin/env node

/**
 * AWS Credentials Validation Test
 * Run with: node scripts/test-aws-credentials.js
 */

import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('🔐 AWS Credentials Validation Test\n');

// Get credentials from environment
const accessKeyId = process.env.VITE_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.VITE_AWS_SECRET_ACCESS_KEY;
const region = process.env.VITE_AWS_REGION;

console.log('1️⃣ Checking credential format...');
console.log(`   Access Key ID: ${accessKeyId}`);
console.log(`   Secret Key: ${secretAccessKey?.substring(0, 8)}...`);
console.log(`   Region: ${region}`);

// Validate format
const accessKeyPattern = /^AKIA[0-9A-Z]{16}$/;
const secretKeyPattern = /^[A-Za-z0-9/+=]{40}$/;

console.log('\n2️⃣ Validating credential format...');

if (!accessKeyPattern.test(accessKeyId)) {
  console.log('❌ Access Key ID format is invalid');
  console.log('   Expected format: AKIA followed by 16 alphanumeric characters');
  console.log(`   Your key: ${accessKeyId}`);
  console.log('   💡 Check for typos - should start with "AKIA" not "yAKIA"');
} else {
  console.log('✅ Access Key ID format is valid');
}

if (!secretKeyPattern.test(secretAccessKey)) {
  console.log('❌ Secret Access Key format is invalid');
  console.log('   Expected: 40 characters (letters, numbers, +, /, =)');
  console.log(`   Your key length: ${secretAccessKey?.length || 0}`);
} else {
  console.log('✅ Secret Access Key format is valid');
}

// Test credentials with AWS STS
console.log('\n3️⃣ Testing credentials with AWS STS...');

const stsClient = new STSClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

try {
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);
  
  console.log('✅ AWS credentials are valid!');
  console.log(`   Account ID: ${response.Account}`);
  console.log(`   User ARN: ${response.Arn}`);
  console.log(`   User ID: ${response.UserId}`);
  
} catch (error) {
  console.log('❌ AWS credentials test failed:');
  console.log(`   Error: ${error.name}`);
  console.log(`   Message: ${error.message}`);
  
  if (error.name === 'InvalidUserID.NotFound') {
    console.log('   💡 The Access Key ID does not exist');
  } else if (error.name === 'SignatureDoesNotMatch') {
    console.log('   💡 The Secret Access Key is incorrect');
  } else if (error.name === 'TokenRefreshRequired') {
    console.log('   💡 The security token is invalid or expired');
  }
}

console.log('\n📋 Summary:');
console.log('   If credentials are invalid, please:');
console.log('   1. Go to AWS IAM Console');
console.log('   2. Navigate to Users → carbon-data-textract-user');
console.log('   3. Go to Security credentials tab');
console.log('   4. Create new access keys if needed');
console.log('   5. Update your .env file with correct values');

console.log('\n🔗 AWS IAM Console: https://console.aws.amazon.com/iam/'); 