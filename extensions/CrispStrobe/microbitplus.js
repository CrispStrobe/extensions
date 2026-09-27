// Name: micro:bit+
// ID: microbitplus
// Description: A fuller micro:bit block set — display, sensors, pins, radio — for the MicroPython simulator.
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0

// Block text here is English-only, as it was in brickwright-lite where these
// extensions were written. Wrapping every string in Scratch.translate with no
// translations behind it would add the machinery and none of the benefit — the
// same judgement bitwise.js, fetch.js, cloudlink.js, gamejolt.js and
// steamworks.js already make in this gallery. Worth revisiting when there are
// translations to carry.
/* eslint-disable extension/should-translate */
(function (Scratch) {
  "use strict";

  // MakeCode's Note enum, member -> Hz (pxt-microbit 9.1.1 libs/core/music.ts).
  // Unsuffixed members are octave 4: Note.C is C4, 262 Hz.
  const MAKECODE_NOTES = {
    C: 262,
    CSharp: 277,
    D: 294,
    Eb: 311,
    E: 330,
    F: 349,
    FSharp: 370,
    G: 392,
    GSharp: 415,
    A: 440,
    Bb: 466,
    B: 494,
    C3: 131,
    CSharp3: 139,
    D3: 147,
    Eb3: 156,
    E3: 165,
    F3: 175,
    FSharp3: 185,
    G3: 196,
    GSharp3: 208,
    A3: 220,
    Bb3: 233,
    B3: 247,
    C4: 262,
    CSharp4: 277,
    D4: 294,
    Eb4: 311,
    E4: 330,
    F4: 349,
    FSharp4: 370,
    G4: 392,
    GSharp4: 415,
    A4: 440,
    Bb4: 466,
    B4: 494,
    C5: 523,
    CSharp5: 555,
    D5: 587,
    Eb5: 622,
    E5: 659,
    F5: 698,
    FSharp5: 740,
    G5: 784,
    GSharp5: 831,
    A5: 880,
    Bb5: 932,
    B5: 988,
  };
  // MakeCode's BeatFraction as a shift of one beat (music.beat).
  const BEAT_SHIFT = {
    whole: 0,
    half: 1,
    quarter: 2,
    eighth: 3,
    sixteenth: 4,
    double: -1,
    breve: -2,
  };
  // MakeCode's built-in Melodies (libs/core/melodies.ts).
  const MAKECODE_MELODIES = [
    "Dadadadum",
    "Entertainer",
    "Prelude",
    "Ode",
    "Nyan",
    "Ringtone",
    "Funk",
    "Blues",
    "Birthday",
    "Wedding",
    "Funeral",
    "Punchline",
    "Baddy",
    "Chase",
    "BaDing",
    "Wawawawaa",
    "JumpUp",
    "JumpDown",
    "PowerUp",
    "PowerDown",
  ];

  class MicrobitPlus {
    constructor(runtime) {
      this._runtime = runtime;
      // A new run is a new game: the score and lives start over on the
      // green flag, as they do when a MakeCode program starts.
      if (runtime && typeof runtime.on === "function") {
        runtime.on("PROJECT_START", () => {
          this._gameState = null;
          this._tempo = 120;
        });
      }
    }

    // ---- the circuit board, if one is open ---------------------------
    //
    // These blocks began as a VOCABULARY: something for the emitter to
    // lower to MicroPython or C, with empty methods because the code was
    // going to run on real hardware, not here. That left `set pin P0 to 1`
    // doing literally nothing in the editor, so a micro:bit program could
    // not light an LED in a Circuit even with the `microbit` part — which
    // has terminals p0/p1/p2/3v/gnd — sitting on the canvas.
    //
    // Read lazily per call, exactly as the circuit extension does: the
    // host rebuilds the Board whenever the netlist changes, so anything
    // captured once goes stale. No board simply means no circuit is open,
    // which is the ordinary case and not an error.
    get board() {
      const rt =
        this._runtime ||
        (typeof Scratch !== "undefined" && Scratch.vm
          ? Scratch.vm.runtime
          : null);
      return (rt && rt.circuitBoard) || null;
    }

    // The menu says '0'; the part's terminal is 'p0'. Accept either, and
    // whatever a reporter dropped in, so `set pin (chosen) to 1` works.
    _pinId(value) {
      const raw = String(value == null ? "" : value)
        .trim()
        .toLowerCase();
      return /^\d+$/.test(raw) ? "p" + raw : raw;
    }

    getInfo() {
      const str = (name, def) => ({
        [name]: { type: Scratch.ArgumentType.STRING, defaultValue: def || "" },
      });
      const n = (name, def) => ({
        [name]: {
          type: Scratch.ArgumentType.NUMBER,
          defaultValue: def == null ? 0 : def,
        },
      });
      return {
        id: "microbitplus",
        name: "micro:bit+",
        color1: "#00A3A3",
        color2: "#008F8F",
        color3: "#007D7D",
        blocks: [
          // ── Display ───────────────────────────────────────────────
          {
            opcode: "showmatrix",
            blockType: Scratch.BlockType.COMMAND,
            text: "show pattern [MATRIX]",
            arguments: {
              MATRIX: {
                type: Scratch.ArgumentType.MATRIX,
                defaultValue: "0101010101100010101000100",
              },
            },
          },
          // MakeCode's basic.showLeds and basic.showIcon: the same picture
          // as `show pattern`, then the pause each one makes (400 / 600 ms).
          {
            opcode: "showleds",
            blockType: Scratch.BlockType.COMMAND,
            text: "show leds [MATRIX]",
            arguments: {
              MATRIX: {
                type: Scratch.ArgumentType.MATRIX,
                defaultValue: "0101010101100010101000100",
              },
            },
          },
          {
            opcode: "showicon",
            blockType: Scratch.BlockType.COMMAND,
            text: "show icon [MATRIX]",
            arguments: {
              MATRIX: {
                type: Scratch.ArgumentType.MATRIX,
                defaultValue: "0101010101100010101000100",
              },
            },
          },
          {
            opcode: "showtext",
            blockType: Scratch.BlockType.COMMAND,
            text: "show text [TEXT]",
            arguments: str("TEXT", "Hi"),
          },
          {
            opcode: "scrolltext",
            blockType: Scratch.BlockType.COMMAND,
            text: "scroll text [TEXT] delay [MS] ms",
            arguments: { ...str("TEXT", "hello"), ...n("MS", 120) },
          },
          {
            opcode: "cleardisplay",
            blockType: Scratch.BlockType.COMMAND,
            text: "clear display",
          },
          {
            opcode: "plot",
            blockType: Scratch.BlockType.COMMAND,
            text: "plot x [X] y [Y] [STATE]",
            arguments: {
              ...n("X", 0),
              ...n("Y", 0),
              STATE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "on",
                menu: "onoff",
              },
            },
          },
          {
            opcode: "toggle",
            blockType: Scratch.BlockType.COMMAND,
            text: "toggle x [X] y [Y]",
            arguments: { ...n("X", 0), ...n("Y", 0) },
          },
          {
            opcode: "plotbargraph",
            blockType: Scratch.BlockType.COMMAND,
            text: "plot bar graph of [VALUE] up to [HIGH]",
            arguments: { ...n("VALUE", 0), ...n("HIGH", 0) },
          },
          {
            opcode: "setbrightness",
            blockType: Scratch.BlockType.COMMAND,
            text: "set display brightness to [BRIGHTNESS]",
            arguments: n("BRIGHTNESS", 255),
          },
          {
            opcode: "stopanimation",
            blockType: Scratch.BlockType.COMMAND,
            text: "stop animation",
          },

          // ── Buttons, logo, gestures (events) ─────────────────────
          "---",
          {
            opcode: "whenbutton",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when button [BTN] [BTNEVENT]",
            arguments: {
              BTN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "A",
                menu: "btn",
              },
              BTNEVENT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "pressed",
                menu: "btnEvent",
              },
            },
          },
          {
            opcode: "isbutton",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "button [BTN] pressed?",
            arguments: {
              BTN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "A",
                menu: "btn",
              },
            },
          },
          {
            opcode: "whenlogo",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when logo [LOGOEVENT]",
            arguments: {
              LOGOEVENT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "touched",
                menu: "logoEvent",
              },
            },
          },
          {
            opcode: "whengesture",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when [GESTURE]",
            arguments: {
              GESTURE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "shake",
                menu: "gesture",
              },
            },
          },
          {
            opcode: "isgesture",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[GESTURE] happening?",
            arguments: {
              GESTURE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "shake",
                menu: "gesture",
              },
            },
          },

          // ── Motion / orientation (reporters) ─────────────────────
          "---",
          {
            opcode: "accel",
            blockType: Scratch.BlockType.REPORTER,
            text: "acceleration [AXIS]",
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x",
                menu: "axis",
              },
            },
          },
          {
            opcode: "pitch",
            blockType: Scratch.BlockType.REPORTER,
            text: "pitch (°)",
          },
          {
            opcode: "roll",
            blockType: Scratch.BlockType.REPORTER,
            text: "roll (°)",
          },
          {
            opcode: "compass",
            blockType: Scratch.BlockType.REPORTER,
            text: "compass heading (°)",
          },
          {
            opcode: "magforce",
            blockType: Scratch.BlockType.REPORTER,
            text: "magnetic force [AXIS]",
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x",
                menu: "axis",
              },
            },
          },

          // ── Environment (reporters) ──────────────────────────────
          "---",
          {
            opcode: "light",
            blockType: Scratch.BlockType.REPORTER,
            text: "light level",
          },
          {
            opcode: "temp",
            blockType: Scratch.BlockType.REPORTER,
            text: "temperature (°C)",
          },
          {
            opcode: "sound",
            blockType: Scratch.BlockType.REPORTER,
            text: "sound level",
          },

          // ── Pins / GPIO ──────────────────────────────────────────
          "---",
          {
            opcode: "digitalwrite",
            blockType: Scratch.BlockType.COMMAND,
            text: "set pin [PIN] digital [LEVEL]",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
              LEVEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "1",
                menu: "digitalLevel",
              },
            },
          },
          {
            opcode: "digitalread",
            blockType: Scratch.BlockType.REPORTER,
            text: "pin [PIN] digital value",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
            },
          },
          {
            opcode: "ispinhigh",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "pin [PIN] is high?",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
            },
          },
          {
            opcode: "analogread",
            blockType: Scratch.BlockType.REPORTER,
            text: "analog value of pin [PIN]",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "analogIn",
              },
            },
          },
          {
            opcode: "analogwrite",
            blockType: Scratch.BlockType.COMMAND,
            text: "set pin [PIN] analog [PCT] %",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
              ...n("PCT", 50),
            },
          },
          {
            opcode: "setpull",
            blockType: Scratch.BlockType.COMMAND,
            text: "set pin [PIN] pull [PULL]",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
              PULL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "none",
                menu: "pull",
              },
            },
          },
          {
            opcode: "whentouch",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when pin [PIN] touched",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "analogIn",
              },
            },
          },
          {
            opcode: "istouch",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "pin [PIN] touched?",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "analogIn",
              },
            },
          },

          {
            opcode: "map",
            blockType: Scratch.BlockType.REPORTER,
            text: "map [VALUE] from low [FROMLOW] high [FROMHIGH] to low [TOLOW] high [TOHIGH]",
            arguments: {
              ...n("VALUE", 0),
              ...n("FROMLOW", 0),
              ...n("FROMHIGH", 1023),
              ...n("TOLOW", 0),
              ...n("TOHIGH", 4),
            },
          },

          // ── Actuators ────────────────────────────────────────────
          "---",
          {
            opcode: "playtone",
            blockType: Scratch.BlockType.COMMAND,
            text: "play tone [FREQ] Hz for [MS] ms",
            arguments: { ...n("FREQ", 440), ...n("MS", 500) },
          },
          {
            opcode: "playnote",
            blockType: Scratch.BlockType.COMMAND,
            text: "play note [NOTE]",
            arguments: {
              NOTE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "C4",
                menu: "note",
              },
            },
          },
          {
            opcode: "stoptone",
            blockType: Scratch.BlockType.COMMAND,
            text: "stop tone",
          },
          // MakeCode's music timing and melodies. A beat is 60000 / tempo ms
          // and its fractions shift it; a note's frequency is MakeCode's Note
          // enum, by member name, so `Note.FSharp5` round-trips as itself.
          {
            opcode: "rest",
            blockType: Scratch.BlockType.COMMAND,
            text: "rest for [MS] ms",
            arguments: n("MS", 500),
          },
          {
            opcode: "beat",
            blockType: Scratch.BlockType.REPORTER,
            text: "beat [FRACTION]",
            arguments: {
              FRACTION: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "whole",
                menu: "beatFraction",
              },
            },
          },
          {
            opcode: "notefreq",
            blockType: Scratch.BlockType.REPORTER,
            text: "frequency of note [NOTE]",
            arguments: {
              NOTE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "C",
                menu: "makecodeNote",
              },
            },
          },
          {
            opcode: "settempo",
            blockType: Scratch.BlockType.COMMAND,
            text: "set music tempo to [BPM]",
            arguments: n("BPM", 120),
          },
          {
            opcode: "changetempo",
            blockType: Scratch.BlockType.COMMAND,
            text: "change music tempo by [BPM]",
            arguments: n("BPM", 20),
          },
          {
            opcode: "tempo",
            blockType: Scratch.BlockType.REPORTER,
            text: "music tempo",
          },
          {
            opcode: "playmelody",
            blockType: Scratch.BlockType.COMMAND,
            text: "play melody [MELODY] [MODE]",
            arguments: {
              MELODY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Dadadadum",
                menu: "melody",
              },
              MODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "until done",
                menu: "playMode",
              },
            },
          },
          {
            opcode: "servo",
            blockType: Scratch.BlockType.COMMAND,
            text: "set pin [PIN] servo angle [DEG]",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
              ...n("DEG", 90),
            },
          },
          {
            opcode: "servocont",
            blockType: Scratch.BlockType.COMMAND,
            text: "set pin [PIN] continuous servo [SPD] %",
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0",
                menu: "gpio",
              },
              ...n("SPD", 0),
            },
          },

          // ── Game: score and lives (MakeCode's `game`) ───────────
          "---",
          {
            opcode: "addscore",
            blockType: Scratch.BlockType.COMMAND,
            text: "change game score by [POINTS]",
            arguments: n("POINTS", 1),
          },
          {
            opcode: "setscore",
            blockType: Scratch.BlockType.COMMAND,
            text: "set game score to [VALUE]",
            arguments: n("VALUE", 0),
          },
          {
            opcode: "score",
            blockType: Scratch.BlockType.REPORTER,
            text: "game score",
          },
          {
            opcode: "removelife",
            blockType: Scratch.BlockType.COMMAND,
            text: "remove game life [LIFE]",
            arguments: n("LIFE", 1),
          },
          {
            opcode: "gameover",
            blockType: Scratch.BlockType.COMMAND,
            text: "game over",
          },

          // ── Radio ────────────────────────────────────────────────
          "---",
          {
            opcode: "radioon",
            blockType: Scratch.BlockType.COMMAND,
            text: "turn radio on group [G] power [P]",
            arguments: { ...n("G", 0), ...n("P", 6) },
          },
          {
            opcode: "radiosendnum",
            blockType: Scratch.BlockType.COMMAND,
            text: "radio send number [N]",
            arguments: n("N", 0),
          },
          {
            opcode: "radiosendstr",
            blockType: Scratch.BlockType.COMMAND,
            text: "radio send text [S]",
            arguments: str("S", "hello"),
          },
          {
            opcode: "radiosendkv",
            blockType: Scratch.BlockType.COMMAND,
            text: "radio send [KEY] = [VALUE]",
            arguments: { ...str("KEY", "name"), ...n("VALUE", 0) },
          },
          {
            opcode: "whenradionum",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when radio receives a number",
          },
          {
            opcode: "radiolastnum",
            blockType: Scratch.BlockType.REPORTER,
            text: "last radio number",
          },
          {
            opcode: "whenradiostr",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when radio receives text",
          },
          {
            opcode: "radiolaststr",
            blockType: Scratch.BlockType.REPORTER,
            text: "last radio text",
          },

          // ── Connection ───────────────────────────────────────────
          "---",
          {
            opcode: "whenconn",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: "when micro:bit [CONNSTATE]",
            arguments: {
              CONNSTATE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "connected",
                menu: "connState",
              },
            },
          },
        ],
        menus: {
          onoff: { acceptReporters: true, items: ["on", "off"] },
          // AB is MakeCode's Button.AB: both held at once.
          btn: { acceptReporters: false, items: ["A", "B", "AB", "any"] },
          btnEvent: { acceptReporters: false, items: ["pressed", "released"] },
          logoEvent: { acceptReporters: false, items: ["touched", "released"] },
          gesture: {
            acceptReporters: false,
            items: [
              "shake",
              "tilt up",
              "tilt down",
              "tilt left",
              "tilt right",
              "face up",
              "face down",
              "freefall",
              "3g",
              "6g",
              "8g",
            ],
          },
          axis: { acceptReporters: false, items: ["x", "y", "z", "strength"] },
          gpio: {
            acceptReporters: true,
            items: ["0", "1", "2", "8", "12", "13", "14", "15", "16"],
          },
          analogIn: { acceptReporters: true, items: ["0", "1", "2"] },
          digitalLevel: { acceptReporters: true, items: ["0", "1"] },
          pull: { acceptReporters: false, items: ["none", "up", "down"] },
          note: {
            acceptReporters: false,
            items: [
              "C4",
              "D4",
              "E4",
              "F4",
              "G4",
              "A4",
              "B4",
              "C5",
              "D5",
              "E5",
              "F5",
              "G5",
              "A5",
              "B5",
            ],
          },
          beatFraction: {
            acceptReporters: false,
            items: [
              "whole",
              "half",
              "quarter",
              "eighth",
              "sixteenth",
              "double",
              "breve",
            ],
          },
          makecodeNote: {
            acceptReporters: false,
            items: Object.keys(MAKECODE_NOTES),
          },
          melody: {
            acceptReporters: false,
            items: MAKECODE_MELODIES,
          },
          playMode: {
            acceptReporters: false,
            items: ["until done", "in background", "looping in background"],
          },
          connState: {
            acceptReporters: false,
            items: ["connected", "disconnected"],
          },
        },
      };
    }

    // The MicroPython path renders these on the simulator; the Scratch VM stage
    // does not host a micro:bit, so these are no-ops here (parity with the stock
    // micro:bit extension when no device/sim is attached). Methods exist so saved
    // projects load and so the compiler's opcode table stays complete.
    // ── Display (no-op — sim renders via MicroPython) ───────────
    showmatrix() {}
    showleds() {}
    showicon() {}
    showtext() {}
    scrolltext() {}
    cleardisplay() {}
    plot() {}
    toggle() {}
    plotbargraph() {}
    setbrightness() {}
    stopanimation() {}

    // ── Events: buttons, logo, gestures ───────────────────────
    whenbutton() {
      return false;
    }
    isbutton() {
      return false;
    }
    whenlogo() {
      return false;
    }
    whengesture() {
      return false;
    }
    isgesture() {
      return false;
    }

    // ── Sensors: motion, environment ──────────────────────────
    accel() {
      return 0;
    }
    pitch() {
      return 0;
    }
    roll() {
      return 0;
    }
    compass() {
      return 0;
    }
    magforce() {
      return 0;
    }
    light() {
      return 0;
    }
    temp() {
      return 0;
    }
    sound() {
      return 0;
    }

    // ── Pins / GPIO ──────────────────────────────────────────
    digitalwrite(args) {
      const board = this.board;
      if (!board) return;
      board.setPin(
        this._pinId(args.PIN),
        "pushpull",
        String(args.LEVEL) === "1"
      );
    }

    digitalread(args) {
      const board = this.board;
      if (!board) return 0;
      // A pin being read is an input, and saying so matters: left as
      // whatever it was, the solver sees a terminal nothing declared.
      const pin = this._pinId(args.PIN);
      board.setPin(pin, "input", false);
      return Number(board.readPin(pin)) > 0 ? 1 : 0;
    }

    ispinhigh(args) {
      return this.digitalread(args) === 1;
    }

    analogread(args) {
      const board = this.board;
      if (!board) return 0;
      const pin = this._pinId(args.PIN);
      board.setPin(pin, "input", false);
      // The block reports the micro:bit's own 0..1023 and the board works
      // in volts against a 3.3 V rail, so the conversion belongs here —
      // leaking the simulator's units through a documented block range is
      // how a lesson's numbers stop matching its text.
      const volts = Number(
        board.readPinVoltage ? board.readPinVoltage(pin) : 0
      );
      if (!isFinite(volts)) return 0;
      return Math.max(0, Math.min(1023, Math.round((volts / 3.3) * 1023)));
    }

    analogwrite(args) {
      const board = this.board;
      if (!board) return;
      // There is no PWM in the solver: a duty cycle is a time average and
      // the board is solved per instant. So this drives high above half
      // and low below it — right at both ends of the range and wrong in
      // the middle, which is stated here rather than presented as dimming.
      const pct = Number(args.PCT);
      board.setPin(
        this._pinId(args.PIN),
        "pushpull",
        isFinite(pct) && pct >= 50
      );
    }

    setpull(args) {
      const board = this.board;
      if (!board) return;
      const mode =
        String(args.MODE) === "up"
          ? "input-pullup"
          : String(args.MODE) === "down"
            ? "input-pulldown"
            : "input";
      board.setPin(this._pinId(args.PIN), mode, mode === "input-pullup");
    }
    whentouch() {
      return false;
    }
    istouch() {
      return false;
    }

    // MakeCode's pins.map, as MakeCode computes it — pure arithmetic, so it
    // gives the same number here as on the board.
    map(args) {
      const v = Number(args.VALUE) || 0;
      const a = Number(args.FROMLOW) || 0;
      const b = Number(args.FROMHIGH) || 0;
      const c = Number(args.TOLOW) || 0;
      const d = Number(args.TOHIGH) || 0;
      return ((v - a) * (d - c)) / (b - a) + c;
    }

    // ── Actuators ────────────────────────────────────────────
    playtone() {}
    playnote() {}
    stoptone() {}
    rest() {}
    playmelody() {}

    // The timing is plain arithmetic, so it is kept here too: a beat reads
    // the same in the editor as on the board. As MakeCode's music.ts: 120 bpm
    // until set, a beat is Math.idiv(60000, bpm), and setTempo ignores a tempo
    // that is not above 0 and floors it at 1.
    _bpm() {
      return this._tempo > 0 ? this._tempo : 120;
    }
    beat(args) {
      const beat = Math.trunc(60000 / this._bpm());
      const shift = BEAT_SHIFT[String(args.FRACTION).toLowerCase()] || 0;
      return shift >= 0 ? beat >> shift : beat << -shift;
    }
    notefreq(args) {
      const want = String(args.NOTE).toLowerCase();
      const key = Object.keys(MAKECODE_NOTES).find(
        (k) => k.toLowerCase() === want
      );
      return key ? MAKECODE_NOTES[key] : 0;
    }
    settempo(args) {
      const bpm = Number(args.BPM);
      if (bpm > 0) this._tempo = Math.max(1, bpm);
    }
    changetempo(args) {
      const bpm = Number(args.BPM);
      if (!isNaN(bpm)) this.settempo({ BPM: this._bpm() + bpm });
    }
    tempo() {
      return this._bpm();
    }
    servo() {}
    servocont() {}

    // ── Game ─────────────────────────────────────────────────
    // The score and lives are plain numbers, so they are kept here too and a
    // program that counts can be watched in the editor. They start where
    // MakeCode's do (0 points, 3 lives) and clamp where its setScore/setLife
    // do. Game over itself is a display sequence, which the simulator draws.
    _game() {
      if (!this._gameState) this._gameState = { score: 0, life: 3 };
      return this._gameState;
    }
    addscore(args) {
      const g = this._game();
      g.score = Math.max(0, g.score + (Number(args.POINTS) || 0));
    }
    setscore(args) {
      this._game().score = Math.max(0, Number(args.VALUE) || 0);
    }
    score() {
      return this._game().score;
    }
    removelife(args) {
      const g = this._game();
      g.life = Math.max(0, g.life - (Number(args.LIFE) || 0));
    }
    gameover() {}

    // ── Radio ────────────────────────────────────────────────
    radioon() {}
    radiosendnum() {}
    radiosendstr() {}
    radiosendkv() {}
    whenradionum() {
      return false;
    }
    radiolastnum() {
      return 0;
    }
    whenradiostr() {
      return false;
    }
    radiolaststr() {
      return "";
    }

    // ── Connection ───────────────────────────────────────────
    whenconn() {
      return false;
    }
  }

  Scratch.extensions.register(
    new MicrobitPlus(Scratch.vm && Scratch.vm.runtime)
  );
})(Scratch);
