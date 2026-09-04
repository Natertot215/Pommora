## Project Pommora – Active Context

### Current Focus

**The Glance Pane landed 09-04-2026.** The hover surface is `Interface/Glance/GlancePane.tsx` on the PickerMenu chassis, raised through one import-free seam, `Interface/Glance/glanceAction.ts`, that any host can call with an anchor element and a page or website target: it owns the per-host dwell table, the presenter slot, and the anchor watch that keeps a glance standing while the content view scrolls. MarkdownPM is one host of it through a single `ConnectionsApi.glance` hook, the pane resolves its page itself, hands focus back on close through the host editor's own view, and keeps a small fenced per-page warm store so a re-glance returns to where it was left. The code vocabulary settled with it — Window names the floating Page Window (`windowSlice`, `pageWindow`, `openWindow`, `windows:*`), Glance names the hover surface — while every label and on-disk word still reads "Preview" by ruling. `Links/` is gone; its three helpers live in `Actions/`. What the arc left open: the non-editor hosts it exists to allow (sidebar rows, tabs, view rows, PropertyPanel values), each a host supplying an element and a dwell row.


### Immediate Work

- [ ] Nathan's own pass over the glance in the running app and the Page Window routes; the machine's remembered window tab sets and glance size reset once with the local_state key rename.

### Pending Focuses

#### One — Inline Page Properties

- [ ] **A property surface attached to the page itself**, rather than only inside the Settings dropdown's Properties leaf, so a page's values are visible and editable where the page is. The frame, the sources, and the decisions taken so far are in `// Planning`'s Decision Log; it runs parallel to the two arcs below and shares no files with them.

#### Two — Glance Hosts

- [ ] **A sidebar row, a tab, a view row, or a PropertyPanel value raising the glance** on dwell. The seam takes any element and a dwell row; a host wires pointer-enter to `armGlance` and pointer-leave to `cancelGlance`, adds its row to `GLANCE_DWELL`, and nothing pane-side changes.

#### Three — The Codebase Cleanup

The behavioral half — correctness, performance, and the structural moves inside the processes. Each is a session of its own, each verified by something a typecheck cannot supply, and none of it is visible from the interface.

- [ ] **The `main/index.ts` split.** Roughly 110 channel implementations share a file containing window creation, protocol registration, and application lifecycle, which makes it the one file every parallel session collides on. The bridge seam itself is excellent and is not what moves: `serveBridge` already takes a plain object, so the channels become per-domain partial maps spread into one. The first step is carving out the context they all close over — the shared refusals, the path resolvers, the confirm-and-push helpers, and the window reference itself — since every domain map needs it and none of them can own it. A `session` handler kind hoists the repeated no-nexus guard into `ipc.ts`'s boundary-policy union, and the confirm-and-push helpers take a send function instead of closing over `mainWindow`, which is the multi-window transport seam.
- [ ] **Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns contains around 18,000 elements, and every pipeline re-run reconciles them all. Group bands complicate it, so the scoped version virtualizes the flat, ungrouped case first, where the win is largest and the band machinery is absent.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Open Against The Web Layer

- [ ] **A guest's scripted popups ride the open-link chain with no user-gesture gate** — acceptable for trusted embeds, ungated by decision pending Nathan's ruling.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **The renderer's open filing and recipe rulings.** Whether `Interface/` absorbs `Sidebar/`; the recipe's five calls (rows carrying a switch or eye measure 31–32 against the 16px line, locked cards clipping their trail, a Trash row's `onClick` tab stop beside its checkbox's, Settings' section titles rendering as the index's `div`, the footing row kind); `text.callout` as the table-header step and the `surface.*` trio beside Ramp; and whether `menuBackdrop` moves to the `menu` step so DOM order sorts a nested picker and OptionEditPopup's hand-rolled capture listener goes.
- [ ] **Where does the floating identity label live?** Embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element or NavTrail absorbing the webpage case.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
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
- **Glass comes in three frost tiers, and the names mean them.** `GlassPane` is the chrome pane — sidebar, inspector, side slots — brightest and clear; `GlassSurface` is a Menu floating over it a step dimmer; `GlassWindow` is that surface carrying the shared body, and the anchored panes (the glance, the autocomplete) take it through PickerMenu. One `SOLID_FILL` sits behind every darkened surface, and a menu opening over another surface asks `GlassSurface` for `solid` rather than writing a background. Only `MenuSurface` still wears a beak, and it is the only shell drawing its own outline.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **A repair that fires with no user gesture may only canonicalize shape.** The write-path reconcile deletes what it cannot decode because the user's own edit earned it; a sweep reusing it inherits that deletion and must strip it back to shape — the on-open sweep leaves an undecodable value as written.
- **A live push's write leg is a per-writer obligation.** The watcher is blind to main's own writes (the echo window), so every frontmatter writer notes its page or an open view goes stale; a new writer that skips `noteValueWrite` fails silently.
- **Focus at press time is read on the capture phase.** CodeMirror focuses its own content inside the native mousedown, so a bubbling handler asking "who had focus before this press" already sees the editor.
- **One shared timer under several pointer handlers turns every defensive pre-gate cancel into a killer** of the one that armed; when a dwell is hoisted, audit the cancels rather than the arms.
- **Two rules any future in-app window must respect**, both learned on the WindowBase: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

Known shortcuts, none broken today. Each is cheap on its own and best taken when its owning file is next touched — or swept together as one batch session.

- [ ] **Fire-and-forget writes have no seam.** The persisted-chrome family — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown`, `embedHeights.set`, `tableHeadingColumns.set`, `aliases.set`, `headingIcon.set`, `glance.save`, `nav.write`, `tabs.save` and the rest — is called as `void window.nexus.x(…)` at sixteen sites with the failure discarded. Silence is the accepted policy for this class (ruled 08-21-2026); one `persist()` helper wraps the family and states the ruling once, so a change to the policy has one site.
- [ ] **The renderer's remaining filing and style rows.** `Sidebar/sidebarDndModel` → `Interactions/reorderModel` and `Settings/IconPicker` + `iconFavorites` → `Utilities/NexusIconPicker` (each has zero importers in its own folder); the thirty plain `.css` sheets on ordinary React components migrate to `.css.ts` as each is next opened, the three loading globally from `main.tsx` first; the six static `style={{…}}` sites (`SurfaceLab.tsx` ×2, `PickerMenu.tsx`, `PropertyPicker.tsx`, `MarkdownPM/Tables/TableView.tsx`, `CardAddPicker.tsx`) and the `{ minWidth: 96, height: 24 }` pair in `PropertyPicker` and `CardAddPicker` become classes; the two repeated clearance pairings (`clearance + --content-inset` ×8, `clearance + --surface-lane` ×3) and the two `subLabel` exports at 13px and 11px each want one decision; `band` names three unrelated things across SurfacePM, the Views, and the toolbar.
- [ ] **Table perf ceilings.** Tables render every row without virtualization, so a very long collection will eventually feel it, and a value edited outside the app doesn't live-refresh an open table.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] MarkdownPM Tables have autocorrect blocked, likely due to their inactive-until-entry design; numbered lists also have their periods flagged as incorrect by an autocorrect. 
- [ ] **The in-app two-host lost update.** Two editors holding one page — the content pane and the Page Window, or a page and its embed — each save their own body with no lock between them, so the later keystroke writes over the earlier host's text. The watcher-driven reload through `replaceBody` is the mechanism that closes it.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.
- [ ] **`versions.db` is tracked by NexusOS's own repository.** The snapshot store sits inside `.nexus` on the same terms as `nexus.db`, so every capture dirties the repository; Pommora seeds no `.gitignore`, by decision, so the vault's own is where this closes.

### Recent Work

#### PM-126 || Active Cache Framework
**DATE:** 09-03-2026

Three hand-rolled insertion-order LRUs collapsed onto one `capSet` in `DesignSystem/Util/capMap.ts`; the per-tab warm and page-detail caps rose to 50. The parked-tab count became a user setting — Active Tab Cache (`personalization.tabCache`, 5–20, default 5), read live in `ContentView`'s `useHosts`. A default-on Pause Media on Tab Switch toggle pauses a parked tab's webpage-guest media through the new `webGuestMedia:pause` channel, one-directional by decision — returning never resumes — with the tab-active signal threaded through CodeMirror state to the detached-root `WebTile`.

#### PM-125 || Page File History
**DATE:** 09-02-2026 → 09-03

A page's body accumulates device-local snapshots in `versions.db` under one capture rule, restorable from a Page History window reached by View History in every page menu and History beside Properties; a restore replaces the body alone and reaches every open editor, cancelling any save armed under it. Files & Links carries the four File History settings. The two-host lost update and the store's presence in NexusOS's repository are recorded under Known Issues; the external-edit reload through `replaceBody` is the next mechanism the arc seeded. A secondary review over six lenses, the tests, and a final regression pass landed after the closeout in five commits ending at `c770e9a4`, netting −11 lines against the arc.

#### PM-124 || In-App Confirmation & Notifications
**DATE:** 09-02-2026

Every destructive confirmation moved out of main's native dialogs into one in-app window, `Windows/ConfirmationWindow.tsx`, behind named `ask*` wrappers in `Windows/confirmations.ts`; a new Confirm Before Deletion setting gates pages, tiles, and schema-less folders while Collections, Sets, views, and properties always ask. `Interface/NotificationLabel.tsx` reports the finished act with an Undo shaped by what left — a bundle-backed restore for files, a configuration re-save for a view.

#### PM-123 || Stamp Retirement
**DATE:** 09-01-2026

`created_at` and `modified_at` left every page and sidecar; Last Modified is the file's mtime and Creation Time the `PageID` ULID's instant, carried to every view as `PageValues` from `loadValues`. A `created_time` type sits beside `last_edited_time`, both stamps reveal from the Hidden frame, and every stamping writer is gone. A rewrite the user did not make restores the file's time, `setGovernedRootKeys` skips an identical write, and a push refreshes only its named pages over the `Result` envelope; the vault pass re-minted 40 adopted PageIDs from their real creation dates. A post-plan review closed four gaps the scoped push exposed — a move now notes its page, a straddled parse never caches, a scoped read settles only what it resolved — and folded five simplifications.

#### PM-122 || Compatible Properties
**DATE:** 08-31-2026 → 09-01

Property values moved from `<Property>:` keys to bare keys named as the property, Context keys from `(Title):` to `<Title>:`, and Select/Status values to one-element lists, so a page's frontmatter reads identically in Pommora and in another frontmatter editor. `governedKeys.ts` and `standing.ts` dissolved: a key is Pommora's when the registry names it, a reserved-name rule and a held-key refusal guard the namespace, and `reconcileGovernedRoot` is the one reconcile every governed write, restore, and the opt-in on-open sweep run. A `values:changed` push fed by the watcher and by every main-side writer replaced the `refreshValues` thread, with overrides retired by page id. Two Settings toggles — Repair Properties On Open and Capitalize All Metadata — opened the Properties leaf's Metadata section.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
