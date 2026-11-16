/**
 * Textbee SMS Gateway Service
 * Sends emergency SMS notifications via Textbee gateway and connected Android device.
 */

const TEXTBEE_BASE_URL = 'https://api.textbee.dev/api/v1/gateway/devices';

/**
 * Send an emergency SMS via Textbee
 * @param {Object} alert - Alert details (deviceId, location, gasLevel, severity)
 * @returns {Promise<Object>} Delivery result
 */
const sendTextbeeSMS = async (alert) => {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const targetNumber = process.env.ALERT_PHONE_NUMBER;

  // Fallback to Mock if credentials are not configured or MOCK_MODE is enabled
  const isMockConfig =
    !apiKey ||
    !deviceId ||
    !targetNumber ||
    apiKey.startsWith('your_') ||
    deviceId.startsWith('your_') ||
    process.env.MOCK_ALERTS === 'true';

  if (isMockConfig) {
    console.log(
      `📱 [TEXTBEE SMS MOCK] Emergency SMS dispatched to ${targetNumber || '+91-MOCK-PHONE'} | Device: ${alert.deviceId} | Gas Level: ${alert.gasLevel}`
    );
    return {
      success: true,
      service: 'textbee_sms',
      mock: true,
      message: 'Simulated Textbee emergency SMS alert'
    };
  }

  try {
    const endpoint = `${TEXTBEE_BASE_URL}/${deviceId}/sendSMS`;

    const message = [
      `🚨 [EMERGENCY ALERT] LPG Leak Detected!`,
      `Device: ${alert.deviceId}`,
      `Location: ${alert.location || 'Unknown Location'}`,
      `Gas Level: ${alert.gasLevel} PPM`,
      `Severity: ${alert.severity || 'CRITICAL'}`,
      `Time: ${new Date().toLocaleTimeString()}`,
      `Evacuate premises immediately!`
    ].join('\n');

    const payload = {
      recipients: [targetNumber],
      message: message
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData?.message || `HTTP ${response.status}`);
    }

    console.log(`✅ [TEXTBEE SMS] Emergency SMS successfully dispatched to ${targetNumber}`);
    return {
      success: true,
      service: 'textbee_sms',
      data: responseData
    };
  } catch (error) {
    console.error(`❌ [TEXTBEE SMS ERROR] Failed to send SMS: ${error.message}`);
    return {
      success: false,
      service: 'textbee_sms',
      error: error.message
    };
  }
};

module.exports = {
  sendTextbeeSMS
};
