// Name: LEGO RCX (NQC)
// ID: legorcx
// Description: LEGO MINDSTORMS RCX — build programs as blocks and generate NQC for the standard firmware.
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0
(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("RCX extension must run unsandboxed");
  }

  const Cast = Scratch.Cast;

  // ==========================================================================
  // WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT
  // ==========================================================================
  //
  // The RCX is the 1998 brick: a Hitachi H8/300, three inputs, three outputs,
  // and an infrared link that is the ONLY way in or out. Its standard firmware
  // runs bytecode, and NQC (Not Quite C) is the long-established language that
  // compiles to it.
  //
  // This extension GENERATES NQC. It does not compile it and it does not talk
  // to a brick. That is the same arrangement legonxt already ships for the NXT
  // — emit source, compile it elsewhere — and it is chosen here for a specific
  // reason rather than convenience: NQC source is readable, so what this
  // extension produces can be checked by reading it and by compiling it with
  // `nqc`. Infrared protocol bytes are neither readable nor checkable without
  // the hardware, and inventing them from memory is how you ship something
  // that looks finished and does nothing.
  //
  // UNITS, BECAUSE THEY ARE THE EASIEST THING TO GET SILENTLY WRONG
  //
  //   power     0..7 on the RCX, NOT a percentage. OUT_LOW is 1, OUT_HALF 3,
  //             OUT_FULL 7. A block offering 0-100 would be lying, so the
  //             blocks offer 0-7 and clamp.
  //   time      NQC's Wait() takes CENTISECONDS. Wait(100) is one second.
  //             Blocks take seconds and multiply, because a learner writing
  //             "wait 1" and getting 10ms is the same class of bug as a flat
  //             battery reading.
  //   tone      PlayTone(frequency Hz, duration in centiseconds).
  //
  // SENSOR TYPES are a SetSensor() call, not a property of the read. A sensor
  // read before its type is set returns whatever the port was last configured
  // as, so the transpiler emits the SetSensor calls it can infer at the top of
  // main() — see collectSensorSetup().

  // ==================== i18n ====================

  const translations = {
    en: {
      extensionName: "LEGO RCX (NQC)",
      programLabel: "Program",
      transpile: "generate NQC from this project",
      showCode: "show generated NQC",
      downloadCode: "download as .nqc file",
      compileAndDownload: "compile to .rcx and download",
      setCompilerUrl: "use compiler service at [URL]",
      setTarget: "compile for [TARGET]",
      lastError: "last compiler message",
      motorsLabel: "Motors",
      setPower: "set [PORTS] power to [POWER]",
      motorOn: "turn [PORTS] [DIR]",
      motorOff: "brake [PORTS]",
      motorFloat: "let [PORTS] coast",
      motorOnFor: "turn [PORTS] [DIR] for [SECONDS] s",
      sensorsLabel: "Sensors",
      setSensorType: "set sensor [PORT] to [TYPE]",
      sensorValue: "sensor [PORT]",
      touchPressed: "sensor [PORT] pressed?",
      clearSensor: "reset sensor [PORT]",
      soundLabel: "Sound",
      playTone: "play tone [FREQ] Hz for [SECONDS] s",
      playSound: "play sound [SOUND]",
      displayLabel: "Display and timers",
      setDisplay: "show [SOURCE] on the display",
      clearTimer: "reset timer [TIMER]",
      timerValue: "timer [TIMER] (s)",
      controlLabel: "Control",
      wait: "wait [SECONDS] s",
      startTask: "start task [NAME]",
      stopTask: "stop task [NAME]",
      messagesLabel: "Messages",
      sendMessage: "send IR message [N]",
      messageValue: "IR message",
      clearMessage: "clear IR message",
      dirForward: "forward",
      dirReverse: "reverse",
    },

    de: {
      extensionName: "LEGO RCX (NQC)",
      programLabel: "Programm",
      transpile: "NQC aus diesem Projekt erzeugen",
      showCode: "erzeugten NQC-Code anzeigen",
      downloadCode: "als .nqc-Datei herunterladen",
      compileAndDownload: "zu .rcx kompilieren und herunterladen",
      setCompilerUrl: "nutze Compiler-Dienst unter [URL]",
      setTarget: "kompiliere für [TARGET]",
      lastError: "letzte Compiler-Meldung",
      motorsLabel: "Motoren",
      setPower: "setze Leistung von [PORTS] auf [POWER]",
      motorOn: "drehe [PORTS] [DIR]",
      motorOff: "bremse [PORTS]",
      motorFloat: "lasse [PORTS] auslaufen",
      motorOnFor: "drehe [PORTS] [DIR] für [SECONDS] s",
      sensorsLabel: "Sensoren",
      setSensorType: "setze Sensor [PORT] auf [TYPE]",
      sensorValue: "Sensor [PORT]",
      touchPressed: "Sensor [PORT] gedrückt?",
      clearSensor: "setze Sensor [PORT] zurück",
      soundLabel: "Klang",
      playTone: "spiele Ton [FREQ] Hz für [SECONDS] s",
      playSound: "spiele Klang [SOUND]",
      displayLabel: "Anzeige und Timer",
      setDisplay: "zeige [SOURCE] auf der Anzeige",
      clearTimer: "setze Timer [TIMER] zurück",
      timerValue: "Timer [TIMER] (s)",
      controlLabel: "Steuerung",
      wait: "warte [SECONDS] s",
      startTask: "starte Task [NAME]",
      stopTask: "stoppe Task [NAME]",
      messagesLabel: "Nachrichten",
      sendMessage: "sende IR-Nachricht [N]",
      messageValue: "IR-Nachricht",
      clearMessage: "lösche IR-Nachricht",
      dirForward: "vorwärts",
      dirReverse: "rückwärts",
    },
  };

  function detectLanguage() {
    try {
      const fromVm =
        Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.getLocale
          ? Scratch.vm.runtime.getLocale()
          : null;
      const raw = fromVm || (navigator && navigator.language) || "en";
      return String(raw).toLowerCase().startsWith("de") ? "de" : "en";
    } catch (e) {
      return "en";
    }
  }

  const LOCALE = detectLanguage();

  function t(key) {
    const table = translations[LOCALE] || translations.en;
    return table[key] || translations.en[key] || key;
  }

  // ==================== RCX / NQC CONSTANTS ====================

  /** NQC output names. The RCX has exactly three, and NQC spells combinations. */
  const OUTPUTS = {
    A: "OUT_A",
    B: "OUT_B",
    C: "OUT_C",
    AB: "OUT_A + OUT_B",
    AC: "OUT_A + OUT_C",
    BC: "OUT_B + OUT_C",
    ABC: "OUT_A + OUT_B + OUT_C",
  };

  /** NQC sensor names, and the SetSensor() configuration for each type. */
  const SENSORS = { 1: "SENSOR_1", 2: "SENSOR_2", 3: "SENSOR_3" };

  const SENSOR_TYPES = {
    touch: "SENSOR_TOUCH",
    light: "SENSOR_LIGHT",
    rotation: "SENSOR_ROTATION",
    celsius: "SENSOR_CELSIUS",
    fahrenheit: "SENSOR_FAHRENHEIT",
    pulse: "SENSOR_PULSE",
    edge: "SENSOR_EDGE",
  };

  /** The six sounds the standard firmware has in ROM. */
  const SOUNDS = {
    click: "SOUND_CLICK",
    beep: "SOUND_DOUBLE_BEEP",
    down: "SOUND_DOWN",
    up: "SOUND_UP",
    low_beep: "SOUND_LOW_BEEP",
    fast_up: "SOUND_FAST_UP",
  };

  /** What the LCD can show. DISPLAY_USER needs SetUserDisplay(). */
  const DISPLAY_SOURCES = {
    watch: "DISPLAY_WATCH",
    sensor_1: "DISPLAY_SENSOR_1",
    sensor_2: "DISPLAY_SENSOR_2",
    sensor_3: "DISPLAY_SENSOR_3",
    out_a: "DISPLAY_OUT_A",
    out_b: "DISPLAY_OUT_B",
    out_c: "DISPLAY_OUT_C",
  };

  /**
   * Seconds -> centiseconds, which is what Wait() and PlayTone() take.
   * Clamped at 0 because a negative Wait is a hang on the brick, and rounded
   * because the firmware takes an integer.
   */
  const toCentiseconds = (seconds) =>
    Math.max(0, Math.round(Cast.toNumber(seconds) * 100));

  /**
   * Where NQC gets compiled.
   *
   * The same service the NXT and EV3 extensions already use
   * (CrispStrobe/legacy-lego-compiler): it runs the real NQC compiler and
   * returns the .rcx image. Overridable by a block, because a classroom
   * behind a filter may host its own, and because pinning a default URL that
   * cannot be changed is how an extension becomes useless the day a domain
   * moves.
   */
  const DEFAULT_COMPILER_URL = "https://lego-compiler.vercel.app/compile";

  /** NQC's brick targets. RCX2 is the RCX with firmware 2.0 — the common case. */
  const TARGETS = ["RCX2", "RCX", "CM", "Scout", "Spy", "Swan"];

  /** RCX motor power is 0..7, not a percentage. */
  const toPower = (value) =>
    Math.max(0, Math.min(7, Math.round(Cast.toNumber(value))));

  // ==========================================================================
  // NQC TRANSPILER
  // ==========================================================================

  class NQCTranspiler {
    constructor() {
      this.reset();
    }

    reset() {
      this.lines = [];
      this.indent = 0;
      this.sensorSetup = new Map(); // port -> NQC sensor type
      this.unsupported = []; // opcodes met that this emitter cannot express
      this.tasks = [];
    }

    line(text) {
      this.lines.push("    ".repeat(this.indent) + text);
    }

    open(text) {
      this.line(text);
      this.indent++;
    }

    close(text = "}") {
      this.indent = Math.max(0, this.indent - 1);
      this.line(text);
    }

    /**
     * A block this emitter does not know becomes a COMMENT in the output, and
     * is counted.
     *
     * The alternative — skipping it — produces NQC that compiles, runs, and
     * quietly does less than the blocks on screen say. That is the failure
     * this whole extension is meant to avoid: something that looks finished
     * and is not. A comment in the generated source is visible to the person
     * reading it, and the count is reported back through the extension so the
     * omission is visible without reading anything.
     */
    skip(opcode) {
      this.unsupported.push(opcode);
      this.line(`// [not transpiled] ${opcode}`);
    }

    /**
     * Read an input as an NQC expression.
     *
     * Handles the three shapes an sb3 input takes: a literal shadow, a
     * reporter block plugged in, and an empty slot. A reporter this emitter
     * knows becomes its NQC equivalent; anything else becomes 0 with the
     * opcode recorded, for the same reason as skip().
     */
    input(block, name, blocks, fallback = "0") {
      const slot = block.inputs && block.inputs[name];
      if (!slot) return fallback;

      const readShadow = (id) => {
        const shadow = blocks[id];
        if (!shadow) return null;
        const field =
          (shadow.fields && (shadow.fields.NUM || shadow.fields.TEXT)) || null;
        return field ? String(field.value) : null;
      };

      // A plugged-in reporter wins over the shadow behind it.
      if (slot.block && slot.block !== slot.shadow) {
        const inner = blocks[slot.block];
        if (inner) {
          const expr = this.reporter(inner, blocks);
          if (expr !== null) return expr;
          this.unsupported.push(inner.opcode);
          return fallback;
        }
      }
      const literal = readShadow(slot.shadow || slot.block);
      return literal === null ? fallback : literal;
    }

    field(block, name, fallback = "") {
      return block.fields && block.fields[name]
        ? String(block.fields[name].value)
        : fallback;
    }

    /** The reporters this emitter can express, as NQC expressions. */
    reporter(block, blocks) {
      switch (block.opcode) {
        case "legorcx_sensorValue":
          return SENSORS[this.field(block, "PORT", "1")] || "SENSOR_1";
        case "legorcx_timerValue":
          return `Timer(${Cast.toNumber(this.field(block, "TIMER", "0"))})`;
        case "legorcx_messageValue":
          return "Message()";
        case "operator_add":
          return `(${this.input(block, "NUM1", blocks)} + ${this.input(block, "NUM2", blocks)})`;
        case "operator_subtract":
          return `(${this.input(block, "NUM1", blocks)} - ${this.input(block, "NUM2", blocks)})`;
        case "operator_multiply":
          return `(${this.input(block, "NUM1", blocks)} * ${this.input(block, "NUM2", blocks)})`;
        case "operator_divide":
          return `(${this.input(block, "NUM1", blocks)} / ${this.input(block, "NUM2", blocks)})`;
        case "operator_lt":
          return `(${this.input(block, "OPERAND1", blocks)} < ${this.input(block, "OPERAND2", blocks)})`;
        case "operator_gt":
          return `(${this.input(block, "OPERAND1", blocks)} > ${this.input(block, "OPERAND2", blocks)})`;
        case "operator_equals":
          return `(${this.input(block, "OPERAND1", blocks)} == ${this.input(block, "OPERAND2", blocks)})`;
        case "operator_and":
          return `(${this.boolean(block, "OPERAND1", blocks)} && ${this.boolean(block, "OPERAND2", blocks)})`;
        case "operator_or":
          return `(${this.boolean(block, "OPERAND1", blocks)} || ${this.boolean(block, "OPERAND2", blocks)})`;
        case "operator_not":
          return `(!${this.boolean(block, "OPERAND", blocks)})`;
        case "legorcx_touchPressed":
          return `(${SENSORS[this.field(block, "PORT", "1")] || "SENSOR_1"} == 1)`;
        default:
          return null;
      }
    }

    /** A boolean slot, which in NQC is just an expression. */
    boolean(block, name, blocks) {
      const slot = block.inputs && block.inputs[name];
      if (!slot || !slot.block) return "true";
      const inner = blocks[slot.block];
      if (!inner) return "true";
      const expr = this.reporter(inner, blocks);
      if (expr !== null) return expr;
      this.unsupported.push(inner.opcode);
      return "true";
    }

    /** Walk a stack from `id`, emitting each block in order. */
    stack(id, blocks) {
      let current = id;
      let guard = 0;
      while (current && guard++ < 10000) {
        const block = blocks[current];
        if (!block) break;
        this.statement(block, blocks);
        current = block.next;
      }
    }

    substack(block, name, blocks) {
      const slot = block.inputs && block.inputs[name];
      if (slot && slot.block) this.stack(slot.block, blocks);
    }

    statement(block, blocks) {
      const op = block.opcode;
      switch (op) {
        // ---- motors ----
        case "legorcx_setPower":
          this.line(
            `SetPower(${this.ports(block)}, ${toPower(this.input(block, "POWER", blocks, "7"))});`
          );
          break;
        case "legorcx_motorOn":
          this.line(
            `${this.field(block, "DIR", "forward") === "reverse" ? "OnRev" : "OnFwd"}(${this.ports(block)});`
          );
          break;
        case "legorcx_motorOff":
          this.line(`Off(${this.ports(block)});`);
          break;
        case "legorcx_motorFloat":
          this.line(`Float(${this.ports(block)});`);
          break;
        case "legorcx_motorOnFor":
          this.line(
            `${this.field(block, "DIR", "forward") === "reverse" ? "OnRev" : "OnFwd"}(${this.ports(block)});`
          );
          this.line(
            `Wait(${toCentiseconds(this.input(block, "SECONDS", blocks, "1"))});`
          );
          this.line(`Off(${this.ports(block)});`);
          break;

        // ---- sensors ----
        case "legorcx_setSensorType": {
          const port = this.field(block, "PORT", "1");
          const type =
            SENSOR_TYPES[this.field(block, "TYPE", "touch")] || "SENSOR_TOUCH";
          this.sensorSetup.set(port, type);
          this.line(`SetSensor(${SENSORS[port] || "SENSOR_1"}, ${type});`);
          break;
        }
        case "legorcx_clearSensor":
          this.line(
            `ClearSensor(${SENSORS[this.field(block, "PORT", "1")] || "SENSOR_1"});`
          );
          break;

        // ---- sound ----
        case "legorcx_playTone":
          this.line(
            `PlayTone(${Math.round(Cast.toNumber(this.input(block, "FREQ", blocks, "440")))}, ` +
              `${toCentiseconds(this.input(block, "SECONDS", blocks, "0.5"))});`
          );
          break;
        case "legorcx_playSound":
          this.line(
            `PlaySound(${SOUNDS[this.field(block, "SOUND", "beep")] || "SOUND_DOUBLE_BEEP"});`
          );
          break;

        // ---- display and timers ----
        case "legorcx_setDisplay":
          this.line(
            `SelectDisplay(${DISPLAY_SOURCES[this.field(block, "SOURCE", "watch")] || "DISPLAY_WATCH"});`
          );
          break;
        case "legorcx_clearTimer":
          this.line(
            `ClearTimer(${Cast.toNumber(this.field(block, "TIMER", "0"))});`
          );
          break;

        // ---- messages ----
        case "legorcx_sendMessage":
          this.line(
            `SendMessage(${Math.round(Cast.toNumber(this.input(block, "N", blocks, "1")))});`
          );
          break;
        case "legorcx_clearMessage":
          this.line("ClearMessage();");
          break;

        // ---- control ----
        case "legorcx_wait":
        case "control_wait":
          this.line(
            `Wait(${toCentiseconds(this.input(block, op === "control_wait" ? "DURATION" : "SECONDS", blocks, "1"))});`
          );
          break;
        case "control_repeat":
          this.open(`repeat(${this.input(block, "TIMES", blocks, "10")}) {`);
          this.substack(block, "SUBSTACK", blocks);
          this.close();
          break;
        case "control_forever":
          this.open("while(true) {");
          this.substack(block, "SUBSTACK", blocks);
          this.close();
          break;
        case "control_if":
          this.open(`if (${this.boolean(block, "CONDITION", blocks)}) {`);
          this.substack(block, "SUBSTACK", blocks);
          this.close();
          break;
        case "control_if_else":
          this.open(`if (${this.boolean(block, "CONDITION", blocks)}) {`);
          this.substack(block, "SUBSTACK", blocks);
          this.close("} else {");
          this.indent++;
          this.substack(block, "SUBSTACK2", blocks);
          this.close();
          break;
        case "control_repeat_until":
          this.open(`until (${this.boolean(block, "CONDITION", blocks)}) {`);
          this.substack(block, "SUBSTACK", blocks);
          this.close();
          break;
        case "control_stop":
          this.line("StopAllTasks();");
          break;

        default:
          this.skip(op);
      }
    }

    ports(block) {
      return OUTPUTS[this.field(block, "PORTS", "A")] || "OUT_A";
    }

    /**
     * Sensor types are hoisted to the top of main().
     *
     * A sensor read before SetSensor() returns whatever the port was last
     * configured as — including from a PREVIOUS program, because the setting
     * lives in the brick. So every type this program sets anywhere is also
     * set once at the start, which makes the program's behaviour independent
     * of what ran before it.
     */
    hoistedSetup() {
      if (!this.sensorSetup.size) return [];
      const out = [
        "    // Sensor types, hoisted so the program does not depend on how the",
        "    // brick was left by whatever ran before it. Your own 'set sensor'",
        "    // blocks still appear below, where you placed them — a type change",
        "    // part-way through a program is a real thing to want.",
      ];
      for (const [port, type] of [...this.sensorSetup.entries()].sort()) {
        out.push(`    SetSensor(${SENSORS[port] || "SENSOR_1"}, ${type});`);
      }
      return out;
    }

    /** Transpile one target's scripts into a complete NQC program. */
    transpile(target) {
      this.reset();
      const blocks = (target && target.blocks && target.blocks._blocks) || {};
      const hats = Object.values(blocks).filter(
        (b) => b && b.opcode === "event_whenflagclicked" && b.topLevel
      );

      this.indent = 1;
      for (const hat of hats) this.stack(hat.next, blocks);
      const body = this.lines.slice();

      const header = [
        "// Generated from a BrickWright project for the LEGO RCX.",
        "// Compile with NQC:  nqc -d program.nqc",
        "//",
        "// Power is 0..7 (not a percentage) and Wait() is in centiseconds;",
        "// both are already converted here.",
        "",
        "task main() {",
      ];
      const setup = this.hoistedSetup();
      const footer = ["}"];
      const all = header.concat(setup, setup.length ? [""] : [], body, footer);
      return {
        code: all.join("\n"),
        unsupported: [...new Set(this.unsupported)],
        hats: hats.length,
      };
    }
  }

  // ==========================================================================
  // EXTENSION
  // ==========================================================================

  class LegoRCX {
    constructor(runtime) {
      this.runtime = runtime || (Scratch.vm && Scratch.vm.runtime) || null;
      this.transpiler = new NQCTranspiler();
      this.lastCode = "";
      this.lastUnsupported = [];
      this.compilerUrl = DEFAULT_COMPILER_URL;
      this.target = "RCX2";
      // NOT `this.lastError`: that would shadow the reporter method of the
      // same name and leave the block with nothing callable behind it.
      this.lastError_ = "";
    }

    getInfo() {
      const ports = {
        acceptReporters: true,
        items: ["A", "B", "C", "AB", "AC", "BC", "ABC"],
      };
      return {
        id: "legorcx",
        name: t("extensionName"),
        color1: "#C9002B",
        color2: "#A50023",
        color3: "#80001B",
        blocks: [
          { blockType: Scratch.BlockType.LABEL, text: t("programLabel") },
          {
            opcode: "transpile",
            blockType: Scratch.BlockType.COMMAND,
            text: t("transpile"),
          },
          {
            opcode: "showCode",
            blockType: Scratch.BlockType.COMMAND,
            text: t("showCode"),
          },
          {
            opcode: "downloadCode",
            blockType: Scratch.BlockType.COMMAND,
            text: t("downloadCode"),
          },
          {
            opcode: "compileAndDownload",
            blockType: Scratch.BlockType.COMMAND,
            text: t("compileAndDownload"),
          },
          {
            opcode: "setTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setTarget"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
                defaultValue: "RCX2",
              },
            },
          },
          {
            opcode: "setCompilerUrl",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setCompilerUrl"),
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: DEFAULT_COMPILER_URL,
              },
            },
          },
          {
            opcode: "lastError",
            blockType: Scratch.BlockType.REPORTER,
            text: t("lastError"),
          },

          { blockType: Scratch.BlockType.LABEL, text: t("motorsLabel") },
          {
            opcode: "setPower",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setPower"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "ports",
                defaultValue: "A",
              },
              POWER: { type: Scratch.ArgumentType.NUMBER, defaultValue: 7 },
            },
          },
          {
            opcode: "motorOn",
            blockType: Scratch.BlockType.COMMAND,
            text: t("motorOn"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "ports",
                defaultValue: "A",
              },
              DIR: {
                type: Scratch.ArgumentType.STRING,
                menu: "directions",
                defaultValue: "forward",
              },
            },
          },
          {
            opcode: "motorOnFor",
            blockType: Scratch.BlockType.COMMAND,
            text: t("motorOnFor"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "ports",
                defaultValue: "A",
              },
              DIR: {
                type: Scratch.ArgumentType.STRING,
                menu: "directions",
                defaultValue: "forward",
              },
              SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "motorOff",
            blockType: Scratch.BlockType.COMMAND,
            text: t("motorOff"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "ports",
                defaultValue: "A",
              },
            },
          },
          {
            opcode: "motorFloat",
            blockType: Scratch.BlockType.COMMAND,
            text: t("motorFloat"),
            arguments: {
              PORTS: {
                type: Scratch.ArgumentType.STRING,
                menu: "ports",
                defaultValue: "A",
              },
            },
          },

          { blockType: Scratch.BlockType.LABEL, text: t("sensorsLabel") },
          {
            opcode: "setSensorType",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setSensorType"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "sensorPorts",
                defaultValue: "1",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "sensorTypes",
                defaultValue: "touch",
              },
            },
          },
          {
            opcode: "sensorValue",
            blockType: Scratch.BlockType.REPORTER,
            text: t("sensorValue"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "sensorPorts",
                defaultValue: "1",
              },
            },
          },
          {
            opcode: "touchPressed",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("touchPressed"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "sensorPorts",
                defaultValue: "1",
              },
            },
          },
          {
            opcode: "clearSensor",
            blockType: Scratch.BlockType.COMMAND,
            text: t("clearSensor"),
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: "sensorPorts",
                defaultValue: "1",
              },
            },
          },

          { blockType: Scratch.BlockType.LABEL, text: t("soundLabel") },
          {
            opcode: "playTone",
            blockType: Scratch.BlockType.COMMAND,
            text: t("playTone"),
            arguments: {
              FREQ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 440 },
              SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5 },
            },
          },
          {
            opcode: "playSound",
            blockType: Scratch.BlockType.COMMAND,
            text: t("playSound"),
            arguments: {
              SOUND: {
                type: Scratch.ArgumentType.STRING,
                menu: "sounds",
                defaultValue: "beep",
              },
            },
          },

          { blockType: Scratch.BlockType.LABEL, text: t("displayLabel") },
          {
            opcode: "setDisplay",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setDisplay"),
            arguments: {
              SOURCE: {
                type: Scratch.ArgumentType.STRING,
                menu: "displaySources",
                defaultValue: "watch",
              },
            },
          },
          {
            opcode: "clearTimer",
            blockType: Scratch.BlockType.COMMAND,
            text: t("clearTimer"),
            arguments: {
              TIMER: {
                type: Scratch.ArgumentType.STRING,
                menu: "timers",
                defaultValue: "0",
              },
            },
          },
          {
            opcode: "timerValue",
            blockType: Scratch.BlockType.REPORTER,
            text: t("timerValue"),
            arguments: {
              TIMER: {
                type: Scratch.ArgumentType.STRING,
                menu: "timers",
                defaultValue: "0",
              },
            },
          },

          { blockType: Scratch.BlockType.LABEL, text: t("controlLabel") },
          {
            opcode: "wait",
            blockType: Scratch.BlockType.COMMAND,
            text: t("wait"),
            arguments: {
              SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },

          { blockType: Scratch.BlockType.LABEL, text: t("messagesLabel") },
          {
            opcode: "sendMessage",
            blockType: Scratch.BlockType.COMMAND,
            text: t("sendMessage"),
            arguments: {
              N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "messageValue",
            blockType: Scratch.BlockType.REPORTER,
            text: t("messageValue"),
          },
          {
            opcode: "clearMessage",
            blockType: Scratch.BlockType.COMMAND,
            text: t("clearMessage"),
          },
        ],

        menus: {
          ports,
          directions: {
            items: [
              { text: t("dirForward"), value: "forward" },
              { text: t("dirReverse"), value: "reverse" },
            ],
          },
          sensorPorts: { acceptReporters: true, items: ["1", "2", "3"] },
          sensorTypes: { items: Object.keys(SENSOR_TYPES) },
          sounds: { items: Object.keys(SOUNDS) },
          displaySources: { items: Object.keys(DISPLAY_SOURCES) },
          timers: { items: ["0", "1", "2", "3"] },
          targets: { items: TARGETS },
        },
      };
    }

    // ---- the program blocks -------------------------------------------------

    /**
     * Generate NQC from the project.
     *
     * The editing target is used rather than the stage, because that is the
     * sprite whose scripts the person is looking at.
     */
    transpile() {
      const target =
        this.runtime && this.runtime.getEditingTarget
          ? this.runtime.getEditingTarget()
          : null;
      if (!target) {
        this.lastCode = "// no editing target — open a sprite and try again";
        this.lastUnsupported = [];
        return;
      }
      const result = this.transpiler.transpile(target);
      this.lastCode = result.code;
      this.lastUnsupported = result.unsupported;
      return result.unsupported.length;
    }

    showCode() {
      if (!this.lastCode) this.transpile();
      const note = this.lastUnsupported.length
        ? `\n\n// ${this.lastUnsupported.length} block kind(s) were not transpiled:\n// ` +
          this.lastUnsupported.join(", ")
        : "";
      alert(this.lastCode + note);
    }

    setTarget(args) {
      const wanted = String(args.TARGET);
      // Validated rather than passed through: an unknown -T is a compiler
      // error the learner cannot read, and it reaches a subprocess argv on
      // the far side.
      this.target = TARGETS.indexOf(wanted) === -1 ? "RCX2" : wanted;
    }

    setCompilerUrl(args) {
      const url = String(args.URL || "").trim();
      this.compilerUrl = url || DEFAULT_COMPILER_URL;
    }

    lastError() {
      return this.lastError_ || "";
    }

    /**
     * Compile the generated NQC into a .rcx image and save it.
     *
     * The compiler is the same service the NXT and EV3 extensions use. It is
     * asked through Scratch.fetch so the host's own permission prompt governs
     * the request rather than this extension going around it.
     *
     * Every failure path sets `last compiler message` and returns, because the
     * alternative — a silent no-op — is indistinguishable from a program that
     * compiled to nothing, and this codebase has spent real effort removing
     * exactly that shape from its LEGO extensions.
     */
    /**
     * The local compiler, if the host has one.
     *
     * NQC is MPL-2.0, so unlike a GPL toolchain it can be shipped inside an
     * application. A host that has done so installs `runtime.nqcCompile`, and
     * compiling then needs no network at all — no service, no cold start, and
     * it works offline. Absent that, the service is used.
     *
     * Looked up at call time rather than cached, because a host may install it
     * lazily, after this extension has already loaded.
     */
    _localCompiler() {
      const runtime = this.runtime || (Scratch.vm && Scratch.vm.runtime);
      const fn = runtime && runtime.nqcCompile;
      return typeof fn === "function" ? fn.bind(runtime) : null;
    }

    async compileAndDownload() {
      if (!this.lastCode) this.transpile();
      this.lastError_ = "";

      const local = this._localCompiler();
      if (local) {
        try {
          const result = await local(this.lastCode, this.target);
          if (!result || !result.ok) {
            this.lastError_ = String(
              (result && result.log) || "compilation failed"
            );
            return;
          }
          const bytes =
            result.bytes instanceof Uint8Array
              ? result.bytes
              : new Uint8Array(result.bytes);
          if (!this._isRcxImage(bytes)) {
            this.lastError_ = `the local compiler returned ${bytes.length} bytes that are not an RCX image`;
            return;
          }
          this.save(bytes, "program.rcx", "application/octet-stream");
          this.lastError_ = `compiled ${bytes.length} bytes for ${this.target} (locally)`;
          return;
        } catch (error) {
          // Fall through to the service rather than failing outright: a broken
          // local compiler should not take away a working remote one.
          this.lastError_ = `local compiler failed (${error && error.message}); trying the service`;
        }
      }

      let response;
      try {
        response = await Scratch.fetch(this.compilerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: this.lastCode,
            compiler: "nqc",
            target: this.target,
          }),
        });
      } catch (error) {
        this.lastError_ = `could not reach the compiler at ${this.compilerUrl}: ${error && error.message}`;
        return;
      }
      if (!response || !response.ok) {
        this.lastError_ = `compiler returned HTTP ${response ? response.status : "(no response)"}`;
        return;
      }
      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        this.lastError_ = "compiler did not return JSON";
        return;
      }
      if (!payload.success) {
        // The compiler's own message, verbatim. It names the line and the
        // symbol, which is the only thing that helps.
        this.lastError_ = String(payload.error || "compilation failed");
        return;
      }
      const bytes = Uint8Array.from(atob(payload.base64), (c) =>
        c.charCodeAt(0)
      );
      if (!this._isRcxImage(bytes)) {
        this.lastError_ = `the service returned ${bytes.length} bytes that are not an RCX image`;
        return;
      }
      this.save(
        bytes,
        payload.filename || "program.rcx",
        "application/octet-stream"
      );
      this.lastError_ = `compiled ${bytes.length} bytes for ${this.target}`;
    }

    /**
     * A .rcx image begins with the ASCII magic RCXI.
     *
     * Checked on BOTH routes, because either could return the wrong thing with
     * every appearance of success — a proxy serving an error page with HTTP
     * 200, or a local compiler handing back an empty buffer. Saving those
     * produces a file the brick silently refuses, which is the hardest kind of
     * failure to trace back to its cause.
     */
    _isRcxImage(bytes) {
      return (
        bytes &&
        bytes.length >= 4 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x43 &&
        bytes[2] === 0x58 &&
        bytes[3] === 0x49
      );
    }

    save(data, filename, mime) {
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    downloadCode() {
      if (!this.lastCode) this.transpile();
      this.save(this.lastCode, "program.nqc", "text/plain");
    }

    // ---- the RCX blocks -----------------------------------------------------
    //
    // These exist to be TRANSPILED, and say so rather than pretending.
    //
    // There is no live connection: the RCX is reached only over infrared, and
    // this extension deliberately does not implement that link (see the header).
    // A block that silently did nothing would be indistinguishable from a
    // program that ran and had no effect, which is the exact defect this
    // codebase has spent a lot of effort removing from its LEGO extensions. So
    // each one returns a neutral value and the palette's own copy — "generate
    // NQC from this project" — is what tells you where the behaviour lives.

    setPower() {}
    motorOn() {}
    motorOnFor() {}
    motorOff() {}
    motorFloat() {}
    setSensorType() {}
    clearSensor() {}
    playTone() {}
    playSound() {}
    setDisplay() {}
    clearTimer() {}
    wait() {}
    sendMessage() {}
    clearMessage() {}

    sensorValue() {
      return 0;
    }

    touchPressed() {
      return false;
    }

    timerValue() {
      return 0;
    }

    messageValue() {
      return 0;
    }
  }

  Scratch.extensions.register(new LegoRCX(Scratch.vm && Scratch.vm.runtime));
})(Scratch);
