require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { verifyDevice } = require('./middlewares/authMiddleware');
const alertRoutes = require('./routes/alertRoutes');

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Public Health Check Route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gas Leak Detection API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Protected Alert Routes
app.use('/api/v1/alerts', verifyDevice, alertRoutes);

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
});
