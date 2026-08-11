## Cards Creation Adoption — Decision Log

### Frame

- **Purpose:** The Cards view adopts the creation engine PM-096 proved on the table — the band "+", a New Page menu item, and empty-field naming — and gains its own hover ghost: a ghosted, bordered card whose chrome and motion belong to Cards alone.
- **Core Value:** Creating a page never leaves the Cards view, with the same one-act creation feel the table and sidebar already share.
- **Success Criteria:** Every Cards creation trigger produces a page instantly (Untitled on disk, stamped by its birth context) with an empty naming field over a real card; the ghost card appears on dwell, displaces its neighbors on the cards' own move motion, and creates on click — landing where the ghost stood, including under a prior manual reorder.

### Sources

- `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx` — band render with `showAdd` armed and no `onAdd` (:531-539); headless bands under Group By: None (:537); menu router (:951-981); banner-menu pop inside the card (:989-1006); rename-as-popover via TextPicker (:1069-1080); title body + zone-click hit test (:821-864, :1029-1042); set-cards' **standalone** `SortableZone` (no `group`) (:450-459); `SetCard`'s plain-span title (:663-668); drag-overlay CardFace ghost shell (:486-521); `reorderInBandByIndex` — sets `manualOverride` and the wire `viewOrders`, never the local copy (:391-405); cross-location drop discarding its landing index (:413-420); the value/override resets keyed on `[source.path]` and `[view.id]` only (:179-188, :261-267); memoized PageCard (:895).
- `Pommora/src/renderer/src/Detail/Views/Cards/CardValue.tsx` — the cell-menu pop inside the memoized card (:101-110); `cardApi` (`CardsView.tsx:558-565`) is the existing identity-stable seam through the memo.
- `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.css` — auto-fill grid, cards stretch to their row's height (:74-90); `.page-card-body` stylesheet-transitions `transform` for hover-pop (:117-119); `.set-cards-row` fixed-width tracks (:49-70); `.page-card-ph` placeholder glyph treatment; `--card-scale` is track sizing only (:9-13).
- `Pommora/src/renderer/src/Detail/Views/Cards/cardsBand.ts` — `bandShowsAdd` true only for `structural-set`, with the create-routing deferral comment (:3-8).
- `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — the engine's table-local closures to port: `patchSeedValues` (:1413), `createPageIn` (:1425), `bandAdd` (:1479 — **no non-structural order tail**), `newPageAdjacent` with its `tieOrderWith` tail (:1494-1519), `glideToRow` (:1449), `SEEDABLE_SORT_TYPES` (:117), `structuralOrderAfterDrop` (:44, :451); the table's own create-naming front-end — `editing.fromCreate` (:1445), empty initial (:767), direct `mutate({op:'rename', fromCreate})` (:777-789); the ghost machinery (:1548-1666), `GhostRow` (:1880); `manualOverride` state (:196) and its two resets — `[view.id]` (:257-268) and `[source]` (:275-277).
- `Pommora/src/renderer/src/Detail/Views/pipeline/sort.ts` — `resolveManualOrder`: `manualOverride` outranks `viewOrders` (:205-214); a row absent from the manual order ranks last, `Number.MAX_SAFE_INTEGER` (:170-183).
- `Pommora/src/renderer/src/Detail/Views/GroupBand.tsx` — set bands mount the store-keyed `RenamableTitle` (:58-64); `onAdd` optional, wired to the "+" (:182, :266).
- `Pommora/src/renderer/src/design-system/interactions/engine.tsx` — the on-move displacement feel (:518-551); the zone contract — the engine owns zone-item root transforms (:544).
- `Pommora/src/renderer/src/design-system/interactions/group.tsx` — item rects measured synchronously at activation (:385, :403); `DragGroupProps` exposes no drag-start signal (:150-157); `GroupCtx` module-private (:55).
- `Pommora/src/renderer/src/design-system/components/Reveal.tsx` — `onCollapsed` fires only from `onTransitionEnd` (:58-68).
- `Pommora/src/renderer/src/Components/RenamableLabel.tsx` — commit guard: empty/unchanged routes to `onCancel` (:43); `Pommora/src/renderer/src/Components/EditableInput.tsx` — focus-on-mount + 60ms re-focus backstop (:44-50).
- `Pommora/src/renderer/src/Sidebar/Sidebar.tsx` — page and set rows host the store-keyed rename affordance (:318, :352, :455); a child entering rename force-opens its collapsed ancestor (:229-234); the sidebar is always mounted (`App.tsx:247`).
- `Pommora/src/renderer/src/store.ts` — the store rename engine: `beginRename` (:1397), `cancelRename` clears the global slot (:1398), `submitRename` gates the create law on `kind === 'page'` (:1418); `newPageAdjacent` precedent (:1399-1416); optimistic insert via `insertCreatedInTree` (:1552); native-menu renames arrive surface-blind from main (`App.tsx:95`, `main/contextMenu.ts:59/:95`, `shared/bridge.ts:307`).
- `Pommora/src/renderer/src/treeMove.ts` — the positional optimistic insert honors a slot for pages only; sets append (:84, :180-181).
- `Pommora/src/shared/mutate.ts` — `createPage` seeds + order (:52-53); `createContainer` carries no order (:55); the shared container-add menu builder (:158-159).
- `Pommora/src/main/mutate.ts` — `createDisambiguated` (:233); the create-origin rename law lives inside the `kind === 'page'` branch (:254); the container rename branch renames strictly (:285).
- `Pommora/src/shared/pageMenu.ts` — `pageMetaMenuItems(alreadyOpen, { newPages })` emits the **pair** under one boolean (:19-34); `Pommora/src/shared/cardMenu.ts` consumes it with no opts (:41).
- [[CardViewPM]] — its "Cross-band card drag" prospect line (:94) and its Pending "Heading '+' creation" line (:90) both go false on ship.
- [[TableViewPM]] — the creation section this arc mirrors; the ghost-row law as shipped.
- [[InteractionPM]] — the motion law; the feel tokens the displacement rides.

### Decisions

#### A — Sequence & Scope

- **A-1:** [confirmed] The locked sequence: Cards creation adoption now; the connection display-alias opens on this arc's completion criteria; the wider alias system stays parked.
- **A-2:** [confirmed] The creation act is the table's, unchanged: the page exists the instant the gesture fires — Untitled on disk, stamped with what its birth context implies, first naming disambiguates and skips the link cascade, empty field resolves to Untitled on any exit. The *law* is defined once, in main's `fromCreate` rename path; surfaces differ only in which naming front-end drives it (see C-1).
- **A-3:** [assumed] The shared store loop is reused as-is; the table-local closures port into CardsView against Cards' own value-override seam. The port is not verbatim: Cards flattens its groups and holds no per-row group map, so the group-seed logic needs a row→band map built from `groups` first.
- **A-4:** [confirmed] Ride-along: cross-location card reordering — the table's `page_order` branch with **`structuralOrderAfterDrop`** applied to the destination. The Set-Card drag flash rides along **as its own item**: set-cards run through the standalone zone whose `onReorder` discards nothing, so the discarded-landing-index diagnosis doesn't apply there — the likelier cause is that sets have no optimistic order (they append; `treeMove.ts:84`). Verify in planning before fixing.
- **A-5:** [confirmed] **Creation refreshes the live manual order in the same act it writes.** `manualOverride` outranks every persisted order and no create refreshes it. On the table this is a one-commit flash (the `[source]` reset catches it a frame later) — exactly the double-shove E-4 forbids; on Cards it would be **permanent**, since Cards' resets never fire on a tree re-mint. The fix is engine-side with its acceptance criterion on Cards.
- **A-6:** [confirmed] The order-write laws port whole, and two shipped gaps are fixed as part of the same bundle: **Cards' reorder must also write its local `viewOrders` copy** (today it writes only the wire — the stale local copy is masked by the live override, and A-5 would unmask it, losing the user's whole drag), and **`bandAdd` gains the non-structural `tieOrderWith` tail `newPageAdjacent` already has** (today a band-add under a sort + manual order lands last regardless of A-5). Full-membership arrays, one writer per channel, everywhere.

#### B — Band-Add & Menus

- **B-1:** [assumed] The band "+" arms by passing `onAdd` at the existing `GroupBand` call site (the prop and its "+" wiring already exist) — same stamping and filter-seed law as the table, same collapsed-band disclosure, glide to the new card.
- **B-2:** [confirmed] The card menu gains **one** item — **New Page** — defaulting to the Below (flow-after) behavior. The shared `pageMetaMenuItems` gains a single-vs-pair option shape (today's boolean emits the pair) — one builder, no second writer. The table and sidebar keep their pair unchanged.
- **B-3:** [confirmed] Set-cards get no creation affordances this arc — see the set-ghost Prospect.

#### C — Naming

- **C-1:** [confirmed] **Cards adopts the store rename engine, deliberately** — the `RenamableTitle` family the sidebar and set bands already mount, whose chrome matches a card label. The table keeps its own front-end (the title *cell editor* with its local `fromCreate` bit — right for a grid, and never touching the store slot). Two front-ends, one law: both drive main's `fromCreate` rename. The card title swaps its plain span for the store-driven empty field when the card is the naming target — gated on C-6 landing first.
- **C-2:** [confirmed] The naming field never removes the card's glyph — the standard the table's exit-polish commit set.
- **C-3:** [assumed] The field needs card-chrome carve-outs: stop `pointerdown` against the whole-surface drag handle, exclusion from the title `elementFromPoint` hit test, and the editing flag arriving as a prop through the memoized `PageCard`.
- **C-4:** [assumed] While naming, the field replaces the **whole title row** — never inside `OverflowScroll`'s clip. Caret uniformity comes free by reusing the shipped rename field under the app-wide drawn caret; `--card-scale` is track sizing, not a transform, so no caret drift.
- **C-5:** [assumed] **Card rename unifies onto the inline field** — the menu's Rename opens the same field and the per-card TextPicker rename mount retires. Sequenced strictly after C-6: the popover is the fallback until the fence exists.
- **C-6:** [confirmed] **The rename slot gets an owner fence — and it's a live-bug fix first, sequenced with its own acceptance before Cards mounts any field.** `renamingPath` is a bare global consumed by every surface that hosts a field, and the annihilation is already reachable without Cards: a table set-band rename mounts one field (`GroupBand.tsx:58`) while the sidebar — always in the DOM, force-opening the collapsed ancestor so the competing set row becomes visible (`Sidebar.tsx:229-234`) — mounts the second; the two focus-on-mount effects fight, the loser's blur commits empty, the guard routes to cancel, and the slot clears for both. The fence is **owner-resolution, not caller-declaration**: native-menu renames arrive surface-blind from main, and the Subfield "+" doesn't know which view is routed — so no caller can name an owner. The store resolves the one mounting surface by precedence (the routed detail surface outranks the sidebar; exactly one claim wins); the exact shape is planning's. Acceptance: renaming a Set from a table band works, with the sidebar visible.

#### D — The Ghost Card

- **D-1:** [confirmed] The hover mechanism is unified; the effect is view-specific. The dwell/grace/stand-down machinery (timers, closing state, suppression, mid-exit reversal) extracts into one shared mechanism; each view owns its ghost's chrome and motion — the table keeps its disclosure Reveal, Cards rides its own displacement. **Suppression is part of the hook's API**: Cards pops native menus from *inside* the memoized cards (the value cell's menu, the cover's banner menu), so the hook exposes a suppress handle those pops route through — via the existing `cardApi` seam or a CardsView-published context, not four layers of prop drilling.
- **D-2:** [confirmed] The ghost is a ghosted **bordered card** at the group's card size and ratio (free by construction as a real grid item): no title, no in-card content or internal borders, a border **heavier than the standard card border**.
- **D-3:** [confirmed] The ghost carries the page-icon glyph in the empty-banner / unresolved-preview placeholder treatment, and the glyph stays through the create's naming. Exact placement (thumb-zone vs centered, compact mode) belongs to the visual pass.
- **D-4:** [confirmed] Placement is **flow-after, never to the left** — the ghost lands after the hovered card in flow order, the grid's own behavior for an item inserted at the next slot. Flow-after also means the anchor never moves, so the ghost's own entry can't slide a card under the resting pointer.
- **D-5:** [confirmed] Entry and exit displace neighbors on the same animation cards use on-move — built per E.
- **D-6:** [confirmed] The exact ghost CSS ships as a first pass and gets a dedicated Nathan visual pass — border weight, dim, radius, glyph placement all KNOB-marked.
- **D-7:** [assumed] Dwell shares one KNOB across views; **grace splits per view** — Cards' ghost sits across the grid gap from its anchor, so a zero grace would kill the ghost mid-crossing.
- **D-8:** [assumed] New stand-down, **subtractive**: any `pointerdown` outside the ghost stands it down synchronously — before the drag engine can cross its activation threshold and freeze item rects. One rule covers both hazards (the ghost's transforms never coexist with the engine's, and the engine never measures a grid the ghost still occupies) with **no engine plumbing**; whether the unmount needs a synchronous flush ahead of the first `onMove` is planning's to verify.
- **D-9:** [assumed] Clicking the ghost unmounts it in the same act that creates — the table's double-create guard, ported.
- **D-10:** [assumed] A pipeline re-emit that drops the anchor row **clears the ghost state, not just its render** — the shipped table machinery leaves `{ closing: true }` stranded when the anchor vanishes mid-close, so re-hovering that row reopens the ghost with no dwell; the extraction fixes the state-clear as it moves.
- **D-11:** [confirmed] One ghost per **view instance** — the hook holds a single anchor per consumer. Cross-instance overlap (an embed tile beside the main pane) is transient by construction, since leaving a view's rows closes its ghost; no app-global slot exists to violate the no-shared-mutable-singleton rule.

#### E — The Displacement Approach

- **E-1:** [assumed] **Real grid item + FLIP on the feel tokens**: the ghost mounts as an actual grid item at the flow-after slot, and the reflow it causes is animated FLIP-style — measure affected elements before/after, apply inverse transforms, release on the same duration/easing tokens the drag shift reads.
- **E-2:** [confirmed] The FLIP transforms ride a **dedicated displacement wrapper** between the drag-shell root and the card body — neither existing layer can host them: the zone contract gives the root's transform to the drag engine (and the engine measures the *root's* rect, which a transformed child never moves), and the body is hover-pop's surface whose stylesheet transitions `transform`, so an inline FLIP invert there would *animate* — a visible wrong-direction hop. NavGallery documents the same keep-the-layers-apart split.
- **E-3:** [assumed] The FLIP scope includes what the new row pushes: when the ghost wraps the group onto a new row, the bands below join the measured set so nothing under the group jumps. Dwell-gating keeps the layout read off any high-frequency path.
- **E-4:** [assumed] **The create handoff is motionless.** Clicking the ghost swaps it for the real card in the same slot — the optimistic insert lands at the ghost's position and A-5 keeps the live order honest, so no second displacement plays; the only motion on create is the naming field opening.

#### F — Reconciliation (What This Ships Makes False)

- **F-1:** [confirmed] **The table refits onto the extracted hover mechanism** — extraction means the table's inline machinery moves to the shared hook and TableView consumes it, suppress handle and the D-10 state-clear included; a copy in Cards with the original left inline is the failure mode this arc exists to avoid.
- **F-2:** [confirmed] `bandShowsAdd`'s create-routing deferral comment dies when the routing arrives.
- **F-3:** [confirmed] [[CardViewPM]] takes the creation section, loses its stale "Cross-band card drag" prospect line **and** its Pending "Heading '+' creation… stays a visual stub" line, and gains the ghost-card law; [[TableViewPM]] points its ghost paragraph at the shared mechanism; [[ViewsPM]]'s view-generic creation entry trues to "table and cards"; [[InteractionPM]] names the displacement treatment if it mints a reusable alias.
- **F-4:** [confirmed] ContextPM's Important-Information line about the Cards band "+" rendering inert until adoption resolves out on ship.
- **F-5:** [confirmed] The retired TextPicker rename mount's comment block goes with it (C-5).

### Live Checks for Planning

- **Stationary-pointer re-hit-test:** whether Chromium fires boundary hover events on cards sliding under a resting pointer during the FLIP (strong prior: it does). Exposure is limited to mid-*collapse* — flow-after keeps the anchor still during entry — where the worst case is a transient re-dwell, but verify no re-anchor or thrash before calling the feel done.
- **C-6 end-to-end:** the set-band rename annihilation verified at component level; confirm it live (rename a Set from a table band with its sidebar row visible) so the fence's fix has a reproduced baseline.

### Core (must-have)

- C-6's owner fence — the live set-band rename bug dies first, with its own acceptance.
- Band "+" creates in its group with the full stamping law; collapsed bands disclose; the view glides to the new card.
- "New Page" on the card menu, creating flow-after with seed inheritance.
- Every Cards create opens the empty naming field over a real card, glyph intact — on the fenced store engine.
- The ghost card: shared hover mechanism, Cards-specific chrome and displacement, click creates.
- The order-work bundle: A-5's same-act refresh, Cards' local `viewOrders` write, `bandAdd`'s non-structural tail.
- The ride-alongs: cross-location reorder honors its landing index; the Set-Card drag flash falls to its verified cause.

#### Prospects (allowed later, not now)

- **The set-card ghost.** Nathan's conditional — "if it's the same mechanism, allow it; if not, don't" — resolves to *not yet*: the hover mechanism is shared, but the creation contract isn't. What it'd need: `createContainer` gains a positional `order` (plus `set_order` routing and an optimistic set slot — sets append today), the create-origin naming law un-gates from `kind === 'page'` at both layers (a fresh Set colliding on first name errors instead of disambiguating), and set-cards gain a rename entry point (the set-card title is a plain span with no menu). Don't-foreclose: the shared hook takes an anchor, not a row — a set-card anchor slots in without rework.
- Cards group-band drag (the `dragHandle` prop seam exists) — a reorder mechanism, not creation.
- An empty band's hover-ghost — under the default Group By: None the bands render headless with no "+", so creation there is the Subfield's "+"; revisit only if that ever feels insufficient.

#### Out of Scope (won't do — distinct from Prospects)

- The wider alias system — parked whole per A-1.
- Flattened-mode's table half / Flatten control — pipeline work, a different arc.

#### Considered & Rejected

- **A phantom-slot capability inside the drag engine** — rejected: it couples creation chrome into a drag-lifecycle engine whose zone contract owns root transforms; D-8 + the wrapper layer design the hazards out more simply.
- **A `DragGroup onDragStart` addition for D-8** — superseded: killing the ghost on drag *start* still leaves it inside the grid when the engine freezes rects at activation; the pointerdown stand-down removes it before any measurement can happen, with no engine change.
- **Caller-declared rename ownership** (`beginRename` callers pass a surface string) — unimplementable: native-menu renames arrive surface-blind from main, and chrome-level creates don't know the routed view. Owner-resolution in the store replaced it.
- **Instant reflow with a fade-only ghost** — rejected for dropping the confirmed displacement direction; the fallback if FLIP reads janky in the visual pass.
- **The View Transition API animating the reflow** — rejected: an uncontrollable feel outside the motion-token law.
- **"New Page Above/Below" pair on cards** — rejected for grid ambiguity; one "New Page" item defaulting flow-after.
- **Set-card ghost in core** — moved to Prospects on evidence; see the ledger entry.

#### Lessons

- "Same mechanism" must be judged per layer: the set-ghost's hover machinery was genuinely shared while its creation contract was page-gated at four separate sites — a shared *surface* does not imply a shared *engine*.
- A store slot consumed by multiple surfaces is an ownership decision waiting to fire: `renamingPath` worked while exactly one surface family mounted it; the second consumer turns focus-on-mount into mutual annihilation — and the second consumer was already shipped (set bands), not hypothetical.
- Module-level evidence doesn't name the symptom's surface: the stale-override bug read as "the table's" until the mounted view's reset effects were checked — the table self-heals in a frame, Cards never would. Check the consumer's lifecycle before locating a defect.
- Two front-ends may legitimately drive one law (the table's cell editor and the store's rename slot both feed main's `fromCreate` path) — but a spec must *name* which front-end a new surface adopts, or the implementer inherits the ambiguity.
