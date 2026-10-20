import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";
const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
function load(service) {
  const start = source.indexOf("  const makeValues = () => {"),
    end = source.indexOf("\n  };\n", start);
  const values = runInNewContext(
      source.slice(start, end + 5) + "\nmakeValues();"
    ),
    runtime = new EventEmitter();
  let arrays;
  runInNewContext(source, {
    Scratch: {
      BWValues: values,
      BWArrayOperations: service,
      vm: { runtime },
      extensions: {
        register(value) {
          arrays = value;
        },
      },
      BlockType: {
        REPORTER: "reporter",
        BOOLEAN: "Boolean",
        COMMAND: "command",
      },
      ArgumentType: { STRING: "string", NUMBER: "number" },
    },
    console,
  });
  return { arrays, values, runtime };
}
function recorder(options = {}) {
  const accept = options.accept !== false,
    ticket = Object.hasOwn(options, "ticket") ? options.ticket : {},
    calls = [];
  return {
    calls,
    ticket,
    begin(method, args, util, metadata) {
      calls.push({ kind: "begin", method, args, util, metadata });
      return ticket;
    },
    access(actual, facts) {
      assert.equal(actual, ticket);
      calls.push(facts);
      if (facts.kind === "prior-binding") return accept ? true : undefined;
      if (facts.kind === "empty-allocation") return [];
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
    },
    finish(actual, result, facts) {
      assert.equal(actual, ticket);
      calls.push({ kind: "finish", result, facts });
    },
  };
}

test("a declared bind discards a prior accessor body without inspecting or granting that body", () => {
  const host = recorder(),
    { arrays, values, runtime } = load(host),
    util = {};
  arrays.create1D({ NAME: "name", JSON: "[5]" }, util);
  const old = values.arrayValue(
    runtime,
    arrays.namedReference({ NAME: "name" }, util)
  );
  let getters = 0;
  Object.defineProperty(old, "discarded", {
    configurable: true,
    enumerable: true,
    get() {
      getters++;
      throw Error("discarded body getter");
    },
  });
  assert.throws(
    () => arrays.namedReference({ NAME: "name" }, util),
    /data-only aggregate/
  );
  host.calls.length = 0;
  arrays.createEmpty({ NAME: "name" }, util);
  const begin = host.calls[0],
    notice = host.calls.find((row) => row.kind === "prior-binding"),
    finish = host.calls.at(-1);
  assert.equal(begin.metadata.role, "bind");
  assert.ok(Object.isFrozen(begin.metadata));
  assert.equal(notice.body, undefined);
  assert.equal(notice.raw, "name");
  assert.equal(notice.name, "name");
  assert.equal(getters, 0);
  assert.notEqual(finish.facts.body, old);
  assert.equal(finish.facts.body.length, 0);
  const current = begin.metadata.lookup("name");
  assert.ok(Object.isFrozen(current));
  assert.equal(current.body, finish.facts.body);
});

test("non-string names retain the original single key coercion and old binding observations", () => {
  const host = recorder(),
    { arrays } = load(host),
    events = [];
  const name = {
    [Symbol.toPrimitive](hint) {
      events.push(hint);
      return "object-name";
    },
  };
  arrays.create1D({ NAME: name, JSON: "[1]" }, {});
  assert.deepEqual(events, ["string"]);
  assert.equal(
    host.calls.some((row) => row.kind === "prior-binding"),
    false
  );
  assert.ok(
    host.calls.some((row) => row.kind === "bind" && row.slot === "NAME")
  );
});

test("an undefined operation ticket preserves the old opted-in standalone constructor path", () => {
  const host = recorder({ ticket: undefined }),
    { arrays } = load(host);
  arrays.createEmpty({ NAME: "standalone" });
  assert.equal(
    host.calls.some(
      (row) => row.kind === "prior-binding" || row.kind === "empty-allocation"
    ),
    false
  );
  assert.ok(
    host.calls.some((row) => row.kind === "bind" && row.slot === "NAME")
  );
});

test("older pure hosts may decline the optional notice and retain their full prior-body checks", () => {
  const host = recorder({ accept: false }),
    { arrays, values, runtime } = load(host);
  arrays.create1D({ NAME: "name", JSON: "[1]" }, {});
  const old = values.arrayValue(
    runtime,
    arrays.namedReference({ NAME: "name" }, {})
  );
  host.calls.length = 0;
  arrays.createEmpty({ NAME: "name" }, {});
  assert.ok(host.calls.some((row) => row.kind === "prior-binding"));
  assert.ok(host.calls.some((row) => row.kind === "bind" && row.body === old));
});

test("read write alias and escape operations never declare replacement or request discard", () => {
  const host = recorder(),
    { arrays } = load(host);
  arrays.create1D({ NAME: "name", JSON: "[1]" }, {});
  host.calls.length = 0;
  arrays.get({ NAME: "name", INDEX: 0 }, {});
  arrays.push({ NAME: "name", VALUE: 2 }, {});
  arrays.namedReference({ NAME: "name" }, {});
  arrays.map({ NAME: "name", FUNC: "v=>v" }, {});
  for (const row of host.calls)
    if (row.kind === "begin") assert.equal(row.metadata, undefined);
  assert.equal(
    host.calls.some((row) => row.kind === "prior-binding"),
    false
  );
  assert.ok(host.calls.some((row) => row.kind === "escape"));
});

test("prior destination is fixed before parse and final lookup sees a real registry replacement", () => {
  const host = recorder(),
    { arrays } = load(host);
  arrays.create1D({ NAME: "name", JSON: "[1]" }, {});
  const begin = host.calls.find((row) => row.kind === "begin"),
    first = begin.metadata.lookup("name").body;
  arrays.createEmpty({ NAME: "name" }, {});
  const replacement = begin.metadata.lookup("name").body;
  assert.notEqual(first, replacement);
  assert.equal(replacement.length, 0);
  assert.equal(begin.metadata.lookup("missing"), null);
});
