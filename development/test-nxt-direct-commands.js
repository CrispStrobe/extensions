// legonxt over an in-memory Scratch Link (BT) peer and the bridge backend:
// GETOUTPUTSTATE / GETINPUTVALUES replies are read at the offsets of the
// LEGO MINDSTORMS NXT Bluetooth Developer Kit, Appendix 2 (direct commands).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL(
    "../extensions/CrispStrobe/legonxt_transpile_universal.js",
    import.meta.url
  ),
  "utf8"
);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GETOUTPUTSTATE reply telegram (without the 2-byte Bluetooth length):
// 0 0x02, 1 0x06, 2 status, 3 port, 4 power, 5 mode, 6 regulation, 7 turn
// ratio, 8 run state, 9-12 TachoLimit, 13-16 TachoCount, 17-20
// BlockTachoCount, 21-24 RotationCount.
function outputStateReply(port) {
  const reply = Buffer.alloc(25);
  reply[0] = 0x02;
  reply[1] = 0x06;
  reply[3] = port;
  reply.writeInt8(-75, 4);
  reply[5] = 0x07;
  reply[6] = 0x01;
  reply.writeInt8(-20, 7);
  reply[8] = 0x20;
  reply.writeUInt32LE(720, 9);
  reply.writeInt32LE(-1234, 13);
  reply.writeInt32LE(567, 17);
  reply.writeInt32LE(-98765, 21);
  return reply;
}

// GETINPUTVALUES reply: 3 port, 4 valid, 5 calibrated, 6 type, 7 mode,
// 8-9 raw, 10-11 normalized, 12-13 scaled, 14-15 calibrated value.
function inputValuesReply(port) {
  const reply = Buffer.alloc(16);
  reply[0] = 0x02;
  reply[1] = 0x07;
  reply[3] = port;
  reply[4] = 1;
  reply[6] = 0x05;
  reply[7] = 0x80;
  reply.writeUInt16LE(1000, 8);
  reply.writeUInt16LE(612, 10);
  reply.writeInt16LE(-42, 12);
  reply.writeInt16LE(612, 14); // the firmware copies the normalized value
  return reply;
}

function framed(telegram) {
  const out = Buffer.alloc(telegram.length + 2);
  out.writeUInt16LE(telegram.length, 0);
  telegram.copy(out, 2);
  return out;
}

function setup() {
  let extension;
  const sent = [];
  const socket = {
    setOnOpen(fn) {
      this.onOpen = fn;
    },
    setOnClose(fn) {
      this.onClose = fn;
    },
    setOnError(fn) {
      this.onError = fn;
    },
    setHandleMessage(fn) {
      this.onMessage = fn;
    },
    open() {
      this.isOpenNow = true;
      this.onOpen();
    },
    isOpen() {
      return Boolean(this.isOpenNow);
    },
    close() {
      this.isOpenNow = false;
      this.onClose();
    },
    receive(bytes) {
      this.onMessage({
        jsonrpc: "2.0",
        method: "didReceiveMessage",
        params: { message: Buffer.from(bytes).toString("base64") },
      });
    },
    // A minimal NXT: answers the reply-requested commands it knows.
    sendMessage(request) {
      const reply = () =>
        this.onMessage({ jsonrpc: "2.0", id: request.id, result: null });
      if (request.method === "send") {
        const packet = [...Buffer.from(request.params.message, "base64")];
        sent.push(packet);
        reply();
        const [type, opcode, port] = packet.slice(2);
        // The brick answers after the send has completed.
        const answer = (telegram) =>
          setTimeout(() => this.receive(framed(telegram)), 1);
        if (type === 0x01 && opcode === 0x88) {
          answer(Buffer.from([0x02, 0x88, 0, 0x7c, 1, 0x1c, 1]));
        } else if (type === 0x00 && opcode === 0x06) {
          answer(outputStateReply(port));
        } else if (type === 0x00 && opcode === 0x07) {
          answer(inputValuesReply(port));
        }
      } else {
        reply();
      }
    },
  };
  const quiet = () => {};
  class Runtime {
    on() {}
    emit() {}
    registerPeripheralExtension() {}
    getScratchLinkSocket() {
      return socket;
    }
  }
  // Short timers (the rate limiter's sleep) are part of the exchange and keep
  // the event loop alive; the multi-second request / discover timeouts only
  // guard a silent brick and must not hold the test process open.
  const timeout = (fn, ms) => {
    const timer = setTimeout(fn, ms);
    if (ms >= 1000) timer.unref();
    return timer;
  };
  const runtime = new Runtime();
  const alerts = [];
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
    window: {
      addEventListener: quiet,
      setTimeout: timeout,
      clearTimeout,
    },
    alert: (message) => alerts.push(message),
    btoa,
    atob,
    setTimeout: timeout,
    clearTimeout,
    setInterval: (fn, ms) => setInterval(fn, ms).unref(),
    clearInterval,
    Scratch: {
      vm: { runtime },
      extensions: {
        unsandboxed: true,
        register(value) {
          extension = value;
        },
      },
      Cast: { toNumber: Number, toString: String },
      BlockType: {},
      ArgumentType: {},
    },
  });
  return { extension, socket, sent, runtime, alerts };
}

async function connect(f) {
  f.extension.peripheral.scan();
  await f.extension.peripheral.connect("nxt");
  await wait(10);
  assert.equal(f.extension.peripheral.isConnected(), true);
}

test("nxt: GETOUTPUTSTATE fields come from their BDK offsets", async () => {
  const f = setup();
  await connect(f);
  const state = await f.extension.peripheral.getMotorPosition("B");
  assert.deepEqual(f.sent.at(-1), [3, 0, 0x00, 0x06, 1]);
  assert.equal(state.port, 1);
  assert.equal(state.power, -75);
  assert.equal(state.turn_ratio, -20);
  assert.equal(state.tacho_limit, 720);
  assert.equal(state.tacho_count, -1234);
  assert.equal(state.block_tacho_count, 567);
  assert.equal(state.rotation_count, -98765);
  assert.equal(
    await f.extension.getMotorRotationCount({ PORT: "B" }),
    -98765,
    "the rotation count reporter"
  );
});

test("nxt: GETINPUTVALUES fields come from their BDK offsets", async () => {
  const f = setup();
  await connect(f);
  const values = await f.extension.peripheral.getSensorValue("S3");
  assert.equal(values.port, 2);
  assert.equal(values.raw_value, 1000);
  assert.equal(values.normalized_value, 612);
  assert.equal(values.scaled_value, -42);
  assert.equal(values.calibrated_value, 612);
});

test("nxt bridge: replies resolve as the telegram, and the bookkeeping reads RotationCount 21-24 and the scaled value", async () => {
  const f = setup();
  const peripheral = f.extension.peripheral;
  peripheral.setConnectionMode("bridge");
  // The bridge backend is created on connect; no WebSocket exists here, so
  // the connect fails and leaves the backend to drive by hand.
  await peripheral.connect("ws://bridge.invalid").catch(() => {});
  const bridge = peripheral._bridgeBackend;
  assert.ok(bridge);
  bridge.connected = true;
  bridge.ws = { send() {} };

  // Every caller (getMotorPosition, getSensorValue, getFirmwareVersion, ...)
  // parses the reply telegram, as the serial and Scratch Link backends hand
  // it over, so the bridge resolves with the telegram too.
  const rotation = bridge.sendTelegram(0x06, [2], true);
  bridge.handleData(framed(outputStateReply(2)));
  assert.deepEqual(Array.from(await rotation), Array.from(outputStateReply(2)));
  // Its own record is the angle within one turn: -98765 mod 360.
  assert.equal(bridge.motors.C, ((-98765 % 360) + 360) % 360);

  const sensor = bridge.sendTelegram(0x07, [0], true);
  bridge.handleData(framed(inputValuesReply(0)));
  assert.deepEqual(Array.from(await sensor), Array.from(inputValuesReply(0)));
  assert.equal(bridge.sensors.S1, -42);
});

test("nxt bridge: the peripheral's own readers parse what the bridge resolves", async () => {
  const f = setup();
  const peripheral = f.extension.peripheral;
  peripheral.setConnectionMode("bridge");
  await peripheral.connect("ws://bridge.invalid").catch(() => {});
  const bridge = peripheral._bridgeBackend;
  bridge.connected = true;
  // A relay that answers GETOUTPUTSTATE / GETINPUTVALUES for the port asked.
  bridge.ws = {
    send(text) {
      const packet = Buffer.from(text, "base64");
      const [opcode, port] = [packet[3], packet[4]];
      const reply =
        opcode === 0x06 ? outputStateReply(port) : inputValuesReply(port);
      setTimeout(() => bridge.handleData(framed(reply)), 0);
    },
  };
  const state = await peripheral.getMotorPosition("B");
  assert.equal(state.tacho_count, -1234);
  assert.equal(state.rotation_count, -98765);
  const values = await peripheral.getSensorValue("S3");
  assert.equal(values.scaled_value, -42);
});

test("nxt: start motor at % power is SETOUTPUTSTATE unregulated (MOTORON|BRAKE, IDLE)", async () => {
  const f = setup();
  await connect(f);
  await f.extension.motorStartPower({ PORT: "B", POWER: -50 });
  await wait(10);
  // Appendix 2 SETOUTPUTSTATE (0x04, no reply 0x80): port, power (int8),
  // mode 0x03 (MOTORON | BRAKE, no REGULATED bit), regulation 0x00 (IDLE),
  // turn ratio, run state 0x20 (RUNNING), TachoLimit 0 (forever).
  assert.deepEqual(
    f.sent.at(-1).slice(2),
    [0x80, 0x04, 1, 0xce, 0x03, 0x00, 0, 0x20, 0, 0, 0, 0]
  );
});

// Pure byte/reply boundary controls. Real Lab guest coverage lives in Lite;
// these mocks never stand in for a simulated or physical brick run.
function strictPeer(answer) {
  const f = setup();
  const calls = [];
  const sleeps = [];
  f.extension.peripheral.sendTelegram = (op, data, ack, system) => {
    calls.push({ op, data: Array.from(data), ack, system: system === true });
    return Promise.resolve(answer(op, Array.from(data), calls.length));
  };
  f.extension.peripheral.sleep = (ms) => {
    sleeps.push(ms);
    return Promise.resolve();
  };
  return { ...f, calls, sleeps };
}
function mapReply(module, count, data = [], opcode = 0x94) {
  return [
    2,
    opcode,
    0,
    module & 255,
    (module >>> 8) & 255,
    (module >>> 16) & 255,
    (module >>> 24) & 255,
    count & 255,
    count >>> 8,
    ...data,
  ];
}

test("nxt IOMap: valid read/write retain unsigned identity and permit padding", async () => {
  const module = 0x80040001;
  const r = strictPeer((op) =>
    mapReply(module, 1, op === 0x94 ? [128, 0, 0] : [], op)
  );
  const value = await r.extension.peripheral.read_io_map(module, 32, 1);
  assert.equal(value.mod_id, module);
  assert.deepEqual(Array.from(value.data), [128]);
  const written = await r.extension.peripheral.write_io_map(
    module,
    32,
    new Uint8Array([128])
  );
  assert.equal(written.mod_id, module);
  assert.equal(written.size, 1);
  assert.deepEqual(r.calls[0], {
    op: 0x94,
    data: [1, 0, 4, 128, 32, 0, 1, 0],
    ack: true,
    system: true,
  });
  assert.deepEqual(r.calls[1], {
    op: 0x95,
    data: [1, 0, 4, 128, 32, 0, 1, 0, 128],
    ack: true,
    system: true,
  });
});

for (const opcode of [0x94, 0x95]) {
  test(`nxt IOMap ${opcode}: malformed replies never acquire module/data authority`, async () => {
    const valid = mapReply(0x40001, 1, opcode === 0x94 ? [128] : [], opcode);
    const wrong = [
      ...Array.from({ length: 9 }, (_, n) => valid.slice(0, n)),
      valid.map((v, i) => (i === 0 ? 0 : v)),
      valid.map((v, i) => (i === 1 ? 0x88 : v)),
      valid.map((v, i) => (i === 2 ? 0x90 : v)),
      valid.map((v, i) => (i === 3 ? 2 : v)),
      valid.map((v, i) => (i === 7 ? 2 : v)),
      valid.map((v, i) => (i === 6 ? NaN : v)),
    ];
    if (opcode === 0x94) wrong.push(valid.slice(0, 9));
    else wrong.push(mapReply(0x40001, 0, [], opcode));
    for (const reply of wrong) {
      const f = strictPeer(() => reply);
      const p = f.extension.peripheral;
      await assert.rejects(
        opcode === 0x94
          ? p.read_io_map(0x40001, 32, 1)
          : p.write_io_map(0x40001, 32, [128])
      );
    }
  });
}

test("nxt IOMap: invalid request integers/data are refused before a telegram", async () => {
  const f = strictPeer(() => {
    throw Error("must not send");
  });
  const p = f.extension.peripheral;
  for (const args of [
    [-1, 0, 1],
    [0x100000001, 0, 1],
    [NaN, 0, 1],
    [1, -1, 1],
    [1, 65536, 1],
    [1, 0, 1.5],
    [1, 0, 65536],
  ]) {
    await assert.rejects(p.read_io_map(...args));
  }
  for (const data of [[256], [-1], [NaN], [1.5], null])
    await assert.rejects(p.write_io_map(1, 0, data));
  assert.deepEqual(f.calls, []);
});

test("nxt sync: distinct ports receive acknowledged MOTOR_SYNC, preserving signed turn", async () => {
  const f = strictPeer(() => [2, 4, 0]);
  await f.extension.motorSync({
    FIRST: "B",
    SECOND: "C",
    POWER: 50,
    TURN: -25,
  });
  assert.deepEqual(
    f.calls,
    [1, 2].map((port) => ({
      op: 4,
      data: [port, 50, 7, 2, 231, 32, 0, 0, 0, 0],
      ack: true,
      system: false,
    }))
  );
});

test("nxt sync: invalid pairs/numbers send nothing, including duplicate ports", async () => {
  const f = strictPeer(() => [2, 4, 0]);
  for (const args of [
    { FIRST: "B", SECOND: "B", POWER: 50, TURN: 0 },
    { FIRST: "D", SECOND: "C", POWER: 50, TURN: 0 },
    { FIRST: "A", SECOND: "C", POWER: NaN, TURN: 0 },
    { FIRST: "A", SECOND: "C", POWER: 101, TURN: 0 },
    { FIRST: "A", SECOND: "C", POWER: 50, TURN: Infinity },
    { FIRST: "A", SECOND: "C", POWER: 50, TURN: -101 },
  ])
    await assert.rejects(f.extension.motorSync(args));
  assert.deepEqual(f.calls, []);
});

test("nxt sync: a rejected second configuration stops both ports and retains the primary error", async () => {
  const f = strictPeer((op, data, n) => (n === 2 ? [2, 4, 0xbd] : [2, 4, 0]));
  await assert.rejects(
    f.extension.motorSync({ FIRST: "A", SECOND: "C", POWER: 50, TURN: 0 }),
    (e) => {
      assert.match(e.message, /NXT sync failed/);
      assert.match(e.cause.message, /failed/);
      return true;
    }
  );
  assert.equal(f.calls.length, 4);
  // Existing motorStop uses BRAKE only (2), regulation IDLE (0).
  assert.deepEqual(
    f.calls.slice(2).map((c) => c.data.slice(0, 4)),
    [
      [0, 0, 2, 0],
      [2, 0, 2, 0],
    ]
  );
  assert.ok(f.calls.slice(2).every((c) => c.ack === false));
});

test("nxt button blocks read the stock Button state/release offsets and reject unknown names", async () => {
  const f = strictPeer((op, data) =>
    mapReply(0x40001, 1, [data[4] >= 32 ? 128 : 7])
  );
  for (const [name, index] of [
    ["exit", 0],
    ["right", 1],
    ["left", 2],
    ["enter", 3],
  ]) {
    assert.equal(await f.extension.buttonPressed({ BUTTON: name }), true);
    assert.equal(f.calls.at(-1).data[4], 32 + index);
    assert.equal(await f.extension.buttonReleaseCount({ BUTTON: name }), 7);
    assert.equal(f.calls.at(-1).data[4], 8 * index + 4);
  }
  const before = f.calls.length;
  await assert.rejects(f.extension.buttonPressed({ BUTTON: "constructor" }));
  assert.equal(f.calls.length, before);
  f.extension.peripheral.sendTelegram = () =>
    Promise.resolve(mapReply(0x40001, 0));
  await assert.rejects(
    f.extension.buttonPressed({ BUTTON: "enter" }),
    /Incomplete/
  );
});

test("nxt ultrasonic modes use standard low-speed configuration/register writes and wait for completion", async () => {
  for (const [mode, value] of [
    ["off", 0],
    ["single", 1],
    ["continuous", 2],
    ["listen", 3],
    ["reset", 4],
  ]) {
    const f = strictPeer((op) => (op === 14 ? [2, 14, 0, 0] : [2, op, 0]));
    await f.extension.setUltrasonicMode({ PORT: "S4", MODE: mode });
    assert.deepEqual(
      f.calls.map((c) => [c.op, c.data, c.ack]),
      [
        [5, [3, 11, 0], true],
        [15, [3, 3, 0, 2, 65, value], true],
        [14, [3], true],
      ]
    );
  }
});

test("nxt ultrasonic raw event read preserves a byte, not an invented Boolean or cached distance", async () => {
  let polls = 0;
  const f = strictPeer((op) =>
    op === 14
      ? [2, 14, ++polls === 1 ? 0x20 : 0, polls === 1 ? 0 : 1]
      : op === 16
        ? [2, 16, 0, 1, 203, ...Array(15).fill(0)]
        : [2, op, 0]
  );
  assert.equal(await f.extension.getUltrasonicEventByte({ PORT: "S2" }), 203);
  assert.deepEqual(f.calls[0].data, [1, 2, 1, 2, 66]);
  assert.deepEqual(f.sleeps, [10]);
  assert.deepEqual(
    f.calls.map((c) => c.op),
    [15, 14, 14, 16]
  );
});

test("nxt ultrasonic: invalid inputs, bus failures, malformed data and endless pending never become zero", async () => {
  const none = strictPeer(() => [2, 0, 0]);
  await assert.rejects(
    none.extension.setUltrasonicMode({ PORT: "A", MODE: "listen" })
  );
  await assert.rejects(
    none.extension.setUltrasonicMode({ PORT: "S1", MODE: "invented" })
  );
  assert.deepEqual(none.calls, []);
  const pending = strictPeer((op) =>
    op === 14 ? [2, 14, 0x20, 0] : [2, op, 0]
  );
  await assert.rejects(
    pending.extension.getUltrasonicEventByte({ PORT: "S1" }),
    /remained pending/
  );
  assert.equal(pending.calls.filter((c) => c.op === 14).length, 10);
  assert.equal(pending.sleeps.length, 9);
  assert.ok(pending.calls.every((c) => c.op !== 16));
  const valid = [2, 16, 0, 1, 203, ...Array(15).fill(0)];
  for (const reply of [
    valid.slice(0, 19),
    valid.map((v, i) => (i === 0 ? 0 : v)),
    valid.map((v, i) => (i === 1 ? 15 : v)),
    valid.map((v, i) => (i === 2 ? 0xdd : v)),
    valid.map((v, i) => (i === 3 ? 0 : v)),
    valid.map((v, i) => (i === 3 ? 2 : v)),
  ]) {
    const f = strictPeer((op) =>
      op === 14 ? [2, 14, 0, 1] : op === 16 ? reply : [2, op, 0]
    );
    await assert.rejects(f.extension.getUltrasonicEventByte({ PORT: "S1" }));
  }
});

test("nxt new live blocks expose fixed menus and callable public methods", () => {
  const { extension } = setup();
  const info = extension.getInfo();
  for (const opcode of [
    "motorSync",
    "buttonPressed",
    "buttonReleaseCount",
    "setUltrasonicMode",
    "getUltrasonicEventByte",
  ]) {
    assert.equal(
      info.blocks.filter((b) => b?.opcode === opcode).length,
      1,
      opcode
    );
    assert.equal(typeof extension[opcode], "function", opcode);
  }
  assert.deepEqual(Array.from(info.menus.BUTTON.items), [
    "exit",
    "right",
    "left",
    "enter",
  ]);
  assert.deepEqual(Array.from(info.menus.ULTRASONIC_MODE.items), [
    "off",
    "single",
    "continuous",
    "listen",
    "reset",
  ]);
});

test("nxt live-only blocks refuse NXC by name and invalidate stale source and bytecode", async () => {
  for (const opcode of [
    "motorSync",
    "buttonPressed",
    "buttonReleaseCount",
    "setUltrasonicMode",
    "getUltrasonicEventByte",
  ]) {
    for (const prefix of ["", "legonxt_"]) {
      const f = setup();
      f.runtime.targets = [
        { blocks: { _blocks: { test: { opcode: prefix + opcode } } } },
      ];
      assert.throws(
        () => f.extension.transpiler.transpileProject(),
        (error) =>
          error.code === "NXT_LIVE_ONLY" && error.message.includes(opcode)
      );
      for (const entry of ["transpileProject", "fullWorkflow"]) {
        f.extension.nxcCode = "old source";
        f.extension.rxeBase64 = "old binary";
        await f.extension[entry]({});
        assert.equal(f.extension.nxcCode, "");
        assert.equal(f.extension.rxeBase64, "");
        assert.match(
          f.alerts.at(-1),
          /live streaming only; NXC export is unsupported/
        );
        assert.deepEqual(f.sent, [], "refused before upload or start");
      }
    }
  }
});
