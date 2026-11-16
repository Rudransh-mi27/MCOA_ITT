/**
 * Master Alert Dispatcher Service
 * LPG Guard System - Track 2 (Alert Integration Engine)
 *
 * Coordinates parallel multi-channel emergency dispatches (Pushover, Textbee SMS, WhatsApp).
 * Uses Promise.allSettled() to guarantee channel isolation (a failure in one service
 * will never block or crash the remaining delivery channels).
 *
 * @module services/alertDispatcher
 */

const { sendPushoverAlert } = require('./pushoverService');
const { sendTextbeeSMS } = require('./textbeeService');
const { sendWhatsApp } = require('./whatsappService');

/**
 * Registered notification channel definitions
 * Easily extensible for future channel integrations.
 */
const NOTIFICATION_CHANNELS = [
  { id: 'pushover', label: 'Pushover Siren', dispatch: sendPushoverAlert },
  { id: 'textbee_sms', label: 'Textbee SMS', dispatch: sendTextbeeSMS },
  { id: 'whatsapp', label: 'Twilio WhatsApp', dispatch: sendWhatsApp }
];

/**
 * Dispatches emergency alerts across all registered notification channels concurrently.
 *
 * @async
 * @param {Object} alert - Emergency alert payload from sensor ingestion
 * @param {string} alert.deviceId - Unique ID of the reporting hardware node
 * @param {string} [alert.location='Unknown Location'] - Monitored room/premise name
 * @param {number} alert.gasLevel - Detected gas concentration in PPM
 * @param {string} [alert.severity='CRITICAL'] - Alert severity level
 * @returns {Promise<Object>} Comprehensive dispatch delivery report with metrics
 */
const dispatchAllAlerts = async (alert = {}) => {
  const startTime = Date.now();

  // Defensive input sanitization
  const safePayload = {
    deviceId: alert.deviceId || 'UNKNOWN_DEVICE',
    location: alert.location || 'Unknown Location',
    gasLevel: Number(alert.gasLevel) || 0,
    severity: alert.severity || 'CRITICAL',
    timestamp: alert.timestamp || new Date().toISOString()
  };

  console.log(`\n🚨 [MASTER DISPATCHER] Starting emergency broadcast...`);
  console.log(`   Device: ${safePayload.deviceId} | Location: ${safePayload.location} | Gas: ${safePayload.gasLevel} PPM`);

  try {
    // Fire all notification services in parallel
    const channelExecutions = NOTIFICATION_CHANNELS.map(async (channel) => {
      try {
        const result = await channel.dispatch(safePayload);
        return {
          id: channel.id,
          label: channel.label,
          success: Boolean(result?.success),
          data: result
        };
      } catch (channelError) {
        return {
          id: channel.id,
          label: channel.label,
          success: false,
          error: channelError?.message || 'Channel execution failed'
        };
      }
    });

    const executionResults = await Promise.allSettled(channelExecutions);

    // Aggregate channel outcomes into a clean structured report
    const channelReports = {};
    let successCount = 0;

    executionResults.forEach((res, index) => {
      const channel = NOTIFICATION_CHANNELS[index];

      if (res.status === 'fulfilled') {
        channelReports[channel.id] = res.value;
        if (res.value.success) successCount++;
      } else {
        channelReports[channel.id] = {
          id: channel.id,
          label: channel.label,
          success: false,
          error: res.reason?.message || 'Unexpected channel rejection'
        };
      }
    });

    const totalChannels = NOTIFICATION_CHANNELS.length;
    const executionTimeMs = Date.now() - startTime;
    const overallSuccess = successCount > 0;

    const dispatchReport = {
      overallSuccess,
      timestamp: new Date().toISOString(),
      executionTimeMs,
      metrics: {
        totalChannels,
        succeeded: successCount,
        failed: totalChannels - successCount,
        successRate: `${Math.round((successCount / totalChannels) * 100)}%`
      },
      alertData: safePayload,
      channels: channelReports
    };

    // Human-readable summary logging
    console.log(`📢 [MASTER DISPATCHER] Broadcast complete in ${executionTimeMs}ms:`);
    NOTIFICATION_CHANNELS.forEach((channel) => {
      const isSuccess = channelReports[channel.id]?.success;
      console.log(`   - ${channel.label.padEnd(16)}: ${isSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    });
    console.log(`   Overall Status   : ${overallSuccess ? '✅ PASSED' : '❌ FAILED'} (${successCount}/${totalChannels})\n`);

    return dispatchReport;
  } catch (dispatcherError) {
    console.error(`💥 [MASTER DISPATCHER FATAL] Critical dispatch error:`, dispatcherError);
    return {
      overallSuccess: false,
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      error: dispatcherError?.message || 'Fatal dispatcher error',
      channels: {}
    };
  }
};

module.exports = {
  dispatchAllAlerts,
  // Alias to ensure 100% backwards compatibility with Member 1's route (routes/alertRoutes.js)
  triggerEmergencyAlert: dispatchAllAlerts
};
