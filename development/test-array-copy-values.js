import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";

const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
const start = source.indexOf("  const makeValues = () => {"),
  end = source.indexOf("\n  };\n", start);
const host = () => {
  const values = runInNewContext(
    source.slice(start, end + 5) + "\nmakeValues();"
  );
  const runtime = new EventEmitter(),
    errors = [];
  runtime.on("BLOCKS_ERROR", (error) => errors.push(error));
  let extension;
  const Scratch = {
    BWValues: values,
    vm: { runtime },
    extensions: {
      register(value) {
        extension = value;
      },
    },
    BlockType: { REPORTER: "reporter", BOOLEAN: "Boolean", COMMAND: "command" },
    ArgumentType: { STRING: "string", NUMBER: "number" },
  };
  runInNewContext(source, { Scratch, console });
  return { values, runtime, extension, errors };
};

test("reference copies preserve the selected PXT fractional, undefined and NaN bounds", () => {
  const { values, runtime, extension: a, errors } = host();
  const input = values.arrayReference(runtime, [10, 20, 30, 40]);
  const copy = (start, end) =>
    values.arrayValue(
      runtime,
      a.referenceSlice({
        ARRAY: input,
        START: values.encode(start),
        END: values.encode(end),
      })
    );
  assert.deepEqual(Array.from(copy(undefined, undefined)), [10, 20, 30, 40]);
  assert.deepEqual(Array.from(copy(0.5, 2.5)), [undefined, undefined]);
  assert.deepEqual(Array.from(copy(NaN, undefined)), []);
  assert.deepEqual(Array.from(copy(0, NaN)), []);
  assert.deepEqual(Array.from(copy(-2, undefined)), [30, 40]);
  assert.deepEqual(Array.from(copy(1, 99)), [20, 30, 40]);
  assert.deepEqual(Array.from(copy(3, 1)), []);
  assert.deepEqual(Array.from(copy(-99, -1)), [10, 20, 30]);
  assert.deepEqual(errors, []);
});

test("fresh shallow copies retain nested aliases, cycles and distinct outer identities", () => {
  const { values, runtime, extension: a, errors } = host();
  const inner = [1],
    original = [inner];
  original.push(original);
  const input = values.arrayReference(runtime, original);
  const sliced = a.referenceSlice({
    ARRAY: input,
    START: 0,
    END: values.UNDEFINED,
  });
  const joined = a.referenceConcat({ ARRAY: input, OTHER: sliced });
  assert.notEqual(sliced, input);
  assert.notEqual(joined, input);
  assert.notEqual(joined, sliced);
  const raw = values.arrayValue(runtime, joined);
  assert.equal(raw[0], inner);
  assert.equal(raw[1], original);
  assert.equal(raw[2], inner);
  assert.equal(raw[3], original);
  raw[2][0] = 8;
  assert.equal(original[0][0], 8);
  raw.push(9);
  assert.equal(original.length, 2);
  assert.deepEqual(errors, []);
});

test("copy reference authority survives stop and rejects foreign, stale and disposed inputs", () => {
  const { values, runtime, extension: a, errors } = host();
  const input = values.arrayReference(runtime, [1]);
  runtime.emit("PROJECT_STOP_ALL");
  assert.equal(a.referenceLength({ ARRAY: input }), 1);
  const foreign = values.arrayReference(new EventEmitter(), [2]);
  assert.equal(a.referenceConcat({ ARRAY: input, OTHER: foreign }), "");
  runtime.emit("PROJECT_START");
  assert.equal(a.referenceSlice({ ARRAY: input, START: 0, END: 1 }), "");
  const next = values.arrayReference(runtime, [3]);
  assert.notEqual(next, input);
  runtime.emit("PROJECT_LOADED");
  assert.equal(a.referenceConcat({ ARRAY: next, OTHER: next }), "");
  const live = values.arrayReference(runtime, [4]);
  runtime.emit("RUNTIME_DISPOSED");
  assert.equal(a.referenceSlice({ ARRAY: live, START: 0, END: 1 }), "");
  assert.equal(errors.length, 4);
});

test("character codes preserve selected UTF16 range checks and primitive coercion", () => {
  const { values, extension: a, errors } = host();
  const text = "😀A";
  for (const [index, expected] of [
    [0, 55357],
    [1, 56832],
    [2, 65],
    [0.5, 55357],
    [-0.5, 0],
    [3, 0],
    [NaN, 0],
    [undefined, 0],
    [null, 55357],
    ["1", 56832],
  ])
    assert.equal(
      a.stringCharCodeAt({ TEXT: text, INDEX: values.encode(index) }),
      expected
    );
  assert.deepEqual(errors, []);
  const definitions = a.getInfo().blocks.filter((block) => block.opcode);
  for (const opcode of [
    "referenceSlice",
    "referenceConcat",
    "stringCharCodeAt",
  ])
    assert.ok(definitions.some((block) => block.opcode === opcode));
});

test("opaque inputs are refused before user conversion hooks", () => {
  const { values, runtime, extension: a, errors } = host();
  let conversions = 0;
  const opaque = {
    valueOf() {
      conversions++;
      return 0;
    },
  };
  const input = values.arrayReference(runtime, [1]);
  assert.equal(
    values.decode(a.referenceSlice({ ARRAY: input, START: opaque, END: 1 })),
    undefined
  );
  assert.equal(
    values.decode(a.stringCharCodeAt({ TEXT: "a", INDEX: opaque })),
    undefined
  );
  assert.equal(
    values.decode(
      a.stringCharCodeAt({
        TEXT: values.reference(runtime, "image", "one"),
        INDEX: 0,
      })
    ),
    undefined
  );
  assert.equal(conversions, 0);
  assert.equal(errors.length, 3);
});
