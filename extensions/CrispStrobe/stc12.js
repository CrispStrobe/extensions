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
    return (stc && Array.isArray(stc.pins)) ? stc.pins : [];
  }

  /** The board state this extension maintains, for whoever is watching. */
  function board(runtime) {
    if (!runtime._stc12Pins) runtime._stc12Pins = Object.create(null);
    return runtime._stc12Pins;
  }

  class STC12 {
    constructor(runtime) { this.runtime = runtime; }

    getInfo() {
      return {
        id: "stc12",
        name: "STC12 / 8051 pins",
        color1: "#3d7ea6",
        color2: "#2f6383",
        blocks: [
          {
            opcode: "setpin",
            blockType: Scratch.BlockType.COMMAND,
            text: "turn [STATE] [PIN]",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "states" },
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" }
            }
          },
          {
            opcode: "toggle",
            blockType: Scratch.BlockType.COMMAND,
            text: "toggle [PIN]",
            arguments: { PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" } }
          },
          {
            opcode: "writepin",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [PIN] to [VALUE]",
            arguments: {
              PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: "read",
            blockType: Scratch.BlockType.REPORTER,
            text: "read [PIN]",
            arguments: { PIN: { type: Scratch.ArgumentType.STRING, menu: "pins" } }
          }
        ],
        menus: {
          // acceptReporters:false is what makes these FIELDS rather than inputs,
          // which is how sb3-creator writes them.
          pins: { acceptReporters: false, items: "pinNames" },
          states: { acceptReporters: false, items: ["on", "off", "high", "low"] }
        }
      };
    }

    /** Declared pins, or a placeholder so the palette is never an empty dropdown. */
    pinNames() {
      const names = decls(this.runtime).map(p => p.name);
      return names.length ? names : [{ text: "(declare a PIN in the Code tab)", value: "" }];
    }

    setpin(args) {
      const pin = decls(this.runtime).find(p => p.name === args.PIN);
      const state = String(args.STATE);
      // ACTIVE LOW is the whole point of the declaration: "on" writes a 0.
      const level = state === "on" ? (pin && pin.activeLow ? 0 : 1)
        : state === "off" ? (pin && pin.activeLow ? 1 : 0)
          : state === "high" ? 1 : 0;
      board(this.runtime)[args.PIN] = level;
    }

    toggle(args) {
      const b = board(this.runtime);
      b[args.PIN] = b[args.PIN] ? 0 : 1;
    }

    writepin(args) {
      board(this.runtime)[args.PIN] = Number(args.VALUE) ? 1 : 0;
    }

    read(args) {
      const b = board(this.runtime);
      return Object.prototype.hasOwnProperty.call(b, args.PIN) ? b[args.PIN] : 0;
    }
  }

  Scratch.extensions.register(new STC12(Scratch.vm && Scratch.vm.runtime));
})(Scratch);
