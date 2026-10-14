import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";
const source = readFileSync(
  new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
  "utf8"
);
function host() {
  const start = source.indexOf("  const makeValues = () => {"),
    end = source.indexOf("\n  };\n", start);
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
      register: (value) => {
        extension = value;
      },
    },
    BlockType: { REPORTER: "reporter", BOOLEAN: "Boolean", COMMAND: "command" },
    ArgumentType: { STRING: "string", NUMBER: "number" },
  };
  runInNewContext(source, { Scratch, console });
  return { extension, values: Scratch.BWValues, runtime, errors };
}
const text = [
  "abc",
  "",
  "0",
  "null",
  "undefined",
  "true",
  "[1,2]",
  '{"value":2}',
  '"quoted"',
  '{"bwUndefined":true}',
  '{"bwReference":{"kind":"callable","id":"one","scope":"fake"}}',
  "é雪😀",
  "line\nnext",
];

test("named scalar text items remain plaintext in get dimensional reads and pop", () => {
  const { extension: a, values } = host();
  a.create1D({ NAME: "flat", JSON: JSON.stringify(text) });
  a.create2D({ NAME: "grid", JSON: JSON.stringify([text]) });
  for (let index = 0; index < text.length; index++) {
    assert.equal(
      values.decode(a.get({ NAME: "flat", INDEX: index })),
      text[index],
      `get ${index}`
    );
    assert.equal(
      values.decode(a.get2D({ NAME: "grid", ROW: 0, COL: index })),
      text[index],
      `get2D ${index}`
    );
    assert.equal(
      values.decode(
        a.getMulti({ NAME: "grid", INDICES: JSON.stringify([0, index]) })
      ),
      text[index],
      `getMulti ${index}`
    );
  }
  for (const value of [...text].reverse())
    assert.equal(values.decode(a.pop({ NAME: "flat" })), value);
});

test("named scalar results preserve numbers null undefined and qualified image reference while aggregates stay JSON", () => {
  const { extension: a, values, runtime, errors } = host();
  a.create1D({ NAME: "flat", JSON: '[3,null,[1,2],{"item":"abc"}]' });
  assert.equal(values.decode(a.get({ NAME: "flat", INDEX: 0 })), 3);
  assert.equal(values.decode(a.get({ NAME: "flat", INDEX: 1 })), null);
  assert.equal(a.get({ NAME: "flat", INDEX: 2 }), "[1,2]");
  assert.equal(a.get({ NAME: "flat", INDEX: 3 }), '{"item":"abc"}');
  a.set({ NAME: "flat", INDEX: 4, VALUE: values.UNDEFINED });
  assert.equal(values.decode(a.get({ NAME: "flat", INDEX: 4 })), undefined);
  const image = values.reference(runtime, "image", "site");
  a.set({ NAME: "flat", INDEX: 5, VALUE: image });
  const read = a.get({ NAME: "flat", INDEX: 5 });
  assert.equal(values.referenceId(runtime, read, "image"), "site");
  assert.equal(values.referenceId({}, read, "image"), null);
  assert.equal(a.slice({ NAME: "flat", START: 0, END: 3 }), "[3,null,[1,2]]");
  assert.deepEqual(errors, []);
});

test("reference item random and take paths retain text scalar and nested array identity", () => {
  const { extension: a, values, runtime } = host();
  for (const value of text) {
    const array = values.arrayReference(runtime, [value]);
    assert.equal(
      values.decode(a.referenceItem({ ARRAY: array, INDEX: 0 })),
      value
    );
    assert.equal(values.decode(a.referenceRandom({ ARRAY: array })), value);
    assert.equal(
      values.decode(a.referenceTake({ ARRAY: array, OP: "pop" })),
      value
    );
  }
  const child = [7],
    array = values.arrayReference(runtime, [child]);
  const read = a.referenceItem({ ARRAY: array, INDEX: 0 });
  assert.equal(values.arrayValue(runtime, read), child);
  assert.equal(
    values.arrayValue(runtime, a.referenceTake({ ARRAY: array, OP: "shift" })),
    child
  );
});

test("unknown descriptors remain ordinary data and cannot acquire reference authority", () => {
  const { extension: a, values, runtime } = host();
  const candidate = values.reference(runtime, "unadmitted-function", "site");
  assert.equal(values.isReference(candidate), false);
  assert.equal(
    values.referenceId(runtime, candidate, "unadmitted-function"),
    null
  );
  a.create1D({ NAME: "opaque", JSON: "[]" });
  a.set({ NAME: "opaque", INDEX: 0, VALUE: candidate });
  const result = a.get({ NAME: "opaque", INDEX: 0 });
  assert.equal(
    typeof result,
    "string",
    "unsupported descriptor stays legacy aggregate JSON"
  );
  const descriptor = JSON.parse(result);
  assert.equal(descriptor.bwReference.kind, "unadmitted-function");
  assert.equal(values.isReference(descriptor), false);
  assert.equal(
    values.referenceId(
      runtime,
      values.decode(descriptor),
      "unadmitted-function"
    ),
    null
  );
});

test("reduce results preserve scalar text, special primitives, qualified references and raw aggregate identity", () => {
  const { extension: a, values, runtime, errors } = host();
  a.create1D({ NAME: "one", JSON: "[1]" });
  for (const value of text) {
    const result = a.reduce({
      NAME: "one",
      FUNC: `()=>${JSON.stringify(value)}`,
      INIT: 0,
    });
    assert.equal(values.decode(result), value);
  }
  for (const [expression, expected] of [
    ["undefined", undefined],
    ["null", null],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-0", -0],
    ["false", false],
  ]) {
    assert.ok(
      Object.is(
        values.decode(
          a.reduce({ NAME: "one", FUNC: `()=>${expression}`, INIT: 0 })
        ),
        expected
      ),
      expression
    );
  }
  const ref = values.reference(runtime, "image", "reduce-image");
  const result = a.reduce({ NAME: "one", FUNC: "(acc)=>acc", INIT: ref });
  assert.equal(result, ref);
  assert.equal(values.referenceId(runtime, result, "image"), "reduce-image");
  const aggregate = { nested: [3] };
  assert.equal(a._legacyItemResult(aggregate), aggregate);
  assert.equal(a._legacyItemResult(aggregate, true), '{"nested":[3]}');
  const raw = a.reduce({ NAME: "one", FUNC: "()=>({nested:[3]})", INIT: 0 });
  assert.equal(typeof raw, "object");
  assert.equal(raw.nested[0], 3);
  assert.equal(a.reduce({ NAME: "missing", FUNC: "()=>1", INIT: 0 }), "");
  assert.equal(a.reduce({ NAME: "one", FUNC: "invalid (", INIT: 0 }), "");
  assert.deepEqual(errors, []);
});

test("named get/getMulti retain aggregate JSON while get2D and pop retain aggregate objects", () => {
  const { extension: a } = host();
  a.create1D({ NAME: "flat", JSON: '[{"nested":[3]}]' });
  a.create2D({ NAME: "grid", JSON: '[[{"nested":[3]}]]' });
  assert.equal(a.get({ NAME: "flat", INDEX: 0 }), '{"nested":[3]}');
  assert.equal(
    a.getMulti({ NAME: "grid", INDICES: "[0,0]" }),
    '{"nested":[3]}'
  );
  const object = a.get2D({ NAME: "grid", ROW: 0, COL: 0 });
  object.nested[0] = 8;
  assert.equal(
    a.getMulti({ NAME: "grid", INDICES: "[0,0]" }),
    '{"nested":[8]}'
  );
  const popped = a.pop({ NAME: "grid" });
  assert.equal(popped[0], object);
  assert.equal(a.pop({ NAME: "grid" }), "");
  assert.equal(a.get({ NAME: "missing", INDEX: 0 }), "");
  assert.equal(a.get2D({ NAME: "missing", ROW: 0, COL: 0 }), "");
  assert.equal(a.getMulti({ NAME: "grid", INDICES: "malformed" }), "");
});

test("scalar item reference reads preserve scope refusal across stop restart and reload", () => {
  const { extension: a, values, runtime } = host();
  a.create1D({ NAME: "flat", JSON: "[]" });
  const ref = values.reference(runtime, "image", "image");
  a.set({ NAME: "flat", INDEX: 0, VALUE: ref });
  const read = a.get({ NAME: "flat", INDEX: 0 });
  assert.equal(read, ref);
  assert.equal(values.referenceId(new EventEmitter(), read, "image"), null);
  runtime.emit("PROJECT_STOP_ALL");
  assert.equal(values.referenceId(runtime, read, "image"), "image");
  runtime.emit("PROJECT_START");
  assert.equal(values.referenceId(runtime, read, "image"), null);
  const next = values.reference(runtime, "image", "image");
  assert.notEqual(next, read);
  runtime.emit("PROJECT_LOADED");
  assert.equal(values.referenceId(runtime, next, "image"), null);
});

test("scoped callable carriers survive scalar item paths without acquiring invocation authority", () => {
  const { extension: a, values, runtime, errors } = host();
  const ref = values.reference(runtime, "callable", "site");
  assert.equal(values.referenceId(runtime, ref, "callable"), "site");
  a.create1D({ NAME: "one", JSON: "[]" });
  a.set({ NAME: "one", INDEX: 0, VALUE: ref });
  a.create2D({ NAME: "grid", JSON: "[[]]" });
  a.set2D({ NAME: "grid", ROW: 0, COL: 0, VALUE: ref });
  for (const result of [
    a.get({ NAME: "one", INDEX: 0 }),
    a.getMulti({ NAME: "grid", INDICES: "[0,0]" }),
    a.get2D({ NAME: "grid", ROW: 0, COL: 0 }),
    a.reduce({ NAME: "one", FUNC: "(acc)=>acc", INIT: ref }),
    a.pop({ NAME: "one" }),
  ]) {
    assert.equal(result, ref);
    assert.equal(values.referenceId(runtime, result, "callable"), "site");
    assert.equal(values.referenceId({}, result, "callable"), null);
  }
  runtime.emit("PROJECT_START");
  assert.equal(values.referenceId(runtime, ref, "callable"), null);
  assert.equal(
    values.referenceId(
      runtime,
      values.decode(JSON.parse(JSON.stringify(ref))),
      "callable"
    ),
    null
  );
  assert.deepEqual(errors, []);
});
