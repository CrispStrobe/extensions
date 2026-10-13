import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
const start = source.indexOf("  const makeValues = () => {"),
  end = source.indexOf("\n  };\n", start);
const values = runInNewContext(
  source.slice(start, end + 5) + "\nmakeValues();"
);
const ops = ["&", "|", "^", "<<", ">>", ">>>"];
const apply = (a, op, b) => {
  switch (op) {
    case "&":
      return a & b;
    case "|":
      return a | b;
    case "^":
      return a ^ b;
    case "<<":
      return a << b;
    case ">>":
      return a >> b;
    case ">>>":
      return a >>> b;
  }
};
test("standalone typed bitwise fallback applies Int32/Uint32 primitive conversion", () => {
  for (const a of [
    -1,
    2147483648,
    4294967295.9,
    -0,
    NaN,
    Infinity,
    null,
    undefined,
    true,
    "4294967295",
    "not a number",
  ]) {
    for (const b of [-1, 0, 1, 31, 32, 33, 1.5, NaN, Infinity, null, undefined])
      for (const op of ops)
        assert.equal(values.binary(a, op, b), apply(a, op, b), op);
    assert.equal(values.unary("~", a), ~a);
  }
});
test("opaque references and objects are rejected before bitwise coercion", () => {
  const runtime = { on() {} };
  let coerced = 0;
  for (const value of [
    values.reference(runtime, "image", "one"),
    values.arrayReference(runtime, [1]),
    {
      valueOf() {
        coerced++;
        return 1;
      },
    },
    () => 1,
  ]) {
    assert.throws(() => values.binary(value, ">>>", 0), /primitive/);
    assert.throws(() => values.unary("~", value), /primitive/);
  }
  assert.equal(coerced, 0);
});
