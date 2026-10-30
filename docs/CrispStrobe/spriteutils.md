# Sprite Utils

Distance, angle and velocity helpers between sprites. A Scratch-native port of
the MakeCode Arcade extension
[jwunderl/arcade-sprite-util](https://github.com/jwunderl/arcade-sprite-util)
(commit `df4991a9793a0fff092225a67d0a81936b75d7e1`, MIT, Copyright (c) 2020
Joey Wunderlich; note that it lives under `jwunderl`, not `microsoft`). The
licence text is in [`licenses/makecode-extensions.MIT.txt`](../../licenses/makecode-extensions.MIT.txt).

This extension runs unsandboxed (it reads sprite positions and moves sprites).

## Choosing sprites

Every sprite input is a menu that also accepts a reporter. `myself` is the
sprite (or clone) running the block; a sprite name means that sprite's
original (a clone can only be reached as `myself`). A sprite that does not
exist is handled like the original: distances and angles report 0 and commands
do nothing.

## Blocks

### Geometry

| Block | Meaning |
|---|---|
| `[SPRITE] is deleted` | true when the sprite or clone no longer exists |
| `distance between [A] and [B]` | between the sprites' positions (x/y), in stage units |
| `angle from [A] to [B] in radians` | counter-clockwise from the +x axis, y up |
| `direction from [A] to [B]` | the same line as a Scratch direction (0 = up, clockwise); 90 when the sprites coincide |
| `place [MOVE] at angle [ANGLE] radians distance [DISTANCE] from [FROM]` | `x = from.x + cos(angle) * distance`, `y = from.y + sin(angle) * distance` |
| `number of [KIND] sprites within [DISTANCE] of [SPRITE]` | counts the original and its clones; the reference sprite counts too if it is of that kind (as `getSpritesWithin`) |
| `distance to nearest [KIND] sprite from [SPRITE]` | other sprites of that kind only; 0 if none |
| `direction to nearest [KIND] sprite from [SPRITE]` | Scratch direction; 0 if none |

### Velocity

Scratch sprites have no velocity, so the extension keeps one per sprite or
clone: stage units per second, y up. It is applied once per frame, before
scripts run, as `v += a * dt; position += v * dt`, with `dt` the real frame
time. Motion stops when the green flag or the stop sign is pressed, and a
deleted clone's motion is dropped. A velocity of 0 and acceleration of 0 costs
nothing. Sprites are still fenced to the stage as usual.

| Block | Meaning |
|---|---|
| `set [SPRITE] velocity to vx [VX] vy [VY]` | |
| `set [SPRITE] velocity at angle [ANGLE] radians speed [SPEED]` | `vx = cos(angle) * speed`, `vy = sin(angle) * speed` |
| `set [SPRITE] velocity toward [TARGET] speed [SPEED]` | aims at the target's current position, once |
| `set [SPRITE] acceleration to ax [AX] ay [AY]` | for gravity use a negative `ay` |
| `make [SPRITE] jump [PIXELS] units` | sets `vy` so the sprite rises `pixels` against its gravity: `sqrt(2 * pixels * g)`, `g = abs(ay)` or 200 |
| `stop moving [SPRITE]` | clears velocity and acceleration |
| `[AXIS] velocity of [SPRITE]` | |

### General

`convert [VALUE] radians to degrees`, `convert [VALUE] degrees to radians`,
`round [VALUE] to [DIGITS] decimal places` (reports text padded to that many
decimals, like the original), and a constants reporter (π, e, LN2, LN10,
√1/2, √2).

## What differs from Arcade

* **Axis and angle sign.** Arcade's y points down, so its `angle from` is the
  mirror of this one; here angles follow the Scratch stage (y up). Use
  `direction from` for Scratch's own convention.
* **Position, not bounding-box centre.** Distances use the sprite's x/y.
* **Velocity is extension-owned**, as described above.
* **Offsets in `jump`** follow the y-up axis: with `ay` negative (gravity down)
  the jump goes up.

## Skipped

* `on sprite update every [ms]` / `on sprite of kind update` and the
  game-engine `run code before/after ...` priority hooks: they register
  callbacks in Arcade's scene loop. Scratch scripts already loop with `forever`.
* `render on z-index`, `draw image`, `draw circle`, `fill circle`: they draw on
  Arcade `Image` buffers.
* `console overlay` and `set life image`: Arcade screen features.
* The `undefined` / `null` / `NaN` constants: Scratch has no such values
  (π, e, LN2, LN10, √1/2 and √2 are kept).
* Selecting by sprite *kind*: Arcade kinds are replaced by sprite names (the
  original and its clones).
