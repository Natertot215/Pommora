## Codebase Audit (09-07-2026)

Nine read-only auditors each covered a slice of the tree or a cross-cutting lens, a tenth merged their reports and re-checked every ranked claim against the code, and the result was spot-checked again before consolidation. Planning documents, the context document, history, handoff, and all code comments were excluded as evidence. Features docs were read only as statements of intent. This document is the current state: findings that were fixed, withdrawn, or ruled moot are removed rather than annotated, and rulings are written into the topics they settle.

**Tree audited:** 76,468 lines of non-test source across 688 files, Core 61,612, UIX 12,829, Desktop 2,027. Mobile and Sync are empty package shells. **Gates:** typecheck clean, lint clean, 341 test files and 4,146 tests passing after the day's fixes.

#### The Verdict

**The codebase is workable and foundational.** This isn't a soft yes. The claims the project makes about itself were tested rather than assumed, and they hold:

- **The host boundary is real and machine-verified.** Core contains zero Node or Electron imports outside tests. The module graph the main process loads is 156 files, zero of them React, with three external dependencies. A second host is a bounded job, not a rewrite.
- **The read path is read-only.** No read channel writes.
- **Mechanical debt is near zero.** Dead exports are about 33 in 2,710. Zero raw colors across 44 Core style files. One dead CSS selector out of 631, now gone. Zero assertion-free tests. Textual duplication is 0.41% of tokens. Every declared folder exists under exactly its declared name, and there are zero orphan files.
- **The best code is in the places that matter most.** The view pipeline, the tile layout model, the navigation reference model, the pure editor engine, the pointer harness, the property value model, and the connections grammar were each independently called the strongest code in their slice. They should not be touched.

**What isn't foundational is a set of decisions, not a set of bugs.** Every one of them was the correct call for one machine, and none was taken with a second machine in view. Two of them were ruled on 09-07-2026 and are now work rather than questions: where each piece of state lives (a rule, applied row by row) and how Context tags are keyed (titles stay). The one that remains open and gates the most is what "most recent wins" means for a reader: an open page never learns its file changed, and the next keystroke writes the stale copy back.

**Is what already exists flawless?** Eight one-machine defects were confirmed at audit time. Seven are fixed; the heading-column toggle keyed by table position remains, filed under topic 1. The audit's own ninth item was denied by manual test.

**Does continuing to build undermine the foundations?** Not the foundations themselves. The boundary holds by construction and won't erode from feature work. What erodes is the cost of the undecided policies: every new stateful feature picks its own storage home until the placement rule is applied, every new hover control lengthens the touch backlog, every new view kind is written a third time. Deferral has a linear price.

#### What Has Changed Since The Audit

All on 09-07-2026, all gated green, committed on `main` as `f67ba25e4` (index), `f959e5690` (six fixes), `df045582e` (narrowed walks), and `4377b6555` (audit documents); the property-restore fix as `dd78ef63e`.

- **Six one-machine defects.** Ambiguous asset names render as unresolved instead of silently taking the first match. The Markdown table's cell sweep runs on the shared pointer harness so cancel, blur, and Escape tear it down. Two personalization keys decode to unset like their siblings, and a never-set accent follows the system accent, which the settings row already promised. Empty settings frames render blank. A CSS rule targeting a class CodeMirror never emits is gone. The table's column-widening animation survives StrictMode.
- **Property restore keeps the newer value (`dd78ef63e`).** Re-assigning a removed property no longer overwrites a value the page acquired in between; the restore skips a page that already holds a value the definition accepts. A hand-written value the definition rejects still reconciles to blank and is overwritten; that narrower gap is recorded, not fixed.
- **Context membership in the content index.** A `memberships` table, every Context-key writer re-indexing inside its own lock, the three cascade arms sweeping only the pages the index reports with a full-corpus fallback when no store is present, and one reverse query. One correction to the audit: Context keys were already indexed at key level; membership at value level was the missing piece.
- **Four narrowed walks.** The pre-rename holder check narrows through the index and confirms from disk. The callout atomic-range set is built once per document version. Tab and window persistence is debounced with a flush before a nexus switch. The Grouping pane's date list is memoized.
- **Withdrawn.** Interface Scale and Webpage Zoom syncing is intended design. ⌘-click on a table title opens a new tab; the finding was denied by manual test. The page outline is already surfaced as a dropdown.

#### Where Brainwaves Go

Nathan's scarce resource is decisions; the implementation is Claude's. Two passes have landed since the audit. This cycle's cleanup cleared the cheap behind-the-wall half — the locale fold and the read-modify-write consolidation in Topic 4, the MarkdownPM link-token and engine-filing debt, the import and test-scaffolding hygiene in Topic 10, the property-panel resolver, and the widget-unmount discipline. What that leaves, ordered by what to reach for first:

| Share                | Category              | What it actually is                                                                                                                                                                                                                                                                                                         |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The next sitting** | Decisions             | **D-2, the external-edit reload policy.** It gates the whole concurrency topic — the largest open foundation risk, where an open page never learns its file changed and the next keystroke writes the stale copy back. The plumbing already exists; this is a day of work behind one ruling, and nothing else unblocks as much. |
| **~15%**             | Behind-the-wall fixes | The two registry readers (R-17, R-18), the heading-column key rebound to the header row (R-06), the write-echo tests (R-12), the Lucide dynamic import that lifts the whole icon set out of the `<Icon>` critical path (R-53, a foundation-risk win in one edit), and the ready watch-patch id narrowing (R-38). Small, mechanical, no ruling needed. |
| **~50%**             | Ruled foundation work | The state-placement plan (ruled, still unbuilt), the Context-tag reconcile fix (R-11), and folding the Table and Cards renderers onto one engine (Topic 6) before a third view kind is written a third time.                                                                                                                  |
| **~35%**             | Building              | Backlinks, the Context view, and Linked-From over the reverse query that now exists; the inspector panel wired to a page selection; Agenda's surface once its three-vocabulary question (R-70) is settled.                                                                                                                    |

**Focus next:** rule **D-2** — the cheapest decision with the widest unlock — and run the cheap unblocked fixes alongside it, R-53 first. Ruled foundation work second; building last, on the openings whose plumbing is done.

#### Grounding: What Actually Matters

**Matters for cross-device reliability.** A second host or a sync layer runs into these on day one:

- `Core/Platform` and `Core/Contract`: the whole second-host contract. Solid.
- `Core/Files`, `Core/Nexus`, `Core/Paths`, `Core/Index`: atomicity, the walk, identity re-minting, the rename cascade. The index now carries Context membership.
- `Core/Contexts` and `Core/Properties`: title-keyed Context membership is the model's largest structural commitment, now ruled to stay. The value model beside it is excellent.
- `Core/Session` and `Core/Navigation`: identity-first references are exactly what sync needs. Session is where the external-edit reload has to land, and it appears in no Features doc.
- `Core/Actions`: portable menu models and the one door every menu opens through; a second host owes it only the native `menu` channel.
- `Desktop/Platform`, `Desktop/Store`, `Desktop/Bridge`, `Desktop/FileWatch`: where every safety guarantee actually lives. Desktop is 2,027 lines, readable end to end in an afternoon.
- `UIX/Interactions`, `UIX/Symbols`, `UIX/Theme`: one harness to keep, two engines to fold, no touch awareness, an icon barrel in the critical path.
- `Core/MarkdownPM/Engine` and `Core/MarkdownPM/Links`: the pure engine is the asset that ports. Links holds a contract that belongs in Connections.

**Matters for the product.** Shapes what the app can do; can be reworked freely with no cross-device consequence:

- `Core/Views/Pipeline`: finished work. `Core/Views/Table` and `Core/Views/Cards`: two prototypes past 1,300 lines each, a rework target, not a risk.
- `Core/Tiles`: the layout model is sync-ready; the surfaces have one hotspot.
- `Core/Interface`, `Core/Settings`, `Core/Pages`, `Core/Assets`, `Core/Trash`, `Core/Web`: ordinary accumulation, no findings above hygiene except an empty inspector waiting for its panel.

**Cosmetic.** `UIX/Glass`, `UIX/Menus`, `UIX/Pickers`, `UIX/Cards`, `UIX/Fields`, `UIX/Labels`, `UIX/Controls`, `UIX/Elements`, `UIX/Animations`, `UIX/Windows`, `UIX/Table`, `UIX/Utilities`: one of each, adopted, no divergence. `Showcase`: out of scope by standing rule.

#### Topics, In Priority Order

Nine lines of effort, ranked by foundation risk first, then debt that compounds, then hygiene. Each topic states what the audit found, the ruling that settles it where one was made, and what should change as a numbered action list with effort, what it deletes, and the ruling it waits on. Finding IDs point into the ledger in the appendix.

##### 1. Where Persisted State Lives

**Lenses and state:** Foundation risk, Ruled 09-07-2026, Filing. **Effort:** Small. **Deletes:** Nothing further.

**Found.** State is placed by what it belongs to. Anything a person decided about a piece of content, or about how a container presents itself, goes to that entity's Markdown frontmatter or its container's JSON sidecar under `.nexus/`, and travels with the nexus to every device. Anything true only of the machine in front of the user goes to `nexus.db` through the Platform layer, which never syncs and may be discarded on a schema bump without losing anything authored. Interface Scale and Webpage Zoom are the deliberate exception in the other direction: they stay in the synced settings file, because the nexus defines how it is meant to be read.

Two things still sit outside that shape. Six page-level authoring decisions — aliases, heading icon, citations, heading columns, and embed heights and zooms — stay in `nexus.db` by the ruling, so they remain per-machine and are lost on a schema bump. And the table heading-column toggle is keyed by table position rather than by anything the table carries, so inserting a table above moves it.

**Change.**

1. Key the heading-column toggle to the table's header row instead of its position, and make the state field remap on document change. *(S; ~10 lines)*
2. Whether File History stays per-device is the one open question; it is the only record of an overwritten external edit and lives in a store that never leaves the machine. *(—; Needs a ruling)*

**Findings:** R-01, R-05, R-06.

##### 2. The Concurrency Model Is Single-Process

**Lenses and state:** Gates Mobile/Sync, Foundation risk, Decision, Asymmetry, Separation, Tests. **Effort:** Large. **Deletes:** Nothing; this topic is additive.

**Found.** Every story in the codebase about two things writing at once is a story about one process on one machine, and it's told well: careful locks, a snapshot before every overwrite, an incremental walk, and the app quits a second instance to keep the reasoning honest. None of it survives a sync daemon or a second host, because the lock is a map in memory, the all-or-nothing write guarantee lives in one npm package the interface never declares it needs, and the "which duplicate is the original" judge reads a database that doesn't travel and then rewrites the loser's ID into a file that does.

The most reachable piece: **when a file changes outside Pommora, the open page never finds out.** The tree updates, the search index updates, and the editor keeps showing the old text. The next keystroke writes that old text back over the file. The overwritten version is snapshotted, but into a store that never leaves the machine. "Most recent wins" is currently implemented as *the most recent write to disk wins*, not *the most recent version reaches the reader*. The plumbing to fix it already exists as three calls; the missing part is one push channel and a policy for dirty tabs.

Context membership is keyed by Space *title*, and a governed write silently drops a tag whose Space can't be found, while the on-open repair sweep, using the same reconcile, refuses to do the same thing. On one machine that's repair; across two with a rename in flight it's loss.

**Ruled 09-07-2026:** Context tags stay title-keyed; Space ids in frontmatter would violate Reasonable Legibility, so only the small reconcile fix lands. A one-writer-per-nexus rule is not adopted as policy, since a future shared nexus may want something else; the atomicity contract still gets declared, and the cross-process story stays open until Sync is designed.

**Change.**

1. Add a `pages:changed` push carrying the changed paths. On receipt, reload a clean tab's body using the three calls history-restore already uses, and apply the dirty-tab policy from D-2. *(L; after D-2)*
2. State the atomicity requirement on the machine interface's write methods and add one conformance test any host must pass. *(S)*
3. Make the governed-write reconcile refuse to shrink a Context value the way the on-open repair sweep already does, so a tag whose Space can't be found is preserved rather than dropped. *(S; ~5 lines changed; Ruled)*
4. Identity re-minting's adjudication record: a synced, hand-editable ledger under `.nexus/`, or a user-confirmed action instead of a silent open-time pass. *(M; after D-3)*
5. Add tests for the write-echo filter's four behaviors and replace its per-event prefix scan. *(S; ~60 test lines)*

**Findings:** R-07, R-08, R-09, R-11, R-12.

##### 4. Registry Read Policy

**Lenses and state:** Gates Mobile/Sync · cheap, Foundation risk, Decision, Asymmetry, Duplication. **Effort:** Small to medium. **Deletes:** About 30 lines.

**Found.** One policy inconsistency in the write path. Two functions with the same name read the two nexus-wide registry files with opposite ideas of what an unreadable file means, and the lenient one hands back "no properties" for a file that's momentarily mid-sync, after which a rename half-lands and page creation skips the collection's schema.

**Change.**

1. One shared registry reader for both nexus-wide JSON files with the strict policy; make the on-open journal replay bail instead of sweep when the registry is unreadable. *(S–M; ~30 lines)*
2. Fold the Contexts `readRegistry` into its ensure wrapper so a read never writes; pick one foreign-field preservation strategy for both files. *(S; after D-9)*

**Findings:** R-17, R-18.

##### 6. The Table/Cards View Engine

**Lenses and state:** Debt, Decision, Duplication, Asymmetry, Performance, Tests. **Effort:** Large. **Deletes:** About 230 lines of duplicated interaction layer, 40 lines of view-kind lists, two mounted pickers per card.

**Found.** The data half of views is finished, excellent, and shouldn't be touched: one filter, one sorter, one grouper, one pure pipeline, one real host that owns every writer. The renderer half is two prototypes that both grew past 1,300 lines and write the same interaction layer twice: band drops, relocation, reorder, page opening, hover glance, menu dispatch, the ghost lifecycle. They aren't copy-paste duplicates, which is exactly why they drift; each pair is the same idea with one policy detail changed. Neither renderer virtualizes. Cards mounts two closed picker components and six store subscriptions per card, where Table already does it correctly with one picker at the root. Cards has one smoke assertion against Table's 1,330 lines of interaction tests. Six view kinds are registered, two render, and the other four silently render as tables, because there's no registry, only "is it cards, else table" across twelve places. Adding a third view kind means writing all of it a third time.

**Change.**

1. Extract one `useRowInteractions({ host, policy })` in `Core/Views/Host` returning relocate, reorder, band drop, open, hover, menu dispatch, and ghost; the policy is the two-field difference that actually exists (landing at end or slot, bands nest or not). Both renderers consume it. *(L; ~230 lines)*
2. Hoist Cards' icon and image pickers to the grid level the way Table already does. *(S; 2 mounted pickers per card)*
3. Scope the ghost's rect reads to the anchor's own zone; replace the per-drop group flattening with the host's existing row-to-band map. *(S; ~25 lines)*
4. Build a view-kind registry, or trim the union to the two kinds that render. *(M; after D-6; ~40 lines of lists)*
5. Add a Cards drop suite, a Cards value and menu suite, and a creation suite, on the harness the Table suites already use. *(M)*
6. Virtualize both renderers with the already-declared virtualizer. Separate, larger work; Mobile hits this wall first. *(L)*

**Findings:** R-32, R-33, R-34, R-35, R-36.

##### 7. MarkdownPM Filing And The Widget Layer

**Lenses and state:** Gates partly, Debt, Decision, Filing, Separation, Duplication, Performance. **Effort:** Small to large. **Deletes:** About 300 lines, plus 105 relocated.

**Found.** The most carefully built directory in the codebase. The pure engine is settled and would survive a second host intact. Two things are unfinished. First, filing: the app's page-resolution contract, what a page *is* when something links to it, is written inside the editor's folder and imported by the nexus index. Second, the React widget layer (tables, page tiles, webpage tiles) grew three independent answers to sizing, dismissal, and selection. Links and connections also never enter the intent stream, so the resting table cell had to re-implement their rendering by hand.

**Change.**

1. Move the page-resolution types and `buildPageIndex` to `Core/Connections/pageIndex.ts`; repoint eight imports. *(M; ~105 lines relocated)*
2. Add `linkIntents` to the intent layer; the CodeMirror decorator and the resting table cell become thin renderers of it. *(M; ~125 lines)*
3. One widget chassis for sizing, dismissal, and selection across page tiles, webpage tiles, and tables; outside-press goes through the dismissal stack. *(L; ~120 lines)*
4. One `EditorPref` type and one load loop for the four per-machine editor prefs. *(S; ~15 lines)*
5. Fold the two range movers into one with a reindent option; measure the whole-document derivation at 1k, 5k, and 20k lines before adding any new whole-document consumer. *(M / L; after D-8; ~50 lines)*

**Findings:** R-43, R-46, R-47, R-50, R-51.

##### 8. UIX: Engines, Bundle, Touch, Filing

**Lenses and state:** Gates Mobile · icon barrel and touch, Foundation risk, Debt, Decision, Asymmetry, Duplication, Performance, Filing. **Effort:** Small to large. **Deletes:** About 450 lines of the second reorder engine, the whole Lucide set from every non-picker bundle, 60 lines of small duplications, 490 relocated.

**Found.** The strongest-built part of the codebase, and the numbers aren't soft: one pointer harness every drag surface funnels through, one picker base, one menu vocabulary, zero raw colors, a hard import boundary that holds. Three things would resist a second host. The entire Lucide icon library sits in the critical path of every icon because a fallback resolver is imported statically, defeating the curated registry by construction; the fix is one dynamic import. Nothing in the kit ever asks what kind of pointer is driving it, in a kit whose reveal affordances are all hover-gated, so on a touch device a class of controls is simply absent. And reordering by dragging is implemented twice behind one façade, the larger version serving exactly one screen, carrying no keyboard support, and having no tests. Alongside: the design kit carries Pommora's application vocabulary in four files, and the drawn caret is split across three packages with UIX styling CodeMirror's classes directly.

**Change.**

1. Make the full-icon-set module a dynamic import awaited by the picker; remove the static import from the icon component. Re-measure the bundle after. *(S; the full Lucide set from every non-picker bundle)*
2. Add a coarse-pointer branch that pins hover reveals visible, a press-delay beside the travel threshold in the gesture harness, and a long-press route to dwell-to-create. *(L; after D-7)*
3. Fold cross-zone support into the single-zone engine as a zone registry; retire the second engine. Cards gains keyboard dragging for free. *(L; ~350–450 lines)*
4. Move the drawn caret into one `Core/Caret` with both geometry producers and both stylesheets; UIX keeps only the four caret tokens. *(M; ~490 lines relocated)*
5. Move the property drop model to `Core/Properties` and the on-disk color key names beside the schemas that persist them; parameterize the three class-name queries. *(M; after D-9; ~78 lines relocated)*
6. Collapse the two picker frost props into one; generate the kebab token republish from the source list; delete the unused `pending` drop state or build it; one Bloom factory. *(S; ~40 lines)*
7. Record the tile grid as a third drag treatment in the drag doc; put the tab bar's window drag on the shared harness. *(S; ~20 lines)*

**Findings:** R-52, R-53, R-54, R-55, R-56, R-57, R-58.

##### 9. Shell Debt

**Lenses and state:** Debt, Decision, Duplication, Separation, Filing, Under-adoption, Tests. **Effort:** Small to medium. **Deletes:** About 180 lines of a second tab model, 80 of a hand-written decoder, 50 of a fourth warm cache, and 65 in the property frame.

**Found.** The navigation and session core is better than its size suggests and shouldn't be touched. On top of it sits ordinary accumulation: "a tab" is defined twice in two folders with types crossing both ways; four "remember this editor's state" caches where one helper exists and two use it; a new user-facing setting needs three edits and only two are compiler-checked; `Sidebar.tsx` and `SettingsWindow.tsx` are both ~930 lines, one of which is a data table and the other of which buries a genuinely intricate 218-line component that can't be tested from anywhere; five places find interface parts by searching the whole document for a CSS class; and the property frame holds fourteen near-identical IPC wrappers and a seven-arm ternary router.

**Change.**

1. Fold the window tab strip onto the main tab bar with pins disabled and a last-tab-closes policy, or fold only the two tab models. *(M; after D-9; ~180 or ~60 lines)*
2. Give the shared warm-cache helper an optional capture guard; the four caches become one module with one entry type. *(M; ~50 lines)*
3. Make Personalization a zod schema whose inferred type replaces the interface; fold the window and tab decoders onto it. *(M; ~80 lines)*
4. Move the settings roster into its own data file; extract the sidebar's Disclosure component so it can be tested. *(S; ~1,000 lines relocated)*
5. Replace the five document-wide class queries with published rect getters on the pattern the content view already uses. *(S)*
6. One generic save wrapper and a per-type map in the property frame, so an unhandled type is a compile error rather than a blank spacer. *(S; ~65 lines)*

**Findings:** R-59, R-60, R-61, R-62, R-63.

##### 10. Filing, Naming, Taxonomy, And Coverage Hygiene

**Lenses and state:** Polish, Filing, Duplication, Separation, Tests. **Effort:** Small each. **Deletes:** About 110 lines plus 20 renames.

**Found.** The declared taxonomy is accurate and the recent restructure was carried through, not abandoned. What's left: "parent path" implemented three times; naming canon broken four ways, one of which the restructure itself created; three parallel vocabularies for the entity taxonomy; two hand-rolled modal scrims with no shared primitive; and the coverage numbers, recorded so nobody spends a week on them.

**Change.**

1. Add a rootless-safe `relDirname` to the paths module; retire the three parent-path copies; rename the three container finders to say what they match. *(S; ~8 lines)*
2. One naming pass: ~20 renames and the duplicate test stem merge. *(S)*
3. Derive the three entity-kind unions from one, after settling the Agenda vocabulary. *(M; after D-9)*
4. One `ModalScrim` in UIX owning the portal, event swallowing, and dismissal; both modals adopt it. *(S; ~30 lines)*
5. Add the Sync tsconfig to `npm run typecheck`; fold the Tiles README into SurfacePM; drop the 33 dead exports. *(S; ~40 lines)*

**Findings:** R-65, R-69, R-70, R-71, R-72.

##### 11. Remaining Wide Walks

**Lenses and state:** Debt, Performance, Scoped, awaiting rulings. **Effort:** Small to medium. **Deletes:** Nothing; work replaced.

**Found.** Three places still answer a narrow question with a wide walk. The connection title map is rebuilt wholesale on every real tree change, because the projection keyed off the tree isn't incremental even though the tree patches are; that "one walk per tree" contract in the tree index is also what the editor's per-scroll-frame cost runs into. The watcher's id resolution is a separate problem despite the same symptom: it runs on the engine side of the host boundary, and the tree index resolves icons and trails through UIX, so an engine module cannot reach it at all. On the scroll path the expensive part is not resolution, which is a cheap map lookup, but re-tokenizing the viewport and sorting every decoration; a resolution cache would not help. Two further narrowings were attempted and correctly stopped because they turned out to be correctness calls: the folder classifier's existence check is true for a malformed sidecar where the parse returns nothing, and the three watch-batch consumers classify different tree states, which is the same mechanism as the watcher's three-way classification. All of this is scoped in `Planning/Corpus Walk Deferrals — Scope.md`, each item as what it is, the wide walk, and the decision it needs.

**Change.**

1. Rule the tree-index model: rebuild on identity change (today) or carry forward with deltas. This is the keystone the scroll-path cost folds into. *(—; Needs a ruling)*
2. Carry the tree index forward across patches and re-index only the changed node, or accept the rebuild and bound it; per the ruling above. *(M; Deferred)*
3. Carry the touched page ids out of the watch patch's own result, where they are already in hand at write time. Independent of the ruling above, and the cheapest item here. *(S; Ready)*
4. On the scroll path, avoid re-tokenizing and re-sorting when only the viewport moved; a resolution cache is off the table. *(M; Deferred)*
5. Rule whether a folder's agenda classification may carry existence separately from parse success, and whether the watch-batch consumers may share one classification; decide once, since the two are one mechanism. *(—; Needs a ruling)*

**Findings:** R-38, R-39, R-41.

#### Decisions Only Nathan Can Make

Ordered by how much later work each gates. D-1 (state placement) and D-4 (Context tags) were ruled on 09-07-2026 and are written into their topics above.

**D-2: What does "most recent wins" mean for a reader?** Options: **(i)** reload the page body silently when the tab is clean and prompt when it's dirty; **(ii)** always reload and rely on file history for recovery; **(iii)** leave it and accept that Pommora quietly overwrites external edits.

**Recommendation:** (i). The plumbing exists; this is a day of work plus a UI ruling on the dirty case.

**D-3: How does identity re-minting behave with a second writer?** The one-writer rule was not adopted as policy on 09-07-2026, so this narrows to re-minting alone. Options: **(i)** a synced, hand-editable conflict ledger under `.nexus/`; **(ii)** re-minting becomes a user-confirmed action rather than a silent open-time pass. Riding on it: whether the crash journals stay in the synced `.nexus/` directory.

**D-6: Four unbuilt view kinds, drop them or build the registry?** Options: **(i)** trim the union to the two that render; **(ii)** build a view-kind registry now and make an unimplemented kind explicitly blank per the placeholder rule. Today they're selectable and silently render as tables, which is the one option nobody chose.

**Recommendation:** (ii) if a third view kind is planned within the next few cycles, otherwise (i).

**D-7: Does the design kit get touch?** Options: **(i)** decide Mobile is a WebView host and add coarse-pointer branches now, before more hover-revealed controls are built; **(ii)** decide Mobile gets its own interaction layer and let UIX stay desktop-only. The cost of deferring is linear in how many hover affordances get built meanwhile.

**D-8: How long may a Pommora page be?** Not a fix, a measurement and then a ruling. Every whole-document editor derivation is linear in length with no incremental route and no recorded ceiling. Measure at 1k, 5k, and 20k lines, then either accept a stated ceiling or invest in a line-range-invalidating scan.

**D-9: Smaller rulings, each one edit once decided** 

- Which slot a page lands in when moved across bands (Table appends, Cards lands at the drop slot, neither documented as intentional).
- Whether the two tab models' three differences become parameters.
- Whether Showcase keeps a public surface in the design kit.
- Whether a folder's agenda classification may carry existence separately from parse success, and whether the three watch-batch consumers may share one classification.
- Whether File History stays per-device.

#### Creative Openings

- **Backlinks, a Context view, and Linked-From now have their query.** The content index carries Context membership as of 09-07-2026 and `queryMembers` answers "which pages hold Space X or Context C." All three pending features were waiting on exactly that; each is now a surface over an existing read.
- **The main window's inspector is a live empty pane, and the panel built for it already works.** The inspector opens, slides, resizes, remembers its width, and shows nothing, while the property panel is already mounted in the Page Window and the NavWindow. Wiring it behind a page selection is a handful of lines against machinery that exists.
- **Agenda is threaded through the whole navigation layer with no surface at the end of it.** Tasks and Events are first-class in the data model, admitted into navigation references, and refused at every use. The plumbing is ahead of the surface, which makes the surface the cheap part. The three-vocabulary question in topic 10 should be settled first.
- **A read-only mobile viewer is a bounded project against today's Core.** The interface a host implements is small and enumerated: 15 machine methods, 19 store methods across three optional stores that all degrade gracefully, 17 host-context members, 4 dialer members, about 60 lines of watcher wiring. The blockers aren't architectural; they're the state-placement plan, D-2, and touch.
- **Async drop rejection.** The drag doc describes it, a `pending` state exists in the union, nothing sets it, and the Cards view's refusal path already resolves in the place it would go.

#### Solid, Leave Alone

- **`Core/Views/Pipeline`:** one pure compose of columns, filter, group, sort; a three-valued filter that's correct at every depth; comparators built once. A view embed and a full page run it verbatim.
- **`Core/Tiles/Layout`:** a pure split-tree model with an invariant checker, no DOM anywhere, five test files. Sync-ready as written.
- **`Core/Navigation`'s reference model:** everything durable is a bare kind-plus-id; every title, icon, and path re-derives at use time; unresolvable rows are render-pruned, never storage-pruned; the reconcilers are reference-preserving so an echo push writes nothing. Exactly the shape a sync layer needs.
- **`Core/MarkdownPM/Engine`:** pure functions over strings, no DOM, no React, no CodeMirror. The asset that ports.
- **`Core/Properties`' value model and journal slot:** definition-first decode, one refusal for every writer, one blank-means-delete, one slot factory serving both journals.
- **`Core/Connections`:** one grammar, one rewriter, one scanner, no duplication found at all.
- **`Core/Index`:** the seed, the maintenance hooks, and now Context membership; the reseed-equivalence property test is the template for every index change.
- **`UIX/Interactions/gesture.ts`:** one live gesture with every failure path routed to the same teardown. Every drag surface in both packages funnels through it.
- **Token discipline:** every literal color in the tree lives in one file; every duration goes through one motion module.
- **Single-process concurrency:** the epoch/slot single-flight, the root pin during patch, the re-check after every await, the re-entrant lock refusal, the debounced save scheduler awaited before a nexus flip.

#### Appendix A: Finding Ledger

Every open finding and where it lands. Kind: **FR** foundation risk, **D** decision, **Dt** debt, **P** polish. Every entry was confirmed against the code by the reconciler; downgrades are carried in the finding text.

| ID   | Topic | Kind | Finding                                                                                                                            | Where                                                                                                                 |
| ---- | ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| R-01 | 1     | D    | Six page-level authoring decisions live in the database that never syncs and is deleted on a schema bump                           | `Core/Platform/localState.ts, Desktop/Store/open.ts`                                                                  |
| R-05 | 1     | D    | File History exists only on the machine that made the edit, and it is the sole record of an overwritten external change            | `Core/Pages/fileHistory.ts, Desktop/Store/versionsDb.ts`                                                              |
| R-06 | 1     | FR   | The heading-column toggle is keyed by table ordinal, so inserting a table above moves it                                           | `Core/MarkdownPM/Tables/widget.tsx, Core/Pages/PageView.tsx`                                                          |
| R-07 | 2     | FR   | An external edit never reaches an open page, and the next keystroke writes over it                                                 | `Core/Session/nexusSlice.ts, Core/Session/mutationSlice.ts, Core/Nexus/watchPatch.ts`                                 |
| R-08 | 2     | FR   | Atomicity and single-writer are host obligations that the interface neither declares nor enforces                                  | `Core/Files/atomicWrite.ts, Core/Platform/machine.ts, Desktop/Platform/nodeMachine.ts`                                |
| R-09 | 2     | FR   | Identity re-minting is adjudicated from non-syncing device state and from file birth time, then written into files that sync       | `Core/Nexus/remint.ts, Core/Nexus/remintLedger.ts, Desktop/Store/open.ts`                                             |
| R-11 | 2     | D    | A governed write silently deletes a Context key whose Space it cannot find, and the on-open sweep refuses to do the same thing     | `Core/Contexts/contextResolve.ts, Core/Properties/governedWrite.ts, Core/Properties/repairSweep.ts`                   |
| R-12 | 2     | Dt   | One 26-line file decides which filesystem events are real, and nothing tests it                                                    | `Core/Files/writeEcho.ts, Desktop/FileWatch/watcher.ts`                                                               |
| R-17 | 4     | FR   | Two nexus-wide registries, opposite corruption policies — and the lenient one gates a rename cascade that half-lands               | `Core/Properties/propertiesRegistry.ts, Core/Contexts/contextsRegistry.ts, Core/Files/atomicWrite.ts`                 |
| R-18 | 4     | D    | Two registry machineries, two foreign-field strategies, one colliding name, and a reader that writes                               | `Core/Properties/propertiesRegistry.ts, Core/Contexts/contextsRegistry.ts`                                            |
| R-32 | 6     | Dt   | Table and Cards write the same interaction layer twice                                                                             | `Core/Views/Table/TableView.tsx, Core/Views/Cards/CardsView.tsx`                                                      |
| R-33 | 6     | Dt   | Neither renderer virtualizes, and every card carries six store subscriptions and two mounted pickers                               | `Core/Views/Table/TableView.tsx, Core/Views/Cards/CardsView.tsx, UIX/Pickers/IconPicker.tsx`                          |
| R-34 | 6     | D    | Six view kinds are registered, two render, and adding a third touches twelve places                                                | `Core/Views/views.ts, Core/Views/Host/ViewHost.tsx, Core/Views/Settings/LayoutFrame.tsx`                              |
| R-35 | 6     | Dt   | CardsView gets one mount assertion; TableView gets 1,330 lines of interaction tests                                                | `Core/Views/Table/bandCommits.test.tsx, Core/Views/Table/cellGestures.test.tsx, Core/Views/Host/useViewHost.test.tsx` |
| R-36 | 6     | Dt   | The Cards ghost reads every card's rect twice on every hover dwell, and re-flattens the group tree it was handed                   | `Core/Views/Cards/CardsView.tsx, Core/Views/Host/useViewHost.ts`                                                      |
| R-43 | 7     | Dt   | The app's page-resolution contract lives inside the editor                                                                         | `Core/MarkdownPM/Links/connectionsApi.ts, Core/Nexus/treeIndex.ts, Core/Tiles/tileKinds.tsx`                          |
| R-46 | 7     | Dt   | Links and connections never enter the intent stream, so a second renderer had to re-implement them                                 | `Core/MarkdownPM/Engine/intents.ts, Core/MarkdownPM/decorations.ts, Core/MarkdownPM/Tables/cellStatic.tsx`            |
| R-47 | 7     | Dt   | The three widget kinds re-implement sizing, dismissal and selection independently                                                  | `Core/MarkdownPM/Embeds/embedWidget.tsx, Core/MarkdownPM/Tables/widget.tsx, Core/MarkdownPM/Tables/MarkdownTable.tsx` |
| R-50 | 7     | Dt   | One persistence contract under three names for the four per-machine editor prefs                                                   | `Core/MarkdownPM/Embeds/embedWidget.tsx, Core/MarkdownPM/Tables/widget.tsx`                                           |
| R-51 | 7     | D    | Two implementations of "move this range to that slot," and no incremental path for the whole-document derivation                   | `Core/MarkdownPM/Engine/listDragModel.ts, Core/MarkdownPM/Engine/docScan.ts, Core/MarkdownPM/Engine/intents.ts`       |
| R-52 | 8     | Dt   | Two reorder engines behind one façade, the larger serving one screen                                                               | `UIX/Interactions/engine.tsx, UIX/Interactions/group.tsx, UIX/Interactions/drag.tsx`                                  |
| R-53 | 8     | FR   | The entire Lucide library ships in the `<Icon>` critical path, defeating the curated registry                                      | `UIX/Symbols/index.tsx, UIX/Symbols/allSymbols.ts, UIX/Pickers/IconPicker.tsx`                                        |
| R-54 | 8     | FR   | Zero coarse-pointer awareness in a kit whose reveal affordances are all hover-gated                                                | `UIX/Interactions/HoverRemove.tsx, UIX/Interactions/revealBar.ts, UIX/Interactions/OverScroll.tsx`                    |
| R-55 | 8     | Dt   | The drawn caret is split across three packages, and the design kit styles CodeMirror                                               | `UIX/Theme/nativeCaret.ts, UIX/Theme/caret.css, UIX/Theme/text-selection.css`                                         |
| R-56 | 8     | Dt   | Pommora's application vocabulary sits inside the design kit                                                                        | `UIX/Interactions/frameDndModel.ts, Core/Views/hiddenFrameModel.ts, UIX/Interactions/revealBar.ts`                    |
| R-57 | 8     | P    | Small UIX duplications: two spellings for one glass state, a hand-maintained token republish, a documented API that does not exist | `UIX/Pickers/picker-base.tsx, UIX/Glass/glass-window.tsx, UIX/Glass/glass-surface.tsx`                                |
| R-58 | 8     |      | The tile grid is a third drop treatment, and the tab bar hand-rolls the harness                                                    | `Core/Tiles/TileGrid.tsx, Core/Navigation/TabBar.tsx`                                                                 |
| R-59 | 9     | D    | Two tab models in two folders, with types crossing both ways                                                                       | `Core/Navigation/tabsModel.ts, Core/Interface/Windows/windowTabs.ts, Core/Navigation/TabBar.tsx`                      |
| R-60 | 9     | Dt   | Four warm caches, one shared helper, two adopters                                                                                  | `Core/Navigation/warmTabs.ts, Core/Interface/Windows/windowCache.ts, Core/Interface/Glance/GlancePane.tsx`            |
| R-61 | 9     | Dt   | A new user-facing setting needs three edits, and only two are checked by the compiler                                              | `Core/Settings/personalization.ts, Core/Settings/codec.ts, Core/Settings/SettingsWindow.tsx`                          |
| R-62 | 9     | Dt   | `Sidebar.tsx` and `SettingsWindow.tsx`: one is long, one is complex                                                                | `Core/Settings/SettingsWindow.tsx, Core/Interface/Sidebar/Sidebar.tsx`                                                |
| R-63 | 9     | Dt   | The shell reaches into the interface by global CSS-class selector                                                                  | `Core/Navigation/useNavThumbnails.ts, Core/Interface/Windows/windowMorph.ts, Core/Interface/ContentView.tsx`          |
| R-65 | 10    | P    | Two definitions of "parent path," four helpers for two questions, three unrelated `findContainer`s                                 | `Core/Nexus/treePatch.ts, Core/Nexus/treeIndex.ts, Core/Paths/posix.ts`                                               |
| R-69 | 10    | P    | Naming canon is broken four ways, one of them created by the filing pass itself                                                    | `listed in evidence`                                                                                                  |
| R-70 | 10    | D    | Three parallel vocabularies for one entity taxonomy                                                                                | `Core/Nexus/identityMark.ts, Core/Paths/paths.ts, Core/Nexus/folderKind.ts`                                           |
| R-71 | 10    | P    | Two hand-rolled modal scrims with no shared primitive                                                                              | `Core/Interface/Confirm/ConfirmationWindow.tsx, Core/Assets/ImagePicker.tsx`                                          |
| R-72 | 10    | P    | Coverage and dead-code measurements, recorded so they are not re-litigated                                                         | ``                                                                                                                    |
| R-38 | 11    | Dt   | Three narrow questions still answered with wide reads                                                                              | `Core/Views/loadValues.ts, Core/Nexus/folderKind.ts, Desktop/FileWatch/watcher.ts`                                    |
| R-39 | 11    | Dt   | The connection title map is rebuilt wholesale on every real tree change                                                            | `Core/Nexus/treeIndex.ts, Core/MarkdownPM/Links/connectionsApi.ts, Core/Nexus/liveTree.ts`                            |
| R-41 | 11    | Dt   | Every scroll frame re-resolves every visible connection and re-sorts every decoration                                              | `Core/MarkdownPM/decorations.ts`                                                                                      |

#### Appendix B: Corrections Made During Reconciliation

Nothing was denied outright by the reconciler. Four findings had a sub-claim denied and thirteen were downgraded; each is carried above in corrected form. The ones that matter:

- **TableView is not untested.** Two suites render the real view host, which renders TableView, so it has 1,330 lines of interaction tests. Cards, Sidebar, and SettingsWindow genuinely have none.
- **The lenient registry read doesn't strand Context references.** Context keys begin with `<`, which the property-name validator refuses, so the rename cascade never touches them. What it strands is link-valued property values.
- **Desktop is 2,027 lines, not 10,000.** The brief's initial count included build output.
- **Path-scoped churn is unmeasurable.** The top-level folders only exist since 09-05-2026, so any per-folder churn figure measures two days.
- **Context keys were already indexed.** The audit said Context keys were outside the content index; `page_values` already held them at key level. Membership at value level was what was missing, and it now exists.
- **Two findings fell to manual test or intent.** ⌘-click on a table title opens a new tab; Interface Scale and Webpage Zoom syncing is intended design.

#### Appendix C: Doc Drift Summary

Thirty-seven documentation corrections remain, of which the ones that hide a real finding are:

- **DesktopPM** describes the file lock as cross-process; it's in-process. This makes the single-writer problem look solved.
- **DesktopPM** and **CorePM** attribute the atomic write to a Core file that only forwards to the host. This makes the atomicity contract look declared.
- **CorePM** and **ConfigurationPM** count persistence tiers as four, two, or three. There are five, and browser storage appears in none of them. The placement rule replaces all three descriptions.
- **SymbolsPM** says nothing arrives by wildcard. One static import does.
- **MarkdownPM** says links come from one intent stream. They don't, and the doc describes the design the code should reach.
- **ContextsPM** and **PagesPM** contradict each other on whether losing a tag re-dates a page. PagesPM is right.
- **Editor-Internals** says atomic ranges never rebuild; that is now true of both providers.
- **The project CLAUDE.md** cites `Surface` as the glass boundary (it's `GlassSurface`), says Node is called only from Desktop (true for production, not tests), and describes the Contract as the only host relationship (the host also runs the engine half directly, which is correct and should be stated).
- **CorePM** calls itself the map and covers 11 of 22 Core folders; `Core/Session` appears in no Features doc at all.

#### Appendix D: Method

Nine Opus auditors, dispatched in parallel with one shared brief. Six owned a directory slice and applied all eleven lenses: Foundations, Content Model, Views, Shell, MarkdownPM, UIX. Three were cross-cutting: Duplication and Asymmetry, Filing and Taxonomy, and Mechanical Sweeps. A tenth Opus agent merged the nine into 72 findings, re-opened every ranked claim against the code, and produced a corrections section so nothing disappeared silently. The eight findings most likely to land above the fold were independently traced before the first consolidation. The fixes that followed were each dispatched to one agent with the finding's file pointers and the full gate, and each diff was read before its finding was removed. Remaining process document: `Corpus Walk Deferrals — Scope.md` (topic 11).
