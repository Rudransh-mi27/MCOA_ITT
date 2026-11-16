/**
 * Pushover Emergency Notification Service
 * Sends emergency priority push notification with a siren sound to mobile devices.
 */

const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

/**
 * Send an emergency Pushover alert with siren sound and continuous retry
 * @param {Object} alert - Alert payload containing deviceId, location, gasLevel, etc.
 * @returns {Promise<Object>} Delivery result
 */
const sendPushoverAlert = async (alert) => {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const appToken = process.env.PUSHOVER_APP_TOKEN;

  // Fallback to Mock if credentials are not configured or MOCK_MODE is enabled
  if (!userKey || !appToken || userKey.startsWith('your_') || process.env.MOCK_ALERTS === 'true') {
    console.log(`🔔 [PUSHOVER MOCK] Emergency siren triggered for Device: ${alert.deviceId} | Gas Level: ${alert.gasLevel}`);
    return {
      success: true,
      service: 'pushover',
      mock: true,
      message: 'Simulated Pushover emergency siren alert'
    };
  }

  try {
    const title = '🚨 EMERGENCY: LPG Gas Leak Detected!';
    const message = [
      `Device ID: ${alert.deviceId}`,
      `Location: ${alert.location || 'Unknown Location'}`,
      `Gas Level: ${alert.gasLevel} PPM`,
      `Severity: ${alert.severity || 'CRITICAL'}`,
      `Time: ${new Date().toLocaleString()}`,
      `Action: Evacuate immediately and shut off the main gas valve!`
    ].join('\n');

    const payload = new URLSearchParams({
      token: appToken,
      user: userKey,
      title: title,
      message: message,
      priority: '2', // Emergency Priority (bypasses DND on supported devices)
      sound: 'siren', // Emergency Siren alarm sound
      retry: '30', // Repeat notification every 30 seconds until acknowledged
      expire: '600' // Expire after 10 minutes (600 seconds)
    });

    const response = await fetch(PUSHOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== 1) {
      throw new Error(responseData.errors ? responseData.errors.join(', ') : `HTTP ${response.status}`);
    }

    console.log(`✅ [PUSHOVER] Emergency siren sent successfully to user device for Device: ${alert.deviceId}`);
    return {
      success: true,
      service: 'pushover',
      receipt: responseData.receipt,
      data: responseData
    };
  } catch (error) {
    console.error(`❌ [PUSHOVER ERROR] Failed to send Pushover alert: ${error.message}`);
    return {
      success: false,
      service: 'pushover',
      error: error.message
    };
  }
};

module.exports = {
  sendPushoverAlert
};
