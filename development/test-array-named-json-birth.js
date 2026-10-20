import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";

const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
const load = (guard, extra = {}) => {
  const start = source.indexOf("  const makeValues = () => {"),
    end = source.indexOf("\n  };\n", start);
  const values = runInNewContext(
      source.slice(start, end + 5) + "\nmakeValues();"
    ),
    runtime = new EventEmitter(),
    errors = [];
  runtime.on("BLOCKS_ERROR", (error) => errors.push(error));
  let a;
  const Scratch = {
    BWValues: values,
    BWArrayOperations: guard,
    vm: { runtime },
    extensions: {
      register(value) {
        a = value;
      },
    },
    BlockType: { REPORTER: "reporter", BOOLEAN: "Boolean", COMMAND: "command" },
    ArgumentType: { STRING: "string", NUMBER: "number" },
  };
  runInNewContext(source, { Scratch, console, ...extra });
  return { a, values, runtime, errors };
};
const recorder = () => {
  const ticket = {},
    events = [];
  return {
    ticket,
    events,
    begin(opcode, args, util) {
      events.push({ kind: "begin", opcode, args, util });
      return ticket;
    },
    access(actual, facts) {
      assert.equal(actual, ticket);
      assert.ok(Object.isFrozen(facts));
      events.push(facts);
      if (facts.kind === "named-json-parse") {
        try {
          return Object.freeze({
            status: "parsed",
            value: Reflect.apply(facts.parser, facts.owner, [facts.raw]),
          });
        } catch (error) {
          return Object.freeze({ status: "parse-error", error });
        }
      }
    },
    finish(actual, result, facts) {
      assert.equal(actual, ticket);
      events.push({ kind: "finish", result, facts });
    },
  };
};

test("named JSON factories bind exactly the host parsed value without decoding or dimensional reinterpretation", () => {
  for (const method of ["create1D", "create2D"]) {
    const guard = recorder(),
      { a, values, runtime, errors } = load(guard),
      args = { NAME: "parsed", JSON: '[[1],null,"x",{"bwUndefined":true}]' },
      util = {};
    const original = guard.access;
    let body;
    guard.access = (ticket, facts) => {
      const result = original(ticket, facts);
      if (facts.kind === "named-json-parse") {
        body = result.value;
        assert.equal(facts.raw, args.JSON);
        assert.equal(facts.name, args.NAME);
      }
      return result;
    };
    a[method](args, util);
    const ref = a.namedReference({ NAME: "parsed" });
    assert.equal(values.arrayValue(runtime, ref), body);
    assert.equal(JSON.stringify(body), args.JSON);
    assert.equal(body[3].bwUndefined, true);
    assert.equal(
      guard.events.find((event) => event.kind === "begin").args,
      args
    );
    assert.equal(
      guard.events.find((event) => event.kind === "begin").util,
      util
    );
    assert.deepEqual(errors, []);
  }
});

test("the original parse SyntaxError enters original catch and binds the method-specific fallback once", () => {
  for (const [method, expected] of [
    ["create1D", "[]"],
    ["create2D", "[[]]"],
  ]) {
    const guard = recorder(),
      { a } = load(guard);
    let error;
    const access = guard.access;
    guard.access = (ticket, facts) => {
      const outcome = access(ticket, facts);
      if (outcome?.status === "parse-error") error = outcome.error;
      return outcome;
    };
    assert.doesNotThrow(() => a[method]({ NAME: "bad", JSON: "!" }));
    assert.ok(error);
    assert.equal(error.name, "SyntaxError");
    assert.equal(a.toJSON({ NAME: "bad" }), expected);
    const finish = guard.events.find((event) => event.kind === "finish");
    assert.equal(finish.facts.status, "return");
    assert.equal(
      guard.events.filter((event) => event.kind === "named-json-parse").length,
      1
    );
    // The wrapper first checks the old named body; only the second bind
    // observation is the actual fallback RHS publication.
    const binds = guard.events.filter((event) => event.kind === "bind");
    assert.equal(binds.length, 2);
    assert.equal(binds[0].body, undefined);
    assert.equal(binds[1].body, finish.facts.body);
    assert.ok(Array.isArray(binds[1].body));
  }
});

test("valid nonarray JSON values remain the actual parsed values in named storage", () => {
  for (const json of ["3", "true", "null", '{"x":1}']) {
    const guard = recorder(),
      { a } = load(guard);
    let parsed;
    const access = guard.access;
    guard.access = (ticket, facts) => {
      const outcome = access(ticket, facts);
      if (outcome?.status === "parsed") parsed = outcome.value;
      return outcome;
    };
    a.create1D({ NAME: "scalar", JSON: json });
    const finish = guard.events.find((event) => event.kind === "finish");
    assert.equal(finish.facts.body, parsed);
    assert.equal(JSON.stringify(parsed), json);
  }
});

test("unqualified custom parser keeps original receiver and one RHS call before bind", () => {
  const events = [],
    custom = {
      parse(text) {
        events.push({ kind: "parse", receiver: this, text });
        return [9];
      },
      stringify: JSON.stringify,
    };
  const guard = recorder(),
    access = guard.access;
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "bind") events.push({ kind: "bind", body: facts.body });
    return access(ticket, facts);
  };
  const { a } = load(guard, { JSON: custom });
  events.length = 0;
  a.create1D({ NAME: "custom", JSON: "[1]" });
  assert.equal(events.length, 3);
  assert.equal(events[0].kind, "bind");
  assert.equal(events[0].body, undefined, "preflight checks the old named body");
  assert.equal(events[1].kind, "parse");
  assert.equal(events[1].receiver, custom);
  assert.equal(events[1].text, "[1]");
  assert.equal(events[2].kind, "bind");
  assert.equal(
    events[2].body,
    guard.events.find((event) => event.kind === "finish").facts.body
  );
  assert.equal(JSON.stringify(events[2].body), "[9]");
  assert.equal(events.filter((event) => event.kind === "parse").length, 1);
});

test("nonstring NAME and JSON preserve existing one-coercion order without requesting native parse", () => {
  const guard = recorder(),
    { a } = load(guard),
    order = [];
  const name = {
      toString() {
        order.push("name");
        return "coerced";
      },
    },
    json = {
      toString() {
        order.push("json");
        return "[4]";
      },
    };
  a.create2D({ NAME: name, JSON: json });
  assert.deepEqual(order, ["name", "json"]);
  assert.equal(a.toJSON({ NAME: "coerced" }), "[4]");
  assert.equal(
    guard.events.filter((event) => event.kind === "named-json-parse").length,
    0
  );
});

test("host guard failure and absent qualified outcome cannot be swallowed by original parse fallback", () => {
  for (const absent of [false, true]) {
    const guard = recorder(),
      { a } = load(guard);
    a.create1D({ NAME: "held", JSON: "[7]" });
    const access = guard.access,
      failure = Object.freeze(new TypeError("host parse guard"));
    guard.access = (ticket, facts) => {
      if (facts.kind === "named-json-parse") {
        if (absent) return undefined;
        throw failure;
      }
      return access(ticket, facts);
    };
    let observed;
    assert.throws(
      () => a.create2D({ NAME: "held", JSON: "[9]" }),
      (error) => {
        observed = error;
        return absent
          ? /current parse outcome/.test(error.message)
          : error === failure;
      }
    );
    assert.ok(observed);
    assert.equal(a.toJSON({ NAME: "held" }), "[7]");
    const finish = guard.events.findLast(
      (event) => event.kind === "finish" && event.facts.opcode === "create2D"
    );
    assert.equal(finish.facts.status, "throw");
    assert.equal(finish.facts.error, observed);
  }
});

test("no host or successful ticket retains standalone JSON parser and fallback semantics", () => {
  for (const guard of [
    undefined,
    {
      begin() {},
      access(_ticket, facts) {
        assert.notEqual(facts.kind, "named-json-parse");
      },
      finish() {},
    },
  ]) {
    const { a } = load(guard);
    a.create1D({ NAME: "n", JSON: "[1]" });
    assert.equal(a.toJSON({ NAME: "n" }), "[1]");
    a.create2D({ NAME: "n", JSON: "!" });
    assert.equal(a.toJSON({ NAME: "n" }), "[[]]");
  }
});

test("legacy syntax failure preserves deferred raw property-key coercion and custom parser fallback", () => {
  const { a } = load(undefined),
    order = [];
  const name = {
      toString() {
        order.push("name");
        return "bad";
      },
    },
    json = {
      toString() {
        order.push("json");
        return "!";
      },
    };
  a.create1D({ NAME: name, JSON: json });
  // namedKey returns the raw object without a host. The failed parser
  // prevents the first assignment; only the fallback commits a property key.
  assert.deepEqual(order, ["json", "name"]);
  assert.equal(a.toJSON({ NAME: "bad" }), "[]");
  const original = Object.freeze(new TypeError("custom parse"));
  const custom = {
    parse() {
      throw original;
    },
    stringify: JSON.stringify,
  };
  const guard = recorder(),
    access = guard.access;
  guard.access = (ticket, facts) =>
    facts.kind === "named-json-parse"
      ? Object.freeze({ status: "unqualified" })
      : access(ticket, facts);
  const run = load(guard, { JSON: custom });
  assert.doesNotThrow(() => run.a.create2D({ NAME: "custom", JSON: "[]" }));
  assert.equal(run.a.toJSON({ NAME: "custom" }), "[[]]");
});
