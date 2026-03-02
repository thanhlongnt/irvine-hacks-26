# Fall Guard

A real-time fall detection system built at IrvineHacks 2026. An Arduino with an accelerometer detects falls using a 3-stage algorithm, streams camera footage, and alerts caregivers through a live web dashboard.

## Demo

**Devpost:** [irvine-hacks-2026-project](https://devpost.com/software/fall-guardian-6ga07s)

**YouTube:**

[![Fall Guard Demo](https://img.youtube.com/vi/TODO/0.jpg)](https://www.youtube.com/watch?v=R26BlcDNfOY)

## How it works

```
Arduino (IMU + Camera)
    │
    ├─► POST /fall       ──► Flask server (port 8081)
    │                              │
    ├─► Camera stream              ├─► WebSocket → React dashboard
    │   (port 4912)                │
    └─► Python fall detector       └─► POST /fall/cancel (thumbs-up gesture)
            │
            └─► VideoObjectDetection (hand gesture recognition)
```

1. The Arduino streams accelerometer data to the Python fall detector running on a laptop.
2. The 3-stage fall detector analyzes Y-axis acceleration for a sudden drop, sustained motion, and post-fall stillness.
3. On fall confirmation, the detector POSTs to the Flask server, which pushes a `fall_event` via Socket.IO to the dashboard.
4. A camera feed (embedded iframe) automatically appears on the dashboard when a fall is active.
5. A thumbs-up gesture detected by `VideoObjectDetection` sends a `POST /fall/cancel`, dismissing the alert. Caregivers can also click **Acknowledge** in the dashboard.

## Repository structure

```
.
├── arduino/
│   ├── sketch/              # Arduino firmware
│   ├── python/              # Fall detection + video inference (runs on laptop)
│   │   ├── main.py          # Entry point: wires up fall detector, video stream, UI
│   │   ├── fall_detector.py # 3-stage accelerometer fall detection algorithm
│   │   ├── config.py        # Tunable detection thresholds
│   │   └── requirements.txt
│   └── app.yaml
├── fall-detection-model/    # Edge Impulse model (.eim) for object detection
├── webapp/
│   ├── client/              # React + Vite dashboard
│   │   └── src/
│   │       ├── App.jsx          # Main fall alert dashboard
│   │       └── VideoDetection.jsx  # Debug view: live feed + detection log
│   └── server/
│       └── server.py        # Flask + Socket.IO backend (port 8081)
└── readme.md
```

## Fall detection algorithm

The `FallDetector` class (`arduino/python/fall_detector.py`) uses three sequential stages:

| Stage | Condition | Default threshold |
|-------|-----------|-------------------|
| 1 — Trigger | Sudden downward Y delta | `Y_DELTA_THRESHOLD = 0.6` |
| 2 — Falling window | Large Y range over short window | `Y_RANGE_THRESHOLD = 1.4` over `0.6 s` |
| 3 — Post-fall stillness | Low Y std-dev after impact | `POST_FALL_Y_STD_THRESHOLD = 0.35` over `2.0 s` |

A 5-second cooldown (`COOLDOWN_S`) prevents repeated alerts. Thresholds are configured in `arduino/python/config.py`.

## Web server API

The Flask server runs on port `8081`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/fall` | Trigger a fall alert |
| `POST` | `/fall/cancel` | Cancel the active alert (used by gesture detection) |
| `POST` | `/color/green` | Send a green sensor reading |
| `POST` | `/color/yellow` | Send a yellow sensor reading |
| `POST` | `/color/red` | Send a red sensor reading |

Socket.IO events emitted to the dashboard: `fall_event`, `color_update`, `fall_acknowledged`.

## Running locally

### Python (fall detector + video inference)

```bash
cd arduino/python
pip install -r requirements.txt
python main.py
```

### Web server

```bash
cd webapp/server
pip install flask flask-socketio flask-cors
python server.py
```

### React dashboard

```bash
cd webapp/client
npm install
npm run dev
```

The dashboard connects to the server at `http://localhost:8081`.

### Network setup

Find your machine's IP on the local network:

```bash
ipconfig getifaddr en0
```

The Arduino should point its HTTP requests to that IP on port `8081`. The camera stream is served by the Arduino board on port `4912`.
