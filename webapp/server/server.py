from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import time
import socket

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")


COLORS = ["red", "yellow", "green"]
color_index = 0
streaming = False


def fall_broadcaster():
    """Background task: broadcasts a color every 1 second when streaming is active."""
    global color_index
    while True:
        socketio.sleep(1)
        if not streaming:
            continue
        color = COLORS[color_index % len(COLORS)]
        color_index += 1
        print(f"[server] Broadcasting color: {color}")
        socketio.emit("color_update",
                     {"color": color, "timestamp": time.time()},
                     namespace='/')


@app.route("/")
def hello_world():
    print("[server] hello world")
    return "Hello, World!"


@socketio.on("connect")
def on_connect():
    print("[server] Client connected")
    emit("stream_status", {"streaming": streaming})


@socketio.on("start_stream")
def on_start_stream():
    global streaming
    streaming = True
    print("[server] Streaming started")
    socketio.emit("stream_status", {"streaming": True}, namespace='/')


@socketio.on("stop_stream")
def on_stop_stream():
    global streaming
    streaming = False
    print("[server] Streaming stopped")
    socketio.emit("stream_status", {"streaming": False}, namespace='/')


@socketio.on("disconnect")
def on_disconnect():
    print("[server] Client disconnected")


if __name__ == "__main__":
    socketio.start_background_task(fall_broadcaster)
    socketio.run(app, host="0.0.0.0", port=8081, debug=False)