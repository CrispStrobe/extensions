// Name: Bit operations
// ID: bitops
// Description: Bitwise AND, OR, XOR, NOT and shifts for hardware code.
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
  const int = (v) => Number(v) | 0;
  class BitOps {
    getInfo() {
      const num = (name) => ({
        [name]: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
      });
      const two = {
        NUM1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
        NUM2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
      };
      return {
        id: "bitops",
        name: "Bit operations",
        color1: "#8e44ad",
        blocks: [
          {
            opcode: "and",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM1] bitand [NUM2]",
            arguments: two,
          },
          {
            opcode: "or",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM1] bitor [NUM2]",
            arguments: two,
          },
          {
            opcode: "xor",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM1] bitxor [NUM2]",
            arguments: two,
          },
          {
            opcode: "not",
            blockType: Scratch.BlockType.REPORTER,
            text: "bitnot [NUM]",
            arguments: num("NUM"),
          },
          {
            opcode: "shl",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM1] shiftleft [NUM2]",
            arguments: two,
          },
          {
            opcode: "shr",
            blockType: Scratch.BlockType.REPORTER,
            text: "[NUM1] shiftright [NUM2]",
            arguments: two,
          },
        ],
      };
    }
    and(a) {
      return int(a.NUM1) & int(a.NUM2);
    }
    or(a) {
      return int(a.NUM1) | int(a.NUM2);
    }
    xor(a) {
      return int(a.NUM1) ^ int(a.NUM2);
    }
    not(a) {
      return ~int(a.NUM);
    }
    shl(a) {
      return int(a.NUM1) << int(a.NUM2);
    }
    shr(a) {
      return int(a.NUM1) >> int(a.NUM2);
    }
  }
  Scratch.extensions.register(new BitOps());
})(Scratch);
