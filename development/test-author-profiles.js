import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAuthorProfile } from "./author-profile.js";

test("real Scratch and GitHub profile shapes retain author links", () => {
  for (const link of [
    "https://scratch.mit.edu/users/Example_1/",
    "https://scratch.mit.edu/users/-example",
    "https://github.com/CrispStrobe",
    "https://github.com/Example-1/",
  ])
    assert.equal(isAuthorProfile(link), true, link);
});
test("non-profile links remain rejected", () => {
  for (const link of [
    null,
    "",
    // eslint-disable-next-line no-script-url -- inert negative fixture, never evaluated
    "javascript:alert(1)",
    "http://github.com/CrispStrobe",
    "https://github.com/CrispStrobe/extensions",
    "https://github.com@evil.example/CrispStrobe",
    "https://github.com.evil.example/CrispStrobe",
    "https://github.com/CrispStrobe?redirect=elsewhere",
    "https://scratch.mit.edu/users/Example/other",
    "https://scratch.mit.edu/users/Example#other",
  ])
    assert.equal(isAuthorProfile(link), false, String(link));
});
test("owned gallery SVGs have a two-to-one viewport while retaining square artwork coordinates", () => {
  for (const name of [
    "ev3_direct",
    "ev3_lms_transpile",
    "ev3_universal",
    "ev3dev_py_transpile",
    "lego_poweredup",
    "legoboost_universal",
    "legonxt_transpile_universal",
    "legospike_turbowarp_transpile",
  ]) {
    const svg = readFileSync(
      new URL(`../images/CrispStrobe/${name}.svg`, import.meta.url),
      "utf8"
    );
    const tag = svg.match(/<svg\b[^>]*>/)[0];
    assert.equal(
      Number(tag.match(/\bwidth="(\d+)/)[1]),
      2 * Number(tag.match(/\bheight="(\d+)/)[1]),
      name
    );
    const viewbox = tag
      .match(/viewBox="([^"]+)"/)[1]
      .split(/\s+/)
      .map(Number);
    assert.equal(viewbox[2], viewbox[3], name);
  }
});
