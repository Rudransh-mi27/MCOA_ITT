require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { verifyDevice } = require('./middlewares/authMiddleware');
const alertRoutes = require('./routes/alertRoutes');
const AlertLog = require('./models/AlertLog');

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// In-Memory Live Sensor State (for real-time speedometer updates without DB lag)
let liveSensorState = {
  gasLevel: 240, // default ambient baseline
  threshold: 1800,
  location: 'Kitchen Cylinder Area',
  deviceId: 'ESP32_NODE_01',
  lastSeen: new Date().toISOString()
};

// Serve Static Public Assets (Dashboard UI)
app.use(express.static(path.resolve(__dirname, 'public')));

// Public Health Check Route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gas Leak Detection API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Live Web Monitoring Dashboard Page
app.get(['/dashboard', '/dashboard/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Real-Time Live Telemetry Ingestion (Fast, zero-cooldown, updates speedometer needle)
const handleLiveTelemetry = (req, res) => {
  const { gasLevel, threshold, location, deviceId } = req.body || {};
  if (gasLevel !== undefined) {
    liveSensorState.gasLevel = Number(gasLevel);
    if (threshold !== undefined) liveSensorState.threshold = Number(threshold);
    if (location) liveSensorState.location = location;
    if (deviceId) liveSensorState.deviceId = deviceId;
    liveSensorState.lastSeen = new Date().toISOString();
  }
  res.status(200).json({ success: true, live: liveSensorState });
};

app.post('/dashboard/api/live', handleLiveTelemetry);
app.post('/api/v1/telemetry', handleLiveTelemetry);

// Manual Alert Reset / Dismiss Endpoint (Forces dashboard back to Safe Baseline)
app.post('/dashboard/api/reset', (req, res) => {
  liveSensorState.gasLevel = 220; // safe baseline
  liveSensorState.lastSeen = new Date().toISOString();
  res.status(200).json({
    success: true,
    message: 'Alert dismissed. Dashboard reset to Safe Baseline (220 PPM)',
    live: liveSensorState
  });
});

// Live Dashboard Real-Time Data Endpoint
app.get('/dashboard/api/data', async (req, res) => {
  try {
    const latest = await AlertLog.findOne().sort({ timestamp: -1 });
    const history = await AlertLog.find().sort({ timestamp: -1 }).limit(20);

    // If an alert exists and no live telemetry was received in the last 10 seconds,
    // only sync from latest if it was logged recently (within the last 60 seconds)
    const isLiveTelemetryFresh = liveSensorState.lastSeen && 
      (Date.now() - new Date(liveSensorState.lastSeen).getTime()) < 10000;

    if (!isLiveTelemetryFresh && latest) {
      const isLatestRecent = (Date.now() - new Date(latest.timestamp).getTime()) < 60000;
      if (isLatestRecent) {
        liveSensorState.gasLevel = latest.gasLevel;
        liveSensorState.threshold = latest.threshold || 1800;
        liveSensorState.location = latest.location || liveSensorState.location;
        liveSensorState.deviceId = latest.deviceId || liveSensorState.deviceId;
        liveSensorState.lastSeen = latest.timestamp;
      }
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      live: liveSensorState,
      latest: latest || null,
      history: history || []
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
});

// Root Redirect to Dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Protected Alert Routes (ESP32 Hardware Node Ingestion)
app.use('/api/v1/alerts', verifyDevice, (req, res, next) => {
  // Update live sensor state when alert comes in
  if (req.body && req.body.gasLevel !== undefined) {
    liveSensorState.gasLevel = Number(req.body.gasLevel);
    liveSensorState.threshold = Number(req.body.threshold) || 1800;
    liveSensorState.location = req.body.location || liveSensorState.location;
    liveSensorState.deviceId = req.body.deviceId || liveSensorState.deviceId;
    liveSensorState.lastSeen = new Date().toISOString();
  }
  next();
}, alertRoutes);

// 404 Fallback Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (http://localhost:${PORT})`);
  console.log(`📊 Live Dashboard URL: http://localhost:${PORT}/dashboard`);
});
