// Name: Circuit Cubes
// ID: circuitcubes
// Description: Drive the three channels of a Circuit Cubes Bluetooth Cube over Web Bluetooth.
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0
(function (Scratch) {
  "use strict";

  // ============================================================================
  // INTERNATIONALIZATION (i18n)
  //
  // Module-level locale state pattern shared with legospike_ble.js,
  // lego_poweredup.js, planetemaths.js, etc. Detect once at gallery-load,
  // listen for changes, resolve block text via the module-level t(key) at
  // every getInfo() call.
  // ============================================================================

  const translations = {
    en: {
      "circuitcubes.name": "Circuit Cubes",
      "circuitcubes.connect": "connect to Circuit Cubes",
      "circuitcubes.disconnect": "disconnect",
      "circuitcubes.connected": "connected?",
      "circuitcubes.setPower": "set channel [CHANNEL] power to [POWER] %",
      "circuitcubes.stopChannel": "stop channel [CHANNEL]",
      "circuitcubes.stopAll": "stop all channels",
      "circuitcubes.power": "channel [CHANNEL] power",
    },
    de: {
      "circuitcubes.name": "Circuit Cubes",
      "circuitcubes.connect": "mit Circuit Cubes verbinden",
      "circuitcubes.disconnect": "trennen",
      "circuitcubes.connected": "verbunden?",
      "circuitcubes.setPower": "Kanal [CHANNEL] auf [POWER] % Leistung setzen",
      "circuitcubes.stopChannel": "Kanal [CHANNEL] stoppen",
      "circuitcubes.stopAll": "alle Kanäle stoppen",
      "circuitcubes.power": "Leistung von Kanal [CHANNEL]",
    },
    fr: {
      "circuitcubes.name": "Circuit Cubes",
      "circuitcubes.connect": "se connecter aux Circuit Cubes",
      "circuitcubes.disconnect": "déconnecter",
      "circuitcubes.connected": "connecté ?",
      "circuitcubes.setPower":
        "régler la puissance du canal [CHANNEL] à [POWER] %",
      "circuitcubes.stopChannel": "arrêter le canal [CHANNEL]",
      "circuitcubes.stopAll": "arrêter tous les canaux",
      "circuitcubes.power": "puissance du canal [CHANNEL]",
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

  // ============================================================================
  // PROTOCOL
  //
  // A Circuit Cubes Bluetooth Cube speaks the Nordic UART Service (NUS): a
  // write characteristic the host pushes ASCII into, and a notify
  // characteristic the cube pushes ASCII back out of. There is no binary
  // framing, no checksum and no acknowledgement.
  //
  // One command is exactly five ASCII characters:
  //
  //     <sign><ddd><channel>      e.g. "+123a", "-009b", "+000c"
  //
  //   sign     "+" forwards, "-" backwards
  //   ddd      speed magnitude 0..255, zero padded to three digits
  //   channel  "a", "b" or "c" -- the three output ports of the cube
  //
  // "+000<channel>" is how a channel is stopped. There is no separate stop
  // opcode. What a channel actually does depends on what the user plugged
  // into it: a motor spins, an LED lights, so the blocks below talk about
  // channels and signed power rather than about motors.
  //
  // Derived by reading the open source Circuit Cubes web remote at
  // https://github.com/repkovsky/CircuitCubesRemote -- ble_nus.js for the
  // service and characteristic UUIDs and the 20 byte chunking, index.html
  // (sendMotorCmd) for the command string. NOTE: that implementation builds
  // the string as `(speed >= 0 ? "+" : "") + String(speed).padStart(3, "0")`,
  // which for a negative speed of magnitude below 100 pads the minus sign
  // itself and emits "0-9a" rather than "-009a". We treat that as an upstream
  // bug -- the documented shape is sign followed by three digits -- and always
  // emit the sign separately from a three digit magnitude.
  // ============================================================================

  const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  // "RX" and "TX" below are named from the *cube's* point of view, as in the
  // Nordic spec: RX is what the host writes to, TX is what the host listens to.
  const NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  const NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

  /** Bytes per GATT write. The cube's UART bridge does not reassemble beyond this. */
  const MTU = 20;

  /** The three output channels, in the order they are labelled on the cube. */
  const CHANNELS = ["a", "b", "c"];

  /** Largest speed magnitude the wire format can carry. */
  const MAX_SPEED = 255;

  /**
   * Normalize a user supplied channel to its wire form.
   * Accepts "A"/"a" etc. Throws on anything else, because silently picking a
   * channel for the user would move the wrong motor.
   * @param {unknown} channel
   * @returns {"a"|"b"|"c"}
   */
  const normalizeChannel = (channel) => {
    const normalized = String(channel).trim().toLowerCase();
    if (!CHANNELS.includes(normalized)) {
      throw new Error(
        `Circuit Cubes: unknown channel ${JSON.stringify(String(channel))}, expected a, b or c`
      );
    }
    return /** @type {"a"|"b"|"c"} */ (normalized);
  };

  /**
   * Turn a signed percentage from the block face into the cube's signed
   * 0..255 speed. Non-numeric input becomes 0 (a stop) rather than NaN, which
   * would otherwise be padded into a nonsense command.
   * @param {unknown} percent -100..100
   * @returns {number} -255..255, integral
   */
  const percentToSpeed = (percent) => {
    const numeric = Number(percent);
    if (Number.isNaN(numeric)) return 0;
    // Math.min/max fold +-Infinity onto the ends of the range.
    const clamped = Math.max(-100, Math.min(100, numeric));
    // Round the magnitude, not the signed value: Math.round breaks .5 ties
    // towards +Infinity, which would make -50% one step weaker than +50%.
    const speed = Math.round((Math.abs(clamped) / 100) * MAX_SPEED);
    return clamped < 0 ? -speed : speed;
  };

  /**
   * Encode one command for the cube.
   * @param {unknown} channel "a", "b" or "c" (case insensitive)
   * @param {unknown} speed signed magnitude -255..255; out of range values are
   *   clamped, non-numeric values are treated as a stop
   * @returns {string} five ASCII characters, e.g. "+123a"
   */
  const encodeCommand = (channel, speed) => {
    const wireChannel = normalizeChannel(channel);
    const numeric = Number(speed);
    // NaN (a non-numeric input) becomes a stop; +-Infinity clamps to full power.
    const safe = Number.isNaN(numeric) ? 0 : numeric;
    const clamped = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, safe));
    // Round the magnitude, not the signed value, so that -12.5 and +12.5 are
    // the same distance from a standstill. Math.abs(-0) is 0, so a speed that
    // rounds away to nothing always encodes as "+000" rather than "-000".
    const magnitude = Math.round(Math.abs(clamped));
    const sign = clamped < 0 && magnitude !== 0 ? "-" : "+";
    return `${sign}${String(magnitude).padStart(3, "0")}${wireChannel}`;
  };

  /**
   * The command that stops a channel. Same shape as everything else; the cube
   * has no dedicated stop opcode.
   * @param {unknown} channel
   * @returns {string}
   */
  const encodeStop = (channel) => encodeCommand(channel, 0);

  /**
   * Split an ASCII command into MTU sized writes. A single command is five
   * bytes so this is a no-op in practice, but the cube's UART bridge truncates
   * anything longer and a future multi-command batch would hit it.
   * @param {string} text
   * @returns {Uint8Array[]}
   */
  const chunkForWrite = (text) => {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += MTU) {
      chunks.push(bytes.slice(offset, offset + MTU));
    }
    return chunks;
  };

  // The pure half of the protocol, gathered so it can be exercised without a
  // cube, a browser or a Bluetooth stack. See development/test-circuitcubes.js.
  const PROTOCOL = Object.freeze({
    NUS_SERVICE_UUID,
    NUS_RX_UUID,
    NUS_TX_UUID,
    MTU,
    CHANNELS,
    MAX_SPEED,
    normalizeChannel,
    percentToSpeed,
    encodeCommand,
    encodeStop,
    chunkForWrite,
  });

  // ============================================================================
  // EXTENSION
  // ============================================================================

  class CircuitCubesExtension {
    constructor() {
      this.device = null;
      this.server = null;
      this.rxCharacteristic = null;
      this.txCharacteristic = null;
      this.connected = false;

      // Last power we asked of each channel, as a percentage, so the reporter
      // can answer without the cube telling us (it never does).
      this.channelPower = { a: 0, b: 0, c: 0 };

      // Writes are serialized: the cube's UART bridge drops overlapping GATT
      // writes, and Scratch will happily fire three blocks in one frame.
      this.writeQueue = Promise.resolve();

      // Exposed for the protocol tests; nothing in the extension reads it.
      this._protocol = PROTOCOL;
    }

    getInfo() {
      return {
        id: "circuitcubes",
        name: t("circuitcubes.name"),
        color1: "#1FBF75",
        color2: "#189A5E",
        blocks: [
          {
            opcode: "connect",
            blockType: Scratch.BlockType.COMMAND,
            text: t("circuitcubes.connect"),
          },
          {
            opcode: "disconnect",
            blockType: Scratch.BlockType.COMMAND,
            text: t("circuitcubes.disconnect"),
          },
          {
            opcode: "isConnected",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("circuitcubes.connected"),
          },
          "---",
          {
            opcode: "setChannelPower",
            blockType: Scratch.BlockType.COMMAND,
            text: t("circuitcubes.setPower"),
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: "CHANNEL",
                defaultValue: "a",
              },
              POWER: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 75,
              },
            },
          },
          {
            opcode: "stopChannel",
            blockType: Scratch.BlockType.COMMAND,
            text: t("circuitcubes.stopChannel"),
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: "CHANNEL",
                defaultValue: "a",
              },
            },
          },
          {
            opcode: "stopAll",
            blockType: Scratch.BlockType.COMMAND,
            text: t("circuitcubes.stopAll"),
          },
          {
            opcode: "getChannelPower",
            blockType: Scratch.BlockType.REPORTER,
            text: t("circuitcubes.power"),
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: "CHANNEL",
                defaultValue: "a",
              },
            },
          },
        ],
        menus: {
          CHANNEL: {
            acceptReporters: true,
            items: [
              { text: "A", value: "a" },
              { text: "B", value: "b" },
              { text: "C", value: "c" },
            ],
          },
        },
      };
    }

    // ==================== CONNECTION ====================

    async connect() {
      if (this.connected) return;

      if (typeof navigator === "undefined" || !navigator.bluetooth) {
        throw new Error(
          "Circuit Cubes: Web Bluetooth is not available. Use TurboWarp Desktop, or a Chromium based browser with Web Bluetooth enabled."
        );
      }

      try {
        // Circuit Cubes advertise the Nordic UART Service but their
        // advertised name is not stable across firmware, so filter on the
        // service rather than on a name prefix.
        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [NUS_SERVICE_UUID] }],
          optionalServices: [NUS_SERVICE_UUID],
        });

        this.device.addEventListener("gattserverdisconnected", () => {
          this._reset();
        });

        this.server = await this.device.gatt.connect();
        const service = await this.server.getPrimaryService(NUS_SERVICE_UUID);
        this.rxCharacteristic = await service.getCharacteristic(NUS_RX_UUID);
        this.txCharacteristic = await service.getCharacteristic(NUS_TX_UUID);

        // The cube talks back (status lines, battery chatter). We do not use
        // it yet, but notifications have to be started for the firmware to
        // consider the link established.
        try {
          await this.txCharacteristic.startNotifications();
          this.txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this._onNotification.bind(this)
          );
        } catch (e) {
          // Some firmware revisions do not notify at all. Writing still works,
          // so this is not fatal.
          console.warn("[Circuit Cubes] notifications unavailable:", e);
        }

        this.connected = true;
        this.channelPower = { a: 0, b: 0, c: 0 };
      } catch (error) {
        if (error && error.name === "NotFoundError") {
          // The user closed the device chooser. Not an error worth shouting
          // about, and throwing here would stop the whole script.
          this._reset();
          return;
        }
        this._reset();
        throw new Error(`Circuit Cubes: connection failed: ${error.message}`);
      }
    }

    disconnect() {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }
      this._reset();
    }

    isConnected() {
      return !!(
        this.connected &&
        this.device &&
        this.device.gatt &&
        this.device.gatt.connected
      );
    }

    _reset() {
      this.connected = false;
      this.device = null;
      this.server = null;
      this.rxCharacteristic = null;
      this.txCharacteristic = null;
      this.channelPower = { a: 0, b: 0, c: 0 };
      this.writeQueue = Promise.resolve();
    }

    _onNotification(event) {
      // Reserved: the cube streams ASCII status back on the TX characteristic.
      // Nothing in the block set consumes it yet.
      void event;
    }

    // ==================== BLOCKS ====================

    async setChannelPower(args) {
      const channel = normalizeChannel(args.CHANNEL);
      const percent = Math.max(-100, Math.min(100, Number(args.POWER) || 0));
      const speed = percentToSpeed(percent);
      await this._send(encodeCommand(channel, speed));
      this.channelPower[channel] = percent;
    }

    async stopChannel(args) {
      const channel = normalizeChannel(args.CHANNEL);
      await this._send(encodeStop(channel));
      this.channelPower[channel] = 0;
    }

    async stopAll() {
      for (const channel of CHANNELS) {
        await this._send(encodeStop(channel));
        this.channelPower[channel] = 0;
      }
    }

    getChannelPower(args) {
      try {
        return this.channelPower[normalizeChannel(args.CHANNEL)];
      } catch (e) {
        return 0;
      }
    }

    // ==================== TRANSPORT ====================

    /**
     * Queue one ASCII command for the cube. Returns once it has been written.
     * Silently does nothing when no cube is connected, so that a project left
     * running after a disconnect does not fill the console with errors.
     * @param {string} command
     */
    _send(command) {
      if (!this.isConnected() || !this.rxCharacteristic) {
        return Promise.resolve();
      }
      const characteristic = this.rxCharacteristic;
      const run = this.writeQueue.then(async () => {
        for (const chunk of chunkForWrite(command)) {
          await characteristic.writeValue(chunk);
        }
      });
      // Keep the queue alive after a failed write, but do not swallow the
      // failure for the caller that is awaiting `run`.
      this.writeQueue = run.catch(() => {});
      return run;
    }
  }

  Scratch.extensions.register(new CircuitCubesExtension());
})(Scratch);
