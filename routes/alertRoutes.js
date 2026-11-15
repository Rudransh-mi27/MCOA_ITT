const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');
const { triggerEmergencyAlert } = require('../services/alertDispatcher');

/**
 * @route   POST /api/v1/alerts/gas-leak
 * @desc    Ingest gas leak alert, check 5-minute cooldown, dispatch emergency notification
 * @access  Protected (Device Secret)
 */
router.post('/gas-leak', async (req, res) => {
  try {
    const { deviceId, location, gasLevel, threshold, severity } = req.body;

    // Validate required inputs
    const numericGasLevel = Number(gasLevel);
    if (
      !deviceId ||
      typeof deviceId !== 'string' ||
      !deviceId.trim() ||
      gasLevel === undefined ||
      gasLevel === null ||
      typeof gasLevel === 'boolean' ||
      isNaN(numericGasLevel)
    ) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and numeric gasLevel are required'
      });
    }

    const trimmedDeviceId = deviceId.trim();

    // 5-minute cooldown check for recent SENT alerts from this device
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentSentAlert = await AlertLog.findOne({
      deviceId: trimmedDeviceId,
      dispatchStatus: 'SENT',
      timestamp: { $gte: fiveMinutesAgo }
    }).sort({ timestamp: -1 });

    const alertData = {
      deviceId: trimmedDeviceId,
      gasLevel: numericGasLevel
    };
    if (location !== undefined) alertData.location = location;
    if (threshold !== undefined) alertData.threshold = threshold;
    if (severity !== undefined) alertData.severity = severity;

    // If within cooldown period
    if (recentSentAlert) {
      alertData.dispatchStatus = 'COOLDOWN_SKIPPED';
      const savedLog = await AlertLog.create(alertData);

      return res.status(200).json({
        success: true,
        cooldownActive: true,
        message: 'Alert logged, emergency dispatch skipped due to 5-minute cooldown',
        data: savedLog
      });
    }

    // No recent alert within cooldown - trigger emergency dispatch
    let dispatchStatus = 'SENT';
    try {
      await triggerEmergencyAlert({
        deviceId: trimmedDeviceId,
        location: location || 'Unknown Location',
        gasLevel: numericGasLevel
      });
    } catch (dispatchError) {
      console.error('Dispatch service error:', dispatchError);
      dispatchStatus = 'FAILED';
    }

    alertData.dispatchStatus = dispatchStatus;
    const savedLog = await AlertLog.create(alertData);

    return res.status(201).json({
      success: true,
      cooldownActive: false,
      message: 'Gas leak alert logged and emergency dispatch triggered',
      data: savedLog
    });
  } catch (error) {
    console.error('Error processing gas leak alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing gas leak alert',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/alerts/history
 * @desc    Get latest 20 alert logs
 * @access  Protected (Device Secret)
 */
router.get('/history', async (req, res) => {
  try {
    const alerts = await AlertLog.find()
      .sort({ timestamp: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching alert history',
      error: error.message
    });
  }
});

module.exports = router;

