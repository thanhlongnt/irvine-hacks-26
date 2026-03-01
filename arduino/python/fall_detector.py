import statistics
import time
import requests
from collections import deque


class FallDetector:
    def __init__(
        self,
        y_delta_threshold=0.8,
        falling_window_s=0.8,
        y_range_threshold=1.4,
        min_directional_samples=2,
        post_fall_observation_s=2.0,
        post_fall_y_std_threshold=0.35,
        sample_window_size=200,
        cooldown_s=5.0,
        debug=True,
    ):
        self.y_delta_threshold = y_delta_threshold
        self.falling_window_s = falling_window_s
        self.y_range_threshold = y_range_threshold
        self.min_directional_samples = min_directional_samples
        self.post_fall_observation_s = post_fall_observation_s
        self.post_fall_y_std_threshold = post_fall_y_std_threshold
        self.cooldown_s = cooldown_s
        self.debug = debug

        self.samples = deque(maxlen=sample_window_size)

        self.state = "normal"
        self.trigger_time = None
        self.falling_window_y_values = []
        self.directional_sample_count = 0
        self.post_fall_start_time = None
        self.post_fall_y_values = []
        self.last_detection_time = None
        self.prev_y = None

    def _log(self, msg):
        if self.debug:
            print(f"[FallDetector] {msg}", flush=True)

    def _reset(self, reason="reset"):
        self._log(f"Resetting detector. Reason: {reason}")
        self.state = "normal"
        self.trigger_time = None
        self.falling_window_y_values = []
        self.directional_sample_count = 0
        self.post_fall_start_time = None
        self.post_fall_y_values = []

    def process_sample(self, x, y, z):
        now = time.monotonic()
        y = float(y)

        self.samples.append({
            "mono_t": now,
            "x": float(x),
            "y": y,
            "z": float(z),
        })

        if self.last_detection_time is not None:
            if now - self.last_detection_time < self.cooldown_s:
                self.prev_y = y
                return False

        if self.prev_y is None:
            self.prev_y = y
            return False

        delta_y = y - self.prev_y

        # Stage 1: sudden downward change
        if self.state == "normal":
            if delta_y < -self.y_delta_threshold:
                self.state = "falling_window"
                self.trigger_time = now
                self.falling_window_y_values = [self.prev_y, y]
                self.directional_sample_count = 1
                print("Stage 1")
                self._log(
                    f"Stage 1 PASSED | downward trigger detected | "
                    f"delta_y={delta_y:.3f} < -y_delta_threshold={-self.y_delta_threshold:.3f}"
                )

            self.prev_y = y
            return False

        # Stage 2: confirm large y-range over short window
        if self.state == "falling_window":
            if self.trigger_time is None:
                self.prev_y = y
                self._reset("trigger_time missing in falling_window state")
                return False

            self.falling_window_y_values.append(y)

            if delta_y < 0:
                self.directional_sample_count += 1

            elapsed_since_trigger = now - self.trigger_time

            if elapsed_since_trigger >= self.falling_window_s:
                if len(self.falling_window_y_values) < 2:
                    self.prev_y = y
                    self._reset("not enough falling-window samples")
                    return False

                window_min_y = min(self.falling_window_y_values)
                window_max_y = max(self.falling_window_y_values)
                window_range_y = window_max_y - window_min_y

                range_passed = window_range_y >= self.y_range_threshold
                direction_passed = self.directional_sample_count >= self.min_directional_samples

                self._log(
                    f"Stage 2 CHECK | range={window_range_y:.3f} "
                    f"(threshold={self.y_range_threshold:.3f}) | "
                    f"directional_samples={self.directional_sample_count} "
                    f"(threshold={self.min_directional_samples})"
                )

                if range_passed and direction_passed:
                    self.state = "post_fall_observation"
                    self.post_fall_start_time = now
                    self.post_fall_y_values = []
                    self._log("Stage 2 PASSED | falling window confirmed")
                    print("Stage 2")

                else:
                    self._log("Stage 2 FAILED | falling window not strong enough")
                    self._reset("stage 2 conditions not met")

            self.prev_y = y
            return False

        # Stage 3: post-fall stillness
        if self.state == "post_fall_observation":
            if self.post_fall_start_time is None:
                self.prev_y = y
                self._reset("post_fall_start_time missing in post_fall_observation state")
                return False

            self.post_fall_y_values.append(y)
            elapsed_since_post_fall = now - self.post_fall_start_time

            if elapsed_since_post_fall < self.post_fall_observation_s:
                self.prev_y = y
                return False

            if len(self.post_fall_y_values) < 3:
                self.prev_y = y
                self._reset("not enough post-fall samples")
                return False

            y_std = statistics.pstdev(self.post_fall_y_values)

            self._log(
                f"Stage 3 CHECK | y_std={y_std:.3f}, "
                f"threshold={self.post_fall_y_std_threshold:.3f}"
            )

            if y_std < self.post_fall_y_std_threshold:
                self.last_detection_time = now
                self.prev_y = y
                self._log("Stage 3 PASSED | fall confirmed")
                self._reset("fall confirmed")
                print("Stage 3")

                try:
                    requests.post("http://192.168.12.156:8081/fall", timeout=3)
                    self._log("Fall notification sent to server")
                except Exception as e:
                    self._log(f"Failed to notify server of fall: {e}")

                return True

            self.prev_y = y
            self._log("Stage 3 FAILED | stillness check failed")
            self._reset("stage 3 conditions not met")
            return False

        self.prev_y = y
        return False