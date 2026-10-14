// Name: Circuit Playground
// ID: circuitplayground
// Description: Adafruit Circuit Playground Express on-board devices — the NeoPixel ring, buttons, slide switch, motion, light, temperature, sound, touch and speaker — as VM state a device pane draws and drives.
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0

// The behaviour of every block follows pxt-adafruit 1.6.8 — the MakeCode
// Circuit Playground target BrickWright Lite serves — quirks included, so a
// program reads the same here as in MakeCode's own simulator, which is the
// reference this extension is checked against. Ported from that release, under
// the MIT licence below: the NeoPixel strip, colour helpers and the six ring
// animations (libs/light/neopixel.ts, libs/color/colors.ts), Math.isin
// (libs/base/math.ts, itself after FastLED, MIT), the animation queue
// (libs/base/control.ts), tempo and beats (libs/music/music.ts), the
// simulator's sensor thresholds and button timing (built/common-sim.js).
//
//   Copyright (c) Microsoft Corporation. MIT License: permission is hereby
//   granted, free of charge, to any person obtaining a copy of this software
//   and associated documentation files (the "Software"), to deal in the
//   Software without restriction, including without limitation the rights to
//   use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions: The above
//   copyright notice and this permission notice shall be included in all
//   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED
//   "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
//
// The built-in sounds and the melody notation (libs/music/melodies.ts) are
// from MicroPython on the micro:bit:
//
//   Copyright (c) 2013-2016 The MicroPython-on-micro:bit Developers. MIT
//   License, with the same permission notice and warranty disclaimer as above.
//
// Block text is English-only, as in the other CrispStrobe extensions here.
/* eslint-disable extension/should-translate */
(function (Scratch) {
  "use strict";

  const NUM_PIXELS = 10; // circuit-playground/config.ts NUM_NEOPIXELS
  const DEFAULT_BRIGHTNESS = 16; // NeoPixelStrip constructor
  const ANIMATION_INTERVAL = 50; // queueAnimation: AnimationQueue.interval
  const LONG_CLICK_MS = 1000; // DEVICE_BUTTON_LONG_CLICK_TIME

  // colors.ts `enum Colors` (the block menu's named colours).
  const COLORS = {
    red: 0xff0000,
    orange: 0xff7f00,
    yellow: 0xffff00,
    green: 0x00ff00,
    blue: 0x0000ff,
    indigo: 0x4b0082,
    violet: 0x8a2be2,
    purple: 0xa033e5,
    pink: 0xff007f,
    white: 0xffffff,
    black: 0x000000,
  };

  // music/enums.d.ts `enum Note`, as shipped (CSharp5 is 555 there, not 554).
  const NOTES = {
    C: 262, CSharp: 277, D: 294, Eb: 311, E: 330, F: 349, FSharp: 370,
    G: 392, GSharp: 415, A: 440, Bb: 466, B: 494,
    C3: 131, CSharp3: 139, D3: 147, Eb3: 156, E3: 165, F3: 175, FSharp3: 185,
    G3: 196, GSharp3: 208, A3: 220, Bb3: 233, B3: 247,
    C4: 262, CSharp4: 277, D4: 294, Eb4: 311, E4: 330, F4: 349, FSharp4: 370,
    G4: 392, GSharp4: 415, A4: 440, Bb4: 466, B4: 494,
    C5: 523, CSharp5: 555, D5: 587, Eb5: 622, E5: 659, F5: 698, FSharp5: 740,
    G5: 784, GSharp5: 831, A5: 880, Bb5: 932, B5: 988,
  }; // prettier-ignore

  // music/melodies.ts `sounds()`. PewPew's '!1200,200^50' is a later sound
  // syntax this release's Melody parser does not know: it reads it as one
  // octave token, so the sound is a 500 ms tone at frequency 0 — silence, as
  // in MakeCode 1.6.8 itself.
  const SOUNDS = {
    powerUp: "g4:1 c5 e g:2 e:1 g:3",
    powerDown: "g5:1 d# c g4:2 b:1 c5:3",
    jumpUp: "c5:1 d e f g",
    jumpDown: "g5:1 f e d c",
    baDing: "b5:1 e6:3",
    wawawawaa: "e3:3 r:1 d#:3 r:1 d:4 r:1 c#:8",
    magicWand: "F#6:1-300 G# A# B C7# D# F F# G# A# B:6",
    siren: "a4 d5 a4 d5 a4 d5",
    pewPew: "!1200,200^50",
  };
  const FREQ_TABLE = [31, 33, 35, 37, 39, 41, 44, 46, 49, 52, 55, 58, 62, 65, 69, 73, 78, 82, 87, 92, 98, 104, 110, 117, 123, 131, 139, 147, 156, 165, 175, 185, 196, 208, 220, 233, 247, 262, 277, 294, 311, 330, 349, 370, 392, 415, 440, 466, 494, 523, 554, 587, 622, 659, 698, 740, 784, 831, 880, 932, 988, 1047, 1109, 1175, 1245, 1319, 1397, 1480, 1568, 1661, 1760, 1865, 1976, 2093, 2217, 2349, 2489, 2637, 2794, 2960, 3136, 3322, 3520, 3729, 3951, 4186, 4435, 4699, 4978, 5274, 5588, 5920, 6272, 6645, 7040, 7459, 7902]; // prettier-ignore

  const BEATS = { whole: 1, half: 2, quarter: 4, eighth: 8, sixteenth: 16, double: 32, breve: 64 }; // prettier-ignore
  // Menu VALUES are MakeCode's own identifiers (Gesture.TiltLeft is
  // "tiltLeft"): one token each, so a program can spell them, and the same
  // names an imported MakeCode program uses. The TEXT is what the block shows.
  const GESTURES = { shake: "shake", tiltUp: "tilt up", tiltDown: "tilt down", tiltLeft: "tilt left", tiltRight: "tilt right", faceUp: "face up", faceDown: "face down", freeFall: "free fall", twoG: "2g", threeG: "3g", sixG: "6g", eightG: "8g" }; // prettier-ignore
  const SOUND_NAMES = { powerUp: "power up", powerDown: "power down", jumpUp: "jump up", jumpDown: "jump down", baDing: "ba ding", wawawawaa: "wawawawaa", magicWand: "magic wand", siren: "siren", pewPew: "pew pew" }; // prettier-ignore
  const BUTTONS = ["A", "B", "A+B"];
  const TOUCH_PADS = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"];
  const BUTTON_EVENTS = { click: "click", longClick: "long click", up: "up", down: "down" }; // prettier-ignore
  const ANIMATIONS = { rainbow: "rainbow", runningLights: "running lights", comet: "comet", sparkle: "sparkle", theaterChase: "theater chase", colorWipe: "color wipe" }; // prettier-ignore
  const UNITS = { C: "°C", F: "°F" };

  // ---- colour (libs/color/colors.ts) ----------------------------------
  const rgb = (r, g, b) => ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  const unpackR = (c) => (c >> 16) & 0xff;
  const unpackG = (c) => (c >> 8) & 0xff;
  const unpackB = (c) => c & 0xff;

  function hsv(hue, sat = 255, val = 255) {
    let h = hue % 255 >> 0;
    if (h < 0) h += 255;
    h = ((h * 192) / 255) >> 0;
    const invsat = 255 - sat;
    const floor = ((val * invsat) / 255) >> 0;
    const amplitude = val - floor;
    const section = (h / 0x40) >> 0;
    const offset = h % 0x40 >> 0;
    const up = (((offset * amplitude) / (255 / 4)) >> 0) + floor;
    const down = (((0x40 - 1 - offset) * amplitude) / (255 / 4)) >> 0;
    const downF = down + floor;
    if (section === 1) return rgb(floor, downF, up);
    if (section === 2) return rgb(up, floor, downF);
    return rgb(downF, up, floor);
  }

  function fade(c, brightness) {
    brightness = Math.max(0, Math.min(255, brightness >> 0));
    if (brightness < 255) {
      c = rgb(
        (unpackR(c) * brightness) >> 8,
        (unpackG(c) * brightness) >> 8,
        (unpackB(c) * brightness) >> 8
      );
    }
    return c;
  }

  // colors.ts parseColor: the eight lower/upper-case names `show ring`
  // accepts, else parseInt (so "0xff0000" and "16711680" both work, and
  // anything else is 0 = off).
  function parseColor(word) {
    const known = {
      red: COLORS.red, green: COLORS.green, blue: COLORS.blue,
      white: COLORS.white, orange: COLORS.orange, purple: COLORS.purple,
      yellow: COLORS.yellow, pink: COLORS.pink,
    }; // prettier-ignore
    if (word === word.toLowerCase() || word === word.toUpperCase()) {
      const k = word.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(known, k)) return known[k];
    }
    return parseInt(word) || 0;
  }

  // A block's colour argument: a menu name, a number, or "#rrggbb".
  function toColor(value) {
    if (typeof value === "number") return value | 0;
    const s = String(value == null ? "" : value).trim();
    const k = s.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(COLORS, k)) return COLORS[k];
    if (/^#[0-9a-f]{6}$/i.test(s)) return parseInt(s.slice(1), 16);
    return (Number(s) || 0) | 0;
  }

  // base/math.ts isin (FastLED's 8-bit sine): 0..255 in, 0..255 out.
  const B_M16 = [0, 49, 49, 41, 90, 27, 117, 10];
  function isin(theta) {
    let offset = theta;
    if (theta & 0x40) offset = 255 - offset;
    offset &= 0x3f;
    let secoffset = offset & 0x0f;
    if (theta & 0x40) secoffset++;
    const s2 = (offset >> 4) * 2;
    let y = ((B_M16[s2 + 1] * secoffset) >> 4) + B_M16[s2];
    if (theta & 0x80) y = -y;
    return y + 128;
  }

  const randomRange = (min, max) =>
    min + Math.floor(Math.random() * (max - min + 1));
  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

  // ---- control.AnimationQueue (libs/base/control.ts) ------------------
  //
  // One runner at a time: a second runUntilDone waits for the first; cancel()
  // stops the running one AND every caller waiting behind it (they captured
  // the old generation), exactly as the notify-event version does.
  class AnimationQueue {
    constructor(interval) {
      this.interval = interval;
      this.running = false;
      this.generation = 0;
      this.waiters = [];
    }
    async runUntilDone(render) {
      const gen = this.generation;
      if (this.running)
        await new Promise((resolve) => this.waiters.push(resolve));
      if (gen !== this.generation) return;
      this.running = true;
      while (this.running && gen === this.generation && (await render())) {
        await sleep(this.interval);
      }
      if (gen !== this.generation) return;
      this.running = false;
      const next = this.waiters.shift();
      if (next) next();
    }
    cancel() {
      if (!this.running) return;
      this.running = false;
      this.generation++;
      const waiting = this.waiters.splice(0);
      waiting.forEach((resolve) => resolve());
    }
  }

  // ---- the onboard ring (libs/light/neopixel.ts NeoPixelStrip) --------
  class Ring {
    constructor(onShow) {
      this.length = NUM_PIXELS;
      this.buf = new Array(NUM_PIXELS).fill(0); // unscaled 0xRRGGBB
      this.brightness = DEFAULT_BRIGHTNESS;
      this.buffered = false;
      this.barHigh = 0;
      this.barHighLast = 0;
      this.queue = null;
      this.lastAnimation = null;
      this.lastRenderer = null;
      this.onShow = onShow;
    }
    // What the LEDs emit: each channel scaled by brightness, as show() sends.
    // At full brightness show() sends the buffer as it is, unscaled; only
    // below it is each channel scaled by brightness >> 8 (so 255 stays 255,
    // not 254). Found by holding the ring against pxt-adafruit's simulator.
    shown() {
      if (this.brightness === 0xff) return this.buf.slice();
      return this.buf.map((c) =>
        rgb(
          (unpackR(c) * this.brightness) >> 8,
          (unpackG(c) * this.brightness) >> 8,
          (unpackB(c) * this.brightness) >> 8
        )
      );
    }
    show() {
      this.onShow(this);
    }
    autoShow() {
      if (!this.buffered) this.show();
    }
    setAll(c) {
      c |= 0;
      this.buf.fill(rgb(unpackR(c), unpackG(c), unpackB(c)));
      this.autoShow();
    }
    setGradient(start, end) {
      const n1 = this.length - 1;
      for (let i = 0; i < this.length; ++i) {
        const x = i / n1;
        const ox = 1 - x;
        this.buf[i] = rgb(
          (unpackR(start) * ox + unpackR(end) * x) | 0,
          (unpackG(start) * ox + unpackG(end) * x) | 0,
          (unpackB(start) * ox + unpackB(end) * x) | 0
        );
      }
      this.autoShow();
    }
    graph(value, high) {
      value = Math.abs(value);
      const now = Date.now();
      if (high > 0) {
        this.barHigh = high;
      } else if (value > this.barHigh || now - this.barHighLast > 10000) {
        this.barHigh = value;
        this.barHighLast = now;
      }
      const wasBuffered = this.buffered;
      this.buffered = true;
      const n = this.length;
      const nhalf = n / 2;
      const v = Math.round((value * n) / this.barHigh);
      if (v === 0) {
        this.setAll(0);
      } else {
        for (let i = 0; i < n; ++i) {
          if (i + 1 <= v) {
            if (i < nhalf) {
              const b = ((i * 255) / nhalf) >> 0;
              this.setPixelColor(i, rgb(0, b, 255 - b));
            } else {
              const b = (((i - nhalf) * 255) / nhalf) >> 0;
              this.setPixelColor(i, rgb(b, 255 - b, 0));
            }
          } else {
            this.setPixelColor(i, 0);
          }
        }
      }
      this.show();
      this.buffered = wasBuffered;
    }
    setPixelColor(index, c) {
      index |= 0;
      c |= 0;
      if (index < 0 || index >= this.length) return;
      this.buf[index] = rgb(unpackR(c), unpackG(c), unpackB(c));
      this.autoShow();
    }
    pixelColor(index) {
      index |= 0;
      if (index < 0 || index >= this.length) return 0;
      return this.buf[index];
    }
    clear() {
      this.buf.fill(0);
      this.autoShow();
    }
    setBrightness(value) {
      const b = Math.max(0, Math.min(0xff, value | 0));
      if (b !== this.brightness) {
        this.brightness = b;
        this.autoShow();
      }
    }
    queueAnimation(render) {
      if (!this.queue) {
        this.queue = new AnimationQueue(ANIMATION_INTERVAL);
        this.lastAnimation = null;
        this.lastRenderer = null;
      }
      return this.queue.runUntilDone(render);
    }
    showAnimation(name, duration) {
      let renderer = this.lastRenderer;
      if (!renderer || this.lastAnimation !== name) {
        renderer = createRenderer(name, this);
        if (!renderer) return Promise.resolve();
      }
      let start = -1;
      return this.queueAnimation(async () => {
        this.lastAnimation = name;
        this.lastRenderer = renderer;
        if (start < 0) start = Date.now();
        const now = Date.now() - start;
        const wasBuffered = this.buffered;
        this.buffered = true;
        const keep = renderer();
        this.buffered = wasBuffered;
        this.show();
        await sleep(1);
        return duration > 0 ? now <= duration : keep;
      });
    }
    showAnimationFrame(name) {
      let renderer = this.lastRenderer;
      if (!renderer || this.lastAnimation !== name) {
        this.lastAnimation = name;
        renderer = this.lastRenderer = createRenderer(name, this);
      }
      if (renderer) {
        const wasBuffered = this.buffered;
        this.buffered = true;
        renderer();
        this.buffered = wasBuffered;
        this.autoShow();
      }
    }
    // show ring: fewer than ten colours are written but never shown (the loop
    // ends without show(), as in pxt-adafruit 1.6.8), so they appear only on
    // the next show.
    showColors(leds, interval = 400) {
      const n = this.length;
      let temp = "";
      let i = 0;
      let pi = 0;
      return this.queueAnimation(async () => {
        const wasBuffered = this.buffered;
        this.buffered = true;
        let pauseFor = 0;
        while (i < leds.length) {
          const ch = leds.charAt(i++);
          const isSpace = ch === " " || ch === "\n" || ch === "\r";
          if (!isSpace) temp += ch;
          if ((isSpace || i === leds.length) && temp) {
            this.setPixelColor(pi++, parseColor(temp));
            temp = "";
            if (pi === n) {
              this.show();
              pauseFor = interval;
              pi = 0;
              break;
            }
          }
        }
        this.buffered = wasBuffered;
        if (pauseFor) await sleep(pauseFor);
        return i < leds.length;
      });
    }
    stopAllAnimations() {
      if (this.queue) {
        this.queue.cancel();
        this.lastAnimation = null;
        this.lastRenderer = null;
      }
    }
  }

  // The six NeoPixelAnimation renderers, keyed by the menu's name.
  function createRenderer(name, strip) {
    const l = strip.length;
    switch (name) {
      case "rainbow": {
        let hueOffset = 0;
        return () => {
          for (let i = 0; i < l; i++) {
            strip.setPixelColor(
              i,
              hsv(((i * 256) / (l - 1) + hueOffset) % 0xff, 0xff, 0xff)
            );
          }
          hueOffset += Math.ceil(128 / l);
          if (hueOffset >= 0xff) {
            hueOffset = 0;
            return false;
          }
          return true;
        };
      }
      case "runningLights": {
        const [red, green, blue] = [0xff, 0, 0];
        let iteration = 0;
        let step = 0;
        return () => {
          if (iteration < l * 2) {
            step++;
            for (let i = 0; i < l; i++) {
              const level = isin(i + step) * 127 + 128;
              strip.setPixelColor(
                i,
                rgb(
                  (level * red) / 255,
                  (level * green) / 255,
                  (level * blue) / 255
                )
              );
            }
            iteration++;
            return true;
          }
          step = 0;
          iteration = 0;
          return false;
        };
      }
      case "comet": {
        const [green, blue] = [0, 0xff];
        const spacing = (255 / l) >> 0;
        let step = 0;
        const offsets = [];
        for (let i = 0; i < l; i++) offsets[i] = spacing * i;
        return () => {
          for (let i = 0; i < l; i++) {
            offsets[i] = (offsets[i] + step * 2) % 255;
            strip.setPixelColor(i, rgb(255 - offsets[i], green, blue));
          }
          step++;
          if (step * 2 > 0xff) {
            step = 0;
            return false;
          }
          return true;
        };
      }
      case "sparkle": {
        const color = rgb(0xff, 0xff, 0xff);
        let count = 0;
        let pixel = -1;
        let pixelColor = 0;
        return () => {
          if (count === 0) strip.clear();
          if (pixel < 0) {
            pixel = randomRange(0, l - 1);
            pixelColor = strip.pixelColor(pixel);
            strip.setPixelColor(pixel, color);
          } else {
            strip.setPixelColor(pixel, pixelColor);
            pixel = -1;
          }
          count++;
          if (count > 50) {
            count = 0;
            return false;
          }
          return true;
        };
      }
      case "colorWipe": {
        const color = 0x0000ff;
        let i = 0;
        let reveal = true;
        return () => {
          if (i < l) {
            strip.setPixelColor(i, reveal ? color : 0);
            i++;
          } else {
            reveal = !reveal;
            i = 0;
            if (reveal) return false;
          }
          return true;
        };
      }
      case "theaterChase": {
        const color = rgb(0xff, 0, 0);
        let j = 0;
        let q = 0;
        let on = false;
        return () => {
          if (j < 10) {
            if (q < 3) {
              for (let i = 0; i < l; i += 3)
                strip.setPixelColor(i + q, on ? color : 0);
              on = !on;
              q++;
            } else {
              q = 0;
            }
            j++;
            return true;
          }
          j = 0;
          return false;
        };
      }
      default:
        return null;
    }
  }

  // ---- an analog sensor with thresholds (common-sim AnalogSensorState) --
  class AnalogSensor {
    constructor(min, max) {
      this.min = min;
      this.max = max;
      this.low = 64;
      this.high = 192;
      this.state = "normal";
      this.level = Math.ceil((max - min) / 2);
    }
    clamp(v) {
      return Math.max(this.min, Math.min(this.max, v));
    }
    // Returns "high" / "low" when the level crosses into that band (the DAL
    // event), else null.
    setLevel(v) {
      this.level = this.clamp(v);
      const next =
        this.level >= this.high
          ? "high"
          : this.level <= this.low
            ? "low"
            : "normal";
      if (next === this.state) return null;
      this.state = next;
      return next === "normal" ? null : next;
    }
    setLow(v) {
      this.low = this.clamp(v);
      this.high = Math.max(this.low + 1, this.high);
    }
    setHigh(v) {
      this.high = this.clamp(v);
      this.low = Math.min(this.high - 1, this.low);
    }
  }

  class CircuitPlayground {
    constructor(runtime) {
      this._runtime = runtime || (Scratch.vm ? Scratch.vm.runtime : null);
      this._reset();
      const rt = this._runtime;
      if (rt && rt.on) {
        rt.on("PROJECT_STOP_ALL", () => this._stop());
        rt.on("PROJECT_START", () => {
          this._stop();
          this._registerTemperatureHats();
        });
      }
      // The pane's handle: it reads `state` and drives the board's inputs.
      if (rt) rt.bwCpx = this;
    }

    _reset() {
      this.ring = new Ring(() => this._publish());
      this.light = new AnalogSensor(0, 255);
      this.thermometer = new AnalogSensor(-5, 50);
      this.microphone = new AnalogSensor(0, 255);
      this.buttons = {};
      for (const name of [...BUTTONS, ...TOUCH_PADS]) {
        this.buttons[name] = {
          pressed: false,
          wasPressed: false,
          pressedAt: -1,
        };
      }
      this.switchRight = false;
      this.accel = { x: 0, y: 0, z: -1023 };
      this._bpm = 120;
      this.volume = 128;
      this.tone = null; // {frequency, until} while sounding
      this.soundQueue = new AnimationQueue(1);
      this.toneLog = []; // [{at, frequency, ms}], newest last (pane and tests)
      this._publish();
    }

    // Stop whatever the board was doing; the board's inputs keep their state,
    // as a real board's do when the program restarts.
    _stop() {
      this.ring.stopAllAnimations();
      this.soundQueue.cancel();
      this.ring.buf.fill(0);
      this.ring.brightness = DEFAULT_BRIGHTNESS;
      this.tone = null;
      this._bpm = 120;
      this._publish();
    }

    get state() {
      return {
        pixels: this.ring.buf.slice(),
        shown: this.ring.shown(),
        brightness: this.ring.brightness,
        buttons: Object.fromEntries(
          Object.entries(this.buttons).map(([k, v]) => [k, v.pressed])
        ),
        switchRight: this.switchRight,
        accel: { ...this.accel },
        lightLevel: this.light.level,
        temperature: this.thermometer.level,
        soundLevel: this.microphone.level,
        tone: this.tone ? this.tone.frequency : 0,
        tempo: this._bpm,
        volume: this.volume,
      };
    }

    // MakeCode sets a temperature threshold when onTemperatureConditionChanged
    // REGISTERS, at program start; a Scratch hat runs only once started, so
    // its threshold is applied here, before any reading can cross it.
    _registerTemperatureHats() {
      const rt = this._runtime;
      if (!rt || !rt.targets) return;
      const numberOf = (blocks, input) => {
        const shadow = input && blocks.getBlock(input.shadow || input.block);
        const f =
          shadow && shadow.fields && (shadow.fields.NUM || shadow.fields.TEXT);
        return f ? Number(f.value) : NaN;
      };
      for (const target of rt.targets) {
        const blocks = target.blocks;
        for (const id of Object.keys(blocks._blocks || {})) {
          const b = blocks.getBlock(id);
          if (!b || b.opcode !== "circuitplayground_whentemperature") continue;
          const t = numberOf(blocks, b.inputs.TEMPERATURE);
          if (!Number.isFinite(t)) continue;
          this.whentemperature({
            CONDITION: b.fields.CONDITION && b.fields.CONDITION.value,
            TEMPERATURE: t,
            UNIT: b.fields.UNIT && b.fields.UNIT.value,
          });
        }
      }
    }

    _publish() {
      const rt = this._runtime;
      if (rt) {
        rt.bwCpxState = this.state;
        if (rt.emit) rt.emit("CPX_STATE", rt.bwCpxState);
      }
    }

    _hats(opcode, fields) {
      const rt = this._runtime;
      if (rt && rt.startHats)
        rt.startHats("circuitplayground_" + opcode, fields);
    }

    // ---- inputs, driven by the device pane (or a test) ----------------
    setButton(name, down) {
      const b = this.buttons[name];
      if (!b || b.pressed === !!down) return;
      b.pressed = !!down;
      const isTouch = TOUCH_PADS.includes(name);
      const hat = isTouch ? "whentouch" : "whenbutton";
      const key = isTouch ? "PAD" : "BUTTON";
      if (down) {
        b.wasPressed = true;
        b.pressedAt = Date.now();
        this._hats(hat, { [key]: name, EVENT: "down" });
      } else if (b.pressedAt !== -1) {
        this._hats(hat, { [key]: name, EVENT: "up" });
        const held = Date.now() - b.pressedAt;
        this._hats(hat, {
          [key]: name,
          EVENT: held >= LONG_CLICK_MS ? "longClick" : "click",
        });
      }
      this._publish();
    }
    setSwitch(right) {
      if (this.switchRight === !!right) return;
      this.switchRight = !!right;
      this._hats("whenswitch", { DIRECTION: right ? "right" : "left" });
      this._publish();
    }
    setAcceleration(x, y, z) {
      this.accel = { x: x | 0, y: y | 0, z: z | 0 };
      this._publish();
    }
    gesture(name) {
      if (Object.prototype.hasOwnProperty.call(GESTURES, name))
        this._hats("whengesture", { GESTURE: name });
    }
    setLightLevel(v) {
      const crossed = this.light.setLevel(v);
      if (crossed)
        this._hats("whenlight", {
          CONDITION: crossed === "low" ? "dark" : "bright",
        });
      this._publish();
    }
    setTemperature(celsius) {
      const crossed = this.thermometer.setLevel(celsius);
      if (crossed)
        this._hats("whentemperature", {
          CONDITION: crossed === "high" ? "hot" : "cold",
        });
      this._publish();
    }
    setSoundLevel(v) {
      const crossed = this.microphone.setLevel(v);
      if (crossed === "high") this._hats("whenloudsound", {});
      this._publish();
    }

    // ---- audio -------------------------------------------------------
    async _playTone(frequency, ms) {
      frequency = frequency | 0;
      ms = ms | 0;
      this.toneLog.push({ at: Date.now(), frequency, ms });
      if (this.toneLog.length > 256) this.toneLog.shift();
      this.tone = frequency > 0 ? { frequency } : null;
      this._publish();
      this._sound(frequency, ms);
      if (ms > 0) {
        await sleep(ms);
        this.tone = null;
        this._publish();
      }
    }
    // A square wave while a tone sounds, where the host has Web Audio; the
    // tone itself is state either way.
    _sound(frequency, ms) {
      const Ctx = typeof AudioContext !== "undefined" ? AudioContext : null;
      if (!Ctx) return;
      try {
        if (!this._audio) this._audio = new Ctx();
        if (this._osc) {
          this._osc.stop();
          this._osc = null;
        }
        if (frequency <= 0) return;
        const osc = this._audio.createOscillator();
        const gain = this._audio.createGain();
        osc.type = "square";
        osc.frequency.value = frequency;
        gain.gain.value = (this.volume / 255) * 0.2;
        osc.connect(gain).connect(this._audio.destination);
        osc.start();
        if (ms > 0) osc.stop(this._audio.currentTime + ms / 1000);
        this._osc = osc;
      } catch (e) {
        // No audio output is not an error for the program.
      }
    }
    _beatMs(fraction) {
      let beat = 60000 / this._bpm;
      const f = BEATS[String(fraction).toLowerCase()] || 1;
      if (f === 2) beat /= 2;
      else if (f === 4) beat /= 4;
      else if (f === 8) beat /= 8;
      else if (f === 16) beat /= 16;
      else if (f === 32) beat *= 2;
      else if (f === 64) beat *= 4;
      return beat >> 0;
    }
    // melodies.ts Melody.playNextNote, one note per call.
    _melody(notes) {
      let pos = 0;
      let duration = 4;
      let octave = 4;
      let tempo = 120;
      const isWs = (c) => c === " " || c === "\r" || c === "\n" || c === "\t";
      return async () => {
        while (pos < notes.length && isWs(notes[pos])) pos++;
        let current = "";
        while (pos < notes.length && !isWs(notes[pos])) current += notes[pos++];
        if (!current) return false;
        let note = 0;
        let rest = false;
        let token = "";
        let kind = "note";
        const consume = () => {
          if (token && kind !== "note") {
            const d = parseInt(token);
            if (kind === "octave") octave = d;
            else if (kind === "beat") duration = Math.max(1, Math.min(16, d));
            else if (kind === "tempo") tempo = Math.max(1, d);
            token = "";
          }
        };
        for (const ch of current) {
          switch (ch) {
            case "c": case "C": note = 1; break;
            case "d": case "D": note = 3; break;
            case "e": case "E": note = 5; break;
            case "f": case "F": note = 6; break;
            case "g": case "G": note = 8; break;
            case "a": case "A": note = 10; break;
            case "b": case "B": note = 12; break; // so 'b' is never a flat
            case "r": case "R": rest = true; break;
            case "#": note++; break;
            case ":": consume(); kind = "beat"; break;
            case "-": consume(); kind = "tempo"; break;
            default:
              if (kind === "note") kind = "octave";
              token += ch;
          } // prettier-ignore
        }
        consume();
        const beat = 15000 / tempo;
        if (rest) await this._playTone(0, Math.max(duration * beat, 20));
        else
          await this._playTone(
            FREQ_TABLE[note + 12 * (octave - 1)] || 0,
            duration * beat
          );
        return pos < notes.length;
      };
    }

    getInfo() {
      const menu = (list, acceptReporters) => ({
        acceptReporters: !!acceptReporters,
        items: list,
      });
      const items = (map) =>
        Object.entries(map).map(([value, text]) => ({ text, value }));
      const num = (d) => ({
        type: Scratch.ArgumentType.NUMBER,
        defaultValue: d,
      });
      const str = (d) => ({
        type: Scratch.ArgumentType.STRING,
        defaultValue: d,
      });
      const field = (m, d) => ({
        type: Scratch.ArgumentType.STRING,
        menu: m,
        defaultValue: d,
      });
      const color = (d) => ({
        type: Scratch.ArgumentType.STRING,
        menu: "colors",
        defaultValue: d,
      });
      const B = Scratch.BlockType;
      return {
        id: "circuitplayground",
        name: "Circuit Playground",
        color1: "#C0168C",
        color2: "#A3127A",
        color3: "#860F65",
        blocks: [
          "---",
          { opcode: "setall", blockType: B.COMMAND, text: "set all pixels to [COLOR]", arguments: { COLOR: color("red") } },
          { opcode: "setpixel", blockType: B.COMMAND, text: "set pixel [INDEX] to [COLOR]", arguments: { INDEX: num(0), COLOR: color("red") } },
          { opcode: "pixelcolor", blockType: B.REPORTER, text: "pixel color at [INDEX]", arguments: { INDEX: num(0) } },
          { opcode: "setgradient", blockType: B.COMMAND, text: "set gradient from [START] to [END]", arguments: { START: color("red"), END: color("blue") } },
          { opcode: "graph", blockType: B.COMMAND, text: "graph [VALUE] up to [HIGH]", arguments: { VALUE: num(0), HIGH: num(0) } },
          { opcode: "showring", blockType: B.COMMAND, text: "show ring [COLORS]", arguments: { COLORS: str("red red red red red green green green green green") } },
          { opcode: "setbrightness", blockType: B.COMMAND, text: "set brightness [BRIGHTNESS]", arguments: { BRIGHTNESS: num(20) } },
          { opcode: "clearpixels", blockType: B.COMMAND, text: "clear pixels" },
          { opcode: "showanimation", blockType: B.COMMAND, text: "show animation [ANIMATION] for [MS] ms", arguments: { ANIMATION: field("animations", "rainbow"), MS: num(500) } },
          { opcode: "showanimationframe", blockType: B.COMMAND, text: "show frame of [ANIMATION] animation", arguments: { ANIMATION: field("animations", "rainbow") } },
          { opcode: "stopanimations", blockType: B.COMMAND, text: "stop all animations" },
          { opcode: "rgb", blockType: B.REPORTER, text: "red [R] green [G] blue [B]", arguments: { R: num(255), G: num(255), B: num(255) } },
          { opcode: "hsv", blockType: B.REPORTER, text: "hue [H] sat [S] val [V]", arguments: { H: num(255), S: num(255), V: num(255) } },
          { opcode: "color", blockType: B.REPORTER, text: "color [COLOR]", arguments: { COLOR: field("colorNames", "red") } },
          { opcode: "fade", blockType: B.REPORTER, text: "fade [COLOR] by [BRIGHTNESS]", arguments: { COLOR: color("red"), BRIGHTNESS: num(128) } },
          "---",
          { opcode: "whenbutton", blockType: B.HAT, isEdgeActivated: false, text: "when button [BUTTON] [EVENT]", arguments: { BUTTON: field("buttons", "A"), EVENT: field("buttonEvents", "click") } },
          { opcode: "isbuttonpressed", blockType: B.BOOLEAN, text: "button [BUTTON] is pressed", arguments: { BUTTON: field("buttons", "A") } },
          { opcode: "wasbuttonpressed", blockType: B.BOOLEAN, text: "button [BUTTON] was pressed", arguments: { BUTTON: field("buttons", "A") } },
          { opcode: "whenswitch", blockType: B.HAT, isEdgeActivated: false, text: "when switch moved [DIRECTION]", arguments: { DIRECTION: field("directions", "left") } },
          { opcode: "isswitchright", blockType: B.BOOLEAN, text: "switch right" },
          { opcode: "whentouch", blockType: B.HAT, isEdgeActivated: false, text: "when touch [PAD] [EVENT]", arguments: { PAD: field("touchPads", "A1"), EVENT: field("buttonEvents", "click") } },
          { opcode: "istouchpressed", blockType: B.BOOLEAN, text: "touch [PAD] is pressed", arguments: { PAD: field("touchPads", "A1") } },
          "---",
          { opcode: "whengesture", blockType: B.HAT, isEdgeActivated: false, text: "when [GESTURE]", arguments: { GESTURE: field("gestures", "shake") } },
          { opcode: "acceleration", blockType: B.REPORTER, text: "acceleration (mg) [DIMENSION]", arguments: { DIMENSION: field("dimensions", "x") } },
          { opcode: "rotation", blockType: B.REPORTER, text: "rotation (°) [KIND]", arguments: { KIND: field("rotations", "pitch") } },
          { opcode: "lightlevel", blockType: B.REPORTER, text: "light level" },
          { opcode: "whenlight", blockType: B.HAT, isEdgeActivated: false, text: "when light [CONDITION]", arguments: { CONDITION: field("lightConditions", "dark") } },
          { opcode: "setlightthreshold", blockType: B.COMMAND, text: "set [CONDITION] light threshold to [VALUE]", arguments: { CONDITION: field("lightConditions", "dark"), VALUE: num(64) } },
          { opcode: "temperature", blockType: B.REPORTER, text: "temperature in [UNIT]", arguments: { UNIT: field("units", "C") } },
          { opcode: "whentemperature", blockType: B.HAT, isEdgeActivated: false, text: "when temperature [CONDITION] at [TEMPERATURE] [UNIT]", arguments: { CONDITION: field("temperatureConditions", "hot"), TEMPERATURE: num(30), UNIT: field("units", "C") } },
          { opcode: "soundlevel", blockType: B.REPORTER, text: "sound level" },
          { opcode: "whenloudsound", blockType: B.HAT, isEdgeActivated: false, text: "when loud sound" },
          { opcode: "setloudthreshold", blockType: B.COMMAND, text: "set loud sound threshold [VALUE]", arguments: { VALUE: num(192) } },
          "---",
          { opcode: "playtone", blockType: B.COMMAND, text: "play tone at [FREQUENCY] Hz for [MS] ms", arguments: { FREQUENCY: num(262), MS: num(500) } },
          { opcode: "ringtone", blockType: B.COMMAND, text: "ring tone at [FREQUENCY] Hz", arguments: { FREQUENCY: num(262) } },
          { opcode: "rest", blockType: B.COMMAND, text: "rest for [MS] ms", arguments: { MS: num(500) } },
          { opcode: "note", blockType: B.REPORTER, text: "note [NOTE]", arguments: { NOTE: field("notes", "C") } },
          { opcode: "beat", blockType: B.REPORTER, text: "[FRACTION] beat", arguments: { FRACTION: field("beats", "whole") } },
          { opcode: "tempo", blockType: B.REPORTER, text: "tempo (bpm)" },
          { opcode: "settempo", blockType: B.COMMAND, text: "set tempo to [BPM] bpm", arguments: { BPM: num(120) } },
          { opcode: "changetempo", blockType: B.COMMAND, text: "change tempo by [BPM] bpm", arguments: { BPM: num(20) } },
          { opcode: "playsound", blockType: B.COMMAND, text: "play sound [SOUND]", arguments: { SOUND: field("sounds", "powerUp") } },
          { opcode: "playsounduntildone", blockType: B.COMMAND, text: "play sound [SOUND] until done", arguments: { SOUND: field("sounds", "powerUp") } },
          { opcode: "stopsounds", blockType: B.COMMAND, text: "stop all sounds" },
          { opcode: "setvolume", blockType: B.COMMAND, text: "set volume [VOLUME]", arguments: { VOLUME: num(128) } },
        ],
        menus: {
          colors: menu(Object.keys(COLORS), true),
          colorNames: menu(Object.keys(COLORS)),
          animations: menu(items(ANIMATIONS)),
          buttons: menu(BUTTONS),
          buttonEvents: menu(items(BUTTON_EVENTS)),
          touchPads: menu(TOUCH_PADS),
          directions: menu(["left", "right"]),
          gestures: menu(items(GESTURES)),
          dimensions: menu(["x", "y", "z", "strength"]),
          rotations: menu(["pitch", "roll"]),
          lightConditions: menu(["dark", "bright"]),
          temperatureConditions: menu(["hot", "cold"]),
          units: menu(items(UNITS)),
          notes: menu(Object.keys(NOTES)),
          beats: menu(Object.keys(BEATS)),
          sounds: menu(items(SOUND_NAMES)),
        },
      }; // prettier-ignore
    }

    // ---- ring ---------------------------------------------------------
    setall({ COLOR }) {
      this.ring.setAll(toColor(COLOR));
    }
    setpixel({ INDEX, COLOR }) {
      this.ring.setPixelColor(Number(INDEX), toColor(COLOR));
    }
    pixelcolor({ INDEX }) {
      return this.ring.pixelColor(Number(INDEX));
    }
    setgradient({ START, END }) {
      this.ring.setGradient(toColor(START), toColor(END));
    }
    graph({ VALUE, HIGH }) {
      this.ring.graph(Number(VALUE) || 0, Number(HIGH) || 0);
    }
    showring({ COLORS }) {
      return this.ring.showColors(String(COLORS));
    }
    setbrightness({ BRIGHTNESS }) {
      this.ring.setBrightness(Number(BRIGHTNESS) || 0);
    }
    clearpixels() {
      this.ring.clear();
    }
    showanimation({ ANIMATION, MS }) {
      return this.ring.showAnimation(String(ANIMATION), Number(MS) || 0);
    }
    showanimationframe({ ANIMATION }) {
      this.ring.showAnimationFrame(String(ANIMATION));
    }
    stopanimations() {
      this.ring.stopAllAnimations();
    }
    rgb({ R, G, B }) {
      return rgb(Number(R), Number(G), Number(B));
    }
    hsv({ H, S, V }) {
      return hsv(Number(H), Number(S), Number(V));
    }
    color({ COLOR }) {
      return toColor(COLOR);
    }
    fade({ COLOR, BRIGHTNESS }) {
      return fade(toColor(COLOR), Number(BRIGHTNESS) || 0);
    }

    // ---- buttons, switch, touch (hats are started by the input API) ----
    whenbutton() {
      return true;
    }
    isbuttonpressed({ BUTTON }) {
      const b = this.buttons[BUTTON];
      return !!(b && b.pressed);
    }
    wasbuttonpressed({ BUTTON }) {
      const b = this.buttons[BUTTON];
      if (!b) return false;
      const was = b.wasPressed;
      b.wasPressed = false;
      return was;
    }
    whenswitch() {
      return true;
    }
    isswitchright() {
      return this.switchRight;
    }
    whentouch() {
      return true;
    }
    istouchpressed({ PAD }) {
      const b = this.buttons[PAD];
      return !!(b && b.pressed);
    }

    // ---- motion and sensors --------------------------------------------
    whengesture() {
      return true;
    }
    acceleration({ DIMENSION }) {
      const { x, y, z } = this.accel;
      if (DIMENSION === "strength")
        return Math.floor(Math.sqrt(x * x + y * y + z * z));
      return this.accel[DIMENSION] | 0;
    }
    // common-sim Accelerometer.recalculatePitchRoll / getPitch / getRoll. Its
    // getX/Y/Z fall through every coordinate-system case to the raw sample.
    rotation({ KIND }) {
      const { x, y, z } = this.accel;
      const roll = Math.atan2(y, z);
      const pitch = Math.atan(-x / (y * Math.sin(roll) + z * Math.cos(roll)));
      const deg = (r) => Math.floor((360 * r) / (2 * Math.PI));
      return KIND === "roll" ? deg(roll) : deg(pitch);
    }
    lightlevel() {
      return this.light.level;
    }
    whenlight() {
      return true;
    }
    setlightthreshold({ CONDITION, VALUE }) {
      if (CONDITION === "dark") this.light.setLow(Number(VALUE) || 0);
      else this.light.setHigh(Number(VALUE) || 0);
    }
    temperature({ UNIT }) {
      const c = this.thermometer.level;
      return UNIT === "F" ? ((c * 18) / 10 + 32) >> 0 : c;
    }
    whentemperature({ CONDITION, TEMPERATURE, UNIT }) {
      const t = Number(TEMPERATURE) || 0;
      const c = UNIT === "F" ? (((t - 32) * 10) / 18) >> 0 : t;
      if (CONDITION === "hot") this.thermometer.setHigh(c);
      else this.thermometer.setLow(c);
      return true;
    }
    soundlevel() {
      return this.microphone.level;
    }
    whenloudsound() {
      return true;
    }
    setloudthreshold({ VALUE }) {
      this.microphone.setHigh(Number(VALUE) || 0);
    }

    // ---- music ----------------------------------------------------------
    playtone({ FREQUENCY, MS }) {
      return this._playTone(Number(FREQUENCY) || 0, Number(MS) || 0);
    }
    ringtone({ FREQUENCY }) {
      return this._playTone(Number(FREQUENCY) || 0, 0);
    }
    rest({ MS }) {
      return this._playTone(0, Math.max(Number(MS) || 0, 20));
    }
    note({ NOTE }) {
      return NOTES[NOTE] || 0;
    }
    beat({ FRACTION }) {
      return this._beatMs(FRACTION);
    }
    tempo() {
      return this._bpm;
    }
    settempo({ BPM }) {
      const bpm = Number(BPM) || 0;
      if (bpm > 0) this._bpm = Math.max(1, bpm >> 0);
    }
    changetempo({ BPM }) {
      this.settempo({ BPM: this._bpm + (Number(BPM) || 0) });
    }
    playsound({ SOUND }) {
      const melody = this._melody(SOUNDS[SOUND] || "");
      this.soundQueue.cancel();
      this.soundQueue.runUntilDone(melody);
      return sleep(1);
    }
    playsounduntildone({ SOUND }) {
      return this.soundQueue.runUntilDone(this._melody(SOUNDS[SOUND] || ""));
    }
    stopsounds() {
      this.soundQueue.cancel();
      return this._playTone(0, 20);
    }
    setvolume({ VOLUME }) {
      this.volume = Math.max(0, Math.min(255, Number(VOLUME) | 0));
      this._publish();
    }
  }

  Scratch.extensions.register(
    new CircuitPlayground(Scratch.vm ? Scratch.vm.runtime : null)
  );
})(Scratch);
