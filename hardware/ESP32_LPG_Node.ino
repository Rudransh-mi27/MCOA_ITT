#include <WiFi.h>
#include <HTTPClient.h>

// ================= 1. HARDWARE PIN CONFIGURATION =================
#define MQ6_PIN 34
#define BUZZER_PIN 25
int threshold = 1800;
// =================================================================

// ================= 2. WI-FI & LAPTOP CONFIGURATION ===============
// Apna Wi-Fi / Hotspot ka naam aur password yahan daalein:
const char* ssid = "system";            // <-- Apna WiFi naam
const char* password = "AAPKA_PASSWORD"; // <-- Apna WiFi Password

// Aapke laptop ka current IP address (Port 5001 ke sath):
const char* LAPTOP_IP = "10.53.76.200"; 

// 1. Emergency Alert Endpoint (Jab gas > 1800 ho tab SMS/WhatsApp bhejta hai)
String emergencyUrl = "http://" + String(LAPTOP_IP) + ":5001/api/v1/alerts/gas-leak";

// 2. Real-Time Live Telemetry Endpoint (Website speedometer ko live update karne ke liye)
String liveTelemetryUrl = "http://" + String(LAPTOP_IP) + ":5001/dashboard/api/live";

// Backend Secret Key (Member 1 ke auth ke liye)
const char* deviceSecret = "esp32_super_secret_key_123";
// =================================================================

// Timers
unsigned long lastAlertTime = 0;
const unsigned long ALERT_INTERVAL = 30000; // Emergency alert har 30s me ek baar dispatch hoga

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // Live reading har 2 second me website ko jayegi

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

  // Wi-Fi Connection Setup
  Serial.println("\n======================================");
  Serial.println("  LPG Guard System (ESP32 Node)       ");
  Serial.println("======================================");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected Successfully!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Target Laptop Server: ");
    Serial.println(LAPTOP_IP);
  } else {
    Serial.println("\n❌ WiFi Connection Failed! Check SSID/Password.");
  }
}

void loop() {
  // Wi-Fi Reconnect Check
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  // 1. Read Gas Sensor
  int gasValue = analogRead(MQ6_PIN);
  
  Serial.print("MQ-6 Gas Reading: ");
  Serial.print(gasValue);
  Serial.println(" PPM");

  // 2. DANGER ZONE CONDITION (gas > 1800)
  if (gasValue > threshold) {
    tone(BUZZER_PIN, 2500);  // 🔊 Physical Buzzer ON

    // Emergency SMS / WhatsApp / Pushover Dispatch (Cooldown: 30s)
    if (millis() - lastAlertTime > ALERT_INTERVAL) {
      Serial.println("🚨 [EMERGENCY] Leak Detected! Dispatching Multi-Channel Alerts...");
      sendEmergencyAlert(gasValue);
      lastAlertTime = millis();
    }
  } 
  else {
    noTone(BUZZER_PIN);      // 🔇 Physical Buzzer OFF (Safe)
  }

  // 3. CONTINUOUS LIVE TELEMETRY (Har 2 second me website ki sui update kare)
  // Yeh reading 1800 se kam hone par website ko turant GREEN NORMAL kar dega!
  if (millis() - lastTelemetryTime > TELEMETRY_INTERVAL) {
    sendLiveTelemetry(gasValue);
    lastTelemetryTime = millis();
  }

  delay(300);
}

// -------------------------------------------------------------
// Function 1: Emergency Alert Dispatch (SMS + WhatsApp + Pushover)
// -------------------------------------------------------------
void sendEmergencyAlert(int gasLevel) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(emergencyUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", deviceSecret);

  String payload = "{"
    "\"deviceId\":\"ESP32_NODE_01\","
    "\"location\":\"Kitchen Cylinder Area\","
    "\"gasLevel\":" + String(gasLevel) + ","
    "\"threshold\":" + String(threshold) + ","
    "\"severity\":\"CRITICAL\""
  "}";

  int code = http.POST(payload);
  Serial.print("🚨 Emergency Alert Sent -> Response Code: ");
  Serial.println(code);
  http.end();
}

// -------------------------------------------------------------
// Function 2: Real-Time Live Telemetry (Website Speedometer Needle)
// -------------------------------------------------------------
void sendLiveTelemetry(int gasLevel) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(liveTelemetryUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{"
    "\"deviceId\":\"ESP32_NODE_01\","
    "\"location\":\"Kitchen Cylinder Area\","
    "\"gasLevel\":" + String(gasLevel) + ","
    "\"threshold\":" + String(threshold) +
  "}";

  int code = http.POST(payload);
  if (code > 0) {
    Serial.print("📡 Live Telemetry Synced with Website -> ");
    Serial.print(gasLevel);
    Serial.println(" PPM");
  } else {
    Serial.println("⚠️ Live Telemetry ping failed (Check if Laptop Server is running).");
  }
  http.end();
}
