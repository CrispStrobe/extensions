#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ev3_bridge.py
EV3 Bridge Server v2.3 with Integrated Script Manager

Run this on the EV3 brick (ev3dev). It exposes an HTTP/HTTPS JSON API on
ports 8080 (HTTP) and 8443 (HTTPS) that the TurboWarp ev3dev extension
talks to.

Usage:
    python3 ev3_bridge.py                # both HTTP (8080) and HTTPS (8443)
    python3 ev3_bridge.py --http-only    # HTTP on 8080 only
    python3 ev3_bridge.py --https-only   # HTTPS on 8443 only
    python3 ev3_bridge.py --port 9090    # override port
    python3 ev3_bridge.py --auth user:pw # require Basic auth
    python3 ev3_bridge.py --no-ui        # run headless (no on-brick UI)
    python3 ev3_bridge.py -v             # verbose logging

Quick test (replace IP):
    curl -X POST http://192.168.178.57:8080/ \\
         -H "Content-Type: application/json" \\
         -d '{"cmd": "beep", "freq": 1000, "dur": 500}'
"""

import http.server
import socketserver
import json
import os
import sys
import threading
import subprocess
import time
import base64
import argparse
import traceback
import signal
from datetime import datetime
import ssl

# EV3 imports
from ev3dev2.motor import (
    Motor,
    MediumMotor,
    OUTPUT_A,
    OUTPUT_B,
    OUTPUT_C,
    OUTPUT_D,
    SpeedPercent,
    ServoMotor,
    DcMotor,
    MoveSteering,
)
from ev3dev2.sensor import INPUT_1, INPUT_2, INPUT_3, INPUT_4
from ev3dev2.port import LegoPort
from ev3dev2.sensor.lego import (
    TouchSensor,
    ColorSensor,
    UltrasonicSensor,
    GyroSensor,
    InfraredSensor,
    SoundSensor,
    LightSensor,
)
from ev3dev2.sound import Sound
from ev3dev2.display import Display
from ev3dev2.button import Button
from ev3dev2.led import Leds
from ev3dev2.power import PowerSupply


# ============================================================================
# CONFIGURATION
# ============================================================================

PORT = 8080
SCRIPTS_DIR = "/home/robot/scripts"
SOUNDS_DIR = "/home/robot/sounds"

USE_SSL = False
SSL_CERT = "ev3.crt"
SSL_KEY = "ev3.key"

VERBOSE = False

# Add connection tracking
connection_counter = 0
connection_lock = threading.Lock()

# Ensure directories exist
os.makedirs(SCRIPTS_DIR, exist_ok=True)
os.makedirs(SOUNDS_DIR, exist_ok=True)

# ============================================================================
# GLOBAL STATE
# ============================================================================

# Hardware Cache — keyed by port char (or "DC_A", "M_A", "SERVO_A" for motor variants).
motors: dict = {}
sensors: dict = {}
display = Display()
sound = Sound()
buttons = Button()
leds = Leds()
power = PowerSupply()

# === Motor Configuration Memory ===
# Stores ramping (smoothing) settings for each port.
# Default is 250ms (Smooth). 0ms would be sharp/instant.
motor_config = {
    'A': {'up': 250, 'down': 250},
    'B': {'up': 250, 'down': 250},
    'C': {'up': 250, 'down': 250},
    'D': {'up': 250, 'down': 250},
}

# Script management
running_scripts: dict = {}
script_counter = 0
script_lock = threading.Lock()
script_list: list = []  # List of available scripts
script_list_lock = threading.Lock()
current_menu_index = 0
menu_scroll_offset = 0

# UI Mode
ui_mode = "status"  # "status" or "scripts"

# === SERVER STATE (filled in by main()) ===
# Surfaced on the brick's status screen so you can read the IP/port at a glance.
SERVER_IP = "?"
SERVER_HOSTNAME = "?"
HTTP_PORT_RUNNING = None
HTTPS_PORT_RUNNING = None

# === AUTHENTICATION ===
AUTH_HEADER_EXPECTED = None

# ============================================================================
# SIGNAL HANDLERS
# ============================================================================


def signal_handler(sig, frame):
    """Handle Ctrl+C and termination signals"""
    print("\nStopping all scripts...")

    # Stop all running scripts
    for script_id, script_info in list(running_scripts.items()):
        try:
            script_info["process"].terminate()
        except Exception:
            pass

    # Stop all motors
    try:
        for motor in list(motors.values()):
            if motor:
                try:
                    motor.stop()
                except Exception:
                    pass
    except Exception:
        pass

    print("Shutdown complete")
    os._exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ============================================================================
# LOGGING
# ============================================================================


def vlog(message, data=None):
    """Verbose logging"""
    if VERBOSE:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        if data:
            print("[{0}] [BRIDGE] {1}: {2}".format(timestamp, message, data))
        else:
            print("[{0}] [BRIDGE] {1}".format(timestamp, message))


def log(message, data=None):
    """Standard logging"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if data:
        print("[{0}] {1}: {2}".format(timestamp, message, data))
    else:
        print("[{0}] {1}".format(timestamp, message))


# ============================================================================
# SCRIPT MANAGER
# ============================================================================


class ScriptManager:
    """Manages scripts in the scripts directory"""

    def __init__(self, scripts_dir):
        self.scripts_dir = scripts_dir
        self.last_scan = 0
        self.scan_interval = 2.0  # Scan every 2 seconds

    def scan_scripts(self):
        """Scan scripts directory and return list of .py files"""
        global script_list

        current_time = time.time()

        # Only scan if interval has passed
        if current_time - self.last_scan < self.scan_interval:
            return script_list

        self.last_scan = current_time

        try:
            py_files = sorted(
                [
                    f
                    for f in os.listdir(self.scripts_dir)
                    if f.endswith(".py")
                    and os.path.isfile(os.path.join(self.scripts_dir, f))
                ]
            )

            with script_list_lock:
                old_count = len(script_list)
                script_list = py_files
                new_count = len(script_list)

                if new_count != old_count:
                    log("Script list updated", {"count": new_count})

            for script in py_files:
                script_path = os.path.join(self.scripts_dir, script)
                self._ensure_executable(script_path)

            return script_list

        except Exception as e:
            log("Script scan error", str(e))
            if VERBOSE:
                traceback.print_exc()
            return []

    def _ensure_executable(self, script_path):
        """Ensure script has proper shebang and is executable"""
        try:
            with open(script_path, "r") as f:
                first_line = f.readline()
                if not first_line.startswith("#!"):
                    content = f.read()
                    with open(script_path, "w") as fw:
                        fw.write("#!/usr/bin/env python3\n" + first_line + content)
                    log("Added shebang to", script_path)

            os.chmod(script_path, 0o755)

        except Exception as e:
            vlog("Could not make script executable", str(e))

    def run_script(self, script_name):
        """Run a script with bounded log capture"""
        global script_counter

        script_path = os.path.join(self.scripts_dir, script_name)

        # SECURITY: Validate filename to prevent path traversal
        if not script_name.endswith('.py') or '/' in script_name or '..' in script_name or '\\' in script_name:
            log("Invalid script name", {"name": script_name, "reason": "path_traversal_attempt"})
            return None

        if not os.path.exists(script_path):
            log("Script not found", {"name": script_name, "path": script_path})
            return None

        try:
            with script_lock:
                script_id = script_counter
                script_counter += 1

            log("Starting script", {
                "name": script_name,
                "id": script_id,
                "path": script_path
            })

            log_file = "/tmp/ev3_script_{0}.log".format(script_id)
            log_fd = open(log_file, 'w', buffering=1)

            proc = subprocess.Popen(
                ["python3", "-u", script_path],
                stdout=log_fd,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                cwd=self.scripts_dir,
            )

            with script_lock:
                running_scripts[script_id] = {
                    "name": script_name,
                    "process": proc,
                    "started": time.time(),
                    "log_file": log_file,
                    "log_fd": log_fd,
                }

            log("Script started successfully", {
                "name": script_name,
                "id": script_id,
                "pid": proc.pid,
                "log_file": log_file
            })

            try:
                sound.beep()
            except Exception as e:
                vlog("Could not play start sound", str(e))

            return script_id

        except Exception as e:
            log("Script start failed", {
                "name": script_name,
                "error": str(e),
                "type": type(e).__name__
            })
            if VERBOSE:
                traceback.print_exc()
            return None

    def stop_script(self, script_id):
        """Stop a running script with comprehensive error handling."""
        import time

        start_time = time.time()

        log("Stop script requested", {"script_id": script_id, "timestamp": start_time})

        with script_lock:
            if script_id not in running_scripts:
                log("Script not running (already stopped or never existed)", {
                    "script_id": script_id,
                    "known_scripts": list(running_scripts.keys())
                })
                return False
            script_info = running_scripts[script_id].copy()

        process = script_info["process"]
        log_fd = script_info.get("log_fd")
        log_file = script_info.get("log_file")
        script_name = script_info["name"]
        start_timestamp = script_info["started"]
        runtime = time.time() - start_timestamp

        # Phase: SIGTERM then SIGKILL
        try:
            poll_result = process.poll()
            process_stopped = poll_result is not None
        except Exception:
            process_stopped = False

        if not process_stopped:
            try:
                process.terminate()
                try:
                    process.wait(timeout=2.0)
                    process_stopped = True
                except subprocess.TimeoutExpired:
                    process_stopped = False
            except OSError as e:
                process_stopped = (e.errno == 3)
            except Exception as e:
                log("Unexpected error during SIGTERM", {"error": str(e)})

        if not process_stopped:
            try:
                process.kill()
                try:
                    process.wait(timeout=1.0)
                except subprocess.TimeoutExpired:
                    pass
                process_stopped = True
            except OSError as e:
                process_stopped = (e.errno == 3)
            except Exception as e:
                log("Unexpected error during SIGKILL", {"error": str(e)})

        # Cleanup log file
        if log_fd:
            try:
                log_fd.flush()
                log_fd.close()
            except Exception as e:
                log("Error closing log file", {"error": str(e)})

        if log_file and os.path.exists(log_file):
            try:
                os.remove(log_file)
            except Exception as e:
                log("Error deleting log file", {"error": str(e)})

        with script_lock:
            running_scripts.pop(script_id, None)

        log("Script stop completed", {
            "script_id": script_id,
            "name": script_name,
            "success": process_stopped,
            "total_stop_time_seconds": round(time.time() - start_time, 3),
            "script_runtime_seconds": round(runtime, 2),
        })

        try:
            sound.tone([(400, 100, 0)])
        except Exception:
            pass

        return True

    def get_script_log(self, script_id, max_lines=100):
        """Get recent log lines for a script"""
        with script_lock:
            if script_id not in running_scripts:
                log_file = "/tmp/ev3_script_{0}.log".format(script_id)
                if not os.path.exists(log_file):
                    return []
            else:
                log_file = running_scripts[script_id]["log_file"]

        try:
            import subprocess
            result = subprocess.run(
                ["tail", "-n", str(max_lines), log_file],
                capture_output=True,
                text=True,
                timeout=1
            )
            lines = result.stdout.strip().split('\n') if result.stdout else []
            return lines
        except Exception as e:
            log("Error reading script log", {"script_id": script_id, "error": str(e)})
            return []

    def stop_all_scripts(self):
        """Stop all running scripts"""
        for script_id in list(running_scripts.keys()):
            self.stop_script(script_id)
        log("All scripts stopped")

    def delete_script(self, script_name):
        """Delete a script file"""
        if not script_name.endswith('.py') or '/' in script_name or '..' in script_name:
            log("Invalid script name for deletion", script_name)
            return False

        script_path = os.path.join(self.scripts_dir, script_name)

        if not os.path.exists(script_path):
            return False

        try:
            for script_id, info in list(running_scripts.items()):
                if info["name"] == script_name:
                    self.stop_script(script_id)

            os.remove(script_path)
            log("Script deleted", script_name)
            self.scan_scripts()
            return True

        except Exception as e:
            log("Script delete error", str(e))
            return False


script_manager = ScriptManager(SCRIPTS_DIR)

# ============================================================================
# MOTOR & SENSOR HELPERS
# ============================================================================

def get_motor(port_char):
    """Lazy load generic Tacho Motor with custom ramping from config."""
    if port_char in motors:
        motor = motors[port_char]
        if motor:
            try:
                if motor.connected:
                    return motor
            except Exception:
                pass
            log("Motor {0} disconnected".format(port_char))
            motors[port_char] = None

    try:
        mapping = {"A": OUTPUT_A, "B": OUTPUT_B, "C": OUTPUT_C, "D": OUTPUT_D}
        m = Motor(mapping[port_char])
        settings = motor_config.get(port_char, {'up': 250, 'down': 250})
        m.ramp_up_sp = settings['up']
        m.ramp_down_sp = settings['down']
        motors[port_char] = m
        log("Tacho Motor initialized on port {0} (Ramp: {1})".format(port_char, settings['up']))
    except Exception as e:
        log("Motor init failed: {0}".format(str(e)))
        motors[port_char] = None

    return motors[port_char]


def get_dc_motor(port_char):
    """Lazy load DC Motor (RCX / Power Functions)"""
    key = "DC_" + port_char
    if key in motors and motors[key]:
        return motors[key]

    try:
        mapping = {"A": OUTPUT_A, "B": OUTPUT_B, "C": OUTPUT_C, "D": OUTPUT_D}
        motors[key] = DcMotor(mapping[port_char])
        log("DC Motor initialized on port {0}".format(port_char))
    except Exception as e:
        log("DC Motor init failed: {0}".format(str(e)))
        motors[key] = None
    return motors[key]


def get_medium_motor(port_char):
    """Lazy load medium motors"""
    key = "M" + port_char
    if key not in motors:
        try:
            mapping = {"A": OUTPUT_A, "B": OUTPUT_B, "C": OUTPUT_C, "D": OUTPUT_D}
            motors[key] = MediumMotor(mapping[port_char])
            log("Medium motor initialized on port {0}".format(port_char))
        except Exception as e:
            log("Failed to initialize medium motor on port {0}".format(port_char), str(e))
            motors[key] = None
    return motors[key]


def get_servo_motor(port_char):
    """Lazy load servo motors"""
    key = "SERVO_" + port_char
    if key not in motors:
        try:
            mapping = {"A": OUTPUT_A, "B": OUTPUT_B, "C": OUTPUT_C, "D": OUTPUT_D}
            motors[key] = ServoMotor(mapping[port_char])
            log("Servo motor initialized on port {0}".format(port_char))
        except Exception as e:
            log("Servo motor init failed", str(e))
            motors[key] = None
    return motors[key]


def get_sensor(port, sensor_type):
    """Get or create sensor on specified port"""
    key = "{0}_{1}".format(port, sensor_type)
    if key not in sensors:
        port_map = {"1": INPUT_1, "2": INPUT_2, "3": INPUT_3, "4": INPUT_4}
        sensor_classes = {
            "touch": TouchSensor,
            "color": ColorSensor,
            "ultrasonic": UltrasonicSensor,
            "gyro": GyroSensor,
            "infrared": InfraredSensor,
            "sound": SoundSensor,
            "light": LightSensor,
        }
        try:
            sensors[key] = sensor_classes[sensor_type](port_map[port])
            sensor = sensors[key]
            if sensor_type == "touch":
                sensor.mode = "TOUCH"
            elif sensor_type == "color":
                sensor.mode = "COL-REFLECT"
            elif sensor_type == "ultrasonic":
                sensor.mode = "US-DIST-CM"
            elif sensor_type == "gyro":
                sensor.mode = "GYRO-ANG"
            elif sensor_type == "infrared":
                sensor.mode = "IR-PROX"
            elif sensor_type == "sound":
                sensor.mode = "DB"
            elif sensor_type == "light":
                sensor.mode = "REFLECT"
            log("Initialized {0} sensor on port {1}".format(sensor_type, port))
        except Exception as e:
            log("Sensor init failed", str(e))
            sensors[key] = None
    return sensors[key]


def safe_motor_command(motor, command_func, error_msg="Motor operation failed"):
    """Execute motor command with disconnect protection"""
    if not motor:
        return False
    try:
        command_func()
        return True
    except Exception as e:
        log(error_msg, str(e))
        for port, m in list(motors.items()):
            if m is motor:
                motors[port] = None
                break
        return False


# ============================================================================
# HTTP HANDLER
# ============================================================================

class BridgeHandler(http.server.BaseHTTPRequestHandler):

    def check_authentication(self):
        """Check Basic Auth credentials. Returns True if OK."""
        if AUTH_HEADER_EXPECTED is None:
            return True
        auth_header = self.headers.get("Authorization")
        if auth_header == AUTH_HEADER_EXPECTED:
            return True
        log("Authentication failed from {0}".format(self.client_address[0]))
        self._send_json({"status": "error", "msg": "Unauthorized"}, 401)
        return False

    def log_message(self, format, *args):
        """Log ALL HTTP requests"""
        with connection_lock:
            conn_id = connection_counter
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        print("[{0}] [HTTP] [{1}] {2} {3} from {4}".format(
            timestamp, conn_id, self.command, self.path, self.client_address[0]))

    def end_headers(self):
        """Add CORS headers for browser compatibility"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
        self.send_header('Access-Control-Max-Age', '86400')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def _send_json(self, data, code=200):
        """Send JSON response"""
        self.send_response(code)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        """Handle POST requests"""
        if not self.check_authentication():
            return

        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode("utf-8"))
            command = data.get("cmd")
            log("Command: {0}".format(command))

            # === SCRIPT MANAGEMENT ===
            if command == "upload_script":
                filename = data["name"]
                code = data["code"]
                if not filename.endswith('.py') or '/' in filename or '..' in filename or '\\' in filename:
                    self._send_json({"status": "error", "msg": "Invalid filename"}, 400)
                    return
                os.makedirs(SCRIPTS_DIR, exist_ok=True)
                filepath = os.path.join(SCRIPTS_DIR, filename)
                with open(filepath, "w") as f:
                    if not code.startswith("#!"):
                        f.write("#!/usr/bin/env python3\n")
                    f.write(code)
                os.chmod(filepath, 0o755)
                log("Script uploaded", filename)
                script_manager.scan_scripts()
                self._send_json({"status": "ok", "msg": "Script uploaded"})

            elif command == "upload_sound":
                filename = data.get("name")
                sound_data_b64 = data.get("data")
                if not filename or not sound_data_b64:
                    self._send_json({"status": "error", "msg": "Missing filename or data"}, 400)
                    return
                if not filename.endswith(('.wav', '.mp3', '.ogg')):
                    self._send_json({"status": "error", "msg": "Invalid file type"}, 400)
                    return
                safe_filename = os.path.basename(filename)
                safe_filename = "".join(c for c in safe_filename if c.isalnum() or c in '._-')
                if not safe_filename:
                    self._send_json({"status": "error", "msg": "Invalid filename"}, 400)
                    return
                try:
                    try:
                        sound_data = base64.b64decode(sound_data_b64, validate=True)
                    except Exception:
                        self._send_json({"status": "error", "msg": "Invalid base64"}, 400)
                        return
                    if len(sound_data) > 10 * 1024 * 1024:
                        self._send_json({"status": "error", "msg": "File too large (max 10MB)"}, 400)
                        return
                    filepath = os.path.join(SOUNDS_DIR, safe_filename)
                    with open(filepath, "wb") as f:
                        f.write(sound_data)
                    log("Sound uploaded", {"filename": safe_filename, "size": len(sound_data)})
                    self._send_json({
                        "status": "ok",
                        "msg": "Sound uploaded",
                        "filename": safe_filename,
                        "size": len(sound_data),
                    })
                except Exception as e:
                    log("Sound upload failed", str(e))
                    self._send_json({"status": "error", "msg": str(e)}, 500)

            elif command == "run_script":
                script_name = data["name"]
                script_id = script_manager.run_script(script_name)
                if script_id is not None:
                    self._send_json({"status": "ok", "script_id": script_id, "msg": "Script started"})
                else:
                    self._send_json({"status": "error", "msg": "Failed to start"}, 500)

            elif command == "stop_script":
                script_id = data.get("script_id")
                if script_manager.stop_script(script_id):
                    self._send_json({"status": "ok", "msg": "Script stopped"})
                else:
                    self._send_json({"status": "error", "msg": "Script not found"}, 404)

            elif command == "stop_all_scripts":
                script_manager.stop_all_scripts()
                self._send_json({"status": "ok", "msg": "All scripts stopped"})

            elif command == "delete_script":
                script_name = data["name"]
                if script_manager.delete_script(script_name):
                    self._send_json({"status": "ok", "msg": "Script deleted"})
                else:
                    self._send_json({"status": "error", "msg": "Delete failed"}, 500)

            # === PORT CONFIGURATION (NXT sensor fix) ===
            elif command == "configure_port":
                port_num = str(data["port"])
                device_type = data["device"]
                address = "in" + port_num
                try:
                    p = LegoPort(address)
                    if device_type == "lego-nxt-touch":
                        p.mode = "nxt-analog"
                        time.sleep(0.1)
                        p.set_device = "lego-nxt-touch"
                    elif device_type == "lego-nxt-light":
                        p.mode = "nxt-analog"
                        time.sleep(0.1)
                        p.set_device = "lego-nxt-light"
                    elif device_type == "lego-nxt-sound":
                        p.mode = "nxt-analog"
                        time.sleep(0.1)
                        p.set_device = "lego-nxt-sound"
                    elif device_type == "reset":
                        p.mode = "auto"
                    time.sleep(0.5)
                    self._send_json({"status": "ok"})
                except Exception as e:
                    log("Port config failed for {0}: {1}".format(address, str(e)))
                    self._send_json({"status": "error", "msg": str(e)})

            # === MOTORS ===
            elif command == "motor_run":
                m = get_motor(data["port"])
                if m:
                    m.on(SpeedPercent(data["speed"]))
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif command == "motor_run_for":
                m = get_motor(data["port"])
                if safe_motor_command(
                    m,
                    lambda: m.on_for_rotations(
                        SpeedPercent(data["speed"]),
                        data["rotations"],
                        brake=data.get("brake", True),
                        block=False,
                    ),
                    "Motor run_for failed",
                ):
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif command == "motor_run_timed":
                m = get_motor(data["port"])
                if m:
                    m.on_for_seconds(
                        SpeedPercent(data["speed"]),
                        data["seconds"],
                        block=data.get("block", False),
                    )
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif command == "motor_run_to_position":
                m = get_motor(data["port"])
                if m:
                    m.on_to_position(
                        SpeedPercent(data["speed"]),
                        data["position"],
                        block=data.get("block", False),
                    )
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif command == "motor_stop":
                m = get_motor(data["port"])
                brake_mode = data.get("brake", "brake")
                if safe_motor_command(m, lambda: m.stop(stop_action=brake_mode), "Motor stop failed"):
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif command == "motor_reset":
                m = get_motor(data["port"])
                if m:
                    m.position = 0
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif command == "medium_motor_run":
                m = get_medium_motor(data["port"])
                if m:
                    m.on(SpeedPercent(data["speed"]))
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Medium motor not connected"})

            elif command == "tank_drive":
                motor_left = get_motor(data.get("left_port", "B"))
                motor_right = get_motor(data.get("right_port", "C"))
                if not motor_left or not motor_right:
                    self._send_json({"status": "error", "msg": "Motors not connected"})
                    return
                try:
                    motor_left.on_for_rotations(
                        SpeedPercent(data["left"]),
                        data["rotations"],
                        brake=data.get("brake", True),
                        block=False,
                    )
                    motor_right.on_for_rotations(
                        SpeedPercent(data["right"]),
                        data["rotations"],
                        brake=data.get("brake", True),
                        block=True,
                    )
                    self._send_json({"status": "ok"})
                except Exception as e:
                    log("Tank drive failed", str(e))
                    motors[data.get("left_port", "B")] = None
                    motors[data.get("right_port", "C")] = None
                    self._send_json({"status": "error", "msg": "Tank drive failed - motors disconnected"})

            elif command == "set_motor_ramping":
                port = data["port"]
                ramp_up = int(data.get("up", 250))
                ramp_down = int(data.get("down", 250))
                if port in motor_config:
                    motor_config[port]['up'] = ramp_up
                    motor_config[port]['down'] = ramp_down
                m = get_motor(port)
                self._send_json({"status": "ok"})

            elif command == "stop_all_motors":
                try:
                    for port_char in ["A", "B", "C", "D"]:
                        m = get_motor(port_char)
                        if m:
                            m.stop()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            # === SERVO MOTOR ===
            elif command == "servo_run":
                m = get_servo_motor(data["port"])
                if m:
                    m.on(SpeedPercent(data["speed"]))
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Servo not connected"})

            elif command == "servo_run_to_position":
                m = get_servo_motor(data["port"])
                if m:
                    m.run_to_abs_pos(position_sp=data["position"], speed_sp=SpeedPercent(data.get("speed", 50)))
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Servo not connected"})

            elif command == "servo_stop":
                m = get_servo_motor(data["port"])
                if m:
                    m.stop()
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "Servo not connected"})

            # === DC MOTORS ===
            elif command == "dc_motor_run":
                m = get_dc_motor(data["port"])
                if m:
                    m.duty_cycle_sp = data["speed"]
                    m.run_direct()
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "DC Motor not connected"})

            elif command == "dc_motor_stop":
                m = get_dc_motor(data["port"])
                if m:
                    m.stop()
                    self._send_json({"status": "ok"})
                else:
                    self._send_json({"status": "error", "msg": "DC Motor not connected"})

            # === MOVE STEERING ===
            elif command == "move_steering":
                try:
                    steering = MoveSteering(
                        data.get("left_port", "B"),
                        data.get("right_port", "C"),
                        motor_class=Motor,
                    )
                    steer_val = data["steering"]
                    speed_val = SpeedPercent(data["speed"])
                    brake_mode = data.get("brake", True)
                    if "rotations" in data:
                        steering.on_for_rotations(steer_val, speed_val, data["rotations"], brake=brake_mode, block=False)
                    elif "seconds" in data:
                        steering.on_for_seconds(steer_val, speed_val, data["seconds"], brake=brake_mode, block=False)
                    else:
                        steering.on(steer_val, speed_val)
                    self._send_json({"status": "ok"})
                except Exception as e:
                    log("MoveSteering failed", str(e))
                    self._send_json({"status": "error", "msg": str(e)})

            # === DISPLAY ===
            elif command == "screen_clear":
                display.clear()
                display.update()
                self._send_json({"status": "ok"})

            elif command == "screen_text":
                display.text_pixels(str(data["text"]), x=data["x"], y=data["y"])
                display.update()
                self._send_json({"status": "ok"})

            elif command == "screen_text_grid":
                display.text_grid(str(data["text"]), x=data["x"], y=data["y"])
                display.update()
                self._send_json({"status": "ok"})

            elif command == "draw_circle":
                try:
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(display.image)
                    x, y, r = data["x"], data["y"], data["r"]
                    fill = data.get("fill", False)
                    draw.ellipse((x - r, y - r, x + r, y + r), outline="black", fill="black" if fill else None)
                    display.update()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            elif command == "draw_rectangle":
                try:
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(display.image)
                    fill = data.get("fill", False)
                    draw.rectangle((data["x1"], data["y1"], data["x2"], data["y2"]),
                                   outline="black", fill="black" if fill else None)
                    display.update()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            elif command == "draw_line":
                try:
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(display.image)
                    width = data.get("width", 1)
                    draw.line((data["x1"], data["y1"], data["x2"], data["y2"]), fill="black", width=width)
                    display.update()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            elif command == "draw_point":
                try:
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(display.image)
                    draw.point((data["x"], data["y"]), fill="black")
                    display.update()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            elif command == "draw_polygon":
                try:
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(display.image)
                    points = data["points"]
                    fill = data.get("fill", False)
                    draw.polygon(points, outline="black", fill="black" if fill else None)
                    display.update()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            elif command == "draw_image":
                try:
                    from PIL import Image
                    import io
                    img_data = base64.b64decode(data["data"])
                    img = Image.open(io.BytesIO(img_data))
                    img = img.convert("1")
                    display.image.paste(img, (data.get("x", 0), data.get("y", 0)))
                    display.update()
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            # === SOUND ===
            elif command == "speak":
                text = str(data["text"])
                has_umlauts = any(c in text for c in "äöüÄÖÜß")
                if has_umlauts or data.get("lang") == "de":
                    sound.speak(text, espeak_opts="-v de -a 200 -s 120")
                else:
                    sound.speak(text)
                self._send_json({"status": "ok"})

            elif command == "beep":
                freq = data.get("freq", 1000)
                dur = data.get("dur", 100)
                # play_tone takes seconds, not ms
                sound.play_tone(freq, dur / 1000.0)
                self._send_json({"status": "ok"})

            elif command == "play_tone":
                freq = data.get("freq", 440)
                dur = data.get("dur", 1000)
                sound.tone(freq, dur)
                self._send_json({"status": "ok"})

            elif command == "play_tone_sequence":
                sequence = data.get("sequence", [])
                sound.tone(sequence)
                self._send_json({"status": "ok"})

            elif command == "simple_beep":
                args = data.get("args", "")
                sound.beep(args=args)
                self._send_json({"status": "ok"})

            elif command == "play_note":
                note = data.get("note", "C4")
                duration = data.get("duration", 0.5)
                sound.play_note(note, duration)
                self._send_json({"status": "ok"})

            elif command == "play_file":
                filename = data.get("filename")
                if filename:
                    filepath = os.path.join(SOUNDS_DIR, filename)
                    if os.path.exists(filepath):
                        sound.play_file(filepath, volume=data.get("volume", 100))
                        self._send_json({"status": "ok"})
                    else:
                        self._send_json({"status": "error", "msg": "File not found"}, 404)
                else:
                    self._send_json({"status": "error", "msg": "No filename"}, 400)

            elif command == "play_song":
                raw_notes = data.get("notes", [])
                tempo = data.get("tempo", 120)
                notes = [(n[0], n[1]) for n in raw_notes]
                try:
                    sound.play_song(notes, tempo=tempo)
                    self._send_json({"status": "ok"})
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)})

            elif command == "set_volume":
                sound.set_volume(data["volume"])
                self._send_json({"status": "ok"})

            elif command == "get_volume":
                self._send_json({"status": "ok", "volume": sound.get_volume()})

            # === LED ===
            elif command == "set_led":
                color = data["color"]
                if color == "OFF":
                    color = "BLACK"
                side = data.get("side", "BOTH")
                if side == "BOTH":
                    leds.set_color("LEFT", color)
                    leds.set_color("RIGHT", color)
                else:
                    leds.set_color(side, color)
                self._send_json({"status": "ok"})

            elif command == "led_off":
                leds.all_off()
                self._send_json({"status": "ok"})

            elif command == "led_reset":
                leds.reset()
                self._send_json({"status": "ok"})

            elif command == "led_animate_police":
                leds.animate_police_lights(
                    data.get("color1", "RED"),
                    data.get("color2", "BLUE"),
                    sleeptime=data.get("sleeptime", 0.5),
                    duration=data.get("duration", 5),
                    block=False,
                )
                self._send_json({"status": "ok"})

            elif command == "led_animate_flash":
                leds.animate_flash(
                    data.get("color", "AMBER"),
                    groups=tuple(data.get("groups", ["LEFT", "RIGHT"])),
                    sleeptime=data.get("sleeptime", 0.5),
                    duration=data.get("duration", 5),
                    block=False,
                )
                self._send_json({"status": "ok"})

            elif command == "led_animate_cycle":
                leds.animate_cycle(
                    tuple(data.get("colors", ["RED", "GREEN", "AMBER"])),
                    groups=tuple(data.get("groups", ["LEFT", "RIGHT"])),
                    sleeptime=data.get("sleeptime", 0.5),
                    duration=data.get("duration", 5),
                    block=False,
                )
                self._send_json({"status": "ok"})

            elif command == "led_animate_rainbow":
                leds.animate_rainbow(
                    increment_by=data.get("increment", 0.1),
                    sleeptime=data.get("sleeptime", 0.1),
                    duration=data.get("duration", 5),
                    block=False,
                )
                self._send_json({"status": "ok"})

            elif command == "led_stop_animation":
                leds.animate_stop()
                self._send_json({"status": "ok"})

            else:
                log("Unknown command: {0}".format(command))
                self._send_json({"status": "error", "msg": "Unknown command"}, 400)

        except Exception as e:
            log("Error processing command", str(e))
            if VERBOSE:
                traceback.print_exc()
            self._send_json({"status": "error", "msg": str(e)}, 500)

    def do_GET(self):
        """Handle GET requests (sensor reads, status etc)"""
        if not self.check_authentication():
            return

        try:
            if self.path == "/" or self.path == "/status":
                self._send_json({
                    "status": "ev3_bridge_active",
                    "version": "2.3.0",
                    "running_scripts": len(running_scripts),
                    "available_scripts": len(script_list),
                    "motors": list(motors.keys()),
                    "sensors": list(sensors.keys()),
                })

            elif self.path == "/scripts":
                scripts = script_manager.scan_scripts()
                self._send_json({
                    "status": "ok",
                    "scripts": scripts,
                    "running": [
                        {"id": sid, "name": info["name"], "runtime": time.time() - info["started"]}
                        for sid, info in running_scripts.items()
                    ],
                })

            elif self.path.startswith("/script/") and "/logs" in self.path:
                try:
                    parts = self.path.split('/')
                    script_id = int(parts[2])
                    max_lines = 100
                    if '?' in self.path:
                        query = self.path.split('?')[1]
                        for param in query.split('&'):
                            if param.startswith('max='):
                                max_lines = int(param.split('=')[1])
                    lines = script_manager.get_script_log(script_id, max_lines)
                    self._send_json({"status": "ok", "script_id": script_id, "lines": lines, "count": len(lines)})
                except ValueError:
                    self._send_json({"status": "error", "msg": "Invalid script ID"}, 400)
                except Exception as e:
                    self._send_json({"status": "error", "msg": str(e)}, 500)

            elif self.path == "/battery":
                voltage = power.measured_volts
                current = power.measured_amps
                percentage = max(0, min(100, ((voltage - 7.4) / (9.0 - 7.4)) * 100))
                self._send_json({"value": percentage, "voltage": voltage, "current": current})

            elif self.path.startswith("/motor/position/"):
                port = self.path.split("/")[-1].upper()
                m = get_motor(port)
                if m:
                    try:
                        self._send_json({"value": m.position})
                    except Exception:
                        motors[port] = None
                        self._send_json({"value": 0})
                else:
                    self._send_json({"value": 0})

            elif self.path.startswith("/motor/speed/"):
                port = self.path.split("/")[-1].upper()
                m = get_motor(port)
                if m:
                    try:
                        self._send_json({"value": m.speed})
                    except Exception:
                        motors[port] = None
                        self._send_json({"value": 0})
                else:
                    self._send_json({"value": 0})

            elif self.path.startswith("/motor/state/"):
                port = self.path.split("/")[-1].upper()
                m = get_motor(port)
                if m:
                    self._send_json({
                        "status": "ok",
                        "state": {
                            "position": m.position,
                            "speed": m.speed,
                            "is_running": m.is_running,
                            "is_stalled": m.is_stalled,
                        },
                    })
                else:
                    self._send_json({"status": "error", "msg": "Motor not connected"})

            elif self.path.startswith("/sensor/touch/"):
                port = self.path.split("/")[-1]
                sensor = get_sensor(port, "touch")
                self._send_json({"value": sensor.is_pressed if sensor else False})

            elif self.path.startswith("/sensor/color/"):
                parts = self.path.split("/")
                port = parts[3]
                mode = parts[4] if len(parts) > 4 else "color"
                sensor = get_sensor(port, "color")
                if not sensor:
                    self._send_json({"value": 0})
                    return
                if mode == "color":
                    value = sensor.color
                elif mode == "reflected_light_intensity":
                    value = sensor.reflected_light_intensity
                elif mode == "ambient_light_intensity":
                    value = sensor.ambient_light_intensity
                else:
                    value = 0
                self._send_json({"value": value})

            elif self.path.startswith("/sensor/color_rgb/"):
                parts = self.path.split("/")
                port = parts[3]
                component = parts[4] if len(parts) > 4 else "red"
                sensor = get_sensor(port, "color")
                if not sensor:
                    self._send_json({"value": 0})
                    return
                rgb = sensor.rgb
                idx = {"red": 0, "green": 1, "blue": 2}.get(component, 0)
                self._send_json({"value": rgb[idx] if rgb else 0})

            elif self.path.startswith("/sensor/ultrasonic/"):
                port = self.path.split("/")[-1]
                sensor = get_sensor(port, "ultrasonic")
                self._send_json({"value": sensor.distance_centimeters if sensor else 0})

            elif self.path.startswith("/sensor/gyro/"):
                parts = self.path.split("/")
                port = parts[3]
                mode = parts[4] if len(parts) > 4 else "angle"
                sensor = get_sensor(port, "gyro")
                if not sensor:
                    self._send_json({"value": 0 if mode != "both" else {"angle": 0, "rate": 0}})
                    return
                if mode == "angle":
                    value = sensor.angle
                elif mode == "rate":
                    value = sensor.rate
                elif mode == "both":
                    value = {"angle": sensor.angle, "rate": sensor.rate}
                else:
                    value = 0
                self._send_json({"value": value})

            elif self.path.startswith("/sensor/infrared/"):
                parts = self.path.split("/")
                port = parts[3]
                mode = parts[4] if len(parts) > 4 else "proximity"
                sensor = get_sensor(port, "infrared")
                if not sensor:
                    self._send_json({"value": 0})
                    return
                if mode == "proximity":
                    value = sensor.proximity
                elif mode == "heading":
                    channel = int(parts[5]) if len(parts) > 5 else 1
                    value = sensor.heading(channel)
                elif mode == "distance":
                    channel = int(parts[5]) if len(parts) > 5 else 1
                    value = sensor.distance(channel) or 0
                elif mode == "button":
                    channel = int(parts[5]) if len(parts) > 5 else 1
                    button = parts[6] if len(parts) > 6 else "top_left"
                    button_methods = {
                        "top_left": sensor.top_left,
                        "bottom_left": sensor.bottom_left,
                        "top_right": sensor.top_right,
                        "bottom_right": sensor.bottom_right,
                        "beacon": sensor.beacon,
                    }
                    value = button_methods.get(button, lambda ch: False)(channel)
                else:
                    value = 0
                self._send_json({"value": value})

            elif self.path.startswith("/sensor/sound/"):
                parts = self.path.split("/")
                port = parts[3]
                mode = parts[4] if len(parts) > 4 else "db"
                sensor = get_sensor(port, "sound")
                if not sensor:
                    self._send_json({"value": 0})
                    return
                if mode == "db":
                    sensor.mode = "DB"
                    value = sensor.sound_pressure
                elif mode == "dba":
                    sensor.mode = "DBA"
                    value = sensor.sound_pressure_low
                else:
                    value = 0
                self._send_json({"value": value})

            elif self.path.startswith("/sensor/light/"):
                parts = self.path.split("/")
                port = parts[3]
                mode = parts[4] if len(parts) > 4 else "reflect"
                sensor = get_sensor(port, "light")
                if not sensor:
                    self._send_json({"value": 0})
                    return
                if mode == "reflect":
                    sensor.mode = "REFLECT"
                    value = sensor.reflected_light_intensity
                elif mode == "ambient":
                    sensor.mode = "AMBIENT"
                    value = sensor.ambient_light_intensity
                else:
                    value = 0
                self._send_json({"value": value})

            elif self.path.startswith("/button/"):
                button_name = self.path.split("/")[-1]
                button_map = {
                    "up": buttons.up,
                    "down": buttons.down,
                    "left": buttons.left,
                    "right": buttons.right,
                    "enter": buttons.enter,
                    "backspace": buttons.backspace,
                }
                self._send_json({"value": button_map.get(button_name, False)})

            elif self.path == "/buttons/all":
                self._send_json({
                    "value": {
                        "up": buttons.up,
                        "down": buttons.down,
                        "left": buttons.left,
                        "right": buttons.right,
                        "enter": buttons.enter,
                        "backspace": buttons.backspace,
                    }
                })

            elif self.path == "/profile" or self.path == "/ev3.mobileconfig":
                self._serve_ios_profile()

            elif self.path == "/certificate" or self.path == "/ev3.crt":
                self._serve_certificate()

            elif self.path == "/test.html" or self.path == "/test":
                self._serve_test_page()

            else:
                self._send_json({"status": "error", "msg": "Unknown endpoint"}, 404)

        except Exception as e:
            log("Error processing GET", str(e))
            if VERBOSE:
                traceback.print_exc()
            self._send_json({"status": "error", "msg": str(e)}, 500)

    # ------------------------------------------------------------------
    # iOS / cert helpers (kept as separate methods for readability)
    # ------------------------------------------------------------------

    def _serve_ios_profile(self):
        """Generate iOS .mobileconfig with embedded certificate."""
        try:
            import socket
            import uuid
            with open(SSL_CERT, 'rb') as f:
                cert_data = f.read()
            cert_b64 = base64.b64encode(cert_data).decode('ascii')
            profile_uuid = str(uuid.uuid4()).upper()
            cert_uuid = str(uuid.uuid4()).upper()
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            profile = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadCertificateFileName</key>
            <string>ev3-robot.crt</string>
            <key>PayloadContent</key>
            <data>
{cert_data}
            </data>
            <key>PayloadDescription</key>
            <string>EV3 Robot SSL Certificate</string>
            <key>PayloadDisplayName</key>
            <string>EV3 Robot Certificate</string>
            <key>PayloadIdentifier</key>
            <string>com.ev3dev.cert.{cert_uuid}</string>
            <key>PayloadType</key>
            <string>com.apple.security.root</string>
            <key>PayloadUUID</key>
            <string>{cert_uuid}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Trust the EV3 Robot HTTPS certificate at {ip}</string>
    <key>PayloadDisplayName</key>
    <string>EV3 Robot ({ip})</string>
    <key>PayloadIdentifier</key>
    <string>com.ev3dev.profile.{profile_uuid}</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>{profile_uuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>""".format(cert_data=cert_b64, cert_uuid=cert_uuid, profile_uuid=profile_uuid, ip=local_ip)

            profile_bytes = profile.encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/x-apple-aspen-config")
            self.send_header("Content-Disposition", 'attachment; filename="EV3-Robot.mobileconfig"')
            self.send_header("Content-Length", str(len(profile_bytes)))
            self.end_headers()
            self.wfile.write(profile_bytes)
        except Exception as e:
            log("Profile generation error: {0}".format(str(e)))
            self._send_json({"status": "error", "msg": str(e)}, 500)

    def _serve_certificate(self):
        """Serve the SSL certificate for installation."""
        try:
            cert_path = SSL_CERT
            if not os.path.exists(cert_path):
                self._send_json({"status": "error", "msg": "Certificate not found"}, 404)
                return
            with open(cert_path, 'rb') as f:
                cert_data = f.read()
            cert_str = cert_data.decode('utf-8')
            if not cert_str.startswith('-----BEGIN CERTIFICATE-----'):
                self._send_json({"status": "error", "msg": "Invalid certificate format"}, 500)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/x-pem-file")
            self.send_header("Content-Disposition", 'attachment; filename="ev3.crt"')
            self.send_header("Content-Length", str(len(cert_data)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(cert_data)
        except Exception as e:
            log("Certificate download error: {0}".format(str(e)))
            self._send_json({"status": "error", "msg": str(e)}, 500)

    def _serve_test_page(self):
        """Tiny diagnostic page."""
        html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EV3 Bridge Test</title>
    <style>
        body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
        button { padding: 10px 20px; margin: 10px 0; font-size: 16px; }
        pre { background: #f0f0f0; padding: 10px; overflow: auto; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>EV3 Bridge Test Page</h1>
    <p>Protocol: <strong>""" + ("HTTPS" if USE_SSL else "HTTP") + """</strong></p>
    <button onclick="testStatus()">Test /status</button>
    <button onclick="testScripts()">Test /scripts</button>
    <button onclick="testBattery()">Test /battery</button>
    <h2>Result:</h2>
    <pre id="result">Click a button to test...</pre>
    <script>
    async function testEndpoint(url, name) {
        const resultEl = document.getElementById('result');
        resultEl.textContent = 'Testing ' + name + '...\\n';
        try {
            const response = await fetch(url);
            const data = await response.json();
            resultEl.textContent = 'SUCCESS: ' + name + '\\n\\n' + JSON.stringify(data, null, 2);
            resultEl.className = 'success';
        } catch (err) {
            resultEl.textContent = 'ERROR: ' + err.message;
            resultEl.className = 'error';
        }
    }
    function testStatus() { testEndpoint('/status', '/status'); }
    function testScripts() { testEndpoint('/scripts', '/scripts'); }
    function testBattery() { testEndpoint('/battery', '/battery'); }
    </script>
</body>
</html>"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html.encode())))
        self.end_headers()
        self.wfile.write(html.encode())


# ============================================================================
# EV3 UI WITH SCRIPT MENU
# ============================================================================

def draw_script_menu():
    """Draw the script selection menu"""
    global menu_scroll_offset
    display.clear()
    display.text_pixels("SCRIPT MENU", x=30, y=2)
    display.text_pixels("=" * 26, x=2, y=15)
    scripts = script_manager.scan_scripts()
    if not scripts:
        display.text_pixels("No scripts found", x=20, y=50)
        display.text_pixels("Upload via web", x=20, y=65)
        display.update()
        return
    max_visible = 5
    total_scripts = len(scripts)
    if current_menu_index < menu_scroll_offset:
        menu_scroll_offset = current_menu_index
    elif current_menu_index >= menu_scroll_offset + max_visible:
        menu_scroll_offset = current_menu_index - max_visible + 1
    y = 25
    for i in range(menu_scroll_offset, min(menu_scroll_offset + max_visible, total_scripts)):
        script_name = scripts[i]
        if len(script_name) > 20:
            display_name = script_name[:17] + "..."
        else:
            display_name = script_name
        prefix = "> " if i == current_menu_index else "  "
        display.text_pixels(prefix + display_name, x=5, y=y)
        y += 15
    if menu_scroll_offset > 0:
        display.text_pixels("^", x=170, y=25)
    if menu_scroll_offset + max_visible < total_scripts:
        display.text_pixels("v", x=170, y=100)
    display.text_pixels("-" * 26, x=2, y=110)
    display.text_pixels("ENTER=Run  BACK=Exit", x=5, y=118, font="helvB08")
    display.update()


def _format_endpoint_lines():
    """
    Build 1-2 short lines describing the active HTTP/HTTPS endpoints, e.g.:
        ['http  192.168.178.57:8080', 'https 192.168.178.57:8443']
    Skips entries whose port is not running.
    """
    lines = []
    if HTTP_PORT_RUNNING is not None:
        lines.append("http  {0}:{1}".format(SERVER_IP, HTTP_PORT_RUNNING))
    if HTTPS_PORT_RUNNING is not None:
        lines.append("https {0}:{1}".format(SERVER_IP, HTTPS_PORT_RUNNING))
    if not lines:
        lines.append("(no servers running)")
    return lines


def draw_status_screen():
    """Draw the main status screen.

    Layout (top → bottom):
        - Title bar
        - Endpoint lines (IP + http port, IP + https port)
        - Hostname
        - Script counters / running scripts
        - Battery
        - Footer
    """
    display.clear()
    display.text_pixels("EV3 BRIDGE v2.3", x=15, y=2)
    display.text_pixels("=" * 26, x=2, y=14)

    # === Top: prominently show IP + port(s) so you can read it from the brick ===
    y = 22
    for line in _format_endpoint_lines():
        display.text_pixels(line, x=2, y=y)
        y += 11

    if SERVER_HOSTNAME and SERVER_HOSTNAME != "?":
        display.text_pixels("host: {0}".format(SERVER_HOSTNAME), x=2, y=y)
        y += 11

    # Small visual gap then counters
    y += 2
    display.text_pixels("Scripts: {0}  Running: {1}".format(
        len(script_list), len(running_scripts)), x=2, y=y)
    y += 12

    if running_scripts:
        for script_id, info in list(running_scripts.items())[:2]:
            name = info["name"]
            if len(name) > 22:
                name = name[:19] + "..."
            display.text_pixels("* " + name, x=2, y=y, font="helvR08")
            y += 11

    # === Bottom: battery and footer ===
    try:
        voltage = power.measured_volts
        percentage = max(0, min(100, ((voltage - 7.4) / (9.0 - 7.4)) * 100))
        display.text_pixels("Battery: {0:.1f}V ({1:.0f}%)".format(
            voltage, percentage), x=2, y=105)
    except Exception:
        pass
    display.text_pixels("UP=Menu  BACK=Exit", x=15, y=118, font="helvB08")
    display.update()


def ui_loop():
    """Main UI loop with menu navigation"""
    global ui_mode, current_menu_index, menu_scroll_offset
    last_update = 0
    update_interval = 0.5
    button_pressed = {"up": False, "down": False, "left": False, "right": False, "enter": False, "back": False}

    while True:
        current_time = time.time()
        if current_time - last_update >= update_interval:
            try:
                if ui_mode == "status":
                    draw_status_screen()
                elif ui_mode == "scripts":
                    draw_script_menu()
                last_update = current_time
            except Exception as e:
                log("UI draw error", str(e))

        try:
            if buttons.up and not button_pressed["up"]:
                button_pressed["up"] = True
                if ui_mode == "status":
                    ui_mode = "scripts"
                    current_menu_index = 0
                    menu_scroll_offset = 0
                    sound.beep()
                elif ui_mode == "scripts":
                    if current_menu_index > 0:
                        current_menu_index -= 1
                        sound.tone([(600, 50)])
            elif not buttons.up:
                button_pressed["up"] = False

            if buttons.down and not button_pressed["down"]:
                button_pressed["down"] = True
                if ui_mode == "scripts":
                    scripts = script_manager.scan_scripts()
                    if current_menu_index < len(scripts) - 1:
                        current_menu_index += 1
                        sound.tone([(600, 50)])
            elif not buttons.down:
                button_pressed["down"] = False

            if buttons.enter and not button_pressed["enter"]:
                button_pressed["enter"] = True
                if ui_mode == "scripts":
                    scripts = script_manager.scan_scripts()
                    if scripts and current_menu_index < len(scripts):
                        script_name = scripts[current_menu_index]
                        script_manager.run_script(script_name)
                        display.clear()
                        display.text_pixels("Running:", x=40, y=50)
                        display.text_pixels(script_name, x=20, y=65)
                        display.update()
                        time.sleep(1)
                        ui_mode = "status"
            elif not buttons.enter:
                button_pressed["enter"] = False

            if buttons.backspace and not button_pressed["back"]:
                button_pressed["back"] = True
                if ui_mode == "scripts":
                    ui_mode = "status"
                    sound.tone([(400, 100)])
                else:
                    log("Backspace pressed - exiting")
                    display.clear()
                    display.text_pixels("Shutting down...", x=30, y=60)
                    display.update()
                    time.sleep(1)
                    os._exit(0)
            elif not buttons.backspace:
                button_pressed["back"] = False

        except Exception as e:
            log("Button handling error", str(e))

        time.sleep(0.05)


# ============================================================================
# SSL / SERVER
# ============================================================================

def generate_self_signed_cert(cert_file="ev3.crt", key_file="ev3.key"):
    """Generate a self-signed certificate compatible with macOS and iOS."""
    if os.path.exists(cert_file) and os.path.exists(key_file):
        try:
            result = subprocess.Popen(
                ["openssl", "x509", "-in", cert_file, "-noout"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            result.communicate()
            if result.returncode == 0:
                log("Using existing valid certificate: {0}".format(cert_file))
                return True
            log("Existing certificate is invalid, regenerating...")
            os.remove(cert_file)
            os.remove(key_file)
        except Exception:
            pass

    try:
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)

        log("Generating SSL certificate (IP={0}, host={1})...".format(local_ip, hostname))

        config_file = "/tmp/ev3_openssl.cnf"
        config_content = """[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req
x509_extensions = v3_ca

[dn]
C = US
ST = State
L = City
O = EV3 Robot
OU = EV3dev
CN = {ip}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[v3_ca]
basicConstraints = CA:TRUE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = {ip}
DNS.1 = {hostname}
DNS.2 = localhost
DNS.3 = ev3dev.local
DNS.4 = ev3dev
""".format(ip=local_ip, hostname=hostname)

        with open(config_file, "w") as f:
            f.write(config_content)

        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
            "-keyout", key_file, "-out", cert_file,
            "-days", "825", "-config", config_file,
        ]
        result = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = result.communicate()
        if result.returncode != 0:
            log("Certificate generation failed: {0}".format(stderr.decode() if stderr else "?"))
            return False

        log("Certificate generated. Install on:")
        log("  macOS: download https://{0}:8443/certificate, double-click, trust in Keychain".format(local_ip))
        log("  iOS:   download https://{0}:8443/profile in Safari, install in Settings".format(local_ip))
        return True
    except Exception as e:
        log("Certificate generation failed: {0}".format(str(e)))
        return False


def run_server_on_port(port, use_ssl=False):
    """Start server on the given port with optional SSL."""
    protocol = "HTTPS" if use_ssl else "HTTP"
    log("Initializing {0} server on port {1}...".format(protocol, port))

    try:
        socketserver.TCPServer.allow_reuse_address = True
        server = socketserver.TCPServer(("", port), BridgeHandler)
        server.allow_reuse_address = True

        if use_ssl:
            if not generate_self_signed_cert(SSL_CERT, SSL_KEY):
                log("Cannot start HTTPS without certificates")
                return
            try:
                context = ssl.SSLContext(ssl.PROTOCOL_TLS)
                context.load_cert_chain(SSL_CERT, SSL_KEY)
                context.options |= ssl.OP_NO_SSLv2
                context.options |= ssl.OP_NO_SSLv3
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                try:
                    context.set_ciphers('HIGH:!aNULL:!MD5')
                except Exception:
                    pass
                server.socket = context.wrap_socket(
                    server.socket, server_side=True, do_handshake_on_connect=True,
                )
                log("SSL configured")
            except Exception as e:
                log("SSL setup failed: {0}".format(str(e)))
                return

        original_finish_request = server.finish_request

        def tracked_finish_request(request, client_address):
            global connection_counter
            with connection_lock:
                conn_id = connection_counter
                connection_counter += 1
            try:
                original_finish_request(request, client_address)
            except ssl.SSLError as e:
                log("SSL Error on connection #{0}: {1}".format(conn_id, str(e)))
            except Exception as e:
                log("Error on connection #{0}: {1}".format(conn_id, str(e)))

        server.finish_request = tracked_finish_request

        log("{0} server ready on port {1}".format(protocol, port))
        server.serve_forever()
    except KeyboardInterrupt:
        log("{0} server shutting down...".format(protocol))
    except Exception as e:
        log("{0} server error: {1}".format(protocol, str(e)))


def _detect_local_ip():
    """
    Best-effort local IPv4 lookup. socket.gethostbyname(hostname) often returns
    127.0.1.1 on Debian, so we also try a UDP-connect trick that picks the
    interface used for outbound traffic.
    """
    import socket
    candidates = []
    try:
        candidates.append(socket.gethostbyname(socket.gethostname()))
    except Exception:
        pass
    s = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.3)
        # Doesn't actually send a packet; just picks the routing interface.
        s.connect(("8.8.8.8", 53))
        candidates.append(s.getsockname()[0])
    except Exception:
        pass
    finally:
        if s is not None:
            try:
                s.close()
            except Exception:
                pass

    for ip in candidates:
        if ip and not ip.startswith("127.") and ip != "0.0.0.0":
            return ip
    return candidates[0] if candidates else "?"


def _ip_refresh_loop():
    """Re-resolve the IP every 10s so the status screen tracks DHCP changes."""
    global SERVER_IP
    while True:
        try:
            new_ip = _detect_local_ip()
            if new_ip and new_ip != SERVER_IP:
                SERVER_IP = new_ip
        except Exception:
            pass
        time.sleep(10)


def main():
    global VERBOSE, SSL_CERT, SSL_KEY, AUTH_HEADER_EXPECTED
    global SERVER_IP, SERVER_HOSTNAME, HTTP_PORT_RUNNING, HTTPS_PORT_RUNNING

    parser = argparse.ArgumentParser(description="EV3 Bridge Server v2.3")
    parser.add_argument("--port", type=int, default=None, help="Custom port (overrides defaults)")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--no-ui", action="store_true")
    parser.add_argument("--auth", type=str, default=None, help="Enable Basic Auth (format: user:pass)")
    parser.add_argument("--http-only", action="store_true", help="Disable HTTPS (HTTP only)")
    parser.add_argument("--https-only", action="store_true", help="Disable HTTP (HTTPS only)")
    parser.add_argument("--cert", type=str, default="ev3.crt")
    parser.add_argument("--key", type=str, default="ev3.key")

    args = parser.parse_args()

    VERBOSE = args.verbose
    SSL_CERT = args.cert
    SSL_KEY = args.key

    if args.auth:
        if ":" in args.auth:
            b64_creds = base64.b64encode(args.auth.encode('utf-8')).decode('utf-8')
            AUTH_HEADER_EXPECTED = "Basic " + b64_creds
            print("Authentication ENABLED. User: " + args.auth.split(":")[0])
        else:
            print("Error: --auth format must be username:password")
            sys.exit(1)

    print("=" * 50)
    print("EV3 BRIDGE SERVER v2.3 with Script Manager")
    print("=" * 50)

    start_http = not args.https_only
    start_https = not args.http_only
    http_port = args.port if args.port else 8080
    https_port = args.port if args.port else 8443

    log("Starting script scanner thread...")

    def script_scanner():
        while True:
            try:
                script_manager.scan_scripts()
            except Exception as e:
                log("Script scanner error: {0}".format(str(e)))
            time.sleep(2)

    threading.Thread(target=script_scanner, daemon=True).start()

    try:
        import socket
        SERVER_HOSTNAME = socket.gethostname()
    except Exception:
        SERVER_HOSTNAME = "?"
    SERVER_IP = _detect_local_ip()
    local_ip = SERVER_IP  # kept for the log lines below

    # Refresh IP in the background so DHCP/wifi changes show up on the screen.
    threading.Thread(target=_ip_refresh_loop, daemon=True).start()

    if start_http:
        HTTP_PORT_RUNNING = http_port
        threading.Thread(target=run_server_on_port, args=(http_port, False), daemon=True).start()
        time.sleep(0.5)
    if start_https:
        HTTPS_PORT_RUNNING = https_port
        threading.Thread(target=run_server_on_port, args=(https_port, True), daemon=True).start()
        time.sleep(0.5)

    log("=" * 60)
    log("EV3 Bridge Server Ready!")
    if start_http:
        log("HTTP:  http://{0}:{1}/test.html".format(local_ip, http_port))
    if start_https:
        log("HTTPS: https://{0}:{1}/test.html".format(local_ip, https_port))
    log("=" * 60)

    if args.no_ui:
        log("Running in headless mode")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            log("Shutting down...")
    else:
        try:
            ui_loop()
        except KeyboardInterrupt:
            log("Shutting down...")


if __name__ == "__main__":
    main()
