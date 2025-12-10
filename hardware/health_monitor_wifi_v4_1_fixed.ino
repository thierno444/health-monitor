#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==================== CONFIGURATION WIFI ====================
const char* ssid = "FAMILLE NGOM-2.4G-ext";
const char* password = "25012025";

// URL du serveur API (PRODUCTION)
const char* serverUrl = "https://health-monitor-api-d323.onrender.com/api/measurements";

// ==================== CONFIGURATION ====================

// OLED
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Capteur MAX30102
MAX30105 particleSensor;

// Variables pour SpO2 et BPM
uint32_t irBuffer[100];
uint32_t redBuffer[100];
int32_t bufferLength = 100;
int32_t spo2;
int8_t validSPO2;
int32_t heartRate;
int8_t validHeartRate;

// Seuils d'alertes
#define BPM_MIN_NORMAL 60
#define BPM_MAX_NORMAL 100
#define SPO2_MIN_NORMAL 95
#define SPO2_MIN_WARNING 90

// Variables
unsigned long lastMeasurement = 0;
unsigned long measureInterval = 15000; // 15 secondes
unsigned long lastWiFiCheck = 0;
bool fingerDetected = false;
bool wifiConnected = false;
String healthStatus = "INIT";
String deviceId = "ESP32_001";

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n╔════════════════════════════════╗");
  Serial.println("║  HEALTH MONITOR IoT v4.1      ║");
  Serial.println("╚════════════════════════════════╝\n");
  
  // 1. INITIALISER I2C D'ABORD
  Wire.begin(21, 22);
  delay(100);
  
  // 2. INITIALISER L'OLED
  Serial.print("Initialisation OLED...");
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(" ERREUR!");
    while(1) delay(1000);
  }
  Serial.println(" OK!");
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 20);
  display.println("HEALTH MONITOR");
  display.setCursor(30, 35);
  display.println("v4.1");
  display.display();
  delay(2000);
  
  // 3. INITIALISER LE MAX30102
  Serial.print("Initialisation MAX30102...");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(" ERREUR!");
    display.clearDisplay();
    display.setCursor(0, 20);
    display.println("ERREUR MAX30102");
    display.display();
    while (1) delay(1000);
  }
  Serial.println(" OK!");
  
  // Configuration du capteur
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
  
  display.clearDisplay();
  display.setCursor(10, 20);
  display.println("Capteur OK");
  display.display();
  delay(1000);
  
  // 4. CONNEXION WIFI (EN DERNIER)
  connectWiFi();
  
  // 5. AFFICHER ÉCRAN D'ATTENTE
  displayWaitingScreen();
  
  Serial.println("\n✓ Système prêt !");
  Serial.println("📌 Posez votre doigt\n");
}

// ==================== LOOP ====================

void loop() {
  // Vérifier WiFi toutes les 30 sec
  if (millis() - lastWiFiCheck > 30000) {
    checkWiFiConnection();
    lastWiFiCheck = millis();
  }
  
  // Lire le capteur
  long irValue = particleSensor.getIR();
  
  // Debug: afficher valeur IR
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 2000) {
    Serial.print("IR Value: ");
    Serial.println(irValue);
    lastDebug = millis();
  }
  
  if (irValue > 50000) {
    fingerDetected = true;
    
    if (millis() - lastMeasurement > measureInterval) {
      lastMeasurement = millis();
      
      Serial.println("\n📊 LECTURE EN COURS...");
      displayReadingScreen();
      
      // Collecter échantillons
      for (byte i = 0; i < bufferLength; i++) {
        while (particleSensor.available() == false)
          particleSensor.check();
          
        redBuffer[i] = particleSensor.getRed();
        irBuffer[i] = particleSensor.getIR();
        particleSensor.nextSample();
        
        // Afficher progression tous les 25 échantillons
        if (i % 25 == 0) {
          Serial.print(".");
        }
      }
      Serial.println(" OK");
      
      // Calculer BPM et SpO2
      maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);
      
      // Filtrer
      if (heartRate < 30 || heartRate > 200) validHeartRate = 0;
      if (spo2 < 70 || spo2 > 100) validSPO2 = 0;
      
      updateHealthStatus();
      displayResults();
      printToSerial();
      
      if (wifiConnected && validHeartRate && validSPO2) {
        sendDataToServer();
      }
    }
    
  } else {
    fingerDetected = false;
    healthStatus = "WAITING";
    
    // Mettre à jour l'écran seulement si changement
    static bool wasDetected = true;
    if (wasDetected) {
      displayWaitingScreen();
      wasDetected = false;
    }
    
    if (millis() - lastMeasurement > 5000) {
      Serial.println("⚠️  Aucun doigt (IR < 50000)");
      lastMeasurement = millis();
    }
  }
  
  delay(50);
}

// ==================== WIFI ====================

void connectWiFi() {
  Serial.println("\n📡 Connexion WiFi...");
  Serial.print("SSID: ");
  Serial.println(ssid);
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(5, 20);
  display.println("Connexion WiFi...");
  display.display();
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("✅ WiFi OK!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm\n");
    
    display.clearDisplay();
    display.setCursor(20, 15);
    display.println("WiFi OK!");
    display.setCursor(10, 35);
    display.print("IP:");
    display.print(WiFi.localIP());
    display.display();
    delay(2000);
    
  } else {
    wifiConnected = false;
    Serial.println("❌ WiFi échoué");
    Serial.println("Mode local activé\n");
    
    display.clearDisplay();
    display.setCursor(15, 25);
    display.println("WiFi Echoue");
    display.setCursor(10, 40);
    display.println("Mode Local");
    display.display();
    delay(2000);
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    wifiConnected = false;
    Serial.println("⚠️  WiFi perdu");
  } else if (WiFi.status() == WL_CONNECTED && !wifiConnected) {
    wifiConnected = true;
    Serial.println("✅ WiFi restauré");
  }
}

void sendDataToServer() {
  if (!wifiConnected) return;
  
  Serial.println("\n📤 Envoi des données au serveur...");
  
  HTTPClient http;
  
  // Créer le JSON
  String jsonData = "{";
  jsonData += "\"deviceId\":\"" + deviceId + "\",";
  jsonData += "\"bpm\":" + String(heartRate) + ",";
  jsonData += "\"spo2\":" + String(spo2) + ",";
  jsonData += "\"status\":\"" + healthStatus + "\",";
  jsonData += "\"battery\":" + String(85);
  jsonData += "}";
  
  Serial.println("📦 Données JSON:");
  Serial.println(jsonData);
  
  // Envoyer vers l'API en ligne
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ Réponse serveur: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Réponse complète:");
    Serial.println(response);
  } else {
    Serial.print("❌ Erreur HTTP: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// ==================== AFFICHAGE OLED ====================

void displayWaitingScreen() {
  display.clearDisplay();
  
  // Ligne du haut: status WiFi
  display.setTextSize(1);
  display.setCursor(0, 0);
  if (wifiConnected) {
    display.print("WiFi:ON ");
    int rssi = WiFi.RSSI();
    if (rssi > -60) display.print("+++");
    else if (rssi > -75) display.print("++");
    else display.print("+");
  } else {
    display.print("WiFi:OFF");
  }
  
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  // Message principal
  display.setTextSize(1);
  display.setCursor(10, 18);
  display.println("En attente...");
  
  display.setTextSize(2);
  display.setCursor(15, 33);
  display.println("POSEZ");
  display.setCursor(10, 50);
  display.println("DOIGT");
  
  display.display();
}

void displayReadingScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("LECTURE...");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  display.setTextSize(2);
  display.setCursor(20, 25);
  display.println("Analyse");
  display.setCursor(25, 45);
  display.println("en cours");
  display.display();
}

void displayResults() {
  display.clearDisplay();
  
  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("HEALTH");
  display.setCursor(85, 0);
  display.print(wifiConnected ? "WiFi:ON" : "Local");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  // BPM
  display.setCursor(0, 15);
  display.print("BPM:");
  display.setTextSize(3);
  display.setCursor(50, 12);
  if (validHeartRate) {
    display.print(heartRate);
  } else {
    display.print("--");
  }
  
  // SpO2
  display.setTextSize(1);
  display.setCursor(0, 38);
  display.print("SpO2:");
  display.setTextSize(3);
  display.setCursor(50, 35);
  if (validSPO2) {
    display.print(spo2);
    display.setTextSize(1);
    display.print("%");
  } else {
    display.print("--");
  }
  
  // Status
  display.drawLine(0, 57, 128, 57, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(5, 59);
  
  if (healthStatus == "NORMAL") {
    display.print("NORMAL");
  } else if (healthStatus == "ATTENTION") {
    display.print("ATTENTION");
  } else if (healthStatus == "DANGER") {
    display.print("DANGER");
  } else {
    display.print("Lecture...");
  }
  
  display.display();
}

// ==================== ALERTES ====================

void updateHealthStatus() {
  if (!validHeartRate || !validSPO2) {
    healthStatus = "LECTURE";
    return;
  }
  
  if (heartRate < 50 || heartRate > 120 || spo2 < SPO2_MIN_WARNING) {
    healthStatus = "DANGER";
  }
  else if (heartRate < BPM_MIN_NORMAL || heartRate > BPM_MAX_NORMAL || 
           (spo2 >= SPO2_MIN_WARNING && spo2 < SPO2_MIN_NORMAL)) {
    healthStatus = "ATTENTION";
  }
  else {
    healthStatus = "NORMAL";
  }
}

// ==================== SERIAL ====================

void printToSerial() {
  Serial.println("\n═══════════════════════════");
  Serial.print("❤️  BPM: ");
    <div class="mt-8 text-center text-white/60 text-sm">
      <p>© 2024 Health Monitor. Tous droits réservés.</p>
    </div>
    <div class="mt-8 text-center text-white/60 text-sm">
      <p>© 2024 Health Monitor. Tous droits réservés.</p>
    </div>

  </div>
</div>

  </div>
</div>
  if (validHeartRate) {
    Serial.print(heartRate);
  } else {
    Serial.print("--");
  }
  Serial.print(" bpm");
  
  Serial.print("  |  🫁 SpO2: ");
  if (validSPO2) {
    Serial.print(spo2);
  } else {
    Serial.print("--");
  }
  Serial.print("%");
  
  Serial.print("  |  Status: ");
  Serial.println(healthStatus);
  
  Serial.print("📡 WiFi: ");
  Serial.println(wifiConnected ? "ON" : "OFF");
  
  if (healthStatus == "DANGER") {
    Serial.println("🚨 DANGER!");
  } else if (healthStatus == "ATTENTION") {
    Serial.println("⚠️  ATTENTION");
  } else if (healthStatus == "NORMAL") {
    Serial.println("✅ NORMAL");
  }
  Serial.println("═══════════════════════════\n");
}