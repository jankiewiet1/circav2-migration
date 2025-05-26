#!/usr/bin/env node

/**
 * Test script for Supabase connection
 * Run with: node scripts/test-supabase-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('🧪 Testing Supabase Connection\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking Supabase environment variables...');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log(`   VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  process.exit(1);
}

console.log('✅ Supabase environment variables found');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`);

// Test 2: Initialize Supabase client
console.log('\n2️⃣ Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client initialized');

// Test 3: Test basic connection
console.log('\n3️⃣ Testing basic connection...');
try {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .limit(1);
    
  if (error) {
    console.log('❌ Supabase query error:', error.message);
    console.log('   This might be normal if you need to be authenticated');
  } else {
    console.log('✅ Supabase connection successful!');
    console.log(`   Found ${data?.length || 0} companies`);
  }
} catch (e) {
  console.log('❌ Connection failed:', e.message);
}

// Test 4: Test storage bucket access
console.log('\n4️⃣ Testing storage bucket access...');
try {
  const { data, error } = await supabase.storage
    .from('data-uploads')
    .list('', { limit: 1 });
    
  if (error) {
    console.log('❌ Storage bucket error:', error.message);
    if (error.message.includes('not found')) {
      console.log('   💡 You may need to create the data-uploads bucket');
    }
  } else {
    console.log('✅ Storage bucket accessible!');
    console.log(`   Found ${data?.length || 0} files`);
  }
} catch (e) {
  console.log('❌ Storage test failed:', e.message);
}

// Test 5: Test authentication status
console.log('\n5️⃣ Testing authentication status...');
try {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.log('❌ Auth error:', error.message);
  } else if (user) {
    console.log('✅ User authenticated!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
  } else {
    console.log('⚠️  No user authenticated (this is normal for new setup)');
    console.log('   💡 You may need to log in through the app');
  }
} catch (e) {
  console.log('❌ Auth test failed:', e.message);
}

console.log('\n📋 Supabase Connection Test Summary:');
console.log('   ✅ Environment variables configured');
console.log('   ✅ Supabase client initialized');
console.log('   📝 Check above for any connection or permission issues');

console.log('\n💡 Next steps:');
console.log('   1. If storage bucket errors: Create data-uploads bucket in Supabase');
console.log('   2. If auth errors: Log in through the app first');
console.log('   3. If connection works: AWS Textract should work too');

console.log('\n📚 Supabase Dashboard: https://app.supabase.io/project/vfdbyvnjhimmnbyhxyun'); 