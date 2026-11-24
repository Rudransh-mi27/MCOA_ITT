# IoT Gas Leak Detection System - Backend API

Production-ready Node.js & Express backend for IoT gas leak detection, automated emergency dispatch, and 5-minute alert cooldown management.

---

## 🚀 Live API Contract

### Base URL
- **Local**: `http://localhost:5001` (or `http://localhost:5000`)
- **Render Production (24/7 Live)**: [https://lpgenius-9gls.onrender.com](https://lpgenius-9gls.onrender.com)
- **Live Web Dashboard**: [https://lpgenius-9gls.onrender.com/dashboard](https://lpgenius-9gls.onrender.com/dashboard)

---

### 1. Health Check (Public)
Used by deployment monitoring services (Render/UptimeRobot) and initial connectivity checks.

- **Endpoint**: `GET /api/v1/health`
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Gas Leak Detection API is running",
  "uptime": 12.34,
  "timestamp": "2026-11-15T17:30:00.000Z"
}
```

---

### 2. Ingest Gas Leak Alert (Protected - ESP32 Hardware Integration)
Called by ESP32 microcontrollers upon MQ-2/MQ-5 gas sensor threshold breaches. Implements a strict **5-minute cooldown** per `deviceId` to prevent notification flooding.

- **Endpoint**: `POST /api/v1/alerts/gas-leak`
- **Headers**:
  - `Content-Type: application/json`
  - `x-device-secret: <DEVICE_SECRET>` *(Required)*

- **Request Body**:
```json
{
  "deviceId": "ESP32_NODE_01",
  "location": "Kitchen Stove Area",
  "gasLevel": 450,
  "threshold": 300,
  "severity": "CRITICAL"
}
```

#### Fields Description:
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `deviceId` | String | **Yes** | — | Unique hardware identifier |
| `gasLevel` | Number | **Yes** | — | Analog/PPM reading from sensor |
| `location` | String | No | `"Unknown Location"` | Human-readable placement label |
| `threshold`| Number | No | `300` | Configured alert trip level |
| `severity` | String | No | `"CRITICAL"` | `"WARNING"` or `"CRITICAL"` |

- **Response `201 Created` (First Alert / Cooldown Inactive - Dispatch Triggered)**:
```json
{
  "success": true,
  "cooldownActive": false,
  "message": "Gas leak alert logged and emergency dispatch triggered",
  "data": {
    "_id": "6737750fa4e1b731e847c92b",
    "deviceId": "ESP32_NODE_01",
    "location": "Kitchen Stove Area",
    "gasLevel": 450,
    "threshold": 300,
    "severity": "CRITICAL",
    "dispatchStatus": "SENT",
    "timestamp": "2026-11-15T17:31:00.000Z"
  }
}
```

- **Response `200 OK` (Duplicate within 5 Minutes - Cooldown Suppressed)**:
```json
{
  "success": true,
  "cooldownActive": true,
  "message": "Alert logged, emergency dispatch skipped due to 5-minute cooldown",
  "data": {
    "_id": "6737751fa4e1b731e847c92c",
    "deviceId": "ESP32_NODE_01",
    "location": "Kitchen Stove Area",
    "gasLevel": 460,
    "threshold": 300,
    "severity": "CRITICAL",
    "dispatchStatus": "COOLDOWN_SKIPPED",
    "timestamp": "2026-11-15T17:32:00.000Z"
  }
}
```

- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid `x-device-secret` header.
  - `400 Bad Request`: Missing `deviceId` or numeric `gasLevel`.
  - `500 Internal Server Error`: Database or unexpected runtime error.

---

### 3. Get Alert History (Protected)
Retrieves the latest 20 alerts recorded across devices.

- **Endpoint**: `GET /api/v1/alerts/history`
- **Headers**:
  - `x-device-secret: <DEVICE_SECRET>` *(Required)*

- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6737751fa4e1b731e847c92c",
      "deviceId": "ESP32_NODE_01",
      "location": "Kitchen Stove Area",
      "gasLevel": 460,
      "threshold": 300,
      "severity": "CRITICAL",
      "dispatchStatus": "COOLDOWN_SKIPPED",
      "timestamp": "2026-11-15T17:32:00.000Z"
    },
    {
      "_id": "6737750fa4e1b731e847c92b",
      "deviceId": "ESP32_NODE_01",
      "location": "Kitchen Stove Area",
      "gasLevel": 450,
      "threshold": 300,
      "severity": "CRITICAL",
      "dispatchStatus": "SENT",
      "timestamp": "2026-11-15T17:31:00.000Z"
    }
  ]
}
```

---

## 🛠️ Environment Variables for Deployment (Render)

When deploying to **Render** as a **Web Service**, set the following environment variables in the Render Dashboard:

| Variable | Description | Example Value |
|---|---|---|
| `PORT` | Web server listening port (Render automatically assigns one) | `10000` |
| `MONGO_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/gas_guard?retryWrites=true&w=majority` |
| `DEVICE_SECRET` | Shared secret header required for authenticated device endpoints | `esp32_super_secret_key_123` |

### Render Service Settings:
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start` (runs `node server.js`)
- **Health Check Path**: `/api/v1/health`

