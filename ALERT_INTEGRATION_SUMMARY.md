# 🛡️ LPG Guard System — Alert Integration Engine (Track 2)

## 📌 Project Overview & Role
- **Role:** Backend Member 2 – Alert Integration Engine
- **Objective:** Develop an independent, resilient, and fault-tolerant emergency alert integration engine that sends real-time emergency notifications across multiple channels simultaneously (Pushover Siren, Cellular SMS, and WhatsApp) the moment an LPG gas leak is detected by the IoT sensor node (ESP32 / MQ Sensor).

---

## 🏛️ System Architecture & Workflow

```text
       [MQ Gas Sensor]
              │ (Gas Leakage Detected)
              ▼
           [ESP32]
              │ (WiFi HTTP POST Request)
              ▼
   [Express Backend: server.js]
              │
              ▼
    [routes/alertRoutes.js]  (Backend Member 1 - Cooldown Check)
              │
              ▼
  [services/alertDispatcher.js]  (Master Dispatcher - Core Engine)
              │
              ├─────────────── Promise.allSettled() ───────────────┐
              │                                                    │
              ▼                                                    ▼
   [Pushover Siren]               [Textbee Cellular SMS]      [Twilio WhatsApp]
  - Priority: 2 (Emergency)      - Dispatched via SIM        - Rich formatted alert
  - Sound: 'siren'                 in Gateway Phone          - PPM Gas Level & Tips
  - Retries every 30s            - Target: +916394284933     - Target: WhatsApp
```

---

## 📦 Deliverables & File Breakdown

### 1. Master Alert Dispatcher (`services/alertDispatcher.js`)
- **Role**: Central coordinator and traffic controller of the entire alert system.
- **Core Function**: `dispatchAllAlerts(alert)`
- **Key Technical Features**:
  - **Channel Isolation via Promise.allSettled()**: Dispatches Pushover, SMS, and WhatsApp simultaneously. If one service encounters a network glitch, the other two continue uninterrupted.
  - **Extensible Channel Registry Pattern**: Channels are defined in an array registry, making adding future notification channels (e.g., Email, Telegram) a 1-line change.
  - **Defensive Input Sanitization**: Automatically validates and sanitizes incoming hardware sensor payloads so incomplete or corrupted data never crashes the server.
  - **Execution Benchmarking**: Calculates precise dispatch latency in milliseconds (Execution time: ~1ms).
  - **Backward-Compatible Alias**: Exports both `dispatchAllAlerts` and `triggerEmergencyAlert = dispatchAllAlerts` so Backend Member 1’s route (`routes/alertRoutes.js`) runs without modifying any of their code.

### 2. Pushover Emergency Siren Service (`services/pushoverService.js`)
- **Role**: Sends high-priority push notifications that trigger an emergency siren alarm and vibration on the user's Android phone.
- **API**: Pushover REST API (`https://api.pushover.net/1/messages.json`)
- **Key Parameters**:
  - `priority: 2` (Emergency priority — bypasses "Do Not Disturb" on supported devices).
  - `sound: 'siren'` (Loud siren tone).
  - `retry: 30` (Repeats notification every 30 seconds until the user acknowledges it).
  - `expire: 600` (Stops repeating after 10 minutes).
- **Zero-Dependency**: Implemented with native Node.js `fetch`.

### 3. Textbee Cellular SMS Gateway (`services/textbeeService.js`)
- **Role**: Dispatches actual mobile SMS text messages to registered emergency contacts without expensive SMS aggregators.
- **How It Works**: Utilizes the Textbee Android Gateway app connected to an Android phone with an active cellular SIM card.
- **API**: Textbee Device Gateway API (`https://api.textbee.dev/api/v1/gateway/devices/.../sendSMS`).
- **Target Number**: `+91 63942 84933`.
- **Payload**: Formatted SMS containing Device ID, Location, Gas Level in PPM, Severity, and immediate evacuation instructions.

### 4. Twilio WhatsApp Alert Service (`services/whatsappService.js`)
- **Role**: Sends real-time WhatsApp emergency alerts.
- **API**: Twilio Programmable Messaging API (`https://api.twilio.com/2010-04-01/Accounts/.../Messages.json`).
- **Sender**: `whatsapp:+17372508034`.
- **Recipient**: `whatsapp:+916394284933`.
- **Key Features**: Supports Twilio pre-approved templates (`ContentSid: HXfe5ab5f...`) as well as rich markdown emergency text with formatted gas levels and action checklists.

### 5. Automated Test Suite (`tests/testAlerts.js`)
- **Role**: Independent test harness to verify the entire notification engine without needing the database or ESP32 hardware online.
- **Two Modes Supported**:
  1. **Mock Mode (`node tests/testAlerts.js --mock`)**: Simulates the entire flow locally with zero external API calls or quota consumption.
  2. **Live Mode (`node tests/testAlerts.js`)**: Runs end-to-end live testing with real carrier networks and device alerts.
- **Native .env Parser**: Loads environment variables without requiring external npm packages.

### 6. Environment Configurations (`.env` & `.env.example`)
- **Security Best Practices**:
  - `.env`: Houses actual private API keys, tokens, and phone numbers. Added to `.gitignore` so secrets are never pushed to GitHub.
  - `.env.example`: Contains sanitized placeholder keys committed to the repository as a clean template for other team members and evaluators.

---

## 🧪 Real-World Verification Results

| Channel | Test Type | Status | Result / Identification |
| :--- | :--- | :---: | :--- |
| **Pushover Siren** | Live Cloud API | ✅ PASSED | Siren received, acknowledged by Pushover Server |
| **Textbee SMS** | Live Cellular Network | ✅ PASSED | Delivered to +916394284933 (Batch ID verified) |
| **Twilio WhatsApp** | Live WhatsApp Network | ✅ PASSED | Delivered to WhatsApp (Twilio Message SID verified) |
| **Master Dispatcher** | Parallel Benchmark | ✅ PASSED | All 3 channels executed concurrently in 1ms |

---

## 🚀 GitHub Collaboration & Delivery

- **Clean Working Tree**: Did NOT modify or break any files belonging to Backend Member 1 (`server.js`, `models/`, `routes/`, `middlewares/`).
- **Feature Branch**: Completed in isolated branch `feat/alert-integrations`.
- **Forked Repository**: `mrsatyampatel/GAS_ALERT_INTEGRATION`.
- **Pull Request Created**:
  - **PR Link**: https://github.com/Rudransh-mi27/MCOA_ITT/pull/1
  - **PR Title**: `Alert Integration Engine`
  - **Status**: Open & Ready for Merge into `Rudransh-mi27/MCOA_ITT:main`.
