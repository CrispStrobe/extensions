// ev3comprehensive over an in-memory Scratch Link (BT) peer: direct commands
// reach the brick and replies come back ("EV3 Communication Developer Kit",
// §4 System and Direct Commands).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../extensions/CrispStrobe/ev3_universal.js", import.meta.url),
  "utf8"
);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      this.onOpen();
    },
    close() {
      this.onClose();
    },
    // The brick's reply bytes, as Scratch Link forwards them.
    receive(bytes) {
      this.onMessage({
        jsonrpc: "2.0",
        method: "didReceiveMessage",
        params: { message: Buffer.from(bytes).toString("base64") },
      });
    },
    sendMessage(request) {
      const reply = () =>
        this.onMessage({ jsonrpc: "2.0", id: request.id, result: null });
      if (request.method === "discover") {
        reply();
        this.onMessage({
          jsonrpc: "2.0",
          method: "didDiscoverPeripheral",
          params: { peripheralId: "ev3", name: "EV3" },
        });
      } else if (request.method === "send") {
        sent.push([...Buffer.from(request.params.message, "base64")]);
        reply();
      } else {
        reply();
      }
    },
  };
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
    setTimeout,
    clearTimeout,
    setInterval: (fn, ms) => setInterval(fn, ms).unref(),
    clearInterval,
    Scratch: {
      vm: {
        runtime: {
          on: quiet,
          emit: quiet,
          getScratchLinkSocket: () => socket,
        },
      },
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
  await f.extension.ev3.setMode("scratchlink");
  await f.extension.ev3.connect();
  await wait(10);
  assert.equal(f.extension.isConnected(), true);
}

test("ev3: Scratch Link reports connected and a direct command is sent", async () => {
  const f = setup();
  await connect(f);
  f.extension.ev3.playTone(440, 100);
  await wait(10);
  assert.equal(f.sent.length, 1);
  const packet = f.sent[0];
  // §4: length (2 bytes LE), message counter (2 bytes LE), command type,
  // variable allocation, then the byte codes.
  assert.equal(packet[0] | (packet[1] << 8), packet.length - 2);
  assert.equal(packet[2] | (packet[3] << 8), 0);
  assert.equal(packet[4], 0x80); // DIRECT_COMMAND_NO_REPLY
  f.extension.ev3.playTone(440, 100);
  await wait(10);
  assert.equal(f.sent[1][2] | (f.sent[1][3] << 8), 1, "the counter counts");
  await f.extension.disconnect();
});

test("ev3: a reply split across two messages resolves its request", async () => {
  const f = setup();
  await connect(f);
  const value = f.extension.ev3.getSensor(0, 0, 0);
  await wait(10);
  const request = f.sent[0];
  assert.equal(request[4], 0x00); // DIRECT_COMMAND_REPLY
  const reply = Buffer.alloc(9);
  reply.writeUInt16LE(7, 0); // length
  reply[2] = request[2]; // message counter, echoed
  reply[3] = request[3];
  reply[4] = 0x02; // DIRECT_REPLY
  reply.writeFloatLE(42, 5); // the 4 global bytes READY_SI wrote
  f.socket.receive(reply.subarray(0, 4));
  f.socket.receive(reply.subarray(4));
  assert.equal(await value, 42);
  await f.extension.disconnect();
});

test("ev3: start motor at % power is opOUTPUT_POWER (unregulated), not OUTPUT_SPEED", async () => {
  const f = setup();
  await connect(f);
  await f.extension.motorStartPower({ PORT: "B", POWER: 50 });
  await wait(10);
  const packet = f.sent.at(-1);
  // After length, counter, type and the 2-byte allocation: the byte codes.
  // opOUTPUT_POWER 0xA4, layer 0, ports B (2), LC1 50; opOUTPUT_START 0xA6.
  assert.deepEqual(
    packet.slice(7),
    [0xa4, 0x00, 0x02, 0x81, 50, 0xa6, 0x00, 0x02]
  );
  await f.extension.motorStartPower({ PORT: "B", POWER: -140 });
  await wait(10);
  assert.deepEqual(f.sent.at(-1).slice(7, 12), [0xa4, 0x00, 0x02, 0x81, 0x9c]);
  await f.extension.disconnect();
});
