/**
 * Protocol tests for extensions/CrispStrobe/circuitcubes.js.
 *
 * This repository has no test runner, so this is a standalone script:
 *
 *     node development/test-circuitcubes.js
 *
 * It loads the real extension file in a node vm with a stub `Scratch`, grabs
 * the registered instance, and exercises the pure command-encoding helpers it
 * hangs off `_protocol`. Nothing here touches Bluetooth: it checks the bytes
 * the extension would put on the wire, not that a cube accepts them.
 */

import fs from "node:fs";
import pathUtil from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const extensionPath = pathUtil.join(
  import.meta.dirname,
  "..",
  "extensions",
  "CrispStrobe",
  "circuitcubes.js"
);

const loadExtension = () => {
  let registered = null;
  const Scratch = {
    BlockType: {
      COMMAND: "command",
      REPORTER: "reporter",
      BOOLEAN: "Boolean",
    },
    ArgumentType: { STRING: "string", NUMBER: "number" },
    extensions: {
      register: (instance) => {
        registered = instance;
      },
    },
  };
  const context = vm.createContext({ Scratch, console });
  vm.runInContext(fs.readFileSync(extensionPath, "utf8"), context, {
    filename: extensionPath,
  });
  assert.ok(registered, "the extension did not register anything");
  return registered;
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const extension = loadExtension();
const P = extension._protocol;

test("the metadata header and getInfo() agree on the id", () => {
  const source = fs.readFileSync(extensionPath, "utf8");
  const headerId = /^\/\/ ID: (.+)$/m.exec(source)[1].trim();
  assert.equal(headerId, extension.getInfo().id);
});

test("the Nordic UART UUIDs are the ones the cube advertises", () => {
  assert.equal(P.NUS_SERVICE_UUID, "6e400001-b5a3-f393-e0a9-e50e24dcca9e");
  assert.equal(P.NUS_RX_UUID, "6e400002-b5a3-f393-e0a9-e50e24dcca9e");
  assert.equal(P.NUS_TX_UUID, "6e400003-b5a3-f393-e0a9-e50e24dcca9e");
  assert.equal(P.MTU, 20);
});

test("a command is sign, three digits and a channel letter", () => {
  assert.equal(P.encodeCommand("a", 123), "+123a");
  assert.equal(P.encodeCommand("b", -123), "-123b");
  assert.equal(P.encodeCommand("c", 255), "+255c");
  for (const channel of P.CHANNELS) {
    assert.match(P.encodeCommand(channel, 7), /^[+-]\d{3}[abc]$/);
    assert.equal(P.encodeCommand(channel, 7).length, 5);
  }
});

test("the magnitude is zero padded on both signs", () => {
  assert.equal(P.encodeCommand("a", 9), "+009a");
  assert.equal(P.encodeCommand("b", -9), "-009b");
  assert.equal(P.encodeCommand("a", 99), "+099a");
  assert.equal(P.encodeCommand("a", -99), "-099a");
  assert.equal(P.encodeCommand("a", 100), "+100a");
});

test("stopping a channel is +000, never -000", () => {
  assert.equal(P.encodeStop("a"), "+000a");
  assert.equal(P.encodeStop("b"), "+000b");
  assert.equal(P.encodeStop("c"), "+000c");
  assert.equal(P.encodeCommand("a", 0), "+000a");
  assert.equal(P.encodeCommand("a", -0), "+000a");
  // A speed that rounds to zero from below must not emit a minus sign either.
  assert.equal(P.encodeCommand("a", -0.4), "+000a");
});

test("speeds outside the wire range are clamped, not wrapped", () => {
  assert.equal(P.encodeCommand("a", 999), "+255a");
  assert.equal(P.encodeCommand("a", -999), "-255a");
  assert.equal(P.encodeCommand("a", Infinity), "+255a");
  assert.equal(P.encodeCommand("a", -Infinity), "-255a");
});

test("non-numeric speeds stop the channel instead of encoding NaN", () => {
  assert.equal(P.encodeCommand("a", NaN), "+000a");
  assert.equal(P.encodeCommand("a", "banana"), "+000a");
  assert.equal(P.encodeCommand("a", undefined), "+000a");
  // But a numeric string from a reporter block is still a speed.
  assert.equal(P.encodeCommand("a", "42"), "+042a");
});

test("fractional speeds are rounded to an integer", () => {
  assert.equal(P.encodeCommand("a", 12.4), "+012a");
  assert.equal(P.encodeCommand("a", 12.6), "+013a");
  assert.equal(P.encodeCommand("a", -12.6), "-013a");
});

test("channel names are case and whitespace insensitive", () => {
  assert.equal(P.encodeCommand("A", 1), "+001a");
  assert.equal(P.encodeCommand(" B ", 1), "+001b");
  assert.equal(P.normalizeChannel("C"), "c");
});

test("a bad channel is rejected rather than guessed at", () => {
  for (const bad of ["d", "", "ab", "1", null, undefined, {}]) {
    assert.throws(
      () => P.encodeCommand(bad, 100),
      /unknown channel/,
      `expected ${JSON.stringify(String(bad))} to be rejected`
    );
  }
});

test("block percentages map onto the 0..255 wire scale", () => {
  assert.equal(P.percentToSpeed(0), 0);
  assert.equal(P.percentToSpeed(100), 255);
  assert.equal(P.percentToSpeed(-100), -255);
  assert.equal(P.percentToSpeed(50), 128);
  assert.equal(P.percentToSpeed(-50), -128);
  // Out of range percentages clamp to full power.
  assert.equal(P.percentToSpeed(250), 255);
  assert.equal(P.percentToSpeed(-250), -255);
  // Junk stops rather than encoding NaN.
  assert.equal(P.percentToSpeed("banana"), 0);
  assert.equal(P.percentToSpeed(undefined), 0);
});

test("writes are chunked to the 20 byte MTU", () => {
  const one = P.chunkForWrite("+123a");
  assert.equal(one.length, 1);
  assert.deepEqual(Array.from(one[0]), [0x2b, 0x31, 0x32, 0x33, 0x61]);

  const five = P.chunkForWrite("+123a".repeat(5)); // 25 bytes
  assert.equal(five.length, 2);
  assert.equal(five[0].length, 20);
  assert.equal(five[1].length, 5);

  const exact = P.chunkForWrite("x".repeat(20));
  assert.equal(exact.length, 1);
  assert.equal(exact[0].length, 20);

  assert.equal(P.chunkForWrite("").length, 0);
});

test("the block set covers connect, drive and stop", () => {
  const info = extension.getInfo();
  const opcodes = info.blocks
    .filter((block) => typeof block === "object")
    .map((block) => block.opcode);
  for (const expected of [
    "connect",
    "disconnect",
    "isConnected",
    "setChannelPower",
    "stopChannel",
    "stopAll",
    "getChannelPower",
  ]) {
    assert.ok(opcodes.includes(expected), `missing block ${expected}`);
    assert.equal(
      typeof extension[expected],
      "function",
      `block ${expected} has no implementation`
    );
  }
  // The extension is loaded in a vm realm, so its arrays are not
  // reference-equal to ours; compare the values themselves.
  assert.equal(
    info.menus.CHANNEL.items.map((item) => item.value).join(","),
    "a,b,c"
  );
});

test("every block's text has an entry in all three locales", () => {
  const source = fs.readFileSync(extensionPath, "utf8");
  const locales = ["en", "de", "fr"];
  const keys = new Set(
    [...source.matchAll(/t\("(circuitcubes\.[a-zA-Z]+)"\)/g)].map(
      (match) => match[1]
    )
  );
  assert.ok(keys.size >= 7, "expected a key per block");
  for (const key of keys) {
    const defined = source.match(
      new RegExp(`"${key.replace(".", "\\.")}":`, "g")
    );
    assert.equal(
      defined ? defined.length : 0,
      locales.length,
      `${key} should be defined once per locale (${locales.join(", ")})`
    );
  }
});

test("the blocks drive the queue with the commands we expect", async () => {
  const written = [];
  const stubCharacteristic = {
    writeValue: (chunk) => {
      written.push(String.fromCharCode(...chunk));
      return Promise.resolve();
    },
  };
  extension.device = { gatt: { connected: true } };
  extension.rxCharacteristic = stubCharacteristic;
  extension.connected = true;

  await extension.setChannelPower({ CHANNEL: "A", POWER: 100 });
  await extension.setChannelPower({ CHANNEL: "b", POWER: -50 });
  assert.equal(extension.getChannelPower({ CHANNEL: "a" }), 100);
  assert.equal(extension.getChannelPower({ CHANNEL: "B" }), -50);

  await extension.stopChannel({ CHANNEL: "a" });
  assert.equal(extension.getChannelPower({ CHANNEL: "a" }), 0);

  await extension.stopAll();
  assert.deepEqual(written, [
    "+255a",
    "-128b",
    "+000a",
    "+000a",
    "+000b",
    "+000c",
  ]);
  assert.equal(written.length, 6);

  extension._reset();
  // With no cube attached, a block is a no-op rather than a crash.
  written.length = 0;
  await extension.setChannelPower({ CHANNEL: "a", POWER: 100 });
  assert.deepEqual(written, []);
  assert.equal(extension.isConnected(), false);
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(`     ${error.message.split("\n").join("\n     ")}`);
  }
}

console.log(`\n${tests.length - failures}/${tests.length} passed`);
process.exit(failures === 0 ? 0 : 1);
