/**
 * Twilio WhatsApp Emergency Service
 * Dispatches emergency WhatsApp messages to registered contacts via Twilio WhatsApp API.
 */

/**
 * Send an emergency WhatsApp alert via Twilio
 * @param {Object} alert - Alert details (deviceId, location, gasLevel, severity)
 * @returns {Promise<Object>} Delivery result
 */
const sendWhatsApp = async (alert) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const targetNumber = process.env.ALERT_PHONE_NUMBER;
  const contentSid = process.env.TWILIO_CONTENT_SID;

  // Fallback to Mock if credentials are not configured or MOCK_MODE is enabled
  const isMockConfig =
    !accountSid ||
    !authToken ||
    !targetNumber ||
    accountSid.startsWith('your_') ||
    authToken.startsWith('your_') ||
    process.env.MOCK_ALERTS === 'true';

  if (isMockConfig) {
    console.log(
      `💬 [WHATSAPP MOCK] Emergency WhatsApp alert triggered for Device: ${alert.deviceId} | Gas Level: ${alert.gasLevel}`
    );
    return {
      success: true,
      service: 'whatsapp',
      mock: true,
      message: 'Simulated Twilio WhatsApp alert'
    };
  }

  try {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // Ensure proper 'whatsapp:' prefix format for both sender and recipient
    const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
    const formattedTo = targetNumber.startsWith('whatsapp:') ? targetNumber : `whatsapp:${targetNumber}`;

    const formParams = new URLSearchParams({
      From: formattedFrom,
      To: formattedTo
    });

    // If ContentSid template is configured (required for trial/sandbox numbers), use it
    if (contentSid) {
      formParams.append('ContentSid', contentSid);
    } else {
      const messageBody = [
        `🚨 *[EMERGENCY] LPG GAS LEAKAGE DETECTED!* 🚨`,
        ``,
        `*Device ID:* ${alert.deviceId}`,
        `*Location:* ${alert.location || 'Unknown Location'}`,
        `*Gas Concentration:* ${alert.gasLevel} PPM`,
        `*Severity Level:* ${alert.severity || 'CRITICAL'}`,
        `*Timestamp:* ${new Date().toLocaleString()}`,
        ``,
        `⚠️ *Action Required:*`,
        `- Do not turn ON or OFF any electrical switches.`,
        `- Turn off the main gas cylinder regulator valve.`,
        `- Open all doors and windows for ventilation.`
      ].join('\n');
      formParams.append('Body', messageBody);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formParams.toString()
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData?.message || `HTTP ${response.status}`);
    }

    console.log(`✅ [WHATSAPP] Emergency message sent successfully to ${formattedTo} (SID: ${responseData.sid})`);
    return {
      success: true,
      service: 'whatsapp',
      messageSid: responseData.sid,
      data: responseData
    };
  } catch (error) {
    console.error(`❌ [WHATSAPP ERROR] Failed to send WhatsApp message: ${error.message}`);
    return {
      success: false,
      service: 'whatsapp',
      error: error.message
    };
  }
};

module.exports = {
  sendWhatsApp
};
