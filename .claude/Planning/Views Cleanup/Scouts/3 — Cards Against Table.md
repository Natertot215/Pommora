#### Scout 3 — Cards Against Table

**Grounded At:** `cae07c129` · reconciled against HEAD (`cae07c129`). **Read:** `CardsView.tsx`, `TableView.tsx`, `useViewInteractions.tsx`, `useViewHost.ts`, `useViewCreation.ts`, `ViewHost.tsx`, `cardColumns.ts`, `useGhostFlip.ts`, `cellSweep.ts`, `ValueSeat.tsx`, `valueClick.ts`, `Cell.tsx` (head), `PropertyPanel.tsx` (seat + Add), `RenamableTitle.tsx`, `RenamableLabel.tsx`, `editSlice.ts`, `ghostCreate.ts`, `EntityIcon.tsx`, `stableApi.ts`, ViewTypesPM §View Host/§Table/§Cards. Anything not reopened is marked *inferred*.

**Reconciliation:** 8 findings kept (6 Verified, 1 Corrected, 1 re-judged), 0 removed. F7's proposal is downgraded against the principles.

---

#### 1. Map

| File | Owns | Called By |
| --- | --- | --- |
| `Core/Views/Host/ViewHost.tsx` (32) | Picks the renderer from `VIEW_RENDERERS`, builds `host`, applies view scale | `ContainerView`, `Tiles/Surfaces/ViewTile.tsx:642` |
| `Core/Views/Host/useViewHost.ts` (256) | Pipeline, maps, writers, persistence, `seatHost` (`:203-211`), `viewRootRef` | `ViewHost` |
| `Core/Views/Host/useViewInteractions.tsx` (429) | Band routing, row drops, `listZone`, carry, open, page menu, ghost + standing ghost, `rowHover` | `TableView:81`, `CardsView:155` only |
| `Core/Views/Host/useViewCreation.ts` (218) | The create act; calls back `cfg.rename` on landing (`:158`) | `useViewInteractions:126`, tests |
| `Core/Views/Table/TableView.tsx` (502) | Grid, header, `DataRow`, `GhostRow`, local title rename, sweep wiring, `RowCellApi` | `ViewHost` |
| `Core/Views/Table/cellSweep.ts` (87) | Drag-down multi-row select over `.data-row` | `TableView:156` |
| `Core/Views/Cards/CardsView.tsx` (917) | Card grid, Set cards, banner seat, trail, `GhostCard`, `CardFace`/`OverlayFace`/`PageCard`/`SetCard`, `CardApi` | `ViewHost` |
| `Core/Views/Cards/cardColumns.ts` (37) | `fillsBlank`, `shownColumnsFor`, `cardAddColumns` | `CardsView` only |
| `Core/Views/Cards/useGhostFlip.ts` (57) | FLIP of neighbors when the ghost card mounts/moves | `CardsView:272` |
| `Core/Properties/Pickers/ValueSeat.tsx` (383) | `useValueSeat`, `ValueSeat` panes, `MenuSeat` | Table, Cards, `PropertyPanel:74`, `MenuSeat` |
| `Core/Properties/Pickers/valueClick.ts` (67) | Click/menu intent tables | `ValueSeat` |
| `Core/Properties/Cells/Cell.tsx` (229) | Type-aware value rendering | Table, Cards, PropertyPanel |

**Per-Responsibility Line Count** (what a third renderer copies today; scout-measured, cites spot-checked):

| Responsibility | Table (lines) | Cards (lines) | Shared Owner Today |
| --- | --- | --- | --- |
| Page-title naming | ~30 — `:73-77, 84, 86-87, 112-139, 192-197, 255` | ~18 — `:128-129, 158, 161, 274, 709-720, 757, 840, 884` | none (two mechanisms) |
| Value-seat setup + mount | 7 — `:90-95, 326` | 30 — `:174-202, 443` | `useValueSeat` (each renderer wires it) |
| Stable item api + its type | 25 — `:178-190, 331-342` | 38 — `:74-89, 96-106, 244-256` | `useStableApi` (each renderer re-bundles) |
| Value element (editor-or-Cell + click/menu) | ~21 — `:446-461, 474-478` | 27 — `:603-629` | none (PropertyPanel `:246-263` is a third copy) |
| Hover ghost | ~75 — `:81-85, 215-223, 255-263, 321-323, 344-393` | ~116 + `useGhostFlip` 57 — `:146-160, 270-297, 421-441, 450-508` | `useGhostAnchor` via interactions |
| Drop wiring | 2 — `:286, 325` (`listZone`) | ~21 — `:165-169, 299-300, 382-395` | `listZone` for Table only |
| Page-menu trigger | 10 — `:143-152` | 19 — `:855-873` | `interactions.pageMenu` |
| Open on click | 5 — `:102-105, 189` | 6 — `:883-888` | `interactions.openPage` |
| Selection | 3 — `:49, 249` + prop | 1 — `:841` | none (two patterns) |
| Page glyph | `EntityIcon` (0 plumbing) | ~15 — `:127, 292, 331, 377, 514-518, 537-544, 577, 833, 875` | `EntityIcon` (Cards bypasses it) |
| Root ref | 3 — `:281-283` | 3 — `:353-355` | `host.viewRootRef` |
| Keyboard open | 1 — `useLineRow` `:430` | 1 — `useDragItem` `:839` | drag engine (fine) |

---

#### 2. Findings

##### F1 — Page Naming Runs Three Ways, Two of Them Inside the Table

**Status:** Verified. **Overlaps:** 1 (§Insights), 2 (F3), 8 (F8, F10).

**What's There:** The Table renames a page through local state: `renaming` (`TableView.tsx:73`), a stranded-edit effect (`:74-77`), its own `RenamableLabel` + `mutate({op:'rename', fromCreate})` (`:117-136`), and a `renaming` branch in `overlayTarget` (`:192-194`) and the ghost guards (`:84, 255`). The same Table renames *Set bands* through the session fence — `GroupBand.tsx:242` mounts `RenamableTitle` with `host="detail"`. Cards renames pages through the fence too (`CardsView.tsx:161` → `beginRename(path, fromCreate, 'detail')`), but mounts `RenamableTitle` only while naming (`:709-720, 757`) behind a hand-rolled check, `renamingPath === row.path && renamingHost !== 'sidebar'` (`:840`) — a partial restatement of `resolveRenameWinner` (`editSlice.ts:53-61`). Under a `'matrix'` rename of the same path it mounts the card's naming row, whose field then stays at rest because the fence picks the Matrix.

The renderer-supplied `rename` policy (`useViewInteractions.tsx:44-45`) exists to bridge these: renderer → `policy.rename` → interactions (`:129, :369`) → `useViewCreation`'s `cfg.rename` (`useViewCreation.ts:51, 158`).

**Timing:** Both renderers open the field from the same callback, after the create's reply (`useViewCreation.ts:155-158`). The Table's state is keyed by row ID, but it doesn't open at the gesture, so moving it onto the fence doesn't change I-040's frame (see *Cross-Report Conflicts*).

**History:** The Table's local state predates the fence (`strandedEditId` traces to the monorepo move `0cdb92cd2`); `4701725b5` kept one `RenamableLabel` mounted at rest and in edit "so a committed rename holds its new title until it lands." `RenamableTitle` does the same when it stays mounted (`RenamableLabel.tsx:42-51` holds `landing`; `submitRename` returns the landing promise).

**Problem:** One Way, Clearer Boundaries. A List would have to pick one of three. Cards also *has* the flash the Table fixed: `submitRename` clears the fence synchronously (`editSlice.ts:111`), `naming` flips false, and `CardsView:757` swaps to `titleRow` showing the old `row.title` until the tree push — verified in code, not driven.

**Proposed Change:**
- Every view page title goes on the fence with `host: 'detail'`. `useViewInteractions` calls `beginRename(row.path, false, 'detail')` for the page menu itself, and `useViewCreation` calls `beginRename(landed, true, 'detail')` itself — the `rename` member leaves `ViewInteractionPolicy`, `ViewCreationConfig`, and both renderers.
- Extract the claim logic from `RenamableTitle` (`:29-46`) into `useRenameClaim(path, host) → { owns, create }`; `RenamableTitle` becomes that hook + `RenamableLabel` and forwards `children` (the Table needs the `.cell-title-text` render-prop).
- Both renderers keep the title label mounted at rest (Table already does; Cards' `namingRow || titleRow` merges into one `CardTitle` whose mode reads `owns`) — this fixes Cards' flash. Pass `doubleClick={false}` on both, since a title click opens the page.
- Rows read `owns` for their chrome (Table `cell-rename`/`cell-active`; Cards `CardTitle mode="static"`, the `if (naming) return` at `:884`).

**Delta:** ≈ −30 (Table −22, Cards −8, interactions −3, creation −2, `RenamableTitle` +4). *Inferred* count.
**Touches:** `Core/Interface/RenamableTitle.tsx`, `useViewCreation.ts`, `GroupBand` (unchanged but now consistent).
**Trade-Off for Nathan:** The fence picks the first of two `'detail'` claims for one path (`editSlice.ts:56-57`, `live.find(c => c.host === fence.renamingHost)`), so a page visible in both the main view and an embedded View Tile could open its field in the wrong instance. Set bands and Cards carry this today; the Table's instance-local state is the only surface immune. A claim scoped to the view instance would fix it for all three later without touching renderers.

##### F2 — The Seat and the Ghost Are Wired Into Each Other by Hand, Twice

**Status:** Verified (wiring); the redundancy of the two extra stand-downs is Unverified — needs a live drive. **Overlaps:** 1 (F3).

**What's There:** Each renderer creates the interactions hook, then the seat, and closes the loop through closures: the ghost's `suppressed` reads `seat.open` (`TableView:84`, `CardsView:158`) while the seat's `hold` reads `interactions.ghost.suppressWrap` (`TableView:93`, `CardsView:183`). Both spread `host.seatHost` (`:91`, `:179`), built in `useViewHost.ts:203-211` for these two callers alone. Then each adds its own extra stand-down:
- Table hides an existing ghost at render while any value or name is open (`TableView:255 — !open && !renaming`).
- Cards holds the ghost while an inline editor is open through a never-settling `suppressWrap` in an effect (`CardsView:195-202`, added in `bc40e3ebf`), and gates `useGhostFlip` on `!anyNaming` (`:129, 274`).
- The two `suppressed` closures also differ: Table's reads its own `renaming`; Cards' reads the global `renamingPath`, so a sidebar rename stands the Cards ghost down but not the Table's.

**Problem:** Less to Carry, One Way. Three stand-down mechanisms for one rule ("no ghost while a value or name is being edited"), each with different exit behavior. A click that opens a value already clears the ghost through the capture-phase `pointerdown` (`ghostCreate.ts:157-164`), a menu-driven open closes it through `suppressWrap` (`:141-151`), and `useGhostAnchor` checks `suppressed` before arming — so the render guard and the effect look redundant (*inferred*).

**Proposed Change:** `useViewInteractions` owns the seat: it calls `useValueSeat({ ...seatHost, hold: ghost.suppressWrap, ...policy.seat })` and returns it. The ghost's suppression becomes internal — `seat.open !== null || renamingPath !== null` (Table adopts Cards' global reading) — so `ghost.suppressed` leaves the policy. The policy shrinks to `{ ghost: { graceMs, travelHold? }, seat: { anchor, centered?, add?, hide?, commit?, onClose? }, newPages }`. Drop the Table guard and the Cards effect once a drive confirms the ghost already stands down. `seatHost` moves out of `useViewHost` into the hook.
**Delta:** ≈ −19 (Table −8, Cards −14, `useViewHost` −9, interactions +12).
**Touches:** `useViewHost.ts` (`seatHost`), `ValueSeat.tsx:57` (`SeatHost.hold` doc).

##### F3 — "Keep the Ghost Until the Newborn Lands" Exists Only in Cards, and the Table Lacks It

**Status:** Corrected (the hook's `standingFlight` is a double-create guard, not a visual hold); the Table's collapse-then-grow is Unverified — needs a live drive. **Overlaps:** none.

**What's There:** `useViewInteractions` keeps one `standingFlight` (`:396-412`) so a second click on the standing ghost returns the same flight instead of creating twice; the standing ghost itself stays mounted because `ghostStanding` is `rows.length === 0` until the row lands (`:396`), not because of the ref. The visual hold for an *anchored* ghost exists only in Cards: its own `pendingSeat` state and wrapper (`CardsView:145, 278-285`; `78e100154` — "a Cards create's ghost retires in the commit its newborn's card appears"). The Table ignores the flight (`TableView:222`), so `ghost.take()` (`ghostCreate.ts:127-136`) unmounts the ghost row at once and the newborn row arrives a round-trip later.

**Problem:** One Way; the Table likely shows a one-row collapse-then-grow on every ghost create (*inferred*).

**Proposed Change:** The hook owns one held create covering both cases and returns `ghostAt: string | null` (the live anchor, or the held anchor while the newborn isn't in `rowById`) plus `ghostClosing`. Cards' `pendingSeat`/`ghostSeat` collapse into it; the Table reads it in place of `ghost?.anchorId`. Also return `ghostRootProps` (`data-ghost-root`, enter/leave, click-to-create) so neither renderer re-assembles `ghostRowProps` (`TableView:216-223`) or the `GhostCard` handler props (`CardsView:293-295, 471-476`).
**Delta:** ≈ −10 (Cards −12, Table −6, interactions +8). *Inferred*.
**Touches:** `cardCreation.test.tsx:125` (the ghost-retire test).

##### F4 — Both Renderers Re-Bundle Seat and Interaction Handlers Into Their Own Stable Api

**Status:** Verified. **Overlaps:** none.

**What's There:** `RowCellApi` (`TableView:331-342`) and `CardApi` (`CardsView:75-87`) declare and assemble (`:178-190`, `:244-256`) the same core: `click`, `menu`, `pane`, `editor` (Table calls it `overlay`), `commit`/`commitValue`, `open`, `hover`, page menu (`grip`/`pageMenu`). Cards adds `ValueApi` + `INERT_API` + `NOOP` (`:89, 96-106`) to feed the drag overlay. The re-bundling exists because `useValueSeat`'s functions are rebuilt every render while rows are memoized.

**Problem:** Less to Carry; two names for one member (`overlay`/`editor`, `commit`/`commitValue`, `grip`/`pageMenu`).

**Proposed Change:** With F2 in place, the hook returns one identity-stable `item` handler set (`useStableApi` once, inside the hook). `RowApi = ItemApi & { title, sweep, grip }`, `CardApi = ItemApi & { openAdd, openSet, banner }`. The Table still overrides `click`/`menu` for the title column. PropertyPanel can read the same stable seat handlers if `useValueSeat` itself returns them stable.
**Delta:** ≈ −15 (types and assembly), more if PropertyPanel follows. *Inferred*.

##### F5 — The Card Grid's Drop Wiring Is Hand-Copied From the Hook's Internals

**Status:** Verified. **Overlaps:** 1 (§Keep: two drag shapes), 4 (F1).

**What's There:** The Table gets its whole row-drop wiring from one call, `interactions.listZone(rowIndent)` (`TableView:286`; built at `useViewInteractions:325-347`). Cards reaches into the hook's internals instead — `folderSlot`, `onDrop` twice, `carry`, plus `crossBand`, `dragDisabled`, the `scope` family, and labels (`CardsView:299-300, 385-395`). `onDrop`, `folderSlot`, and `carry` are returned only for this: `git grep "interactions\.(onDrop|folderSlot|carry)"` finds only `CardsView.tsx:300, 392-394`.

**Problem:** Clearer Boundaries — a Gallery would copy this block from Cards.

**Proposed Change:** The hook returns `gridZone(groupKey)` beside `listZone`, carrying everything but `renderOverlay`/`className`; `onDrop`, `folderSlot`, and `carry` leave the return.
**Delta:** ≈ 0 now (Cards −12, interactions +12); the gain lands with Gallery and in a smaller return.

##### F6 — Two Glyph Paths and Two Selection Paths

**Status:** Verified. **Overlaps:** none.

**What's There:**
- **Glyph:** The Table draws page icons with `<EntityIcon kind="page" icon={row.icon}>` (`TableView:116, 384`), which reads `defaultIcons` itself (`EntityIcon.tsx:36-37`). Cards subscribes to `defaultIcons` at the top (`:127`), turns it into a name with `entityIcon(...)` (`:292, 331, 544, 875`), and threads it through `SetCardProps`, `SetFace`, `PageCardProps`, `CardFace`, `OverlayFace`, and `GhostCard`.
- **Selection:** The Table subscribes to the whole `selection` at the view root (`:49`) and props a boolean per row (`:249`), so every selection anywhere re-renders `TableView`. Cards subscribes per card (`:841`).

**Proposed Change:** Cards draws `<EntityIcon kind="page"|"set" ... size className>` and drops the `defaultIcons`/`iconName` plumbing. The Table's `DataRow` selects its own `selected`, matching Cards and the hot-path rule.
**Delta:** ≈ −16. *Inferred*.

##### F7 — The Band Walk Is What a List Copies Most, and It Lives Inside TableView

**Status:** Verified (code); the proposal is downgraded to "name the lift point" — see *Cross-Report Conflicts*. **Overlaps:** 2 (§Keep), 4 (F1, §Insights).

**What's There:** `renderRows` (`TableView:225-278`) owns the folding, nesting, and indentation a List would reuse: collapse (`collapsed.has`), `memberDepth`, tail vs nested indent (`:212-213, 229`), the `lead` row, ghost insertion, and the recursive `GroupBand` wrap. Cards' walk (`:383-437`) is the flat, single-level case.

**Judgment:** A `walkBands` extraction now nets ≈ +3 with one consumer, which the principles reject ("independent justification", no self-induced requirements). Report 4 F1's narrower step — give the member-indent rule one owner in `bandModel.ts`, which also fixes the tail-row drop-line mismatch — is the near-term item. `renderRows` is recorded as List's lift point; the extraction happens when List exists.
**Delta:** 0 now.

##### F8 — Small Ones

**Status:** Verified. **Overlaps:** 2 (F9: `hide_page_icons`).

- **Page-menu trigger:** both open with `preventDefault` + `stopPropagation` + an anchor (`TableView:143-152`, `CardsView:855-873`). `interactions.pageMenu` could take the event. ≈ −4.
- **Root ref:** both write a callback (`:281-283`, `:353-355`) only because `viewRootRef` is typed `HTMLElement` (`useViewHost.ts:157`); typed `HTMLDivElement`, both pass `ref={host.viewRootRef}`. ≈ −4.
- **`fillsBlank`** (`cardColumns.ts:7`) re-spells the Filedata check in `valueClick.ts:26` and has one consumer (`CardsView:619`). Inline it, or make it a `PROPERTY_TYPES` predicate beside `blankDraws` (`properties.ts:34`). ≈ −2.
- **`hide_page_icons`** read twice in one Table render (`:218, 248`). ≈ −1.

**Total if F1–F6 and F8 land:** roughly **−95 to −110** production lines (*inferred*).

---

#### 3. Names

| Now | Problem | Proposed |
| --- | --- | --- |
| `RowCellApi.overlay` / `CardApi.editor` | One member, two names | `editor` |
| `DataRow overlayCol` / `PageCard editing` | One concept: the column whose inline field is open | `editingCol` |
| `titleCell(row, opened, …)` vs type `title(row, renaming, …)` (`TableView:112, 335`) | Param named differently in impl and type | `naming` |
| `renaming` (Table) / `naming` / `anyNaming` (Cards) | One concept | `naming` (with F1 it comes from `owns`) |
| `pendingSeat`, `ghostSeat` (Cards) | "Seat" also means the value seat in the same file | gone with F3 (`ghostAt`) |
| `ghostShown` / `ghostSeat` / `ghostStanding` | Three ghost-position names in one view | `ghostAt` + `ghostStanding` |
| `interactions.ghost.ghost` | Doubled name | `ghost.state`, or flatten (F3) |
| `ValueApi`, `INERT_API` | Exists only for the drag overlay | `InertValues`, or fold into F4's `ItemApi` |
| `commitOnCard` | Reads as card-scoped; it's "commit and reveal" | `commitAndReveal` |
| `OverlayFace` | It's the drag preview's face | `DragFace` |
| `viewRootRef` described as "scroll root" (ViewTypesPM §View Host) | It's the view's root; `findScroller` finds the scroller above it (`useViewCreation.ts:101`) | `viewRootRef` stays; doc says "view root" |

---

#### 4. Placement

- **`seatHost`:** `useViewHost.ts:203-211` → `useViewInteractions` (F2).
- **Rename claim logic:** `RenamableTitle.tsx:29-46` → `useRenameClaim` in the same file (F1).
- **Band walk:** stays in `TableView.tsx` until List exists (F7).
- **`fillsBlank`:** `Cards/cardColumns.ts` → inline in `CardsView`, or `Properties/properties.ts` beside `blankDraws`.
- **`useGhostFlip.ts`, `cellSweep.ts`:** stay; they move only when a second renderer uses them.

---

#### 5. Becomes False

- **ViewTypesPM §The View Host:** "stating its ghost timing and what suppresses the ghost, and the naming surface it opens over a page" (F1, F2); "The renderer assigns only its scroll root" (wording; Report 8 §5 lists it as already false).
- **ViewTypesPM §Creation:** "the renderer opens its own naming field over the row already real" (F1).
- **`useViewInteractions.tsx:1`** header ("A kind supplies the policy below"), and `:44` doc on `rename`.
- **`useViewCreation.ts:1`** header ("the caller's rename opens its naming surface").
- **`ValueSeat.tsx:57`** `hold` doc (still true, set in one place).
- **Tests:** `useViewHost.test.tsx:127, 891` pass `rename: () => {}`; `cellGestures.test.tsx:463-480` (title Rename asserts the Table's own `mutate` request; under F1 the same request arrives through `submitRename`); `cardCreation.test.tsx:125` ghost-retire case (F3). `cardCreation.test.tsx:122` (`beginRename(..., true, 'detail')`) stays true.
- **Drives:** `Properties Drive/live-drive.mjs` keys on `.data-cell`, `.ghost-card`, and `.data-row` (scout cites `:268, 948, 1928-1936`, not reopened); all survive.

---

#### 6. Keep

- **`cellSweep.ts`:** Table-only and DOM-specific (`.data-row:not(.ghost-row)`).
- **`useGhostFlip.ts`:** grid-only FLIP; Gallery's, not List's.
- **`GhostRow` / `GhostCard` markup, `DataRow` / `PageCard` / `CardFace`:** genuine presentation.
- **The seat's `anchor`, `centered`, Cards' `add` / `hide` / `commitOnCard`:** real per-surface policy.
- **A shared editor-or-`Cell` component** for Table, Cards, and PropertyPanel: each site passes different `Cell` options and a different wrapper, so a component nets about 0 and adds a layer.
- **`cardAddColumns`:** looks like PropertyPanel's `unshown` (`PropertyPanel.tsx:164-165`), but the semantics differ.
- **The `editing`/`overlayCol` prop** next to `seat.editor`'s own check: redundant as a condition, but it's the memo re-render trigger.
- **`newPages: 'pair' | 'single'`:** a real per-kind menu choice.
- **The two drag engines** (line rows vs sortable grid): presentation; F5 only moves their wiring.

---

#### 7. Insights & Concerns

- **Ghost roots outside the views:** six sites re-spell `data-ghost-root` + enter/leave handlers — `TableView.tsx:367`, `CardsView.tsx:472`, `Sidebar.tsx:178`, `PropertyPanel.tsx:332`, `GhostOptionChip.tsx:30`, `TileGrid.tsx:687` (verified). A `ghostRootProps(api)` beside `ghostAnchorProps` in `UIX/Interactions/ghostCreate.ts` ends it (≈ −8 net). UIX territory.
- **The fence's twin weakness** (F1 trade-off) predates this work; a claim scoped to the view instance fixes it later without touching renderers.
- **`useViewInteractions` keeps growing:** at 429 lines it holds bands, row drops (~190 lines), carry, pages, and the ghost. F2–F5 and Report 1 F3 add the seat, grid wiring, and sort-run reassign. Splitting row-drop routing into its own module keeps it navigable; that's the Host plan's call.
- **The List takes `listZone`, not Cards' pieces.**
- **Cards' location trail** (`CardsView:257-268`) is what ViewTypesPM §Pending's "Table Location subtitle" would need. It stays in Cards until the Table builds it.

---

#### Removed

None.

#### Cross-Report Conflicts

- **Rename Unification (F1 vs Report 2 F3 vs Report 8 F10):** Report 2 F3 says the Table's ID-keyed local state "already has I-040's proposed fix" and that moving it onto the path-keyed fence regresses it, so F1 must wait for I-040. That's false against the code: `createPageIn` calls `cfg().rename(...)` only after `landed !== null` (`useViewCreation.ts:155-158`), and the Table's policy (`TableView.tsx:86-87`) sets its state from that same callback, so both renderers open the field on the reply. F1 holds and doesn't regress I-040's timing. I-040 can land afterwards on the fence (claim by minted ID) and then fixes Set bands and Cards too. Report 8 F10's "Table keeps its own ID-keyed state" is true; its implication that unification must choose ID-keyed host state is not required. The real cost is F1's twin trade-off, which goes to Nathan. (Reports 2 and 8 belong to the other reconciler.)
- **Band Walk (F7 vs Report 2 §Keep vs Report 4 F1):** Reports 2 and 4 hold: extracting before List exists adds a one-consumer abstraction. Report 4 F1's member-indent owner is the near-term change.
- **`seatHost` and Host Slimming (F2 vs Report 1 F3):** Same direction — interaction-only members leave the host for `useViewInteractions`. No conflict; they compose.
- **`hide_page_icons` Double Read (F8 vs Report 2 F9):** Same finding; either report carries it once.
