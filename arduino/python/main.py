from arduino.app_utils import *
from fall_detector import FallDetector
from config import (
    Y_DELTA_THRESHOLD,
    FALLING_WINDOW_S,
    Y_RANGE_THRESHOLD,
    MIN_DIRECTIONAL_SAMPLES,
    POST_FALL_OBSERVATION_S,
    POST_FALL_Y_STD_THRESHOLD,
    COOLDOWN_S,
    SAMPLE_WINDOW_SIZE,
    DEBUG,
)

logger = Logger("fall-alert")

fall_detector = FallDetector(
    y_delta_threshold=Y_DELTA_THRESHOLD,
    falling_window_s=FALLING_WINDOW_S,
    y_range_threshold=Y_RANGE_THRESHOLD,
    min_directional_samples=MIN_DIRECTIONAL_SAMPLES,
    post_fall_observation_s=POST_FALL_OBSERVATION_S,
    post_fall_y_std_threshold=POST_FALL_Y_STD_THRESHOLD,
    cooldown_s=COOLDOWN_S,
    sample_window_size=SAMPLE_WINDOW_SIZE,
    debug=DEBUG,
)


def ping_ui_fall_detected():
    logger.info("Fall confirmed, pinging UI")


def record_sensor_movement(x: float, y: float, z: float):
    try:
        fall_detected = fall_detector.process_sample(x, y, z)

        if fall_detected:
            ping_ui_fall_detected()

    except Exception as e:
        logger.exception(f"record_sensor_movement error: {e}")


try:
    Bridge.provide("record_sensor_movement", record_sensor_movement)
except RuntimeError:
    logger.debug("'record_sensor_movement' already registered")


App.run()