## Codebase-Cleanup Checklist

The working checklist for the architecture-audit cleanup — every task verified in the code before it was written here, sized into session bundles, and carrying its own verification and documentation retirements. The evidence and reasoning behind each task is [[Architecture Audit — Full-Codebase Report]]; the line-count figures are code-only (comments, blanks, and tests excluded). The renderer's organization — folders, naming, tokens, and the design system's boundary — is [[RendererRework]]'s and is not scheduled here; this checklist is the behavioral half.

**How to use this document:** a bundle is one session unless marked otherwise. Tasks inside a bundle are independent unless ordered; check each off as it lands. Every bundle runs the same cycle:

1. **Block** — open the next unblocked bundle; re-derive its citations against the current code before editing (they were verified at writing, and the tree moves).
2. **Execution** — implement the tasks; the three gates green (`npm run typecheck` · `npm run test` · `npm run lint`).
3. **Full review** — the simplification pass first (code-simplifier, comment cleanup on the diff), then the build-breaking pass against the result; every agent finding independently verified at its cited lines before acting on it; then the bundle's named app-open verification.
4. **Checklist + scrub** — check the tasks off and strike the bundle here; delete the entries its **Retires** line names from their sources — deleted, never tagged resolved; reconcile any Features doc the change touched; refresh the Line-Ledger figure; commit with explicit paths.
5. **Report** — what changed and why, the net code-only line count, what was verified and how, and anything the review flagged that was deferred rather than fixed.
6. **Continuation prompt** — the session ends by handing over a short prompt naming the next unblocked bundle and anything the finished one left for it, so a fresh context starts at step 1 without re-deriving this document.

**Measuring it:** `.claude/scripts/loc.py` produces the app's code-only figure per area (62,543 at `d5c4413d`), and `--history` walks the branch one sample per day. The Line-Ledger page at https://claude.ai/code/artifact/9172cda5-707d-4b69-aaed-d154dd2dd485 reads it; refresh after a cleanup session by re-running `loc.py --history`, replacing the JSON blob in the page's trailing `<script id="data">` tag, and republishing to that same URL. Its `baseline` field stays frozen at `d5c4413d`, so its Removed column is what this checklist has actually taken off.

**Ordering constraints (the only hard ones):**

- Bundle 6 (the view host) landed before any third view renderer; a new renderer mounts `useViewHost` and writes presentation only.
- Bundle 5 is best taken immediately before the next store-heavy feature.
- Bundle 9 (the `ViewTile` rebuild) lands after the Tiles merge (Blocks + Embeds → `SurfacePM/`, [[RendererRework]]) seats the file at its final address.

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
- [x] **Cards' structural drag writes canonical order, location-scoped** — plus a `resolveIndex` seam on `DragGroup`: a landing outside the card's own location run is refused with no displacement and a fly-home no-op. Structural paints never read a held viewOrder mask (both views suppress it at the order source — a mask interleaves locations and dissolves the boundary the refusal depends on); the mask stays the sorted/grouped tiebreaker. Driven live against the real nexus: same-location drag wrote `page_order` correctly, cross-location hover displaced nothing and wrote nothing, a Sub-set drag wrote its own sidecar.
- [x] **Cards' column-style change applies optimistically** — `stylePatch` folded into `liveView`, routed to the card faces and picker host.
- [x] **Finish the column-reader memo.**

**Landed with:** gates green (3,358 tests), two simplifier passes, two build-breaking passes whose five findings were all folded and test-pinned.

#### II. ~~Bundle 2a — Editor Keystroke Plumbing~~ · landed 08-21-2026

- [x] **Input transforms take the cached scan.** `dashArrow`, `autoPair`, `autoDelete`, `closerEndAt`, `smartBackspace`, `shiftEnterEdit`, `continueBlockquoteOnEnter`, and both `closeConstruct` arms take `DocScan` where they took a bare string — the seam `tableBoundaryEnter` already used. Two new line-local readers, `inCodeAt` and `inCalloutAt`, answer off the cached fences and callouts; `lineInCallout` retired with its test, and `isInsideCode` survives only on the paste path, which pays once per paste.
- [x] **The heading scan joins the facade.** `HeadingSrc` names what a heading scan reads — line table, per-line heading flags, per-line fences — and `DocScan` satisfies it structurally, so the editor asks without re-splitting or re-pairing. `headingSrc(text)` serves the outline's string callers at the old cost. `folding.ts`'s separate `sectionCache` retired into one cache held at the rule; `blockModel.ts`'s uncached call now passes the scan it already held.
- [x] **Fence pairing runs once per scan.** `codeMaskOf` builds the mask from an already-split, already-paired document; `codeMask(text)` is a thin wrapper on it. `scanDoc` builds one mask off its own pairing and threads it to `tableRegions` and `citationScan`, each of which used to re-split and re-pair the whole document to build its own.

**Landed with:** gates green (3,368 tests); two new pins — the scan-built mask and `inCodeAt` each agree with the string-built mask offset for offset, over the fence corpus.
**Cost, against the estimate:** Bundles 2a and 2b landed together at `425ac6bd`, **net +79 code lines** where the estimates read −15 and ≈0. Naming a seam costs lines to remove work: `codeMaskOf`, `inCodeAt`, `inCalloutAt`, and `HeadingSrc` are new code whose purpose is deleting repeated passes. Read it as a correction to how this checklist estimates threading work — a bundle that removes duplicated *computation* rather than duplicated *text* will usually grow the files it touches.
**Retires:** nothing listed — these were unlisted findings.

#### II. ~~Bundle 2b — Viewport-Scoped Decorations~~ · landed 08-21-2026

Chrome is produced in two stages, and only the second was scoped. The **derivation** (`docLineIntents`) walks the whole document with the full scan in hand and is cached per document version, so it runs once per edit. The **assembly** (`assembleLineIntents`) copied those cached intents into a fresh array on *every* rebuild — caret move, focus flip, scroll — which was the frequent cost.

- [x] **The assembly scopes to `view.viewport`**; the derivation stays whole-document and cached. No margin is owed: every `first`/`last` flag was decided by the whole-document walk before the viewport was consulted, so a windowed selection of already-correct intents cannot produce a wrong edge. Rails moved from one flat array into per-line buckets, so the window reaches them without walking the document's rails; they are still emitted after every line intent, since at a shared line start emission order is what stacks the line classes.
- [x] **Atomic ranges stay whole-document.** They govern where a caret or selection endpoint may land, which is not a question the viewport gets to answer. The set is built once per document version and the caret's own line — which reveals its raw source — is removed with a range-bounded filter, so a caret move never walks the document's slots.
- [x] **The parity pin** gained its windowed case: for every corpus document, every line pair, the windowed assembly equals the whole-document assembly filtered to those lines.

**Out of scope, deliberately:** the derivation's own whole-document walk, which still runs once per keystroke. Scoping it needs a rail model that doesn't depend on a running walk of list nesting from the document's top — a real design problem, and its own item if it ever earns one. The document already pays one walk of this order per edit in `scanDoc` regardless.

**Owed:** the live pass — a long page's typing latency, callout boxes and list rails at the viewport edges while scrolling, and caret motion across atomics off-screen.
**Retires:** ContextPM Debt "The decoration build emits the whole document."

#### II. ~~Bundle 3 — Subfield Reads the Editor's Scan~~ · landed 08-21-2026

**The specification changed before it was built.** It called for the live `EditorView` handle, on the premise that the counter needed the editor object to reach a table-aware scan. The code says otherwise: `scanDoc` is a pure function of a string with no CodeMirror dependency, `docScan` is only a `Text`-keyed cache over it, and the editor's change listener already hands the counter that exact string. So the handle bought nothing, and the spec's "string path kept as the no-editor fallback" would have shipped two implementations of one answer — a page counting differently depending on whether an editor happened to be mounted.

- [x] **`computeStats` reads `scanOf(body)`** — the editor's own scan of the very text it holds. Its private `citationBoundary` and eight imports are gone; the boundary now arrives on the scan, already computed against the full fence → table → math exclusion set that function used to rebuild by hand.
- [x] **A table counts as the prose its widget draws** — the cell text the scan already parsed and trimmed, joined so cells stay separate words. The delimiter row is absent from a region's rows, so it blanks with the rest of the span. Pipe-stripping was rejected: it glues `|a|b|` into one word and counts the padding.
- [x] **One scan per text, shared.** `perText` states the four-slot policy once, beside the `perDoc` it mirrors; `scanOf` and the Subfield's own `pageStats` are both derivations on it, and `docScan` became a one-line wrapper over `scanOf`. Four slots, because the main pane's footer and a floating preview's describe different bodies at once. Pinned by identity, not inference: `scanOf(body)` **is** the object `docScan(Text)` returns.

**Landed with:** gates green (3,377 tests); the existing counter pins passed unmodified, including the cross-check that ties the counter to the editor's own draw.
**Cost, against the estimate:** net **+7 code lines** (+37 / −30) where the estimate read −20. The same correction Bundle 2 recorded — the deletions are real, but a shared seam is new code whose purpose is removing work.
**Nothing plumbed:** no view handle, no store slot, no fallback path.
**Owed:** the live pass — a four-column table's word count, and the floating preview's subfield agreeing with the main pane's. The spec's third check, that a page with no live editor still counts, is vacuous now: the string path is the only path.
**Retires:** ContextPM Known Issue "A Markdown table's pipes… count as prose"; ContextPM's Current Focus paragraph on the Subfield's own scan; the matching SubfieldPM entry.

#### II. Bundle 4 — `persist()` Under Accepted Silence · one session · net ≈ 0

- [ ] **One `persist()` helper wraps the fire-and-forget family** — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown`, `embedHeights.set`, `tableHeadingColumns.set`, `aliases.set`, `headingIcon.set`, `hoverCard.save`, `nav.write`, `tabs.save`, and the remaining sixteen sites — discarding failures deliberately, with the accepted-silence ruling stated once at the helper.

**Verification:** gates; grep confirms no bare `void window.nexus.*` persisted-chrome call remains outside the helper.
**Retires:** ContextPM Debt "Fire-and-forget writes have no seam." (The silence Open Call already left ContextPM with its ruling.)

#### II. Bundle 5 — Store Re-Key → Split · two sessions · net ≈ flat

- [x] **Session one — every open page has a slot.** `pageStatus`/`pageDetail`/`pageError`/`liveBody` become `pages: Record<pageId, PageSlot>` — keyed by page, since a page is one document however many tabs point at it and a page id survives pin/unpin where a tab id does not; `pageFrozen` derives from `selection` lagging the active tab, which is the pause-on-change and the reason `selection` stays a field. Deletes `captureOutgoingDetail` and its ordering constraint (the capture rides `PageView`'s unmount seam under a warm generation), `useHosts`' target-guessing, `PageView`'s `detail` prop, and the Subfield's `scope` mode (both hosts drive one `page` prop; the preview keeps its local body because `PageEmbed` loads through the path cache, not the store).
- [x] **Session two — the file splits into domain slices** composing one store (nexus, navigation — tabs + pages + selection + pins, because `select` and the pin gestures write across them — preview + browser + nav window, chrome, config, rename fence, id-keyed caches). `store.test.tsx` is the integration contract; tests for what the re-key created land with the split.
- [x] **`pinnedTabs` keeps one writer** (`setPinned`, identity-preserving) rather than becoming a selector — deriving it walks the tree and its readers are hot; `previewTarget` is `previewTargetOf`, reading the active preview tab's stored target through `deriveTarget`.

**Verification:** gates + new slice tests; app open — tab switch with a dirty editor (edits survive), cold swap, parked tab with a playing web tile survives a flip, preview open beside a different active page, pin/unpin, restore on relaunch.
**Retires:** ContextPM Boring Work "Per-tab page state is modelled as global singletons" and "The store split."

#### II. Bundle 6 — One View Host in `ViewHost` · its own session · landed 08-31-2026

- [x] **`useViewHost(source, seam)` seats in `ViewHost`** and owns: value load/override/epoch, schema, active view, viewOrders + manual order, the optimistic order/hidden/style layers, band ordering, collapse state, the pipeline invocation, ctx/set maps, the writers, the persist fold (a renderer fold-ref carries Table's widths and alignments; `Views/viewMerge.ts` keeps the per-key style fold), creation-engine wiring, and the loading/empty decision. Table keeps its column machinery and gestures; Cards keeps its grid and pickers; the drift between them closed by construction. *Landed — the honest net was positive (the API and two destructures cost more lines than the second copy of the preamble paid back); the error state stays open in ContextPM.*
- [x] **The empty state's wording** — "Loading…" / "No pages here", at the seat; a Cards view over Sets keeps its blank pane with Set Cards off.

**Verification:** the queue's own list — both renderers, grouped and ungrouped, band drag, collapse, value edit, view switch in each; plus loading/empty on a slow and an empty Collection.
**Retired:** the ContextPM Open Call on Cards' missing loading and empty states; the load-error leg stays there, narrowed.

#### II. Bundle 7 — The `main/index.ts` Split · one session · net ≈ −100

- [ ] **Handlers become per-domain `Partial<BridgeAsks>` maps** spread into one `serveBridge` call, after carving out the shared context (refusals, path resolvers, confirm-and-push helpers, the window reference).
- [ ] **A `session` handler kind** hoists the `sessionRoot()`/no-nexus guard (42/34 repetitions) into `ipc.ts`'s boundary-policy union.
- [ ] **The confirm-and-push helpers take a send function** instead of closing over `mainWindow` — the multi-window transport seam, free while the closure moves.
- [ ] **`mutate.ts`'s inline arms relocate** to crud modules in the same style — `setBanner`, `setIcon`, the profile ops, the delete arm's record choreography — leaving the dispatcher a table of one-line routes.

**Verification:** gates (the bridge's exhaustive typing is the proof of the split); app open — one write per relocated domain confirms and pushes.
**Retires:** ContextPM Boring Work "The main/index.ts split" and "mutate.ts organization."

#### II. Bundle 8 — The Drag Adapters' Frame · one session, app open · net ≈ −270

- [x] **`useInsertionDrag` over `usePointerGesture`** owns point tracking, ghost position, autoscroll arm/teardown, snapshot invalidation, and announcements; the eight adapters (`paneDnd`, `BandDnd`, `tableDnd`, `OutlineDnd`, `groupingDnd`, `sidebarDnd`, `useOptionReorder`, `useStatusReorder`) pass their drop model and wording, one adapter at a time with the app open. *Landed — seven real implementations (`useOptionReorder` was already an adapter over `useStatusReorder`); every gesture driven live with edge-autoscroll and announcements checked, break-review passed.*

**Verification:** every gesture driven live — sidebar reorder and reparent, table row and column, band, outline, pane rows, option and status reorder — with edge-autoscroll and announcement checked on each.
**Retires:** nothing listed.

### I. Open Questions — Not Scheduled

Waiting on rulings; each is cheap once decided and wrong to guess at.

- **Retention's structure** — context-aware tiers (a parked surface's guests live with the surface; the LRU governs visible-surface scroll-outs) versus one coordinated budget. ContextPM keeps the call.
- **The cursor convention** — `default` versus `pointer` on clickable non-link controls, settled once in the primitives.
- **The scroll timer** (`travel.ts:49`) — retiring it means ruling that off-screen folds open unanimated.

### I. When Everything Above Is Checked

ContextPM's Boring Work section empties, its Debt reduces to the scroll-timer ruling and the virtualization ceiling, and its Known Issues reduce to the two CSS-polish items and the self-link autocomplete call — product questions, not debt. The audit report retires into this one; the organizational half of its findings already lives in [[RendererRework]]. Structurally: every fact has one home, the editor and view layers are closed architectural stories, and what remains — List/Gallery/Calendar/Timeline on the host's row model, virtualization in the same seat, the FTS index consumers, QuickCapture, split view on the tab-keyed store — is feature work landing on spines built to receive it. Net effect on size: roughly −650 lines, in a codebase whose health was never about shrinking.
