## Codebase Audit (09-07-2026)

Nine read-only auditors each covered a slice of the tree or a cross-cutting lens, a tenth merged their reports and re-checked every ranked claim against the code, and the result was spot-checked again before consolidation. Planning documents, the context document, history, handoff, and all code comments were excluded as evidence. Features docs were read only as statements of intent. This document is the current state: findings that were fixed, withdrawn, or ruled moot are removed rather than annotated, and rulings are written into the topics they settle.

**Tree audited:** 76,468 lines of non-test source across 688 files, Core 61,612, UIX 12,829, Desktop 2,027. Mobile is an empty package shell; `Sync/` holds the device server. **Gates:** typecheck clean, lint clean, 362 test files and 4,391 tests passing.

#### The Verdict

**The codebase is workable and foundational.** This isn't a soft yes. The claims the project makes about itself were tested rather than assumed, and they hold:

- **The host boundary is real and machine-verified.** Core contains zero Node or Electron imports outside tests. The module graph the main process loads is 171 files, zero of them React, with three external dependencies. A second host is a bounded job, not a rewrite.
- **The read path is read-only.** No read channel writes.
- **Mechanical debt is near zero.** No export is fully dead. Zero raw colors across 44 Core style files. One dead CSS selector out of 631, now gone. Zero assertion-free tests. Textual duplication is 0.41% of tokens. Every declared folder exists under exactly its declared name, and there are zero orphan files.
- **The best code is in the places that matter most.** The view pipeline, the tile layout model, the navigation reference model, the pure editor engine, the pointer harness, the property value model, and the connections grammar were each independently called the strongest code in their slice. They should not be touched.

**What isn't foundational is a set of decisions, not a set of bugs.** Every one of them was the correct call for one machine, and none was taken with a second machine in view. One of them was ruled on 09-07-2026 and is now work rather than a question: where each piece of state lives, a rule applied row by row. The one that remains open and gates the most is what "most recent wins" means for a reader: an open page never learns its file changed, and the next keystroke writes the stale copy back.

**Is what already exists flawless?** Eight one-machine defects were confirmed at audit time. All eight are fixed. The audit's own ninth item was denied by manual test.

**Does continuing to build undermine the foundations?** Not the foundations themselves. The boundary holds by construction and won't erode from feature work. What erodes is the cost of the undecided policies: every new stateful feature picks its own storage home until the placement rule is applied, every new hover control lengthens the touch backlog. Deferral has a linear price.

#### Where Brainwaves Go

Nathan's scarce resource is decisions; the implementation is Claude's. What remains, ordered by what to reach for first:

| Share                | Category              | What it actually is                                                                                                                                                                                                                                                                                                         |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The next sitting** | Decisions             | **D-2, the external-edit reload policy.** It gates the whole concurrency topic — the largest open foundation risk, where an open page never learns its file changed and the next keystroke writes the stale copy back. The plumbing already exists; this is a day of work behind one ruling, and nothing else unblocks as much. |
| **~5%**              | Behind-the-wall fixes | The ready watch-patch id narrowing (R-38). Small, mechanical, no ruling needed. |
| **~55%**             | Ruled foundation work | The state-placement plan (ruled, still unbuilt).                                                                                                                  |
| **~35%**             | Building              | Backlinks, the Context view, and Linked-From over the reverse query that now exists; the inspector panel wired to a page selection; Agenda's surface.                                                                                                                    |

**Focus next:** rule **D-2** — the cheapest decision with the widest unlock — and run the cheap unblocked fixes alongside it. Ruled foundation work second; building last, on the openings whose plumbing is done.

#### Grounding: What Actually Matters

**Matters for cross-device reliability.** A second host or a sync layer runs into these on day one:

- `Core/Platform` and `Core/Contract`: the whole second-host contract. Solid.
- `Core/Files`, `Core/Nexus`, `Core/Paths`, `Core/Index`: atomicity, the walk, identity re-minting, the rename cascade. The index now carries Context membership.
- `Core/Contexts` and `Core/Properties`: the value model is excellent.
- `Core/Session` and `Core/Navigation`: identity-first references are exactly what sync needs. Session is where the external-edit reload has to land, and it appears in no Features doc.
- `Core/Actions`: portable menu models and the one door every menu opens through; a second host owes it only the native `menu` channel.
- `Desktop/Platform`, `Desktop/Store`, `Desktop/Bridge`, `Desktop/FileWatch`: where every safety guarantee actually lives. Desktop is 2,027 lines, readable end to end in an afternoon.
- `UIX/Interactions`, `UIX/Symbols`, `UIX/Theme`: one harness to keep, two engines to fold, no touch awareness.
- `Core/MarkdownPM/Engine` and `Core/MarkdownPM/Links`: the pure engine is the asset that ports.

**Matters for the product.** Shapes what the app can do; can be reworked freely with no cross-device consequence:

- `Core/Views/Pipeline` and `Core/Views/Host`: finished work; the renderers draw presentation over one interaction layer.
- `Core/Tiles`: the layout model is sync-ready; the surfaces have one hotspot.
- `Core/Interface`, `Core/Settings`, `Core/Pages`, `Core/Assets`, `Core/Trash`, `Core/Web`: ordinary accumulation, no findings above hygiene except an empty inspector waiting for its panel.

**Cosmetic.** `UIX/Glass`, `UIX/Menus`, `UIX/Pickers`, `UIX/Cards`, `UIX/Fields`, `UIX/Labels`, `UIX/Controls`, `UIX/Elements`, `UIX/Animations`, `UIX/Windows`, `UIX/Table`, `UIX/Utilities`: one of each, adopted, no divergence. `Showcase`: out of scope by standing rule.

#### Topics, In Priority Order

Six lines of effort, ranked by foundation risk first, then debt that compounds, then hygiene. Each topic states what the audit found, the ruling that settles it where one was made, and what should change as a numbered action list with effort, what it deletes, and the ruling it waits on. Finding IDs point into the ledger in the appendix.

##### 1. Where Persisted State Lives

**Lenses and state:** Ruled 09-07-2026, Decision, Filing. **Effort:** — **Deletes:** Nothing further.

**Found.** State is placed by what it belongs to. Anything a person decided about a piece of content, or about how a container presents itself, goes to that entity's Markdown frontmatter or its container's JSON sidecar under `.nexus/`, and travels with the nexus to every device. Anything true only of the machine in front of the user goes to `nexus.db` through the Platform layer, which never syncs and may be discarded on a schema bump without losing anything authored. Interface Scale and Webpage Zoom are the deliberate exception in the other direction: they stay in the synced settings file, because the nexus defines how it is meant to be read.

One thing still sits outside that shape. Six page-level authoring decisions — aliases, heading icon, citations, heading columns, and embed heights and zooms — stay in `nexus.db` by the ruling, so they remain per-machine and are lost on a schema bump.

**Change.**

1. Whether File History stays per-device is the one open question; it is the only record of an overwritten external edit and lives in a store that never leaves the machine. *(—; Needs a ruling)*

**Findings:** R-01, R-05.

##### 2. The Concurrency Model Is Single-Process

**Lenses and state:** Gates Mobile/Sync, Foundation risk, Decision, Asymmetry. **Effort:** Large. **Deletes:** Nothing; this topic is additive.

**Found.** Every story in the codebase about two things writing at once is a story about one process on one machine, and it's told well: careful locks, a snapshot before every overwrite, an incremental walk, and the app quits a second instance to keep the reasoning honest. None of it survives a sync daemon or a second host, because the lock is a map in memory and the "which duplicate is the original" judge reads a database that doesn't travel and then rewrites the loser's ID into a file that does.

The most reachable piece: **when a file changes outside Pommora, the open page never finds out.** The tree updates, the search index updates, and the editor keeps showing the old text. The next keystroke writes that old text back over the file. The overwritten version is snapshotted, but into a store that never leaves the machine. "Most recent wins" is currently implemented as *the most recent write to disk wins*, not *the most recent version reaches the reader*. The plumbing to fix it already exists as three calls; the missing part is one push channel and a policy for dirty tabs.

**Ruled 09-07-2026:** A one-writer-per-nexus rule is not adopted as policy, since a future shared nexus may want something else; the atomicity contract is declared, and the cross-process story stays open until Sync is designed.

**Change.**

1. Add a `pages:changed` push carrying the changed paths. On receipt, reload a clean tab's body using the three calls history-restore already uses, and apply the dirty-tab policy from D-2. *(L; after D-2)*
2. Identity re-minting's adjudication record: a synced, hand-editable ledger under `.nexus/`, or a user-confirmed action instead of a silent open-time pass. *(M; after D-3)*

**Findings:** R-07, R-09.

##### 8. UIX: Engines, Bundle, Touch, Filing

**Lenses and state:** Gates Mobile · touch, Foundation risk, Debt, Decision, Asymmetry, Duplication, Performance, Filing. **Effort:** Small to large. **Deletes:** About 450 lines of the second reorder engine, 60 lines of small duplications, 490 relocated.

**Found.** The strongest-built part of the codebase, and the numbers aren't soft: one pointer harness every drag surface funnels through, one picker base, one menu vocabulary, zero raw colors, a hard import boundary that holds. Two things would resist a second host. Nothing in the kit ever asks what kind of pointer is driving it, in a kit whose reveal affordances are all hover-gated, so on a touch device a class of controls is simply absent. And reordering by dragging is implemented twice behind one façade, the larger version serving exactly one screen and carrying no keyboard support, while the single-zone engine serving the other twelve call sites has no DOM test of its own. Alongside: the design kit carries Pommora's application vocabulary in four files, and the drawn caret is split across three packages with UIX styling CodeMirror's classes directly.

**Change.**

1. Add a coarse-pointer branch that pins hover reveals visible, a press-delay beside the travel threshold in the gesture harness, and a long-press route to dwell-to-create. *(L; after D-7)*
2. Fold cross-zone support into the single-zone engine as a zone registry and retire the second. The fold is three axes — the registry, the collision model, and the overlay presentation — and cross-zone keyboard is its own step after it; the views consume one drop contract, so the fold touches only Cards' adapter. *(L; −200 to −400 lines)*
3. Move the drawn caret into one `Core/Caret` with both geometry producers and both stylesheets; UIX keeps only the four caret tokens. *(M; ~490 lines relocated)*
4. Move the property drop model to `Core/Properties` and the on-disk color key names beside the schemas that persist them; parameterize the three class-name queries. *(M; after D-9; ~78 lines relocated)*
5. Generate the kebab token republish from the source list; one Bloom factory. *(S)*
6. Record the tile grid as a third drag treatment in the drag doc; put the tab bar's window drag on the shared harness. *(S; ~20 lines)*

**Findings:** R-52, R-54, R-55, R-56, R-57, R-58.

##### 9. Shell Debt

**Lenses and state:** Debt, Decision, Duplication, Separation, Filing, Under-adoption, Tests. **Effort:** Small to medium. **Deletes:** About 180 lines of a second tab model, 80 of a hand-written decoder, 50 of a fourth warm cache, and 65 in the property frame.

**Found.** The navigation and session core is better than its size suggests and shouldn't be touched. On top of it sits ordinary accumulation: "a tab" is defined twice in two folders with types crossing both ways; four "remember this editor's state" caches where one helper exists and two use it; a new user-facing setting needs three edits and only two are compiler-checked; five places find interface parts by searching the whole document for a CSS class; and the property frame holds fourteen near-identical IPC wrappers and a seven-arm ternary router.

**Change.**

1. Fold the window tab strip onto the main tab bar with pins disabled and a last-tab-closes policy, or fold only the two tab models. *(M; after D-9; ~180 or ~60 lines)*
2. Give the shared warm-cache helper an optional capture guard; the four caches become one module with one entry type. *(M; ~50 lines)*
3. Make Personalization a zod schema whose inferred type replaces the interface; fold the window and tab decoders onto it. *(M; ~80 lines)*
4. Replace the five document-wide class queries with published rect getters on the pattern the content view already uses. *(S)*
5. One generic save wrapper and a per-type map in the property frame, so an unhandled type is a compile error rather than a blank spacer. *(S; ~65 lines)*

**Findings:** R-59, R-60, R-61, R-63.

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

Ordered by how much later work each gates. D-1 (state placement) was ruled on 09-07-2026 and is written into its topic above.

**D-2: What does "most recent wins" mean for a reader?** Options: **(i)** reload the page body silently when the tab is clean and prompt when it's dirty; **(ii)** always reload and rely on file history for recovery; **(iii)** leave it and accept that Pommora quietly overwrites external edits.

**Recommendation:** (i). The plumbing exists; this is a day of work plus a UI ruling on the dirty case.

**D-3: How does identity re-minting behave with a second writer?** The one-writer rule was not adopted as policy on 09-07-2026, so this narrows to re-minting alone. Options: **(i)** a synced, hand-editable conflict ledger under `.nexus/`; **(ii)** re-minting becomes a user-confirmed action rather than a silent open-time pass. Riding on it: whether the crash journals stay in the synced `.nexus/` directory.

**D-7: Does the design kit get touch?** Options: **(i)** decide Mobile is a WebView host and add coarse-pointer branches now, before more hover-revealed controls are built; **(ii)** decide Mobile gets its own interaction layer and let UIX stay desktop-only. The cost of deferring is linear in how many hover affordances get built meanwhile.

**D-9: Smaller rulings, each one edit once decided** 

- Whether the two tab models' three differences become parameters.
- Whether Showcase keeps a public surface in the design kit.
- Whether a folder's agenda classification may carry existence separately from parse success, and whether the three watch-batch consumers may share one classification.
- Whether the properties registry and the contexts registry should share one foreign-field preservation strategy.
- Whether File History stays per-device.

#### Creative Openings

- **Backlinks, a Context view, and Linked-From now have their query.** The content index carries Context membership as of 09-07-2026 and `queryMembers` answers "which pages hold Space X or Context C." All three pending features were waiting on exactly that; each is now a surface over an existing read.
- **The main window's inspector is a live empty pane, and the panel built for it already works.** The inspector opens, slides, resizes, remembers its width, and shows nothing, while the property panel is already mounted in the Page Window and the NavWindow. Wiring it behind a page selection is a handful of lines against machinery that exists.
- **Agenda is threaded through the whole navigation layer with no surface at the end of it.** Tasks and Events are first-class in the data model, admitted into navigation references, and refused at every use. The plumbing is ahead of the surface, and the entity vocabulary now resolves to one source, which makes the surface the cheap part.
- **A read-only mobile viewer is a bounded project against today's Core.** The interface a host implements is small and enumerated: 15 machine methods, 19 store methods across three optional stores that all degrade gracefully, 19 host-context members, 4 dialer members, about 60 lines of watcher wiring. The blockers aren't architectural; they're the state-placement plan, D-2, and touch.

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
| R-07 | 2     | FR   | An external edit never reaches an open page, and the next keystroke writes over it                                                 | `Core/Session/nexusSlice.ts, Core/Session/mutationSlice.ts, Core/Nexus/watchPatch.ts`                                 |
| R-09 | 2     | FR   | Identity re-minting is adjudicated from non-syncing device state and from file birth time, then written into files that sync       | `Core/Nexus/remint.ts, Core/Nexus/remintLedger.ts, Desktop/Store/open.ts`                                             |
| R-52 | 8     | Dt   | Two reorder engines behind one façade, the larger serving one screen                                                               | `UIX/Interactions/engine.tsx, UIX/Interactions/group.tsx, UIX/Interactions/drag.tsx`                                  |
| R-54 | 8     | FR   | Zero coarse-pointer awareness in a kit whose reveal affordances are all hover-gated                                                | `UIX/Interactions/HoverRemove.tsx, UIX/Interactions/revealBar.ts, UIX/Interactions/OverScroll.tsx`                    |
| R-55 | 8     | Dt   | The drawn caret is split across three packages, and the design kit styles CodeMirror                                               | `UIX/Theme/nativeCaret.ts, UIX/Theme/caret.css, UIX/Theme/text-selection.css`                                         |
| R-56 | 8     | Dt   | Pommora's application vocabulary sits inside the design kit                                                                        | `UIX/Interactions/frameDndModel.ts, Core/Views/hiddenFrameModel.ts, UIX/Interactions/revealBar.ts`                    |
| R-57 | 8     | P    | Small UIX duplications: a hand-maintained kebab token republish and a second Bloom factory                                         | `UIX/Glass/glass-window.tsx, UIX/Glass/glass-surface.tsx`                                                             |
| R-58 | 8     |      | The tile grid is a third drop treatment, and the tab bar hand-rolls the harness                                                    | `Core/Tiles/TileGrid.tsx, Core/Navigation/TabBar.tsx`                                                                 |
| R-59 | 9     | D    | Two tab models in two folders, with types crossing both ways                                                                       | `Core/Navigation/tabsModel.ts, Core/Interface/Windows/windowTabs.ts, Core/Navigation/TabBar.tsx`                      |
| R-60 | 9     | Dt   | Four warm caches, one shared helper, two adopters                                                                                  | `Core/Navigation/warmTabs.ts, Core/Interface/Windows/windowCache.ts, Core/Interface/Glance/GlancePane.tsx`            |
| R-61 | 9     | Dt   | A new user-facing setting needs three edits, and only two are checked by the compiler                                              | `Core/Settings/personalization.ts, Core/Settings/codec.ts, Core/Settings/SettingsWindow.tsx`                          |
| R-63 | 9     | Dt   | The shell reaches into the interface by global CSS-class selector                                                                  | `Core/Navigation/useNavThumbnails.ts, Core/Interface/Windows/windowMorph.ts, Core/Interface/ContentView.tsx`          |
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

#### Appendix C: Method

Nine Opus auditors, dispatched in parallel with one shared brief. Six owned a directory slice and applied all eleven lenses: Foundations, Content Model, Views, Shell, MarkdownPM, UIX. Three were cross-cutting: Duplication and Asymmetry, Filing and Taxonomy, and Mechanical Sweeps. A tenth Opus agent merged the nine into 72 findings, re-opened every ranked claim against the code, and produced a corrections section so nothing disappeared silently. The eight findings most likely to land above the fold were independently traced before the first consolidation. The fixes that followed were each dispatched to one agent with the finding's file pointers and the full gate, and each diff was read before its finding was removed. Remaining process document: `Corpus Walk Deferrals — Scope.md` (topic 11).

#### Maintaining This Document

This report is the source of truth for the audit, and it is written to shrink. A finding that has been fixed, withdrawn, or ruled moot is **removed, not annotated** — nothing here carries a "done," a "superseded," or a note explaining what it used to say. What changed is changed surgically in what remains, and the record of what was once here lives in git history, not on the page. The document is expected to end nearly empty, and that emptiness is the sign the audit succeeded.

**Removing a finding.**

1. Delete its **Appendix A ledger row**. Gaps in the `R-NN` sequence are preserved — the surviving IDs are never renumbered.
2. Delete its **Change item** and renumber that topic's Change list contiguously (1, 2, 3…).
3. Remove its ID from the topic's **Findings:** line, keeping the remaining gaps.
4. Cut its clause from the topic's **Found** paragraph, and from the **Lenses** and **Deletes** meta lines wherever a lens or a deletion count pointed only at it, mending the surrounding prose so it reads as though the clause was never there.
5. Grep the whole document for the `R-NN`, the file paths, and the prose hook, and confirm no residue survives anywhere — Verdict, Grounding, Where Brainwaves Go, and Creative Openings included.

**Correcting a claim.** Apply the most minimal edit that makes the sentence true — change what is written rather than appending an amendment. Where a statement is simply no longer relevant, remove it; silence is not contradiction, so a claim that has become false is deleted or restated, never patched with a footnote.
