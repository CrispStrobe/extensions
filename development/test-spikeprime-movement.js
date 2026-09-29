// Movement blocks of the unified SPIKE extension (spikeprime), run against
// its real HubRouter with the hubs' send methods captured. No hardware: the
// "hub" here is a stub that reports counted motor positions the way the
// SPIKE 3 notification parser and the 2.x status stream store them.
//
//   node development/test-spikeprime-movement.js

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "../extensions/CrispStrobe/legospike_turbowarp_transpile.js"),
  "utf8"
);

const Cast = {
  toString: (v) => String(v),
  toNumber: (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  },
  toBoolean: (v) => Boolean(v),
};

function loadExtension() {
  let registered = null;
  const context = vm.createContext({
    Scratch: {
      extensions: {
        unsandboxed: true,
        register: (ext) => {
          registered = ext;
        },
      },
      ArgumentType: new Proxy({}, { get: (_t, k) => String(k) }),
      BlockType: new Proxy({}, { get: (_t, k) => String(k) }),
      Cast,
    },
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    TextEncoder,
    btoa,
    atob,
    Date,
    Promise,
  });
  vm.runInContext(source, context);
  assert.ok(registered, "extension registered");
  // The poll timers the tests need are the real ones; the hubs' own
  // background intervals were stubbed out above so the process can exit.
  context.setInterval = setInterval;
  context.clearInterval = clearInterval;
  return registered;
}

/** Capture what each hub is sent, in order. */
function captureSends(ext) {
  const sent = [];
  for (const hub of [ext._peripheral._repl, ext._peripheral._spike3]) {
    hub.sendPythonCommand = (code) => {
      sent.push(code);
      return Promise.resolve();
    };
  }
  return sent;
}

/** Whether a promise has settled by now, without waiting on it. */
async function settled(promise) {
  let done = false;
  promise.then(() => {
    done = true;
  });
  await new Promise((r) => setImmediate(r));
  return done;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// --- defect 2: the dialect's singular units reach MotorPair.move plural ----

test("singular units are sent plural", async () => {
  const ext = loadExtension();
  const sent = captureSends(ext);
  const cases = [
    ["rotation", "rotations"],
    ["degree", "degrees"],
    ["second", "seconds"],
    ["rotations", "rotations"],
    ["degrees", "degrees"],
  ];
  for (const [unit, plural] of cases) {
    sent.length = 0;
    // Tiny amounts so each wait is short (no readings: estimate + 0.5 s).
    const unitValue = unit.startsWith("second") ? 0.01 : 0.001;
    await ext.moveForward({
      DIRECTION: "forward",
      VALUE: unitValue,
      UNIT: unit,
    });
    assert.equal(sent.length, 1);
    assert.match(sent[0], new RegExp(`motors\\.move\\([^)]*'${plural}'`));
  }
});

test("cm and in are sent as rotations", async () => {
  const ext = loadExtension();
  const sent = captureSends(ext);
  const done = ext.moveForward({
    DIRECTION: "backward",
    VALUE: 17.6,
    UNIT: "cm",
  });
  assert.match(sent[0], /motors\.move\(-1, 'rotations', speed=75\)/);
  await done;
});

// --- defect 1: the block waits for the move to end --------------------------

test("waits for the counted position to advance by the wheel degrees", async () => {
  const ext = loadExtension();
  captureSends(ext);
  const positions = ext._peripheral._repl._sensors.motorPositions;
  positions.A = { relativePosition: 1000 };
  positions.B = { relativePosition: -50 };
  const started = Date.now();
  // 2 rotations = 720 wheel degrees; at speed 75 the fallback is > 4 s.
  const move = ext.moveForward({
    DIRECTION: "forward",
    VALUE: 2,
    UNIT: "rotations",
  });
  assert.equal(await settled(move), false, "returned while still moving");
  await sleep(100);
  // Halfway: still moving.
  positions.A = { relativePosition: 1360 };
  positions.B = { relativePosition: -410 };
  await sleep(100);
  assert.equal(await settled(move), false, "returned halfway");
  // Within a few degrees of the target on both wheels (B runs mirrored).
  positions.A = { relativePosition: 1718 };
  positions.B = { relativePosition: -768 };
  await move;
  const elapsed = Date.now() - started;
  assert.ok(
    elapsed < 1000,
    `resolved on arrival, not the fallback (${elapsed} ms)`
  );
});

test("SPIKE 2 status-stream positions (portValues) count too", async () => {
  const ext = loadExtension();
  captureSends(ext);
  const values = ext._peripheral._repl._portValues;
  values.A = { relativePosition: 0 };
  values.B = { relativePosition: 0 };
  const move = ext.moveForward({
    DIRECTION: "forward",
    VALUE: 90,
    UNIT: "degrees",
  });
  await sleep(60);
  assert.equal(await settled(move), false);
  values.A = { relativePosition: 90 };
  values.B = { relativePosition: -90 };
  const started = Date.now();
  await move;
  assert.ok(Date.now() - started < 200);
});

test("a hub that reports nothing continues after the time estimate", async () => {
  const ext = loadExtension();
  captureSends(ext);
  ext._peripheral.motorSettings.A.speed = 100;
  // 60 degrees at 100 % (600 deg/s) is 100 ms; + 0.5 s = 600 ms.
  const started = Date.now();
  const move = ext.moveForward({
    DIRECTION: "forward",
    VALUE: 60,
    UNIT: "degrees",
  });
  await sleep(450);
  assert.equal(await settled(move), false, "returned before the estimate");
  await move;
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 590 && elapsed < 1000, `fallback at ${elapsed} ms`);
});

test("seconds waits that long", async () => {
  const ext = loadExtension();
  captureSends(ext);
  const started = Date.now();
  const move = ext.moveForward({
    DIRECTION: "forward",
    VALUE: 0.3,
    UNIT: "second",
  });
  await sleep(200);
  assert.equal(await settled(move), false);
  await move;
  assert.ok(Date.now() - started >= 295);
});

// --- defect 3: the hub learns the pair; both fields agree -------------------

test("set movement motors sends MotorPair to the hub", async () => {
  const ext = loadExtension();
  const sent = captureSends(ext);
  await ext.setMovementMotors({ PORT_A: "c", PORT_B: "D" });
  assert.equal(sent.length, 1);
  assert.match(sent[0], /motors = MotorPair\('C', 'D'\)/);
  assert.match(sent[0], /from spike import MotorPair/);
  assert.match(sent[0], /from mindstorms import MotorPair/);
  assert.doesNotMatch(sent[0], /\n/, "one REPL line");
});

test("movement commands define motors on the hub when it is missing", async () => {
  const ext = loadExtension();
  const sent = captureSends(ext);
  await ext.stopMovement();
  await ext.steer({ STEERING: 20 });
  for (const line of sent) {
    assert.match(line, /^exec\("try:\\n motors\\nexcept NameError:\\n/);
    assert.match(line, /motors = MotorPair\('A', 'B'\)"\); motors\./);
    assert.doesNotMatch(line, /\n/, "one REPL line");
  }
});

test("the pair survives a route switch and both fields agree", async () => {
  const ext = loadExtension();
  const sent = captureSends(ext);
  const router = ext._peripheral;
  await ext.setMovementMotors({ PORT_A: "E", PORT_B: "F" });
  assert.deepEqual([...router.movementMotors], ["E", "F"]);
  assert.deepEqual([...router._movementMotors], ["E", "F"]);
  // AUTO settling on the SPIKE 3 route after the pair was set.
  router._activeProtocol = "spike3";
  assert.deepEqual([...router.movementMotors], ["E", "F"]);
  assert.deepEqual([...router._movementMotors], ["E", "F"]);
  sent.length = 0;
  await ext.motorPairMove({ STEERING: 0, SPEED: 50 });
  assert.match(sent[0], /hub\.port\.E\.motor.*hub\.port\.F\.motor/);
});

// The generated hub Python must be valid: run it through CPython with stub
// spike/mindstorms modules when python3 is on the machine.
test("the MotorPair line is valid Python (python3, when present)", async () => {
  const { spawnSync } = await import("node:child_process");
  const probe = spawnSync("python3", ["--version"]);
  if (probe.status !== 0) {
    console.log("  (python3 not found: this check did not run)");
    return;
  }
  const ext = loadExtension();
  const sent = captureSends(ext);
  await ext.stopMovement();
  await ext.setMovementMotors({ PORT_A: "C", PORT_B: "D" });
  const program = [
    "import sys, types",
    "m = types.ModuleType('mindstorms')",
    "class MotorPair:",
    "    def __init__(self, a, b): self.ports = (a, b)",
    "    def stop(self): print('stop', self.ports)",
    "m.MotorPair = MotorPair",
    "sys.modules['mindstorms'] = m",
    // A first command with no motors defined, then the explicit set.
    sent[0],
    sent[1],
    "print('pair', motors.ports)",
  ].join("\n");
  const run = spawnSync("python3", ["-c", program], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, "stop ('A', 'B')\npair ('C', 'D')\n");
});

test("a SPIKE 3 notification with a 3x3 matrix record keeps the records after it", () => {
  const ext = loadExtension();
  const hub = ext._peripheral._spike3;
  // Header (0x3c + size), a 3x3 matrix on port F, then a distance sensor on
  // port A reading 345 mm. Before the 0x0e case the parser stopped at the
  // matrix record, so every record after it was lost.
  const records = [
    0x0e,
    5,
    9,
    0,
    0,
    0,
    9,
    0,
    0,
    0,
    9,
    0x0d,
    0,
    345 & 0xff,
    345 >> 8,
  ];
  const data = Uint8Array.from([
    0x3c,
    records.length & 0xff,
    records.length >> 8,
    ...records,
  ]);
  hub._handleDeviceNotification(data);
  assert.equal(
    JSON.stringify(hub.portValues.F),
    JSON.stringify({ type: "matrix3", pixels: [9, 0, 0, 0, 9, 0, 0, 0, 9] })
  );
  assert.equal(hub.portValues.A.distance, 34.5);
});

test("two commands sent in the same millisecond both reach the hub, in order", async () => {
  const ext = loadExtension();
  const hub = ext._peripheral._spike3;
  const writes = [];
  hub._link = {
    isConnected: () => true,
    write: (_service, _char, base64) => {
      writes.push(Buffer.from(base64, "base64"));
      return Promise.resolve();
    },
  };
  // Back to back, as two blocks do when a busy browser fires two VM steps
  // within one rate-limit interval. The second used to be dropped silently.
  const first = hub.sendPythonCommand("motors.set_default_speed(30)");
  const second = hub.sendPythonCommand("motors.start(0, speed=30)");
  assert.equal(writes.length, 1, "the first goes at once");
  await Promise.all([first, second]);
  assert.equal(writes.length, 2, "the second is delayed, not lost");
  const text = writes.map((w) => w.toString("latin1"));
  assert.ok(text[0].length > 0 && text[1].length > 0);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed++;
    console.log(`not ok - ${name}\n  ${error.stack || error}`);
  }
}
console.log(`${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
