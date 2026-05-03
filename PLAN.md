# CrispStrobe extensions — quality cleanup plan

After the May 2026 i18n sweep, ESLint reports 102 errors across the 17 LEGO/utility
extensions in `extensions/CrispStrobe/`. None were introduced by the i18n work — they
are pre-existing. The plan below clears them in passes ordered from lowest-risk
(automatic, no semantic change) to highest-risk (per-callsite review).

The bar each pass must clear: `node --check` clean for every file + `npm run validate`
not regressing + ESLint error count strictly decreasing.

## Pass 0 — measurement (already done)

Counts as of `2883723` on `extensions:main`:

| Rule                          | Count | Severity            |
|-------------------------------|------:|---------------------|
| `require-await`               |    39 | semantic            |
| `no-case-declarations`        |    21 | mechanical          |
| `no-unused-vars`              |    18 | mechanical          |
| `extension/use-scratch-fetch` |    17 | sandbox-safety      |
| `extension/check-can-fetch`   |    10 | sandbox-safety      |
| `extension/should-translate`  |     2 | localisation        |

## Pass 1 — `extension/should-translate` (2)

Both are residual literal block-text strings someone added after the i18n sweep, or
that the sweep missed. Wrap each in `t("<prefix>.<key>")` and add the corresponding
key to all three locale tables (en/de/fr).

## Pass 2 — `no-unused-vars` (18)

For each warning:
- if the binding is genuinely dead → delete it
- if it is intentionally captured (destructuring, callback signature) → prefix `_`
- if it represents a TODO → prefix `_` and add a one-line comment

No semantic change.

## Pass 3 — `no-case-declarations` (21)

Wrap each `case` body that contains `let`/`const`/`function` in `{ ... }`. Mechanical;
no semantic change.

## Pass 4 — `require-await` (39)

For each `async` method that has no `await`:

1. If the method does any `Promise`-returning work but stores results in `this.*`
   without awaiting (fire-and-forget): leave `async`, add the missing `await`.
2. If the method is purely synchronous and returns a value: drop `async`.
3. If the method only exists because the runtime expects an async signature
   (Scratch block handlers): leave `async`, add a single `// eslint-disable-next-line
   require-await` comment with a one-line justification.

Most of our fire-and-forget Bluetooth writes will be (1). LEGO transpile blocks that
just return a JSON-serialisable value will be (2).

## Pass 5 — `extension/use-scratch-fetch` (17) and `extension/check-can-fetch` (10)

Both rules protect users from sandboxed-extension network bypass.

For each `fetch(url)` call:
1. If `url` is user-controllable (config block, sensor read): prefix with
   `if (await Scratch.canFetch(url))` and switch to `Scratch.fetch(url)`.
2. If `url` is hardcoded and known-safe (e.g., on-brick HTTP endpoint): same
   conversion plus `// eslint-disable-next-line extension/check-can-fetch` with a
   one-line justification ("brick HTTP, not user-controlled").
3. If the call is to a same-origin asset: switch to `Scratch.fetch` to keep the
   sandbox-policy machinery in the loop.

Per-callsite review. Expected outcome: 0 errors, no behavioural change.

## Pass 6 — `prettier --write`

After all the above commits land, run `npx prettier --write extensions/CrispStrobe/**/*.js`
once and commit the formatting churn separately so reviews can ignore it cleanly.

## Out of scope

- The gallery's `npm run validate` errors in `images/CrispStrobe/*.svg` (aspect
  ratio, etc.). Those are SVG asset issues, not code, and need image edits.
- `By:` link going to GitHub instead of a Scratch user. Project decision; no fix.
- Security-plugin scans (e.g. `eslint-plugin-security`, `npm audit`). Not part of
  the gallery's default toolchain. Tracked separately.

## Re-run after each pass

```bash
node --check extensions/CrispStrobe/<file>.js
npx eslint extensions/CrispStrobe/<file>.js
```
