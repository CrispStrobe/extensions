import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";

const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
const load = (guard) => {
  const start = source.indexOf("  const makeValues = () => {"),
    end = source.indexOf("\n  };\n", start);
  const values = runInNewContext(
    source.slice(start, end + 5) + "\nmakeValues();"
  );
  const runtime = new EventEmitter(),
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
  runInNewContext(source, { Scratch, console });
  return { a, values, runtime, errors, Scratch };
};
const recorder = () => {
  const events = [],
    ticket = {};
  return {
    events,
    ticket,
    begin(opcode, args, util) {
      events.push({ stage: "begin", opcode, args, util });
      return ticket;
    },
    access(actual, facts) {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      assert.equal(actual, ticket);
      assert.ok(Object.isFrozen(facts));
      events.push({ stage: "access", facts });
      if (facts.kind === "empty-allocation") return [];
    },
    finish(actual, result, facts) {
      assert.equal(actual, ticket);
      assert.ok(Object.isFrozen(facts));
      events.push({ stage: "finish", result, facts });
      return "cannot replace result";
    },
  };
};

test("host sees original args/util and raw VALUE before decoding, same backing named/reference alias", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    util = {};
  a.create1D({ NAME: "a", JSON: "[1]" }, util);
  const ref = a.namedReference({ NAME: "a" }, util),
    body = values.arrayValue(runtime, ref);
  const originalDecode = values.decode;
  let decodes = 0;
  values.decode = (value) => {
    decodes++;
    return originalDecode(value);
  };
  const raw = { bwUndefined: true },
    args = { ARRAY: ref, OP: "push", INDEX: 0, VALUE: raw };
  guard.events.length = 0;
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (
      facts.slot === "ARRAY" ||
      (facts.kind === "transport" &&
        facts.raw === args &&
        facts.body === undefined)
    )
      assert.equal(decodes, 0);
    if (facts.kind === "write" && facts.slot === null) assert.equal(decodes, 1);
    assert.equal(ticket, guard.ticket);
    if (facts.raw === args) assert.equal(facts.raw.VALUE, raw);
    if (facts.slot === "ARRAY" && facts.kind === "write")
      assert.equal(facts.body, body);
  };
  a.mutateReference(args, util);
  assert.equal(guard.events[0].args, args);
  assert.equal(guard.events[0].util, util);
  assert.equal(decodes, 1);
  assert.equal(body[1], undefined);
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
  };
  a.push({ NAME: "a", VALUE: 2 });
  assert.equal(body[2], 2);
});

test("all reference mutators and named mutators reject before any actual write", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = new Error("blocked");
  for (const op of [
    "push",
    "unshift",
    "set",
    "insertAt",
    "removeAt",
    "pop",
    "shift",
    "removeElement",
    "reverse",
    "length",
  ]) {
    const body = [1, 2],
      ref = values.arrayReference(runtime, body);
    guard.access = (ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      if (facts.body === body && facts.kind === "write") throw failure;
    };
    assert.throws(
      () => a.mutateReference({ ARRAY: ref, OP: op, INDEX: 0, VALUE: 9 }),
      (error) => error === failure
    );
    assert.deepEqual(body, [1, 2]);
  }
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
  };
  a.create1D({ NAME: "n", JSON: "[[1],[2]]" });
  const body = values.arrayValue(runtime, a.namedReference({ NAME: "n" }));
  for (const opcode of [
    "set",
    "set2D",
    "setMulti",
    "push",
    "pop",
    "insert",
    "remove",
  ]) {
    guard.access = (ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      if (facts.body === body && facts.kind === "write") throw failure;
    };
    assert.throws(
      () =>
        a[opcode]({
          NAME: "n",
          VALUE: 9,
          INDEX: 0,
          ROW: 0,
          COL: 0,
          INDICES: "[0,0]",
        }),
      (error) => error === failure
    );
    assert.equal(JSON.stringify(body), "[[1],[2]]");
  }
  for (const opcode of ["referenceRemove", "referenceTake"]) {
    guard.access = (ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      if (facts.body === body) throw failure;
    };
    assert.throws(
      () =>
        a[opcode]({
          ARRAY: values.arrayReference(runtime, body),
          VALUE: 1,
          OP: "pop",
          INDEX: 0,
        }),
      (error) => error === failure
    );
  }
});

test("access runs with no ticket for missing, stale and foreign receivers before fallback", () => {
  const seen = [],
    failure = new Error("missing receiver");
  const guard = {
    begin() {},
    access(ticket, facts) {
      assert.equal(ticket, undefined);
      seen.push(facts);
      if (facts.slot === "ARRAY" && facts.kind === "read") throw failure;
    },
    finish() {},
  };
  const { a, values, runtime, errors } = load(guard);
  const stale = values.arrayReference(runtime, [1]);
  runtime.emit("PROJECT_START");
  for (const ARRAY of [
    null,
    values.UNDEFINED,
    stale,
    values.arrayReference(new EventEmitter(), [2]),
  ]) {
    assert.throws(
      () => a.referenceLength({ ARRAY }),
      (error) => error === failure
    );
    assert.ok(seen.at(-1).body == null);
  }
  assert.deepEqual(errors, []);
});

test("both concat bodies and deep named aliases are checked before reads or nested writes", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = {};
  a.create1D({ NAME: "nested", JSON: "[[1],[2]]" });
  const outer = values.arrayValue(
      runtime,
      a.namedReference({ NAME: "nested" })
    ),
    inner = outer[0];
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.body === inner) {
      assert.equal(facts.parent, outer);
      assert.equal(facts.key, "0");
      throw failure;
    }
  };
  for (const opcode of [
    "set2D",
    "setMulti",
    "get2D",
    "getMulti",
    "toJSON",
    "flatten",
    "map",
    "sum",
    "showTable",
  ]) {
    assert.throws(
      () =>
        a[opcode]({
          NAME: "nested",
          ROW: 0,
          COL: 0,
          INDICES: "[0,0]",
          VALUE: 9,
          FUNC: "v => v",
        }),
      (error) => error === failure
    );
    assert.equal(JSON.stringify(outer), "[[1],[2]]");
  }
  const first = [1],
    second = [2];
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.slot === "OTHER" && facts.body === second) throw failure;
  };
  assert.throws(
    () =>
      a.referenceConcat({
        ARRAY: values.arrayReference(runtime, first),
        OTHER: values.arrayReference(runtime, second),
      }),
    (error) => error === failure
  );
  assert.deepEqual(first, [1]);
  assert.deepEqual(second, [2]);
});

test("guard rejection inside recursive JSON is not converted to legacy Undefined", () => {
  const guard = recorder(),
    { a, values, runtime, errors } = load(guard),
    inner = [2],
    failure = {};
  const outer = [values.arrayReference(runtime, inner)],
    ref = values.arrayReference(runtime, outer);
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.body === inner) throw failure;
  };
  assert.throws(
    () => a.jsonValue({ VALUE: ref }),
    (error) => error === failure
  );
  assert.deepEqual(errors, []);
  assert.equal(guard.events.at(-1).facts.status, "throw");
  assert.equal(guard.events.at(-1).facts.error, failure);
});

test("serialized VALUES/REST and named key use one retained coercion and finish cannot replace result", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard);
  for (const [opcode, slot, first] of [
    ["createReference", "VALUES", "[1]"],
    ["referenceValues", "REST", "[2]"],
  ]) {
    let count = 0;
    const raw = {
      toString() {
        return ++count === 1 ? first : "[99]";
      },
    };
    const args = { [slot]: raw, VALUE: 3 };
    const result = a[opcode](args);
    assert.equal(count, 1);
    const parsed = guard.events.findLast((event) => event.facts?.slot === slot);
    assert.equal(parsed.facts.raw, raw);
    assert.equal(JSON.stringify(parsed.facts.body), first);
    if (opcode === "createReference")
      assert.equal(values.arrayValue(runtime, result)[0], 1);
    else assert.equal(result, "[3,2]");
  }
  let names = 0;
  const name = {
    toString() {
      names++;
      return names === 1 ? "first" : "wrong";
    },
  };
  a.createEmpty({ NAME: name });
  assert.equal(names, 1);
  assert.equal(
    values.arrayValue(runtime, a.namedReference({ NAME: "first" })).length,
    0
  );
});

test("raw malformed transports may be refused before parse/decode and before fallback", () => {
  const failure = {},
    guard = recorder(),
    { a, errors } = load(guard);
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "transport" && facts.slot === null) throw failure;
  };
  let conversions = 0;
  for (const [opcode, slot] of [
    ["createReference", "VALUES"],
    ["referenceValues", "REST"],
    ["parseLegacyValue", "VALUE"],
    ["jsonValue", "VALUE"],
  ]) {
    assert.throws(
      () =>
        a[opcode]({
          [slot]: {
            toString() {
              conversions++;
              return "bad";
            },
          },
        }),
      (error) => error === failure
    );
  }
  assert.equal(conversions, 0);
  assert.deepEqual(errors, []);
});

test("cross-runtime named aliases expose the same body even after disposal; refs still follow codec lifetime", () => {
  const guard = recorder(),
    { a, values, runtime, Scratch } = load(guard),
    failure = {};
  a.create1D({ NAME: "shared", JSON: "[1]" });
  const ref = a.namedReference({ NAME: "shared" }),
    body = values.arrayValue(runtime, ref);
  const otherRuntime = new EventEmitter();
  Scratch.vm.runtime = otherRuntime;
  const other = new a.constructor();
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.runtime === otherRuntime && facts.body === body) throw failure;
  };
  assert.throws(
    () => other.namedReference({ NAME: "shared" }),
    (error) => error === failure
  );
  assert.throws(
    () => other.push({ NAME: "shared", VALUE: 3 }),
    (error) => error === failure
  );
  assert.deepEqual(Array.from(body), [1]);
  runtime.emit("RUNTIME_DISPOSED");
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
  };
  assert.equal(a.referenceLength({ ARRAY: ref }), 0);
  assert.equal(a.length({ NAME: "shared" }), 1);
});

test("installed-host aggregate discovery never invokes accessors or legacy callbacks before access", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard);
  let reads = 0;
  const body = [];
  Object.defineProperty(body, "0", {
    get() {
      reads++;
      return [];
    },
    enumerable: true,
  });
  const ref = values.arrayReference(runtime, body);
  assert.throws(
    () => a.referenceItem({ ARRAY: ref, INDEX: 0 }),
    /data-only aggregate/
  );
  assert.equal(reads, 0);
  a.create1D({ NAME: "a", JSON: "[1]" });
  const failure = {};
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "escape") throw failure;
  };
  assert.throws(
    () =>
      a.map({
        NAME: "a",
        FUNC: {
          toString() {
            reads++;
            return "v=>v";
          },
        },
      }),
    (error) => error === failure
  );
  assert.equal(reads, 0);
});

test("new named binding is checked before replacement, and discarded old aliases stay live", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = {};
  a.create1D({ NAME: "a", JSON: "[1]" });
  const old = a.namedReference({ NAME: "a" }),
    body = values.arrayValue(runtime, old);
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "bind" && facts.body !== body) throw failure;
    if (facts.kind === "empty-allocation") return [];
  };
  for (const opcode of [
    "create1D",
    "create2D",
    "createEmpty",
    "createZeros",
    "createRange",
  ]) {
    assert.throws(
      () =>
        a[opcode]({ NAME: "a", JSON: "[9]", SHAPE: "[1]", START: 0, END: 1 }),
      (error) => error === failure
    );
    assert.equal(a.toJSON({ NAME: "a" }), "[1]");
  }
  guard.access = (_ticket, facts) =>
    facts.kind === "empty-allocation" ? [] : undefined;
  a.createEmpty({ NAME: "a" });
  assert.equal(a.referenceLength({ ARRAY: old }), 1);
  assert.equal(values.arrayValue(runtime, old), body);
  a.delete({ NAME: "a" });
  assert.equal(a.referenceLength({ ARRAY: old }), 1);
});

test("selected Array is checked before take/pop changes an unowned outer Array", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    inner = [1],
    outer = [inner],
    failure = {};
  const ref = values.arrayReference(runtime, outer);
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "select" && facts.body === inner) throw failure;
  };
  for (const OP of ["pop", "shift", "removeAt"]) {
    assert.throws(
      () => a.referenceTake({ ARRAY: ref, INDEX: 0, OP }),
      (error) => error === failure
    );
    assert.equal(outer.length, 1);
    assert.equal(outer[0], inner);
  }
});

test("deep named access checks a referenced descendant's actual body, not only its token", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    inner = [8],
    failure = {};
  a.createEmpty({ NAME: "outer" });
  const outer = a.namedReference({ NAME: "outer" });
  a.mutateReference({
    ARRAY: outer,
    OP: "push",
    INDEX: 0,
    VALUE: values.arrayReference(runtime, inner),
  });
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.body === inner) throw failure;
  };
  assert.throws(
    () => a.toJSON({ NAME: "outer" }),
    (error) => error === failure
  );
});

test("failed and nested operations close exact tickets without leaving a stale context", () => {
  const tickets = [],
    finishes = [],
    failure = {};
  const guard = {
    begin(opcode) {
      const ticket = { opcode };
      tickets.push(ticket);
      return ticket;
    },
    access(ticket, facts) {
      if (
        facts.kind === "transport" &&
        facts.slot === null &&
        ticket.opcode === "length"
      ) {
        assert.equal(a.referenceLength({ ARRAY: ref }), 1);
        throw failure;
      }
    },
    finish(ticket, result, facts) {
      finishes.push({ ticket, status: facts.status });
    },
  };
  const { a, values, runtime } = load(guard),
    ref = values.arrayReference(runtime, [1]);
  assert.throws(
    () => a.length({ NAME: "a" }),
    (error) => error === failure
  );
  assert.equal(finishes[0].ticket, tickets[1]);
  assert.equal(finishes[1].ticket, tickets[0]);
  assert.equal(finishes[1].status, "throw");
  assert.equal(a.referenceLength({ ARRAY: ref }), 1);
  assert.equal(finishes.at(-1).ticket, tickets.at(-1));
});

test("direct table reads have no invented current ticket and still expose descendant identity", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = {};
  a.create1D({ NAME: "table", JSON: "[[1]]" });
  const body = values.arrayValue(runtime, a.namedReference({ NAME: "table" }));
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    assert.equal(ticket, undefined);
    assert.equal(facts.opcode, null);
    if (facts.body === body[0]) throw failure;
  };
  assert.throws(
    () => a._tableRows("table"),
    (error) => error === failure
  );
});

test("data-only guard errors inside JSON cannot fall through as a successful Undefined", () => {
  const guard = recorder(),
    { a, values, runtime, errors } = load(guard);
  const body = [];
  let reads = 0;
  Object.defineProperty(body, "0", {
    enumerable: true,
    get() {
      reads++;
      return 1;
    },
  });
  assert.throws(
    () => a.jsonValue({ VALUE: values.arrayReference(runtime, body) }),
    /data-only aggregate/
  );
  assert.equal(reads, 0);
  assert.deepEqual(errors, []);
  assert.equal(guard.events.at(-1).facts.status, "throw");
});

test("post-normalization guards prevent body writes after index, value, key or operation coercions", () => {
  const guard = recorder(),
    { a, values, runtime, Scratch } = load(guard);
  const failure = new Error("current graph changed");
  let invalid = false;
  const changingNumber = (value) => ({
    valueOf() {
      invalid = true;
      return value;
    },
  });
  const changingText = (value) => ({
    toString() {
      invalid = true;
      return value;
    },
  });
  const cases = [
    ["set", { INDEX: changingNumber(0), VALUE: 9 }],
    ["set", { INDEX: 0, VALUE: changingNumber(9) }],
    ["set2D", { ROW: changingText("0"), COL: 0, VALUE: 9 }],
    ["set2D", { ROW: 0, COL: changingText("0"), VALUE: 9 }],
    ["set2D", { ROW: 0, COL: 0, VALUE: changingNumber(9) }],
    ["setMulti", { INDICES: changingText("[0,0]"), VALUE: 9 }],
    ["push", { VALUE: changingNumber(9) }],
    ["insert", { INDEX: changingNumber(0), VALUE: 9 }],
    ["insert", { INDEX: 0, VALUE: changingNumber(9) }],
    ["remove", { INDEX: changingNumber(0) }],
    ["mutateReference", { INDEX: changingNumber(0), OP: "set", VALUE: 9 }],
    ["mutateReference", { INDEX: 0, OP: changingText("set"), VALUE: 9 }],
    ["mutateReference", { INDEX: 0, OP: "length", VALUE: changingNumber(0) }],
    ["referenceTake", { INDEX: changingNumber(0), OP: "removeAt" }],
    ["referenceTake", { INDEX: 0, OP: changingText("shift") }],
  ];
  for (const [method, args] of cases) {
    guard.access = (_ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
    };
    invalid = false;
    a.create1D({ NAME: "n", JSON: "[[1],[2]]" });
    const ref = a.namedReference({ NAME: "n" }),
      body = values.arrayValue(runtime, ref);
    guard.access = (_ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      if (invalid && (facts.body === body || facts.kind === "select"))
        throw failure;
    };
    assert.throws(
      () => a[method]({ NAME: "n", ARRAY: ref, ...args }),
      (error) => error === failure,
      method
    );
    assert.equal(JSON.stringify(body), "[[1],[2]]", method);
  }
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
  };
  invalid = false;
  a.create1D({ NAME: "n", JSON: "[1,2]" });
  const ref = a.namedReference({ NAME: "n" }),
    body = values.arrayValue(runtime, ref);
  Scratch.BWNumberInput = (args) => {
    invalid = true;
    return args.VALUE;
  };
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (invalid && facts.body === body) throw failure;
  };
  assert.throws(
    () => a.referenceRemove({ ARRAY: ref, VALUE: 1 }),
    (error) => error === failure
  );
  assert.equal(JSON.stringify(body), "[1,2]");
});

test("creation coercion cannot publish a replacement registry body or enter a fallback", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = new Error("publish denied");
  let invalid = false;
  for (const [method, slot, text] of [
    ["create1D", "JSON", "[9]"],
    ["create2D", "JSON", "[[9]]"],
    ["createZeros", "SHAPE", "[2,2]"],
    ["createRange", "START", 0],
  ]) {
    guard.access = (_ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
    };
    invalid = false;
    a.create1D({ NAME: "n", JSON: "[1,2]" });
    const ref = a.namedReference({ NAME: "n" }),
      body = values.arrayValue(runtime, ref);
    const value = {
      [slot === "START" ? "valueOf" : "toString"]() {
        invalid = true;
        return text;
      },
    };
    guard.access = (_ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      if (invalid) throw failure;
    };
    assert.throws(
      () => a[method]({ NAME: "n", END: 1, [slot]: value }),
      (error) => error === failure
    );
    guard.access = (_ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
    };
    assert.equal(
      values.arrayValue(runtime, a.namedReference({ NAME: "n" })),
      body
    );
    assert.equal(JSON.stringify(body), "[1,2]");
  }
});

test("host path preserves repeated property-key and RHS coercion order without guards replacing values", () => {
  const run = (guard) => {
    const { a, values, runtime } = load(guard),
      trace = [];
    a.create1D({ NAME: "n", JSON: "[[1]]" });
    const row = {
        toString() {
          trace.push("row");
          return "0";
        },
      },
      col = {
        toString() {
          trace.push("col");
          return "0";
        },
      },
      value = {
        valueOf() {
          trace.push("value");
          return 9;
        },
      };
    a.set2D({ NAME: "n", ROW: row, COL: col, VALUE: value });
    const first = JSON.stringify(
      values.arrayValue(runtime, a.namedReference({ NAME: "n" }))
    );
    a.set2D({
      NAME: "n",
      ROW: {
        toString() {
          trace.push("newrow");
          return "1";
        },
      },
      COL: col,
      VALUE: value,
    });
    return {
      trace,
      first,
      last: JSON.stringify(
        values.arrayValue(runtime, a.namedReference({ NAME: "n" }))
      ),
    };
  };
  const ordinary = run(undefined),
    guarded = run(recorder());
  assert.deepEqual(guarded, ordinary);
  assert.deepEqual(ordinary, {
    trace: [
      "row",
      "row",
      "value",
      "col",
      "newrow",
      "newrow",
      "newrow",
      "value",
      "col",
    ],
    first: "[[9]]",
    last: "[[9],[9]]",
  });
});

test("a replaced mutator is an explicit escape before callback execution, while unowned hosts retain its original call", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = new Error("escape denied");
  a.create1D({ NAME: "n", JSON: "[1]" });
  const ref = a.namedReference({ NAME: "n" }),
    body = values.arrayValue(runtime, ref);
  let calls = 0;
  body.push = function (value) {
    calls++;
    assert.equal(this, body);
    this[1] = value;
    return 2;
  };
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "escape" && facts.body === body) throw failure;
  };
  assert.throws(
    () => a.push({ NAME: "n", VALUE: 9 }),
    (error) => error === failure
  );
  assert.equal(calls, 0);
  assert.equal(body.length, 1);
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
  };
  a.push({ NAME: "n", VALUE: 9 });
  assert.equal(calls, 1);
  assert.equal(body[1], 9);
});

test("normalized legacy JSON references are checked before insertion, not after body mutation", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard),
    failure = new Error("foreign decoded transport");
  a.create1D({ NAME: "n", JSON: "[1,2]" });
  const body = values.arrayValue(runtime, a.namedReference({ NAME: "n" }));
  const raw = '{"bwReference":{"kind":"array","id":"foreign","scope":"other"}}';
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (
      facts.kind === "transport" &&
      facts.body?.bwReference?.scope === "other"
    )
      throw failure;
  };
  for (const method of ["set", "push", "insert", "setMulti"]) {
    assert.throws(
      () => a[method]({ NAME: "n", INDEX: 0, INDICES: "[0]", VALUE: raw }),
      (error) => error === failure
    );
    assert.equal(JSON.stringify(body), "[1,2]");
  }
});

test("table argument coercions are checked before each state write and before renderer effects", () => {
  const guard = recorder(),
    { a, runtime, values } = load(guard),
    failure = new Error("table graph changed");
  let invalid = false;
  a.create1D({ NAME: "n", JSON: "[1,2]" });
  const st = a._tableState("n");
  st.title = "old";
  st.marks["0,0"] = true;
  const cases = [
    [
      "showTable",
      {
        X: {
          valueOf() {
            invalid = true;
            return 9;
          },
        },
        Y: 8,
      },
      () => assert.equal(st.x, 0),
    ],
    [
      "setTableTitle",
      {
        TITLE: {
          toString() {
            invalid = true;
            return "new";
          },
        },
      },
      () => assert.equal(st.title, "old"),
    ],
    [
      "setTableStyle",
      {
        W: {
          valueOf() {
            invalid = true;
            return 9;
          },
        },
        H: 8,
        SIZE: 7,
      },
      () => assert.equal(st.cellW, 44),
    ],
    [
      "markCell",
      {
        ROW: 0,
        COL: {
          valueOf() {
            invalid = true;
            return 1;
          },
        },
      },
      () => assert.equal(st.marks["0,1"], undefined),
    ],
    [
      "unmarkCell",
      {
        ROW: {
          valueOf() {
            invalid = true;
            return 0;
          },
        },
        COL: 0,
      },
      () => assert.equal(st.marks["0,0"], true),
    ],
  ];
  for (const [method, args, check] of cases) {
    invalid = false;
    guard.access = (_ticket, facts) => {
      if (facts.kind === "named-json-parse")
        return Object.freeze({ status: "unqualified" });
      if (invalid) throw failure;
    };
    assert.throws(
      () => a[method]({ NAME: "n", ...args }),
      (error) => error === failure
    );
    check();
  }
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
  };
  invalid = false;
  let calls = 0;
  runtime.renderer = {
    createSVGSkin() {
      calls++;
      return 1;
    },
    createDrawable() {
      calls++;
      return 2;
    },
  };
  const body = values.arrayValue(runtime, a.namedReference({ NAME: "n" }));
  body[0] = {
    toString() {
      invalid = true;
      return "cell";
    },
  };
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (invalid) throw failure;
  };
  assert.throws(
    () => a.showTable({ NAME: "n", X: 0, Y: 0 }),
    (error) => error === failure
  );
  assert.equal(calls, 0);
  assert.equal(st.skinId, null);
});

test("nullish stateful row retains RHS and TypeError without an extra final-key conversion", () => {
  const observe = (guard) => {
    const { a } = load(guard),
      trace = [];
    a.create1D({ NAME: "n", JSON: "[[1],null]" });
    let rows = 0,
      error;
    try {
      a.set2D({
        NAME: "n",
        ROW: {
          toString() {
            trace.push("row");
            return rows++ ? "1" : "0";
          },
        },
        COL: {
          toString() {
            trace.push("col");
            return "0";
          },
        },
        VALUE: {
          valueOf() {
            trace.push("value");
            return 9;
          },
        },
      });
    } catch (e) {
      error = e.name;
    }
    return { trace, error };
  };
  assert.deepEqual(observe(recorder()), observe(undefined));
  assert.deepEqual(observe(undefined), {
    trace: ["row", "row", "value"],
    error: "TypeError",
  });
});

test("named empty factory publishes exactly the current host birth body", () => {
  const guard = recorder(),
    body = [],
    { a, values, runtime } = load(guard),
    args = { NAME: "empty" },
    util = {};
  let births = 0;
  const original = guard.access;
  guard.access = (ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    original(ticket, facts);
    if (facts.kind === "empty-allocation") {
      births++;
      assert.equal(ticket, guard.ticket);
      assert.equal(facts.runtime, runtime);
      assert.equal(facts.opcode, "createEmpty");
      assert.equal(facts.raw, args.NAME);
      assert.equal(facts.name, args.NAME);
      assert.equal(facts.slot, "NAME");
      assert.equal(facts.body, undefined);
      return body;
    }
  };
  a.createEmpty(args, util);
  const beginning = guard.events[0];
  assert.equal(beginning.args, args);
  assert.equal(beginning.util, util);
  assert.equal(births, 1);
  assert.equal(
    guard.events.findLast((event) => event.stage === "finish").facts.body,
    body
  );
  const reference = a.namedReference({ NAME: "empty" });
  assert.equal(values.arrayValue(runtime, reference), body);
  assert.deepEqual(body, []);
});

test("qualified empty birth missing or rejected by host never becomes fallback allocation", () => {
  const guard = recorder(),
    { a } = load(guard);
  a.create1D({ NAME: "held", JSON: "[7]" });
  guard.access = () => undefined;
  let thrown;
  assert.throws(
    () => a.createEmpty({ NAME: "held" }),
    (error) => {
      thrown = error;
      return /requires its current host body/.test(error.message);
    }
  );
  let finish = guard.events.findLast((event) => event.stage === "finish");
  assert.equal(finish.facts.status, "throw");
  assert.equal(finish.facts.error, thrown);
  assert.equal(a.toJSON({ NAME: "held" }), "[7]");
  const failure = Object.freeze(new TypeError("host birth rejected"));
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "empty-allocation") throw failure;
  };
  assert.throws(
    () => a.createEmpty({ NAME: "held" }),
    (error) => error === failure
  );
  finish = guard.events.findLast((event) => event.stage === "finish");
  assert.equal(finish.facts.error, failure);
  assert.equal(a.toJSON({ NAME: "held" }), "[7]");
});

test("empty factory without a host or success ticket retains the legacy allocation", () => {
  for (const guard of [
    undefined,
    {
      begin() {
        return undefined;
      },
      access(_ticket, facts) {
        assert.notEqual(
          facts.kind,
          "empty-allocation",
          "no successful call means no birth request"
        );
      },
      finish() {},
    },
  ]) {
    const { a, values, runtime } = load(guard);
    a.createEmpty({ NAME: "legacy" });
    assert.equal(
      values.arrayValue(runtime, a.namedReference({ NAME: "legacy" })).length,
      0
    );
  }
});

test("nonstring empty name keeps its original single coercion and no primitive birthplace claim", () => {
  const guard = recorder(),
    { a, values, runtime } = load(guard);
  let conversions = 0,
    requests = 0;
  const name = {
    toString() {
      conversions++;
      return "coerced";
    },
  };
  guard.access = (_ticket, facts) => {
    if (facts.kind === "named-json-parse")
      return Object.freeze({ status: "unqualified" });
    if (facts.kind === "empty-allocation") requests++;
  };
  a.createEmpty({ NAME: name });
  assert.equal(conversions, 1);
  assert.equal(requests, 0);
  assert.equal(
    values.arrayValue(runtime, a.namedReference({ NAME: "coerced" })).length,
    0
  );
});
