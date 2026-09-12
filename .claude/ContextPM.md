## Project Pommora – Active Context

### Current Focus

**Pommora Sync has its identities.** Every install mints one Ed25519 key at first launch: the fingerprint of that key is the device's id, its public half and a name sit in the `device` field of `pommora.json`, and its private half sits keychain-encrypted in `secrets.json` beside it. `Sync/server.ts` is one Node file on built-ins that keeps which devices a Nexus admits, answering connect, devices, approve, and revoke to requests each signed by the device key, with no session and no account; `Core/Sync/` carries the wire contract, the canonical signing string, the client, and six `sync:*` channels, and Settings › General's Nexus heading shows this device, the Nexus ID, the bound server, and the Nexus's device list with Approve and Revoke. What does not exist is everything above that line: no file content crosses, the phone has nothing on it, the Nexus password and content encryption are unwritten, the manifest rule deciding what travels is described rather than expressed as a predicate, and the server has run only on localhost. [[NexusSyncPM]] describes what stands.

**Next is the sync arc's content half.** The content sync rides the same server and identities the groundwork mints; `// Planning`'s `Cross-Device Mutation Checklist.md` is its test plan. Behind it sits the Codebase Audit's remaining ledger: `// Planning`'s `Codebase Audit — Report.md` is the current state of the audit and shrinks as items close; its Where Brainwaves Go table orders the work: rule D-2, the external-edit reload policy, first; the two registry readers (R-17, R-18) and the watch-patch id narrowing (R-38) beside it; then building on the openings whose plumbing exists. The published audit page mirrors the report in Pommora's own theme. The Table and Cards renderers draw over one interaction layer, `Core/Views/Host/useViewInteractions.tsx`, and every drag surface over one engine, `UIX/Interactions/engine.tsx`, so a List view supplies a policy object and its presentation and inherits every band, drop, menu, ghost, and drag behavior.

The standing spec for what comes after is `// Planning`'s TilesV2-Spec: the inspector's tab strip mounting `TileHost` per tab on documents under `.nexus/inspector/<id>/`, and the panel kinds (properties, backlinks, list) those tabs would hold.

### Immediate Work

- [ ] Phase 2 of the cross-platform scaffolding — content syncing.
- [ ] **MarkdownPM:** Add auto-transformation and pairing per-case toggles in settings, support for alphabetical lists, persisted embedding heights on source change, and a few interactive bug fixes.  

### Pending Focuses

#### One — Inline Page Properties

- [ ] **A property surface attached to the page itself**, rather than only inside the Settings dropdown's Properties leaf, so a page's values are visible and editable where the page is. The frame, the sources, and the decisions taken so far are in `// Planning`'s Decision Log; it runs parallel to the two arcs below and shares no files with them.

#### Two — The Codebase Cleanup

The behavioral half — correctness, performance, and the structural moves inside the processes. Each is a session of its own, each verified by something a typecheck cannot supply, and none of it is visible from the interface.

- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy CRUD modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **Where does the floating identity label live?** Embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element or NavTrail absorbing the webpage case.
- [ ] **Escape follows open order, not focus.** The dismissal stack pushes on open and never re-inserts, so raising a floating window on click (Escape then closing the focused window) needs an open-sequence number on each entry; the same machinery would keep a pinned glance's entry in place across a tab round-trip, where today it remounts on top of a window opened after it.
- [ ] **`showError` versus `notifyError`.** Two error surfaces stand side by side and neither was made the other's; the store's `mutate` reports a failed write through `error:show`, and the notification label is its own path. One of them is the app's answer for a failed act.
- [ ] **Database:** Move nexus.db and versions.db out of the Nexus folder entirely, into the app's own storage keyed by the Nexus ID? Then they sit outside anything a transport could reach, the manifest rule has nothing to exclude, and the user's folder holds no binary blobs


#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for tile embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **A Shortcuts settings pane** over the one chord table in `Core/Actions/commands.ts`. It needs a named-key map (`toAccelerator` and `toKeyBinding` capitalize a key's first character only, so `arrowup` would reach Electron as `Arrowup`), a rule for two ids bound to one chord, and a `refreshMenu()` on a commands change if the menu bar is to pick up a rebind before the next adopt or launch.
- [ ] **TokenField — a typed value becomes a Label:** an InputField holding a run of labels beside a bare caret, where Enter turns the draft into a segment resolved against the field's picker (a Set title into an EntityIcon segment, a free string into a FileLabel) and Backspace on an empty caret removes the last. The pieces exist apart — `EditableInput` names an option chip in place, `SegmentRun` holds a field's values, the Filter pane's Location run is pick-only — and the showcase's capped field already sketches the shape. Its consumers are every location-shaped input: the Location filter, file properties, Context assignment.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.

### Important Information

- **A personalization key has to take its readers with it.** A surface left reading the tree's copy of a setting sees a value that only refreshes on a disk round-trip, which presents as a settings row that doesn't work — the store slice is what updates live.
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The gesture captures the pointer once a drag activates, so an interactive descendant that must not lift stops pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide, and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **A repair that fires with no user gesture may only canonicalize shape.** The write-path reconcile deletes what it cannot decode because the user's own edit earned it; a sweep reusing it inherits that deletion and must strip it back to shape — the on-open sweep leaves an undecodable value as written.
- **Every property-value write is one assignment, and undo lives inside it.** `Core/Properties/assignValue.ts` is the only writer for a page's values and Contexts, and a surface reaches it by filling a `ValueWriter` ref with its own optimistic apply; the revert is recorded there, so a new caller inherits ⌘Z without touching `valueUndo.ts`. Left apart on purpose: `FilterFrame`'s `ChipsField` writes filter rules rather than values, and the value right-click menu's per-surface arms and `openAddPicker`'s number/file routing are surface-specific.
- **A live push's write leg is a per-writer obligation.** The watcher is blind to main's own writes (the echo window), so every frontmatter writer notes its page or an open view goes stale; a new writer that skips `noteValueWrite` fails silently.
- **Focus at press time is read on the capture phase.** CodeMirror focuses its own content inside the native mousedown, so a bubbling handler asking "who had focus before this press" already sees the editor.
- **One shared timer under several pointer handlers turns every defensive pre-gate cancel into a killer** of the one that armed; when a dwell is hoisted, audit the cancels rather than the arms.
- **Two rules any future in-app window must respect**, both learned on the WindowBase: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

Known shortcuts, none broken today. Each is cheap on its own and best taken when its owning file is next touched — or swept together as one batch session.

- [ ] **Fire-and-forget writes have no seam.** The persisted-chrome family — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `tiles.writeMarkdown`, `embedHeights.set`, `tableHeadingColumns.set`, `aliases.set`, `headingIcon.set`, `glance.save`, `nav.write`, `tabs.save` and the rest — is called as `void window.nexus.x(…)` at sixteen sites with the failure discarded. Silence is the accepted policy for this class (ruled 08-21-2026); one `persist()` helper wraps the family and states the ruling once, so a change to the policy has one site.
- [ ] **The remaining style rows.** the thirty plain `.css` sheets on ordinary React components migrate to `.css.ts` as each is next opened, the three loading globally from `Desktop/Renderer/main.tsx` first; the six static `style={{…}}` sites (`TileLab.tsx` ×2, `PickerMenu.tsx`, `PropertyPicker.tsx`, `Core/Views/Table/TableView.tsx`, `CardAddPicker.tsx`) and the `{ minWidth: 96, height: 24 }` pair in `PropertyPicker` and `CardAddPicker` become classes; the two repeated clearance pairings (`clearance + --content-inset` ×8, `clearance + --surface-lane` ×3) and the two `subLabel` exports at 13px and 11px each want one decision; `band` names three unrelated things across Tiles, the Views, and the toolbar.
- [ ] **A value edited outside the app doesn’t live-refresh an open table.**
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `travel.ts` sleeps `FOLD_SETTLE_MS` for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] MarkdownPM Tables have autocorrect blocked, likely due to their inactive-until-entry design; numbered lists also have their periods flagged as incorrect by an autocorrect. 
- [ ] **The in-app two-host lost update.** Two editors holding one page — the content pane and the Page Window, or a page and its embed — each save their own body with no lock between them, so the later keystroke writes over the earlier host's text. The watcher-driven reload through `replaceBody` is the mechanism that closes it.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.
- [ ] **Five single-writer `writeJson` sites run unlocked.** `Nexus/identity.ts`, `Properties/journalSlot.ts`, `Trash/record.ts`, `Nexus/adopt.ts`, and `Contexts/contextsRegistry.ts` each has one writer today; the registry's seed-on-absent write is the one real double-seed window, benign under most-recent-wins.
- [ ] **`page:open` does not raise the window.** A path opened from outside selects in place — opening is not focusing.
- [ ] **Native separators reach the host on Windows.** `nexus:openPath`'s `getPathForFile` and `nodeMachine.realpath` emit them, and `posixPath` covers only what `Desktop/main.ts` hands over. On the same platform the five ex-radio menu groups — column Align and Style, grip Size and Scale, trash Format — draw a check rather than a bullet; macOS draws both states identically.
- [ ] **A press on a second picker while one list is open reopens inside the first's bloom-out.** The stack dismisses the first on pointerdown, its shield drops at the start of the exit, and the release reaches the second trigger, so the second list draws before the first has finished leaving. Closing it costs the click-through an outside click keeps: either the shield stands through the exit or every dismissal swallows its release.
- [ ] **The system menu's Format rows act on the page editor, not a focused table cell.** `host.menus.format.onAction` has one reader, `MarkdownEditor`, which applies the action to its own view; a cell reached by right-click takes the format chords but not the menu's rows. Routing the action to the view that holds focus, with a `pushState` from the cell, is the missing piece.
- [ ] **`MenuDoorContext` does not cross `reactWidget`'s detached roots.** Latent rather than live: nothing rendered under an editor widget mounts a `PickerControl` today.
- [ ] **`LayoutFrame.tsx` and `SettingsFrame.tsx` each declare the same four frame rows and three labels.** `SettingsFrame` imports `LayoutFrame`, so one shared table needs a third file; until then an icon changed in one drifts from the other.

### Recent Work

#### PM-137 || One Drag Engine
**DATE:** 09-12-2026

`UIX/Interactions/engine.tsx` is the one drag engine behind the design kit's façade, carrying the zone registry a `DragGroup` holds, a trailing landing cell walked along a foreign grid's own columns, the `resolveIndex` veto, and the optional portal overlay Cards needs for a card leaving a clipping host; the second reorder engine that served Cards alone retired. The landing slot takes the size of the cell it lands in, an addressable zone grows a floor the size of the lifted card only while a drag is in flight, and every surface divides its geometry by the rendered zoom `currentZoom` reads. Cards gained same-band keyboard reorder, and `engine.test.tsx` is the kit's first DOM test of the engine.

#### PM-136 || One View Mechanism
**DATE:** 09-11-2026

`Core/Views/Host/useViewInteractions.tsx` owns band drops, row drops on one `(activeId, toZone, beforeId)` contract, page opening, the hover glance, the title menu's page actions, and the ghost lifecycle for every view kind; Table and Cards each supply a small policy and their presentation. Table's column layer folded into `Core/Views/Table/useColumns.ts`, Cards' pickers seat once at the grid root, and Cards gained three interaction suites on the harness the Table suites share. The audit's topic 6 closed.

#### PM-135 || Sync Groundwork
**DATE:** 09-11-2026

Every install mints one Ed25519 key at first launch, its fingerprint naming the device, with the public half and a name in `pommora.json` and the private half keychain-encrypted beside it. `Sync/server.ts` is one Node file on built-ins keeping which devices each Nexus admits over four verbs, and every request to it is signed by the device key rather than carried by a session or a token. `Core/Sync/` holds the wire contract, the canonical signing string, the client, and six `sync:*` channels, and Settings › General gained a Nexus heading over them. Content itself does not cross yet; the next arc adds it against the same server and the same identities.

#### PM-134 || MarkdownPM Block Menu
**DATE:** 09-09-2026

MarkdownPM gained a command menu: `/` on an empty line opens an in-app pane of five sections and nineteen rows, filtered by title and label as the query is typed, picked by Return or a click, and undone in one step to the blank line. The model sits in `Core/Actions/blockMenu.ts`, the trigger reads the cached scan through the same `inSealedBlockAt` the embed seat reads, and the pane shares its geometry, key guard, and cursor with the `[[` autocomplete. The blank-line fix in `selectedLines` repaired the context menu's Heading and List rows on an empty line, and the divider, table, quote, footnote, and embed transforms now seat the caret consistently.

#### PM-133 || The Engine Boundary
**DATE:** 09-07-2026

A Vitest walker over the import graph from `Core/Contract/serve.ts` fails on any `.tsx`, DOM global, or package outside `ulidx`/`yaml`/`zod`, and the Desktop node tsconfig makes a DOM reference in an engine file a type error. Every channel in `Core/Contract/bridge.ts` answers through the `Result` envelope, and Core's tests open in-memory stores through `Core/Testing/machines.ts`, so Core passes `vitest` with `Desktop/` renamed away.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
