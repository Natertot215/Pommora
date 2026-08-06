## Hover Preview — Decision Log

### Frame

- **Purpose:** Fill the connection hover card's blank body — resting on a resolved `[[Connection]]` should show the target page's actual content in a compact floating preview, closing the long-standing "hover-previews" gap.
- **Core Value:** Glanceable page content without navigating, clicking, or opening the full preview window.
- **Success Criteria:** Hovering a resolved connection past the intent delay shows the page body (no banner, no inline title) readably condensed inside the card; the card resizes by its edges/corners and every card everywhere opens at that one remembered size; a Settings ▸ Pages slider controls how long the card lingers after hover-off (default None, 0–30s).

### Sources

- `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — the existing shell: PickerMenu-mounted, backdrop-free, `manageFocus` off, 200ms leave-grace + 6px slop, Escape closes; the body is an empty fixed-size div. Mounted by all four connection hosts (PageView, BlockSurface, NavWindow, PreviewWindow).
- `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts` — the hover trigger: 450ms intent delay, class-gated mouseover, fires `api.hover(page, rect)`.
- `Pommora/src/renderer/src/Embeds/PageEmbed.tsx` — the shared page-body renderer: read-only CM6 mount, `chrome: 'none'` default (no banner, no title), self-fetching through the warm detail slot (`readPageDetail` → `openPage` on miss), condensed via the embed scale/zoom pair.
- `Pommora/src/renderer/src/PagePreview/PreviewWindow.tsx` — proof of the pattern: the floating window's body is exactly a `PageEmbed` with `chrome` omitted.
- `Pommora/src/renderer/src/design-system/interactions/gesture.ts` + `SurfacePM/SurfaceView.tsx` (edge zones) + `sensors/pointerDrag.ts` — the tile resize mechanism: eight edge/corner zones over a shared pointer-gesture skeleton; `swallowActiveEscape` exists precisely for a drag living inside a dismissable host. `TILE_MIN_PX` in `design-system/tokens/size.css.ts`.
- `Pommora/src/renderer/src/Toolbar/Toolbar.tsx` + `design-system/components/NotchedPane.tsx` — the flow-beak precedent: the trio dropdowns hold the pane still and aim the beak at their opener through a measured inset; NotchedPane accepts an arbitrary inset on any side, clamps it inside the corner radii, and Blooms from the beak tip.
- `Pommora/src/renderer/src/design-system/interactions/FloatingWindow.tsx` — the corner-grip alternative; its `geoStore` size memory is session-only, never disk.
- `Pommora/src/renderer/src/Settings/SettingsWindow.tsx` — Settings ▸ Pages exists; rows are currently a boolean-only `TOGGLES` schema rendered through one path; new control kinds need a discriminated row union.
- `Pommora/src/renderer/src/design-system/components/Slider/Slider.tsx` — the app's one slider (consumer: card Scale in ViewSettings); commit-on-release, per-tick drafts, format callback.
- `Pommora/src/main/db/localState.ts` — device-local `nexus.db` scopes (embedHeights, headingCols, folds…); the per-machine-chrome doctrine home.
- `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — the resting cell render: emits the same `md-connection-resolved` spans and already receives the `ConnectionsApi`; no hover handler today.
- [[ConfigurationPM]] — the three persistence scopes: per-Nexus synced `settings.json`, per-device app config, per-machine chrome in `nexus.db`; `defaultViewScale` as the numeric-personalization precedent.
- [[PagePreviewPM]] · [[ConnectionsPM]] · [[MarkdownPM]] §II. Embeddings · [[SurfacePM]] — the governing feature docs.

### Decisions

#### A — The Body

- **A-1:** [confirmed] The card fills the existing `ConnectionHoverCard` shell — trigger, chassis, and dismissal stay as built; this arc replaces only the blank body and adds resize + linger.
- **A-2:** [confirmed] The body is a read-only `PageEmbed` (`chrome: 'none'`) — the component the preview window mounts, so no banner and no inline title by construction, and the embed zoom curve as the condensation mechanism. No second renderer exists or gets built. Two deliberate divergences from the preview window's mount: the card passes a host chain so nested `![[Embed]]` tiles render **inert** (an empty chain makes them interactive → editable — a third page taking keystrokes from inside a hover card), and the card resolves the page detail **before** opening (see A-5) instead of letting the embed self-fetch after the bloom.
- **A-6:** [confirmed] The body's connections API is resolve-only — links inside the card style correctly but carry no `hover`, `open`, or `menu`. Omitting the API entirely renders raw uncolored brackets; passing the host's API makes the card retarget itself to links inside its own body (a card hovering its own content). Resolve-only is the only shape where "clicks inside do nothing" holds by construction.
- **A-3:** [confirmed] Content scrolls internally and fully — the card owns its overflow, and the pointer entering the card **never** counts as hovering off; while inside, the card stays open indefinitely.
- **A-4:** [confirmed] Glance-only: never editable, wheel scrolls, and the caret never enters — the body takes no selection or focus; clicks inside the card do nothing. Whether an in-card connection click should instead open a preview is parked for Nathan's future call — "do nothing" is the ruling for now.
- **A-5:** [confirmed] A failed fetch means the card simply doesn't open — no error box blooms on hover. This forces the fetch **ahead of** the bloom: the warm slot answers synchronously for recently-touched pages, a cold page fetches during/after the intent delay, and the card opens only once the body exists — which also kills the blank-pane frame a self-fetching embed would flash.
- **A-7:** [confirmed] The card closes when its host navigates or the target context changes — a click that leaves the page must not strand a lingering card over the destination (the card currently unmounts-while-open and re-blooms on the new page; the linger would widen that from a blink to seconds). The card's mount also moves outside the host's ready-state branch so an open card is never torn down by a loading flip.
- **A-8:** [confirmed] Prerequisite fix in the trigger: the editor's click and context-menu handlers must cancel the pending hover-intent timer — today a click inside the 450ms window leaves it armed, and with a real body the orphaned card blooms over whatever the click opened.

#### B — Size + Resize

- **B-1:** [confirmed] One universal size: every hover card opens at the persisted size; resizing any card updates it for all. Min/max bounds clamp it.
- **B-2:** [confirmed] Resize rides the SurfacePM edge chrome and gesture skeleton on the free edges only: the **right edge, the bottom edge, and their corner** — width + height, with height growing **downward only**; the card never grows upward. A card flipped above a link near the viewport floor therefore offers width resize alone (its bottom edge is the anchored one). Because placement is beak-anchored (B-4), width growth distributes around the link — both sides when the card sits centered, one-sided once a viewport clamp pins the other — and height growth extends the bottom edge 1:1.
- **B-3:** [confirmed] Size persists per-machine in `nexus.db` (a new singleton local-state scope) — UI geometry is per-machine chrome under the ConfigurationPM doctrine, the embed-height precedent. The linger knob syncs, the geometry doesn't. The size reads through one accessor that clamps against min/max **on read** — a stored value from before a bounds change must not reopen out of bounds (the sidebar/inspector width precedent).
- **B-4:** [confirmed] **The beak flows with the link.** The card centers itself on the link clamped inside the viewport, and the beak slides along the card's edge to keep pointing at it — a link near the page's right edge wears the beak near the card's right end, a left-edge link near the left end, a mid-page link centered. This is the toolbar trio's existing pattern, not new machinery: the Navigation/Settings dropdowns already hold the pane still and aim the beak at their opener via a measured inset, and NotchedPane natively accepts an arbitrary inset on any side, clamps it inside the corner radii, and starts the Bloom from the beak tip. The only new code is PickerMenu's centered branch computing that inset (link center − pane edge) instead of defaulting the beak to center; the both-sides viewport clamp comes free with center-derived placement. The card anchors to the **live link element**, not a rect captured at hover time — the hover signature carries the element so the existing measure machinery tracks editor scroll for real (today's frozen rect leaves the card pinned to dead coordinates the moment anything scrolls, which a linger makes routine). The link scrolling out of the viewport (its DOM node destroyed) is a close condition, and the flip decision re-decides when the card retargets to a different link — the linger keeps the card open across retargets, so a decision frozen per-open no longer converges.
- **B-5:** [confirmed] The close lifecycle suspends during an active resize drag — the pointer leaving the card mid-drag must not dismiss it (`swallowActiveEscape` already keeps Escape aborting the drag rather than closing the card). After the drop, the grace re-arms on the first pointer movement — releasing a drag just outside the card doesn't close it, and a card released beyond the size cap can't stand forever waiting for a re-entry that never comes.
- **B-6:** [open] Default size before any resize and the min bound — knob values, Nathan-tuned. The max is **not** a free knob: height/width clamp to the viewport at placement time, since a card resized tall on one screen must not open half-off a shorter one and the flip decision is fixed per-open.
- **B-7:** [confirmed] At most one card is live app-wide. The hook is per-host (main page, dashboard surface, preview window, nav window) and two hosts render simultaneously; the linger would otherwise let two cards stand at once.

#### C — The Linger Slider

- **C-1:** [confirmed] Settings ▸ Pages gains a duration slider, defaulting to **None**, range 0–30 seconds.
- **C-2:** [confirmed] Semantics: **None** keeps today's short travel-grace (the pointer can still cross from link to card); a set duration holds the card open that long after the pointer leaves both link and card, re-entry cancelling the countdown.
- **C-3:** [confirmed] The knob is a per-Nexus personalization key in `settings.json` (numeric, coerced on read like `defaultViewScale`), written through the existing generic setter — consistent with every other Settings-window row. The key must land in all three contract sites — `shared/types.ts`, the `readNexus.ts` coercion pass (a key missed there silently drops on the next open, so the slider would appear to work and revert), and the round-trip test's key list.
- **C-4:** [assumed] The Settings row schema grows from boolean-only into a discriminated union so a slider row can render beside switches.
- **C-5:** [assumed] 1-second steps; the 0 position reads "None" in the slider's readout and stores **no key** (the clean-file discipline every default-valued Settings row follows), never a literal 0.

#### D — Table Cells

- **D-1:** [confirmed] Resting table cells join the trigger: hovering a resolved connection in a static cell raises the same card. The card's body-level portal already layers above the table, so nothing about its geometry is cell-constrained — the missing piece was purely that static cells never fired the hover.
- **D-2:** [confirmed] The trigger reuses the intent-delay logic against the static render's existing `md-connection-resolved` spans and the `ConnectionsApi` StaticCell already receives — which means hoisting that logic out of the editor handler closure first (it's currently bound to CM6 hit-testing and not shareable as-is). Clicking a resting cell swaps it into its editor; that activation cancels/closes the card so it never hangs over a cell being edited.
- **D-3:** [confirmed] The focused live cell editor has **no** connection handlers at all — no hover, no click-navigate, no menu. D-1 doesn't change that: in-cell links act on hover from the resting state only, and giving the live cell editor link behavior is a separate future decision (Prospects).

### Core (must-have)

- PageEmbed body inside the existing card shell — read-only, no banner/title, internally scrolling, condensed at the embed scale.
- Edge/corner resize with the universal persisted size + min/max clamps.
- The linger slider in Settings ▸ Pages with the None default.

#### Prospects (allowed later, not now)

- **Per-page default size** — a page-level override of the universal size (Nathan-named prospective feature); don't-foreclose: keep the size read behind one accessor.
- **In-card connection clicks opening a preview** — parked with A-4; "do nothing" rules until Nathan decides.
- **Interactive card** (editing, in-card navigation) — the preview window's territory unless glance-only proves insufficient.
- **Live-cell connection handlers** — the focused table cell editor carries no link behavior (click, menu, or hover); wiring it is its own decision, not this arc's.

#### Out of Scope

- The full preview window, its tabs, inspector, or routing — untouched.
- The hover trigger's intent delay (450ms) — not a setting in this arc.

#### Considered & Rejected

- **A mini PreviewPane window as the card** — duplicates the real preview window's chassis for a hover affordance; the PickerMenu shell already positions, flips, and dismisses.
- **A bespoke static markdown renderer for cheapness** — no second renderer exists; PageEmbed is already lazy and warm-cached, and a parallel renderer is the exact DRY violation the embed framework exists to prevent.
- **FloatingWindow corner grips as the resize mechanism** — Nathan specified the SurfacePM tile mechanism; the corner-grip hook also hard-couples recentering position, which an anchored card can't use.
- **All eight resize zones via placement offsets** — dragging a pinned edge would need the drag to write a position override into PickerMenu, adding position-coupling to a shared component so that zones which grow the card away from the cursor can pretend to work.

#### Lessons

- A component reused from another surface imports that surface's *interactivity defaults*, not just its rendering — the preview window's PageEmbed mount is editable-by-construction one embed level down, which is correct there and disqualifying in a hover card. Audit the defaults, not just the props you pass.
- Timers that were invisible under a 200ms lifetime become artifacts under a 30-second one — every "the grace hides it" behavior (frozen anchor rect, un-cancelled intent timers, per-open flip decisions, per-host duplication) resurfaced the moment the linger entered the design.
