import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";
const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
function host(input) {
  let extension;
  const Scratch = {
    BWNumberInput: input,
    vm: { runtime: new EventEmitter() },
    extensions: { register: (instance) => (extension = instance) },
    BlockType: { REPORTER: "reporter", BOOLEAN: "Boolean", COMMAND: "command" },
    ArgumentType: { STRING: "string", NUMBER: "number" },
  };
  runInNewContext(source, { Scratch, console });
  return { extension, Scratch };
}

test("standalone value operations preserve raw text when the host hook is absent", () => {
  for (const input of [undefined, null, false, "not a function"]) {
    const { extension: a } = host(input);
    assert.equal(a.valueBinary({ LEFT: "20", OP: "+", RIGHT: "1" }), "201");
    assert.equal(a.valueBinary({ LEFT: "20", OP: "-", RIGHT: "1" }), 19);
    assert.equal(a.valueUnary({ OP: "-", VALUE: "20" }), -20);
    assert.equal(a.valueTruthy({ VALUE: "0" }), true);
    assert.equal(a.valueCompare({ LEFT: 20, OP: "===", RIGHT: "20" }), false);
  }
});

test("all four operations pass exact args, utility and explicit value roles once in order", () => {
  const calls = [],
    util = {},
    args = { LEFT: "20", RIGHT: "1", VALUE: "0", OP: "+" };
  // This tests the supplier wiring only. The host owns input interpretation;
  // the real engine, Number leaf and caller checks are consumer integration tests.
  const { extension: a } = host((actual, context, opcode, name) => {
    assert.equal(actual, args);
    assert.equal(context, util);
    calls.push([opcode, name]);
    return Number(actual[name]);
  });
  assert.equal(a.valueBinary(args, util), 21);
  args.OP = "-";
  assert.ok(Object.is(a.valueUnary(args, util), -0));
  assert.equal(a.valueTruthy(args, util), false);
  args.OP = "===";
  assert.equal(a.valueCompare(args, util), false);
  assert.deepEqual(calls, [
    ["arrays_valueBinary", "LEFT"],
    ["arrays_valueBinary", "RIGHT"],
    ["arrays_valueUnary", "VALUE"],
    ["arrays_valueTruthy", "VALUE"],
    ["arrays_valueCompare", "LEFT"],
    ["arrays_valueCompare", "RIGHT"],
  ]);
});

test("host results retain mixed text, fraction and Undefined semantics without extra conversion", () => {
  const { extension: a, Scratch } = host(
    (args, _util, _opcode, name) => args[name]
  );
  assert.equal(a.valueBinary({ LEFT: 20, OP: "+", RIGHT: "1" }), "201");
  assert.equal(a.valueBinary({ LEFT: -0.25, OP: "+", RIGHT: 0.5 }), 0.25);
  assert.equal(a.valueTruthy({ VALUE: undefined }), false);
  const values = { compare: (left, op, right) => [left, op, right] };
  Scratch.BWValues = values;
  const sentinel = { opaque: true };
  const result = a.valueCompare({
    LEFT: sentinel,
    OP: "===",
    RIGHT: undefined,
  });
  assert.equal(result[0], sentinel);
  assert.equal(result[2], undefined);
});
