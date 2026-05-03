// Name: LEGO EV3 Direct
// ID: legoev3direct
// Description: Direct control connection for LEGO EV3 (Streaming only).
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0
(function (Scratch) {
  "use strict";

  // ============================================================================
  // INTERNATIONALIZATION (i18n)  __CRISPSTROBE_I18N_INJECTED__
  //
  // Module-level locale state pattern shared with planetemaths.js,
  // ev3dev_py_transpile.js, arrays.js, etc. Detect once at gallery-load,
  // listen for changes, resolve block text via the module-level t(key) at
  // every getInfo() call.
  // ============================================================================

  const translations = {
    en: {
      "ev3d.name": "LEGO EV3 Direct",
      "ev3d.connect": "🔌 connect to EV3",
      "ev3d.disconnect": "🔌 disconnect from EV3",
      "ev3d.connected": "connected?",
      "ev3d.motorOn": "🎮 motor [PORTS] on at [POWER]% power",
      "ev3d.motorRunDeg": "🎮 motor [PORTS] run [DEGREES]° at [POWER]% [BRAKE]",
      "ev3d.motorRunSec":
        "🎮 motor [PORTS] run [SECONDS] sec at [POWER]% [BRAKE]",
      "ev3d.motorStop": "🎮 motor [PORTS] stop and [BRAKE]",
      "ev3d.motorPolarity": "🎮 set motor [PORTS] polarity [POLARITY]",
      "ev3d.motorPosition": "🎮 motor [PORT] position",
      "ev3d.motorSpeed": "🎮 motor [PORT] speed",
      "ev3d.motorReset": "🎮 reset motor [PORTS] position",
      "ev3d.touchPressed": "👆 touch [PORT] pressed?",
      "ev3d.colorColor": "🌈 color [PORT] color",
      "ev3d.colorRefl": "🌈 color [PORT] reflected light",
      "ev3d.colorAmb": "🌈 color [PORT] ambient light",
      "ev3d.colorRGB": "🌈 color [PORT] RGB [COMPONENT]",
      "ev3d.ultrasonic": "📏 ultrasonic [PORT] distance (cm)",
      "ev3d.gyroAngle": "🔄 gyro [PORT] angle",
      "ev3d.gyroRate": "🔄 gyro [PORT] rate",
      "ev3d.gyroReset": "🔄 reset gyro [PORT]",
      "ev3d.infrared": "📡 infrared [PORT] proximity",
      "ev3d.nxtLight": "🔧 NXT light [PORT] brightness",
      "ev3d.nxtSound": "🔧 NXT sound [PORT] loudness",
      "ev3d.brickButton": "🎮 brick button [BUTTON] pressed?",
      "ev3d.setLED": "💡 set LED to [PATTERN]",
      "ev3d.playTone": "🔔 play tone [FREQ] Hz for [MS] ms volume [VOL]%",
      "ev3d.playNote": "🔔 play note [NOTE] for [BEATS] beats",
      "ev3d.stopSound": "🔔 stop sound",
      "ev3d.setVolume": "🔔 set volume to [VOL]%",
      "ev3d.volume": "🔔 volume",
      "ev3d.clearScreen": "🖥️ clear screen",
      "ev3d.drawText": "🖥️ draw text [TEXT] at x:[X] y:[Y]",
      "ev3d.selectFont": "🖥️ select font [SIZE]",
      "ev3d.drawPixel": "🖥️ draw pixel at x:[X] y:[Y]",
      "ev3d.drawLine": "🖥️ draw line from x:[X1] y:[Y1] to x:[X2] y:[Y2]",
      "ev3d.drawRect": "🖥️ draw [FILL] rectangle x:[X] y:[Y] w:[W] h:[H]",
      "ev3d.drawCircle": "🖥️ draw [FILL] circle x:[X] y:[Y] radius:[R]",
      "ev3d.invertRect": "🖥️ invert rectangle x:[X] y:[Y] w:[W] h:[H]",
      "ev3d.wait": "⏱️ wait [MS] ms",
      "ev3d.timer": "⏱️ timer (ms)",
      "ev3d.battery": "📊 battery level (V)",
    },
    de: {
      "ev3d.name": "LEGO EV3 Direkt",
      "ev3d.connect": "🔌 mit EV3 verbinden",
      "ev3d.disconnect": "🔌 EV3 trennen",
      "ev3d.connected": "verbunden?",
      "ev3d.motorOn": "🎮 Motor [PORTS] mit [POWER]% Leistung an",
      "ev3d.motorRunDeg":
        "🎮 Motor [PORTS] läuft [DEGREES]° mit [POWER]% [BRAKE]",
      "ev3d.motorRunSec":
        "🎮 Motor [PORTS] läuft [SECONDS] Sek. mit [POWER]% [BRAKE]",
      "ev3d.motorStop": "🎮 Motor [PORTS] stoppen und [BRAKE]",
      "ev3d.motorPolarity": "🎮 Motor [PORTS] Polarität [POLARITY] setzen",
      "ev3d.motorPosition": "🎮 Motor [PORT] Position",
      "ev3d.motorSpeed": "🎮 Motor [PORT] Geschwindigkeit",
      "ev3d.motorReset": "🎮 Motor [PORTS] Position zurücksetzen",
      "ev3d.touchPressed": "👆 Berührung [PORT] gedrückt?",
      "ev3d.colorColor": "🌈 Farbe [PORT] Farbe",
      "ev3d.colorRefl": "🌈 Farbe [PORT] reflektiertes Licht",
      "ev3d.colorAmb": "🌈 Farbe [PORT] Umgebungslicht",
      "ev3d.colorRGB": "🌈 Farbe [PORT] RGB [COMPONENT]",
      "ev3d.ultrasonic": "📏 Ultraschall [PORT] Abstand (cm)",
      "ev3d.gyroAngle": "🔄 Kreisel [PORT] Winkel",
      "ev3d.gyroRate": "🔄 Kreisel [PORT] Rate",
      "ev3d.gyroReset": "🔄 Kreisel [PORT] zurücksetzen",
      "ev3d.infrared": "📡 Infrarot [PORT] Näherung",
      "ev3d.nxtLight": "🔧 NXT-Licht [PORT] Helligkeit",
      "ev3d.nxtSound": "🔧 NXT-Sound [PORT] Lautstärke",
      "ev3d.brickButton": "🎮 Brick-Knopf [BUTTON] gedrückt?",
      "ev3d.setLED": "💡 LED auf [PATTERN] setzen",
      "ev3d.playTone": "🔔 Ton [FREQ] Hz für [MS] ms Lautstärke [VOL]% spielen",
      "ev3d.playNote": "🔔 Note [NOTE] für [BEATS] Schläge spielen",
      "ev3d.stopSound": "🔔 Ton stoppen",
      "ev3d.setVolume": "🔔 Lautstärke auf [VOL]% setzen",
      "ev3d.volume": "🔔 Lautstärke",
      "ev3d.clearScreen": "🖥️ Bildschirm löschen",
      "ev3d.drawText": "🖥️ Text [TEXT] bei x:[X] y:[Y] zeichnen",
      "ev3d.selectFont": "🖥️ Schriftart [SIZE] wählen",
      "ev3d.drawPixel": "🖥️ Pixel bei x:[X] y:[Y] zeichnen",
      "ev3d.drawLine": "🖥️ Linie von x:[X1] y:[Y1] nach x:[X2] y:[Y2] zeichnen",
      "ev3d.drawRect": "🖥️ [FILL] Rechteck x:[X] y:[Y] B:[W] H:[H] zeichnen",
      "ev3d.drawCircle": "🖥️ [FILL] Kreis x:[X] y:[Y] Radius:[R] zeichnen",
      "ev3d.invertRect": "🖥️ Rechteck invertieren x:[X] y:[Y] B:[W] H:[H]",
      "ev3d.wait": "⏱️ [MS] ms warten",
      "ev3d.timer": "⏱️ Timer (ms)",
      "ev3d.battery": "📊 Batteriestand (V)",
    },
    fr: {
      "ev3d.name": "LEGO EV3 Direct",
      "ev3d.connect": "🔌 se connecter au EV3",
      "ev3d.disconnect": "🔌 déconnecter du EV3",
      "ev3d.connected": "connecté ?",
      "ev3d.motorOn": "🎮 moteur [PORTS] à [POWER]% de puissance",
      "ev3d.motorRunDeg":
        "🎮 moteur [PORTS] tourne [DEGREES]° à [POWER]% [BRAKE]",
      "ev3d.motorRunSec":
        "🎮 moteur [PORTS] tourne [SECONDS] sec à [POWER]% [BRAKE]",
      "ev3d.motorStop": "🎮 moteur [PORTS] arrêter et [BRAKE]",
      "ev3d.motorPolarity": "🎮 régler polarité moteur [PORTS] [POLARITY]",
      "ev3d.motorPosition": "🎮 position moteur [PORT]",
      "ev3d.motorSpeed": "🎮 vitesse moteur [PORT]",
      "ev3d.motorReset": "🎮 réinitialiser position moteur [PORTS]",
      "ev3d.touchPressed": "👆 capteur tactile [PORT] pressé ?",
      "ev3d.colorColor": "🌈 couleur [PORT] couleur",
      "ev3d.colorRefl": "🌈 lumière réfléchie [PORT]",
      "ev3d.colorAmb": "🌈 lumière ambiante [PORT]",
      "ev3d.colorRGB": "🌈 couleur [PORT] RGB [COMPONENT]",
      "ev3d.ultrasonic": "📏 ultrason [PORT] distance (cm)",
      "ev3d.gyroAngle": "🔄 gyroscope [PORT] angle",
      "ev3d.gyroRate": "🔄 gyroscope [PORT] vitesse",
      "ev3d.gyroReset": "🔄 réinitialiser gyroscope [PORT]",
      "ev3d.infrared": "📡 proximité infrarouge [PORT]",
      "ev3d.nxtLight": "🔧 luminosité NXT [PORT]",
      "ev3d.nxtSound": "🔧 son NXT [PORT] volume",
      "ev3d.brickButton": "🎮 bouton brique [BUTTON] pressé ?",
      "ev3d.setLED": "💡 régler LED sur [PATTERN]",
      "ev3d.playTone": "🔔 jouer ton [FREQ] Hz pendant [MS] ms volume [VOL]%",
      "ev3d.playNote": "🔔 jouer note [NOTE] pendant [BEATS] battements",
      "ev3d.stopSound": "🔔 arrêter son",
      "ev3d.setVolume": "🔔 régler volume sur [VOL]%",
      "ev3d.volume": "🔔 volume",
      "ev3d.clearScreen": "🖥️ effacer l'écran",
      "ev3d.drawText": "🖥️ écrire texte [TEXT] à x:[X] y:[Y]",
      "ev3d.selectFont": "🖥️ sélectionner police [SIZE]",
      "ev3d.drawPixel": "🖥️ tracer pixel à x:[X] y:[Y]",
      "ev3d.drawLine": "🖥️ tracer ligne de x:[X1] y:[Y1] à x:[X2] y:[Y2]",
      "ev3d.drawRect": "🖥️ tracer rectangle [FILL] x:[X] y:[Y] L:[W] H:[H]",
      "ev3d.drawCircle": "🖥️ tracer cercle [FILL] x:[X] y:[Y] rayon:[R]",
      "ev3d.invertRect": "🖥️ inverser rectangle x:[X] y:[Y] L:[W] H:[H]",
      "ev3d.wait": "⏱️ attendre [MS] ms",
      "ev3d.timer": "⏱️ minuteur (ms)",
      "ev3d.battery": "📊 niveau de batterie (V)",
    },
  };

  function detectLanguage() {
    const candidates = [];
    try {
      if (typeof window !== "undefined" && window.ReduxStore?.getState) {
        candidates.push(window.ReduxStore.getState().locales?.locale);
      }
    } catch (e) {}
    try {
      candidates.push(localStorage.getItem("tw:language"));
    } catch (e) {}
    try {
      if (typeof Scratch !== "undefined" && Scratch.vm?.runtime?.getLocale) {
        candidates.push(Scratch.vm.runtime.getLocale());
      }
    } catch (e) {}
    try {
      candidates.push(document.documentElement.lang);
    } catch (e) {}
    try {
      candidates.push(navigator.language);
    } catch (e) {}
    for (const c of candidates) {
      if (typeof c !== "string" || !c) continue;
      const lower = c.toLowerCase();
      if (lower.startsWith("de")) return "de";
      if (lower.startsWith("fr")) return "fr";
      if (lower.startsWith("en")) return "en";
    }
    return "en";
  }

  let currentLang = detectLanguage();

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "tw:language") {
        const newLang = detectLanguage();
        if (newLang !== currentLang) currentLang = newLang;
      }
    });
    let lastKnownLocale = null;
    setInterval(() => {
      try {
        if (window.ReduxStore?.getState) {
          const locale = window.ReduxStore.getState().locales?.locale;
          if (locale && locale !== lastKnownLocale) {
            lastKnownLocale = locale;
            const lower = locale.toLowerCase();
            const newLang = lower.startsWith("de")
              ? "de"
              : lower.startsWith("fr")
                ? "fr"
                : "en";
            if (newLang !== currentLang) currentLang = newLang;
          }
        }
      } catch (e) {}
    }, 1000);
  }

  function t(key, defaultValue) {
    const tr = translations[currentLang];
    if (tr && tr[key]) return tr[key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return defaultValue !== undefined ? defaultValue : key;
  }

  const Cast = Scratch.Cast;

  // ==================== DEBUG LOGGING ====================

  const DEBUG = true;
  const log = {
    info: (...args) => DEBUG && console.log("🔵 [EV3]", ...args),
    warn: (...args) => DEBUG && console.warn("⚠️ [EV3]", ...args),
    error: (...args) => DEBUG && console.error("❌ [EV3]", ...args),
    success: (...args) => DEBUG && console.log("✅ [EV3]", ...args),
    data: (label, data) => {
      if (!DEBUG) return;
      console.log(`📊 [EV3] ${label}:`, data);
      if (data instanceof Uint8Array) {
        console.log(
          "   Hex:",
          Array.from(data)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")
        );
      }
    },
  };

  // ==================== EV3 PROTOCOL CONSTANTS ====================

  // Direct command types (from c_com.h)
  const _COMMAND_TYPE = {
    DIRECT_COMMAND_REPLY: 0x00,
    DIRECT_COMMAND_NO_REPLY: 0x80,
    DIRECT_REPLY: 0x02,
    DIRECT_REPLY_ERROR: 0x04,
  };

  // Opcodes (from bytecodes.h)
  const OPCODE = {
    // Input operations
    opINPUT_DEVICE_LIST: 0x98,
    opINPUT_DEVICE: 0x99,
    opINPUT_READ: 0x9a,
    opINPUT_READSI: 0x9d,
    opINPUT_READEXT: 0x9e,

    // Output operations (motors)
    opOUTPUT_RESET: 0xa2,
    opOUTPUT_STOP: 0xa3,
    opOUTPUT_POWER: 0xa4,
    opOUTPUT_SPEED: 0xa5,
    opOUTPUT_START: 0xa6,
    opOUTPUT_POLARITY: 0xa7,
    opOUTPUT_READ: 0xa8,
    opOUTPUT_STEP_SPEED: 0xae,
    opOUTPUT_TIME_SPEED: 0xaf,
    opOUTPUT_GET_COUNT: 0xb3,

    // Sound operations
    opSOUND: 0x94,

    // UI operations
    opUI_DRAW: 0x84,
    opUI_BUTTON: 0x83,
    opUI_WRITE: 0x82,

    // Timer operations
    opTIMER_WAIT: 0x85,
    opTIMER_READ: 0x87,

    // Info operations
    opINFO: 0x7c,
  };

  // Input device subcommands (from bytecodes.h)
  const INPUT_DEVICE_CMD = {
    GET_FORMAT: 0x02,
    GET_TYPEMODE: 0x05,
    GET_NAME: 0x15,
    READY_PCT: 0x1b,
    READY_RAW: 0x1c,
    READY_SI: 0x1d,
    GET_MINMAX: 0x1e,
    CLR_CHANGES: 0x1a,
  };

  // Sound subcommands
  const SOUND_CMD = {
    BREAK: 0x00,
    TONE: 0x01,
    PLAY: 0x02,
    REPEAT: 0x03,
  };

  // UI Draw subcommands
  const UI_DRAW_CMD = {
    UPDATE: 0x00,
    CLEAN: 0x01,
    PIXEL: 0x02,
    LINE: 0x03,
    CIRCLE: 0x04,
    TEXT: 0x05,
    FILLRECT: 0x09,
    RECT: 0x0a,
    INVERSERECT: 0x10,
    SELECT_FONT: 0x11,
    FILLWINDOW: 0x13,
    FILLCIRCLE: 0x18,
  };

  // UI Button subcommands
  const UI_BUTTON_CMD = {
    PRESSED: 0x09,
  };

  // UI Write subcommands
  const UI_WRITE_CMD = {
    LED: 0x1b,
  };

  // Info subcommands
  const INFO_CMD = {
    GET_VOLUME: 0x04,
    SET_VOLUME: 0x05,
  };

  // Button constants
  const BUTTON = {
    NONE: 0,
    UP: 1,
    ENTER: 2,
    DOWN: 3,
    RIGHT: 4,
    LEFT: 5,
    BACK: 6,
    ANY: 7,
  };

  // LED patterns
  const LED_PATTERN = {
    OFF: 0,
    GREEN: 1,
    RED: 2,
    ORANGE: 3,
    GREEN_FLASH: 4,
    RED_FLASH: 5,
    ORANGE_FLASH: 6,
    GREEN_PULSE: 7,
    RED_PULSE: 8,
    ORANGE_PULSE: 9,
  };

  // Device types (auto-detect = 0 is most reliable)
  const DEVICE_TYPE = {
    AUTO: 0,
    NXT_TOUCH: 1,
    NXT_LIGHT: 2,
    NXT_SOUND: 3,
    NXT_COLOR: 4,
    NXT_ULTRASONIC: 5,
    EV3_LARGE_MOTOR: 7,
    EV3_MEDIUM_MOTOR: 8,
    EV3_TOUCH: 16,
    EV3_COLOR: 29,
    EV3_ULTRASONIC: 30,
    EV3_GYRO: 32,
    EV3_INFRARED: 33,
  };

  // Ports
  const PORT = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    S1: 0,
    S2: 1,
    S3: 2,
    S4: 3,
  };

  const LAYER = 0; // Layer 0 = this brick (no daisy chain)

  // Sensor modes
  const COLOR_MODE = {
    REFLECT: 0,
    AMBIENT: 1,
    COLOR: 2,
    REF_RAW: 3,
    RGB_RAW: 4,
  };

  const GYRO_MODE = {
    ANGLE: 0,
    RATE: 1,
  };

  const _ULTRASONIC_MODE = {
    CM: 0,
    INCH: 1,
  };

  const _TOUCH_MODE = {
    TOUCH: 0,
  };

  // Color IDs
  const COLOR_ID = {
    0: "none",
    1: "black",
    2: "blue",
    3: "green",
    4: "yellow",
    5: "red",
    6: "white",
    7: "brown",
  };

  // Note frequencies
  const NOTE_FREQ = {
    C4: 262,
    "C#4": 277,
    D4: 294,
    "D#4": 311,
    E4: 330,
    F4: 349,
    "F#4": 370,
    G4: 392,
    "G#4": 415,
    A4: 440,
    "A#4": 466,
    B4: 494,
    C5: 523,
    "C#5": 554,
    D5: 587,
    "D#5": 622,
    E5: 659,
    F5: 698,
    "F#5": 740,
    G5: 784,
    "G#5": 831,
    A5: 880,
    "A#5": 932,
    B5: 988,
    C6: 1047,
  };

  // ==================== PARAMETER ENCODING ====================

  // Short constant: -31 to 31
  function LC0(value) {
    if (value >= 0 && value <= 31) {
      return [value & 0x3f];
    } else if (value >= -31 && value < 0) {
      return [0x40 | (-value & 0x3f)];
    }
    return LC1(value);
  }

  // Long constant, 1 byte
  function LC1(value) {
    return [0x81, value & 0xff];
  }

  // Long constant, 2 bytes (little-endian)
  function LC2(value) {
    return [0x82, value & 0xff, (value >> 8) & 0xff];
  }

  // Long constant, 4 bytes (little-endian)
  function LC4(value) {
    return [
      0x83,
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff,
    ];
  }

  // Zero-terminated string
  function LCS(str) {
    const bytes = [0x84];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    bytes.push(0x00);
    return bytes;
  }

  // Global variable (0-31)
  function GV0(index) {
    if (index >= 0 && index <= 31) {
      return [0x60 | (index & 0x1f)];
    }
    return [0xe1, index & 0xff];
  }

  // Local variable (0-31)
  function LV0(index) {
    if (index >= 0 && index <= 31) {
      return [0x40 | (index & 0x1f)];
    }
    return [0xc1, index & 0xff];
  }

  // ==================== EV3 PERIPHERAL CLASS ====================

  class EV3Peripheral {
    constructor(runtime) {
      this.runtime = runtime;

      // Connection
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.connected = false;

      // State
      this.batteryLevel = 0;
      this.messageCounter = 0;

      // Request tracking
      this.pendingRequests = new Map();

      // Read buffer
      this.readBuffer = new Uint8Array(0);

      log.info("Peripheral initialized");
    }

    // ==================== CONNECTION ====================

    async connect() {
      if (!navigator.serial) {
        alert(
          "Web Serial API not supported!\n\n" +
            "⚠️ IMPORTANT: You must FIRST pair your EV3 via Bluetooth in your OS settings!\n" +
            "Windows: Settings > Bluetooth > Add device\n" +
            "The EV3 will show as a COM port after pairing."
        );
        return;
      }

      try {
        log.info("🔍 Select the Bluetooth Serial Port (COM port) for your EV3");
        this.port = await navigator.serial.requestPort();

        await this.port.open({
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          flowControl: "none", // ← ADD THIS
        });

        this.reader = this.port.readable.getReader();
        this.writer = this.port.writable.getWriter();
        this.connected = true;

        log.success("Port opened");
        this.startReadLoop();

        // Test with LED (most reliable test)
        await this.setLED(LED_PATTERN.GREEN);
        log.success("LED test passed!");

        const battery = await this.getBatteryLevel();
        log.success(`Battery: ${battery}V`);

        alert(`✅ Connected!\nBattery: ${battery.toFixed(2)}V`);
      } catch (error) {
        log.error("Failed:", error);
        alert(
          "❌ Connection failed!\n\nDid you pair the EV3 via Bluetooth first?\n" +
            error.message
        );
        this.disconnect();
      }
    }

    async disconnect() {
      log.info("Disconnecting...");

      this.connected = false;

      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (e) {
          log.warn("Reader cancel error:", e);
        }
        this.reader.releaseLock();
      }

      if (this.writer) {
        this.writer.releaseLock();
      }

      if (this.port) {
        await this.port.close();
      }

      this.reset();
      log.success("Disconnected");
    }

    reset() {
      this.connected = false;
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.batteryLevel = 0;
      this.messageCounter = 0;
      this.readBuffer = new Uint8Array(0);
      this.pendingRequests.clear();
      log.info("State reset");
    }

    isConnected() {
      return this.connected;
    }

    // ==================== DIRECT COMMANDS ====================

    async sendDirectCommand(
      bytecode,
      globalBytes = 0,
      localBytes = 0,
      needsReply = true
    ) {
      if (!this.connected || !this.writer) return null;

      const msgCounter = this.messageCounter++;
      const commandType = needsReply ? 0x00 : 0x80; // From c_com.h

      // Header Byte 5: Globals LSB
      // Header Byte 6: Locals (upper 6 bits) + Globals (lower 2 bits)
      const memHeader = [
        globalBytes & 0xff,
        ((globalBytes >> 8) & 0x03) | ((localBytes & 0x3f) << 2),
      ];

      const payload = [commandType, ...memHeader, ...bytecode];

      // Total length = payload.length + 2 bytes for the counter
      const totalLen = payload.length + 2;
      const fullMsg = new Uint8Array(payload.length + 4);

      fullMsg[0] = totalLen & 0xff;
      fullMsg[1] = (totalLen >> 8) & 0xff;
      fullMsg[2] = msgCounter & 0xff;
      fullMsg[3] = (msgCounter >> 8) & 0xff;
      fullMsg.set(payload, 4);

      if (needsReply) {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.pendingRequests.delete(msgCounter);
            resolve(null);
          }, 1000);
          this.pendingRequests.set(msgCounter, { resolve, timeout });
          this.writer.write(fullMsg).catch(() => resolve(null));
        });
      } else {
        await this.writer.write(fullMsg).catch(() => {});
        return null;
      }
    }

    // ==================== READ LOOP ====================

    async startReadLoop() {
      log.info("Starting read loop...");
      try {
        while (this.connected && this.reader) {
          const { value, done } = await this.reader.read();
          if (done) {
            log.info("Reader done");
            break;
          }

          log.data("RX raw chunk", value);

          // Append to buffer
          const combined = new Uint8Array(
            this.readBuffer.length + value.length
          );
          combined.set(this.readBuffer);
          combined.set(value, this.readBuffer.length);
          this.readBuffer = combined;

          // Process complete packets
          while (this.readBuffer.length >= 2) {
            const length = this.readBuffer[0] | (this.readBuffer[1] << 8);

            if (this.readBuffer.length < length + 2) {
              log.info(
                `Waiting for more data: have ${this.readBuffer.length}, need ${length + 2}`
              );
              break;
            }

            const packet = this.readBuffer.slice(2, 2 + length);
            this.readBuffer = this.readBuffer.slice(2 + length);

            log.data("RX complete packet", packet);
            this.handleReply(packet);
          }
        }
      } catch (e) {
        log.error("Read loop error:", e);
        this.disconnect();
      }
    }

    handleReply(packet) {
      // The packet passed here is ALREADY sliced based on the length header.
      // Packet structure: [Counter LSB, Counter MSB, ReplyType, Data...]
      if (packet.length < 3) {
        log.warn("Packet too short to be a valid reply");
        return;
      }

      const msgCounter = packet[0] | (packet[1] << 8);
      const replyType = packet[2];

      log.info(`RX [${msgCounter}] replyType=0x${replyType.toString(16)}`);

      if (this.pendingRequests.has(msgCounter)) {
        const { resolve, timeout } = this.pendingRequests.get(msgCounter);
        clearTimeout(timeout);
        this.pendingRequests.delete(msgCounter);

        // DIRECT_REPLY is 0x02, DIRECT_REPLY_ERROR is 0x04
        if (replyType === 0x02) {
          const data = packet.slice(3); // The actual global variables
          resolve(data);
        } else {
          log.error(
            `EV3 returned an error (0x04). Bytecode was likely malformed.`
          );
          resolve(null);
        }
      } else {
        log.warn(
          `Dropped unexpected packet or late timeout for ID: ${msgCounter}`
        );
      }
    }

    // ==================== SENSOR OPERATIONS (WITH FALLBACKS) ====================

    async readSensor(port, mode) {
      const bytecode = [
        0x9d, // opINPUT_READSI
        0x00, // LAYER
        port, // Port index (0-3)
        0x00, // TYPE (Keep auto)
        mode, // MODE
        0x01, // NVALUES
        0x60, // DESTINATION: GV0(0)
      ];
      const reply = await this.sendDirectCommand(bytecode, 4, 0, true);
      if (!reply || reply.length < 4) return 0;

      const view = new DataView(
        reply.buffer,
        reply.byteOffset,
        reply.byteLength
      );
      return view.getFloat32(0, true);
    }

    // Touch sensor (multiple methods)
    async readTouch(port) {
      log.info(`readTouch(port=${port})`);
      const value = await this.readSensor(port, 0, "READ");
      return value > 0; // Non-zero = pressed
    }

    // Color sensor - detect color
    async readColor(port) {
      log.info(`readColor(port=${port})`);

      const bytecode = [
        OPCODE.opINPUT_DEVICE,
        INPUT_DEVICE_CMD.READY_RAW,
        ...LC0(LAYER),
        ...LC0(port),
        ...LC0(DEVICE_TYPE.AUTO),
        ...LC0(COLOR_MODE.COLOR),
        ...LC0(1),
        ...GV0(0),
      ];

      const reply = await this.sendDirectCommand(bytecode, 4, 0, true);

      if (reply && reply.length >= 4) {
        const view = new DataView(
          reply.buffer,
          reply.byteOffset,
          reply.byteLength
        );
        const colorId = view.getInt32(0, true);
        const colorName = COLOR_ID[colorId] || "none";
        log.success(`Color detected: ${colorName} (${colorId})`);
        return colorName;
      }

      return "none";
    }

    // Color sensor - reflected light
    async readReflectedLight(port) {
      log.info(`readReflectedLight(port=${port})`);
      // Mode 0 for color sensor = reflected light (0-100)
      return await this.readSensor(port, 0, "READ");
    }

    // Color sensor - ambient light
    async readAmbientLight(port) {
      log.info(`readAmbientLight(port=${port})`);
      return await this.readSensor(port, COLOR_MODE.AMBIENT, "SI");
    }

    // Color sensor - RGB raw values
    async readRGBRaw(port) {
      log.info(`readRGBRaw(port=${port})`);

      const bytecode = [
        OPCODE.opINPUT_DEVICE,
        INPUT_DEVICE_CMD.READY_RAW,
        ...LC0(LAYER),
        ...LC0(port),
        ...LC0(DEVICE_TYPE.AUTO),
        ...LC0(COLOR_MODE.RGB_RAW),
        ...LC0(3),
        ...GV0(0),
      ];

      const reply = await this.sendDirectCommand(bytecode, 12, 0, true);

      if (reply && reply.length >= 12) {
        const view = new DataView(
          reply.buffer,
          reply.byteOffset,
          reply.byteLength
        );
        const rgb = {
          r: view.getInt32(0, true),
          g: view.getInt32(4, true),
          b: view.getInt32(8, true),
        };
        log.success("RGB values:", rgb);
        return rgb;
      }

      return { r: 0, g: 0, b: 0 };
    }

    // Ultrasonic sensor
    async readUltrasonic(port) {
      log.info(`readUltrasonic(port=${port})`);
      // Mode 0 for ultrasonic = distance in cm (returns 0-255)
      return await this.readSensor(port, 0, "READ");
    }

    // Gyro sensor - angle
    async readGyroAngle(port) {
      log.info(`readGyroAngle(port=${port})`);
      return await this.readSensor(port, GYRO_MODE.ANGLE, "SI");
    }

    // Gyro sensor - rate
    async readGyroRate(port) {
      log.info(`readGyroRate(port=${port})`);
      return await this.readSensor(port, GYRO_MODE.RATE, "SI");
    }

    // Reset gyro
    async resetGyro(port) {
      log.info(`resetGyro(port=${port})`);

      const bytecode = [
        OPCODE.opINPUT_DEVICE,
        INPUT_DEVICE_CMD.CLR_CHANGES,
        ...LC0(LAYER),
        ...LC0(port),
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Gyro reset");
    }

    // Infrared sensor
    async readInfraredProximity(port) {
      log.info(`readInfraredProximity(port=${port})`);
      return await this.readSensor(port, 0, "SI");
    }

    // NXT Light sensor
    async readNXTLight(port) {
      log.info(`readNXTLight(port=${port})`);
      return await this.readSensor(port, 0, "SI");
    }

    // NXT Sound sensor
    async readNXTSound(port) {
      log.info(`readNXTSound(port=${port})`);
      return await this.readSensor(port, 0, "SI");
    }

    // ==================== MOTOR OPERATIONS ====================

    async motorOn(ports, power) {
      power = Math.max(-100, Math.min(100, power));
      log.info(`motorOn(ports=0x${ports.toString(16)}, power=${power})`);

      // We combine opOUTPUT_SPEED and opOUTPUT_START in one message
      const bytecode = [
        0xa5, // opOUTPUT_SPEED (Sets the speed register)
        0x00, // LAYER 0
        ports, // Bitmask (A=1, B=2, C=4, D=8)
        0x81,
        power & 0xff, // LC1: 1-byte constant for power
        0xa6, // opOUTPUT_START (Actually starts the motor)
        0x00, // LAYER 0
        ports, // Bitmask
      ];

      // motorOn is a 'Direct Command No Reply' (0x80)
      // We send 0 global/local bytes because we don't expect data back
      await this.sendDirectCommand(bytecode, 0, 0, false);
    }

    async motorStop(ports, brake = true) {
      log.info(`motorStop(ports=0x${ports.toString(16)}, brake=${brake})`);

      const bytecode = [
        OPCODE.opOUTPUT_STOP,
        ...LC0(LAYER),
        ...LC0(ports),
        ...LC0(brake ? 1 : 0),
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Motor stopped");
    }

    async motorRunDegrees(ports, power, degrees, brake = true) {
      power = Math.max(-100, Math.min(100, power));
      const absDegrees = Math.abs(degrees);
      log.info(
        `motorRunDegrees(ports=0x${ports.toString(16)}, power=${power}, degrees=${absDegrees}, brake=${brake})`
      );

      const bytecode = [
        OPCODE.opOUTPUT_STEP_SPEED,
        ...LC0(LAYER),
        ...LC0(ports),
        ...LC1(power),
        ...LC0(0),
        ...LC4(absDegrees),
        ...LC0(0),
        ...LC0(brake ? 1 : 0),
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success(`Motor running ${absDegrees}°`);
    }

    async motorRunSeconds(ports, power, seconds, brake = true) {
      power = Math.max(-100, Math.min(100, power));
      const ms = Math.floor(seconds * 1000);
      log.info(
        `motorRunSeconds: ports=0x${ports.toString(16)}, power=${power}, ms=${ms}`
      );

      // Handle negative power properly
      let speedByte = Math.abs(power);
      const step2 = power < 0 ? -ms : ms;

      const bytecode = [
        OPCODE.opOUTPUT_TIME_SPEED,
        ...LC0(LAYER),
        ...LC0(ports),
        ...LC1(speedByte),
        ...LC1(0), // Ramp up (0 = instant)
        ...LC4(Math.abs(step2)), // Duration
        ...LC1(0), // Ramp down
        ...LC0(brake ? 1 : 0),
      ];

      log.data("Motor time bytecode", new Uint8Array(bytecode));
      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Motor running");
    }

    async setMotorPolarity(ports, polarity) {
      log.info(
        `setMotorPolarity(ports=0x${ports.toString(16)}, polarity=${polarity})`
      );

      const bytecode = [
        OPCODE.opOUTPUT_POLARITY,
        ...LC0(LAYER),
        ...LC0(ports),
        ...LC1(polarity),
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Motor polarity set");
    }

    async resetMotorPosition(ports) {
      log.info(`resetMotorPosition(ports=0x${ports.toString(16)})`);

      const bytecode = [OPCODE.opOUTPUT_RESET, ...LC0(LAYER), ...LC0(ports)];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Motor position reset");
    }

    async getMotorPosition(portNum) {
      log.info(`getMotorPosition(port=${portNum})`);

      const bytecode = [
        OPCODE.opOUTPUT_READ,
        ...LC0(LAYER),
        ...LC0(1 << portNum),
        ...GV0(0),
        ...GV0(4),
      ];

      const reply = await this.sendDirectCommand(bytecode, 8, 0, true);

      if (reply && reply.length >= 8) {
        const view = new DataView(
          reply.buffer,
          reply.byteOffset,
          reply.byteLength
        );
        const position = view.getInt32(4, true);
        log.success(`Motor position: ${position}`);
        return position;
      }

      return 0;
    }

    async getMotorSpeed(portNum) {
      log.info(`getMotorSpeed(port=${portNum})`);

      const bytecode = [
        OPCODE.opOUTPUT_READ,
        ...LC0(LAYER),
        ...LC0(1 << portNum),
        ...GV0(0),
        ...GV0(4),
      ];

      const reply = await this.sendDirectCommand(bytecode, 8, 0, true);

      if (reply && reply.length >= 1) {
        const speed = reply[0];
        const signedSpeed = speed > 127 ? speed - 256 : speed;
        log.success(`Motor speed: ${signedSpeed}`);
        return signedSpeed;
      }

      return 0;
    }

    // ==================== BRICK BUTTONS ====================

    async readButton(button) {
      log.info(`readButton(button=${button})`);

      const bytecode = [
        OPCODE.opUI_BUTTON,
        UI_BUTTON_CMD.PRESSED,
        ...LC0(button),
        ...GV0(0),
      ];

      const reply = await this.sendDirectCommand(bytecode, 1, 0, true);

      if (reply && reply.length >= 1) {
        const pressed = reply[0] > 0;
        log.success(`Button pressed: ${pressed}`);
        return pressed;
      }

      return false;
    }

    // ==================== LED CONTROL ====================

    async setLED(pattern) {
      log.info(`setLED(pattern=${pattern})`);

      const bytecode = [OPCODE.opUI_WRITE, UI_WRITE_CMD.LED, ...LC0(pattern)];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("LED pattern set");
    }

    // ==================== SOUND OPERATIONS ====================

    async playTone(frequency, durationMs, volume = 50) {
      frequency = Math.max(250, Math.min(10000, frequency));
      volume = Math.max(0, Math.min(100, volume));
      log.info(
        `playTone(freq=${frequency}, duration=${durationMs}, vol=${volume})`
      );

      const bytecode = [
        OPCODE.opSOUND,
        SOUND_CMD.TONE,
        ...LC1(volume),
        ...LC2(frequency),
        ...LC2(durationMs),
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Tone playing");
    }

    async playNote(note, beats, tempo = 120) {
      const freq = NOTE_FREQ[note] || 440;
      const beatDuration = 60000 / tempo;
      const duration = Math.floor(beats * beatDuration);
      log.info(
        `playNote(note=${note}, beats=${beats}, tempo=${tempo}) -> freq=${freq}, duration=${duration}`
      );

      await this.playTone(freq, duration);
    }

    async stopSound() {
      log.info("stopSound()");

      const bytecode = [OPCODE.opSOUND, SOUND_CMD.BREAK];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Sound stopped");
    }

    // ==================== DISPLAY OPERATIONS ====================

    async clearScreen() {
      log.info("clearScreen()");

      const bytecode = [
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.FILLWINDOW,
        ...LC0(0x00),
        ...LC2(0),
        ...LC2(0),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Screen cleared");
    }

    async drawText(text, x, y) {
      log.info(`drawText(text="${text}", x=${x}, y=${y})`);

      const bytecode = [
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.TEXT,
        ...LC0(0x01),
        ...LC2(x),
        ...LC2(y),
        ...LCS(text),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Text drawn");
    }

    async drawPixel(x, y, color = 1) {
      log.info(`drawPixel(x=${x}, y=${y}, color=${color})`);

      const bytecode = [
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.PIXEL,
        ...LC0(color ? 0x01 : 0x00),
        ...LC2(x),
        ...LC2(y),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Pixel drawn");
    }

    async drawLine(x1, y1, x2, y2) {
      log.info(`drawLine(${x1},${y1} -> ${x2},${y2})`);

      const bytecode = [
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.LINE,
        ...LC0(0x01),
        ...LC2(x1),
        ...LC2(y1),
        ...LC2(x2),
        ...LC2(y2),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Line drawn");
    }

    async drawRect(x, y, width, height, filled = false) {
      log.info(
        `drawRect(x=${x}, y=${y}, w=${width}, h=${height}, filled=${filled})`
      );

      const cmd = filled ? UI_DRAW_CMD.FILLRECT : UI_DRAW_CMD.RECT;

      const bytecode = [
        OPCODE.opUI_DRAW,
        cmd,
        ...LC0(0x01),
        ...LC2(x),
        ...LC2(y),
        ...LC2(width),
        ...LC2(height),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Rectangle drawn");
    }

    async drawCircle(x, y, radius, filled = false) {
      log.info(`drawCircle(x=${x}, y=${y}, r=${radius}, filled=${filled})`);

      const cmd = filled ? UI_DRAW_CMD.FILLCIRCLE : UI_DRAW_CMD.CIRCLE;

      const bytecode = [
        OPCODE.opUI_DRAW,
        cmd,
        ...LC0(0x01),
        ...LC2(x),
        ...LC2(y),
        ...LC2(radius),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Circle drawn");
    }

    async invertRect(x, y, width, height) {
      log.info(`invertRect(x=${x}, y=${y}, w=${width}, h=${height})`);

      const bytecode = [
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.INVERSERECT,
        ...LC2(x),
        ...LC2(y),
        ...LC2(width),
        ...LC2(height),
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.UPDATE,
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Rectangle inverted");
    }

    async selectFont(size) {
      log.info(`selectFont(size=${size})`);

      const bytecode = [
        OPCODE.opUI_DRAW,
        UI_DRAW_CMD.SELECT_FONT,
        ...LC0(size),
      ];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Font selected");
    }

    // ==================== TIMER ====================

    async wait(ms) {
      log.info(`wait(ms=${ms})`);

      const bytecode = [OPCODE.opTIMER_WAIT, ...LC4(ms), ...LV0(0)];

      await this.sendDirectCommand(bytecode, 0, 4, false);
    }

    async readTimer() {
      log.info("readTimer()");

      const bytecode = [OPCODE.opTIMER_READ, ...GV0(0)];

      const reply = await this.sendDirectCommand(bytecode, 4, 0, true);

      if (reply && reply.length >= 4) {
        const view = new DataView(
          reply.buffer,
          reply.byteOffset,
          reply.byteLength
        );
        const time = view.getFloat32(0, true);
        log.success(`Timer: ${time}ms`);
        return time;
      }

      return 0;
    }

    // ==================== STATUS ====================

    async getBatteryLevel() {
      const bytecode = [
        0x81, // opUI_READ
        0x01, // GET_VBATT subcode
        0x60, // Destination: GV0
      ];
      // Reserve 4 bytes for a Float32 return value
      const reply = await this.sendDirectCommand(bytecode, 4, 0, true);
      if (reply && reply.length >= 4) {
        const view = new DataView(
          reply.buffer,
          reply.byteOffset,
          reply.byteLength
        );
        return view.getFloat32(0, true);
      }
      return 0;
    }

    async setVolume(volume) {
      volume = Math.max(0, Math.min(100, volume));
      log.info(`setVolume(volume=${volume})`);

      const bytecode = [OPCODE.opINFO, INFO_CMD.SET_VOLUME, ...LC1(volume)];

      await this.sendDirectCommand(bytecode, 0, 0, false);
      log.success("Volume set");
    }

    async getVolume() {
      log.info("getVolume()");

      const bytecode = [OPCODE.opINFO, INFO_CMD.GET_VOLUME, ...GV0(0)];

      const reply = await this.sendDirectCommand(bytecode, 1, 0, true);

      if (reply && reply.length >= 1) {
        const volume = reply[0];
        log.success(`Volume: ${volume}`);
        return volume;
      }

      return 50;
    }
  }

  // ==================== SCRATCH EXTENSION ====================

  class LegoEV3Extension {
    constructor(runtime) {
      this.runtime = runtime;
      this.peripheral = new EV3Peripheral(runtime);
      log.success("Extension constructed");
    }

    getInfo() {
      return {
        id: "legoev3direct",
        name: t("ev3d.name"),
        color1: "#00B395",
        color2: "#009A7F",
        color3: "#008169",
        blockIconURI:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMDBCMzk1IiByeD0iNSIvPjx0ZXh0IHg9IjIwIiB5PSIyOCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkUzPC90ZXh0Pjwvc3ZnPg==",
        blocks: [
          {
            opcode: "connect",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.connect"),
          },
          {
            opcode: "disconnect",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.disconnect"),
          },
          {
            opcode: "isConnected",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("ev3d.connected"),
          },

          "---",

          {
            opcode: "motorOn",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.motorOn"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORTS",
                defaultValue: "A",
              },
              POWER: { type: Scratch.ArgumentType.NUMBER, defaultValue: 75 },
            },
          },
          {
            opcode: "motorRunDegrees",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.motorRunDeg"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORTS",
                defaultValue: "A",
              },
              DEGREES: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
              POWER: { type: Scratch.ArgumentType.NUMBER, defaultValue: 75 },
              BRAKE: {
                type: Scratch.ArgumentType.STRING,
                menu: "BRAKE_MODE",
                defaultValue: "brake",
              },
            },
          },
          {
            opcode: "motorRunSeconds",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.motorRunSec"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORTS",
                defaultValue: "A",
              },
              SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              POWER: { type: Scratch.ArgumentType.NUMBER, defaultValue: 75 },
              BRAKE: {
                type: Scratch.ArgumentType.STRING,
                menu: "BRAKE_MODE",
                defaultValue: "brake",
              },
            },
          },
          {
            opcode: "motorStop",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.motorStop"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORTS",
                defaultValue: "A",
              },
              BRAKE: {
                type: Scratch.ArgumentType.STRING,
                menu: "BRAKE_MODE",
                defaultValue: "brake",
              },
            },
          },
          {
            opcode: "setMotorPolarity",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.motorPolarity"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORTS",
                defaultValue: "A",
              },
              POLARITY: {
                type: Scratch.ArgumentType.STRING,
                menu: "POLARITY",
                defaultValue: "forward",
              },
            },
          },
          {
            opcode: "getMotorPosition",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.motorPosition"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORT_SINGLE",
                defaultValue: "A",
              },
            },
          },
          {
            opcode: "getMotorSpeed",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.motorSpeed"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORT_SINGLE",
                defaultValue: "A",
              },
            },
          },
          {
            opcode: "resetMotorPosition",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.motorReset"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "MOTOR_PORTS",
                defaultValue: "A",
              },
            },
          },

          "---",

          {
            opcode: "isTouchPressed",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("ev3d.touchPressed"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "1",
              },
            },
          },

          "---",

          {
            opcode: "getColor",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.colorColor"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "3",
              },
            },
          },
          {
            opcode: "getReflectedLight",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.colorRefl"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "3",
              },
            },
          },
          {
            opcode: "getAmbientLight",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.colorAmb"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "3",
              },
            },
          },
          {
            opcode: "getRGBRaw",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.colorRGB"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "3",
              },
              COMPONENT: {
                type: Scratch.ArgumentType.STRING,
                menu: "RGB_COMPONENT",
                defaultValue: "r",
              },
            },
          },

          "---",

          {
            opcode: "getUltrasonicDistance",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.ultrasonic"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "4",
              },
            },
          },

          "---",

          {
            opcode: "getGyroAngle",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.gyroAngle"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "2",
              },
            },
          },
          {
            opcode: "getGyroRate",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.gyroRate"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "2",
              },
            },
          },
          {
            opcode: "resetGyro",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.gyroReset"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "2",
              },
            },
          },

          "---",

          {
            opcode: "getInfraredProximity",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.infrared"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "4",
              },
            },
          },

          "---",

          {
            opcode: "getNXTLight",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.nxtLight"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "3",
              },
            },
          },
          {
            opcode: "getNXTSound",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.nxtSound"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "SENSOR_PORT",
                defaultValue: "2",
              },
            },
          },

          "---",

          {
            opcode: "isButtonPressed",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("ev3d.brickButton"),
            arguments: {
              BUTTON: {
                type: Scratch.ArgumentType.STRING,
                menu: "BRICK_BUTTON",
                defaultValue: "enter",
              },
            },
          },

          "---",

          {
            opcode: "setLED",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.setLED"),
            arguments: {
              PATTERN: {
                type: Scratch.ArgumentType.STRING,
                menu: "LED_PATTERN",
                defaultValue: "green",
              },
            },
          },

          "---",

          {
            opcode: "playTone",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.playTone"),
            arguments: {
              FREQ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 440 },
              MS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 500 },
              VOL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "playNote",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.playNote"),
            arguments: {
              NOTE: {
                type: Scratch.ArgumentType.STRING,
                menu: "NOTE",
                defaultValue: "C4",
              },
              BEATS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "stopSound",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.stopSound"),
          },
          {
            opcode: "setVolume",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.setVolume"),
            arguments: {
              VOL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "getVolume",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.volume"),
          },

          "---",

          {
            opcode: "clearScreen",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.clearScreen"),
          },
          {
            opcode: "drawText",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.drawText"),
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello!",
              },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 40 },
            },
          },
          {
            opcode: "selectFont",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.selectFont"),
            arguments: {
              SIZE: {
                type: Scratch.ArgumentType.STRING,
                menu: "FONT_SIZE",
                defaultValue: "normal",
              },
            },
          },
          {
            opcode: "drawPixel",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.drawPixel"),
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 89 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 64 },
            },
          },
          {
            opcode: "drawLine",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.drawLine"),
            arguments: {
              X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 168 },
              Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 118 },
            },
          },
          {
            opcode: "drawRect",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.drawRect"),
            arguments: {
              FILL: {
                type: Scratch.ArgumentType.STRING,
                menu: "FILL_MODE",
                defaultValue: "outline",
              },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 140 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 88 },
            },
          },
          {
            opcode: "drawCircle",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.drawCircle"),
            arguments: {
              FILL: {
                type: Scratch.ArgumentType.STRING,
                menu: "FILL_MODE",
                defaultValue: "outline",
              },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 89 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 64 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 },
            },
          },
          {
            opcode: "invertRect",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.invertRect"),
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 140 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 88 },
            },
          },

          "---",

          {
            opcode: "wait",
            blockType: Scratch.BlockType.COMMAND,
            text: t("ev3d.wait"),
            arguments: {
              MS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1000 },
            },
          },
          {
            opcode: "readTimer",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.timer"),
          },

          "---",

          {
            opcode: "getBattery",
            blockType: Scratch.BlockType.REPORTER,
            text: t("ev3d.battery"),
          },
        ],
        menus: {
          MOTOR_PORTS: {
            acceptReporters: true,
            items: [
              "A",
              "B",
              "C",
              "D",
              "A+B",
              "A+C",
              "A+D",
              "B+C",
              "B+D",
              "C+D",
              "ALL",
            ],
          },
          MOTOR_PORT_SINGLE: {
            acceptReporters: true,
            items: ["A", "B", "C", "D"],
          },
          SENSOR_PORT: {
            acceptReporters: true,
            items: ["1", "2", "3", "4"],
          },
          BRAKE_MODE: {
            acceptReporters: false,
            items: ["brake", "coast"],
          },
          POLARITY: {
            acceptReporters: false,
            items: ["forward", "backward", "opposite"],
          },
          FILL_MODE: {
            acceptReporters: false,
            items: ["outline", "filled"],
          },
          FONT_SIZE: {
            acceptReporters: false,
            items: ["normal", "bold", "large"],
          },
          RGB_COMPONENT: {
            acceptReporters: false,
            items: ["r", "g", "b"],
          },
          BRICK_BUTTON: {
            acceptReporters: false,
            items: ["up", "down", "left", "right", "enter", "back"],
          },
          LED_PATTERN: {
            acceptReporters: false,
            items: [
              "off",
              "green",
              "red",
              "orange",
              "green flash",
              "red flash",
              "orange flash",
              "green pulse",
              "red pulse",
              "orange pulse",
            ],
          },
          NOTE: {
            acceptReporters: false,
            items: [
              "C4",
              "C#4",
              "D4",
              "D#4",
              "E4",
              "F4",
              "F#4",
              "G4",
              "G#4",
              "A4",
              "A#4",
              "B4",
              "C5",
              "C#5",
              "D5",
              "D#5",
              "E5",
              "F5",
              "F#5",
              "G5",
              "G#5",
              "A5",
              "A#5",
              "B5",
              "C6",
            ],
          },
        },
      };
    }

    // ==================== HELPER FUNCTIONS ====================

    parseMotorPorts(portsStr) {
      const portMap = {
        A: 1 << PORT.A,
        B: 1 << PORT.B,
        C: 1 << PORT.C,
        D: 1 << PORT.D,
        "A+B": (1 << PORT.A) | (1 << PORT.B),
        "A+C": (1 << PORT.A) | (1 << PORT.C),
        "A+D": (1 << PORT.A) | (1 << PORT.D),
        "B+C": (1 << PORT.B) | (1 << PORT.C),
        "B+D": (1 << PORT.B) | (1 << PORT.D),
        "C+D": (1 << PORT.C) | (1 << PORT.D),
        ALL: 0x0f,
      };
      return portMap[portsStr] || 1 << PORT.A;
    }

    parseSensorPort(portStr) {
      const portNum = parseInt(portStr);
      return isNaN(portNum) ? PORT.S1 : portNum - 1;
    }

    parseButton(buttonStr) {
      const buttonMap = {
        none: BUTTON.NONE,
        up: BUTTON.UP,
        enter: BUTTON.ENTER,
        down: BUTTON.DOWN,
        right: BUTTON.RIGHT,
        left: BUTTON.LEFT,
        back: BUTTON.BACK,
        any: BUTTON.ANY,
      };
      return buttonMap[buttonStr] || BUTTON.ENTER;
    }

    parseLEDPattern(patternStr) {
      const patternMap = {
        off: LED_PATTERN.OFF,
        green: LED_PATTERN.GREEN,
        red: LED_PATTERN.RED,
        orange: LED_PATTERN.ORANGE,
        "green flash": LED_PATTERN.GREEN_FLASH,
        "red flash": LED_PATTERN.RED_FLASH,
        "orange flash": LED_PATTERN.ORANGE_FLASH,
        "green pulse": LED_PATTERN.GREEN_PULSE,
        "red pulse": LED_PATTERN.RED_PULSE,
        "orange pulse": LED_PATTERN.ORANGE_PULSE,
      };
      return patternMap[patternStr] || LED_PATTERN.GREEN;
    }

    parsePolarity(polarityStr) {
      const polarityMap = {
        forward: 1,
        backward: -1,
        opposite: 0,
      };
      return polarityMap[polarityStr] || 1;
    }

    parseFontSize(sizeStr) {
      const sizeMap = {
        normal: 0,
        bold: 1,
        large: 2,
      };
      return sizeMap[sizeStr] || 0;
    }

    // ==================== BLOCK IMPLEMENTATIONS ====================

    connect() {
      return this.peripheral.connect();
    }
    disconnect() {
      return this.peripheral.disconnect();
    }
    isConnected() {
      return this.peripheral.isConnected();
    }

    motorOn(args) {
      const ports = this.parseMotorPorts(args.PORTS);
      const power = Cast.toNumber(args.POWER);
      return this.peripheral.motorOn(ports, power);
    }

    motorRunDegrees(args) {
      const ports = this.parseMotorPorts(args.PORTS);
      const power = Cast.toNumber(args.POWER);
      const degrees = Cast.toNumber(args.DEGREES);
      const brake = args.BRAKE === "brake";
      return this.peripheral.motorRunDegrees(ports, power, degrees, brake);
    }

    motorRunSeconds(args) {
      const ports = this.parseMotorPorts(args.PORTS);
      const power = Cast.toNumber(args.POWER);
      const seconds = Cast.toNumber(args.SECONDS);
      const brake = args.BRAKE === "brake";
      return this.peripheral.motorRunSeconds(ports, power, seconds, brake);
    }

    motorStop(args) {
      const ports = this.parseMotorPorts(args.PORTS);
      const brake = args.BRAKE === "brake";
      return this.peripheral.motorStop(ports, brake);
    }

    setMotorPolarity(args) {
      const ports = this.parseMotorPorts(args.PORTS);
      const polarity = this.parsePolarity(args.POLARITY);
      return this.peripheral.setMotorPolarity(ports, polarity);
    }

    getMotorPosition(args) {
      const port = PORT[args.PORT];
      return this.peripheral.getMotorPosition(port);
    }

    getMotorSpeed(args) {
      const port = PORT[args.PORT];
      return this.peripheral.getMotorSpeed(port);
    }

    resetMotorPosition(args) {
      const ports = this.parseMotorPorts(args.PORTS);
      return this.peripheral.resetMotorPosition(ports);
    }

    async isTouchPressed(args) {
      const port = this.parseSensorPort(args.PORT);
      return await this.peripheral.readTouch(port);
    }

    getColor(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readColor(port);
    }

    getReflectedLight(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readReflectedLight(port);
    }

    getAmbientLight(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readAmbientLight(port);
    }

    async getRGBRaw(args) {
      const port = this.parseSensorPort(args.PORT);
      const rgb = await this.peripheral.readRGBRaw(port);
      return rgb[args.COMPONENT] || 0;
    }

    getUltrasonicDistance(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readUltrasonic(port);
    }

    getGyroAngle(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readGyroAngle(port);
    }

    getGyroRate(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readGyroRate(port);
    }

    resetGyro(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.resetGyro(port);
    }

    getInfraredProximity(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readInfraredProximity(port);
    }

    getNXTLight(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readNXTLight(port);
    }

    getNXTSound(args) {
      const port = this.parseSensorPort(args.PORT);
      return this.peripheral.readNXTSound(port);
    }

    isButtonPressed(args) {
      const button = this.parseButton(args.BUTTON);
      return this.peripheral.readButton(button);
    }

    setLED(args) {
      const pattern = this.parseLEDPattern(args.PATTERN);
      return this.peripheral.setLED(pattern);
    }

    playTone(args) {
      const freq = Cast.toNumber(args.FREQ);
      const ms = Cast.toNumber(args.MS);
      const vol = Cast.toNumber(args.VOL);
      return this.peripheral.playTone(freq, ms, vol);
    }

    playNote(args) {
      return this.peripheral.playNote(args.NOTE, Cast.toNumber(args.BEATS));
    }

    stopSound() {
      return this.peripheral.stopSound();
    }

    setVolume(args) {
      return this.peripheral.setVolume(Cast.toNumber(args.VOL));
    }

    getVolume() {
      return this.peripheral.getVolume();
    }

    clearScreen() {
      return this.peripheral.clearScreen();
    }

    drawText(args) {
      return this.peripheral.drawText(
        args.TEXT,
        Cast.toNumber(args.X),
        Cast.toNumber(args.Y)
      );
    }

    selectFont(args) {
      const size = this.parseFontSize(args.SIZE);
      return this.peripheral.selectFont(size);
    }

    drawPixel(args) {
      return this.peripheral.drawPixel(
        Cast.toNumber(args.X),
        Cast.toNumber(args.Y)
      );
    }

    drawLine(args) {
      return this.peripheral.drawLine(
        Cast.toNumber(args.X1),
        Cast.toNumber(args.Y1),
        Cast.toNumber(args.X2),
        Cast.toNumber(args.Y2)
      );
    }

    drawRect(args) {
      const filled = args.FILL === "filled";
      return this.peripheral.drawRect(
        Cast.toNumber(args.X),
        Cast.toNumber(args.Y),
        Cast.toNumber(args.W),
        Cast.toNumber(args.H),
        filled
      );
    }

    drawCircle(args) {
      const filled = args.FILL === "filled";
      return this.peripheral.drawCircle(
        Cast.toNumber(args.X),
        Cast.toNumber(args.Y),
        Cast.toNumber(args.R),
        filled
      );
    }

    invertRect(args) {
      return this.peripheral.invertRect(
        Cast.toNumber(args.X),
        Cast.toNumber(args.Y),
        Cast.toNumber(args.W),
        Cast.toNumber(args.H)
      );
    }

    wait(args) {
      return this.peripheral.wait(Cast.toNumber(args.MS));
    }

    readTimer() {
      return this.peripheral.readTimer();
    }

    getBattery() {
      return this.peripheral.getBatteryLevel();
    }
  }

  Scratch.extensions.register(new LegoEV3Extension());
  log.success(
    "🎉 LEGO EV3 Direct Extension fully loaded with all fixes and debug logging!"
  );
})(Scratch);
