/**
 * Mock Alert Dispatcher Service
 * Temporary mock placeholder for Track 2 (Twilio SMS/Voice integration)
 */

const triggerEmergencyAlert = async (alertData) => {
  console.log(
    `🚨 [MOCK DISPATCHER] Triggering emergency call/SMS for Device: ${alertData.deviceId} | Location: ${alertData.location || 'Unknown Location'} | Gas Level: ${alertData.gasLevel}`
  );
  return true;
};

module.exports = {
  triggerEmergencyAlert
};

