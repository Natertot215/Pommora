## Architecture Audit — Full-Codebase Report

**Date:** 08-21-2026 · **Method:** Six parallel read-only domain audits (data core, process boundary, MarkdownPM, view layer, design system, shell & satellites), every load-bearing finding independently re-verified at its cited lines before inclusion. Settled rulings in [[Cohesion-Rulings]] were briefed as off-limits; items already in [[ContextPM]]'s ledger were assessed rather than rediscovered.

**Base:** ~128,000 raw lines under `Pommora/src` (including CSS, tests, comments); roughly 95,000 code-only.

### The Verdict

**No rebuild — not of the app, not of any domain.** All six audits, run independently and told plainly that "healthy" and "rebuild" were both acceptable answers, converged on the same conclusion: the from-scratch shapes are mostly already in the codebase, because the consolidation passes that ran over the past two months actually worked. The Swift-baseline fear does not materialize — the data-core audit put it directly: "nothing here is a Swift remnant wearing TypeScript; the shapes were chosen, not inherited."

The health signal worth naming: the aggregate net reduction available across every finding in this report is roughly **−550 to −650 code lines out of ~95,000**. A codebase that grew patch-on-patch shrinks dramatically under audit; this one barely shrinks because the duplication was already being hunted as it formed. The payoff of the work below is structure and correctness, not size.

### Domain Scoreboard

| Domain | Code (raw) | Verdict | The one thing wrong |
|---|---|---|---|
| Data core (`main/` sans boundary) | ~27k incl. tests | Healthy | Context journal misses the slot law its property sibling has |
| Process boundary (bridge, menus, shared) | ~10k | Healthy | `index.ts` is a 1,532-code-line collision point (known) |
| MarkdownPM | ~23.6k | Healthy | Input layer re-scans the whole document per keystroke |
| View layer (`Detail/`) | ~19.4k | Healthy | ~180 lines of host plumbing duplicated across Table and Cards (known, sharpened) |
| Design system + Components | ~26k | Healthy | `Components/Detail` is a misfiled 6,800-line feature subsystem |
| Shell, store, satellites | ~13k | Healthy | The page-state singleton, whose workarounds leaked into four files (known, sharpened) |

Measured highlights that earned the healthy verdicts: **zero** literal hex or rgba colors in ~7,300 lines of feature CSS (100% token adherence, grep-verified); the 117-channel IPC bridge derives both ends from one typed map with compile-time exhaustiveness; the 22 native-menu modules are thin adapters over one three-layer chassis, not 22 copies; the editor holds one cached document scan with a required code-exclusion contract; the view pipeline is pure, staged, and source-agnostic; SurfacePM's engine/consumer seam is a single props interface.

### New Findings

Everything below is absent from the existing debt ledger. Each was verified at its cited lines.

#### II. Correctness

- **The context rename journal can lose an owed heal.** `propertyJournal.writeSchemaJournal` refuses to displace a different stranded record (`crud/propertyJournal.ts:40-44`); `contextJournal.writeJournal` overwrites unconditionally (`crud/contextJournal.ts:26-29`), and `settleJournal` deliberately keeps the journal alive when the cascade skipped unreadable files (`crud/contextCascade.ts:196-199`). A second Context rename in the same session therefore overwrites a surviving journal, and the skipped file keeps its stale `(Title):` key permanently. **Fix:** one journal-slot primitive parameterized by record codec, both journals as record shapes on it. ~95 code lines → ~65. The only correctness bug this audit found.
- **Four write channels registered `raw` instead of `envelope`.** `tabs:save`, `previews:save`, `hoverCard:save`, `devicePrefs:save` (`main/index.ts:749/769/789/808`) build Result envelopes but a throw inside one rejects across the IPC boundary — the one thing the never-throws rule forbids. Four one-word edits.
- **Cards' drag violates the law its own creation path states.** The creation config's comment reads "a create must write its page_order slot — viewOrders is only ever the grouped/sorted tiebreaker" (`Cards/CardsView.tsx:400-403`), and creation writes canonical order accordingly — but `reorderInBandByIndex` (`CardsView.tsx:617-631`) writes `viewOrders` unconditionally, with no structural branch, where Table's `reorderTo` branches correctly. This settles the "card drag vs row drag" Open Call on evidence: Cards is internally inconsistent with itself, and Table's behavior is the one matching both the stated law and Reasonable Legibility. ~20 lines, pending sign-off on the ruling.

#### II. Performance

- **The editor's input layer re-derives whole-document context per keystroke.** `dashArrow` runs for every typed character and its first check, `isInsideCode(c, doc)` (`input/index.ts:429`), splits the entire document and pairs every fence from the top (`shared/markdownCode.ts:188-196`); `autoPair`, `autoDelete`, and `closerEndAt` pay the same on their triggers, and `smartBackspace`/`shiftEnterEdit`/`continueBlockquoteOnEnter` each call `lineInCallout` (`detect/index.ts:461`), which splits the document and runs a fresh callout scan — two O(doc) passes per Backspace. This is the exact pattern Editor-Internals rule 28 bans for caret moves, surviving in `input/` because the transforms are deliberately string-pure and can't reach `docCache`. The seam already exists: `editor/input.ts:56` already passes `docScan(...)` into `tableBoundaryEnter`; the same plumbing extends to the rest. ~150 lines of signatures and call sites, net ±0, estimated 2–4ms per keystroke recovered on large pages — compounding with the known 7ms decoration item.
- **The heading scan is the one construct outside the editor's facade.** `headingScan.ts:29-46` re-splits the document and re-pairs fences to find headings `scanDoc` has already computed (`intent.ts:83-84`), holds a second per-version cache for it, and is called uncached per heading-grip press (`blockModel.ts:201`). Fold into the shared scan: net −25 lines and a duplicate whole-document pass gone.
- **Fence pairing runs three times inside one `scanDoc`.** `tableRegions` and `citationScan` each call `codeMask(text)` again (`Tables/regions.ts:38`, `detect/index.ts:278`) on the same text the scan just paired. Thread the pre-paired spans; ~25 lines touched.
- **Block tiles load the whole context world per IO.** `blocks:readMarkdown`/`writeMarkdown` resolve a Space host by strict-reading the registry plus every Space sidecar (`blocks.ts:33-42`), when the live tree already holds every Space's path. A board with k markdown tiles pays k world loads on mount and one more per debounced flush. ~12 lines.

#### II. Structure

- **`Components/Detail` is a feature subsystem wearing a shared-components address.** 64 files, ~6,760 code lines — the view-settings panes, property editors, and their drag adapters — with 13 importers outside it spanning Toolbar, Blocks, Settings, PagePreview, and Views. `PaneSlider`, documented in [[InteractionPM]] as the app-wide drill-down primitive and importing exclusively from the design system, is stranded inside it. Zero dependency rot underneath — a filing error, not an architecture error. Rehome as its own domain folder, promote `PaneSlider` into `design-system/`; ±0 lines, typecheck catches every miss. **Ordering:** this should precede the queued Table-hoisting and view-host sessions, both of which would otherwise add imports at the wrong address.
- **The select/status option operations are line-for-line twins.** `removeOption`/`clearOption` and their Status counterparts differ only in the type-refusal argument (`crud/optionOps.ts:218-252` vs `319-356`); the rename pair shares its whole journal-commit-cascade skeleton. The existing combinator ruling covers the IPC handlers, not this crud layer below. 279 → ~235 lines.
- **The Subfield stats gap has a plumbing fix, not a structural one.** `MarkdownEditor` already exposes a `register(view)` handle (`MarkdownPM/index.tsx:109`), so the Subfield can read the editor's cached, table-aware `docScan` whenever a live editor exists, keeping the string path as the no-editor fallback. Closes the table word-miscount Known Issue in one session.

### Known Items — Endorsed and Sharpened

The existing ledger survived six adversarial reads nearly intact. Where an audit had something to add:

- **The `main/index.ts` split:** the sketch is the right fix and no deeper reshape beats it. Two additions while the closure is carved: a `session` handler kind hoisting the `sessionRoot()`/no-nexus guard that repeats ~42/~34 times (−80 to −100 lines, and a new handler can no longer forget it), and the confirm-and-push helpers taking a send function instead of closing over the `mainWindow` singleton — the multi-window transport seam for free.
- **Table hoisting — high priority:** confirmed at the audit exactly as ContextPM sketches it. `Table.css` loads globally from `main.tsx`, and 8 external files import from `Table/` at 12 sites: `solidColor` ×5 (wants the design system), `Cell` ×2 plus `columnStyles`/`columnLabel`/`checkboxLook` (want a property-display home), and `tableDnd` (wants the interactions layer) — four homes, not one. Elevated because the debt compounds passively: every session touching a settings pane, the nav gallery, or the preview inspector deepens the wrong-address imports until it lands. Its own session, screenshot-verified, taken immediately after the `Components/Detail` rehome.
- **The view host:** the Cohesive-Cleanup cut is right, sharpened two ways — seat it in `ViewRenderer` (already the single mount point for pages and embeds) so the loading/empty/error decision happens once for every renderer, and land it **before any third view renderer**; building List first would mint the exact third copy the host exists to prevent. The two files' drifted override-reset keys and the card style-optimism gap dissolve by construction. ~2,900 lines touched, net ≈ −150; the real value is that List/Gallery/Calendar/Timeline become "render this row model."
- **The store:** the tab-re-key and the file split are **one move with the re-key leading** — the re-key is what defines where the slice boundaries belong (tabs + pages are one domain because `select` is their joint transaction), and splitting first would enshrine today's boundaries. The singleton's workarounds have already leaked into four files as prop detours, bypass parameters, and ordering-by-comment (`store.ts:722-732`, `DetailPane.tsx:88-96`, `PageView.tsx:21-35`, `PreviewWindow.tsx:73-97` — each narrating the detour in its own comment). The re-key also retires an unlisted duplication: `selection` is a hand-synchronized copy of the active tab's target. Roughly flat on lines; two focused sessions; the store has no test file, so slice tests land with the split. One clarification: the singleton does not violate the locked multi-window decision (the store is per-renderer) — what it blocks is within-window ambition: `WARM_TABS`, split view.
- **The retention collision:** coordinated numbers still evict the wrong class of guest. The structural answer is context-aware retention — a guest hidden because its host surface is parked leaves the scroll-out LRU and lives with the parked surface (parking's own cap of 2 is its budget); the LRU governs only scroll-outs within visible surfaces. Still gated on the product ruling.
- **Decoration viewport-scoping:** confirmed as a local change inside `build()` — the per-line intent cache already positioned it. Best taken together with the fence-threading and input-layer items above; they compound on the same keystroke path.
- **The drag adapters' frame:** confirmed at the queued diagnosis — eight adapters each rebuild a ~60-70-line frame around `usePointerGesture`; one `useInsertionDrag` hook absorbs it. ~1,629 → ~1,375 lines. The engine's two-family contract itself is the shape a rebuild would rediscover.
- **`mutate.ts`:** the per-arm relocation remedy stands; net flat, and it doubles as the natural first step of the `index.ts` split since both carve out the same shared context.

### Open Calls The Evidence Now Informs

Recommendations only — the rulings stay open until stamped.

- **Card drag file:** Table's behavior (canonical `page_order` in unsorted structural views). Cards' own creation comment states this law and its creation path already follows it.
- **Retention budgets:** decide the structure (context-aware tiers), not the numbers.
- **Cursor convention:** settle it in the primitives — `MenuItem`, `AccessoryButton`, the picker row — and the ~20-site sweep collapses into a handful of declarations plus exceptions.
- **Cards loading/empty:** the seat becomes the view host, decided once; the empty state's wording remains a design call.

### Suggested Sequence

Phases, dependency-ordered, each independently shippable:

1. **In-passing fixes:** the four `raw`-kind channels; Cards' structural-drag branch and style optimism (post-ruling); the journal-slot primitive; `blocks.ts` host resolution; the optionOps parameterization. One batch session total.
2. **Editor keystroke path:** viewport-scoped decoration assembly + fence-span threading + input-layer scan plumbing + heading-scan fold-in. Two to three sessions; closes the editor's structural story entirely.
3. **Store re-key → split**, before the next store-heavy feature.
4. **`Components/Detail` rehome → Table hoisting → view host**, in that order — the first two are high priority and worth taking early, since every session that touches their consumers deepens the wrong-address imports; virtualization after the host, seated in its row model.
5. **`main/index.ts` split** with the `session` kind and parameterized push — whenever parallel-session collisions next hurt.

### Redundancy Ledger

What each task retires from the documentation the day it lands — the entry is deleted from its source, never tagged resolved.

| Task                                     | Retires                                                                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small-fixes batch                        | ContextPM Open Call "Card column-style changes wait for the round trip"                                                                                                                                                         |
| Editor keystroke path                    | ContextPM Debt "The decoration build emits the whole document"                                                                                                                                                                  |
| Subfield reads the editor's scan         | ContextPM Known Issue "A Markdown table's pipes… count as prose"; ContextPM Important Information "The one construct the Subfield still counts as source…" (Current Focus paragraph); the matching SubfieldPM known-issue entry |
| Fire-and-forget `persist()`              | ContextPM Debt "Fire-and-forget writes have no seam"                                                                                                                                                                            |
| Store re-key → split                     | ContextPM Boring Work "Per-tab page state…" + "The store split" (derived-state selectors fold in as store work)                                                                                                                 |
| Components/Detail rehome                 | Nothing listed — new work; updates the CLAUDE.md codebase map                                                                                                                                                                   |
| Table hoisting                           | ContextPM Boring Work "Table hoisting"                                                                                                                                                                                          |
| View host                                | ContextPM Open Call "Cards has no loading or empty state" (the seat — wording stays a design call)                                                                                                                              |
| `main/index.ts` split + `mutate.ts` arms | ContextPM Boring Work "The main/index.ts split" + "mutate.ts organization"                                                                                                                                                      |
| Drag adapters' frame                     | Nothing listed                                                                                                                                                                                                                  |
| Retention rework (post-ruling)           | ContextPM Open Call "Two retention budgets…" + Pending Focus "Retention's two bounds" (the cap half)                                                                                                                            |
| Cursor convention (post-ruling)          | ContextPM Open Call "`cursor: default` versus `cursor: pointer`"                                                                                                                                                                |

Cohesive-Cleanup retired on 08-21-2026: its queue lives in the checklist's bundles, its measurement note rides the checklist, and its exhaustiveness-sweep and closed-claims records moved to [[Cohesion-Rulings]]. This report retires when the checklist supersedes it.

### Adjudicated Against The Ledger

Every item cited in ContextPM, Cohesive-Cleanup, and the Features docs was re-verified in the code. Nothing cited as open turned out fully fixed; the corrections found:

- **Table's column readers** — partially fixed: the per-cell path already rides the memoized `alignByCol`/`styleByCol` maps; the header, grid-template, reflow, and menu-builder sites (~15) remain per-call. The queue entry is restated to match.
- **`Detail/Views/ViewPane.tsx:129`** — the file moved to `Toolbar/ViewPane.tsx` (the `default: return` suppression persists at :128). The citation is corrected in place.
- **Connection autocomplete's self-filter** — confirmed still present and baked in per candidate source (`useConnectionAutocomplete.ts:50`); the Known Issue stands as written.
- Everything else — Cards' missing empty state, the style-optimism gap (`CardsView.tsx:189`, "v1-acceptable"), the drag-file divergence, the decoration build, the scroll timer, the fire-and-forget family, both remaining queue items — verified open as cited.

### Bottom Line

Continuing to build is the right call, and not as a consolation — six audits went looking for the patch-on-patch divergence the question hypothesized and found its opposite: a codebase whose one-writer law, cohesion queue, and adjudicated rulings have been doing exactly what they were built to do. The existing debt ledger proved accurate and near-complete; this audit adds one correctness bug, three performance seams, and a filing error to it, and endorses the queued structural work with sharper ordering. The plumbing is sound. The work that remains is the work already on the books, taken in the order above.
