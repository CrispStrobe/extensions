// stc12 SEVENSEG8 `show number`: right-aligned, the minus sign directly before
// the most significant digit (Lite task B14, docs/OPEN-TASKS-2026-09-29.md).
//
//   node development/test-stc12-sevenseg.js
//
// MEASURED FIRST, at main a1dd6cb: `show number -42` showed "    - 42" -- the
// minus one digit too far left, with a blank between it and the 4 -- because
// after the digit loop `i` already indexed the free digit and the sign went
// to fb[i - 1]; a 7-digit negative (-1234567) lost its sign altogether. The
// compiled C (sb3-creator's / stc-compiler's bw_<part>_show_number) had the
// same loop and is fixed the same way upstream.
//
// The extension is driven from its real source in a node:vm context against a
// board that latches digits the way bw-board's sevenseg8 does on the Prechin
// A2 wiring (segments P0, 74HC138 select P2.2-P2.4): a digit takes the segment
// byte present when a NEW select address is seen on two consecutive updates.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "../extensions/CrispStrobe/stc12.js"),
  "utf8"
);

/** sevenseg8's latch rule (bw-board src/devices/a2-displays.js), per setPin. */
function a2Board() {
  const pins = Object.create(null);
  const st = { digits: new Array(8).fill(0), pending: 0, stable: 0 };
  const lvl = (p) => (pins[p] ? 1 : 0);
  return {
    st,
    setPin(name, mode, high) {
      pins[String(name)] = !!high;
      const sel = lvl("P2.2") | (lvl("P2.3") << 1) | (lvl("P2.4") << 2);
      let seg = 0;
      for (let i = 0; i < 8; i++) seg |= lvl("P0." + i) << i;
      if (sel === st.stable) return;
      if (sel !== st.pending) {
        st.pending = sel;
        return;
      }
      st.stable = sel;
      st.digits[sel] = seg;
    },
    readPin: () => 0,
  };
}

const FONT = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
const glyph = (b) =>
  b === 0 ? " " : b === 0x40 ? "-" : String(FONT.indexOf(b)).replace("-1", "?");

function loadStc12(runtime) {
  let ext = null;
  const Scratch = {
    BlockType: {
      COMMAND: "command",
      REPORTER: "reporter",
      BOOLEAN: "Boolean",
      HAT: "hat",
      EVENT: "event",
      LABEL: "label",
    },
    ArgumentType: { NUMBER: "number", STRING: "string", BOOLEAN: "Boolean" },
    Cast: {
      toNumber: (v) => (Number.isFinite(Number(v)) ? Number(v) : 0),
      toString: String,
      toBoolean: Boolean,
    },
    translate: Object.assign((m) => m, { setup() {} }),
    extensions: {
      unsandboxed: true,
      register: (instance) => {
        ext = instance;
      },
    },
    vm: { runtime },
  };
  vm.runInNewContext(source, { Scratch, console });
  if (!ext) throw new Error("stc12 did not register");
  return ext;
}

const pin = (port, bit) => ({ port, bit });
function show(n) {
  const b = a2Board();
  const runtime = {
    on() {},
    stc: {
      device: "stc89c52rc",
      pins: [],
      ports: [],
      tables: [],
      parts: [
        {
          name: "display",
          type: "sevenseg8",
          segPort: 0,
          selPins: [pin(2, 2), pin(2, 3), pin(2, 4)],
          claims: [],
          commonAnode: false,
        },
      ],
    },
    circuitBoard: b,
  };
  const ext = loadStc12(runtime);
  ext.seg_shownum({ NUM: n, PART: "display" });
  return {
    fb: ext._segfb("display").map(glyph).join(""),
    board: b.st.digits.map(glyph).join(""),
  };
}

const CASES = [
  [-42, "     -42"],
  [42, "      42"],
  [-7, "      -7"],
  [0, "       0"],
  [-1, "      -1"],
  [-32768, "  -32768"],
  [-1234567, "-1234567"],
  [12345678, "12345678"],
  // No digit left for the sign: the low eight digits, as before.
  [-12345678, "12345678"],
];

let failed = 0;
for (const [n, want] of CASES) {
  const got = show(n);
  try {
    assert.equal(got.fb, want, `frame buffer for ${n}`);
    assert.equal(got.board, want, `A2 display for ${n}`);
    console.log(`ok   show number ${n} -> "${got.board}"`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${e.message}: got fb "${got.fb}", board "${got.board}"`);
  }
}
if (failed) {
  console.log(`${failed} of ${CASES.length} failed`);
  process.exit(1);
}
console.log(`all ${CASES.length} passed`);
