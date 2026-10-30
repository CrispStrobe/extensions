// Name: Carnival Games
// ID: carnival
// Description: Countdown and timer games with saved best scores, plus throwable balls with aim and power, ported from the MakeCode Arcade Carnival extension.
// By: Microsoft Corporation
// By: CrispStrobe <https://github.com/CrispStrobe>
// Original: Microsoft (arcade-carnival)
// License: MIT

// Derived from microsoft/arcade-carnival at commit
// 915caca4a2d83a7071df59407a9987992c083750 (carnival.ts), MIT licensed:
//
//     MIT License
//
//     Copyright (c) Microsoft Corporation.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the
//     "Software"), to deal in the Software without restriction, including
//     without limitation the rights to use, copy, modify, merge, publish,
//     distribute, sublicense, and/or sell copies of the Software, and to
//     permit persons to whom the Software is furnished to do so, subject to
//     the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//     MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//     IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//     CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//     TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//     SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// Scratch-native port. Arcade measures in pixels of a 160x120 screen; the
// stage is three times that, so ball power, gravity and wind keep their
// Arcade numbers and are scaled by 3 on the stage. See
// docs/CrispStrobe/carnival.md for the list of what was adapted and what was
// skipped. The licence texts of all MakeCode ports are collected in
// licenses/makecode-extensions.MIT.txt.

// Block text is English-only, as in the other CrispStrobe extensions of this
// gallery (see microbitplus.js for the reasoning).
/* eslint-disable extension/should-translate */

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Carnival Games must run unsandboxed");
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const Cast = Scratch.Cast;

  const MYSELF = "_myself_";
  const STAGE_W = 480;
  const STAGE_H = 360;
  // Stage units per Arcade pixel.
  const SCALE = 3;
  const KEY_PREFIX = "bwext.carnival.v1:";
  const DEFAULT_GAME = "default";

  const num = (v) => {
    const n = Cast.toNumber(v);
    return Number.isFinite(n) ? n : 0;
  };
  const renderer = () => runtime.renderer || null;
  const exists = (target) =>
    !!target && !target.isStage && runtime.targets.indexOf(target) !== -1;
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const hexColor = (v, fallback) => {
    const s = Cast.toString(v).trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback;
  };

  const resolve = (name, util) => {
    const key = Cast.toString(name);
    if (key === MYSELF) return util.target;
    if (typeof runtime.getSpriteTargetByName === "function") {
      return runtime.getSpriteTargetByName(key) || null;
    }
    return (
      runtime.targets.find((t) => t.isOriginal && t.getName() === key) || null
    );
  };

  const spriteMenu = () => {
    const items = [{ text: "myself", value: MYSELF }];
    for (const t of runtime.targets) {
      if (t.isOriginal && !t.isStage) {
        items.push({ text: t.getName(), value: t.getName() });
      }
    }
    return items;
  };

  // Saved scores ---------------------------------------------------------------

  let gameName = DEFAULT_GAME;
  const memory = new Map();
  let persistent = null;

  const storage = () => {
    if (persistent !== null) return persistent || null;
    try {
      const ls = globalThis.localStorage;
      const probe = KEY_PREFIX + "probe";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      persistent = ls;
    } catch (e) {
      persistent = false;
    }
    return persistent || null;
  };

  const fullKey = (name) => `${KEY_PREFIX}${gameName}:${name}`;

  const readSaved = (name) => {
    const key = fullKey(name);
    const ls = storage();
    if (ls) {
      try {
        const raw = ls.getItem(key);
        if (raw !== null) {
          const n = Number(raw);
          return Number.isFinite(n) ? n : undefined;
        }
      } catch (e) {
        // fall through to memory
      }
    }
    return memory.get(key);
  };

  const writeSaved = (name, value) => {
    const key = fullKey(name);
    const ls = storage();
    if (ls) {
      try {
        ls.setItem(key, String(value));
        memory.delete(key);
        return;
      } catch (e) {
        // quota or revoked: keep it for this session
      }
    }
    memory.set(key, value);
  };

  const forgetSaved = () => {
    for (const name of ["high-score", "low-score"]) {
      const key = fullKey(name);
      const ls = storage();
      if (ls) {
        try {
          ls.removeItem(key);
        } catch (e) {
          // ignore
        }
      }
      memory.delete(key);
    }
  };

  // Overlays -----------------------------------------------------------------

  /**
   * One SVG skin on one drawable that can be repainted. `ensure` makes it on
   * first use; a renderer that is missing or refuses leaves the overlay off
   * and the game logic untouched.
   */
  const makeOverlay = () => ({
    skinId: null,
    drawableId: null,
    svg: null,
    x: NaN,
    y: NaN,
    visible: false,
  });

  const paint = (o, svg, x, y, visible) => {
    const r = renderer();
    if (!r) return;
    try {
      if (visible) {
        if (o.skinId === null) {
          o.skinId = r.createSVGSkin(svg);
          o.drawableId = r.createDrawable("sprite");
          r.updateDrawableSkinId(o.drawableId, o.skinId);
          o.svg = svg;
          r.setDrawableOrder(o.drawableId, Infinity, "sprite");
        } else if (svg !== o.svg) {
          r.updateSVGSkin(o.skinId, svg);
          o.svg = svg;
        }
        if (x !== o.x || y !== o.y) {
          r.updateDrawablePosition(o.drawableId, [x, y]);
          o.x = x;
          o.y = y;
        }
      }
      if (o.drawableId !== null && visible !== o.visible) {
        r.updateDrawableVisible(o.drawableId, visible);
        if (visible) r.setDrawableOrder(o.drawableId, Infinity, "sprite");
      }
      o.visible = visible;
    } catch (e) {
      // keep going without the picture
    }
  };

  const dispose = (o) => {
    const r = renderer();
    if (r) {
      try {
        if (o.drawableId !== null) r.destroyDrawable(o.drawableId, "sprite");
        if (o.skinId !== null) r.destroySkin(o.skinId);
      } catch (e) {
        // already gone
      }
    }
    o.drawableId = null;
    o.skinId = null;
    o.svg = null;
    o.x = NaN;
    o.y = NaN;
    o.visible = false;
  };

  const hud = makeOverlay();
  const dialog = makeOverlay();
  const traceLayer = makeOverlay();
  /** @type {Array<ReturnType<typeof makeOverlay>>} */
  let labels = [];

  const pad2 = (n) => String(Math.trunc(n)).padStart(2, "0");

  // Arcade's drawTimer text: "SS.cc" under a minute, "M:SS" after.
  const formatClock = (ms) => {
    ms = Math.max(0, Math.trunc(ms));
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60)
      return `${pad2(seconds)}.${pad2(Math.floor((ms % 1000) / 10))}`;
    return `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;
  };

  const hudSvg = (text) => {
    const w = 96;
    const h = 30;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#ff93c4"/>` +
      `<rect x="3" y="0" width="${w - 6}" height="${h - 3}" fill="#ffffff"/>` +
      `<text x="${w / 2}" y="21" font-family="monospace" font-weight="bold" font-size="22" text-anchor="middle" fill="#ff93c4">${esc(text)}</text>` +
      `</svg>`
    );
  };

  // Game state ---------------------------------------------------------------

  const state = {
    score: 0,
    timerStart: null, // ms epoch, count-up timer
    timerShown: true,
    countdownEnd: null, // ms epoch
    countdownWin: "nothing",
    countdownFired: false,
    countdownDone: false, // level flag for the hat
    projectStart: Date.now(),
    over: false,
  };

  const WIN_TYPES = {
    win: { scoring: "high", message: "You Win!" },
    score: { scoring: "high", message: "Great Score!" },
    time: { scoring: "lowTime", message: "Great Time!" },
  };

  const timeElapsedSeconds = () => {
    const from =
      state.timerStart !== null ? state.timerStart : state.projectStart;
    return Math.floor((Date.now() - from) / 1000);
  };

  // Mirrors newGameOver: pick the scoring rule, compare with the saved best,
  // save a new best, then show the dialog and stop the project.
  const gameOver = (kind, customMessage, scoring, customScore, util) => {
    if (state.over) return;
    let message = customMessage;
    let rule = scoring;
    let thisBest = state.score;
    let hasScore = true;
    if (kind === "lose") {
      message = "GAME OVER!";
      rule = "none";
    } else if (kind !== "custom") {
      const t = WIN_TYPES[kind];
      message = t.message;
      rule = t.scoring;
    }
    if (customScore !== undefined) thisBest = customScore;

    let bestScore = readSaved("high-score");
    if (bestScore === undefined) bestScore = 0;
    let newBest = false;

    if (rule === "high" || rule === "highTime") {
      if (rule === "highTime" && customScore === undefined)
        thisBest = timeElapsedSeconds();
      if (thisBest > bestScore) {
        newBest = true;
        bestScore = thisBest;
        writeSaved("high-score", thisBest);
      }
    } else if (rule === "low" || rule === "lowTime") {
      bestScore = readSaved("low-score");
      if (bestScore === undefined) bestScore = Infinity;
      if (rule === "lowTime" && customScore === undefined)
        thisBest = timeElapsedSeconds();
      if (thisBest < bestScore) {
        newBest = true;
        bestScore = thisBest;
        writeSaved("low-score", thisBest);
      }
    } else {
      hasScore = false;
    }
    if (newBest) state.score = thisBest;

    state.over = true;
    state.countdownEnd = null;
    const w = STAGE_W;
    const h = 138;
    let svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#ffffff"/>` +
      `<rect y="6" width="${w}" height="${h - 12}" fill="#000000" fill-opacity="0.92"/>` +
      `<text x="${w / 2}" y="40" font-family="monospace" font-weight="bold" font-size="28" text-anchor="middle" fill="#fff609">${esc(message)}</text>`;
    if (hasScore) {
      svg += `<text x="${w / 2}" y="76" font-family="monospace" font-weight="bold" font-size="24" text-anchor="middle" fill="#ff2121">Score:${esc(thisBest)}</text>`;
      svg += newBest
        ? `<text x="${w / 2}" y="108" font-family="monospace" font-size="18" text-anchor="middle" fill="#ff2121">New Best Score!</text>`
        : `<text x="${w / 2}" y="108" font-family="monospace" font-weight="bold" font-size="24" text-anchor="middle" fill="#ff2121">Best:${esc(bestScore)}</text>`;
    }
    svg += "</svg>";
    paint(dialog, svg, 0, 0, true);
    // The original resets the game once a button is pressed; here the dialog
    // stays up and all scripts stop until the green flag is clicked again.
    if (util && typeof util.stopAll === "function") util.stopAll();
    else if (typeof runtime.stopAll === "function") runtime.stopAll();
  };

  // Frame loop ---------------------------------------------------------------

  /** @type {Map<string, any>} */
  const balls = new Map();

  const newBall = () => ({
    angle: 10,
    power: 50,
    gravity: 20,
    wind: 0,
    angleRate: 3,
    powerRate: 3,
    iter: 0.4,
    trace: "off",
    traceColor: "#ffffff",
    flying: false,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    keys: false,
    vary: null,
    projectile: false,
  });

  const getBall = (target) => {
    let b = balls.get(target.id);
    if (!b) {
      b = newBall();
      balls.set(target.id, b);
    }
    return b;
  };

  const xComponent = (degree, magnitude) =>
    magnitude * Math.cos((degree * Math.PI) / 180);
  // Stage y points up, so the sign is the opposite of Arcade's yComponent.
  const yComponent = (degree, magnitude) =>
    magnitude * Math.sin((degree * Math.PI) / 180);

  const keyDown = (name) => {
    try {
      return !!runtime.ioDevices.keyboard.getKeyIsDown(name);
    } catch (e) {
      return false;
    }
  };

  const toss = (b) => {
    b.vx = xComponent(b.angle, b.power) * SCALE;
    b.vy = yComponent(b.angle, b.power) * SCALE;
    b.ax = b.wind * SCALE;
    b.ay = -b.gravity * SCALE;
    b.flying = true;
  };

  const offStage = (target) => {
    let bounds = null;
    try {
      bounds = target.getBounds();
    } catch (e) {
      bounds = null;
    }
    const b = bounds || {
      left: target.x,
      right: target.x,
      top: target.y,
      bottom: target.y,
    };
    return (
      b.right < -STAGE_W / 2 ||
      b.left > STAGE_W / 2 ||
      b.top < -STAGE_H / 2 ||
      b.bottom > STAGE_H / 2
    );
  };

  const traceSvg = () => {
    let shapes = "";
    for (const [id, b] of balls) {
      if (b.trace === "off" || b.flying) continue;
      const target = runtime.getTargetById(id);
      if (!exists(target)) continue;
      const px = (x) => (x + STAGE_W / 2).toFixed(1);
      const py = (y) => (STAGE_H / 2 - y).toFixed(1);
      if (b.trace === "cross") {
        let bounds = null;
        try {
          bounds = target.getBounds();
        } catch (e) {
          bounds = null;
        }
        const size = bounds
          ? Math.max(bounds.right - bounds.left, bounds.top - bounds.bottom)
          : 0;
        const dist = size + 3 * SCALE;
        const a = (b.angle * Math.PI) / 180;
        const cx = target.x + Math.cos(a) * dist;
        const cy = target.y + Math.sin(a) * dist;
        const r = 4.5 * SCALE;
        shapes +=
          `<g stroke="#ffffff" stroke-width="2" fill="none"><circle cx="${px(cx)}" cy="${py(cy)}" r="${r / 2}" stroke="#ff2121"/>` +
          `<path d="M${px(cx - r)} ${py(cy)}H${px(cx + r)}M${px(cx)} ${py(cy - r)}V${py(cy + r)}"/></g>`;
        continue;
      }
      const xComp = xComponent(b.angle, b.power) * SCALE;
      const yComp = yComponent(b.angle, b.power) * SCALE;
      let points = "";
      for (let i = 0.1; i < b.iter; i += i / 5) {
        const x = target.x + i * xComp + (i * i * b.wind * SCALE) / 2;
        const y = target.y + i * yComp - (i * i * b.gravity * SCALE) / 2;
        points += `<circle cx="${px(x)}" cy="${py(y)}" r="1.6" fill="${b.traceColor}"/>`;
      }
      shapes += points;
    }
    return shapes === ""
      ? null
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE_W}" height="${STAGE_H}" viewBox="0 0 ${STAGE_W} ${STAGE_H}">${shapes}</svg>`;
  };

  const tick = () => {
    const now = Date.now();
    const dt =
      runtime.currentStepTime > 0 ? runtime.currentStepTime / 1000 : 1 / 30;

    // Balls
    for (const [id, b] of Array.from(balls)) {
      const target = runtime.getTargetById(id);
      if (!exists(target)) {
        balls.delete(id);
        continue;
      }
      if (b.keys && !b.flying) {
        // Arcade runs this once per ~60 Hz update; scale to the real frame.
        const k = dt * 60;
        const dx =
          (keyDown("right arrow") ? 1 : 0) - (keyDown("left arrow") ? 1 : 0);
        const dy =
          (keyDown("down arrow") ? 1 : 0) - (keyDown("up arrow") ? 1 : 0);
        b.angle -= (dx * b.angleRate * k) / 2;
        b.power = Math.max(0, b.power - (dy * b.powerRate * k) / 2);
      }
      if (b.vary && !b.flying) {
        const v = b.vary;
        b.power =
          v.min +
          Math.abs(
            Math.sin((now - state.projectStart) / (90000 * (1 / v.speed)))
          ) *
            (v.max - v.min);
      }
      if (b.flying) {
        b.vx += b.ax * dt;
        b.vy += b.ay * dt;
        target.setXY(target.x + b.vx * dt, target.y + b.vy * dt, true);
        if (b.projectile && offStage(target)) {
          balls.delete(id);
          runtime.disposeTarget(target);
          runtime.stopForTarget(target);
        }
      }
    }
    const trace = traceSvg();
    if (trace !== null) paint(traceLayer, trace, 0, 0, true);
    else if (traceLayer.visible) paint(traceLayer, traceLayer.svg, 0, 0, false);

    // Countdown / timer
    let hudText = null;
    if (state.countdownEnd !== null) {
      const left = state.countdownEnd - now;
      hudText = formatClock(left);
      if (left <= 0 && !state.countdownFired) {
        state.countdownFired = true;
        state.countdownDone = true;
        const win = state.countdownWin;
        if (win !== "nothing") {
          if (win === "lose") gameOver("lose", "", "none", undefined, null);
          else gameOver(win, "", "none", undefined, null);
        }
      }
    } else if (state.timerStart !== null && state.timerShown) {
      hudText = formatClock(now - state.timerStart);
    }
    if (state.over) hudText = null;
    if (hudText !== null && state.timerShown) {
      paint(hud, hudSvg(hudText), 0, STAGE_H / 2 - 15, true);
    } else if (hud.visible) {
      paint(hud, hud.svg, 0, 0, false);
    }
  };

  const reset = () => {
    state.score = 0;
    state.timerStart = null;
    state.timerShown = true;
    state.countdownEnd = null;
    state.countdownFired = false;
    state.countdownDone = false;
    state.projectStart = Date.now();
    state.over = false;
    balls.clear();
    dispose(hud);
    dispose(dialog);
    dispose(traceLayer);
    for (const l of labels) dispose(l);
    labels = [];
  };

  const stopAll = () => {
    // The finished dialog stays; flying balls and the countdown stop.
    state.countdownEnd = null;
    for (const b of balls.values()) {
      b.flying = false;
      b.keys = false;
      b.vary = null;
    }
  };

  runtime.on("AFTER_EXECUTE", tick);
  runtime.on("PROJECT_START", reset);
  runtime.on("PROJECT_STOP_ALL", stopAll);
  runtime.on("RUNTIME_DISPOSED", () => {
    runtime.off("AFTER_EXECUTE", tick);
    runtime.off("PROJECT_START", reset);
    runtime.off("PROJECT_STOP_ALL", stopAll);
    reset();
  });

  const POSITIONS = { top: 120, middle: 30, bottom: -150 };

  const spriteArg = { type: Scratch.ArgumentType.STRING, menu: "sprites" };

  class Carnival {
    getInfo() {
      return {
        id: "carnival",
        name: "Carnival Games",
        color1: "#b70082",
        color2: "#99006c",
        color3: "#7d0059",
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Score",
          },
          {
            opcode: "setScore",
            blockType: Scratch.BlockType.COMMAND,
            text: "set score to [SCORE]",
            arguments: {
              SCORE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "changeScore",
            blockType: Scratch.BlockType.COMMAND,
            text: "change score by [SCORE]",
            arguments: {
              SCORE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "getScore",
            blockType: Scratch.BlockType.REPORTER,
            text: "score",
          },
          {
            opcode: "savedBest",
            blockType: Scratch.BlockType.REPORTER,
            text: "saved [WHICH] score",
            arguments: {
              WHICH: {
                type: Scratch.ArgumentType.STRING,
                menu: "bestKinds",
                defaultValue: "high",
              },
            },
          },
          {
            opcode: "forgetBest",
            blockType: Scratch.BlockType.COMMAND,
            text: "forget saved scores",
          },
          {
            opcode: "setGameName",
            blockType: Scratch.BlockType.COMMAND,
            text: "save scores under game name [NAME]",
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: DEFAULT_GAME,
              },
            },
          },
          {
            opcode: "scoresAreSaved",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "scores are saved on this device?",
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Timer",
          },
          {
            opcode: "startTimer",
            blockType: Scratch.BlockType.COMMAND,
            text: "start timer",
          },
          {
            opcode: "showTimer",
            blockType: Scratch.BlockType.COMMAND,
            text: "show timer [ON]",
            arguments: {
              ON: {
                type: Scratch.ArgumentType.STRING,
                menu: "onOff",
                defaultValue: "on",
              },
            },
          },
          {
            opcode: "timerValue",
            blockType: Scratch.BlockType.REPORTER,
            text: "timer value (s)",
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Countdown",
          },
          {
            opcode: "startCountdown",
            blockType: Scratch.BlockType.COMMAND,
            text: "start countdown [SECONDS] (s) and game over [WIN]",
            arguments: {
              SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 15 },
              WIN: {
                type: Scratch.ArgumentType.STRING,
                menu: "countdownWins",
                defaultValue: "score",
              },
            },
          },
          {
            opcode: "countdownLeft",
            blockType: Scratch.BlockType.REPORTER,
            text: "countdown left (s)",
          },
          {
            opcode: "whenCountdownEnds",
            blockType: Scratch.BlockType.HAT,
            text: "when countdown ends",
            isEdgeActivated: true,
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Game over",
          },
          {
            opcode: "gameOver",
            blockType: Scratch.BlockType.COMMAND,
            text: "game over [WIN]",
            arguments: {
              WIN: {
                type: Scratch.ArgumentType.STRING,
                menu: "gameOvers",
                defaultValue: "win",
              },
            },
          },
          {
            opcode: "customGameOver",
            blockType: Scratch.BlockType.COMMAND,
            text: "game over [MESSAGE] judged as [SCORING] using score [SCORE]",
            arguments: {
              MESSAGE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Great Job!",
              },
              SCORING: {
                type: Scratch.ArgumentType.STRING,
                menu: "scorings",
                defaultValue: "high",
              },
              SCORE: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
            },
          },
          {
            opcode: "addLabel",
            blockType: Scratch.BlockType.COMMAND,
            text: "add label [TEXT] to [POSITION] of window color [COLOR]",
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Whack-the-Mole",
              },
              POSITION: {
                type: Scratch.ArgumentType.STRING,
                menu: "positions",
                defaultValue: "bottom",
              },
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ff8135",
              },
            },
          },
          {
            opcode: "clearLabels",
            blockType: Scratch.BlockType.COMMAND,
            text: "remove all labels",
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: "Ball (aim, power, toss)",
          },
          {
            opcode: "setBallProperty",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [PROP] of ball [SPRITE] to [VALUE]",
            arguments: {
              PROP: {
                type: Scratch.ArgumentType.STRING,
                menu: "ballProps",
                defaultValue: "angle",
              },
              SPRITE: spriteArg,
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 45 },
            },
          },
          {
            opcode: "getBallProperty",
            blockType: Scratch.BlockType.REPORTER,
            text: "[PROP] of ball [SPRITE]",
            arguments: {
              PROP: {
                type: Scratch.ArgumentType.STRING,
                menu: "ballProps",
                defaultValue: "angle",
              },
              SPRITE: spriteArg,
            },
          },
          {
            opcode: "toss",
            blockType: Scratch.BlockType.COMMAND,
            text: "toss [SPRITE]",
            arguments: { SPRITE: spriteArg },
          },
          {
            opcode: "stopBall",
            blockType: Scratch.BlockType.COMMAND,
            text: "stop ball [SPRITE]",
            arguments: { SPRITE: spriteArg },
          },
          {
            opcode: "isFlying",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[SPRITE] is flying?",
            arguments: { SPRITE: spriteArg },
          },
          {
            opcode: "setTrace",
            blockType: Scratch.BlockType.COMMAND,
            text: "trace [SPRITE] path estimate [TRACE]",
            arguments: {
              SPRITE: spriteArg,
              TRACE: {
                type: Scratch.ArgumentType.STRING,
                menu: "traces",
                defaultValue: "full",
              },
            },
          },
          {
            opcode: "setTraceLength",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [SPRITE] trace length to [LENGTH] %",
            arguments: {
              SPRITE: spriteArg,
              LENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "setTraceColor",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [SPRITE] trace color to [COLOR]",
            arguments: {
              SPRITE: spriteArg,
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ffffff",
              },
            },
          },
          {
            opcode: "controlWithKeys",
            blockType: Scratch.BlockType.COMMAND,
            text: "control [SPRITE] with arrow keys [ON]",
            arguments: {
              SPRITE: spriteArg,
              ON: {
                type: Scratch.ArgumentType.STRING,
                menu: "onOff",
                defaultValue: "on",
              },
            },
          },
          {
            opcode: "varyPower",
            blockType: Scratch.BlockType.COMMAND,
            text: "vary [SPRITE] power from [MIN] % to [MAX] % speed [SPEED]",
            arguments: {
              SPRITE: spriteArg,
              MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 },
              MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 60 },
              SPEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
            },
          },
          {
            opcode: "stopVarying",
            blockType: Scratch.BlockType.COMMAND,
            text: "stop varying power of [SPRITE]",
            arguments: { SPRITE: spriteArg },
          },
          {
            opcode: "fireProjectile",
            blockType: Scratch.BlockType.COMMAND,
            text: "fire a clone of [PROJECTILE] based on ball [SPRITE]",
            arguments: {
              PROJECTILE: spriteArg,
              SPRITE: spriteArg,
            },
          },
          {
            opcode: "xComponent",
            blockType: Scratch.BlockType.REPORTER,
            text: "x component of angle [DEGREE] magnitude [MAGNITUDE]",
            arguments: {
              DEGREE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 45 },
              MAGNITUDE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50,
              },
            },
          },
          {
            opcode: "yComponent",
            blockType: Scratch.BlockType.REPORTER,
            text: "y component of angle [DEGREE] magnitude [MAGNITUDE]",
            arguments: {
              DEGREE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 45 },
              MAGNITUDE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50,
              },
            },
          },
        ],
        menus: {
          sprites: { acceptReporters: true, items: "spriteMenu" },
          onOff: {
            acceptReporters: false,
            items: [
              { text: "on", value: "on" },
              { text: "off", value: "off" },
            ],
          },
          bestKinds: {
            acceptReporters: false,
            items: [
              { text: "high", value: "high" },
              { text: "low", value: "low" },
            ],
          },
          countdownWins: {
            acceptReporters: false,
            items: [
              { text: "win game", value: "win" },
              { text: "lose game", value: "lose" },
              { text: "best score", value: "score" },
              { text: "best time", value: "time" },
              { text: "nothing (use the hat)", value: "nothing" },
            ],
          },
          gameOvers: {
            acceptReporters: false,
            items: [
              { text: "win game", value: "win" },
              { text: "lose game", value: "lose" },
              { text: "best score", value: "score" },
              { text: "best time", value: "time" },
            ],
          },
          scorings: {
            acceptReporters: false,
            items: [
              { text: "high score", value: "high" },
              { text: "low score", value: "low" },
              { text: "high time", value: "highTime" },
              { text: "low time", value: "lowTime" },
              { text: "none", value: "none" },
            ],
          },
          positions: {
            acceptReporters: false,
            items: [
              { text: "top", value: "top" },
              { text: "middle", value: "middle" },
              { text: "bottom", value: "bottom" },
            ],
          },
          ballProps: {
            acceptReporters: false,
            items: [
              { text: "angle", value: "angle" },
              { text: "power", value: "power" },
              { text: "gravity", value: "gravity" },
              { text: "wind", value: "wind" },
              { text: "angle adjust rate", value: "angleRate" },
              { text: "power adjust rate", value: "powerRate" },
              { text: "tracing time (seconds)", value: "iter" },
            ],
          },
          traces: {
            acceptReporters: false,
            items: [
              { text: "full", value: "full" },
              { text: "partial", value: "part" },
              { text: "pointer", value: "pointer" },
              { text: "crosshair", value: "cross" },
              { text: "off", value: "off" },
            ],
          },
        },
      };
    }

    spriteMenu() {
      return spriteMenu();
    }

    // Score ------------------------------------------------------------------

    setScore(args) {
      state.score = num(args.SCORE);
    }

    changeScore(args) {
      state.score += num(args.SCORE);
    }

    getScore() {
      return state.score;
    }

    savedBest(args) {
      const v = readSaved(
        Cast.toString(args.WHICH) === "low" ? "low-score" : "high-score"
      );
      return v === undefined ? "" : v;
    }

    forgetBest() {
      forgetSaved();
    }

    setGameName(args) {
      const n = Cast.toString(args.NAME).trim();
      gameName = n === "" ? DEFAULT_GAME : n;
    }

    scoresAreSaved() {
      return storage() !== null;
    }

    // Timer ------------------------------------------------------------------

    startTimer() {
      state.timerStart = Date.now();
      state.timerShown = true;
    }

    showTimer(args) {
      state.timerShown = Cast.toString(args.ON) !== "off";
    }

    timerValue() {
      return state.timerStart === null
        ? 0
        : (Date.now() - state.timerStart) / 1000;
    }

    // Countdown --------------------------------------------------------------

    startCountdown(args) {
      state.countdownEnd = Date.now() + Math.max(0, num(args.SECONDS)) * 1000;
      state.countdownWin = Cast.toString(args.WIN);
      state.countdownFired = false;
      state.countdownDone = false;
      state.timerShown = true;
      // "best time" judges the game time, which runs from here if no timer is on.
      if (state.timerStart === null) state.timerStart = Date.now();
    }

    countdownLeft() {
      return state.countdownEnd === null
        ? 0
        : Math.max(0, (state.countdownEnd - Date.now()) / 1000);
    }

    whenCountdownEnds() {
      return state.countdownDone;
    }

    // Game over --------------------------------------------------------------

    gameOver(args, util) {
      const kind = Cast.toString(args.WIN);
      gameOver(
        WIN_TYPES[kind] || kind === "lose" ? kind : "win",
        "",
        "none",
        undefined,
        util
      );
    }

    customGameOver(args, util) {
      const raw = Cast.toString(args.SCORE).trim();
      const score = raw === "" ? undefined : num(raw);
      gameOver(
        "custom",
        Cast.toString(args.MESSAGE) || "Game Over!",
        Cast.toString(args.SCORING),
        score,
        util
      );
    }

    addLabel(args) {
      const text = Cast.toString(args.TEXT);
      const color = hexColor(args.COLOR, "#ff8135");
      const y = POSITIONS[Cast.toString(args.POSITION)];
      const o = makeOverlay();
      const w = Math.max(20, text.length * 14 + 12);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="30" viewBox="0 0 ${w} 30">` +
        `<text x="${w / 2}" y="22" font-family="monospace" font-weight="bold" font-size="22" text-anchor="middle" fill="${color}">${esc(text)}</text></svg>`;
      paint(o, svg, 0, y === undefined ? POSITIONS.bottom : y, true);
      labels.push(o);
    }

    clearLabels() {
      for (const l of labels) dispose(l);
      labels = [];
    }

    // Ball -------------------------------------------------------------------

    _ball(args, util) {
      const t = resolve(args.SPRITE, util);
      return exists(t) ? { target: t, ball: getBall(t) } : null;
    }

    setBallProperty(args, util) {
      const o = this._ball(args, util);
      if (!o) return;
      const prop = Cast.toString(args.PROP);
      if (
        ![
          "angle",
          "power",
          "gravity",
          "wind",
          "angleRate",
          "powerRate",
          "iter",
        ].includes(prop)
      )
        return;
      o.ball[prop] = num(args.VALUE);
    }

    getBallProperty(args, util) {
      const o = this._ball(args, util);
      if (!o) return 0;
      const prop = Cast.toString(args.PROP);
      return Object.prototype.hasOwnProperty.call(o.ball, prop) &&
        typeof o.ball[prop] === "number"
        ? o.ball[prop]
        : 0;
    }

    toss(args, util) {
      const o = this._ball(args, util);
      if (o) toss(o.ball);
    }

    stopBall(args, util) {
      const o = this._ball(args, util);
      if (!o) return;
      const b = o.ball;
      b.flying = false;
      b.vx = b.vy = b.ax = b.ay = 0;
    }

    isFlying(args, util) {
      const o = this._ball(args, util);
      return !!o && o.ball.flying;
    }

    // Sets the same estimate lengths as setTraceMulti (3, .3, .2 seconds).
    setTrace(args, util) {
      const o = this._ball(args, util);
      if (!o) return;
      const mode = Cast.toString(args.TRACE);
      if (mode === "full") o.ball.iter = 3;
      else if (mode === "part") o.ball.iter = 0.3;
      else if (mode === "pointer") o.ball.iter = 0.2;
      o.ball.trace = ["full", "part", "pointer", "cross"].includes(mode)
        ? mode
        : "off";
    }

    // 100 % is 3 seconds of flight, as setIter.
    setTraceLength(args, util) {
      const o = this._ball(args, util);
      if (o) o.ball.iter = 3 * (num(args.LENGTH) / 100);
    }

    setTraceColor(args, util) {
      const o = this._ball(args, util);
      if (o) o.ball.traceColor = hexColor(args.COLOR, o.ball.traceColor);
    }

    controlWithKeys(args, util) {
      const o = this._ball(args, util);
      if (o) o.ball.keys = Cast.toString(args.ON) !== "off";
    }

    varyPower(args, util) {
      const o = this._ball(args, util);
      if (!o) return;
      const speed = num(args.SPEED);
      o.ball.vary = {
        min: Math.max(0, num(args.MIN)),
        max: Math.min(100, num(args.MAX)),
        speed: speed === 0 ? 100 : speed,
      };
    }

    stopVarying(args, util) {
      const o = this._ball(args, util);
      if (o) o.ball.vary = null;
    }

    // createProjectileBallFromSprite: a new thrown copy with the parent's
    // aim, power, gravity and wind that is removed once it leaves the stage.
    fireProjectile(args, util) {
      const o = this._ball(args, util);
      const source = resolve(args.PROJECTILE, util);
      if (!o || !source || source.isStage) return;
      const clone = source.makeClone();
      if (!clone) return;
      runtime.addTarget(clone);
      clone.setXY(o.target.x, o.target.y, true);
      const b = getBall(clone);
      Object.assign(b, o.ball, {
        keys: false,
        vary: null,
        trace: "off",
        projectile: true,
      });
      toss(b);
      runtime.startHats("control_start_as_clone", null, clone);
    }

    xComponent(args) {
      return xComponent(num(args.DEGREE), num(args.MAGNITUDE));
    }

    // Stage y points up: positive for angles between 0 and 180 degrees.
    yComponent(args) {
      return yComponent(num(args.DEGREE), num(args.MAGNITUDE));
    }
  }

  Scratch.extensions.register(new Carnival());
})(Scratch);
