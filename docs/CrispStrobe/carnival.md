# Carnival Games

Countdown and timer games with saved best scores, plus a throwable ball with
aim, power, gravity and wind. A Scratch-native port of the MakeCode Arcade
extension [microsoft/arcade-carnival](https://github.com/microsoft/arcade-carnival)
(commit `915caca4a2d83a7071df59407a9987992c083750`, MIT, Copyright (c)
Microsoft Corporation). The licence text is in
[`licenses/makecode-extensions.MIT.txt`](../../licenses/makecode-extensions.MIT.txt).

The extension runs unsandboxed: it draws overlays with the renderer, moves
sprites, and stores scores in `localStorage`.

## Units

Arcade works on a 160x120 screen; the stage is three times that. Ball power,
gravity and wind keep their Arcade numbers (defaults: power 50, gravity 20,
angle 10) and are multiplied by 3 on the stage, so a throw covers the same
fraction of the screen as it does in Arcade. Angles are degrees, counter-
clockwise from the +x axis; the stage's y points up (Arcade's yComponent has
the opposite sign).

## Blocks

### Score and saved best scores

`set score to`, `change score by`, `score` (Arcade's `info.score`), `saved
[high/low] score`, `forget saved scores`, `save scores under game name`,
`scores are saved on this device?`.

Best scores persist in `localStorage` under
`bwext.carnival.v1:<game name>:high-score` and `:low-score`, in the browser,
device and origin that run the project. Scratch has no project id, so scores
of different projects on one origin only stay apart if each uses its own game
name. If `localStorage` is unavailable the scores are kept for the session
only (the reporter says so) and nothing fails.

### Timer, countdown

| Block | Meaning |
|---|---|
| `start timer`, `show timer [on/off]`, `timer value (s)` | count-up timer, shown at the top of the stage as `SS.cc` (then `M:SS`) |
| `start countdown [SECONDS] (s) and game over [WIN]` | counts down on the same display; at zero it ends the game as chosen. `nothing (use the hat)` only raises the hat. |
| `countdown left (s)` | |
| hat `when countdown ends` | edge-activated |

If a countdown and a timer are both running, the display shows the countdown.

### Game over

`game over [win game / lose game / best score / best time]` and `game over
[MESSAGE] judged as [high score / low score / high time / low time / none]
using score [SCORE]` (leave the score empty to use the current score).

As in the original: win and best score compare the score with the saved high
score; best time compares the elapsed seconds (from `start timer`, or
`start countdown`, or the green flag) with the saved low score; lose shows
"GAME OVER!" with no score. The dialog shows the score and either "New Best
Score!" or "Best:N". Where Arcade resets the game on a button press, here the
dialog stays up and all scripts stop; the green flag starts again (and clears
the dialog).

`add label [TEXT] to [top/middle/bottom] of window color [COLOR]` and
`remove all labels` replace the text sprite.

### Ball

A "ball" is any sprite or clone; its settings are created on first use.

| Block | Meaning |
|---|---|
| `set [angle / power / gravity / wind / angle adjust rate / power adjust rate / tracing time] of ball [SPRITE] to [VALUE]`, `[PROP] of ball [SPRITE]` | |
| `toss [SPRITE]` | velocity `(cos a, sin a) * power`, acceleration `(wind, -gravity)`, integrated every frame from then on |
| `stop ball [SPRITE]`, `[SPRITE] is flying?` | |
| `trace [SPRITE] path estimate [full / partial / pointer / crosshair / off]` | draws the predicted path (or a crosshair in the aim direction) while the ball is at rest |
| `set [SPRITE] trace length to [LENGTH] %`, `set [SPRITE] trace color to` | 100 % is 3 seconds of flight |
| `control [SPRITE] with arrow keys [on/off]` | left/right change the angle, up/down the power, at the Arcade rates |
| `vary [SPRITE] power from [MIN] % to [MAX] % speed [SPEED]`, `stop varying power of [SPRITE]` | power swings as `min + abs(sin(t * speed / 90000)) * (max - min)` |
| `fire a clone of [PROJECTILE] based on ball [SPRITE]` | creates a clone of another sprite at the ball, thrown with the ball's settings; it runs "when I start as a clone" and is deleted once it leaves the stage |
| `x component of angle .. magnitude ..`, `y component ..` | |

Balls are not fenced to the stage while flying, as in Arcade. Flight stops on
the stop sign and on a new green flag.

## Skipped

* **Screen effects and sounds** (`effects.confetti`, `effects.melt`, the
  win jingle, `game.setGameOverSound`): Arcade-only rendering and audio.
* **Multiplayer** win type (`info.player1..4` scores): Scratch has no player
  score model.
* **Pausing for a key press and `control.reset()`**: replaced by the stopped
  dialog described above.
* **Arcade's `GameOverDialog` frame art, fonts and palette**: the dialog is a
  plain SVG panel.
* **`vary power ... using [status bar]`**: the original writes the power into a
  status bar sprite. Here the power is a ball property; show it with the
  Status Bars extension if wanted.
* **The "moon" crosshair sprite**: drawn as an overlay mark instead.
* **Ball as a sprite subclass** (`Ball extends ExtendableSprite`, `blockSetVariable`
  variables, `createProjectileBall` placing the sprite at the screen edge):
  balls are existing sprites; only the "based on a ball" form is ported.
