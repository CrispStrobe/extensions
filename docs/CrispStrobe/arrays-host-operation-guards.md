# Optional host guards for existing Array operations

Optional supplier implementation, awaiting independent review. No new block,
value kind, host policy, typed Array admission or dependency adoption follows.
The source scope is `extensions/CrispStrobe/arrays.js` plus focused
`development` tests and this contract. Existing standalone projects retain their
current behavior when no host guard is installed.

## Purpose and boundary

A host may retain an existing Array by mutable identity and constrain its actual
elements. The same body can be reached through a reference, a named Array alias,
a returned aggregate or another runtime's named registry. An optional host guard
must observe the actual operation before decoding a value, parsing legacy input,
changing a binding or Array, exposing a body to a callback, or taking an early
missing-resource fallback. Array-shaped text, annotations and normalized element
values cannot establish that ownership.

The hook is installed by the embedding application, bound to its actual runtime,
and unavailable as a project-selected callback, name, expression or function.
It must receive the original argument object, actual utility, stable operation
identifier, original raw value transport and actual resolved body identities.
It may authorize or reject; it must not replace values, coerce them, select a new
body, evaluate reporters or create a typed resource from a marker.

## Proposed host API

Use a host-provided `Scratch.BWArrayOperations` service with two synchronous
before stages:

1. `begin(opcode, originalArgs, actualUtil)` validates the real current operation
   and original input transport before name/index coercion, decoding or fallback.
   It returns a host-private ticket or a no-current-context result. The access
   stage must still run for installed hosts so an enrolled/foreign body cannot
   bypass validation through a missing ticket.
2. `access(ticket, accessFacts)` binds the actual single-resolved named/reference
   body or bodies and the requested read/write/allocation/escape. It runs before
   any corresponding effect. A raw reference and its resolved body must agree.
   Unowned uses may retain legacy behavior; enrolled or expected typed uses
   require a valid ticket even when their actual receiver is missing/nullish.

A bounded `finish(ticket, actualResult, resultFacts)` may close that same ticket
and verify a returned selected item or allocation. It cannot restore a different
value or issue producer authority by itself. The implementation review must fix
exact ticket closure and error paths before product changes. A missing host
service takes the unchanged standalone path, including existing scalar/JSON
coercion and return shapes. Installed-host rejection never becomes a successful
Undefined, empty String, zero or ignored exception.

Original args/util are passed by identity, not reconstructed after normalization.
If a supported serialized transport requires String coercion or JSON parsing,
coerce/parse it once and use the same retained snapshot for checks and dispatch.
Raw exact reference shape must be checked before restoration can discard extra
members or accessors. Read-only facts never authorize a writer. Host ticket
validation binds current runtime, body, operation, input slot and lifetime;
project metadata and equal current values are not tickets.

## Required operation coverage

Inventory all entry points before enabling an enrolled Array domain:

- Reference creation/transport: `referenceValues`, `createReference`,
  `namedReference`, `parseLegacyValue` and `jsonValue`. Check original VALUES,
  VALUE and REST before parsing/decoding; newly allocated results remain distinct
  from an existing aliased body.
- Reference reads: `referenceItem`, `referenceTruthy`, `referenceRandom`,
  `referenceLength`, `referenceIndexOf`, `referenceSlice` and `referenceConcat`.
  Concat checks both bodies; slices/results do not silently inherit a type.
- Reference mutations: `referenceRemove`, every `referenceTake` operation,
  and every `mutateReference` operation: push, unshift, set, insertAt, removeAt,
  pop, shift, removeElement, reverse and length. Removal results require the same
  read check as an indexed result; out-of-range reads retain genuine absence.
- Named mutations: `set`, `set2D`, `setMulti`, `push`, `pop`, `insert`, `remove`.
  Nested paths cannot bypass ownership by using a named alias.
- Name creation/rebinding/removal: `create1D`, `create2D`, `createEmpty`,
  `createZeros`, `createRange`, `delete`. Rebinding/removing a name does not
  fabricate destruction of an old body retained by a reference.
- Named reads/copies: get/get2D/getMulti, length/shape, contains/indexOf,
  slice/getRow/getColumn, sort/reverse, sum/mean/min/max,
  transpose/flatten/reshape, toJSON/toString and table views. Copies and
  serialization are not element or resource producer authority.
- Legacy map/filter/reduce must be treated as possible live-body writer escapes:
  their callbacks can receive the original backing Array. A host may refuse an
  enrolled body before compiling or running those callbacks. This claim grants
  no new callback evaluation or functional Array implementation.

The host may refuse all unsupported operations on an enrolled body. It must not
silently omit their guard. Unowned standalone Arrays keep existing semantics.
All reads and writes use actual backing identity, including named/reference
aliases and foreign-runtime access to a shared module-level named body.

## Failure and lifecycle

A before-write rejection must stop the actual failed invocation and its calling
continuation before effects. Throwing a plain Error is insufficient when the VM
would otherwise resume. The host needs an independently reviewed, privately
issued Array-operation failure signal bound to its exact current operation and
actual caller lineage, emitted once. Existing Procedure-only rejection APIs must
not be widened to arbitrary opcodes or host errors. No foreign signal adoption,
global reset, successful fallback or project-supplied failure handler is allowed.

The supplier only propagates the host's rejection; it never swallows it in an
existing parse/length/callback catch. Guard calls must sit outside such catches,
or the host must recognize and rethrow only its own issued signal. Stop, restart,
project Load and disposal invalidate operation/read/result tickets. Removing an
item or name does not revoke an independently live record/action or fabricate
Array destruction. Per-runtime body ownership and cross-runtime alias rejection
are host obligations, not inferred from the reference kind.

## Qualification before use

Test absent-host behavior against the previous source, including raw text,
Number versus String values, JSON-like text, nullish values, aliases and returns.
Use a host recorder to prove original args/util identity, pre-decode/pre-effect
ordering, actual body resolution, both concat inputs, all mutators and named
aliases, single transport coercion and exact result identity. Test guard failures
before each mutation and inside previously caught paths without swallowing them.
The host separately qualifies real current-operation loans, element resources,
failed-continuation propagation, lifecycle and source/current export proof.

No handler class, primitive Array formal, Settings return, nullable receiver,
Array.map, direct callable Array or SDK domain is admitted by this hook alone.
A Settings result must preserve every actual possible result, including Null
where supported by its decoder; a check for Undefined does not remove Null.
Freeze supplier and host source, obtain the repository's required review and
checks, then adopt through the consumer's normal pin writer. Existing unrelated
pull requests, workflow settings and dependency pins are outside this claim.

## Implemented supplier envelope

The finite private catalogue covers 62 existing block methods. It describes
`read`, `write`, `bind`, `unbind`, `alias`, `escape`, `transport` and `allocate`
operations. Those words are access requests, not permissions or element types.
Neither block-label scanning nor a reference kind grants host admission.

An installed service must provide all three synchronous functions. Each function
is captured once at entry and called with the service as `this`. Null or absent
services take the original standalone path. A malformed installed service throws
before the operation. The supplier does not install a host, evaluate a
project-selected hook or provide the future failed-continuation coordinator.

Every `access` record is shallow-frozen with these exact fields:

| Field           | Meaning                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `opcode`        | Actual method identifier, or Null for an internal table read without a current operation.                        |
| `runtime`       | Actual extension-instance runtime.                                                                               |
| `kind`          | Catalogue access request; `transport` checks original raw ingress, `select` checks a returned removal candidate. |
| `slot`          | `NAME`, `ARRAY`, `OTHER`, `REST`, `VALUES`, `VALUE`, or Null for the original complete argument object.          |
| `raw`           | Actual original input or retained parsed-transport source; never an input replacement.                           |
| `body`          | Actual backing value, parsed argument list, or genuine missing lookup result. Missing values are not normalized. |
| `name`          | Single-resolved named registry key when applicable.                                                              |
| `parent`, `key` | Actual descendant relationship for aggregate traversal, otherwise Undefined.                                     |

The record is immutable; backing bodies and original args remain actual live
identities and are not frozen. A host is trusted not to mutate args or bodies
while deciding. It must validate its own current operation, raw exact transport,
runtime and ownership before accepting facts. No module-issued ticket is exposed.

For named operations, the supplier retains the actual selected property key and
backing value. Reference operations retain the actual codec lookup. Concat checks
both lookups. New named bindings receive a `bind` access with the newly allocated
body before replacing the registry entry. Selection checks happen before
`referenceTake` and named `pop` remove an item. Reference copies remain fresh
outer bodies; nested values retain their existing identities.

Deep named operations check descendant data objects and Arrays, including genuine
Array reference links, before calling the original method. Cycles are visited
once. Installed-host aggregate discovery rejects accessor properties without
executing them; installed-host operation args must also be data properties.
These conservative restrictions do not change the absent-host path. Proxy-backed
or concurrently mutated bodies are not qualified host inputs. The host may reject
all nested or legacy callback operations on its enrolled bodies.

VALUES and REST retain one actual String/JSON snapshot. The parsed list is
reported before decoding or invalid-tail fallback. Recursive JSON checks raw
nested references and resolved bodies; hook rejection escapes the existing JSON
catch. Other relevant legacy catches rethrow the exact hook failure rather than
turn it into a fallback. Ordinary existing parse errors keep their old behavior.

After a successful `begin`, `finish` is called once, including failed operations,
with the exact result and a shallow-frozen record containing `opcode`, `runtime`,
`status` (`return` or `throw`), `error` and actual result/binding `body`. Failed
operations do not decode a hypothetical result. Its return value is ignored.
A thrown finish error propagates; hosts must make failure cleanup reliable and
must not replace an earlier privately issued rejection during cleanup. Context
restoration happens in a supplier `finally`, including nested operations.

Direct internal table reads call `access` with no ticket and no invented opcode.
They still report actual backing/descendant identities. No host can infer a real
current loan from an internal redraw. Named Arrays remain module-global across
runtime disposal: the existing disposal listener resets table renderer handles,
not the named Array registry. Earlier private planning that said disposal cleared
the registry was incorrect; no such behavior is implemented here.

Supplier checks cover raw ordering, aliases, all ten reference mutation variants,
seven named mutation entry points, missing/stale/foreign receivers, concat,
descendants, before-binding rejection, removal selection, recursive JSON catches,
single coercion and nested cleanup. A separate no-host differential compared all
62 covered methods and 40 additional mutations against the unchanged source.
These are supplier controls. They do not qualify a real VM host loan, private
failure signal, typed record domain, Settings receiver, GUI journey or SDK result.

## Physical Number value ingress prerequisite

A separate successor normally composes the physical Number value-operation
candidate with the optional guards. It then uses the same existing optional
`Scratch.BWNumberInput(args, util, opcode, name)` boundary for VALUE of exactly
`referenceValues`, `mutateReference`, `referenceRemove` and `referenceIndexOf`.
The four prior arithmetic/unary/comparison/truthiness opt-ins remain intact.
No new value kind, canonical word, Array constraint or host enrollment is added.

Guard begin/raw access still receives the original args and utility first.
Semantic interpretation happens inside the original operation before its actual
serialization, decode or search. The guard does not replace an input/result or
rewrite raw args. Without the Number-input service, the operation uses its exact
original input. An installed VM service interprets only its actual current finite
Number shadow and explicit VALUE role; identical text, numeric text variables,
copied arguments, copied utilities and stale callers gain no conversion.

Real VM controls register the candidate through the production extension adapter
and compare Number20, Text20 and variable Number values through reference creation,
write, removal and index search. Supplier controls separately check original
argument identity, raw guard ordering, once-only service calls, early fallback
and no-service behavior. These controls do not install an Array host owner or
qualify typed Array source/Procedure/Settings admission. Serialized VALUES/REST,
legacy named parsing, ordinary Array lifetime and the failure coordinator remain
separate boundaries. Existing bare JavaScript Undefined in the legacy JSON list
still becomes Null; the existing explicit Undefined carrier remains distinct.

This candidate changes no consumer pin or generated source and has not been
published. The successor's focused tests are run explicitly during qualification;
the existing workflow is retained from the prior Number-input candidate.
