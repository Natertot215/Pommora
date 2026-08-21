## Codebase-Cleanup Checklist

The working checklist for the architecture-audit cleanup — every task verified in the code before it was written here, sized into session bundles, and carrying its own verification and documentation retirements. The evidence and reasoning behind each task is [[Architecture Audit — Full-Codebase Report]]; the line-count figures are code-only (comments, blanks, and tests excluded).

**How to use this document:** a bundle is one session unless marked otherwise. Tasks inside a bundle are independent unless ordered; check each off as it lands. Every bundle runs the same cycle:

1. **Block** — open the next unblocked bundle; re-derive its citations against the current code before editing (they were verified at writing, and the tree moves).
2. **Execution** — implement the tasks; the three gates green (`npm run typecheck` · `npm run test` · `npm run lint`).
3. **Full review** — the simplification pass first (code-simplifier, comment cleanup on the diff), then the build-breaking pass against the result; every agent finding independently verified at its cited lines before acting on it; then the bundle's named app-open verification.
4. **Checklist + scrub** — check the tasks off and strike the bundle here; delete the entries its **Retires** line names from their sources — deleted, never tagged resolved; reconcile any Features doc the change touched; refresh the Line-Ledger figure; commit with explicit paths.
5. **Report** — what changed and why, the net code-only line count, what was verified and how, and anything the review flagged that was deferred rather than fixed.
6. **Continuation prompt** — the session ends by handing over a short prompt naming the next unblocked bundle and anything the finished one left for it, so a fresh context starts at step 1 without re-deriving this document.

**Measuring it:** `.claude/scripts/loc.py` produces the app's code-only figure per area (62,543 at `d5c4413d`), and `--history` walks the branch one sample per day. The Line-Ledger page at https://claude.ai/code/artifact/9172cda5-707d-4b69-aaed-d154dd2dd485 reads it; refresh after a cleanup session by re-running `loc.py --history`, replacing the JSON blob in the page's trailing `<script id="data">` tag, and republishing to that same URL. Its `baseline` field stays frozen at `d5c4413d`, so its Removed column is what this checklist has actually taken off.

**Ordering constraints (the only hard ones):**

- Bundle 6a (the rehome) lands before 6b and 6c — both would otherwise add imports at the address being vacated. 6b is high priority and follows 6a immediately: its wrong-address imports deepen with every session that touches their consumers.
- Bundle 6c (the view host) lands before any third view renderer is attempted.
- Bundle 2a lands before 2b — they touch the same scan files, and 2b's risk wants 2a's simplifications already in place.
- Bundle 5 is best taken immediately before the next store-heavy feature.

### Decided Rulings

Stamped 08-21-2026; the tasks below assume them.

- **A card drag in an unsorted structural view writes canonical `page_order`**, matching Table and Cards' own creation path; `viewOrders` remains the grouped/sorted tiebreaker only. Because Cards' structural mode flattens each top Set's whole subtree into one band, the reorder is **location-scoped**: a card ranks among its own folder's direct children, and a drop landing among another location's cards resolves to the nearest true sibling slot — the filesystem stays canonical, and a drag never implies a cross-location move no visible boundary asked for.
- **Persisted-write silence is accepted policy for the fire-and-forget chrome class.** A failed fold/width/height write is deliberately silent; the `persist()` helper exists so the policy — and any future change to it — lives at one site.

### I. The Bundles

#### II. ~~Bundle 1 — Small-Fixes Batch~~ · landed 08-21-2026

- [x] **Envelope the four `raw` write channels.**
- [x] **One journal-slot primitive** — `crud/journalSlot.ts`, both journals as record shapes on it; the slot law gained a `supersedes` arm (a newer rename of the same entity displaces the stranded record, or a rename-back replays the abandoned rename at open) with tests pinning both laws.
- [x] **Parameterize the select/status option twins.**
- [x] **Block tiles resolve their host from the live tree** — with a `pathExists` guard, since mid-cascade the tree still spells the folder a rename just moved.
- [x] **Cards' structural drag writes canonical order, location-scoped** — plus a `resolveIndex` seam on `DragGroup`: a landing outside the card's own location run is refused with no displacement and a fly-home no-op. The structural arm also maintains a held viewOrders mask beside the canonical write (the creation settle's law), as Table's structural arm now does too. Driven live against the real nexus: same-location drag wrote `page_order` correctly, cross-location hover displaced nothing and wrote nothing, a Sub-set drag wrote its own sidecar.
- [x] **Cards' column-style change applies optimistically** — `stylePatch` folded into `liveView`, routed to the card faces and picker host.
- [x] **Finish the column-reader memo.**

**Landed with:** gates green (3,358 tests), two simplifier passes, two build-breaking passes whose five findings were all folded and test-pinned.

#### II. Bundle 2a — Editor Keystroke Plumbing · one session · net ≈ −15

- [ ] **Input transforms take cached facts.** `dashArrow`, `autoPair`, `autoDelete`, `closerEndAt`, `smartBackspace`, `shiftEnterEdit`, `continueBlockquoteOnEnter` receive the line-local answers of the cached scan from their `editor/input.ts` callers — the same seam `tableBoundaryEnter` already uses (`editor/input.ts:56`) — retiring `isInsideCode(offset, text)` and `lineInCallout` document re-scans on the keystroke path. The transforms stay pure; the caller supplies the facts.
- [ ] **The heading scan joins the facade.** `headingScan.ts` derives from `scanDoc`'s `headings`/`fences` instead of re-splitting and re-pairing; `folding.ts`'s separate `sectionCache` and `blockModel.ts:201`'s uncached string call retire. Net ≈ −25.
- [ ] **Fence pairing runs once per scan.** `codeMask` gains a pre-paired-spans overload; `tableRegions` (`Tables/regions.ts:38`) and `citationScan` (`detect/index.ts:278`) thread `scanDoc`'s own spans.

**Verification:** gates (the input corpus tests pin every transform); app open — type dashes, pairs, and Backspace through a large page inside and outside fences and callouts; heading grip drag; fold and unfold.
**Retires:** nothing listed — these were unlisted findings.

#### II. Bundle 2b — Viewport-Scoped Decorations · one session · net ≈ +15

- [ ] **Line-chrome assembly scopes to `view.viewport`** (±1 line for box first/last flags); atomic ranges stay whole-document. The parity pin (`decorations/intent.ts:430`) is reformulated for scoped assembly.

**Verification:** gates; app open — a 10k+ line page: typing latency before/after, box constructs at the viewport edges while scrolling, caret motion across atomics off-screen.
**Retires:** ContextPM Debt "The decoration build emits the whole document."

#### II. Bundle 3 — Subfield Reads the Editor's Scan · one session · net ≈ −20

- [ ] **The stats item reads `docScan(view.state.doc)`** through the existing `register(view)` handle (`MarkdownPM/index.tsx:109`) whenever a live editor exists — cached and table-aware — with `computeStats`' string path kept as the no-editor fallback and its private fence/citation masking reduced to that fallback.

**Verification:** gates; app open — a page with a four-column table: word count excludes pipes and the delimiter row; the floating preview's subfield agrees; a page with no live editor still counts.
**Retires:** ContextPM Known Issue "A Markdown table's pipes… count as prose"; ContextPM's Current Focus paragraph on the Subfield's own scan; the matching SubfieldPM entry.

#### II. Bundle 4 — `persist()` Under Accepted Silence · one session · net ≈ 0

- [ ] **One `persist()` helper wraps the fire-and-forget family** — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown`, `embedHeights.set`, `tableHeadingColumns.set`, `aliases.set`, `headingIcon.set`, `hoverCard.save`, `nav.write`, `tabs.save`, and the remaining sixteen sites — discarding failures deliberately, with the accepted-silence ruling stated once at the helper.

**Verification:** gates; grep confirms no bare `void window.nexus.*` persisted-chrome call remains outside the helper.
**Retires:** ContextPM Debt "Fire-and-forget writes have no seam." (The silence Open Call already left ContextPM with its ruling.)

#### II. Bundle 5 — Store Re-Key → Split · two sessions · net ≈ flat

- [ ] **Session one — page state keys by tab.** `pageStatus`/`pageDetail`/`pageError`/`liveBody`/`pageFrozen` become `pages: Record<tabId, …>`; the module fences (`store.ts:435-439`) become per-tab fields; `selection` derives from `(tabs, activeTabId)` instead of being hand-synchronized. Deletes `captureOutgoingDetail`'s ordering constraint, `useHosts`' target-guessing (`DetailPane.tsx:88-96`), PreviewWindow's parallel body buffer (`PreviewWindow.tsx:73-97`), and the Subfield's `scope` bypass; `PageView`'s `detail` prop becomes the norm rather than the parked exception.
- [ ] **Session two — the file splits into domain slices** composing one store (nexus/tree, shell chrome, config, nav layer, tabs+pages, preview+browser, rename fence, id-keyed caches), with slice boundaries as the re-key drew them — tabs+pages are one slice because `select` is their joint transaction. Slice tests land with the split; the store has none today.
- [ ] **Derived state becomes selectors in the same surgery:** `pinnedTabs` (four writers today, `store.ts:692`) and `previewTarget` derive from `derivePinnedTabs`/`deriveTarget`.

**Verification:** gates + new slice tests; app open — tab switch with a dirty editor (edits survive), cold swap, parked tab with a playing web tile survives a flip, preview open beside a different active page, pin/unpin, restore on relaunch.
**Retires:** ContextPM Boring Work "Per-tab page state is modelled as global singletons" and "The store split."

#### II. Bundle 6a — `Components/Detail` Rehome · one session, quiet tree · net ≈ 0

- [ ] **The view-settings/property-editing subsystem moves out of `Components/`** to its own domain folder beside `Detail/`; `PaneSlider` is promoted into `design-system/` where its imports already live; the CLAUDE.md codebase map updates. `git mv` plus import churn; typecheck catches every miss.

**Verification:** gates; nothing behavioral moves.
**Retires:** nothing listed — new work.

#### II. Bundle 6b — Table Hoisting · one session · **high priority** · net ≈ 0

Take this immediately after 6a: the debt compounds passively — every session touching a settings pane, the nav gallery, or the preview inspector adds imports at the wrong address until it lands. Eight external files import from `Table/` at twelve sites today, and `Table.css` loads globally from `main.tsx`.

- [ ] **The four homes**, as ContextPM sketches: `solidColor` (×5 external importers) to the design system; `Cell` (×2) with `columnStyles`, `columnLabel`, and `checkboxLook` to a property-display home; `tableDnd` to the interactions layer; `Table.css` split so the table-scoped rules leave the global load.

**Verification:** gates; screenshots of the nav gallery, both settings leaves, the preview inspector, and the properties panes against pre-move captures.
**Retires:** ContextPM Boring Work "Table hoisting."

#### II. Bundle 6c — One View Host in `ViewRenderer` · its own session · net ≈ −150

- [ ] **`useViewHost(source)` seats in `ViewRenderer`** and owns: value load/override/epoch, schema, active view, viewOrders + manual order, band ordering + the shared drop arm, collapse state, the pipeline invocation, ctx/set maps, commit writers, creation-engine wiring — and the loading/empty/error decision, decided once for every renderer. Table keeps its column machinery and gestures; Cards keeps its grid and pickers. The host's persist accepts Table's column-override merge (`mergeOverrides`, `TableView.tsx:466-471`); the two files' drifted override-reset keys unify by construction.
- [ ] **The empty state's wording** is a design call made in this session, at the single seat.

**Verification:** the queue's own list — both renderers, grouped and ungrouped, band drag, collapse, value edit, view switch in each; plus loading/empty on a slow and an empty Collection.
**Retires:** ContextPM Open Call "Cards has no loading or empty state."

#### II. Bundle 7 — The `main/index.ts` Split · one session · net ≈ −100

- [ ] **Handlers become per-domain `Partial<BridgeAsks>` maps** spread into one `serveBridge` call, after carving out the shared context (refusals, path resolvers, confirm-and-push helpers, the window reference).
- [ ] **A `session` handler kind** hoists the `sessionRoot()`/no-nexus guard (42/34 repetitions) into `ipc.ts`'s boundary-policy union.
- [ ] **The confirm-and-push helpers take a send function** instead of closing over `mainWindow` — the multi-window transport seam, free while the closure moves.
- [ ] **`mutate.ts`'s inline arms relocate** to crud modules in the same style — `setBanner`, `setIcon`, the profile ops, the delete arm's record choreography — leaving the dispatcher a table of one-line routes.

**Verification:** gates (the bridge's exhaustive typing is the proof of the split); app open — one write per relocated domain confirms and pushes.
**Retires:** ContextPM Boring Work "The main/index.ts split" and "mutate.ts organization."

#### II. Bundle 8 — The Drag Adapters' Frame · one session, app open · net ≈ −270

- [ ] **`useInsertionDrag` over `usePointerGesture`** owns point tracking, ghost position, autoscroll arm/teardown, snapshot invalidation, and announcements; the eight adapters (`paneDnd`, `BandDnd`, `tableDnd`, `OutlineDnd`, `groupingDnd`, `sidebarDnd`, `useOptionReorder`, `useStatusReorder`) pass their drop model and wording, one adapter at a time with the app open.

**Verification:** every gesture driven live — sidebar reorder and reparent, table row and column, band, outline, pane rows, option and status reorder — with edge-autoscroll and announcement checked on each.
**Retires:** nothing listed.

### I. Open Questions — Not Scheduled

Waiting on rulings; each is cheap once decided and wrong to guess at.

- **Retention's structure** — context-aware tiers (a parked surface's guests live with the surface; the LRU governs visible-surface scroll-outs) versus one coordinated budget. ContextPM keeps the call.
- **The cursor convention** — `default` versus `pointer` on clickable non-link controls, settled once in the primitives.
- **The scroll timer** (`travel.ts:49`) — retiring it means ruling that off-screen folds open unanimated.

### I. When Everything Above Is Checked

ContextPM's Boring Work section empties, its Debt reduces to the scroll-timer ruling and the virtualization ceiling, and its Known Issues reduce to the two CSS-polish items and the self-link autocomplete call — product questions, not debt. The audit report retires into this one. Structurally: every fact has one home, the editor and view layers are closed architectural stories, and what remains — List/Gallery/Calendar/Timeline on the host's row model, virtualization in the same seat, the FTS index consumers, QuickCapture, split view on the tab-keyed store — is feature work landing on spines built to receive it. Net effect on size: roughly −650 lines, in a codebase whose health was never about shrinking.
