/**
 * Diagnostic Script: Payment URL Configuration Checker
 * 
 * This script helps diagnose URL configuration issues in the payment system.
 * Run this from the backend directory: node scripts/diagnose-payment-urls.js
 * 
 * It will:
 * 1. Check if .env file exists and is readable
 * 2. Load environment variables
 * 3. Verify all payment-related URLs
 * 4. Check Cashfree configuration
 * 5. Identify any HTTPS/HTTP mismatches
 * 6. Provide actionable fixes
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('PAYMENT URL CONFIGURATION DIAGNOSTIC TOOL');
console.log('='.repeat(80) + '\n');

// Step 1: Check if .env exists
console.log('📋 STEP 1: Checking .env file...');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found at:', envPath);
} else {
  console.error('❌ .env file NOT found at:', envPath);
  process.exit(1);
}

// Step 2: Load .env
console.log('\n📋 STEP 2: Loading .env file...');
const envConfig = dotenv.config({ path: envPath });
if (envConfig.error) {
  console.error('❌ Error reading .env:', envConfig.error);
  process.exit(1);
}
console.log('✅ .env file loaded successfully');

// Step 3: Check all URL environment variables
console.log('\n📋 STEP 3: Checking URL environment variables...');
const requiredVars = {
  'FRONTEND_URL': 'Frontend URL (where payment return happens)',
  'BACKEND_URL': 'Backend URL (where webhook is received)',
  'WEBHOOK_URL': 'Webhook URL (for Cashfree to send payment updates)',
  'CF_ENV': 'Cashfree environment (PROD or TEST)',
  'CF_CLIENT_ID': 'Cashfree Client ID',
  'CF_SECRET': 'Cashfree Secret Key'
};

const missingVars = [];
const urlVars = {};

for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    missingVars.push(varName);
  } else {
    // For secrets, only show first/last few chars
    let displayValue = value;
    if (varName === 'CF_SECRET' || varName === 'CF_CLIENT_ID') {
      displayValue = value.substring(0, 5) + '...' + value.substring(value.length - 5);
    }
    console.log(`✅ ${varName}: ${displayValue}`);
    if (['FRONTEND_URL', 'BACKEND_URL', 'WEBHOOK_URL'].includes(varName)) {
      urlVars[varName] = value;
    }
  }
}

// Step 4: Analyze URLs for HTTPS/HTTP compliance
console.log('\n📋 STEP 4: Analyzing URL compliance for Cashfree...');

const cfEnv = process.env.CF_ENV;
const cfIsProd = cfEnv === 'PROD';

console.log(`\nCashfree Environment: ${cfEnv} ${cfIsProd ? '(PRODUCTION)' : '(TEST/SANDBOX)'}`);

if (cfIsProd) {
  console.log('⚠️  Using Cashfree PRODUCTION - STRICT HTTPS requirement\n');

  let hasErrors = false;
  for (const [varName, url] of Object.entries(urlVars)) {
    const isHttps = url.startsWith('https://');
    const isHttp = url.startsWith('http://');

    if (isHttps) {
      console.log(`✅ ${varName}: Uses HTTPS (CORRECT)`);
      console.log(`   Value: ${url}`);
    } else if (isHttp) {
      console.log(`❌ ${varName}: Uses HTTP (WRONG - Cashfree PROD rejects HTTP)`);
      console.log(`   Value: ${url}`);
      hasErrors = true;
    } else {
      console.log(`⚠️  ${varName}: Missing protocol`);
      console.log(`   Value: ${url}`);
    }
  }

  if (hasErrors) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    console.log('Cashfree production API rejects HTTP URLs.');
    console.log('\nTo fix, choose ONE option:');
    console.log('\n1️⃣  Option 1: Update URLs in .env to use HTTPS');
    console.log('   FRONTEND_URL=https://dvisionacademy.com');
    console.log('   BACKEND_URL=https://api.dvisionacademy.com');
    console.log('   Then restart the backend server: npm start\n');

    console.log('2️⃣  Option 2: Use Cashfree TEST mode with sandbox credentials');
    console.log('   CF_ENV=TEST');
    console.log('   CF_CLIENT_ID=TEST103954469d9f07939b8254f92d8064459301');
    console.log('   CF_SECRET=cfsk_ma_test_aee2b63fdbfea01d9eb63072375cdcf4_b99408c6');
    console.log('   (Sandbox mode accepts any URL)\n');

    console.log('3️⃣  Option 3: Use NGROK for local HTTP→HTTPS tunneling');
    console.log('   npm install -g ngrok');
    console.log('   ngrok http 5000');
    console.log('   (Then use ngrok URL in FRONTEND_URL and BACKEND_URL)\n');
  }
} else {
  console.log('✅ Using Cashfree TEST/SANDBOX - Any URL is accepted\n');
  for (const [varName, url] of Object.entries(urlVars)) {
    console.log(`${varName}: ${url}`);
  }
}

// Step 5: Check webhook URL format
console.log('\n📋 STEP 5: Checking webhook URL format...');
const webhookUrl = process.env.WEBHOOK_URL;
if (webhookUrl) {
  if (webhookUrl.includes('/api/payment/webhook')) {
    console.log('✅ Webhook URL includes /api/payment/webhook path');
  } else {
    console.log('⚠️  Webhook URL might be missing /api/payment/webhook path');
    console.log(`   Current: ${webhookUrl}`);
    console.log(`   Should be: https://api.dvisionacademy.com/api/payment/webhook`);
  }
} else {
  console.log('⚠️  WEBHOOK_URL not set - using BACKEND_URL/api/payment/webhook instead');
}

// Step 6: Summary
console.log('\n' + '='.repeat(80));
console.log('DIAGNOSTIC SUMMARY');
console.log('='.repeat(80) + '\n');

if (missingVars.length > 0) {
  console.log(`❌ Missing ${missingVars.length} required variables: ${missingVars.join(', ')}`);
  console.log('   Add these to your .env file\n');
}

const httpUrlsInProd = Object.entries(urlVars)
  .filter(([_, url]) => cfIsProd && url.startsWith('http://'))
  .map(([name]) => name);

if (httpUrlsInProd.length > 0) {
  console.log(`❌ ${httpUrlsInProd.length} HTTP URL(s) found in PROD mode: ${httpUrlsInProd.join(', ')}`);
  console.log('   CASHFREE WILL REJECT THESE!\n');
}

if (missingVars.length === 0 && httpUrlsInProd.length === 0) {
  console.log('✅ All checks passed! Your configuration looks correct.\n');
}

console.log('='.repeat(80) + '\n');
console.log('NEXT STEPS:');
console.log('1. If there are errors above, fix them first');
console.log('2. Restart the backend server: npm start');
console.log('3. Check the server logs for URL configuration messages');
console.log('4. Try creating a payment order again\n');
console.log('='.repeat(80) + '\n');
