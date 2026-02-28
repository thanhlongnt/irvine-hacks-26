from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import time
import socket

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")


def fall_broadcaster():
    """Background task: broadcasts a fall alert every 5 seconds."""
    while True:
        socketio.sleep(1)
        print("[server] Broadcasting fall alert")
        socketio.emit("fall_detected", 
                     {"message": "someone has fallen", "timestamp": time.time()}, 
                     namespace='/')


@app.route("/")
def hello_world():
    print("[server] hello world")
    return "Hello, World!"


@socketio.on("connect")
def on_connect():
    print("[server] Client connected")
    emit("fall_detected", {"message": "someone has fallen", "timestamp": time.time()})


@socketio.on("disconnect")
def on_disconnect():
    print("[server] Client disconnected")


if __name__ == "__main__":
    socketio.start_background_task(fall_broadcaster)
    socketio.run(app, host="0.0.0.0", port=8081, debug=False)