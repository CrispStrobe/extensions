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
      assert.equal(actual, ticket);
      assert.ok(Object.isFrozen(facts));
      events.push({ stage: "access", facts });
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
    assert.equal(decodes, 0);
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
  guard.access = () => {};
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
      if (facts.body === body && facts.kind === "write") throw failure;
    };
    assert.throws(
      () => a.mutateReference({ ARRAY: ref, OP: op, INDEX: 0, VALUE: 9 }),
      (error) => error === failure
    );
    assert.deepEqual(body, [1, 2]);
  }
  guard.access = () => {};
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
  guard.access = () => {};
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
    if (facts.kind === "bind" && facts.body !== body) throw failure;
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
  guard.access = () => {};
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
