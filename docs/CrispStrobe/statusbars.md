# Status Bars

Health, energy and other bars that follow sprites. A Scratch-native port of the
MakeCode Arcade extension
[jwunderl/pxt-status-bar](https://github.com/jwunderl/pxt-status-bar) (commit
`efcd376357ae7215e65616a11283e03bceaa7fa2`, MIT, Copyright (c) 2020 Joey
Wunderlich). The licence text is in
[`licenses/makecode-extensions.MIT.txt`](../../licenses/makecode-extensions.MIT.txt).

The extension runs unsandboxed: it draws with the renderer.

## How the bars are drawn

Each bar is an SVG skin on its own drawable in the sprite layer, redrawn only
when it changes and repositioned from the sprite's bounds after every frame.
That is the same technique the gallery's `arrays` table display uses (an SVG
skin plus `createDrawable`), and it needs no pen or extra sprites, so it works
the same in the editor, the desktop app and packaged projects. A bar is
brought to the front of the sprite layer when it is created and again every few
frames, so a sprite that later "goes to front layer" does not hide it for long.
Without a renderer (a headless run) bars keep their values and events and draw
nothing.

## Identity: kind name + owner

In Arcade a bar belongs to a sprite and has a *kind*. Here a bar is named by a
**kind** text (`Health`, `Energy`, `Magic` get Arcade's default colours; any
other text gets the health colours) and an **owner**: `myself` (a sprite or
clone), a sprite name, or `the screen` for a bar that is not attached to any
sprite. One owner can have one bar per kind. Creating a bar again replaces it.

## Blocks

| Block | Meaning |
|---|---|
| `create [KIND] bar on [SPRITE] width [WIDTH] height [HEIGHT]` | default 60x12 stage units (Arcade 20x4), max 100, value 100, constrain on. A bar taller than wide is vertical. |
| `delete [KIND] bar of [SPRITE]`, `delete all status bars` | |
| `[KIND] bar of [SPRITE] exists`, `number of [KIND] bars` | |
| `set [KIND] bar of [SPRITE] value to [VALUE]`, `change ... value by`, `set ... max to` | |
| `[KIND] bar value of [SPRITE]`, `[KIND] bar max of [SPRITE]` | |
| `stop [KIND] bar of [SPRITE] transition` | freezes a smooth transition where it is |
| `set ... fill [FILL] background [BACKGROUND] drain [DRAIN]` | colour pickers |
| `set ... border width [WIDTH] color [COLOR]` | |
| `set ... label [LABEL] color [COLOR]` | label to the left of a horizontal bar, above a vertical one |
| `set ... [FLAG] to [ON]` | smooth transition, label at end, constrain value, invert fill direction, hide transition preview, no autodestroy on attached destroy, ignore events |
| `set ... width [WIDTH] height [HEIGHT]` | |
| `attach [KIND] bar of [SPRITE] to [TO] padding [PADDING] offset [OFFSET]` | follow another sprite; afterwards the bar is found under `[TO]` |
| `set ... position to [DIRECTION]` | top, bottom, left, right of the sprite (or of the stage for a screen bar) |
| `set ... padding [PADDING] offset [OFFSET]` | |
| hat `when my [KIND] bar reaches zero` | runs in the sprite or clone that owns the bar |
| hat `when my [KIND] bar is [COMPARISON] [VALUE] [UNIT]` | `%` of max or fixed value |

Both hats are edge-activated: they start once each time the condition becomes
true. Bars with `ignore events` on never fire them.

## Behaviour notes

* Default placement is as in Arcade: above a horizontal bar's sprite, left of a
  vertical bar's sprite. The picture (bar plus label) is positioned from the
  sprite's bounds.
* `offset` moves a bar right (above/below a sprite) or up (beside it). Arcade's
  y axis points down, so vertical offsets are mirrored.
* Smooth transitions move the displayed value one bar unit per 33 ms (Arcade:
  one pixel per 100 ms on a screen a third the size); the previous value is
  shown in the drain colour until it arrives, unless `hide transition preview`
  is on.
* When the sprite or clone is deleted its bar is deleted, unless
  `no autodestroy on attached destroy` is on; then it stays where it was.
* Bars are removed when the green flag is clicked, so a script can create them
  afresh.
* Colours are picker colours; Arcade used its 16-colour palette. The default
  colours are the palette values the original uses.

## Skipped

* `on status bar kind [..] display updated` (the callback that draws extra
  pixels onto the bar's `Image`): there is no Image to hand over.
* `array of status bars of kind`: replaced by `number of [KIND] bars`.
* `sprite that [bar] is attached to`: bars are looked up by their owner, so
  the owner is already known.
* Bars as Arcade sprites (kind `StatusBar`, collisions, `camera`-relative
  flags): bars here are not sprites and do not collide.
