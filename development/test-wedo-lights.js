// Wire-level regression tests; no Bluetooth hardware required.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

async function setup() {
  let extension;
  let hub;
  const source = fs.readFileSync(
    new URL(
      "../extensions/CrispStrobe/lego_wedo2_universal.js",
      import.meta.url
    ),
    "utf8"
  );
  const writes = [];
  const errors = [];
  const runtime = {
    registerPeripheralExtension(id, instance) {
      hub = instance;
    },
    on() {},
  };
  const context = vm.createContext({
    console: {
      log() {},
      info() {},
      debug() {},
      warn() {},
      error(...args) {
        errors.push(args);
      },
      group() {},
      groupEnd() {},
    },
    setTimeout: (fn) => {
      fn();
      return 1;
    },
    clearTimeout() {},
    Scratch: {
      Cast: { toNumber: (value) => Number(value) || 0 },
      vm: { runtime },
      extensions: {
        register(e) {
          extension = e;
        },
      },
      BlockType: {
        COMMAND: "command",
        BOOLEAN: "Boolean",
        REPORTER: "reporter",
        HAT: "hat",
      },
      ArgumentType: { NUMBER: "number", STRING: "string" },
    },
  });
  vm.runInContext(source, context);
  extension._connectionType = "invalid-test-transport";
  // scan() is unnecessary: intercept hub registration before transport creation.
  const pending = extension.connect().catch(() => {});
  await pending;
  assert.ok(hub);
  hub._connection = {
    isConnected: () => true,
    send: (uuid, bytes) => {
      writes.push({ uuid, bytes: Array.from(bytes) });
      return Promise.resolve();
    },
  };
  extension._hub = hub;
  return { extension, hub, writes, pending, errors };
}

const packets = (writes) => writes.map((w) => w.bytes);

test("88005 A/B/ALL brightness uses raw light bytes, even when limiter denies every command", async () => {
  const { extension, hub, writes } = await setup();
  hub._handleAttachedIO([1, 1, 0, 8]);
  hub._handleAttachedIO([2, 1, 0, 8]);
  hub._rateLimiter.okayToSend = () => false;
  await extension.setLightBrightness({ PORT: "ALL", BRIGHTNESS: 25 });
  await extension.lightOff({ PORT: "B" });
  assert.deepEqual(packets(writes), [
    [1, 1, 1, 25],
    [2, 1, 1, 25],
    [2, 1, 1, 0],
  ]);
  assert.ok(
    writes.every((w) => w.uuid === "00001565-1212-efde-1523-785feabcd123")
  );
});

test("brightness clamps and rounds without applying the motor minimum", async () => {
  const { extension, writes } = await setup();
  for (const brightness of [1, -1, 999, 12.7, "50", NaN]) {
    await extension.setLightBrightness({ PORT: "A", BRIGHTNESS: brightness });
  }
  assert.deepEqual(
    packets(writes).map((p) => p[3]),
    [1, 0, 100, 13, 50, 0]
  );
});

test("known motors and sensors cannot be driven as lights; light cannot be driven as motor", async () => {
  const { extension, hub, writes } = await setup();
  for (const type of [1, 34, 35, 23, 99]) {
    hub._handleAttachedIO([1, 1, 0, type]);
    await extension.setLightBrightness({ PORT: "A", BRIGHTNESS: 100 });
    assert.equal(hub.getLight(1), null);
  }
  // Sensor setup writes configuration, never light power.
  assert.ok(
    writes.every((w) => w.uuid !== "00001565-1212-efde-1523-785feabcd123")
  );
  hub._handleAttachedIO([1, 1, 0, 8]);
  assert.equal(hub.getMotor(1), null);
  assert.equal(hub.getLight(6), null);
});

test("unannounced ports work, later announcements win, and stop-all switches off both lights", async () => {
  const { extension, hub, writes } = await setup();
  await extension.setLightBrightness({ PORT: "ALL", BRIGHTNESS: 100 });
  await hub.stopAll();
  assert.deepEqual(packets(writes), [
    [1, 1, 1, 100],
    [2, 1, 1, 100],
    [1, 1, 1, 0],
    [2, 1, 1, 0],
  ]);
  hub._handleAttachedIO([1, 0]);
  hub._handleAttachedIO([1, 1, 0, 1]);
  assert.equal(hub.getLight(1), null);
});

test("disconnected and invalid port commands send nothing", async () => {
  const { extension, hub, writes } = await setup();
  await extension.setLightBrightness({ PORT: "6", BRIGHTNESS: 100 });
  hub._connection.isConnected = () => false;
  await extension.lightOff({ PORT: "ALL" });
  assert.deepEqual(writes, []);
});

test("note A4 reaches the piezo at 440 Hz for 500 ms despite exhausted limiter", async () => {
  const { extension, hub, writes } = await setup();
  hub._rateLimiter.okayToSend = () => false;
  await extension.playNote({ NOTE: 69, DURATION: 0.5 });
  assert.deepEqual(packets(writes), [[5, 2, 4, 0xb8, 1, 0xf4, 1]]);
});

test("long and high notes clamp instead of wrapping; nonpositive durations send nothing", async () => {
  const { extension, writes } = await setup();
  await extension.playNote({ NOTE: 127, DURATION: 100 });
  await extension.playNote({ NOTE: 69, DURATION: -1 });
  await extension.playNote({ NOTE: 69, DURATION: "invalid" });
  assert.deepEqual(packets(writes), [[5, 2, 4, 0xdc, 5, 0xff, 0xff]]);
});

test("note block exposes Bluetooth write failure instead of silently waiting", async () => {
  const { extension, hub } = await setup();
  hub._connection.send = () => Promise.reject(new Error("write failed"));
  await assert.rejects(
    extension.playNote({ NOTE: 69, DURATION: 1 }),
    /write failed/
  );
});

test("clone light witnessed on protocol port 2: negative full power, dimming and off", async () => {
  const { extension, writes } = await setup();
  await extension.setLightBrightness({
    PORT: "B",
    BRIGHTNESS: 100,
    POLARITY: "reversed",
  });
  await extension.setLightBrightness({
    PORT: "B",
    BRIGHTNESS: 50,
    POLARITY: "reversed",
  });
  await extension.lightOff({ PORT: "B" });
  assert.deepEqual(packets(writes), [
    [2, 1, 1, 0x9c],
    [2, 1, 1, 0xce],
    [2, 1, 1, 0],
  ]);
  const block = extension
    .getInfo()
    .blocks.find((b) => b.opcode === "setLightBrightness");
  assert.equal(block.arguments.POLARITY.defaultValue, "normal");
  assert.equal(block.arguments.POLARITY.menu, "lightPolarity");
});

test("unannounced motor/light guesses do not permanently lock the port type", async () => {
  const { extension, hub, writes } = await setup();
  assert.ok(hub.getMotor(2));
  await extension.setLightBrightness({
    PORT: "B",
    BRIGHTNESS: 100,
    POLARITY: "reversed",
  });
  assert.deepEqual(packets(writes), [[2, 1, 1, 0x9c]]);
  assert.ok(hub.getMotor(2));
  // A real attachment announcement still takes precedence over guesses.
  hub._handleAttachedIO([2, 1, 0, 1]);
  await extension.setLightBrightness({
    PORT: "B",
    BRIGHTNESS: 100,
    POLARITY: "reversed",
  });
  assert.equal(writes.length, 1);
});

test("reversed BOTH clamps brightness and Stop All switches off every light", async () => {
  const { extension, hub, writes } = await setup();
  hub._rateLimiter.okayToSend = () => false;
  await extension.setLightBrightness({
    PORT: "ALL",
    BRIGHTNESS: 999,
    POLARITY: "reversed",
  });
  await hub.stopAll();
  await extension.setLightBrightness({
    PORT: "B",
    BRIGHTNESS: -1,
    POLARITY: "reversed",
  });
  assert.deepEqual(packets(writes), [
    [1, 1, 1, 156],
    [2, 1, 1, 156],
    [1, 1, 1, 0],
    [2, 1, 1, 0],
    [2, 1, 1, 0],
  ]);
});

test("send preserves successful provider promise and exact command bytes", async () => {
  const { hub, errors } = await setup();
  const before = errors.length;
  const value = { written: true };
  const pending = Promise.resolve(value);
  const bytes = Uint8Array.from([1, 1, 1, 127]);
  let calls = 0;
  hub._connection.send = (characteristic, data) => {
    calls++;
    assert.equal(characteristic, "output");
    assert.equal(data, bytes);
    return pending;
  };
  assert.equal(hub.send("output", bytes, false), pending);
  assert.equal(await pending, value);
  assert.equal(calls, 1);
  assert.equal(errors.length, before);
});

test("awaited rejected send retains original promise and error and reports failure", async () => {
  const { hub, errors } = await setup();
  const failure = new Error("closed transport");
  const pending = Promise.reject(failure);
  hub._connection.send = () => pending;
  const result = hub.send("output", Uint8Array.from([1, 1, 1, 127]), false);
  assert.equal(result, pending);
  await assert.rejects(result, (error) => error === failure);
  assert.ok(errors.some((args) => args.includes(failure)));
});

test("fire-and-forget stop reports both brake and float failures without unhandled rejection", async () => {
  const { hub, errors } = await setup();
  const motor = hub.getMotor(1);
  const failure = new Error("retired radio connection");
  const packets = [];
  hub._connection.send = (_characteristic, bytes) => {
    packets.push(Array.from(bytes));
    return Promise.reject(failure);
  };
  void hub.stopAll();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(packets, [
    [1, 1, 1, 127],
    [1, 1, 1, 0],
  ]);
  assert.equal(errors.filter((args) => args.includes(failure)).length, 2);
  assert.ok(motor);
});

test("throttled command stays dropped while stop bypass still reaches the provider", async () => {
  const { hub, writes } = await setup();
  hub._rateLimiter.okayToSend = () => false;
  await hub.send("output", Uint8Array.from([1, 1, 1, 100]));
  assert.equal(writes.length, 0);
  await hub.send("output", Uint8Array.from([1, 1, 1, 127]), false);
  assert.deepEqual(
    writes.map((entry) => entry.bytes),
    [[1, 1, 1, 127]]
  );
});

test("synchronous provider failure keeps its original thrown error", async () => {
  const { hub } = await setup();
  const failure = new Error("synchronous send failure");
  hub._connection.send = () => {
    throw failure;
  };
  assert.throws(
    () => hub.send("output", new Uint8Array(), false),
    (error) => error === failure
  );
});
