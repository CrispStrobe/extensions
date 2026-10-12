// The Arrays fallback must retain the same native reference kinds as its host.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("native references preserve kind, identity and scope in Arrays fallback", () => {
  const source = readFileSync(
    new URL("../extensions/CrispStrobe/arrays.js", import.meta.url),
    "utf8"
  );
  const start = source.indexOf("  const makeValues = () => {");
  const end = source.indexOf("\n  };\n", start);
  assert.ok(start >= 0 && end > start);
  // Exercise the actual fallback, without changing the extension host.
  // eslint-disable-next-line no-new-func
  const values = new Function(
    source.slice(start, end + 5) + "\nreturn makeValues();"
  )();
  const handlers = {};
  const runtime = {
    on(event, callback) {
      (handlers[event] ||= []).push(callback);
    },
  };
  for (const kind of [
    "array",
    "image",
    "tile",
    "legacy-tile",
    "animation",
    "scene",
    "physics-engine",
    "player",
    "music",
    "sevenseg",
    "buffer",
  ]) {
    const ref = values.reference(runtime, kind, "one");
    assert.equal(values.isReference(ref), true, kind);
    assert.equal(values.decode(JSON.parse(JSON.stringify(ref))), ref, kind);
    assert.equal(values.referenceId(runtime, ref, kind), "one");
    assert.equal(
      values.compare(ref, "===", values.reference(runtime, kind, "two")),
      false
    );
    assert.equal(values.referenceId({}, ref, kind), null);
    for (const callback of handlers.PROJECT_START) callback();
    assert.equal(values.referenceId(runtime, ref, kind), null);
  }
});
