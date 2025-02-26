#include <TinyGPS++.h> // Librería para el GPS
#include <HardwareSerial.h> // Librería para la comunicación con el GPS
#include <PubSubClient.h> // Librería para MQTT
#include <WiFiClientSecure.h> // Librería para conexión segura con WiFi
#include <WiFi.h> // Librería para conexión WiFi ESP32
#include <WiFiManager.h> // Librería para configurar la conexión WiFi

// ID del dispositivo (CAMBIAR la X por el numero del grupo)
#define ESP_ID "GRUPO_X"

// Control del led onboard del ESP32
#define LED_BUILTIN 2

// Configuración del servidor MQTT
#define MQTT_SERVER "fabspacecol.uniandes.edu.co"
#define MQTT_PORT 8883
#define MQTT_USERNAME "FabSpaceColMQTTClient"
#define MQTT_PASSWORD "mqttclientpassword"

// Configuración de la red WiFi
WiFiClientSecure wifiSecureClient;
PubSubClient mqttClient(wifiSecureClient);
WiFiManager wifiManager;

// Instancia del objeto TinyGPS++
TinyGPSPlus gps;

// Usamos UART2 para la comunicación con el GPS (pines 16 y 17, RX2 y TX2 respectivamente)
HardwareSerial gpsSerial(2);

// Variables para almacenar la telemetría del GPS
float latitud = 0.0;
float longitud = 0.0;
float velocidad = 0.0;
int satellites = 0;
float hdop = 0.0;
String fechaHora = "";

void setup() {
  pinMode(LED_BUILTIN,OUTPUT); // Configuración del pin del LED_BUILTIN onboard como salida
  digitalWrite(LED_BUILTIN, LOW); // Apagar el LED_BUILTIN

  Serial.begin(115200); // Comunicación con la PC
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17); // Configuración del modulo de GPS GT-U7

  // En caso de que se quiera resetear la configuración de la red WiFi (descomentar la siguiente línea)
  //wifiManager.resetSettings();

  wifiManager.autoConnect(ESP_ID); // Conectarse a la red WiFi
  wifiSecureClient.setInsecure(); // Configuración de la conexión segura con el WiFi

  digitalWrite(LED_BUILTIN, HIGH); // Encender el LED_BUILTIN

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT); // Configuración del servidor MQTT
  connectToMQTTBroker(); // Conectarse al servidor MQTT

  Serial.print("\n\nIniciando GPS GT-U7...");
}

void loop() {
  /**
    * @brief Main loop of the program
    * It will read the GPS data, store it in variables and publish it to the MQTT Broker.
    *
    * @return void
    */

  if (WiFi.status() != WL_CONNECTED) { // Si se pierde la conexión WiFi, intentará reconectarse
    Serial.print("\nConexión WiFi perdida, intentando reconectar...");
    ESP.restart(); // Reiniciar el ESP32
  }

  if (!mqttClient.connected()) { // Si se pierde la conexión con el MQTT Broker, intentará reconectarse
    Serial.print("\nMQTT Broker desconectado, intentando reconectar...");
    connectToMQTTBroker();
  }

  // Leer todos los datos del GPS que llegan por el puerto serial
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read(); // Leemos un los datos del GPS
    gps.encode(c); // Decodificamos los datos del GPS
  }

  // Si la información del GPS es valida y actualizada
  if (gps.location.isUpdated()) {
    Serial.print("\n\nSeñal GPS recibida correctamente!");

    // Almacenamiento de telemetría en variables
    latitud = gps.location.lat(); // Latitud en grados
    longitud = gps.location.lng(); // Longitud en grados
    velocidad = gps.speed.kmph(); // Velocidad en km/h
    satellites = gps.satellites.value(); // Número de satélites a los que está conectado el GPS
    hdop = gps.hdop.value() / 100.0; // Precisión del GPS

    // Formatear la fecha y hora para almacenarla en una variable en formato "MM/DD/YYYY HH:MM:SS.CC"
    if (gps.date.isValid() && gps.time.isValid()) {
      char buffer[30];
      sprintf(buffer, "%02d/%02d/%04d %02d:%02d:%02d.%02d",
              gps.date.month(), gps.date.day(), gps.date.year(),
              gps.time.hour(), gps.time.minute(), gps.time.second(),
              gps.time.centisecond());
      fechaHora = buffer;

    } else {
      fechaHora = "INVALIDA";
    }

    // Formatear los datos de telemetría a JSON correctamente
    String jsonTelemetry = "{\"ID\": \"" + String(ESP_ID) + "\"" +
                            ", \"latitud\": " + String(latitud, 12) +
                            ", \"longitud\": " + String(longitud, 12) +
                            ", \"velocidad\": " + String(velocidad, 2) +
                            ", \"satelites\": " + String(satellites) +
                            ", \"hdop\": " + String(hdop, 2) +
                            ", \"fechaHora\": \"" + fechaHora + "\"}";


    // Enviar los datos de telemetría al servidor MQTT
    publishToMQTTBroker("CBUSATELITES", jsonTelemetry);

    // Parpadear el LED 3 veces rapidas para indicar que se envió la telemetría correctamente
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_BUILTIN, HIGH);  // Encender el LED
        delay(100);
        digitalWrite(LED_BUILTIN, LOW);   // Apagar el LED
        delay(100);
    }

  } else { // Si no se recibe señal del GPS
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // Cambiar el estado del led para parpadear
    Serial.print("\nEsperando señal GPS...");
  }

  mqttClient.loop(); // Mantener la conexión con el servidor MQTT activa
  delay(1000);
}

void connectToMQTTBroker () {
  /**
   * @brief Connects to MQTT Broker.
   * It will keep trying to connect until it is successful.
   *
   * @return void
   */

  digitalWrite(LED_BUILTIN, HIGH); // Encender el LED_BUILTIN

  while (!mqttClient.connected()) { // If connection is not successful, it will keep trying to connect indefinitely
    Serial.print("\nAttempting MQTT Broker connection...");
    Serial.print("\nMQTT Broker Server: " + (String)MQTT_SERVER + " Port: " + (String)MQTT_PORT);

    if (!mqttClient.connect("ESP32Client", MQTT_USERNAME, MQTT_PASSWORD)) { /*Connect to MQTT Broker*/
      Serial.print("\nFailed to connect to MQTT Broker, trying again in 1 seconds...\n");

      // Print the reason the connection failed
      Serial.print("\nMQTT Client State: " + (String)mqttClient.state());

      delay(1000);

    } else {
      Serial.print("\nConnected to MQTT Broker successfully!");
      digitalWrite(LED_BUILTIN, LOW); // Apagar el LED_BUILTIN
    }
  }
}

void publishToMQTTBroker ( String topic, String message ) {
  /**
   * @brief Publishes data to MQTT Broker
   * @param topic String with the topic to publish the message
   * @param message String with the message to publish
   * @note If mqttClient is disconnected, it will try to reconnect before publishing the data
   *
   * @return void
   */
  Serial.print("\nAttempting to publish data to MQTT Broker...");

  if (mqttClient.connected()) { // If mqttClient is connected, it will publish the data
    mqttClient.publish(topic.c_str(), message.c_str()); // Publish data to MQTT Broker

    Serial.print("\nData published successfully!");
    Serial.print("\nTopic: " + topic);
    Serial.print("\nMessage: " + message);

  } else { // If mqttClient is disconnected, it will try to reconnect before publishing the data
    Serial.print("\nData not published, client is disconnected from MQTT broker, trying to reconnect...\n");
    connectToMQTTBroker();
    publishToMQTTBroker(topic, message); // Try to publish the data again
  }
}