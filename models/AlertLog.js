const mongoose = require('mongoose');

const alertLogSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    default: 'Unknown Location',
    trim: true
  },
  gasLevel: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    default: 300
  },
  severity: {
    type: String,
    enum: ['WARNING', 'CRITICAL'],
    default: 'CRITICAL'
  },
  dispatchStatus: {
    type: String,
    enum: ['SENT', 'COOLDOWN_SKIPPED', 'FAILED'],
    default: 'SENT'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast cooldown lookups
alertLogSchema.index({ deviceId: 1, timestamp: -1 });

const AlertLog = mongoose.model('AlertLog', alertLogSchema);

module.exports = AlertLog;

