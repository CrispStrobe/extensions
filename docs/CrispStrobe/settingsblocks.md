# Saved Settings

Named numbers, text and number lists that survive between runs. A Scratch-native
port of [microsoft/pxt-settings-blocks](https://github.com/microsoft/pxt-settings-blocks)
(commit `068d05d80a063b04d373bf9b411af45201d7ce7a`, MIT, Copyright (c)
Microsoft Corporation). The licence text is in
[`licenses/makecode-extensions.MIT.txt`](../../licenses/makecode-extensions.MIT.txt).

The original wraps MakeCode's flash-backed `settings` namespace; this version
stores the values in the browser's `localStorage`. The extension runs
unsandboxed because sandboxed extensions have no `localStorage`.

## Where values are stored (scope)

* In the browser's `localStorage` for the page that runs the project: the same
  browser profile, on the same device, **and the same origin** (for example
  `turbowarp.org`, a packaged project's page, or TurboWarp Desktop). Other
  browsers, other devices and other origins do not see them, and nothing is
  synced or uploaded.
* Keys are `bwext.settings.v1:<namespace>:<name>`. The **namespace** defaults to
  `default`; set it with `use settings namespace` at the start of a project.
  Scratch gives an extension no stable project id, so projects on one origin
  that use the same namespace share their settings: give each project its own
  namespace.
* `clear all settings` removes only the current namespace's values. Nothing
  else in `localStorage` is touched.
* Browsers can clear site data, and `localStorage` is limited to a few MB.

If `localStorage` is not usable (blocked, a private mode that throws, a frame
without storage access, or a full quota) the blocks keep working but hold their
values **for the current session only**; `settings are saved on this device?`
reports false in that case. A write that fails on a full quota is kept in
memory instead of being lost silently.

## Blocks

| Block | Meaning |
|---|---|
| `set setting [NAME] to number [VALUE]` / `read setting [NAME] as number` | numbers |
| `set setting [NAME] to string [VALUE]` / `read setting [NAME] as string` | text |
| `set setting [NAME] to number array [VALUE]` / `read setting [NAME] as number array` | lists of numbers. The value may be JSON (`[1, 2, 3]`) or numbers separated by commas or spaces; non-numbers are stored as 0. It is read back as JSON text such as `[1,2,3]`. |
| `remove setting with name [NAME]` | |
| `setting with name [NAME] exists` | |
| `array of all settings names` | JSON text, sorted, current namespace only |
| `clear all settings` | current namespace only |
| `use settings namespace [NAMESPACE]` / `settings namespace` | |
| `settings are saved on this device?` | false when only held in memory |

A read of a missing name, or of a name stored with another type (reading a
number as text, say), reports an empty value, as the original reports
`undefined`. Setting and reading are typed on purpose: the type is stored with
the value.

## Differences from the original

* Values are tagged JSON instead of raw flash buffers, so type mismatches are
  detected rather than reinterpreted.
* The namespace blocks and the persistence reporter are additions; the ten
  original blocks are all present.
