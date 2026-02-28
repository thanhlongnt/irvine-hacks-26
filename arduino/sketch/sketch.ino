#include <Arduino_RouterBridge.h>

// Handler called by Python via Bridge.call("set_led", state)
void set_led(bool state) {
  digitalWrite(LED_BUILTIN, state ? HIGH : LOW);
}

void setup() {
  Bridge.begin();

  // Configure red LED pin as output, start with it off
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Register the handler so Python can call it
  Bridge.provide("set_led", set_led);
}

void loop() {
  // Process any pending Bridge RPC calls from Python
  Bridge.update();
}
