# NeoPixel Strips

Virtual NeoPixel (WS2812) LED strips drawn on the stage. A Scratch-native port
of the MakeCode driver [microsoft/pxt-neopixel](https://github.com/microsoft/pxt-neopixel)
(commit `9ef28dd8ec9e72548391746025a2c252fc8f9998`, MIT, Copyright (c)
Microsoft Corporation). The licence text is in
[`licenses/makecode-extensions.MIT.txt`](../../licenses/makecode-extensions.MIT.txt).

The extension runs unsandboxed: it draws with the renderer.

**It is virtual only.** `show` draws the strip on the stage; nothing is sent to
a real strip. The gallery's `microbitplus` extension has no hardware path to
reuse (it targets the MicroPython simulator), so no mirror to a physical strip
is offered.

## Model

A strip is named. `create NeoPixel strip [STRIP] at pin [PIN] with [LEDS] leds
as [MODE]` allocates a byte buffer with the original's layout: three bytes per
LED (GRB for `RGB (GRB format)`, RGB for `RGB (RGB format)`) or four with a
white byte for `RGB+W`. The pin is recorded only (P0 to P16). Up to 2048 LEDs.
The default brightness is **128**, as in the original, so colours look dimmer
until `set brightness` is raised to 255.

As in the original, setting pixels, `clear`, `shift`, `rotate` and `ease
brightness` change the buffer only; **`show` is what makes the stage picture
catch up** (`show color`, `show rainbow` and `show bar graph` call it for you).
Brightness is applied when a colour is written (`channel * brightness >> 8`),
not on show.

`make strip [RANGE] from [STRIP] range from [START] with [LENGTH] leds` creates
a second name that views part of the same buffer, like `Strip.range()`; blocks on
the range touch only its LEDs, and the picture is the whole parent strip.

## Blocks

| Block | Meaning |
|---|---|
| `create NeoPixel strip ...`, `make strip ... range ...`, `delete strip` | |
| `[STRIP] show color [COLOR]` | every LED, then show |
| `[STRIP] show rainbow from [START] to [END]` | hue interpolation exactly as the original (saturation 100, luminance 50) |
| `[STRIP] show bar graph of [VALUE] up to [HIGH]` | blue to red bar; `HIGH` 0 clears and lights the first LED yellow |
| `[STRIP] set pixel color at [PIXEL] to [COLOR]` | out-of-range indexes are ignored |
| `[STRIP] show`, `[STRIP] clear` | |
| `[STRIP] shift pixels by [OFFSET]` | towards the end, vacated LEDs go dark |
| `[STRIP] rotate pixels by [OFFSET]` | towards the end, wrapping around |
| `[STRIP] length`, `[STRIP] set brightness [0-255]`, `[STRIP] ease brightness` | |
| `[STRIP] set pixel white LED at [PIXEL] to [WHITE]` | RGB+W strips only |
| `[STRIP] set matrix width [WIDTH]`, `[STRIP] set matrix color at x [X] y [Y] to [COLOR]` | LED index is `x + y * width`; the display lays the strip out as a grid |
| `[STRIP] power (mA)` | the original's rough estimate |
| `red [..] green [..] blue [..]`, `hue [..] saturation [..] luminosity [..]`, colour-name reporter | colours as numbers `0xRRGGBB` |

Colour inputs accept the colour picker, `#rrggbb`/`#rgb` text, or a number.

### Stage display

The first time a strip is shown it is placed in the lower part of the stage,
stacked above earlier strips. `[STRIP] display at x y with led size` moves it
and sets the LED diameter; `show/hide [STRIP] display` toggles the picture.
The picture is an SVG skin on a drawable in the sprite layer, brought to the
front each time the strip is shown. For RGB+W strips the white byte is added to
each colour channel in the picture.

Strips are removed when the green flag is clicked.

## Deviations from the original

* `power` sums the strip's own bytes. The original adds `buf[i + j]` with `i`
  an LED index, which is not any LED's byte; the comment beside it describes
  what is implemented here.
* `ease brightness` and `show bar graph` guard divisions by zero that the
  original leaves to the PXT runtime (strips of fewer than 2 or 3 LEDs).
* Hue wraps for negative inputs instead of staying negative.

## Skipped

* Sending to hardware (`ws2812b.sendBuffer`, `setPin`'s pin write) and the
  hint about disabling Bluetooth.
* `setBufferMode`-style options the original left commented out.
* The `||setPixelWhiteLED||` hint text and translation files: block text is
  English only here, like the other CrispStrobe extensions.
