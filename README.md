# CrispStrobe extension gallery

A curated Scratch/TurboWarp extension gallery, served as static files from
GitHub Pages. It began as an EV3dev bridge and now hosts **22 extensions**
covering LEGO hardware, an 8051 microcontroller, a circuit simulator and some
general-purpose block sets.

    https://crispstrobe.github.io/extensions/

## What is in it

| group | extensions |
|---|---|
| **LEGO** | EV3 (direct, LMS transpile, universal, ev3dev-Python), NXT, WeDo 2.0, Boost, Powered Up, SPIKE Prime (BLE, Bluetooth Classic, bridge, transpile) |
| **Microcontroller** | `stc12` — compile Scratch blocks to C for an STC12C5A60S2 and flash it; `stc12live` — drive the same chip live over a serial link |
| **Circuit** | `circuit` — read voltages, currents and net state from a simulated breadboard; `ledcube` — a 4x4x4 LED cube surface |
| **General** | `arrays`, `csp` (constraint solving), `gamepad`, `planetemaths` |

Two of these are consumed twice over, and the distinction matters:

- **Live-loaded from here** by editors that accept an extension URL. A project
  declares the URL, the editor fetches the JS at runtime.
- **Bundled** into `brickwright-lite`, which ships its own copy under
  `overlay/scratch-vm/src/extensions/crispstrobe/` so it can run with no
  network and pass store review. The gallery copy and the bundled copy are
  checked against each other by a conformance test in `sb3-creator`
  (`test/stc12-conformance.test.mjs`) — a menu that becomes a field in one copy
  and an input in the other silently breaks every saved project, so the two are
  asserted identical rather than assumed.

## How the pieces fit together

```
   Browser (you)
   ┌───────────────────────────────────┐
   │  scratch-gui  (the editor)        │
   │   - https://crispstrobe.github.io/scratch-gui/
   │   - https://scratch-gui-three.vercel.app/editor.html
   │                                   │
   │   loads extension JS from ↓       │
   └───────────────────────────────────┘
                 │  HTTPS
                 ▼
   ┌───────────────────────────────────┐
   │  this repo  (extensions)          │
   │   - https://crispstrobe.github.io/extensions/
   │   serves: extensions-v0.json,     │
   │           extensions/<user>/*.js  │
   └───────────────────────────────────┘
                 │ JSON over HTTP/HTTPS
                 ▼
   ┌───────────────────────────────────┐
   │  EV3 brick                        │
   │   running ev3_bridge.py           │
   │   on ports 8080 (HTTP) / 8443 (HTTPS)
   └───────────────────────────────────┘
```

Three repos / hosts, three jobs:

| Where                                                                 | Job                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`CrispStrobe/scratch-gui`](https://github.com/CrispStrobe/scratch-gui) | The Scratch/TurboWarp editor UI. Lists extensions, lets users drag them in.          |
| **this repo (`CrispStrobe/extensions`)**                              | Hosts the extension JS files and the gallery metadata (`extensions-v0.json`).        |
| `extensions/CrispStrobe/ev3_bridge.py` on the EV3 brick               | An HTTP/HTTPS JSON server that turns `{"cmd":"beep",...}` calls into motor/sound/LED actions. |

## Quick start (use it, don't develop it)

1. Open one of the editor URLs above.
2. Click **Add Extension** → **EV3dev** (or paste the URL of `ev3dev_py_transpile.js`).
3. Drop a **set connection** block. Pick:
   - **HTTP** → port `8080`
   - **HTTPS** → port `8443` (requires installing the brick's self-signed cert; see below)
4. Set the IP to your brick's IP (find it on the brick's screen once `ev3_bridge.py` is running).
5. Drop a **test EV3 connection** reporter — it should say **Connected**.
6. Drop a **beep 1000 Hz for 500 ms** block. The brick should beep.

If step 6 silently does nothing while step 5 says **Connected**, you're on an old
build of the extension where `streamingMode` defaulted to `false` — pull the
latest from this repo and redeploy.

## Setting up the EV3 bridge (`ev3_bridge.py`)

The bridge script lives at `extensions/CrispStrobe/ev3_bridge.py`. Copy it to
the brick and run it.

```bash
# From your laptop, copy the script to the brick:
scp extensions/CrispStrobe/ev3_bridge.py robot@ev3dev.local:/home/robot/

# SSH in and run it:
ssh robot@ev3dev.local
python3 ~/ev3_bridge.py            # HTTP 8080 + HTTPS 8443, with on-brick UI
python3 ~/ev3_bridge.py --no-ui    # no UI (useful when running headless)
python3 ~/ev3_bridge.py --http-only   # only HTTP 8080
python3 ~/ev3_bridge.py --https-only  # only HTTPS 8443
python3 ~/ev3_bridge.py --auth user:pass  # require Basic auth
python3 ~/ev3_bridge.py -v         # verbose logging
```

The brick's screen shows the live IP and ports, so you can read the URL
straight off the brick:

```
EV3 BRIDGE v2.3
==========================
http  192.168.178.57:8080
https 192.168.178.57:8443
host: ev3dev
Scripts: 3  Running: 0
Battery: 8.1V (44%)
UP=Menu  BACK=Exit
```

Quick smoke test from any machine on the same network:

```bash
curl http://192.168.178.57:8080/                      # → {"status":"ev3_bridge_active",...}
curl -X POST http://192.168.178.57:8080/ \
     -H "Content-Type: application/json" \
     -d '{"cmd":"beep","freq":1000,"dur":500}'        # → {"status":"ok"}
```

### HTTP vs HTTPS

| Editor URL is …      | Use bridge over … | Why                                                                                                  |
| -------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `http://…` / localhost | **HTTP 8080**     | Simplest. Browsers happily make HTTP calls from HTTP pages.                                          |
| `https://…`          | **HTTPS 8443**    | Browsers block "mixed content" (HTTP from HTTPS pages). The bridge generates a self-signed cert; install it on your device first. |

Cert install: visit `https://<brick-ip>:8443/certificate` (macOS/Linux) or
`https://<brick-ip>:8443/profile` (iOS) and trust it.

## Repo layout

```
extensions/
  CrispStrobe/
    ev3dev_py_transpile.js   ← the ev3dev extension (what the editor loads)
    ev3_bridge.py            ← the on-brick HTTP/HTTPS server
    ev3_universal.js         ← alternative EV3 extension (ScratchLink/Serial/HTTP/Bridge)
    ev3_direct.js            ← direct-command EV3 extension
    legoboost_universal.js   ← LEGO Boost
    lego_wedo2_universal.js  ← LEGO WeDo 2.0
    legospike*.js            ← LEGO SPIKE Prime variants
    legonxt_transpile_universal.js
    lego_poweredup.js
    gamepad.js, csp.js, arrays.js, planetemaths.js, ...
images/CrispStrobe/<id>.png  ← gallery thumbnails (600×300)
generated-metadata/          ← built by `npm run build`
```

## Developing / publishing changes

This repo serves on GitHub Pages. Publishing flow:

```bash
npm install
npm install --save-dev gh-pages spdx-expression-parse  # one-time

# 1. Build the gallery metadata (extensions-v0.json)
npm run build

# 2. Push the build/ folder to gh-pages
npm run deploy
```

Verify with: <https://crispstrobe.github.io/extensions/generated-metadata/extensions-v0.json>

The matching editor changes live in
[`CrispStrobe/scratch-gui`](https://github.com/CrispStrobe/scratch-gui) — the
editor's `tw-security-manager.jsx` whitelists this domain so the extension can
make `fetch()` calls to the brick from inside the unsandboxed extension worker.

## Troubleshooting

### "Connected" works but blocks like *beep* / *play tone* do nothing

The extension has a `streamingMode` flag. Older builds defaulted it to `false`,
so direct command blocks were silently dropped while the connection reporter
still said *Connected*. Current `ev3dev_py_transpile.js` defaults it to `true`
and re-asserts it on `setConnectionMode` and a successful `testConnection`.
Open the browser DevTools console — if you see
`[EV3] Dropping "beep" because streaming is disabled.`, drop an
**enable streaming** block before your command blocks.

### Wrong port chosen by default

The **set connection** block has one port field. The extension auto-corrects
mismatches: with mode `http`, ports `443`/`8443` get rewritten to `8080`; with
mode `https`, ports `80`/`8080` get rewritten to `8443`. So dragging the block,
flipping the mode, and leaving the port at default just works.

### Extension list is empty in the editor

1. Open DevTools → Network.
2. Click **Add Extension**.
3. Look at the request to `extensions-v0.json`.
   - **404** → the editor's `extension-library.jsx` URL is wrong; should point to
     `…/extensions/generated-metadata/extensions-v0.json`.
   - **200 but empty** → cache; hard-reload (`Ctrl+F5` / `⌘⇧R`).

### Hardware doesn't work even though the extension loaded

1. Open DevTools console.
2. If you see "Sandbox" warnings, the `tw-security-manager.jsx` whitelist in
   `scratch-gui` doesn't include this domain. Fix it there.
3. Confirm the extension URL the editor loaded matches what's in the trusted list.

### Node v24 build fails with "ERR_MODULE_NOT_FOUND"

In `development/builder.js`, comment out the `spdx-expression-parse` import and
the `spdxParser(metadata.license)` call (around line 160). Or use Node v18/20.

## Editor (scratch-gui) configuration cheatsheet

When forking the editor, edit these to point at *your* GitHub Pages URL:

- `package.json` — add `"homepage": "https://<you>.github.io/scratch-gui"` and a
  `"deploy": "gh-pages -d build"` script.
- `src/containers/tw-security-manager.jsx` — add your domain to
  `isTrustedExtension`.
- `src/containers/extension-library.jsx` — replace the
  `extensions.turbowarp.org` URLs with `https://<you>.github.io/extensions/…`.
- `src/lib/libraries/extensions/index.jsx` — update the `galleryLoading`,
  `galleryMore`, `galleryError` `href` values.

Build & deploy the editor:

```bash
NODE_ENV=production npm run build
npm run deploy
```

## Upstream / credits

Forked from the [TurboWarp extensions gallery](https://extensions.turbowarp.org/),
with custom additions in `extensions/CrispStrobe/`. See [CONTRIBUTING.md](CONTRIBUTING.md)
for the upstream contribution process.

## Licensing — read this before bundling anything

Upstream `TurboWarp/extensions` is **mixed-licence**, and the mix is the part
that matters if you intend to ship an app:

| upstream part | licence |
|---|---|
| extension `.js` files | per-file header — MIT historically, **MPL-2.0** recommended now |
| sample projects | CC-BY 4.0 |
| **images, development server, website** | **GPL-3.0** |

So "the repo is GPL" and "the repo is MIT" are both wrong. The extension *code*
is permissive or weak-copyleft; the GPL covers the site infrastructure around it.

**Every extension under `extensions/CrispStrobe/` is ours and carries an MPL-2.0
or MIT header.** MPL-2.0 is file-level weak copyleft: it explicitly allows
combining the file into a Larger Work under other terms, requiring only that the
MPL-covered files stay MPL and their source remain available — which it is, here.
That is compatible with closed distribution channels in a way GPL-3.0 is not.

`brickwright-lite` therefore bundles these extensions and **no GPL-3.0 material
from upstream**: no images, no development server, no website code. Verified
rather than assumed — every bundled file's licence header was checked, and the
repo contains no vendored gallery images.

Attribution for anything inherited from upstream stays intact. Per-file headers
are the authority; this section describes them, it does not override them.
