import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";
const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
function load(input, guard) {
  const start = source.indexOf("  const makeValues = () => {"),
    end = source.indexOf("\n  };\n", start);
  const values = runInNewContext(
      source.slice(start, end + 5) + "\nmakeValues();"
    ),
    runtime = new EventEmitter();
  let a;
  const Scratch = {
    BWValues: values,
    BWNumberInput: input,
    BWArrayOperations: guard,
    vm: { runtime },
    extensions: {
      register(value) {
        a = value;
      },
    },
  };
  runInNewContext(source, { Scratch, console });
  return { a, values, runtime };
}
test("new reference value boundaries preserve standalone Number and identical numeric text distinctly", () => {
  const { a, values, runtime } = load();
  for (const VALUE of [20, "20", undefined, null, -0]) {
    const encoded = a.referenceValues({ VALUE, REST: "[]" }),
      reference = a.createReference({ VALUES: encoded });
    // A bare JS Undefined in this legacy JSON list becomes Null. Scratch
    // Undefined reporters use the existing BWUndefined carrier instead.
    assert.ok(
      Object.is(
        values.arrayValue(runtime, reference)[0],
        VALUE === undefined ? null : VALUE
      )
    );
    const body = [],
      ref = values.arrayReference(runtime, body);
    a.mutateReference({ ARRAY: ref, OP: "push", INDEX: 0, VALUE });
    assert.ok(Object.is(body[0], VALUE));
  }
  const body = [20, "20"],
    ref = values.arrayReference(runtime, body);
  assert.equal(a.referenceIndexOf({ ARRAY: ref, VALUE: 20, INDEX: 0 }), 0);
  assert.equal(a.referenceIndexOf({ ARRAY: ref, VALUE: "20", INDEX: 0 }), 1);
  assert.equal(a.referenceRemove({ ARRAY: ref, VALUE: 20 }), true);
  assert.deepEqual(body, ["20"]);
  assert.equal(a.referenceRemove({ ARRAY: ref, VALUE: "20" }), true);
  assert.deepEqual(body, []);
});
test("all four supplier opt-ins receive exact original arguments and utility after raw guard access", () => {
  const events = [],
    util = {},
    ticket = {},
    failure = {};
  let expected;
  const guard = {
    begin(op, args, actualUtil) {
      assert.equal(args, expected);
      assert.equal(actualUtil, util);
      events.push("begin");
      return ticket;
    },
    access(actual, facts) {
      assert.equal(actual, ticket);
      if (facts.kind === "transport" && facts.slot === null) {
        assert.equal(facts.raw, expected);
        assert.equal(facts.raw.VALUE, "20");
        events.push("raw");
      }
    },
    finish() {
      events.push("finish");
    },
  };
  // Wiring only: the real current-leaf interpreter is qualified by native VM controls.
  const { a, values, runtime } = load((args, actualUtil, opcode, name) => {
    assert.equal(args, expected);
    assert.equal(actualUtil, util);
    assert.equal(name, "VALUE");
    assert.equal(events[0], "begin");
    assert.ok(events.includes("raw"));
    events.push(opcode);
    return 20;
  }, guard);
  for (const opcode of [
    "referenceValues",
    "mutateReference",
    "referenceRemove",
    "referenceIndexOf",
  ]) {
    const body = [20, "20"],
      ref = values.arrayReference(runtime, body);
    expected = { ARRAY: ref, VALUE: "20", REST: "[]", OP: "push", INDEX: 0 };
    events.length = 0;
    const result = a[opcode](expected, util);
    assert.equal(expected.VALUE, "20");
    assert.equal(events.filter((x) => x === "arrays_" + opcode).length, 1);
    assert.equal(events.at(-1), "finish");
    if (opcode === "referenceValues") assert.equal(result, "[20]");
    if (opcode === "mutateReference") assert.equal(body[2], 20);
    if (opcode === "referenceRemove") assert.deepEqual(body, ["20"]);
    if (opcode === "referenceIndexOf") assert.equal(result, 0);
  }
  guard.access = () => {
    throw failure;
  };
  expected = { VALUE: "20", REST: "[]" };
  events.length = 0;
  assert.throws(
    () => a.referenceValues(expected, util),
    (error) => error === failure
  );
  assert.deepEqual(events, ["begin", "finish"]);
});
test("missing receivers and invalid tails retain old fallback without calling semantic input hook", () => {
  let calls = 0;
  const { a } = load(() => {
    calls++;
    return 20;
  });
  assert.equal(a.referenceValues({ VALUE: "20", REST: "invalid" }), "[]");
  for (const opcode of [
    "mutateReference",
    "referenceRemove",
    "referenceIndexOf",
  ])
    a[opcode]({ ARRAY: null, VALUE: "20", INDEX: 0, OP: "push" });
  assert.equal(calls, 0);
});
