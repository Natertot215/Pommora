## Inline Page Properties — Decision Log

### Frame

- **Purpose:** Give a Page in the detail pane a property surface attached to the page itself, rather than only inside the Settings dropdown's Properties leaf.
- **Core Value:** A page's property values are visible and editable where the page is, at the moment you're reading or writing it.
- **Success Criteria:** Opening a page shows its values without a click; setting one is a click on the value; the panel never costs the body more room than it earns, and never moves the body under the pointer; the existing pane and preview inspector stay coherent beside it.

### Sources

- `Pommora/src/renderer/src/MarkdownPM/PageHeader.tsx` — the page header: no-banner draws title + `.mdpm-divider`; banner draws the cover band with the title overlaid and its own bottom border. Rendered by `PageView` alone (see A-2).
- `Pommora/src/renderer/src/MarkdownPM/Styles.css` (L110–215) — `.mdpm-header` is `position: absolute` over the content, translated up 1:1 with scroll over exactly its own height; `--header-zone` is both the content's top padding and that translation's range. `.mdpm-divider` is a zero-height inset rounded rule at `margin: 0 var(--gutter) 0 var(--content-inset)`; `.mdpm-banner` carries `border-bottom: var(--border-heading)` full-bleed at a 230px band.
- `Pommora/src/renderer/src/MarkdownPM/index.tsx` (L504–514, L520–527) — the ResizeObserver that sets `--header-zone` from `header.offsetHeight`, and the `title !== undefined && path !== undefined` gate that decides whether `PageHeader` renders at all.
- `Pommora/src/renderer/src/Detail/Views/PropertyEditing/usePropertyRows.ts` — the one engine: schema resolution, context rows, `commitValue` / `commitContext`, `editRow`, `valueMenu`. Its signature is `(page, fm, setFm)` — **the host supplies the frontmatter and its optimistic-overlay setter.**
- `Pommora/src/renderer/src/Properties/PagePropertiesPane.tsx` + `pageProperties.css.ts` — the Settings dropdown's Properties leaf. Rows are `(icon)(label)(value)`, value `margin-left: auto`, grouped into two `fill.tertiary` field blocks, with an Add Property picker.
- `Pommora/src/renderer/src/PagePreview/PreviewInspector.tsx` — the second host; deliberately shows only rows the page actually holds, where the pane pre-shows every Context slot.
- `Pommora/src/shared/propertyMenu.ts` (L28–45) — the removal vocabulary. `assigned-row` offers `property:remove` (Collection-durable unassign); `page-value` offers `value:clear` and `value:remove`, both per-page and session-only, and its docstring states neither touches the schema.
- `Pommora/src/main/crud/removeProperty.ts` — `property:remove`: unassigns from `properties[]`, caches every member page's raw value first, strips the key, and replays the cache on re-assign.
- `Pommora/src/main/crud/containerConfig.ts` (L42–52) — `setContainerConfig` writes `open_in` and its siblings inside `withSidecarLock`, reading and writing the sidecar within the lock it holds.
- `Pommora/src/main/io/fileLock.ts` (L20–34) — `serializeOnFile` **rejects a re-entrant take** of a key the call already holds.
- `Pommora/src/renderer/src/DesignSystem/Interactions/OverScroll/OverScroll.tsx` (L55–76) — `wireCaps` installs one document-level, capture-phase, non-passive `wheel` listener: over any cap, the dominant delta drives `scrollLeft` and the event is `preventDefault()`ed until the cap exhausts.
- `Pommora/src/renderer/src/DesignSystem/Components/Fields/SegmentRun.tsx` + `segmentRun.css.ts` — hairline `Segment` divider and `OverScroll` fade over a `SegmentEntry { key, label: string, icon?, onRemove? }` model rendered as `FileLabel`s. Its own stylesheet scopes it to "plain names that carry no color of their own."
- `Pommora/src/renderer/src/DesignSystem/Tokens/color.css.ts` · `theme-vars.css.ts` — `fill.*`, `separator.*`, `--border-heading: 1.75px solid var(--separator-border)`.
- `Pommora/src/shared/schemas.ts` (L46–52) — `_pagecollection.json`'s `properties[]` is the assignment list, and its array order is the Collection's property order.
- `Pommora/src/renderer/src/Detail/PageView.tsx` (L127–131) · `DetailPane.tsx` — `MarkdownEditor` is keyed on `pageDetail.path`; up to `WARM_TABS` parked `PageView`s carry their own `detail` prop because the store's page describes whichever tab is active.

### Decisions

#### A — Placement & Ownership

- **A-1:** [confirmed] The page's title header is drawn by MarkdownPM's `PageHeader`, not by the detail scaffold. Anything rendering "under the title, above the body" lives in or beside that component.
- **A-2:** [confirmed] `PageHeader` renders only when a host passes `title` + `path` to `MarkdownEditor`, and **`PageView` is the only host that does**. `PageEmbed` and `MarkdownBlock` pass neither; embedded pages, the preview's body and the hover card build their own chrome. The panel is page-view-only by construction — no host gate to write.
- **A-3:** [confirmed] Scope is the detail-pane page view. The preview keeps `PreviewInspector`; embeds stay unchanged.
- **A-4:** [confirmed] `.mdpm-header` is absolutely positioned, outside the scroller's flow, and a compositor animation translates it up 1:1 with scroll over exactly its own height. **Nothing sticks, nothing pins** — it behaves as the document's first block. Because `animation-range` and the translate both read `--header-zone`, the 1:1 relation holds even when that value changes mid-scroll.
- **A-5:** [confirmed] The panel's frontmatter comes from `pageDetail.frontmatter`, threaded from `PageView` into `PageHeader` alongside the page it already passes. It must **not** be read from the store the way `PagePropertiesPane` reads it — parked surfaces carry their own `detail` precisely because the store's page is whichever tab is active, so a store read would show the active page's values inside two off-screen surfaces. This also settles the loading state: `PageView` returns a placeholder before the editor mounts, so the panel has no loading state of its own.

#### B — The Two Shapes

- **B-1:** [confirmed] Compact borrows `SegmentRun`'s hairline `Segment` divider and the `OverScroll` fade — **not** `SegmentRun` itself. Its `SegmentEntry` model is `label: string` rendered as a `FileLabel`, and its stylesheet scopes it to names carrying no color; Compact's values are `Cell` renders — colored Select and Status chips, checkboxes, dates, file and link chips — which is the case that model explicitly excludes. `FileLabel`'s built-in hover-× would also collide with the row's own Remove.
- **B-2:** [confirmed] Standard's mechanism exists: `PagePropertiesPane`'s row and field-block styles.
- **B-3:** [confirmed] Compact vs Standard is chosen **per Collection**, on `_pagecollection.json` beside `open_in`. The nexus setting stays a plain on/off.
- **B-4:** [confirmed] Values stay **right-aligned**, as the pane has them. If the distance reads wrong, a `max-width` on the cell closes it — decided by looking, not in prose.
- **B-5:** [confirmed] **Standard** shows every property and Context the page **holds**, plus the empty slots the Collection's default visibility stands open, on the em-dash placeholder. A held value is never hidden by configuration.
- **B-6:** [confirmed] **Compact** shows held rows only — it stands no empty slots open, so default visibility reaches it only through what its Add menu offers first.
- **B-7:** [confirmed] Compact's add is an **invisible target on the empty track**, the same law Cards' in-grid creation follows — the affordance is the space, not a button. An overflowed run falls back to a hover **Add Property** below it. Both are gated on there being something to add: a Collection assigning nothing must not open an empty menu.
- **B-8:** [confirmed] Durable visibility is **Collection configuration**, not a persisted gesture — see §I and §J. The panel's row menu keeps `Clear` and `Remove` exactly as they read everywhere else, and the transient act is renamed **Hide**.
- **B-9:** [confirmed] B-12's height bound therefore governs a list whose ceiling is *held rows plus defaulted slots*, not the whole schema — which makes the bound smaller in practice without changing that it is required.
- **B-10:** [confirmed] The reveal is a **plain hover into the property field** — immediate, no dwell, no ghost machinery. `useGhostAnchor`'s 1500 ms is the dwell before a gesture *creates a card*; revealing an affordance that already belongs to the field is not that gesture. Compact borrows Cards' law, not its mechanism.
- **B-11:** [confirmed] **Compact's run must not take the document's wheel.** `OverScroll`'s cap installs a document-level capture-phase non-passive wheel handler that drives `scrollLeft` from the *dominant* delta and calls `preventDefault()` — so a vertical scroll gesture with the pointer over the run drags properties sideways and the page does not move until the run exhausts. The panel sits exactly where the pointer rests when a page opens, and `segmentRun.css.ts` gives every segment `flexShrink: 0` with the chip cap lifted, so overflow is the normal case. Compact takes the **fade without the cap class**, or a horizontal-dominant gate on the wheel for this host.
- **B-12:** [confirmed] **Standard's height is bounded.** `--header-zone` is the body's top padding, so an uncapped row list pushes the body off-screen — a Collection with twelve properties and four Contexts is sixteen rows of chrome above the first line, on top of a 230px banner. Standard takes a `max-height` with the house `OverScroll` fade. This is a Core decision, not a cosmetic knob, because the panel's height *is* the body's inset.
- **B-13:** [confirmed] **Every hover state occupies reserved space.** The `ResizeObserver` rewrites `--header-zone` on any header size change, so an in-flow hover affordance shifts the whole document down on pointer-in and back on pointer-out, with no dwell to damp it. B-7's fallback Add Property and any wrapping chip run are absolute or sit in a fixed-height slot.

#### C — Order

- **C-1:** [confirmed] The Collection's `properties[]` order already exists, is editable from Collection Settings, and is what both existing surfaces iterate. Sharing it costs nothing.
- **C-2:** [confirmed] V1 **reads** that order and offers no drag. Reordering from a page is a Prospect, deferred because the gesture's reach — one page's drag rewriting every page in the Collection — has not been deliberately wanted.

#### D — Properties In The Hover Card

- **D-1:** [confirmed] "Show inline properties on hover" means the **connection hover card**, not a hover-reveal on the page.
- **D-2:** [confirmed] The hover card renders a page through `PageEmbed` with `chrome='page'`, inside a resizable card whose size persists. It is a separate surface on the same engine, not this panel.
- **D-3:** [assumed] The hover card gets **Compact only** — a card's height is its scarcest resource.
- **D-4:** [confirmed] This is a Prospect, so **its toggle is not part of V1's persistence budget** and must not ship as a knob with no feature behind it.

#### E — The Outline In The Cell

- **E-1:** [confirmed] `OutlinePane` mounts **only while its dropdown is open**, by explicit design: the derivation is a whole-document scan (`headingOutline` over the live body, republished on a 120 ms debounce). An always-mounted inline outline re-derives on every debounced keystroke of the open page.
- **E-2:** [confirmed] The header scrolls away with the document. An outline placed there is gone once the page scrolls, which is exactly when an outline is worth having.
- **E-3:** [confirmed] The outline stays on the toolbar; the cell holds properties only. The label-to-value distance that motivated moving it is answered by B-4's `max-width`.

#### F — Persistence Budget

Nathan's constraint: add no persistence that doesn't have to exist.

- **F-1:** [confirmed] Order costs nothing.
- **F-2:** [confirmed] Which rows show is **configuration** (§J), not a gesture's residue. Hide stays session-only, matching both existing surfaces.
- **F-3:** [confirmed] V1's budget is **three keys**, all on files with existing setters: the nexus on/off in `settings.json`, and the Compact/Standard choice plus the default-visibility set on `_pagecollection.json`. The hover-card toggle belongs to a Prospect and is not counted.
- **F-4:** [confirmed] **No per-page override in V1.** That would cost a device-local page-keyed map for a knob nobody has wanted to vary per page. Prospect.
- **F-5:** [confirmed] A page-keyed device-local map, if one is ever needed, has a working shape: `headingIcon:get/set` over `local_state` — one `Scope` entry and two bridge channels.
- **F-6:** [confirmed] **The asymmetry is gone.** Hide and the session `revealed` set are now both transient, and durable visibility is configuration on the other side of the line. A rename, a tab switch past the warm budget, or ⌘R resets both — which is coherent, because neither is a stored fact about the page.

#### G — Adjacencies

- **G-1:** [confirmed] The Features folder was consolidated on 08-25-2026 — `SubfieldPM`, `SidebarPM`, `PagePreviewPM`, `AgendaPM`, `CardViewPM`, `TableViewPM`, `ViewsPM`, `PageSetsPM` and `QuickCapturePM` are gone; `InterfacePM` and `ViewTypesPM` replace them. Docs going stale on ship: [[PropertiesPM]] §Pending, [[ConfigurationPM]] §Pages & Editor and §Collections, [[CollectionsPM]], [[PagesPM]], [[MarkdownPM]], and [[InterfacePM]] §The Hover Card only if that Prospect ships.

#### H — The Sweep

Run against `dont-forget-sweep.md`.

- **H-1:** [confirmed] *Persistence.* Every new key is optional on its schema, so a sidecar written before this feature reads as the default, and foreign keys already ride through every sidecar write.
- **H-2:** [confirmed] *Compatibility.* Any stored id set must treat an unresolvable id as inert, never as an error — the precedent is `resolveAssignedSchema` dropping dangling refs.
- **H-3:** [confirmed] *Concurrency — resolved, and the earlier prescription was wrong.* `withSidecarLock` already serializes every whole-file sidecar rewrite on `sidecarPath`, so the two-tabs race is pre-solved. The new keys ride `ContainerConfigPatch` through `setContainerConfig`'s existing lock, reading and writing inside it — **not** `rmwJsonStrict`, which takes its own lock on the same path and would be rejected as re-entrant.
- **H-4:** [confirmed] *Interaction — closed, no work.* `.mdpm-header` is an absolutely-positioned sibling of `.mdpm-editor`, not a `.cm-content` descendant, and CM6 seats carets only inside its own DOM. `DetailTitleHeader` has lived there without a containment guard. Structure, not luck.
- **H-5:** [confirmed] *Interaction.* A picker open on a property row **dismisses once its anchor scrolls out of the viewport.** `PickerMenu` today re-measures on scroll and clamps to the viewport margin, leaving an off-screen anchor's picker parked at the window edge. This is a **pre-existing gap in the shared component** — every scrolling picker host has it, the table's cell pickers included. Fixing it in `PickerMenu` fixes it everywhere and touches every consumer; that reach is the planner's to scope explicitly, never to fold in quietly.
- **H-6:** [confirmed] *Interaction.* The add affordance stays reachable — it reveals on the field's own hover and the field contains it.
- **H-7:** [confirmed] *Failure recovery.* Value writes inherit the engine's optimistic-patch-then-reconcile, so a refused write reverts rather than persisting a lie.
- **H-8:** [open] *Performance.* Whether a picker anchored in the translating header stays attached during scroll is unresolved from source: the header moves by a compositor animation, and whether the rect the main thread reads matches what's painted can only be seen. One check with the app open — pop a picker from a property value and scroll slowly. Smooth tracking means H-5's behavior is the whole story; a trailing frame means dismiss-on-scroll is required rather than preferred.

#### I — The Removal Collision (blocking)

Three meanings of "Remove" would share one panel, and the spec reconciled none of them.

- **I-1:** [confirmed] `page-value` → `value:remove` is per-page and session-only, and both existing hosts route it through `emptyRow(id, keep=false)`, which **calls `commitValue(id, null)` first** — it erases the value on disk, then hides the row.
- **I-2:** [confirmed] `assigned-row` → `property:remove` is the Collection-durable removal, and it already does this properly: it caches every member page's raw value before stripping and replays the cache on re-assign.
- **I-3:** [confirmed] Durable per-Collection hiding would be a third meaning on the same gesture, with no value cache and no restore path — and three consequences follow. **Silent data loss:** Core's "no second way to write" points an implementer at `emptyRow`, so Remove erases this page's value while the user reads it as hiding a row. **Blast radius:** hiding on page A hides on pages B…Z, which may hold values for that row — the exact reach C-2 deferred reordering over. **A one-way trapdoor:** B-5 makes Standard show everything, so the Add Property picker's only content would be removed rows — and Core specifies an add affordance for **Compact only**, leaving Standard no way back short of hand-editing the sidecar. `propertyMenu` offers Remove even on an empty row, so nothing gates the last one.
- **I-4:** [confirmed] **The panel's row menu keeps exactly today's meanings** — Clear empties the value and leaves the row; Remove empties it and takes the row away, back into Add Property. No third meaning, no new menu context. The dropdown's existing split is the model.
- **I-5:** [confirmed] Today's Remove **also clears the value** — `emptyRow(id, keep=false)` calls `commitValue(id, null)` before dropping the row. Nathan's phrasing separates the two acts, the code couples them, and coupling them is right: a row taken away while its value stayed on disk would leave a value nothing displays.
- **I-6:** [confirmed] **The scope conflict dissolves by splitting the concepts.** Durable visibility stops being a persisted gesture and becomes **Collection configuration**; the transient per-session act is renamed **Hide**, so `Remove` and `Clear` retain their exact meanings everywhere else, and nothing in the existing vocabulary shifts. Three words, three jobs: Clear empties a value, Remove takes a row away for the session, Hide — the renamed transient act — and the Collection's own default is a setting, not a gesture.
- **I-7:** [confirmed] **One shared source, three consumers.** The Collection's default visibility governs the inline panel, the preview inspector, and the Settings pane alike.

#### J — Default Visibility (the shared source)

- **J-1:** [confirmed] The write path exists end to end and needs no new channel. Seven touch points, every one an existing seam: `pageCollectionSidecar` in `shared/schemas.ts` (loose, so foreign keys ride through); a field on `CollectionNode` in `shared/types.ts`; one projection line in `readNexus.ts` beside `properties:` and `openIn:`; one key on `ContainerConfigPatch` in `main/crud/containerConfig.ts`, which already holds the sidecar lock and does the read-modify-write; the `patch` type on `container:configure` in `shared/bridge.ts`; and the renderer's existing `window.nexus.container.configure(path, kind, patch)`, already called by `ViewDropdown`.
- **J-2:** [confirmed] **Default visibility never hides a value.** A property or Context the page **holds** is shown, always, whatever the setting says — the set governs only what the panel offers for the rows a page holds *nothing* for. That resolves the allowlist question that would otherwise have been a real fork: an allowlist is safe here precisely because an empty one costs a page nothing it holds. A Collection with no array simply stands no empty slots open, and views' never-auto-append law carries over intact.
- **J-2a:** [assumed] The unified reading across both shapes: default visibility is **the set of unfilled rows the panel offers by default** — standing empty slots in Standard, and the Add menu's default contents in Compact, which shows no empty rows of its own. One rule, worn per shape.
- **J-2b:** [confirmed] The set is **seeded with the three seeded Contexts** at Collection creation, so a new Collection's pages stand Areas / Topics / Projects open without configuration — which is how `PagePropertiesPane`'s current pre-show behavior survives as a seed rather than as a hardcoded rule. Seeding resolves ids from the registry, so a rename rides through and a since-deleted seeded Context contributes an id that reads inert per H-2. A Context created later is not auto-added, matching the never-auto-append law.
- **J-2c:** [confirmed] **"Held" needs no new predicate.** `isBlankValue` in `@shared/propertyValue` is the house test, and `applyValueAtRoot` **deletes the key when a value is blank** — so "the key exists in frontmatter" and "not blank" are the same statement by construction, and the two existing surfaces' different-looking tests cannot disagree. The sharp case resolves cleanly: a checkbox at `false` falls to the `default: return false` arm, so it is not blank, it persists, and it counts as held.
- **J-3:** [confirmed] **Two shipped surfaces change behavior.** `PreviewInspector` shows only rows the page actually holds; `PagePropertiesPane` pre-shows every Context slot — and each file carries a comment calling that divergence "a standing design decision, not drift." Both comments are **deleted**, not rewritten: the divergence they defend no longer exists, and a note explaining what changed would record the correction rather than the rule. The shared source is the rule, stated once where it lives.
- **J-4:** [assumed] **The authoring UI is the Visibility pane, generalized.** `HiddenPane` + `hiddenPaneModel` already author exactly this shown/hidden split — eye toggles, drag between zones, positional unhide, a hidden order derived in collection order. The model is pure but hard-typed to the view (`VisibilityPatch = Pick<SavedView, 'property_order' | 'hidden_properties'>`) and the React half reads `useActiveView` / `useSaveView`. Parameterizing the model to a plain `{ order, hidden }` pair and taking the source as a prop is mechanical, and it is what keeps a second visibility pane from being written. Naming it here so the planner reuses rather than rebuilds.
- **J-5:** [confirmed] Stale ids are inert, per H-2 — `hiddenListIds` already keeps an unresolvable hidden id in the array while displaying it nowhere, so foreign keys survive the loose-sidecar contract.

### Core (must-have)

- The panel renders under the page title in the detail pane, in both banner states, honoring the nexus on/off setting, reading frontmatter threaded from `PageView` (A-5).
- Standard: every assigned property and every Context slot, empty rows on the em-dash placeholder, values right-aligned, order from the Collection's `properties[]`, height bounded per B-12.
- Compact: filled rows only, hairline-divided, the fade without the wheel cap (B-11); add by the empty track, or the reserved-space hover affordance when the run has overflowed (B-7, B-13).
- Per-Collection shape and per-Collection default visibility, both on the sidecar, written through `setContainerConfig`'s existing lock and the existing `container:configure` channel (H-3, J-1).
- One default-visibility source read by the inline panel, the preview inspector, and the Settings pane alike — seeded with the three seeded Contexts, never hiding a held value, with both surfaces' divergence comments deleted (J-2, J-2b, J-3).
- Every value read and written through `usePropertyRows` — no second way to write.
- The row menu's `Clear` and `Remove` unchanged from today; the transient act renamed **Hide**.

#### Prospects (allowed later, not now)

- **Properties in the connection hover card** — Compact only, its own toggle. Don't-foreclose: keep the Compact renderer a component that takes rows, not one that reads the open page.
- **Drag-to-reorder Compact's segments** — writes the Collection's `properties[]`; deferred until that reach is deliberately wanted.
- **A per-page override of the nexus toggle** — the `citationsShown` shape, at the cost of a device-local page-keyed map.
- **The Settings dropdown's Properties leaf** — whether it stays.

#### Out of Scope (won't do — distinct from Prospects)

- **Properties on the preview window's page.** It already has `PreviewInspector`.
- **Properties in embedded page tiles.** Embeds build their own chrome and never render `PageHeader`.

#### Considered & Rejected

- **A CM6 widget at the top of the document** (Obsidian's Properties view). Rejected: it buys nothing, because the header already behaves as the document's first block — it translates 1:1 with scroll and leaves the viewport when a real first block would — and it costs a widget entangled with the caret, undo, and the editor invariants that carry their own guidelines doc.
- **A sticky strip that never scrolls away.** Rejected: it spends vertical room permanently to solve a problem the page doesn't have. Reopens only if G-4 rules that headers are meant to lock.
- **Properties as a Subfield item.** Rejected as the primary surface: only one shape fits a one-line bar, and a page stating what it is at the foot of the window inverts where that belongs. Worth remembering as the cheapest home if the header proves wrong.
- **`rmwJsonStrict` for the sidecar keys.** Rejected on evidence: `setContainerConfig` already holds the sidecar lock, and `serializeOnFile` rejects a re-entrant take of a held key.

#### Status At Handoff

The design is settled and this log is the contract. One full adversarial round ran against it and all ten findings were verified against the code and folded in; a second round was started against §I and §J and **stopped before reporting**, so those two sections carry one pass of scrutiny rather than two — worth knowing, not worth blocking on.

Five items are carried rather than settled, none of them blocking:

- **D-3** and **G-1** belong to Prospects and are answered after the panel exists.
- **H-8** can only be answered with the app open: pop a picker from a property value and scroll slowly. Smooth tracking means H-5 is the whole story; a trailing frame makes dismiss-on-scroll required rather than preferred.
- **J-2a** is the reading that default visibility means "the unfilled rows the panel offers," rendered as standing slots in Standard and as the Add menu's default contents in Compact. It follows from J-2 and wants one confirmation before it hardens.
- **J-4** is an optimistic read of how far `hiddenPaneModel` generalizes. It is pure and small, but it leans on view-specific concepts — a guaranteed Title row, `modifiedAt`, and `property_order` as a window into a full column order — that may have no meaning at the Collection tier. Open it before committing to "generalize" over "build a sibling."

#### Lessons

- A component "shared by three hosts" is a claim to verify at the mount, not at the import. `PageHeader` looked shared and is rendered by exactly one host, because the two props gating it are passed by exactly one caller.
- An absolutely-positioned element translated 1:1 with scroll is an ordinary scrolling element, not a sticky one. The distinction decides where a surface may be placed, so read the animation range rather than the word beside it.
- A verified claim about each decision is not a verified design. Every serious defect here was a **composition** — durable removal against the existing removal vocabulary, a borrowed scroll cap against where the pointer sits, an unbounded row list against the variable that is also the body's inset. Cross the decisions against each other, not only against the code.
- Reusing a vocabulary means inheriting its meanings. "Remove" already meant two things in this codebase; adding a third to the same menu is how a hide gesture becomes a delete.
