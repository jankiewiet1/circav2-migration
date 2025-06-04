#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Pattern to match Supabase JWT tokens
const SUPABASE_JWT_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

// Files to process (exclude node_modules and other directories)
const filesToProcess = [
  'test-source-unit-fix.js',
  'scripts/test-date-calculation.js',
  'scripts/check-dates.js',
  'scripts/run-embedding-generation.js',
  'check-embedding-status.js',
  'test-existing-data.js', 
  'test-unified-calculations.js',
  'test-source-debug.js',
  'check-current-data.js',
  'test-rag-simple.js',
  'analyze-emission-factors.js',
  'fix-emission-factor-data.js',
  'fix-scopes-properly.js',
  'fix-scopes-only.js',
  'check-table-columns.js',
  'check-calculation-data.js',
  'test-calculations-direct.js',
  'test-single-entry.js',
  'test-assistant-calculator.js',
  'check-current-scopes.js',
  'check-all-data.js',
  'setup-test-environment.js',
  'test-rag-fix.js',
  'scripts/run-full-embedding-generation.js',
  'scripts/test-upload-service.js',
  'scripts/create-storage-bucket.js',
  'scripts/climatiq/calculate-emissions.js',
  'tests/simple-emission-test.js',
  'tests/verify-supabase.js'
];

function replaceSecretsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⏩ Skipping ${filePath} (not found)`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace hardcoded Supabase keys with environment variable references
    content = content.replace(
      /const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'/g,
      "const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'"
    );
    
    content = content.replace(
      /const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"/g,
      'const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "your-anon-key-here"'
    );
    
    content = content.replace(
      /const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'/g,
      "const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'"
    );
    
    content = content.replace(
      /const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"/g,
      'const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-key-here"'
    );
    
    // Replace service role keys
    content = content.replace(
      /'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]*service_role[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+'/g,
      "process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here'"
    );
    
    content = content.replace(
      /"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]*service_role[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+"/g,
      'process.env.SUPABASE_SERVICE_ROLE_KEY || "your-service-role-key-here"'
    );
    
    // Replace any remaining JWT tokens in Authorization headers
    content = content.replace(
      /'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'/g,
      "'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'}`"
    );
    
    // Replace any remaining hardcoded anon keys
    content = content.replace(SUPABASE_JWT_PATTERN, 'process.env.SUPABASE_ANON_KEY');
    
    // Add environment variable check at the top if it's a standalone script
    if (content.includes('process.env.SUPABASE_ANON_KEY') && !content.includes('SUPABASE_ANON_KEY environment variable')) {
      const importLine = content.split('\n')[0];
      if (importLine.includes('import')) {
        const lines = content.split('\n');
        const insertIndex = lines.findIndex(line => !line.startsWith('import') && !line.startsWith('//') && line.trim() !== '');
        if (insertIndex > 0) {
          lines.splice(insertIndex, 0, 
            '',
            '// Environment variables check',
            'if (!process.env.SUPABASE_ANON_KEY) {',
            '  console.error("❌ SUPABASE_ANON_KEY environment variable is required");',
            '  console.error("Please set it in your environment");',
            '  process.exit(1);',
            '}'
          );
          content = lines.join('\n');
        }
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`⏩ No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔒 Removing hardcoded secrets from repository...\n');

let totalUpdated = 0;
for (const file of filesToProcess) {
  if (replaceSecretsInFile(file)) {
    totalUpdated++;
  }
}

console.log(`\n🎉 Secret removal complete!`);
console.log(`📊 Updated ${totalUpdated} files`);
console.log(`\n⚠️  Remember to set these environment variables:`);
console.log(`   SUPABASE_ANON_KEY=your-anon-key-here`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`);
console.log(`   OPENAI_API_KEY=your-openai-key-here`); 