// Name: STC12 / 8051 pins
// ID: stc12
// Description: Drive the pins declared with PIN in the Code tab.
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0
(function (Scratch) {
  "use strict";

  /** Pin declarations live on the runtime; see the importer's loadProject. */
  function decls(runtime) {
    const stc = runtime && runtime.stc;
    return stc && Array.isArray(stc.pins) ? stc.pins : [];
  }

  function portDecls(runtime) {
    const stc = runtime && runtime.stc;
    return stc && Array.isArray(stc.ports) ? stc.ports : [];
  }

  function partDecls(runtime) {
    const stc = runtime && runtime.stc;
    return stc && Array.isArray(stc.parts) ? stc.parts : [];
  }

  function tableDecls(runtime) {
    const stc = runtime && runtime.stc;
    return stc && Array.isArray(stc.tables) ? stc.tables : [];
  }

  /** Which device family is active? Drives palette name, color, and gating. */
  function deviceFamily(runtime) {
    const stc = runtime && runtime.stc;
    if (!stc || !stc.device) return "8051";
    if (/eater6502|w65c02/i.test(stc.device)) return "6502";
    if (/pico|rp2040/i.test(stc.device)) return "pico";
    if (/arduino-mega/i.test(stc.device)) return "mega";
    if (/arduino|atmega/i.test(stc.device)) return "avr";
    return "8051";
  }

  /**
   * The extension's own record of what the program wrote. It is the answer a
   * read gives when no circuit is attached, and the store for the frame
   * buffers and part state the circuit layer does not model yet. It is NOT how
   * a pin reaches the circuit: for a long time it was the only place a pin
   * write went, and nothing read it, so `turn on LED` lit nothing even on a
   * wired bench. The circuit is reached through circuitBoard() below.
   */
  function board(runtime) {
    if (!runtime._stc12Pins) runtime._stc12Pins = Object.create(null);
    return runtime._stc12Pins;
  }

  /**
   * The simulated board the Circuit tab publishes (vm.runtime.circuitBoard,
   * the same seam the devices, circuit and micro:bit+ extensions use), or
   * null when no circuit is attached.
   */
  function circuitBoard(runtime) {
    const b = runtime && runtime.circuitBoard;
    return b && typeof b.setPin === "function" ? b : null;
  }

  /**
   * The board terminal a PIN declaration names. The same mapping the stc12
   * JS/Python drivers use: 8051 pins are P<port>.<bit>; board-class devices
   * (Nano D13/A0, Pico GP25, Mega D22) carry their terminal in `where`. A
   * 6502 VIA pin (PA0..PB7) is the eater6502 part's via1.pa0..via1.pb7.
   */
  function terminalOf(p) {
    if (p.port !== undefined && p.port !== null && p.bit !== undefined)
      return "P" + p.port + "." + p.bit;
    if (p.portLetter)
      return "via1.p" + String(p.portLetter).toLowerCase() + p.bit;
    return String(p.where || p.pin || p.name).toLowerCase();
  }

  /**
   * The pin mode the drivers use: outputs push-pull; analog inputs high-Z;
   * 8051 inputs quasi-bidirectional (the weak pull-up); board-class inputs a
   * programmed pull (active-low -> pull-up, else pull-down).
   */
  function modeOf(p) {
    if (p.direction === "output") return "pushpull";
    if (p.direction === "analog") return "input";
    if (p.port !== undefined && p.port !== null) return "quasi";
    return p.activeLow ? "input-pullup" : "input-pulldown";
  }

  /**
   * Arm every declared INPUT pin once per board instance, as the drivers do:
   * nothing else ever calls setPin on a read-only pin, so without this it has
   * no pin state and its net floats. The third argument is the pull's rail —
   * a quasi pin idles HIGH, which IS the 8051 weak pull-up.
   */
  const armed = typeof WeakSet === "function" ? new WeakSet() : null;
  function arm(runtime, b) {
    if (!armed || armed.has(b)) return;
    armed.add(b);
    for (const p of decls(runtime)) {
      if (p.direction === "output") continue;
      const m = modeOf(p);
      b.setPin(terminalOf(p), m, m === "quasi");
    }
  }

  /** The attached board, armed, and the declaration of `name` — or nulls. */
  function attached(runtime, name) {
    const b = circuitBoard(runtime);
    if (!b) return { b: null, p: null };
    arm(runtime, b);
    const p = decls(runtime).find((d) => d.name === name) || null;
    return { b, p };
  }

  class STC12 {
    constructor(runtime) {
      this.runtime = runtime;
    }

    getInfo() {
      const family = deviceFamily(this.runtime);
      const is8051 = family === "8051";
      const isAVR = family === "avr" || family === "mega";
      const is6502 = family === "6502";
      const hasPWM = !is6502;
      const paletteName =
        family === "6502"
          ? Scratch.translate("6502 Pins")
          : family === "pico"
            ? Scratch.translate("Pico Pins")
            : family === "mega"
              ? Scratch.translate("Arduino Mega Pins")
              : family === "avr"
                ? Scratch.translate("Arduino Pins")
                : Scratch.translate("STC12 / 8051 Pins");
      const color1 = is6502
        ? "#B8860B"
        : family === "pico"
          ? "#8E44AD"
          : isAVR
            ? "#00878F"
            : "#3d7ea6";
      const color2 = is6502
        ? "#8B6914"
        : family === "pico"
          ? "#6C3483"
          : isAVR
            ? "#006B73"
            : "#2f6383";

      return {
        id: "stc12",
        name: paletteName,
        color1: color1,
        color2: color2,
        blocks: [
          {
            opcode: "setpin",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("turn [STATE] [PIN]"),
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "states" },
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
            },
          },
          {
            opcode: "toggle",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("toggle [PIN]"),
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
            },
          },
          {
            opcode: "writepin",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set [PIN] to [VALUE]"),
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "read",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("read [PIN]"),
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
            },
          },
          "---",
          {
            opcode: "setpwm",
            blockType: Scratch.BlockType.COMMAND,
            hideFromPalette: !hasPWM,
            text: Scratch.translate("set [PIN] to [VALUE] percent"),
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "settone",
            blockType: Scratch.BlockType.COMMAND,
            hideFromPalette: !is8051,
            text: Scratch.translate("set [PIN] to [VALUE] hz"),
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 440 },
            },
          },
          {
            opcode: "setport",
            blockType: Scratch.BlockType.COMMAND,
            hideFromPalette: !is8051,
            text: Scratch.translate("set [PORT] to [VALUE]"),
            arguments: {
              PORT: { type: Scratch.ArgumentType.STRING, menu: "ports" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "readport",
            blockType: Scratch.BlockType.REPORTER,
            hideFromPalette: !is8051,
            text: Scratch.translate("read [PORT]"),
            arguments: {
              PORT: { type: Scratch.ArgumentType.STRING, menu: "ports" },
            },
          },
          {
            opcode: "setpart",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set [PART] to [VALUE]"),
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "print",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("print [VALUE]"),
            arguments: {
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "hello",
              },
              MODE: { type: Scratch.ArgumentType.STRING, menu: "printModes" },
            },
          },
          "---",
          {
            opcode: "whenpin",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when [PIN] [EDGE]"),
            isEdgeActivated: true,
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
              EDGE: { type: Scratch.ArgumentType.STRING, menu: "edges" },
            },
          },
          "---",
          // ---- KEYPAD4X4 / SEVENSEG8 / LEDBANK8. Mirrors of the reference
          // copy (sb3-creator reference/extensions/stc12.js) and of the C the
          // emitter writes. They were added there on 2026-08-18 (4962d4d,
          // 952b623) and never ported here, so every one of them was an
          // undefined opcode in the bundle: a silent no-op in the VM and a
          // half-loaded workspace in the editor. See sb3-creator
          // test/STC12-CONFORMANCE-FINDING.md.
          //
          // Not device-gated: these hang off a PART declaration, and the
          // 'parts' menu is already driven by what the Code tab declared. A
          // board with no such PART simply offers no item to choose.
          {
            opcode: "keypad",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("key on [PART]"),
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "whenkey",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when key [KEY] [EDGE]"),
            isEdgeActivated: true,
            arguments: {
              KEY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              EDGE: { type: Scratch.ArgumentType.STRING, menu: "edges" },
            },
          },
          {
            opcode: "seg_shownum",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("show number [NUM] on [PART]"),
            arguments: {
              NUM: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "seg_showdigit",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate(
              "show digit [DIGIT] = value [VALUE] on [PART]"
            ),
            arguments: {
              DIGIT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "seg_setsegs",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate(
              "set digit [DIGIT] to segments [SEGS] on [PART]"
            ),
            arguments: {
              DIGIT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SEGS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "seg_clear",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("clear display [PART]"),
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "led_on",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("turn on led [N] on [PART]"),
            arguments: {
              N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "led_off",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("turn off led [N] on [PART]"),
            arguments: {
              N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "led_set",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set leds to [VALUE] on [PART]"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "led_only",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("light only led [N] on [PART]"),
            arguments: {
              N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "tableindex",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("[TABLE] [ [INDEX] ]"),
            arguments: {
              TABLE: { type: Scratch.ArgumentType.STRING, menu: "tables" },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          // ---- MATRIX8X8: an 8x8 dot-matrix SCREEN that self-scans in the
          // Timer-0 ISR. All verbs write the RAM frame buffer only. STYLE and
          // DIR are FIELD menus (acceptReporters:false), the coordinates and
          // level/bits are numeric inputs — matching what sb3-creator emits.
          {
            opcode: "matrix_setpx",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate(
              "[STYLE] pixel [X] [Y] level [LEVEL] on [PART]"
            ),
            arguments: {
              STYLE: { type: Scratch.ArgumentType.STRING, menu: "pixelStyles" },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              LEVEL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "matrix_row",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("draw row [Y] = [BITS] on [PART]"),
            arguments: {
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              BITS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "matrix_image",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("show image [TABLE] on [PART]"),
            arguments: {
              TABLE: { type: Scratch.ArgumentType.STRING, menu: "tables" },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "matrix_scroll",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("scroll [PART] [DIR]"),
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
              DIR: { type: Scratch.ArgumentType.STRING, menu: "scrollDirs" },
            },
          },
          {
            opcode: "matrix_dim",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set [PART] brightness [LEVEL]"),
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
              LEVEL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
            },
          },
          {
            opcode: "matrix_paint",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("paint [GRID] on [PART]"),
            arguments: {
              GRID: {
                type: "led8x8",
                defaultValue:
                  "0330033033333333333333333333333303333330003333000003300000000000",
              },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "matrix_clear",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("clear screen [PART]"),
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
          {
            opcode: "matrix_getpx",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("pixel [X] [Y] on [PART] is on"),
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              PART: { type: Scratch.ArgumentType.STRING, menu: "parts" },
            },
          },
        ],
        menus: {
          // acceptReporters:false is what makes these FIELDS rather than inputs,
          // which is how sb3-creator writes them.
          pins: { acceptReporters: false, items: "pinNames" },
          states: {
            acceptReporters: false,
            items: ["on", "off", "high", "low"],
          },
          ports: { acceptReporters: false, items: "portNames" },
          parts: { acceptReporters: false, items: "partNames" },
          printModes: { acceptReporters: false, items: ["text", "number"] },
          edges: { acceptReporters: false, items: ["pressed", "released"] },
          tables: { acceptReporters: false, items: "tableNames" },
          pixelStyles: {
            acceptReporters: false,
            items: ["light", "clear", "on", "off", "brightness"],
          },
          scrollDirs: {
            acceptReporters: false,
            items: ["left", "right", "up", "down"],
          },
        },
      };
    }

    /** Declared pins, or a placeholder so the palette is never an empty dropdown. */
    pinNames() {
      const names = decls(this.runtime).map((p) => p.name);
      if (names.length) return names;
      const family = deviceFamily(this.runtime);
      const hint =
        family === "6502"
          ? "(declare a PIN like PA0 or PB3 in the Code tab)"
          : family === "pico"
            ? "(declare a PIN like GP25 in the Code tab)"
            : family === "mega"
              ? "(declare a PIN like D22 or A8 in the Code tab)"
              : family === "avr"
                ? "(declare a PIN like D13 or A0 in the Code tab)"
                : "(declare a PIN in the Code tab)";
      return [{ text: hint, value: "" }];
    }

    portNames() {
      const names = portDecls(this.runtime).map((p) => p.name);
      return names.length
        ? names
        : [{ text: "(declare a PORT in the Code tab)", value: "" }];
    }

    partNames() {
      const names = partDecls(this.runtime).map((p) => p.name);
      return names.length
        ? names
        : [{ text: "(declare a PART in the Code tab)", value: "" }];
    }

    tableNames() {
      const names = tableDecls(this.runtime).map((t) => t.name);
      return names.length
        ? names
        : [{ text: "(declare a TABLE in the Code tab)", value: "" }];
    }

    setpin(args) {
      const pin = decls(this.runtime).find((p) => p.name === args.PIN);
      const state = String(args.STATE);
      // ACTIVE LOW is the whole point of the declaration: "on" writes a 0.
      const level =
        state === "on"
          ? pin && pin.activeLow
            ? 0
            : 1
          : state === "off"
            ? pin && pin.activeLow
              ? 1
              : 0
            : state === "high"
              ? 1
              : 0;
      this._drive(args.PIN, level);
    }

    toggle(args) {
      this._drive(args.PIN, this._level(args.PIN) ? 0 : 1);
    }

    writepin(args) {
      this._drive(args.PIN, Number(args.VALUE) ? 1 : 0);
    }

    /** Record the level, and drive it onto the circuit's pin if one is attached. */
    _drive(name, level) {
      board(this.runtime)[name] = level;
      const { b, p } = attached(this.runtime, name);
      if (b && p) b.setPin(terminalOf(p), modeOf(p), !!level);
    }

    /**
     * The raw level of a pin: the circuit's, when one is attached (an input
     * reads what the button did, not what the program last wrote), else the
     * program's own last write.
     */
    _level(name) {
      const { b, p } = attached(this.runtime, name);
      if (b && p && typeof b.readPin === "function")
        return Number(b.readPin(terminalOf(p))) ? 1 : 0;
      const m = board(this.runtime);
      return Object.prototype.hasOwnProperty.call(m, name) ? m[name] : 0;
    }

    read(args) {
      const { b, p } = attached(this.runtime, args.PIN);
      // An ANALOG pin reads volts from the board; the MCU scales to counts
      // (the drivers' rule, 5 V full scale).
      if (b && p && p.direction === "analog" && b.readAnalog) {
        const v = Number(b.readAnalog(terminalOf(p)));
        return isFinite(v)
          ? Math.max(0, Math.min(1023, Math.round((v / 5.0) * 1023)))
          : 0;
      }
      return this._level(args.PIN);
    }

    setpwm(args) {
      const pct = Number(args.VALUE);
      board(this.runtime)[args.PIN + "_pwm"] = pct;
      const { b, p } = attached(this.runtime, args.PIN);
      if (!b || !p) return;
      // The board switches the pin itself at the duty's edges (bw-board
      // setPwm), so an LED dims and a motor slows. A board without setPwm is
      // told nothing rather than a guess: a threshold would light a 25 % LED
      // at full or not at all.
      if (typeof b.setPwm === "function") b.setPwm(terminalOf(p), pct);
    }

    settone(args) {
      const hz = Number(args.VALUE);
      board(this.runtime)[args.PIN + "_tone"] = hz;
      const { b, p } = attached(this.runtime, args.PIN);
      if (b && p && typeof b.setTone === "function")
        b.setTone(terminalOf(p), hz);
    }

    setport(args) {
      board(this.runtime)["port_" + args.PORT] = Number(args.VALUE) & 0xff;
    }

    readport(args) {
      const b = board(this.runtime);
      const k = "port_" + args.PORT;
      return Object.prototype.hasOwnProperty.call(b, k) ? b[k] : 0;
    }

    setpart(args) {
      board(this.runtime)["part_" + args.PART] = Number(args.VALUE) & 0xff;
    }

    // ---- MATRIX8X8: an 8x8 SCREEN. The editor keeps a simple 8-byte
    // threshold frame buffer per screen on the board (scr_<name>); a face
    // renderer reads it. bit7 of a row byte = the LEFT column, matching the C
    // driver and the image literals. Brightness is collapsed to on/off in this
    // preview (monochrome); the generated C carries the real 2-bit depth.
    _scr(part) {
      const b = board(this.runtime);
      const k = "scr_" + part;
      if (!Object.prototype.hasOwnProperty.call(b, k))
        b[k] = [0, 0, 0, 0, 0, 0, 0, 0];
      return b[k];
    }

    _scrpx(part, x, y, on) {
      x = Number(x) | 0;
      y = Number(y) | 0;
      if (x < 0 || x > 7 || y < 0 || y > 7) return;
      const buf = this._scr(part);
      const m = 0x80 >> x;
      if (on) buf[y] |= m;
      else buf[y] &= ~m & 0xff;
    }

    matrix_setpx(args) {
      const on =
        args.STYLE === "light" ||
        args.STYLE === "on" ||
        (args.STYLE === "brightness" && Number(args.LEVEL) > 0);
      this._scrpx(args.PART, args.X, args.Y, on);
    }

    matrix_row(args) {
      const y = Number(args.Y) | 0;
      if (y < 0 || y > 7) return;
      this._scr(args.PART)[y] = Number(args.BITS) & 0xff;
    }

    matrix_image(args) {
      // The circuit layer feeds tab_<name> as an 8-byte array (the TABLE
      // values); blit it, or clear the screen if the table is absent.
      const img = board(this.runtime)["tab_" + args.TABLE];
      const buf = this._scr(args.PART);
      for (let y = 0; y < 8; y++)
        buf[y] = Array.isArray(img) ? Number(img[y]) & 0xff : 0;
    }

    matrix_paint(args) {
      // The painted 8x8 grid (FieldLed8x8: 64 chars '0'..'3', row-major) blits
      // straight onto the sim buffer — 1-bit here (lit iff level>0); the C
      // emitter keeps per-pixel brightness via setpx. Front-end preview of what
      // the firmware will scan.
      const g = String(args.GRID || "");
      const buf = this._scr(args.PART);
      for (let y = 0; y < 8; y++) {
        let byte = 0;
        for (let x = 0; x < 8; x++) {
          if (g.charCodeAt(y * 8 + x) - 48 > 0) byte |= 0x80 >> x;
        }
        buf[y] = byte & 0xff;
      }
    }

    matrix_scroll(args) {
      const buf = this._scr(args.PART);
      if (args.DIR === "left")
        for (let y = 0; y < 8; y++) buf[y] = (buf[y] << 1) & 0xff;
      else if (args.DIR === "right")
        for (let y = 0; y < 8; y++) buf[y] = (buf[y] >> 1) & 0xff;
      else if (args.DIR === "up") {
        for (let y = 0; y < 7; y++) buf[y] = buf[y + 1];
        buf[7] = 0;
      } else {
        for (let y = 7; y > 0; y--) buf[y] = buf[y - 1];
        buf[0] = 0;
      }
    }

    matrix_dim(args) {
      board(this.runtime)["scrdim_" + args.PART] = Number(args.LEVEL);
    }

    matrix_clear(args) {
      const buf = this._scr(args.PART);
      for (let y = 0; y < 8; y++) buf[y] = 0;
    }

    matrix_getpx(args) {
      const x = Number(args.X) | 0,
        y = Number(args.Y) | 0;
      if (x < 0 || x > 7 || y < 0 || y > 7) return false;
      return (this._scr(args.PART)[y] & (0x80 >> x)) !== 0;
    }

    print(args) {
      // In the editor, print goes to the console. On hardware, it is the UART.
      const val =
        String(args.MODE) === "number"
          ? Number(args.VALUE)
          : String(args.VALUE);
      if (typeof console !== "undefined") console.log(val);
    }

    whenpin(args) {
      // Edge-triggered: returns true on the rising or falling edge of the
      // logical level (polarity-aware). isEdgeActivated makes scratch-vm
      // call this once per tick and fire the hat on a false→true transition.
      const pin = decls(this.runtime).find((p) => p.name === args.PIN);
      const raw = this._level(args.PIN);
      const level = pin && pin.activeLow ? !raw : !!raw;
      return args.EDGE === "pressed" ? level : !level;
    }

    // ---- KEYPAD4X4 / SEVENSEG8 / LEDBANK8 implementations. Byte-for-byte
    // the semantics of the reference copy and of the emitted C: the display
    // verbs write an 8-byte frame buffer, the LED verbs write a shadow byte,
    // and the keypad reads what the board layer scanned. Nothing here drives
    // a pin directly — the ISR does, on silicon and in the simulator alike.

    keypad(args) {
      // The scanned key 0..15, or -1 for none — same contract as the C
      // scanner (PART KEYPAD4X4). The circuit layer feeds keypad_<name>;
      // absent hardware reads as "nothing pressed".
      const b = board(this.runtime);
      const k = "keypad_" + args.PART;
      return Object.prototype.hasOwnProperty.call(b, k) ? Number(b[k]) : -1;
    }

    whenkey(args) {
      // Edge hat on the sole KEYPAD4X4: true while the scanned key equals
      // KEY; isEdgeActivated turns the false-to-true transition into the
      // fire. The sole-keypad rule means any keypad_* entry is the one.
      const b = board(this.runtime);
      const k = Object.keys(b).find((n) => n.indexOf("keypad_") === 0);
      const cur = k ? Number(b[k]) : -1;
      const held = cur === Number(args.KEY);
      return args.EDGE === "pressed" ? held : !held;
    }

    _segfb(part) {
      // 8-digit frame buffer, one segment byte per digit — the same shape
      // the C keeps in bw_<part>_fb. The board/circuit layer reads it.
      if (!this._segs) this._segs = {};
      if (!this._segs[part]) this._segs[part] = new Array(8).fill(0);
      return this._segs[part];
    }

    seg_shownum(args) {
      const FONT = [
        0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c,
        0x39, 0x5e, 0x79, 0x71,
      ];
      const fb = this._segfb(args.PART);
      fb.fill(0);
      let n = Number(args.NUM) | 0;
      const neg = n < 0;
      let u = Math.abs(n),
        i = 7;
      do {
        fb[i] = FONT[u % 10];
        u = Math.floor(u / 10);
        if (i === 0) break;
        i--;
      } while (u);
      if (neg && i > 0) fb[i - 1] = 0x40;
    }

    seg_showdigit(args) {
      const FONT = [
        0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c,
        0x39, 0x5e, 0x79, 0x71,
      ];
      const d = Number(args.DIGIT) | 0;
      if (d < 0 || d > 7) return;
      this._segfb(args.PART)[d] = FONT[(Number(args.VALUE) | 0) & 0x0f];
    }

    seg_setsegs(args) {
      const d = Number(args.DIGIT) | 0;
      if (d < 0 || d > 7) return;
      this._segfb(args.PART)[d] = Number(args.SEGS) & 0xff;
    }

    seg_clear(args) {
      this._segfb(args.PART).fill(0);
    }

    _bank(part) {
      // The shadow byte, exactly the C's bw_<part>_shadow.
      if (!this._banks) this._banks = {};
      if (!(part in this._banks)) this._banks[part] = 0;
      return this._banks[part];
    }

    led_on(args) {
      const n = Number(args.N) | 0;
      if (n < 0 || n > 7) return;
      this._banks[args.PART] = this._bank(args.PART) | (1 << n);
    }

    led_off(args) {
      const n = Number(args.N) | 0;
      if (n < 0 || n > 7) return;
      this._banks[args.PART] = this._bank(args.PART) & ~(1 << n);
    }

    led_set(args) {
      this._bank(args.PART);
      this._banks[args.PART] = Number(args.VALUE) & 0xff;
    }

    led_only(args) {
      const n = Number(args.N) | 0;
      this._bank(args.PART);
      this._banks[args.PART] = n < 0 || n > 7 ? 0 : 1 << n;
    }

    tableindex(args) {
      const tbl = tableDecls(this.runtime).find((t) => t.name === args.TABLE);
      if (!tbl || !tbl.values) return 0;
      const i = Math.max(
        0,
        Math.min(Number(args.INDEX) | 0, tbl.values.length - 1)
      );
      return tbl.values[i];
    }
  }

  Scratch.extensions.register(new STC12(Scratch.vm && Scratch.vm.runtime));
})(Scratch);
