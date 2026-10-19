import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { EventEmitter } from "node:events";
const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
function load(guard) {
  const start = source.indexOf("  const makeValues = () => {"),
    end = source.indexOf("\n  };\n", start);
  const values = runInContext(
    source.slice(start, end + 5) + "\nmakeValues();",
    createContext({})
  );
  const runtime = new EventEmitter();
  let extension;
  const Scratch = {
    BWValues: values,
    BWArrayOperations: guard,
    vm: { runtime },
    extensions: {
      register(value) {
        extension = value;
      },
    },
    BlockType: { REPORTER: "reporter", BOOLEAN: "Boolean", COMMAND: "command" },
    ArgumentType: { STRING: "string", NUMBER: "number" },
  };
  const context = createContext({ Scratch, console });
  runInContext(source, context);
  return { extension, values, runtime, Scratch, context };
}
function guard() {
  const ticket = {},
    events = [];
  return {
    ticket,
    events,
    begin(opcode, args, util) {
      events.push({ stage: "begin", opcode, args, util });
      return ticket;
    },
    access(actual, facts) {
      assert.equal(actual, ticket);
      assert.ok(Object.isFrozen(facts));
    },
    finish(actual, result, facts) {
      assert.equal(actual, ticket);
      events.push({ stage: "finish", result, facts });
    },
  };
}
test("optional primitive protocol retains original args/util and lends LEFT then RIGHT after both inputs", () => {
  const service = guard(),
    run = load(service),
    { extension: a, values: v, runtime } = run,
    util = {};
  const left = v.arrayReference(runtime, [1]),
    right = v.arrayReference(runtime, [2]),
    args = { OP: "+", LEFT: left, RIGHT: right },
    order = [];
  run.Scratch.BWNumberInput = (actual, u, opcode, slot) => {
    assert.equal(actual, args);
    assert.equal(u, util);
    assert.equal(opcode, "arrays_valueBinary");
    order.push("input " + slot);
    return actual[slot];
  };
  service.primitive = (actual, facts) => {
    assert.equal(actual, service.ticket);
    assert.ok(Object.isFrozen(facts));
    assert.equal(facts.runtime, runtime);
    assert.equal(facts.opcode, "valueBinary");
    assert.equal(facts.raw, args[facts.slot]);
    order.push("loan " + facts.slot);
    return facts.slot === "LEFT" ? "1" : "2";
  };
  assert.equal(a.valueBinary(args, util), "12");
  assert.deepEqual(order, [
    "input LEFT",
    "input RIGHT",
    "loan LEFT",
    "loan RIGHT",
  ]);
  assert.equal(service.events[0].args, args);
  assert.equal(service.events[0].util, util);
  assert.equal(service.events.at(-1).facts.status, "return");
});
test("standalone Arrays and unrelated scalar operators retain the old behavior", () => {
  const { extension: a, values: v, runtime } = load();
  assert.equal(
    a.valueBinary({ OP: "+", LEFT: v.arrayReference(runtime, [5]), RIGHT: "" }),
    "[object Object]"
  );
  assert.equal(a.valueBinary({ OP: "+", LEFT: 1, RIGHT: 2 }), 3);
  const service = guard();
  service.begin = () => {
    throw new Error("unrelated operator used host");
  };
  const run = load(service);
  assert.equal(run.extension.valueBinary({ OP: "+", LEFT: 3, RIGHT: 1 }), 4);
  assert.equal(run.extension.valueBinary({ OP: "-", LEFT: 3, RIGHT: 1 }), 2);
  assert.equal(run.extension.valueBinary({ OP: "*", LEFT: 3, RIGHT: 2 }), 6);
});
test("an unavailable primitive method refuses an Array loan with exact throw completion", () => {
  const service = guard(),
    { extension: a, values: v, runtime } = load(service),
    args = { OP: "+", LEFT: v.arrayReference(runtime, [5]), RIGHT: "" };
  let original;
  assert.throws(
    () => a.valueBinary(args, {}),
    (error) => {
      original = error;
      return /host primitive loan/.test(error.message);
    }
  );
  const end = service.events.at(-1);
  assert.equal(end.stage, "finish");
  assert.equal(end.facts.status, "throw");
  assert.equal(end.facts.error, original);
});
test("host refusal and other operand error retain identity and finish exactly once", () => {
  const service = guard(),
    { extension: a, values: v, runtime } = load(service),
    marker = new Error("private host refusal");
  service.primitive = () => {
    throw marker;
  };
  assert.throws(
    () =>
      a.valueBinary(
        { OP: "+", LEFT: v.arrayReference(runtime, [5]), RIGHT: "" },
        {}
      ),
    (error) => error === marker
  );
  assert.equal(service.events.filter((e) => e.stage === "finish").length, 1);
  assert.equal(service.events.at(-1).facts.error, marker);
  const second = guard(),
    run = load(second),
    order = [];
  second.primitive = () => {
    order.push("left primitive");
    return "5";
  };
  const failure = new Error("actual other coercion");
  const other = {
    toString() {
      order.push("right primitive");
      throw failure;
    },
  };
  assert.throws(
    () =>
      run.extension.valueBinary(
        {
          OP: "+",
          LEFT: run.values.arrayReference(run.runtime, [5]),
          RIGHT: other,
        },
        {}
      ),
    (error) => error === failure
  );
  assert.deepEqual(order, ["left primitive", "right primitive"]);
  assert.equal(second.events.at(-1).facts.error, failure);
});
test("literal allocation avoids late parse, decode, map and species replacement", () => {
  const service = guard(),
    run = load(service),
    foreign = [99];
  let decodeCalls = 0;
  run.values.decode = () => {
    decodeCalls++;
    return foreign;
  };
  runInContext(
    'JSON.parse=()=>{throw new Error("late parse")};Array.prototype.map=()=>{throw new Error("late map")};Array.prototype.constructor={ [Symbol.species]:function(){throw new Error("late species");} };',
    run.context
  );
  const result = run.extension.createReference({ VALUES: "[[1,null],2]" }, {}),
    body = run.values.arrayValue(run.runtime, result);
  assert.equal(JSON.stringify(body), "[[1,null],2]");
  assert.notEqual(body, foreign);
  assert.notEqual(body[0], foreign);
  assert.equal(decodeCalls, 0);
  assert.equal(service.events.at(-1).facts.body, body);
});
