#include <Arduino_RouterBridge.h>

// Handler called by Python via Bridge.call("set_led", state)
void set_led(bool state) {
  digitalWrite(LED_BUILTIN, state ? HIGH : LOW);
  Serial.println("changed value");
}

void setup() {
  Bridge.begin();
  Serial.begin(9600);

  // Configure red LED pin as output, start with it off
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Register the handler so Python can call it
  Bridge.provide("set_led", set_led);
}

void loop() {
}
