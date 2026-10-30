// Name: NeoPixel Strips
// ID: neopixelstrips
// Description: Virtual NeoPixel LED strips drawn on the stage: colours, rainbow, brightness, shift, rotate and ranges, ported from the MakeCode NeoPixel driver.
// By: Microsoft Corporation
// By: CrispStrobe <https://github.com/CrispStrobe>
// Original: Microsoft (pxt-neopixel)
// License: MIT

// Derived from microsoft/pxt-neopixel at commit
// 9ef28dd8ec9e72548391746025a2c252fc8f9998 (neopixel.ts), MIT licensed:
//
//   Copyright (c) Microsoft Corporation
//
//   All rights reserved.
//
//   MIT License
//
//   Permission is hereby granted, free of charge, to any person obtaining a
//   copy of this software and associated documentation files (the
//   "Software"), to deal in the Software without restriction, including
//   without limitation the rights to use, copy, modify, merge, publish,
//   distribute, sublicense, and/or sell copies of the Software, and to permit
//   persons to whom the Software is furnished to do so, subject to the
//   following conditions:
//
//   The above copyright notice and this permission notice shall be included
//   in all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//   DEALINGS IN THE SOFTWARE.
//
// The strip is virtual: the byte buffer, the GRB/RGB/RGBW layouts, the
// brightness rule and the shift/rotate/range behaviour follow the original,
// and `show` draws the buffer on the stage instead of sending it to a pin.
// There is no hardware path (microbitplus has none either). See
// docs/CrispStrobe/neopixel.md. The licence texts of all MakeCode ports are
// collected in licenses/makecode-extensions.MIT.txt.

// Block text is English-only, as in the other CrispStrobe extensions of this
// gallery (see microbitplus.js for the reasoning).
/* eslint-disable extension/should-translate */

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("NeoPixel Strips must run unsandboxed");
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const Cast = Scratch.Cast;

  const MODE_RGB = 1; // GRB byte order, three bytes per LED
  const MODE_RGBW = 2; // GRB + white, four bytes per LED
  const MODE_RGB_RGB = 3; // RGB byte order, three bytes per LED
  const MAX_LEDS = 2048;
  const STAGE_H = 360;

  const COLORS = {
    red: 0xff0000,
    orange: 0xffa500,
    yellow: 0xffff00,
    green: 0x00ff00,
    blue: 0x0000ff,
    indigo: 0x4b0082,
    violet: 0x8a2be2,
    purple: 0xff00ff,
    white: 0xffffff,
    black: 0x000000,
  };

  /** @type {Map<string, Strip>} */
  const strips = new Map();
  let nextY = -STAGE_H / 2 + 6;

  const num = (v) => {
    const n = Cast.toNumber(v);
    return Number.isFinite(n) ? n : 0;
  };
  const int = (v) => Math.trunc(num(v));
  // PXT's Math.idiv: integer division truncating toward zero.
  const idiv = (a, b) => (b === 0 ? 0 : Math.trunc(a / b));
  const clampPxt = (min, max, v) => Math.min(max, Math.max(min, v));

  const stride = (s) => (s.mode === MODE_RGBW ? 4 : 3);

  const packRGB = (a, b, c) =>
    ((a & 0xff) << 16) | ((b & 0xff) << 8) | (c & 0xff);
  const unpackR = (rgb) => (rgb >> 16) & 0xff;
  const unpackG = (rgb) => (rgb >> 8) & 0xff;
  const unpackB = (rgb) => rgb & 0xff;

  // A colour argument: a number, a decimal string, or "#rgb" / "#rrggbb".
  const toColor = (v) => {
    if (typeof v === "string") {
      const t = v.trim();
      let m = /^#([0-9a-fA-F]{6})$/.exec(t);
      if (m) return parseInt(m[1], 16);
      m = /^#([0-9a-fA-F]{3})$/.exec(t);
      if (m) {
        return parseInt(
          m[1]
            .split("")
            .map((c) => c + c)
            .join(""),
          16
        );
      }
    }
    return int(v) & 0xffffff;
  };

  const hsl = (h, s, l) => {
    h = Math.round(h);
    s = Math.round(s);
    l = Math.round(l);
    h = ((h % 360) + 360) % 360;
    s = clampPxt(0, 99, s);
    l = clampPxt(0, 99, l);
    const c = idiv(((100 - Math.abs(2 * l - 100)) * s) << 8, 10000);
    const h1 = idiv(h, 60);
    const h2 = idiv((h - h1 * 60) * 256, 60);
    const temp = Math.abs((h1 % 2 << 8) + h2 - 256);
    const x = (c * (256 - temp)) >> 8;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (h1 === 0) {
      r1 = c;
      g1 = x;
    } else if (h1 === 1) {
      r1 = x;
      g1 = c;
    } else if (h1 === 2) {
      g1 = c;
      b1 = x;
    } else if (h1 === 3) {
      g1 = x;
      b1 = c;
    } else if (h1 === 4) {
      r1 = x;
      b1 = c;
    } else if (h1 === 5) {
      r1 = c;
      b1 = x;
    }
    const m = idiv(idiv((l * 2) << 8, 100) - c, 2);
    return packRGB(r1 + m, g1 + m, b1 + m);
  };

  // Strip model --------------------------------------------------------------

  /**
   * A strip or a range of one. Ranges share `root` (the byte buffer and the
   * picture) and differ in start/length, exactly like Strip.range().
   */
  const makeStrip = (name, root, start, length, mode, brightness) => ({
    name,
    root,
    start,
    length,
    mode,
    brightness,
    matrixWidth: 0,
  });

  const setBufferRGB = (s, offset, red, green, blue) => {
    const buf = s.root.buf;
    if (s.mode === MODE_RGB_RGB) {
      buf[offset] = red;
      buf[offset + 1] = green;
    } else {
      buf[offset] = green;
      buf[offset + 1] = red;
    }
    buf[offset + 2] = blue;
  };

  const withBrightness = (s, c) =>
    s.brightness < 255 ? (c * s.brightness) >> 8 : c;

  const setPixelRGB = (s, index, rgb) => {
    if (index < 0 || index >= s.length) return;
    const off = (index + s.start) * stride(s);
    setBufferRGB(
      s,
      off,
      withBrightness(s, unpackR(rgb)),
      withBrightness(s, unpackG(rgb)),
      withBrightness(s, unpackB(rgb))
    );
  };

  const setAllRGB = (s, rgb) => {
    const r = withBrightness(s, unpackR(rgb));
    const g = withBrightness(s, unpackG(rgb));
    const b = withBrightness(s, unpackB(rgb));
    const st = stride(s);
    for (let i = s.start; i < s.start + s.length; i++) {
      setBufferRGB(s, i * st, r, g, b);
    }
  };

  const setPixelW = (s, index, white) => {
    if (s.mode !== MODE_RGBW) return;
    if (index < 0 || index >= s.length) return;
    s.root.buf[(index + s.start) * 4 + 3] = withBrightness(s, white & 0xff);
  };

  // Move whole LEDs inside this strip's range. `shift` zero-fills what it
  // uncovers, `rotate` wraps around; positive offsets move towards the far
  // end, as the original's `shift(-offset * stride)` on the byte buffer does.
  const moveLeds = (s, offset, wrap) => {
    const st = stride(s);
    const n = s.length;
    if (n <= 0 || offset === 0) return;
    const base = s.start * st;
    const src = s.root.buf.slice(base, base + n * st);
    for (let i = 0; i < n; i++) {
      let from = i - offset;
      if (wrap) from = ((from % n) + n) % n;
      for (let j = 0; j < st; j++) {
        s.root.buf[base + i * st + j] =
          from >= 0 && from < n ? src[from * st + j] : 0;
      }
    }
  };

  // Drawing ------------------------------------------------------------------

  const renderer = () => runtime.renderer || null;

  const layout = (root) => {
    const n = root.count;
    const cols = root.matrixWidth > 0 ? Math.min(n, root.matrixWidth) : n;
    const rows = cols > 0 ? Math.ceil(n / cols) : 0;
    return { cols, rows };
  };

  const ledColor = (root, i) => {
    const st = root.mode === MODE_RGBW ? 4 : 3;
    const b = root.displayed;
    if (!b) return [0, 0, 0];
    const o = i * st;
    let r;
    let g;
    if (root.mode === MODE_RGB_RGB) {
      r = b[o];
      g = b[o + 1];
    } else {
      g = b[o];
      r = b[o + 1];
    }
    let bl = b[o + 2];
    if (st === 4) {
      // Approximate the white die as light added to every channel.
      r = Math.min(255, r + b[o + 3]);
      g = Math.min(255, g + b[o + 3]);
      bl = Math.min(255, bl + b[o + 3]);
    }
    return [r, g, bl];
  };

  const svgOf = (root) => {
    const { cols, rows } = layout(root);
    const size = root.ledSize;
    const pad = 3;
    const w = Math.max(1, cols * size + pad * 2);
    const h = Math.max(1, rows * size + pad * 2);
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    out += `<rect width="${w}" height="${h}" rx="${Math.min(6, size / 2)}" fill="#14141c" fill-opacity="0.85"/>`;
    const radius = Math.max(1, size / 2 - 1.5);
    for (let i = 0; i < root.count; i++) {
      const [r, g, b] = ledColor(root, i);
      const cx = pad + (i % cols) * size + size / 2;
      const cy = pad + Math.floor(i / cols) * size + size / 2;
      const lit = r + g + b > 0;
      out += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${lit ? `rgb(${r},${g},${b})` : "#262631"}"${lit ? ' stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.75"' : ""}/>`;
    }
    return { svg: out + "</svg>", w, h };
  };

  const redraw = (root) => {
    const r = renderer();
    if (!r || !root.visible || !root.displayed) return;
    try {
      const { svg, h } = svgOf(root);
      if (root.skinId === null) {
        root.skinId = r.createSVGSkin(svg);
        root.drawableId = r.createDrawable("sprite");
        r.updateDrawableSkinId(root.drawableId, root.skinId);
      } else {
        r.updateSVGSkin(root.skinId, svg);
      }
      if (root.x === null) {
        // First picture: stack above the previous strips, along the bottom.
        root.x = 0;
        root.y = nextY + h / 2;
        nextY += h + 6;
      }
      r.updateDrawablePosition(root.drawableId, [root.x, root.y]);
      r.updateDrawableVisible(root.drawableId, true);
      r.setDrawableOrder(root.drawableId, Infinity, "sprite");
    } catch (e) {
      // A renderer that refuses the skin leaves the strip's data intact.
    }
  };

  const hideRoot = (root) => {
    const r = renderer();
    if (!r || root.drawableId === null) return;
    try {
      r.updateDrawableVisible(root.drawableId, false);
    } catch (e) {
      // already gone
    }
  };

  const destroyRoot = (root) => {
    const r = renderer();
    if (r) {
      try {
        if (root.drawableId !== null)
          r.destroyDrawable(root.drawableId, "sprite");
        if (root.skinId !== null) r.destroySkin(root.skinId);
      } catch (e) {
        // already gone
      }
    }
    root.drawableId = null;
    root.skinId = null;
  };

  const clearAll = () => {
    const roots = new Set();
    for (const s of strips.values()) roots.add(s.root);
    for (const root of roots) destroyRoot(root);
    strips.clear();
    nextY = -STAGE_H / 2 + 6;
  };

  runtime.on("PROJECT_START", clearAll);
  runtime.on("RUNTIME_DISPOSED", () => {
    runtime.off("PROJECT_START", clearAll);
    clearAll();
  });

  // Operations ---------------------------------------------------------------

  const show = (s) => {
    const root = s.root;
    root.displayed = root.buf.slice();
    redraw(root);
  };

  const showRainbow = (s, startHue, endHue) => {
    if (s.length <= 0) return;
    const saturation = 100;
    const luminance = 50;
    const steps = s.length;
    const h1 = startHue;
    const h2 = endHue;
    const hDistCW = (h2 + 360 - h1) % 360;
    const hStep = idiv(hDistCW * 100, steps);
    const h1_100 = h1 * 100;
    if (steps === 1) {
      setPixelRGB(s, 0, hsl(h1 + hStep, saturation, luminance));
    } else {
      setPixelRGB(s, 0, hsl(startHue, saturation, luminance));
      for (let i = 1; i < steps - 1; i++) {
        const h = idiv(h1_100 + i * hStep, 100) + 360;
        setPixelRGB(s, i, hsl(h, saturation, luminance));
      }
      setPixelRGB(s, steps - 1, hsl(endHue, saturation, luminance));
    }
    show(s);
  };

  const clearStrip = (s) => {
    const st = stride(s);
    s.root.buf.fill(0, s.start * st, (s.start + s.length) * st);
  };

  const showBarGraph = (s, value, high) => {
    if (high <= 0) {
      clearStrip(s);
      setPixelRGB(s, 0, COLORS.yellow);
      show(s);
      return;
    }
    value = Math.abs(value);
    const n = s.length;
    const n1 = Math.max(1, n - 1);
    const v = idiv(value * n, high);
    if (v === 0) {
      setPixelRGB(s, 0, 0x666600);
      for (let i = 1; i < n; i++) setPixelRGB(s, i, 0);
    } else {
      for (let i = 0; i < n; i++) {
        if (i <= v) {
          const b = idiv(i * 255, n1);
          setPixelRGB(s, i, packRGB(b, 0, 255 - b));
        } else {
          setPixelRGB(s, i, 0);
        }
      }
    }
    show(s);
  };

  const easeBrightness = (s) => {
    const st = stride(s);
    const mid = idiv(s.length, 2);
    if (mid === 0) return;
    const buf = s.root.buf;
    for (let k = 0; k < s.length; k++) {
      const off = (s.start + k) * st;
      const br =
        k > mid
          ? idiv(255 * (s.length - 1 - k) * (s.length - 1 - k), mid * mid)
          : idiv(255 * k * k, mid * mid);
      for (let j = 0; j < st; j++) buf[off + j] = (buf[off + j] * br) >> 8;
    }
  };

  // The original sums buf[i + j] (an LED index plus a channel), which is not
  // the byte of any LED; this sums the strip's own bytes, which is what the
  // "rough approximation" in its comment describes.
  const power = (s) => {
    const st = stride(s);
    const base = s.start * st;
    let p = 0;
    for (let i = 0; i < s.length * st; i++) p += s.root.buf[base + i];
    return idiv(s.length * 7, 10) + idiv(p * 480, 10000);
  };

  const stripMenu = () => {
    const names = Array.from(strips.keys());
    return names.length > 0
      ? names.map((n) => ({ text: n, value: n }))
      : [{ text: "(create a strip first)", value: "" }];
  };

  const get = (args) => strips.get(Cast.toString(args.STRIP)) || null;

  const stripArg = { type: Scratch.ArgumentType.STRING, menu: "strips" };

  class NeoPixelStrips {
    getInfo() {
      return {
        id: "neopixelstrips",
        name: "NeoPixel Strips",
        color1: "#2699BF",
        color2: "#1f7f9f",
        color3: "#196a86",
        blocks: [
          {
            opcode: "create",
            blockType: Scratch.BlockType.COMMAND,
            text: "create NeoPixel strip [STRIP] at pin [PIN] with [LEDS] leds as [MODE]",
            arguments: {
              STRIP: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "strip",
              },
              PIN: {
                type: Scratch.ArgumentType.STRING,
                menu: "pins",
                defaultValue: "P0",
              },
              LEDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 24 },
              MODE: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "modes",
                defaultValue: MODE_RGB,
              },
            },
          },
          {
            opcode: "range",
            blockType: Scratch.BlockType.COMMAND,
            text: "make strip [RANGE] from [STRIP] range from [START] with [LENGTH] leds",
            arguments: {
              RANGE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "range",
              },
              STRIP: stripArg,
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              LENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 4 },
            },
          },
          {
            opcode: "remove",
            blockType: Scratch.BlockType.COMMAND,
            text: "delete strip [STRIP]",
            arguments: { STRIP: stripArg },
          },
          "---",
          {
            opcode: "showColor",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] show color [COLOR]",
            arguments: {
              STRIP: stripArg,
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ff0000",
              },
            },
          },
          {
            opcode: "showRainbow",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] show rainbow from [START] to [END]",
            arguments: {
              STRIP: stripArg,
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
            },
          },
          {
            opcode: "showBarGraph",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] show bar graph of [VALUE] up to [HIGH]",
            arguments: {
              STRIP: stripArg,
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              HIGH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
            },
          },
          {
            opcode: "setPixelColor",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] set pixel color at [PIXEL] to [COLOR]",
            arguments: {
              STRIP: stripArg,
              PIXEL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#00ff00",
              },
            },
          },
          {
            opcode: "show",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] show",
            arguments: { STRIP: stripArg },
          },
          {
            opcode: "clear",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] clear",
            arguments: { STRIP: stripArg },
          },
          {
            opcode: "shift",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] shift pixels by [OFFSET]",
            arguments: {
              STRIP: stripArg,
              OFFSET: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "rotate",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] rotate pixels by [OFFSET]",
            arguments: {
              STRIP: stripArg,
              OFFSET: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Advanced",
          },
          {
            opcode: "length",
            blockType: Scratch.BlockType.REPORTER,
            text: "[STRIP] length",
            arguments: { STRIP: stripArg },
          },
          {
            opcode: "setBrightness",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] set brightness [BRIGHTNESS]",
            arguments: {
              STRIP: stripArg,
              BRIGHTNESS: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 255,
              },
            },
          },
          {
            opcode: "easeBrightness",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] ease brightness",
            arguments: { STRIP: stripArg },
          },
          {
            opcode: "setPixelWhite",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] set pixel white LED at [PIXEL] to [WHITE]",
            arguments: {
              STRIP: stripArg,
              PIXEL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              WHITE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
            },
          },
          {
            opcode: "setMatrixWidth",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] set matrix width [WIDTH]",
            arguments: {
              STRIP: stripArg,
              WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 8 },
            },
          },
          {
            opcode: "setMatrixColor",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] set matrix color at x [X] y [Y] to [COLOR]",
            arguments: {
              STRIP: stripArg,
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#0000ff",
              },
            },
          },
          {
            opcode: "power",
            blockType: Scratch.BlockType.REPORTER,
            text: "[STRIP] power (mA)",
            arguments: { STRIP: stripArg },
          },
          "---",
          {
            opcode: "rgb",
            blockType: Scratch.BlockType.REPORTER,
            text: "red [RED] green [GREEN] blue [BLUE]",
            arguments: {
              RED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
              GREEN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
              BLUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
            },
          },
          {
            opcode: "hsl",
            blockType: Scratch.BlockType.REPORTER,
            text: "hue [H] saturation [S] luminosity [L]",
            arguments: {
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              S: { type: Scratch.ArgumentType.NUMBER, defaultValue: 99 },
              L: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "colors",
            blockType: Scratch.BlockType.REPORTER,
            text: "[COLOR]",
            arguments: {
              COLOR: {
                type: Scratch.ArgumentType.STRING,
                menu: "colors",
                defaultValue: "red",
              },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Stage display",
          },
          {
            opcode: "placeDisplay",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STRIP] display at x [X] y [Y] with led size [SIZE]",
            arguments: {
              STRIP: stripArg,
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: -150 },
              SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 16 },
            },
          },
          {
            opcode: "setDisplayVisible",
            blockType: Scratch.BlockType.COMMAND,
            text: "[VISIBLE] [STRIP] display",
            arguments: {
              VISIBLE: {
                type: Scratch.ArgumentType.STRING,
                menu: "visible",
                defaultValue: "show",
              },
              STRIP: stripArg,
            },
          },
        ],
        menus: {
          strips: { acceptReporters: true, items: "stripMenu" },
          pins: {
            acceptReporters: false,
            items: Array.from({ length: 17 }, (_, i) => `P${i}`),
          },
          modes: {
            acceptReporters: false,
            items: [
              { text: "RGB (GRB format)", value: String(MODE_RGB) },
              { text: "RGB+W", value: String(MODE_RGBW) },
              { text: "RGB (RGB format)", value: String(MODE_RGB_RGB) },
            ],
          },
          colors: {
            acceptReporters: false,
            items: Object.keys(COLORS),
          },
          visible: {
            acceptReporters: false,
            items: [
              { text: "show", value: "show" },
              { text: "hide", value: "hide" },
            ],
          },
        },
      };
    }

    stripMenu() {
      return stripMenu();
    }

    // Re-creating a name replaces the old strip (as assigning a new strip to
    // the same variable would).
    create(args) {
      const name = Cast.toString(args.STRIP);
      if (name === "") return;
      const old = strips.get(name);
      if (old && old.root.owner === name) {
        for (const [k, v] of Array.from(strips)) {
          if (v.root === old.root) strips.delete(k);
        }
        destroyRoot(old.root);
      }
      const modeNum = int(args.MODE);
      const mode =
        modeNum === MODE_RGBW || modeNum === MODE_RGB_RGB ? modeNum : MODE_RGB;
      const count = clampPxt(0, MAX_LEDS, int(args.LEDS));
      const st = mode === MODE_RGBW ? 4 : 3;
      const root = {
        owner: name,
        pin: Cast.toString(args.PIN),
        mode,
        count,
        buf: new Uint8Array(count * st),
        displayed: null,
        matrixWidth: 0,
        visible: true,
        ledSize: clampPxt(4, 24, Math.floor(440 / Math.max(1, count))),
        x: null,
        y: null,
        skinId: null,
        drawableId: null,
      };
      // The original's default brightness is 128.
      strips.set(name, makeStrip(name, root, 0, count, mode, 128));
    }

    range(args) {
      const parent = get(args);
      const name = Cast.toString(args.RANGE);
      if (!parent || name === "") return;
      const start =
        parent.start + clampPxt(0, parent.length - 1, int(args.START));
      const length = clampPxt(
        0,
        parent.length - (start - parent.start),
        int(args.LENGTH)
      );
      strips.set(
        name,
        makeStrip(
          name,
          parent.root,
          start,
          Math.max(0, length),
          parent.mode,
          parent.brightness
        )
      );
    }

    remove(args) {
      const s = get(args);
      if (!s) return;
      strips.delete(s.name);
      if (s.root.owner === s.name) {
        for (const [k, v] of Array.from(strips)) {
          if (v.root === s.root) strips.delete(k);
        }
        destroyRoot(s.root);
      }
    }

    showColor(args) {
      const s = get(args);
      if (!s) return;
      setAllRGB(s, toColor(args.COLOR));
      show(s);
    }

    showRainbow(args) {
      const s = get(args);
      if (s) showRainbow(s, int(args.START), int(args.END));
    }

    showBarGraph(args) {
      const s = get(args);
      if (s) showBarGraph(s, num(args.VALUE), num(args.HIGH));
    }

    setPixelColor(args) {
      const s = get(args);
      if (s) setPixelRGB(s, int(args.PIXEL), toColor(args.COLOR));
    }

    show(args) {
      const s = get(args);
      if (s) show(s);
    }

    clear(args) {
      const s = get(args);
      if (s) clearStrip(s);
    }

    shift(args) {
      const s = get(args);
      if (s) moveLeds(s, int(args.OFFSET), false);
    }

    rotate(args) {
      const s = get(args);
      if (s) moveLeds(s, int(args.OFFSET), true);
    }

    length(args) {
      const s = get(args);
      return s ? s.length : 0;
    }

    setBrightness(args) {
      const s = get(args);
      if (s) s.brightness = int(args.BRIGHTNESS) & 0xff;
    }

    easeBrightness(args) {
      const s = get(args);
      if (s) easeBrightness(s);
    }

    setPixelWhite(args) {
      const s = get(args);
      if (s) setPixelW(s, int(args.PIXEL), int(args.WHITE));
    }

    setMatrixWidth(args) {
      const s = get(args);
      if (!s) return;
      s.matrixWidth = Math.min(s.length, int(args.WIDTH));
      if (s.root.owner === s.name)
        s.root.matrixWidth = Math.max(0, s.matrixWidth);
    }

    setMatrixColor(args) {
      const s = get(args);
      if (!s || s.matrixWidth <= 0) return;
      const x = int(args.X);
      const y = int(args.Y);
      const rows = idiv(s.length, s.matrixWidth);
      if (x < 0 || x >= s.matrixWidth || y < 0 || y >= rows) return;
      setPixelRGB(s, x + y * s.matrixWidth, toColor(args.COLOR));
    }

    power(args) {
      const s = get(args);
      return s ? power(s) : 0;
    }

    rgb(args) {
      return packRGB(int(args.RED), int(args.GREEN), int(args.BLUE));
    }

    hsl(args) {
      return hsl(num(args.H), num(args.S), num(args.L));
    }

    colors(args) {
      const key = Cast.toString(args.COLOR);
      return Object.prototype.hasOwnProperty.call(COLORS, key)
        ? COLORS[key]
        : 0;
    }

    placeDisplay(args) {
      const s = get(args);
      if (!s) return;
      const root = s.root;
      root.x = num(args.X);
      root.y = num(args.Y);
      root.ledSize = clampPxt(2, 64, num(args.SIZE) || root.ledSize);
      redraw(root);
    }

    setDisplayVisible(args) {
      const s = get(args);
      if (!s) return;
      s.root.visible = Cast.toString(args.VISIBLE) !== "hide";
      if (s.root.visible) redraw(s.root);
      else hideRoot(s.root);
    }
  }

  Scratch.extensions.register(new NeoPixelStrips());
})(Scratch);
