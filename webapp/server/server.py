from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")


fall_time = None
current_color = None


@app.route("/fall", methods=["POST"])
def fall_detected():
    """Arduino hits this endpoint when a fall is detected."""
    global fall_time, current_color
    current_color = None
    fall_time = time.time()
    print("[server] Fall detected")
    socketio.emit("fall_event", {"timestamp": fall_time}, namespace='/')
    return jsonify({"status": "ok"}), 200


@app.route("/color/green", methods=["POST"])
def set_green():
    global current_color
    current_color = "green"
    print("[server] Color set to green")
    socketio.emit("color_update", {"color": "green", "timestamp": time.time()}, namespace='/')
    return jsonify({"status": "ok", "color": "green"}), 200


@app.route("/color/yellow", methods=["POST"])
def set_yellow():
    global current_color
    current_color = "yellow"
    print("[server] Color set to yellow")
    socketio.emit("color_update", {"color": "yellow", "timestamp": time.time()}, namespace='/')
    return jsonify({"status": "ok", "color": "yellow"}), 200


@app.route("/color/red", methods=["POST"])
def set_red():
    global current_color
    current_color = "red"
    print("[server] Color set to red")
    socketio.emit("color_update", {"color": "red", "timestamp": time.time()}, namespace='/')
    return jsonify({"status": "ok", "color": "red"}), 200


@socketio.on("connect")
def on_connect():
    print("[server] Client connected")
    if fall_time:
        emit("fall_event", {"timestamp": fall_time})
    if current_color:
        emit("color_update", {"color": current_color, "timestamp": time.time()})


@app.route("/fall/cancel", methods=["POST"])
def cancel_fall():
    """Cancel/dismiss the active fall alert."""
    global fall_time, current_color
    fall_time = None
    current_color = None
    print("[server] Fall alert cancelled")
    socketio.emit("fall_acknowledged", namespace='/')
    return jsonify({"status": "ok"}), 200


@socketio.on("acknowledge_fall")
def on_acknowledge():
    global fall_time, current_color
    fall_time = None
    current_color = None
    print("[server] Fall acknowledged — reset")
    socketio.emit("fall_acknowledged", namespace='/')


@socketio.on("disconnect")
def on_disconnect():
    print("[server] Client disconnected")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8081, debug=False)
