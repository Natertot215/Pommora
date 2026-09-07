## Project Pommora – Active Context

### Current Focus

**The restructure landed.** The app is filed as `Core`, `UIX`, and `Desktop`, with every Node and Electron call behind `Core/Platform` and the desktop host, and one channel table both sides derive from. Along the way the 26 menu channels collapsed to one, the editor took an `EditorHost` from its mounter, the two write-path bugs were fixed, and the line count fell. Gates run from the repo root: `npm run typecheck && npm run test && npm run lint && npm run build`. Dev is `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev` from the root; the built binary is `cd Desktop && env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron . --remote-debugging-port=9333`.

**The property popups are one component.** Nine hand-rolled compositions that assigned a value folded onto `Core/Properties/Pickers/PropertyPicker.tsx` — options, datetime, file, and a chooser pane that adds a property and drills into its value — and `Core/Properties/Page/` became `Core/Properties/PropertyPanel.tsx`, `MenuItem` rows with the value in a trailing slot. Cards, Table, and the panel each drive the one picker; `TextPicker` stays the shared text field. The fold's plan is `// Planning`'s PropertyPanel plan; its net came to −267 source lines, under the −400 budget, because `PropertyPanel.tsx` and `CardsView.tsx` hold behavior the optimistic per-file ceilings underestimated — the fold's floor, not bloat.

The standing spec for what comes next is `// Planning`'s TilesV2-Spec: the inspector's tab strip mounting `TileHost` per tab on documents under `.nexus/inspector/<id>/`, and the panel kinds (properties, backlinks, list) those tabs would hold.

### Immediate Work

- [ ] **Nathan's own pass over the restructured app.** A day on the real Nexus — pages, properties, views, tiles, menus, windows, settings, history, trash — and a flip through `Core`, `UIX`, and `Desktop` to say whether the filing reads the way it was meant to.

### Pending Focuses

#### One — Inline Page Properties

- [ ] **A property surface attached to the page itself**, rather than only inside the Settings dropdown's Properties leaf, so a page's values are visible and editable where the page is. The frame, the sources, and the decisions taken so far are in `// Planning`'s Decision Log; it runs parallel to the two arcs below and shares no files with them.

#### Two — The Codebase Cleanup

The behavioral half — correctness, performance, and the structural moves inside the processes. Each is a session of its own, each verified by something a typecheck cannot supply, and none of it is visible from the interface.

- [ ] **Neither view renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns contains around 18,000 elements, and every pipeline re-run reconciles them all. Group bands complicate it, so the scoped version virtualizes the flat, ungrouped case first, where the win is largest and the band machinery is absent.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy CRUD modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **Where does the floating identity label live?** Embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element or NavTrail absorbing the webpage case.
- [ ] **`showError` versus `notifyError`.** Two error surfaces stand side by side and neither was made the other's; the store's `mutate` reports a failed write through `error:show`, and the notification label is its own path. One of them is the app's answer for a failed act.
- [ ] **`ActionItem.confirm` is write-only.** Two `optionMenu` rows set it and no presenter reads it. It stays by ruling, as the in-app surfaces' seat for a confirming row; either a presenter honors it or the field goes.
- [ ] **`RowMenuHost` has no desktop caller.** `Desktop/main.ts` wires `HostContext.menu` to the native popper unconditionally, so the in-app presenter — about 110 lines — is the phone's seat and unreachable today.


#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for tile embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **TokenField — a typed value becomes a Label:** an InputField holding a run of labels beside a bare caret, where Enter turns the draft into a segment resolved against the field's picker (a Set title into an EntityIcon segment, a free string into a FileLabel) and Backspace on an empty caret removes the last. The pieces exist apart — `EditableInput` names an option chip in place, `SegmentRun` holds a field's values, the Filter pane's Location run is pick-only — and the showcase's capped field already sketches the shape. Its consumers are every location-shaped input: the Location filter, file properties, Context assignment.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.

### Important Information

- **A personalization key has to take its readers with it.** A surface left reading the tree's copy of a setting sees a value that only refreshes on a disk round-trip, which presents as a settings row that doesn't work — the store slice is what updates live.
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide, and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A renderer `preventDefault` cannot suppress main's `context-menu` event.** Any editable target pops main's own editor menu regardless, so a surface that wants its own menu there has to be the only claimant — which is why the table widget reports non-editable and why two menus over one field is the recurring symptom.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **A repair that fires with no user gesture may only canonicalize shape.** The write-path reconcile deletes what it cannot decode because the user's own edit earned it; a sweep reusing it inherits that deletion and must strip it back to shape — the on-open sweep leaves an undecodable value as written.
- **A live push's write leg is a per-writer obligation.** The watcher is blind to main's own writes (the echo window), so every frontmatter writer notes its page or an open view goes stale; a new writer that skips `noteValueWrite` fails silently.
- **Focus at press time is read on the capture phase.** CodeMirror focuses its own content inside the native mousedown, so a bubbling handler asking "who had focus before this press" already sees the editor.
- **One shared timer under several pointer handlers turns every defensive pre-gate cancel into a killer** of the one that armed; when a dwell is hoisted, audit the cancels rather than the arms.
- **Two rules any future in-app window must respect**, both learned on the WindowBase: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

Known shortcuts, none broken today. Each is cheap on its own and best taken when its owning file is next touched — or swept together as one batch session.

- [ ] **Fire-and-forget writes have no seam.** The persisted-chrome family — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `tiles.writeMarkdown`, `embedHeights.set`, `tableHeadingColumns.set`, `aliases.set`, `headingIcon.set`, `glance.save`, `nav.write`, `tabs.save` and the rest — is called as `void window.nexus.x(…)` at sixteen sites with the failure discarded. Silence is the accepted policy for this class (ruled 08-21-2026); one `persist()` helper wraps the family and states the ruling once, so a change to the policy has one site.
- [ ] **The remaining style rows.** the thirty plain `.css` sheets on ordinary React components migrate to `.css.ts` as each is next opened, the three loading globally from `Desktop/Renderer/main.tsx` first; the six static `style={{…}}` sites (`TileLab.tsx` ×2, `PickerMenu.tsx`, `PropertyPicker.tsx`, `Core/Views/Table/TableView.tsx`, `CardAddPicker.tsx`) and the `{ minWidth: 96, height: 24 }` pair in `PropertyPicker` and `CardAddPicker` become classes; the two repeated clearance pairings (`clearance + --content-inset` ×8, `clearance + --surface-lane` ×3) and the two `subLabel` exports at 13px and 11px each want one decision; `band` names three unrelated things across Tiles, the Views, and the toolbar.
- [ ] **Table perf ceilings.** Tables render every row without virtualization, so a very long collection will eventually feel it, and a value edited outside the app doesn't live-refresh an open table.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `travel.ts` sleeps `FOLD_SETTLE_MS` for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] MarkdownPM Tables have autocorrect blocked, likely due to their inactive-until-entry design; numbered lists also have their periods flagged as incorrect by an autocorrect. 
- [ ] **The in-app two-host lost update.** Two editors holding one page — the content pane and the Page Window, or a page and its embed — each save their own body with no lock between them, so the later keystroke writes over the earlier host's text. The watcher-driven reload through `replaceBody` is the mechanism that closes it.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.
- [ ] **Five single-writer `writeJson` sites run unlocked.** `Nexus/identity.ts`, `Properties/journalSlot.ts`, `Trash/record.ts`, `Nexus/adopt.ts`, and `Contexts/contextsRegistry.ts` each has one writer today; the registry's seed-on-absent write is the one real double-seed window, benign under most-recent-wins.
- [ ] **`page:open` does not raise the window.** A path opened from outside selects in place — opening is not focusing.
- [ ] **Native separators reach the host on Windows.** `nexus:openPath`'s `getPathForFile` and `nodeMachine.realpath` emit them, and `posixPath` covers only what `Desktop/main.ts` hands over. On the same platform the five ex-radio menu groups — column Align and Style, grip Size and Scale, trash Format — draw a check rather than a bullet; macOS draws both states identically.
- [ ] **`NativePickerContext` does not cross `reactWidget`'s detached roots.** Latent rather than live: nothing rendered under an editor widget mounts a `PickerControl` today.
- [ ] **`linkTitles:get` answers with a bare reply.** Its handler's `ensureCache` can throw, and a main-side throw then arrives at the renderer as an `{ok:false}` object that the cache slice stores as data; the other bare-reply `:get` channels (`activeViews`, `citations`, `aliases`) catch their own reads.
- [ ] **`LayoutFrame.tsx` and `SettingsFrame.tsx` each declare the same four frame rows and three labels.** `SettingsFrame` imports `LayoutFrame`, so one shared table needs a third file; until then an icon changed in one drifts from the other.

### Recent Work

#### PM-129 || The Repo Restructure
**DATE:** 09-05-2026 → 09-06

The app was refiled as `Core`, `UIX`, and `Desktop`, with every Node and Electron call behind `Core/Platform` and the desktop host, one channel table, every list menu on one path, the editor on an `EditorHost`, and the comments, duplicates, and dead paths cut across the tree. The code lines fell from 69,459 to 68,679 on the run's counter and by 1,002 on a count that excludes test harnesses; the documentation was reconciled on a fixed character budget.

#### PM-128 || Tiles
**DATE:** 09-05-2026

`SurfacePM/` became `Tiles/` and every tile-system "block" became "tile"; the grid's drags and the embed handle moved onto the one pointer engine; the three tile kinds are declared in `TILE_KINDS`, `TILE_SURFACES`, and `TILE_COPY`; each host's document is `_tiles.json` in its folder, watched and reloaded live. The closeout's polish took the arc net negative and retired the row migration.

#### PM-127 || The Resize Frame
**DATE:** 09-04-2026

Every drag-to-size and drag-to-move gesture on one box — the floating windows, the glance pane, the sidebar and inspector strips, the window side panes — runs through `useResizeFrame` in `UIX/Interactions/ResizeFrame.tsx` on the shared pointer engine; a host owns its rect and declares its floor, ceiling, whether it is equilateral, and whether it is outlined. `FloatingWindow.tsx` and the two strip sheets are gone.

#### PM-126 || Active Cache Framework
**DATE:** 09-03-2026

Three hand-rolled insertion-order LRUs collapsed onto one `capSet` in `UIX/Utilities/capMap.ts`; the per-tab warm and page-detail caps rose to 50. The parked-tab count became a user setting — Active Tab Cache (`personalization.tabCache`, 5–20, default 5), read live in `ContentView`'s `useHosts`. A default-on Pause Media on Tab Switch toggle pauses a parked tab's webpage-guest media through the new `webGuestMedia:pause` channel, one-directional by decision — returning never resumes — with the tab-active signal threaded through CodeMirror state to the detached-root `WebTile`.

#### PM-125 || Page File History
**DATE:** 09-02-2026

A page's body accumulates device-local snapshots in `versions.db` under one capture rule, restorable from a Page History window reached by View History in every page menu and History beside Properties; a restore replaces the body alone and reaches every open editor, cancelling any save armed under it. Files & Links carries the four File History settings. The two-host lost update and the store's presence in NexusOS's repository are recorded under Known Issues; the external-edit reload through `replaceBody` is the next mechanism the arc seeded. A secondary review over six lenses, the tests, and a final regression pass landed after the closeout in five commits ending at `c770e9a4`, netting −11 lines against the arc.


### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
