// The "set pin [PIN] pull [PULL]" block must apply the chosen pull.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load() {
  const calls = [];
  const runtime = {
    circuitBoard: {
      setPin: (...args) => calls.push(args),
    },
  };
  let extension;
  const source = fs.readFileSync(
    new URL("../extensions/CrispStrobe/microbitplus.js", import.meta.url),
    "utf8"
  );
  vm.runInContext(
    source,
    vm.createContext({
      console,
      Scratch: {
        vm: { runtime },
        Cast: { toNumber: (v) => Number(v) || 0 },
        extensions: { register: (e) => (extension = e) },
        BlockType: new Proxy({}, { get: (_, k) => String(k) }),
        ArgumentType: new Proxy({}, { get: (_, k) => String(k) }),
      },
    })
  );
  return { extension, calls };
}

test("setpull reads the declared PULL argument", () => {
  const { extension, calls } = load();
  const block = extension
    .getInfo()
    .blocks.find((b) => b && b.opcode === "setpull");
  assert.deepEqual(Object.keys(block.arguments), ["PIN", "PULL"]);
  extension.setpull({ PIN: "0", PULL: "up" });
  extension.setpull({ PIN: "1", PULL: "down" });
  extension.setpull({ PIN: "2", PULL: "none" });
  assert.deepEqual(calls, [
    ["p0", "input-pullup", true],
    ["p1", "input-pulldown", false],
    ["p2", "input", false],
  ]);
});
