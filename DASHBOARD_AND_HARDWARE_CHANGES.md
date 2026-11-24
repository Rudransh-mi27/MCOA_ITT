# LPG Guard System — Real-Time Monitoring Dashboard & Hardware Integration

## 📌 Overview
This update introduces a live, real-time web monitoring dashboard and hardware continuous telemetry integration to complement the Track 2 Multi-Channel Alert Engine.

---

## 🛠️ Key Additions & Updates

### 1. Real-Time Web Monitoring Dashboard (`public/index.html`)
- **Clean Light Mode Interface**: Professional UI designed with Tailwind CSS and responsive layout.
- **Dynamic Speedometer Gauge**: Canvas-rendered 0–4000 PPM gauge with 3 color zones:
  - `0 - 1000 PPM`: Safe Zone (Green)
  - `1000 - 1800 PPM`: Warning Zone (Amber)
  - `1800+ PPM`: Danger Zone (Red)
- **Prominent Sound Controls**:
  - `[ 🔇 MUTE SOUND ONLY ]`: Instantly silences the laptop speaker alarm without affecting visual alerts.
  - `[ 🛑 RESET / BAND KARE ALERT ]`: Master dismiss button that forces the dashboard back to "SYSTEM NORMAL" and resets to the safe baseline (220 PPM).
  - Sound default set to safe / muted to prevent accidental browser screeching.
- **Automatic Recovery**: As soon as gas readings drop below 1800 PPM, the dashboard automatically transitions from Red Danger back to Green Normal, stops siren beeps, and returns the needle to the safe zone.
- **Server Connectivity Status**: Real-time badge indicating whether the backend server on port 5001 is actively connected or offline.
- **Incident History Log Table**: Synced live with MongoDB `AlertLog` records.

### 2. Backend Telemetry & Dashboard Endpoints (`server.js`)
- `GET /dashboard`: Serves the live web monitoring dashboard.
- `POST /dashboard/api/live` & `POST /api/v1/telemetry`: Lightweight ingestion endpoints for ESP32 real-time gas readings.
- `GET /dashboard/api/data`: Returns live sensor state along with MongoDB recent alert history.
- `POST /dashboard/api/reset`: Resets server live state back to safe baseline (220 PPM).
- Alert hook on `/api/v1/alerts/gas-leak`: Updates live sensor state in memory when an alert occurs.

### 3. ESP32 Arduino Firmware (`hardware/ESP32_LPG_Node.ino`)
- **Continuous Live Telemetry**: Transmits room air readings to `http://<LAPTOP_IP>:5001/dashboard/api/live` every 2 seconds.
- **Emergency Dispatch**: Dispatches HTTP POST to `/api/v1/alerts/gas-leak` with hardware buzzer activation when gas level crosses 1800 PPM.
- **Auto Reconnect**: Automatically reconnects if Wi-Fi drops.
- **Pin Mapping**: MQ-6 Analog on Pin 34, Buzzer on Pin 25.

---

## 🚀 Running the System

```bash
# 1. Start Backend Server
cd E:\mcoa\MCOA_ITT
npm start

# 2. Access Dashboard
http://localhost:5001/dashboard
```
