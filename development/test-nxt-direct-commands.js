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
    btoa,
    atob,
    setTimeout: timeout,
    clearTimeout,
    setInterval: (fn, ms) => setInterval(fn, ms).unref(),
    clearInterval,
    Scratch: {
      vm: { runtime: new Runtime() },
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
  return { extension, socket, sent };
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

test("nxt bridge: replies read RotationCount 21-24 and the scaled value", async () => {
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

  const rotation = bridge.sendTelegram(0x06, [2], true);
  bridge.handleData(framed(outputStateReply(2)));
  // The bridge reports the angle within one turn: -98765 mod 360.
  assert.equal(await rotation, ((-98765 % 360) + 360) % 360);

  const sensor = bridge.sendTelegram(0x07, [0], true);
  bridge.handleData(framed(inputValuesReply(0)));
  assert.equal(await sensor, -42);
});
