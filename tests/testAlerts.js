/**
 * LPG Guard System - Alert Integration Engine Test Suite
 * Tests/verifies:
 *  1. Pushover Siren Integration
 *  2. Textbee SMS Integration
 *  3. Twilio WhatsApp Integration
 *  4. Master Alert Dispatcher (Promise.allSettled)
 *
 * Usage:
 *  - Real Live Test: node tests/testAlerts.js
 *  - Mock Mode Test: node tests/testAlerts.js --mock
 */

const fs = require('fs');
const path = require('path');

// Zero-dependency native .env loader
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const { sendPushoverAlert } = require('../services/pushoverService');
const { sendTextbeeSMS } = require('../services/textbeeService');
const { sendWhatsApp } = require('../services/whatsappService');
const { dispatchAllAlerts } = require('../services/alertDispatcher');

// Check if running in mock mode via CLI argument
const isMockMode = process.argv.includes('--mock');
if (isMockMode) {
  process.env.MOCK_ALERTS = 'true';
  console.log('🧪 [TEST SUITE] Running in MOCK MODE (No real API requests will be sent)\n');
} else {
  console.log('🚀 [TEST SUITE] Running in LIVE MODE (Real notifications will be sent to registered device)\n');
}

// Sample LPG leakage test payload matching system specification
const sampleAlertPayload = {
  deviceId: 'LPG-NODE-DEV-01',
  location: 'Main Kitchen - Cylinder Unit A',
  gasLevel: 850, // PPM (Exceeds critical safety threshold)
  threshold: 400,
  severity: 'CRITICAL',
  timestamp: new Date().toISOString()
};

const runTestSuite = async () => {
  console.log('====================================================');
  console.log('      LPG GUARD - ALERT INTEGRATION ENGINE TESTS    ');
  console.log('====================================================');
  console.log('Alert Payload to Test:');
  console.log(JSON.stringify(sampleAlertPayload, null, 2));
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 1: Independent Pushover Siren Test ---');
  const pushoverRes = await sendPushoverAlert(sampleAlertPayload);
  console.log('Result:', pushoverRes);
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 2: Independent Textbee SMS Test ---');
  const textbeeRes = await sendTextbeeSMS(sampleAlertPayload);
  console.log('Result:', textbeeRes);
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 3: Independent Twilio WhatsApp Test ---');
  const whatsappRes = await sendWhatsApp(sampleAlertPayload);
  console.log('Result:', whatsappRes);
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 4: Master Alert Dispatcher (Parallel Dispatch) ---');
  const masterRes = await dispatchAllAlerts(sampleAlertPayload);
  console.log('\nMaster Dispatch Report:');
  console.log(JSON.stringify(masterRes, null, 2));
  console.log('----------------------------------------------------\n');

  console.log('====================================================');
  console.log('                 TEST SUITE SUMMARY                 ');
  console.log('====================================================');
  console.log(`Pushover Siren: ${masterRes.channels.pushover.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Textbee SMS:    ${masterRes.channels.textbee_sms.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`WhatsApp Alert: ${masterRes.channels.whatsapp.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Overall Status: ${masterRes.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log('====================================================\n');
};

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
