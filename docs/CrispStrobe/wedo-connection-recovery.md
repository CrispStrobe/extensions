# WeDo connection recovery

## Implemented behavior

The Scratch Link adapter installs its completion handlers before opening the
socket, accepts one connection attempt at a time, and ignores callbacks from a
closed session. A failed or cancelled attempt closes even a socket still opening
and rejects all pending discovery/RPC promises. A subsequent Connect uses a fresh
adapter while retaining the registered hub and its single runtime listener.

The per-stage deadlines are 10 seconds for opening Scratch Link, 20 seconds for
discovery (allowing the host's 15-second scan window), 15 seconds for connecting,
and 10 seconds for notifications and each read/write. These are application
deadlines; host Bluetooth work must also honor cancellation. Connected status is
published after subscriptions and hub initialization succeed.

There is no automatic retry loop. Cancellation and permission errors return to
the caller; pressing Connect again starts a clean attempt. Automatic retries
need the native session ownership work below before they can be reliable.

Run `node --test development/test-wedo-connection.js development/test-wedo-lights.js`.
The fake peer covers immediate open/replies, concurrent calls, socket closure,
discovery completion/failure, missing replies, initialization cancellation,
stale callbacks and successful retry without restarting the extension. This
does not establish that the physical iPad cold-start symptom is resolved.

## Comparison with other implementations

- LEGO's SDK uses a default 10-second connection timeout, cancels timed-out
  connections, and distinguishes link connection from service readiness. Its
  optional automatic reconnect defaults to off; when enabled it makes one
  retry for unexpected connection failures, not timeout or user cancellation.
  Scanning requested before Bluetooth becomes powered on resumes when ready.
  See the public SDK mirror's [manager contract](https://github.com/OpenRoberta/app-ios/blob/6639a2d3d0e47fcfb69b138bb4790b3ab2ff5d3c/LEGODevice/LEGODevice/LEDeviceManager.h)
  and [implementation](https://github.com/OpenRoberta/app-ios/blob/6639a2d3d0e47fcfb69b138bb4790b3ab2ff5d3c/LEGODevice/LEGODevice/LEBluetoothDeviceManager.m).
- [OpenRoberta iOS](https://github.com/OpenRoberta/app-ios/blob/6639a2d3d0e47fcfb69b138bb4790b3ab2ff5d3c/Sources/Bluetooth/WeDoDevice.swift)
  delegates connection to that SDK; its wrapper adds no retry loop.
- [node-poweredup's Noble adapter](https://github.com/nathankellenicki/node-poweredup/blob/589eebed184d3785872ba177d496f911ba381f56/src/nobleabstraction.ts)
  delegates connection to Noble, with no additional connect timeout/retry in
  that wrapper. It allows a second advertisement one second to supply a name.
  Its [scanner](https://github.com/nathankellenicki/node-poweredup/blob/589eebed184d3785872ba177d496f911ba381f56/src/poweredup-node.ts)
  waits for the adapter's powered-on state.
- The [Python SDK hub wrapper](https://github.com/jannopet/LEGO-WeDo-2.0-Python-SDK/blob/00d8e736e04998bca657d2724994f6241a2c9b78/wedo2/smarthub.py)
  scans for one second, chooses the strongest result and delegates to pygatt.
  It adds no hub connection retry loop. Its serial-port reconnection loop
  concerns the USB Bluetooth dongle, rather than retrying the hub connection.

## Follow-up scope and acceptance

1. **Native iPad lifecycle:** in Brickwright's native Scratch Link bridge, wait
   for Bluetooth readiness before starting a bounded scan; serialize session
   open/close, cancel in-flight discovery/connection work, and suppress events
   from superseded sessions. Closing an old session must never disconnect a new
   one. Test delayed readiness, permission denial, close while opening and
   connecting, late replies, and reconnect after failure. Register a separate
   adoption/native claim in Brickwright before modifying its owned surfaces.
2. **Bundle adoption:** publish this supplier change, refresh Brickwright's
   generated WeDo wrapper from the exact published commit using its vendor
   workflow, verify freshness and connection/LED controls, then build/sign and
   deliver an identified physical iPad candidate. Earlier delivered UI builds
   do not contain this recovery change.
3. **Device acceptance:** cold launch the app, connect, disconnect, and reconnect
   repeatedly without restarting. Also cancel a scan, try with the hub switched
   off then on, and recover from an out-of-range disconnect. Record the failing
   phase and elapsed time privately. The clone's remote buzzer support remains
   a separate unresolved hardware/protocol question.
4. **Optional retry:** after native cancellation is verified, consider one retry
   with a short backoff for transient connection failure to the same peripheral.
   Do not retry denial, cancellation, Bluetooth-off errors, or silently select a
   different hub. Qualify with both deterministic failure tests and real iPad
   observations before describing this as reliable automatic recovery.

Implementation and deterministic tests were prepared with Codex. Physical
connection acceptance remains pending human/device testing.
