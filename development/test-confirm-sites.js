// Every "are you sure?" in the CrispStrobe extensions waits for the answer,
// and only OK goes ahead.
//
//   node development/test-confirm-sites.js
//
// Why: in BrickWright Lite's desktop and iOS app the dialog plugin replaces
// window.confirm with an async function, so `confirm(...)` returns a Promise,
// which is always truthy, and `if (confirm(...))` went ahead without asking.
// The extensions now ask through askYesNo(): the host's Scratch.BWConfirm
// (message -> Promise<boolean>) when it provides one, else the browser's
// confirm; the answer is awaited and only exactly `true` is a yes.
//
// Each site is driven from its real source in a node:vm context, in four
// worlds:
//   app/no   host BWConfirm answers false     -> nothing happens
//   app/yes  host BWConfirm answers true      -> the action happens, and not
//                                               before the answer arrives
//   web      no host, the browser's confirm   -> false: nothing; true: action
//   bare     no host, window.confirm replaced by the plugin's async function
//            (a Promise that rejects, as in tauri-plugin-dialog 2.7.1)
//                                             -> nothing happens (fails closed)
// In the app worlds window.confirm is ALSO the plugin's async function, so a
// site that went back to calling confirm() directly goes ahead on "no".

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file) =>
  fs.readFileSync(path.join(here, "../extensions/CrispStrobe", file), "utf8");

const Cast = {
  toString: (v) => String(v),
  toNumber: (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  },
  toBoolean: (v) => Boolean(v),
};

/** A minimal DOM: elements that remember their children and handlers. */
function fakeDocument() {
  const make = (tag) => ({
    tagName: tag,
    children: [],
    style: {},
    innerHTML: "",
    textContent: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    remove() {},
  });
  return {
    createElement: make,
    body: make("body"),
    head: make("head"),
    getElementById: () => null,
    querySelector: () => null,
  };
}

/** The plugin's replacement: an async function whose Promise rejects. */
const pluginConfirm = (log) => (message) => {
  log.push(["window.confirm", message]);
  const rejected = Promise.reject(new Error("dialog.confirm not allowed"));
  // Handled here so a site that ignores it reports a FAIL, not a crash.
  rejected.catch(() => {});
  return rejected;
};

/**
 * Load an extension in a world.
 * @param {string} file extension source under extensions/CrispStrobe
 * @param {object} world {host: fn|undefined, confirm: fn|undefined}
 */
function load(file, world) {
  let registered = null;
  const Scratch = {
    extensions: {
      unsandboxed: true,
      register: (ext) => {
        registered = ext;
      },
    },
    ArgumentType: new Proxy({}, { get: (_t, k) => String(k) }),
    BlockType: new Proxy({}, { get: (_t, k) => String(k) }),
    TargetType: new Proxy({}, { get: (_t, k) => String(k) }),
    Cast,
    translate: Object.assign((m) => m, { setup() {} }),
    vm: { runtime: { on() {}, targets: [] } },
  };
  if (world.host) Scratch.BWConfirm = world.host;
  const alerts = [];
  const context = vm.createContext({
    Scratch,
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    Date,
    Promise,
    navigator: { language: "en", languages: ["en"] },
    document: fakeDocument(),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    alert: (m) => alerts.push(m),
    addEventListener() {},
    removeEventListener() {},
  });
  if (world.confirm) context.confirm = world.confirm;
  context.window = context;
  vm.runInContext(read(file), context);
  assert.ok(registered, file + " registered");
  return { ext: registered, alerts };
}

/** A host BWConfirm whose answer the test releases. */
function deferredHost(log) {
  let release;
  const host = (message) => {
    log.push(["BWConfirm", message]);
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  return { host, answer: (value) => release(value) };
}

const tick = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};

// --- the three sites ---------------------------------------------------------
// Each: build(world) -> {run(): Promise, acted(): boolean, question: RegExp}

const SITES = [
  {
    name: "ev3dev upload-and-run: some sounds failed, continue?",
    file: "ev3dev_py_transpile.js",
    question:
      /2 sound\(s\) failed to upload:[\s\S]*Continue running script anyway\?/,
    build(world) {
      const { ext } = load(this.file, world);
      const ran = [];
      ext.validateScriptName = (name) => String(name);
      ext.transpileProject = () => {
        ext.pythonCode = "print('hi')";
      };
      ext.extractSoundAssets = () => Promise.resolve({ a: 1, b: 2 });
      ext.uploadScriptCode = () => Promise.resolve();
      ext.uploadSoundFiles = () =>
        Promise.resolve({
          results: [],
          errors: [
            { fileName: "a.wav", error: "x" },
            { fileName: "b.wav", error: "y" },
          ],
        });
      ext.runScriptByName = (args) => {
        ran.push(args.NAME);
        return Promise.resolve(7);
      };
      return {
        run: () => ext.uploadAndRunScript({ NAME: "prog.py" }),
        acted: () => ran.length > 0,
      };
    },
  },
  {
    name: "ev3dev script manager: delete script?",
    file: "ev3dev_py_transpile.js",
    question: /^Delete prog\.py\?$/,
    build(world) {
      const { ext } = load(this.file, world);
      const deleted = [];
      ext.getEV3URL = (p) => "http://ev3" + p;
      ext.fetchWithTimeout = () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "ok",
              scripts: ["prog.py"],
              running: [],
            }),
        });
      ext.deleteScript = (args) => {
        deleted.push(args.NAME);
        return Promise.resolve();
      };
      const container = fakeDocument().createElement("div");
      const findDelete = (node) => {
        if (node.textContent === "Delete" && node.onclick) return node;
        for (const child of node.children || []) {
          const hit = findDelete(child);
          if (hit) return hit;
        }
        return null;
      };
      return {
        run: async () => {
          await ext.refreshScriptManagerUI(container);
          const button = findDelete(container);
          assert.ok(button, "the script manager rendered a Delete button");
          // A refresh after deleting must not find the button again and loop.
          ext.fetchWithTimeout = () =>
            Promise.resolve({ ok: false, status: 0 });
          return button.onclick();
        },
        acted: () => deleted.length > 0,
      };
    },
  },
  {
    name: "spikeprime: delete file from hub?",
    file: "legospike_turbowarp_transpile.js",
    question: /^Delete prog\.py from hub\?$/,
    build(world) {
      const { ext } = load(this.file, world);
      const sent = [];
      ext._peripheral = {
        isConnected: () => true,
        sendPythonCommand: (code) => {
          sent.push(code);
          return Promise.resolve();
        },
      };
      return {
        run: () => ext.deleteScriptOnHub({ NAME: "prog.py" }),
        acted: () => sent.some((c) => c.includes('uos.remove("prog.py")')),
      };
    },
  },
];

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

for (const site of SITES) {
  test(site.name + " — app, host answers No: nothing happens", async () => {
    const log = [];
    const d = deferredHost(log);
    const s = site.build({ host: d.host, confirm: pluginConfirm(log) });
    const done = Promise.resolve(s.run());
    await tick();
    assert.equal(log.length, 1, "asked exactly once: " + JSON.stringify(log));
    assert.equal(log[0][0], "BWConfirm", "asked the host, not window.confirm");
    assert.match(log[0][1], site.question);
    d.answer(false);
    await done;
    assert.equal(s.acted(), false, "on No in the app, it went ahead");
  });

  test(
    site.name + " — app, host answers Yes: acts, after the answer",
    async () => {
      const log = [];
      const d = deferredHost(log);
      const s = site.build({ host: d.host, confirm: pluginConfirm(log) });
      const done = Promise.resolve(s.run());
      await tick();
      await tick();
      assert.equal(s.acted(), false, "it went ahead before the answer");
      d.answer(true);
      await done;
      assert.equal(s.acted(), true, "on Yes in the app, nothing happened");
    }
  );

  test(
    site.name + " — app, host answers a truthy non-true: nothing happens",
    async () => {
      const log = [];
      const d = deferredHost(log);
      const s = site.build({ host: d.host, confirm: pluginConfirm(log) });
      const done = Promise.resolve(s.run());
      await tick();
      d.answer("Ok");
      await done;
      assert.equal(s.acted(), false, "only exactly true is a yes");
    }
  );

  for (const answer of [false, true]) {
    test(site.name + " — web, browser confirm answers " + answer, async () => {
      const log = [];
      const s = site.build({
        confirm: (message) => {
          log.push(["window.confirm", message]);
          return answer;
        },
      });
      await s.run();
      assert.equal(log.length, 1, "asked exactly once");
      assert.match(log[0][1], site.question);
      assert.equal(s.acted(), answer);
    });
  }

  test(
    site.name + " — no host, plugin-replaced confirm: fails closed",
    async () => {
      const log = [];
      const s = site.build({ confirm: pluginConfirm(log) });
      await s.run();
      assert.equal(log.length, 1, "asked exactly once");
      assert.equal(s.acted(), false, "a Promise from confirm read as yes");
    }
  );
}

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log("ok   " + name);
  } catch (error) {
    failed++;
    console.log("FAIL " + name + "\n     " + error.message);
  }
}
console.log("\n" + (tests.length - failed) + "/" + tests.length + " passed");
if (failed) process.exit(1);
