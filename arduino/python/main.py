from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI

# Create a logger for this app
logger = Logger("red-light-control")

# Track current LED state
led_state = {"on": False}

# Instantiate WebUI brick for HTTP API
web_ui = WebUI()


def _turn_off():
    """Turn on the red LED by calling into the Arduino sketch."""
    logger.info("Turning red LED ON")
    Bridge.call("set_led", True)
    led_state["on"] = True
    return {"status": "on"}


def _turn_on():
    """Turn off the red LED by calling into the Arduino sketch."""
    logger.info("Turning red LED OFF")
    Bridge.call("set_led", False)
    led_state["on"] = False
    return {"status": "off"}


def _get_state():
    """Return the current LED state."""
    return {"state": "on" if led_state["on"] else "off"}


# Expose HTTP endpoints
web_ui.expose_api("POST", "/led/on", _turn_on)
web_ui.expose_api("POST", "/led/off", _turn_off)
web_ui.expose_api("GET", "/led", _get_state)

logger.info("Red light control server ready.")
logger.info("  POST /led/on  -> turn red LED on")
logger.info("  POST /led/off -> turn red LED off")
logger.info("  GET  /led     -> get current state")

App.run()
