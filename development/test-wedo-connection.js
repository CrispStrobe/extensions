// Exercise the real extension against an in-memory Scratch Link peer.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../extensions/CrispStrobe/lego_wedo2_universal.js", import.meta.url),
  "utf8"
);
const flush = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

function setup(configure = () => {}) {
  let extension;
  let hub;
  let registrations = 0;
  let listeners = 0;
  let nextTimer = 0;
  const timers = new Map();
  const intervals = new Set();
  const sockets = [];
  const events = [];
  const runtime = {
    constructor: {
      PERIPHERAL_CONNECTED: "connected",
      PERIPHERAL_LIST_UPDATE: "list",
      PERIPHERAL_CONNECTION_LOST_ERROR: "lost",
    },
    registerPeripheralExtension(id, instance) {
      hub = instance;
      registrations++;
    },
    on() {
      listeners++;
    },
    emit(event) {
      events.push(event);
    },
    getScratchLinkSocket() {
      const socket = {
        closed: false,
        writes: [],
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
          this.closed = true;
          this.onClose();
        },
        isOpen() {
          return !this.closed;
        },
        reply(request, error) {
          this.onMessage({
            jsonrpc: "2.0",
            id: request.id,
            result: null,
            error,
          });
        },
        notify(method, params) {
          this.onMessage({ jsonrpc: "2.0", method, params });
        },
        sendMessage(request) {
          this.writes.push(request);
          if (request.method === "discover") {
            this.notify("didDiscoverPeripheral", {
              peripheralId: "test-hub",
              name: "WeDo",
            });
          }
          this.reply(request);
        },
      };
      configure(socket, sockets.length);
      sockets.push(socket);
      return socket;
    },
  };
  vm.runInNewContext(source, {
    console: Object.fromEntries(
      ["log", "info", "debug", "warn", "error", "group", "groupEnd"].map(
        (key) => [key, () => {}]
      )
    ),
    btoa,
    atob,
    setTimeout(fn, ms) {
      const id = ++nextTimer;
      if (ms <= 100) queueMicrotask(fn);
      else timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    setInterval() {
      const id = ++nextTimer;
      intervals.add(id);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    Scratch: {
      vm: { runtime },
      extensions: {
        register(value) {
          extension = value;
        },
      },
      Cast: { toNumber: Number },
      BlockType: {},
      ArgumentType: {},
    },
  });
  return {
    extension,
    sockets,
    events,
    timers,
    intervals,
    get hub() {
      return hub;
    },
    get registrations() {
      return registrations;
    },
    get listeners() {
      return listeners;
    },
    expire(ms) {
      const entry = [...timers.values()].find((timer) => timer.ms === ms);
      assert.ok(entry, `expected a ${ms} ms timeout`);
      entry.fn();
    },
  };
}

test("inline open/discovery/replies complete; concurrent Connect shares one attempt", async () => {
  const f = setup();
  const first = f.extension.connect();
  assert.equal(first, f.extension.connect());
  assert.equal(f.extension.isConnected(), false);
  await first;
  assert.equal(f.extension.isConnected(), true);
  assert.equal(f.sockets.length, 1);
  assert.equal(f.events.filter((event) => event === "connected").length, 1);
  assert.equal(f.timers.size, 0);
  await f.extension.disconnect();
  assert.equal(f.intervals.size, 0);
  assert.equal(f.timers.size, 0);
});

test("close before open rejects and retry reuses the registered hub", async () => {
  const f = setup((socket, index) => {
    if (index === 0) socket.open = () => socket.onClose();
  });
  await assert.rejects(f.extension.connect(), /socket closed/);
  assert.equal(f.sockets[0].closed, true);
  await f.extension.connect();
  assert.equal(f.extension.isConnected(), true);
  assert.equal(f.registrations, 1);
  assert.equal(f.listeners, 1);
  assert.equal(f.timers.size, 0);
  await f.extension.disconnect();
});

test("a socket that never opens is cancelled after ten seconds", async () => {
  const f = setup((socket) => {
    socket.open = () => {};
  });
  const result = assert.rejects(f.extension.connect(), /opening Scratch Link/);
  f.expire(10000);
  await result;
  assert.equal(f.sockets[0].closed, true);
  assert.equal(f.timers.size, 0);
});

test("discovery failure before its RPC reply rejects every outstanding request", async () => {
  const f = setup((socket) => {
    socket.sendMessage = () =>
      socket.notify("discoverDidFail", { message: "Bluetooth unavailable" });
  });
  await assert.rejects(f.extension.connect(), /Bluetooth unavailable/);
  assert.equal(f.hub._connection._requests.size, 0);
  assert.equal(f.sockets[0].closed, true);
  assert.equal(f.timers.size, 0);
});

test("no advertisements after a successful discover reply has a bounded wait", async () => {
  const f = setup((socket) => {
    socket.sendMessage = (request) => socket.reply(request);
  });
  const result = assert.rejects(f.extension.connect(), /discovering a hub/);
  await flush();
  f.expire(20000);
  await result;
  assert.equal(f.timers.size, 0);
});

test("missing discoverDidFinish params fail cleanly instead of hanging", async () => {
  const f = setup((socket) => {
    socket.sendMessage = (request) => {
      socket.reply(request);
      socket.notify("discoverDidFinish");
    };
  });
  await assert.rejects(f.extension.connect(), /no WeDo 2.0 hub found/);
  assert.equal(f.timers.size, 0);
});

for (const method of ["connect", "startNotifications", "write"]) {
  test(`missing ${method} reply times out, cleans up, and permits a fresh attempt`, async () => {
    const f = setup((socket, index) => {
      const send = socket.sendMessage.bind(socket);
      socket.sendMessage = (request) => {
        if (index === 0 && request.method === method) return;
        send(request);
      };
    });
    const result = assert.rejects(f.extension.connect(), /timed out/);
    await flush();
    assert.equal(f.extension.isConnected(), false);
    assert.equal(f.events.includes("connected"), false);
    f.expire(method === "connect" ? 15000 : 10000);
    await result;
    assert.equal(f.hub._connection._requests.size, 0);
    assert.equal(f.timers.size, 0);
    assert.equal(f.intervals.size, 0);
    await f.extension.connect();
    assert.equal(f.extension.isConnected(), true);
    assert.equal(f.registrations, 1);
    await f.extension.disconnect();
  });
}

test("disconnect cancels discovery; late messages cannot disturb the next socket", async () => {
  const f = setup((socket, index) => {
    if (index === 0) socket.sendMessage = (request) => socket.reply(request);
  });
  const result = assert.rejects(f.extension.connect(), /cancelled/);
  await flush();
  const old = f.sockets[0];
  await f.extension.disconnect();
  await result;
  assert.equal(old.closed, true);
  await f.extension.connect();
  old.onClose();
  old.onError(new Error("stale"));
  old.notify("didDiscoverPeripheral", { peripheralId: "other-hub" });
  assert.equal(f.extension.isConnected(), true);
  assert.equal(f.events.includes("lost"), false);
  assert.equal(f.sockets[1].closed, false);
  await f.extension.disconnect();
});

test("a synchronous send exception closes the session without leaking requests", async () => {
  const f = setup((socket) => {
    socket.sendMessage = () => {
      throw new Error("IPC send failed");
    };
  });
  await assert.rejects(f.extension.connect(), /IPC send failed/);
  assert.equal(f.hub._connection._requests.size, 0);
  assert.equal(f.timers.size, 0);
});

test("a synchronous open exception rejects and a later Connect can succeed", async () => {
  const f = setup((socket, index) => {
    if (index === 0)
      socket.open = () => {
        throw new Error("open failed");
      };
  });
  await assert.rejects(f.extension.connect(), /open failed/);
  assert.equal(f.sockets[0].closed, true);
  await f.extension.connect();
  assert.equal(f.extension.isConnected(), true);
  await f.extension.disconnect();
});

test("established socket loss rejects a pending read and permits reconnect", async () => {
  const f = setup();
  await f.extension.connect();
  const connection = f.hub._connection;
  const socket = f.sockets[0];
  socket.sendMessage = () => {};
  const result = assert.rejects(
    connection.read("00002a19-0000-1000-8000-00805f9b34fb"),
    /socket closed/
  );
  socket.onClose();
  await result;
  assert.equal(f.extension.isConnected(), false);
  assert.equal(f.events.filter((event) => event === "lost").length, 1);
  assert.equal(connection._requests.size, 0);
  await f.extension.connect();
  assert.equal(f.intervals.size, 1);
  assert.equal(f.timers.size, 0);
  await f.extension.disconnect();
});

test("cancelling hub initialization prevents a later success event or heartbeat", async () => {
  const f = setup((socket) => {
    const send = socket.sendMessage.bind(socket);
    socket.sendMessage = (request) => {
      if (request.method !== "write") send(request);
    };
  });
  const result = assert.rejects(f.extension.connect(), /cancelled/);
  await flush();
  assert.equal(f.hub._initializing, true);
  await f.extension.disconnect();
  await result;
  assert.equal(f.events.includes("connected"), false);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.timers.size, 0);
});
