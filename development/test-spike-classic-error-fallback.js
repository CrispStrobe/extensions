import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL(
    "../extensions/CrispStrobe/legospikeprime_btc_scratchlink.js",
    import.meta.url
  ),
  "utf8"
);

let extension;
const runtime = {
  getLocale: () => "en",
  on: () => {},
  registerPeripheralExtension: () => {},
};
const Scratch = {
  ArgumentType: { STRING: "string", NUMBER: "number", NOTE: "note" },
  BlockType: {
    COMMAND: "command",
    REPORTER: "reporter",
    BOOLEAN: "boolean",
    HAT: "hat",
  },
  Cast: {
    toNumber: Number,
    toString: String,
  },
  extensions: {
    unsandboxed: true,
    register: (value) => {
      extension = value;
    },
  },
  vm: { runtime },
};

vm.runInNewContext(source, {
  Scratch,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  atob,
  btoa,
  console: { log: () => {}, warn: () => {} },
  document: { documentElement: { lang: "en" } },
  localStorage: { getItem: () => null },
  navigator: { language: "en", languages: ["en"] },
  setInterval: () => 0,
  setTimeout,
  window: { addEventListener: () => {} },
});

const settleResponse = (response) => {
  const promise = new Promise((resolve, reject) => {
    extension._peripheral._openRequests.test = { resolve, reject };
  });
  extension._peripheral._parseResponse({ i: "test", ...response });
  return promise;
};

assert.equal(await settleResponse({ r: "ok" }), "ok");
await assert.rejects(settleResponse({ e: { code: -95 } }), (error) => {
  assert.equal(error.code, -95);
  return true;
});
await assert.rejects(
  settleResponse({ error: { code: -32000, message: "failed" } }),
  (error) => {
    assert.equal(error.message, "failed");
    return true;
  }
);

const calls = [];
extension._peripheral.sendPythonCommand = (command) => {
  calls.push(command);
  return Promise.resolve();
};
extension._peripheral.sendCommand = () => Promise.resolve();
await extension.motorStart({ PORT: "A", DIRECTION: 1 });
assert.equal(calls.length, 0, "success must not send the Python fallback");

extension._peripheral.sendCommand = () => Promise.reject({ code: -95 });
await extension.motorStart({ PORT: "A", DIRECTION: 1 });
assert.equal(calls.length, 1, "hub errors must trigger one Python fallback");

console.log("Classic hub response and lazy fallback tests passed");
