// legoboostunified and legopoweredup against an in-memory Scratch Link peer
// that answers like an LWP3 hub ("LEGO Wireless Protocol 3.0.00").
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load = (name) =>
  fs.readFileSync(
    new URL(`../extensions/CrispStrobe/${name}`, import.meta.url),
    "utf8"
  );
const BOOST = load("legoboost_universal.js");
const PUP = load("lego_poweredup.js");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// LWP3 §3.8 Hub Attached I/O, event "Attached I/O": 15 bytes.
const attached = (port, type) => [
  15,
  0x00,
  0x04,
  port,
  0x01,
  type & 0xff,
  type >> 8,
  0,
  0,
  0,
  0x10,
  0,
  0,
  0,
  0x10,
];

// fwVersion is the int32 of LWP3 §3.5.6, e.g. 0x10000223 for 1.0.00.0223.
function setup(source, { devices, fwVersion = 0x10000224 }) {
  const writes = [];
  let extension;
  let socket;

  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      socket = this;
      setTimeout(() => this.onopen(), 0);
    }
    deliver(message) {
      this.onmessage({ data: JSON.stringify(message) });
    }
    notifyBytes(bytes) {
      this.deliver({
        jsonrpc: "2.0",
        method: "characteristicDidChange",
        params: { message: Buffer.from(bytes).toString("base64") },
      });
    }
    send(text) {
      const request = JSON.parse(text);
      const reply = () =>
        this.deliver({ jsonrpc: "2.0", id: request.id, result: null });
      if (request.method === "discover") {
        reply();
        this.deliver({
          jsonrpc: "2.0",
          method: "didDiscoverPeripheral",
          params: { peripheralId: "hub", name: "LEGO Hub" },
        });
      } else if (request.method === "startNotifications") {
        reply();
        setTimeout(() => {
          for (const [port, type] of devices) {
            this.notifyBytes(attached(port, type));
          }
        }, 0);
      } else if (request.method === "write") {
        const bytes = [...Buffer.from(request.params.message, "base64")];
        writes.push({ at: Date.now(), bytes });
        reply();
        // §3.5: Hub Property FW Version (0x03), Request Update (0x05)
        if (bytes[2] === 0x01 && bytes[3] === 0x03 && bytes[4] === 0x05) {
          const v = Buffer.alloc(4);
          v.writeInt32LE(fwVersion);
          setTimeout(
            () => this.notifyBytes([9, 0x00, 0x01, 0x03, 0x06, ...v]),
            0
          );
        }
      } else {
        reply();
      }
    }
    close() {
      this.onclose?.();
    }
  }

  const quiet = () => {};
  vm.runInNewContext(source, {
    console: Object.fromEntries(
      [
        "log",
        "info",
        "debug",
        "trace",
        "warn",
        "error",
        "group",
        "groupEnd",
      ].map((key) => [key, quiet])
    ),
    window: { addEventListener: quiet },
    btoa,
    atob,
    // The hub's keep-alive ping and scan timeouts must not keep the test
    // process alive once a test has finished.
    setTimeout: (fn, ms) => setTimeout(fn, ms).unref(),
    clearTimeout,
    setInterval: (fn, ms) => setInterval(fn, ms).unref(),
    clearInterval,
    WebSocket: FakeWebSocket,
    Scratch: {
      vm: {
        runtime: {
          on: quiet,
          emit: quiet,
          registerPeripheralExtension: quiet,
        },
      },
      extensions: {
        register(value) {
          extension = value;
        },
      },
      Cast: { toNumber: Number, toString: String },
      BlockType: {},
      ArgumentType: {},
    },
  });
  return {
    extension,
    writes,
    get socket() {
      return socket;
    },
    // Output commands (LWP3 §3.27, message type 0x81) written since `from`.
    outputs(from = 0) {
      return writes
        .slice(from)
        .map((w) => w.bytes)
        .filter((bytes) => bytes[2] === 0x81);
    },
  };
}

async function connect(f) {
  f.extension.setConnectionType({ TYPE: "scratchlink" });
  await f.extension.connect();
  await wait(100);
}

// Move Hub internal motors (IO type 0x27) on firmware 1.0.00.0223's ports.
const MOVE_HUB_OLD = [
  [0x37, 0x27],
  [0x38, 0x27],
];
const MOVE_HUB_NEW = [
  [0x00, 0x27],
  [0x01, 0x27],
];

test("boost: StartSpeed carries MaxPower = power + 10, not a flat 10 %", async () => {
  const f = setup(BOOST, { devices: MOVE_HUB_OLD, fwVersion: 0x10000223 });
  await connect(f);
  const from = f.writes.length;
  f.extension.setMotorPower({ MOTOR_ID: "A", POWER: 50 });
  await wait(60);
  await f.extension.motorOn({ MOTOR_ID: "A" });
  const [cmd] = f.outputs(from).filter((bytes) => bytes[5] === 0x07);
  assert.ok(cmd, "a StartSpeed was written");
  // §3.27.5 StartSpeed(Speed, MaxPower, UseProfile)
  assert.equal(cmd[3], 0x37);
  assert.equal(cmd[6], 50);
  assert.equal(cmd[7], 60);
  await f.extension.disconnect();
});

test("boost: an AB block reaches both motors, spaced by the rate limit", async () => {
  const f = setup(BOOST, { devices: MOVE_HUB_OLD, fwVersion: 0x10000223 });
  await connect(f);
  const from = f.writes.length;
  await f.extension.motorOn({ MOTOR_ID: "AB" });
  await wait(100);
  const starts = f
    .outputs(from)
    .filter((bytes) => bytes[5] === 0x07)
    .map((bytes) => bytes[3]);
  assert.deepEqual(starts, [0x37, 0x38]);
  await f.extension.disconnect();
});

test("boost: firmware 1.0.00.0224 and newer use ports 0 and 1", async () => {
  const f = setup(BOOST, { devices: MOVE_HUB_NEW, fwVersion: 0x10000224 });
  await connect(f);
  assert.equal(f.extension.getFirmwareVersion(), "1.0.00.0224");
  const from = f.writes.length;
  await f.extension.motorOn({ MOTOR_ID: "AB" });
  await wait(100);
  const starts = f
    .outputs(from)
    .filter((bytes) => bytes[5] === 0x07)
    .map((bytes) => bytes[3]);
  assert.deepEqual(starts, [0x00, 0x01]);
  await f.extension.disconnect();
});

test("boost: firmware 1.0.00.0223 uses ports 55 and 56", async () => {
  const f = setup(BOOST, { devices: MOVE_HUB_OLD, fwVersion: 0x10000223 });
  await connect(f);
  assert.equal(f.extension.getFirmwareVersion(), "1.0.00.0223");
  const from = f.writes.length;
  await f.extension.motorOn({ MOTOR_ID: "B" });
  assert.equal(f.outputs(from)[0][3], 0x38);
  await f.extension.disconnect();
});

test("boost: a stop discards queued motion for its port", async () => {
  const f = setup(BOOST, { devices: MOVE_HUB_NEW, fwVersion: 0x10000224 });
  await connect(f);
  await wait(60);
  const from = f.writes.length;
  f.extension.motorOn({ MOTOR_ID: "AB" });
  f.extension.motorOff({ MOTOR_ID: "B" });
  await wait(150);
  const sent = f.outputs(from).map((bytes) => [bytes[3], bytes[6]]);
  // A starts, B's queued start is replaced by its stop (speed 0).
  assert.deepEqual(sent, [
    [0x00, 50],
    [0x01, 0],
  ]);
  await f.extension.disconnect();
});

test("boost: float, brake and hold reach the hub as 0, 127 and 126", async () => {
  const f = setup(BOOST, { devices: MOVE_HUB_NEW, fwVersion: 0x10000224 });
  await connect(f);
  const sent = {};
  for (const action of ["brake", "hold", "float"]) {
    f.extension.setMotorStopAction({ MOTOR_ID: "A", ACTION: action });
    const from = f.writes.length;
    f.extension.motorOnForDegrees({ MOTOR_ID: "A", DEGREES: 90 });
    await wait(60);
    const [cmd] = f.outputs(from).filter((bytes) => bytes[5] === 0x0b);
    sent[action] = cmd[12];
  }
  assert.deepEqual(sent, { brake: 127, hold: 126, float: 0 });
  await f.extension.disconnect();
});

// Technic hub with two Control+ large motors (IO type 0x2e) on A and B.
const TECHNIC = [
  [0x00, 0x2e],
  [0x01, 0x2e],
];

test("poweredup: brake, hold and float are 127, 126 and 0", async () => {
  const f = setup(PUP, { devices: TECHNIC });
  await connect(f);
  const sent = {};
  for (const action of ["brake", "hold", "float"]) {
    f.extension.setMotorStopAction({ PORT: "A", ACTION: action });
    const from = f.writes.length;
    f.extension.motorOnForDegrees({ PORT: "A", DEGREES: 90 });
    await wait(60);
    const [cmd] = f.outputs(from).filter((bytes) => bytes[5] === 0x0b);
    // §3.27.9 StartSpeedForDegrees(Degrees int32, Speed, MaxPower, EndState, UseProfile)
    sent[action] = cmd[12];
  }
  assert.deepEqual(sent, { brake: 127, hold: 126, float: 0 });
  await f.extension.disconnect();
});

test("poweredup: two motor commands in one frame both reach the hub", async () => {
  const f = setup(PUP, { devices: TECHNIC });
  await connect(f);
  await wait(60);
  const from = f.writes.length;
  f.extension.motorOn({ PORT: "A" });
  f.extension.motorOn({ PORT: "B" });
  await wait(100);
  const written = f.writes.slice(from).filter((w) => w.bytes[2] === 0x81);
  assert.deepEqual(
    written.map((w) => w.bytes[3]),
    [0x00, 0x01]
  );
  assert.ok(written[1].at - written[0].at >= 45, "spaced by the rate limit");
  await f.extension.disconnect();
});

test("poweredup: the motors' Port Input Format Setup is not dropped on connect", async () => {
  const f = setup(PUP, { devices: TECHNIC });
  await connect(f);
  await wait(300);
  // §3.17 Port Input Format Setup (Single), message type 0x41
  const setups = f.writes
    .map((w) => w.bytes)
    .filter((bytes) => bytes[2] === 0x41)
    .map((bytes) => bytes[3]);
  assert.deepEqual([...new Set(setups)].sort(), [0x00, 0x01]);
  await f.extension.disconnect();
});
