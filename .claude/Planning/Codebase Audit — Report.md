## Codebase Audit (09-07-2026)

Nine read-only auditors each covered a slice of the tree or a cross-cutting lens, a tenth merged their reports and re-checked every ranked claim against the code, and the result was spot-checked again before consolidation. Planning documents, the context document, history, handoff, and all code comments were excluded as evidence. Features docs were read only as statements of intent. This document is the current state: findings that were fixed, withdrawn, or ruled moot are removed rather than annotated, and rulings are written into the topics they settle.

**Tree audited:** 76,468 lines of non-test source across 688 files, Core 61,612, UIX 12,829, Desktop 2,027. Mobile and Sync are empty package shells. **Gates:** typecheck clean, lint clean, 341 test files and 4,146 tests passing after the day's fixes.

#### The Verdict

**The codebase is workable and foundational.** This isn't a soft yes. The claims the project makes about itself were tested rather than assumed, and they hold:

- **The host boundary is real and machine-verified.** Core contains zero Node or Electron imports outside tests. The module graph the main process loads is 156 files, zero of them React, with three external dependencies. A second host is a bounded job, not a rewrite.
- **The read path is read-only.** No read channel writes.
- **Mechanical debt is near zero.** Dead exports are about 33 in 2,710. Zero raw colors across 44 Core style files. One dead CSS selector out of 631, now gone. Zero assertion-free tests. Textual duplication is 0.41% of tokens. Every declared folder exists under exactly its declared name, and there are zero orphan files.
- **The best code is in the places that matter most.** The view pipeline, the tile layout model, the navigation reference model, the pure editor engine, the pointer harness, the property value model, and the connections grammar were each independently called the strongest code in their slice. They should not be touched.

**What isn't foundational is a set of decisions, not a set of bugs.** Every one of them was the correct call for one machine, and none was taken with a second machine in view. Three of them were ruled on 09-07-2026 and are now work rather than questions: where each piece of state lives (a rule, applied row by row), how Context tags are keyed (titles stay), and whether a menu needs the operating system (one coherent menu system replaces the dead second renderer). The one that remains open and gates the most is what "most recent wins" means for a reader: an open page never learns its file changed, and the next keystroke writes the stale copy back.

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

Nathan's scarce resource is decisions; the implementation is Claude's. With the state-placement rule, the Context-tag ruling, and the menu ruling made, the split for the next cycle:

| Share | Category | What it actually is |
| --- | --- | --- |
| **The next sitting** | Decisions | D-2 (external-edit reload policy) gates the concurrency topic; D-6 through D-9 are smaller. |
| **~25%** | Behind-the-wall fixes | The engine-boundary guards (three approved), the four registry and locale policy fixes, the heading-column key, the write-echo tests. Small, mechanical, unblocked. |
| **~45%** | Ruled foundation work | The state-placement plan, the menu-system rework, the reconcile fix for Context tags, and the Table/Cards engine before a third view kind exists. |
| **~30%** | Building | Backlinks, the Context view, and Linked-From over the reverse query that now exists; the inspector panel; Agenda's surface after its vocabulary is settled. |

**Sequenced, not interleaved.** Fixes first because they're cheap and independently verifiable. Ruled work second. Building third, on the openings whose plumbing is done.

#### Grounding: What Actually Matters

**Matters for cross-device reliability.** A second host or a sync layer runs into these on day one:

- `Core/Platform` and `Core/Contract`: the whole second-host contract. Solid, with one envelope hole.
- `Core/Files`, `Core/Nexus`, `Core/Paths`, `Core/Index`: atomicity, the walk, identity re-minting, the rename cascade, one locale-sensitive string fold. The index now carries Context membership.
- `Core/Contexts` and `Core/Properties`: title-keyed Context membership is the model's largest structural commitment, now ruled to stay. The value model beside it is excellent.
- `Core/Session` and `Core/Navigation`: identity-first references are exactly what sync needs. Session is where the external-edit reload has to land, and it appears in no Features doc.
- `Core/Actions`: portable menu models, the half of the menu system that already works for a second host.
- `Desktop/Platform`, `Desktop/Store`, `Desktop/Bridge`, `Desktop/FileWatch`: where every safety guarantee actually lives. Desktop is 2,027 lines, readable end to end in an afternoon.
- `UIX/Interactions`, `UIX/Symbols`, `UIX/Theme`: one harness to keep, two engines to fold, no touch awareness, an icon barrel in the critical path.
- `Core/MarkdownPM/Engine` and `Core/MarkdownPM/Links`: the pure engine is the asset that ports. Links holds a contract that belongs in Connections.

**Matters for the product.** Shapes what the app can do; can be reworked freely with no cross-device consequence:

- `Core/Views/Pipeline`: finished work. `Core/Views/Table` and `Core/Views/Cards`: two prototypes past 1,300 lines each, a rework target, not a risk.
- `Core/Tiles`: the layout model is sync-ready; the surfaces have one hotspot.
- `Core/Interface`, `Core/Settings`, `Core/Pages`, `Core/Assets`, `Core/Trash`, `Core/Web`: ordinary accumulation, no findings above hygiene except an empty inspector waiting for its panel.

**Cosmetic.** `UIX/Glass`, `UIX/Menus`, `UIX/Pickers`, `UIX/Cards`, `UIX/Fields`, `UIX/Labels`, `UIX/Controls`, `UIX/Elements`, `UIX/Animations`, `UIX/Windows`, `UIX/Table`, `UIX/Utilities`: one of each, adopted, no divergence. `Showcase`: out of scope by standing rule.

#### Topics, In Priority Order

Eleven lines of effort, ranked by foundation risk first, then debt that compounds, then hygiene. Each topic states what the audit found, the ruling that settles it where one was made, and what should change as a numbered action list with effort, what it deletes, and the ruling it waits on. Finding IDs point into the ledger in the appendix.

##### 1. Where Persisted State Lives

**Lenses and state:** Gates Mobile/Sync, Foundation risk, Ruled 09-07-2026, Filing, Asymmetry. **Effort:** Medium. **Deletes:** `useViewOrders.ts`, `disclosureState.ts`, the two-homes fork, two storage scopes, two UIX module maps.

**Found.** Pommora writes state to five different places: the user's Markdown and JSON files under `.nexus/` (which travel with the nexus), the `nexus.db` database (which by design never travels and is deleted outright on a schema bump), the app-level `pommora.json`, the browser's own storage, and, for floating-window geometry, plain in-memory maps that die on reload. Which place a thing goes to was decided one piece at a time.

Dragging a row writes to two different homes depending on whether the view happens to be sorted, so the same gesture sometimes syncs and sometimes doesn't, and which saved view a container opens on never leaves the machine. Pane widths and sidebar disclosure bypass the host entirely into browser storage. Floating-window size lives in a module map keyed by window id and is lost on reload. The table heading-column toggle is keyed by table position rather than by anything the table carries, so inserting a table above moves it.

**The rule, ruled 09-07-2026:** content and user intent go to `.nexus/` files; per-machine chrome goes to `nexus.db` through the Platform layer; nothing goes to browser storage. Applied row by row: manual row order and the active view move to the container sidecar; pane widths, sidebar disclosure, and floating-window size move to the device store, window size keyed per window type (Settings, Pages, Nav, History, Web) rather than per entity, the iteration window keeping none; the window panel width is not persisted at all. Aliases, heading icon, citations, heading columns, and embed heights and zooms stay in `nexus.db` as they are. Interface Scale and Webpage Zoom stay in the synced settings file. The plan is `Planning/State Placement — Implementation Plan.md`.

**Change.**

1. Write the rule into `CorePM.md`'s persistence section and retire the four-tier / two-layer / three-scope descriptions that disagree with it. *(S; Ruled)*
2. Add `manual_order` to the view record beside `collapsed_groups`; every drop site persists through the view, so the sorted and grouped path stops forking away from the unsorted one. Delete `useViewOrders.ts` and the `viewOrder` scope after a one-shot import on first open. *(M; ~31 lines + the fork; Ruled)*
3. Add `active_view` to the container sidecar, written by a mutate op and read onto the container node; delete the `activeView` scope and its startup load after a one-shot import. *(S; Ruled)*
4. Route pane widths and sidebar disclosure through the device-preferences scope, seeded before first paint; delete `disclosureState.ts` and the browser-storage block. *(S; ~75 lines; Ruled)*
5. Persist floating-window size per window type through the device store; UIX's module map becomes a callback prop pair supplied by Core keyed by type. The window panel width stays in memory. *(S; Ruled)*
6. Key the heading-column toggle to the table's header row instead of its position, and make the state field remap on document change. *(S; ~10 lines)*
7. Whether File History stays per-device is the one open question; it is the only record of an overwritten external edit and lives in a store that never leaves the machine. *(—; Needs a ruling)*

**Findings:** R-01, R-02, R-04, R-05, R-06.

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

##### 3. The Engine/Renderer Boundary Inside Core

**Lenses and state:** Gates Mobile/Sync · the guards, Foundation risk, Three actions approved, Separation, Filing, Tests. **Effort:** Small. **Deletes:** A dead interface method, two manifest lines, ~20 lines of handler self-catching, and 18 Desktop imports out of Core's tests.

**Found.** Core is really two programs sharing one folder tree: a host-side engine of about 156 files and a renderer of about 536, overlapping in about 52. The split is real and clean. Nothing declares it, nothing checks it, the main-process typecheck would accept a DOM-touching engine file, and Core's own test suite inverts the layering by installing Desktop's machine implementation. So the portability that makes a second host a bounded project is accidental, and it will erode silently. Core's manifest also declares a Node filesystem package it never imports and omits four editor packages it does, and about a fifth of the bridge answers off the Result envelope while the host wraps every throw in one anyway.

**Change.**

1. Add one Vitest file that walks imports from `Contract/serve.ts` and fails on React, `.tsx`, or DOM globals. *(S; ~40 lines)*
2. Add `"lib": ["ES2022"]` to the main-process tsconfig so a DOM-touching engine file is a type error. *(S; 1 line)*
3. Build an in-memory machine and key-value store in `Core/Testing`; remove the Desktop devDependency and the 18 Desktop imports from Core's tests. *(M; Approved)*
4. Fix Core's manifest: drop the Node filesystem package it never imports; declare the four editor packages and the styling package it does. *(S; 2 out, 5 in)*
5. Put the nine unguarded channels on the Result envelope, delete the ad-hoc self-catching that compensates, name the five fire-and-forget channels as the declared exception, and add a test for the IPC serve loop. *(M; ~20 lines; Approved)*
6. Delete the dead `writeRaw` machine method. *(S; 5 lines; Approved)*

**Findings:** R-13, R-14, R-15, R-16.

##### 4. Registry Read Policy And Locale-Dependent Keys

**Lenses and state:** Gates Mobile/Sync · cheap, Foundation risk, Decision, Asymmetry, Duplication. **Effort:** Small to medium. **Deletes:** About 60 lines.

**Found.** Four small policy inconsistencies in the write path. Two functions with the same name read the two nexus-wide registry files with opposite ideas of what an unreadable file means, and the lenient one hands back "no properties" for a file that's momentarily mid-sync, after which a rename half-lands and page creation skips the collection's schema. Three functions fold a user-visible name into a comparison key three different ways, one of them using the machine's language setting, so the same nexus matches different folders on a Turkish laptop. Seven sorts read the host locale, including the one that decides a folder's order when nothing explicit is saved. And one read-modify-write helper exists with four longhand copies that each re-decide what a failed read means. The codebase already handles this hazard class correctly for dates; the discipline just wasn't carried to strings.

**Change.**

1. One shared registry reader for both nexus-wide JSON files with the strict policy; make the on-open journal replay bail instead of sweep when the registry is unreadable. *(S–M; ~30 lines)*
2. Fold the Contexts `readRegistry` into its ensure wrapper so a read never writes; pick one foreign-field preservation strategy for both files. *(S; after D-9)*
3. Change `toLocaleLowerCase` to `toLowerCase` in the exclusion folder (one word), then add one `foldKey` and one `compareTitles` in `Core/Paths` backed by a pinned collator and replace the ten expressions. *(S; ~10 expressions)*
4. Fold the four longhand read-modify-write sites onto the existing helper after ruling whether an unreadable sidecar in a sweep is a skip or a stop; route the tile connection rewrite through the timestamp-preserving path. *(M; after D-9; ~20 lines)*

**Findings:** R-17, R-18, R-19, R-20.

##### 5. Menus And Shortcuts Have Two Homes

**Lenses and state:** Gates Mobile, Foundation risk, Ruled 09-07-2026, Duplication, Under-adoption, Asymmetry. **Effort:** Medium to large. **Deletes:** About 200 lines of a hand-built menu pane, ~15 shortcut literals, ~40 lines of listener plumbing.

**Found.** Every right-click menu is drawn by the operating system. The models behind them are portable and well-factored: one action tree per menu, built in Core, with the Electron template derived from it. But there's exactly one renderer. An in-app renderer for the same models was built, is still mounted in the running app, still has tests, and nothing can reach it. The preference switch that sounds like it governs this doesn't. The one menu that needed the in-app path (the tile handle menu) is written twice in one file because it had nowhere else to go.

Keyboard shortcuts live in four unrelated places: eight hard-coded in the native Electron menu, three as user-editable data in `settings.json` matched in the renderer, one literal typed into the handler that reads that data, and one hard-coded in the tab bar. The native menu and the renderer can't see each other, so a user who rebinds a command onto a chord the native menu already owns silently loses. Six layers also handle Escape by their own window listener and coordinate by `defaultPrevented`, instead of joining the ordered dismissal stack the design kit provides.

**Ruled 09-07-2026:** the right-click menu system is reworked as one coherent system, not a revive-or-delete choice. `popRowMenu` is the single door every menu goes through; it honors the native-menus preference; both renderers draw from one action-tree model; the tile handle menu becomes the first ordinary consumer, with more to follow. The dismissal-stack fold is approved.

**Change.**

1. Rework the row-menu path: `popRowMenu` consults the preference and renders natively or through the in-app presenter from the same model; the hand-built tile menu pane is deleted in favor of the generic renderer; one test proves both renderers draw the same rows from one model. *(M–L; ~200 lines; Ruled)*
2. One shortcut table that native accelerators and renderer commands both derive from, on the pattern formatting chords already use (`FORMAT_CHORDS` feeds both CodeMirror and the Electron display string); remove the inline literal in the app handler and the hard-coded chord in the tab bar. Prerequisite for the Shortcuts settings pane the docs already promise. *(M; ~15 literals)*
3. Move the six Escape listeners that coordinate by `defaultPrevented` onto the dismissal stack after ruling on the ordering they currently get by accident. *(M; after D-9; ~40 lines; Approved)*
4. Move the connection menu model into `Core/Actions` and the native-menu presenter out of it. *(S)*

**Findings:** R-21, R-22, R-23, R-24.

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

**Lenses and state:** Gates partly, Foundation risk, Debt, Decision, Filing, Separation, Duplication, Performance. **Effort:** Small to large. **Deletes:** About 300 lines, plus 300 relocated.

**Found.** The most carefully built directory in the codebase. The pure engine is settled and would survive a second host intact. Two things are unfinished. First, filing: the app's page-resolution contract, what a page *is* when something links to it, is written inside the editor's folder and imported by the nexus index; the engine imports upward into the widget layer in two files; and the editor reaches past its own host object to open a web link, the single exception to an otherwise complete injection boundary. Second, the React widget layer (tables, page tiles, webpage tiles) grew three independent answers to sizing, dismissal, and selection, and the link surfaces grew six independent answers to "what link is at this offset," two of which tokenize the entire document on ⌘B. Links and connections also never enter the intent stream, so the resting table cell had to re-implement their rendering by hand.

**Change.**

1. Move the page-resolution types and `buildPageIndex` to `Core/Connections/pageIndex.ts`; repoint eight imports. *(M; ~105 lines relocated)*
2. Add `openLink` to the editor host object; delete the editor's direct store and dialer imports. *(S; ~6 lines)*
3. Move the webpage-embed grammar into `Engine/` and the code-mask helper into `Core/Connections` so three import edges point downward. *(S; ~35 lines relocated)*
4. Add `linkIntents` to the intent layer; the CodeMirror decorator and the resting table cell become thin renderers of it. *(M; ~125 lines)*
5. One widget chassis for sizing, dismissal, and selection across page tiles, webpage tiles, and tables; outside-press goes through the dismissal stack. *(L; ~120 lines)*
6. One `linkTokenAt` in the token engine; the Format menu tokenizes the caret's line, not the document. *(S; ~35 lines)*
7. Move the citation scanner and the math heuristic out of `detect.ts` into their own engine file. *(S; ~165 lines relocated)*
8. Settle which widget unmount path is correct and delete the other; one `EditorPref` type and one load loop for the four per-machine editor prefs. *(S; after D-9; ~29 lines)*
9. Fold the two range movers into one with a reindent option; measure the whole-document derivation at 1k, 5k, and 20k lines before adding any new whole-document consumer. *(M / L; after D-8; ~50 lines)*

**Findings:** R-43, R-44, R-45, R-46, R-47, R-48, R-49, R-50, R-51.

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

**Lenses and state:** Debt, Decision, Duplication, Separation, Filing, Under-adoption, Tests. **Effort:** Small to medium. **Deletes:** About 180 lines of a second tab model, 80 of a hand-written decoder, 50 of a fourth warm cache, 75 of a hand-rolled rename, 65 in the property frame.

**Found.** The navigation and session core is better than its size suggests and shouldn't be touched. On top of it sits ordinary accumulation: "a tab" is defined twice in two folders with types crossing both ways; four "remember this editor's state" caches where one helper exists and two use it; a new user-facing setting needs three edits and only two are compiler-checked; `Sidebar.tsx` and `SettingsWindow.tsx` are both ~930 lines, one of which is a data table and the other of which buries a genuinely intricate 218-line component that can't be tested from anywhere; five places find interface parts by searching the whole document for a CSS class; the view tile hand-rolls an inline rename 250 lines above the shared component it also uses; and the property frame holds fourteen near-identical IPC wrappers and a seven-arm ternary router.

**Change.**

1. Fold the window tab strip onto the main tab bar with pins disabled and a last-tab-closes policy, or fold only the two tab models. *(M; after D-9; ~180 or ~60 lines)*
2. Give the shared warm-cache helper an optional capture guard; the four caches become one module with one entry type. *(M; ~50 lines)*
3. Make Personalization a zod schema whose inferred type replaces the interface; fold the window and tab decoders onto it. *(M; ~80 lines)*
4. Move the settings roster into its own data file; extract the sidebar's Disclosure component so it can be tested. *(S; ~1,000 lines relocated)*
5. Replace the five document-wide class queries with published rect getters on the pattern the content view already uses. *(S)*
6. The view tile heading uses the shared renamable label. *(S; ~75 lines)*
7. One generic save wrapper and a per-type map in the property frame, so an unhandled type is a compile error rather than a blank spacer. *(S; ~65 lines)*

**Findings:** R-59, R-60, R-61, R-62, R-63, R-64.

##### 10. Filing, Naming, Taxonomy, And Coverage Hygiene

**Lenses and state:** Polish, Filing, Duplication, Separation, Tests. **Effort:** Small each. **Deletes:** About 110 lines plus 20 renames.

**Found.** The declared taxonomy is accurate and the recent restructure was carried through, not abandoned. What's left: "parent path" implemented three times; the nexus-wide mutation contract filed under Pages while thirteen folders import it; test scaffolding in four homes, two of them production folders that ship fixtures in the renderer bundle; seven imports reaching out of Core by counting `../` instead of the package alias; naming canon broken four ways, one of which the restructure itself created; three parallel vocabularies for the entity taxonomy; two hand-rolled modal scrims with no shared primitive; the property panel restating a three-line context resolver; and the coverage numbers, recorded so nobody spends a week on them.

**Change.**

1. Add a rootless-safe `relDirname` to the paths module; retire the three parent-path copies; rename the three container finders to say what they match. *(S; ~8 lines)*
2. Move the mutation request contract from Pages to Nexus beside its handler. *(S)*
3. Consolidate test scaffolding in `Core/Testing`; move the two fixture builders out of the Views production tree. *(S; 27 lines out of production)*
4. Repoint seven relative cross-package imports to the package alias. *(S; 7 lines)*
5. One naming pass: ~20 renames and the duplicate test stem merge. *(S)*
6. Derive the three entity-kind unions from one, after settling the Agenda vocabulary. *(M; after D-9)*
7. One `ModalScrim` in UIX owning the portal, event swallowing, and dismissal; both modals adopt it. *(S; ~30 lines)*
8. The property panel imports the context resolver instead of restating it. *(S; ~6 lines)*
9. Add the Sync tsconfig to `npm run typecheck`; fold the Tiles README into SurfacePM; drop the 33 dead exports. *(S; ~40 lines)*

**Findings:** R-65, R-66, R-67, R-68, R-69, R-70, R-71, R-72.

##### 11. Remaining Wide Walks

**Lenses and state:** Debt, Performance, Scoped, awaiting rulings. **Effort:** Small to medium. **Deletes:** Nothing; work replaced.

**Found.** Three places still answer a narrow question with a wide walk, and they share one root. The connection title map is rebuilt wholesale on every real tree change, because the projection keyed off the tree isn't incremental even though the tree patches are; that "one walk per tree" contract in the tree index is also what the watcher's id resolution and the editor's per-scroll-frame cost run into. On the scroll path the expensive part is not resolution, which is a cheap map lookup, but re-tokenizing the viewport and sorting every decoration; a resolution cache would not help. Two further narrowings were attempted and correctly stopped because they turned out to be correctness calls: the folder classifier's existence check is true for a malformed sidecar where the parse returns nothing, and the three watch-batch consumers classify different tree states, which is the same mechanism as the watcher's three-way classification. All of this is scoped in `Planning/Corpus Walk Deferrals — Scope.md`, each item as what it is, the wide walk, and the decision it needs.

**Change.**

1. Rule the tree-index model: rebuild on identity change (today) or carry forward with deltas. This is the keystone; the watcher id resolution and the scroll-path cost both fold into whichever model is picked. *(—; Needs a ruling)*
2. Carry the tree index forward across patches and re-index only the changed node, or accept the rebuild and bound it; per the ruling above. *(M; Deferred)*
3. Resolve watcher page ids through the index's by-id map, in the shape the ruling above produces. *(S; Deferred)*
4. On the scroll path, avoid re-tokenizing and re-sorting when only the viewport moved; a resolution cache is off the table. *(M; Deferred)*
5. Rule whether a folder's agenda classification may carry existence separately from parse success, and whether the watch-batch consumers may share one classification; decide once, since the two are one mechanism. *(—; Needs a ruling)*

**Findings:** R-38, R-39, R-41.

#### Decisions Only Nathan Can Make

Ordered by how much later work each gates. D-1 (state placement), D-4 (Context tags), and D-5 (menus) were ruled on 09-07-2026 and are written into their topics above.

**D-2: What does "most recent wins" mean for a reader?** Options: **(i)** reload the page body silently when the tab is clean and prompt when it's dirty; **(ii)** always reload and rely on file history for recovery; **(iii)** leave it and accept that Pommora quietly overwrites external edits.

**Recommendation:** (i). The plumbing exists; this is a day of work plus a UI ruling on the dirty case.

**D-3: How does identity re-minting behave with a second writer?** The one-writer rule was not adopted as policy on 09-07-2026, so this narrows to re-minting alone. Options: **(i)** a synced, hand-editable conflict ledger under `.nexus/`; **(ii)** re-minting becomes a user-confirmed action rather than a silent open-time pass. Riding on it: whether the crash journals stay in the synced `.nexus/` directory.

**D-6: Four unbuilt view kinds, drop them or build the registry?** Options: **(i)** trim the union to the two that render; **(ii)** build a view-kind registry now and make an unimplemented kind explicitly blank per the placeholder rule. Today they're selectable and silently render as tables, which is the one option nobody chose.

**Recommendation:** (ii) if a third view kind is planned within the next few cycles, otherwise (i).

**D-7: Does the design kit get touch?** Options: **(i)** decide Mobile is a WebView host and add coarse-pointer branches now, before more hover-revealed controls are built; **(ii)** decide Mobile gets its own interaction layer and let UIX stay desktop-only. The cost of deferring is linear in how many hover affordances get built meanwhile.

**D-8: How long may a Pommora page be?** Not a fix, a measurement and then a ruling. Every whole-document editor derivation is linear in length with no incremental route and no recorded ceiling. Measure at 1k, 5k, and 20k lines, then either accept a stated ceiling or invest in a line-range-invalidating scan.

**D-9: Smaller rulings, each one edit once decided** 

- Which slot a page lands in when moved across bands (Table appends, Cards lands at the drop slot, neither documented as intentional).
- Whether an unreadable sidecar inside a bulk sweep is a skip or a stop.
- Whether the two property-pane drop resolvers' differing refusals are a rule or a coincidence.
- Which of the two widget unmount disciplines is correct.
- Whether the two tab models' three differences become parameters.
- Whether Showcase keeps a public surface in the design kit.
- Whether a folder's agenda classification may carry existence separately from parse success, and whether the three watch-batch consumers may share one classification.
- Whether File History stays per-device.

#### Creative Openings

- **Backlinks, a Context view, and Linked-From now have their query.** The content index carries Context membership as of 09-07-2026 and `queryMembers` answers "which pages hold Space X or Context C." All three pending features were waiting on exactly that; each is now a surface over an existing read.
- **The main window's inspector is a live empty pane, and the panel built for it already works.** The inspector opens, slides, resizes, remembers its width, and shows nothing, while the property panel is already mounted in the Page Window and the NavWindow. Wiring it behind a page selection is a handful of lines against machinery that exists.
- **Agenda is threaded through the whole navigation layer with no surface at the end of it.** Tasks and Events are first-class in the data model, admitted into navigation references, and refused at every use. The plumbing is ahead of the surface, which makes the surface the cheap part. The three-vocabulary question in topic 10 should be settled first.
- **A read-only mobile viewer is a bounded project against today's Core.** The interface a host implements is small and enumerated: 15 machine methods, 19 store methods across three optional stores that all degrade gracefully, 17 host-context members, 4 dialer members, about 60 lines of watcher wiring. The blockers aren't architectural; they're the state-placement plan, D-2, the menu rework, and touch.
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

| ID | Topic | Kind | Finding | Where |
| --- | --- | --- | --- | --- |
| R-01 | 1 | D | Page- and container-level authoring decisions live in the database that never syncs and is deleted on a schema bump | `Core/Platform/localState.ts, Desktop/Store/open.ts, Core/Views/Host/useViewHost.ts` |
| R-02 | 1 | Dt | `localStorage` is a fifth persistence backend with no host boundary, and the stated reason for it does not hold | `Core/Session/layoutSlice.ts, Core/Interface/Sidebar/disclosureState.ts, Core/Interface/App.tsx` |
| R-04 | 1 | D | Floating-window and side-pane geometry lives in module-scope maps that nothing persists | `UIX/Windows/window-base.tsx, UIX/Windows/window-panel.tsx` |
| R-05 | 1 | D | File History exists only on the machine that made the edit, and it is the sole record of an overwritten external change | `Core/Pages/fileHistory.ts, Desktop/Store/versionsDb.ts` |
| R-06 | 1 | FR | The heading-column toggle is keyed by table ordinal, so inserting a table above moves it | `Core/MarkdownPM/Tables/widget.tsx, Core/Pages/PageView.tsx` |
| R-07 | 2 | FR | An external edit never reaches an open page, and the next keystroke writes over it | `Core/Session/nexusSlice.ts, Core/Session/mutationSlice.ts, Core/Nexus/watchPatch.ts` |
| R-08 | 2 | FR | Atomicity and single-writer are host obligations that the interface neither declares nor enforces | `Core/Files/atomicWrite.ts, Core/Platform/machine.ts, Desktop/Platform/nodeMachine.ts` |
| R-09 | 2 | FR | Identity re-minting is adjudicated from non-syncing device state and from file birth time, then written into files that sync | `Core/Nexus/remint.ts, Core/Nexus/remintLedger.ts, Desktop/Store/open.ts` |
| R-11 | 2 | D | A governed write silently deletes a Context key whose Space it cannot find, and the on-open sweep refuses to do the same thing | `Core/Contexts/contextResolve.ts, Core/Properties/governedWrite.ts, Core/Properties/repairSweep.ts` |
| R-12 | 2 | Dt | One 26-line file decides which filesystem events are real, and nothing tests it | `Core/Files/writeEcho.ts, Desktop/FileWatch/watcher.ts` |
| R-13 | 3 | FR | The engine/renderer split is real, unnamed, and unguarded | `Core/Contract/serve.ts, Desktop/tsconfig.node.json, Desktop/main.ts` |
| R-14 | 3 | FR | The layering inverts under test — Core depends on Desktop | `Core/vitest.setup.ts, Core/package.json` |
| R-15 | 3 | Dt | Core's manifest declares a Node package it never imports and omits four it does | `Core/package.json, Core/MarkdownPM/codeHighlight.ts, Core/MarkdownPM/Engine/parser.ts` |
| R-16 | 3 | Dt | A fifth of the bridge answers off-envelope, and the host wraps every throw in an envelope anyway | `Core/Contract/bridge.ts, Desktop/Bridge/ipc.ts, Core/Interface/handlers.ts` |
| R-17 | 4 | FR | Two nexus-wide registries, opposite corruption policies — and the lenient one gates a rename cascade that half-lands | `Core/Properties/propertiesRegistry.ts, Core/Contexts/contextsRegistry.ts, Core/Files/atomicWrite.ts` |
| R-18 | 4 | D | Two registry machineries, two foreign-field strategies, one colliding name, and a reader that writes | `Core/Properties/propertiesRegistry.ts, Core/Contexts/contextsRegistry.ts` |
| R-19 | 4 | FR | Case folding and title collation read the host's language setting | `Core/Paths/exclusion.ts, Core/Connections/connections.ts, Core/Properties/properties.ts` |
| R-20 | 4 | Dt | One read-modify-write helper, four longhand copies, and one bypass that bumps every tile's timestamp | `Core/Files/atomicWrite.ts, Core/Trash/spend.ts, Core/Trash/restoreScrub.ts` |
| R-21 | 5 | FR | Every menu goes native; the in-renderer presenter is mounted, tested, and unreachable | `Core/Actions/nativeMenus.ts, Core/Session/chromeSlice.ts, Core/Interface/Menus/RowMenuHost.tsx` |
| R-22 | 5 | Dt | The tile handle menu is the one menu in the app defined twice | `Core/Tiles/TileHandleMenu.tsx, Core/Tiles/TileHost.tsx` |
| R-23 | 5 | D | A keyboard shortcut can live in any of four places, and two of them cannot see each other | `Desktop/Actions/appMenu.ts, Core/Actions/commands.ts, Core/Interface/App.tsx` |
| R-24 | 5 | Dt | Two dismissal disciplines: an ordered stack, and six layers coordinating by `defaultPrevented` | `UIX/Interactions/dismissalStack.ts, Core/Interface/Glance/GlancePane.tsx, UIX/Windows/window-base.tsx` |
| R-32 | 6 | Dt | Table and Cards write the same interaction layer twice | `Core/Views/Table/TableView.tsx, Core/Views/Cards/CardsView.tsx` |
| R-33 | 6 | Dt | Neither renderer virtualizes, and every card carries six store subscriptions and two mounted pickers | `Core/Views/Table/TableView.tsx, Core/Views/Cards/CardsView.tsx, UIX/Pickers/IconPicker.tsx` |
| R-34 | 6 | D | Six view kinds are registered, two render, and adding a third touches twelve places | `Core/Views/views.ts, Core/Views/Host/ViewHost.tsx, Core/Views/Settings/LayoutFrame.tsx` |
| R-35 | 6 | Dt | CardsView gets one mount assertion; TableView gets 1,330 lines of interaction tests | `Core/Views/Table/bandCommits.test.tsx, Core/Views/Table/cellGestures.test.tsx, Core/Views/Host/useViewHost.test.tsx` |
| R-36 | 6 | Dt | The Cards ghost reads every card's rect twice on every hover dwell, and re-flattens the group tree it was handed | `Core/Views/Cards/CardsView.tsx, Core/Views/Host/useViewHost.ts` |
| R-43 | 7 | Dt | The app's page-resolution contract lives inside the editor | `Core/MarkdownPM/Links/connectionsApi.ts, Core/Nexus/treeIndex.ts, Core/Tiles/tileKinds.tsx` |
| R-44 | 7 | FR | The editor reaches past its own host to open a web link | `Core/MarkdownPM/Links/linkClicks.ts, Core/Web/openWebLink.ts, Core/MarkdownPM/api.ts` |
| R-45 | 7 | Dt | The engine layer imports upward into the widget layer, and the rename cascade imports an editor internal | `Core/MarkdownPM/Engine/detect.ts, Core/MarkdownPM/Engine/subfieldStats.ts, Core/MarkdownPM/Embeds/webpageEmbed.ts` |
| R-46 | 7 | Dt | Links and connections never enter the intent stream, so a second renderer had to re-implement them | `Core/MarkdownPM/Engine/intents.ts, Core/MarkdownPM/decorations.ts, Core/MarkdownPM/Tables/cellStatic.tsx` |
| R-47 | 7 | Dt | The three widget kinds re-implement sizing, dismissal and selection independently | `Core/MarkdownPM/Embeds/embedWidget.tsx, Core/MarkdownPM/Tables/widget.tsx, Core/MarkdownPM/Tables/MarkdownTable.tsx` |
| R-48 | 7 | Dt | Six hand-rolled "which link token is at this offset" queries, two of which parse the whole document | `Core/MarkdownPM/Tables/cellStatic.tsx, Core/MarkdownPM/Input/format.ts` |
| R-49 | 7 | P | `detect.ts` carries a whole citation subsystem and a scoring heuristic | `Core/MarkdownPM/Engine/detect.ts, Core/MarkdownPM/Engine/subfieldStats.ts` |
| R-50 | 7 | D | Two unmount disciplines on one widget chassis, and one persistence contract under three names | `Core/MarkdownPM/Widgets/reactWidget.ts, Core/MarkdownPM/Embeds/embedWidget.tsx, Core/MarkdownPM/Tables/widget.tsx` |
| R-51 | 7 | D | Two implementations of "move this range to that slot," and no incremental path for the whole-document derivation | `Core/MarkdownPM/Engine/listDragModel.ts, Core/MarkdownPM/Engine/docScan.ts, Core/MarkdownPM/Engine/intents.ts` |
| R-52 | 8 | Dt | Two reorder engines behind one façade, the larger serving one screen | `UIX/Interactions/engine.tsx, UIX/Interactions/group.tsx, UIX/Interactions/drag.tsx` |
| R-53 | 8 | FR | The entire Lucide library ships in the `<Icon>` critical path, defeating the curated registry | `UIX/Symbols/index.tsx, UIX/Symbols/allSymbols.ts, UIX/Pickers/IconPicker.tsx` |
| R-54 | 8 | FR | Zero coarse-pointer awareness in a kit whose reveal affordances are all hover-gated | `UIX/Interactions/HoverRemove.tsx, UIX/Interactions/revealBar.ts, UIX/Interactions/OverScroll.tsx` |
| R-55 | 8 | Dt | The drawn caret is split across three packages, and the design kit styles CodeMirror | `UIX/Theme/nativeCaret.ts, UIX/Theme/caret.css, UIX/Theme/text-selection.css` |
| R-56 | 8 | Dt | Pommora's application vocabulary sits inside the design kit | `UIX/Interactions/frameDndModel.ts, Core/Views/hiddenFrameModel.ts, UIX/Interactions/revealBar.ts` |
| R-57 | 8 | P | Small UIX duplications: two spellings for one glass state, a hand-maintained token republish, a documented API that does not exist | `UIX/Pickers/picker-base.tsx, UIX/Glass/glass-window.tsx, UIX/Glass/glass-surface.tsx` |
| R-58 | 8 |  | The tile grid is a third drop treatment, and the tab bar hand-rolls the harness | `Core/Tiles/TileGrid.tsx, Core/Navigation/TabBar.tsx` |
| R-59 | 9 | D | Two tab models in two folders, with types crossing both ways | `Core/Navigation/tabsModel.ts, Core/Interface/Windows/windowTabs.ts, Core/Navigation/TabBar.tsx` |
| R-60 | 9 | Dt | Four warm caches, one shared helper, two adopters | `Core/Navigation/warmTabs.ts, Core/Interface/Windows/windowCache.ts, Core/Interface/Glance/GlancePane.tsx` |
| R-61 | 9 | Dt | A new user-facing setting needs three edits, and only two are checked by the compiler | `Core/Settings/personalization.ts, Core/Settings/codec.ts, Core/Settings/SettingsWindow.tsx` |
| R-62 | 9 | Dt | `Sidebar.tsx` and `SettingsWindow.tsx`: one is long, one is complex | `Core/Settings/SettingsWindow.tsx, Core/Interface/Sidebar/Sidebar.tsx` |
| R-63 | 9 | Dt | The shell reaches into the interface by global CSS-class selector | `Core/Navigation/useNavThumbnails.ts, Core/Interface/Windows/windowMorph.ts, Core/Interface/ContentView.tsx` |
| R-64 | 9 | Dt | `ViewTile` hand-rolls an inline rename 250 lines above the shared one it also uses | `Core/Tiles/Surfaces/ViewTile.tsx` |
| R-65 | 10 | P | Two definitions of "parent path," four helpers for two questions, three unrelated `findContainer`s | `Core/Nexus/treePatch.ts, Core/Nexus/treeIndex.ts, Core/Paths/posix.ts` |
| R-66 | 10 | Dt | The nexus-wide mutation contract is filed under Pages | `Core/Pages/mutateRequest.ts, Core/Nexus/mutate.ts` |
| R-67 | 10 | P | Test scaffolding lives in four homes, two of them production folders | `Core/Testing/testTree.ts, Core/MarkdownPM/editorHarness.ts, UIX/Interactions/pointerHarness.ts` |
| R-68 | 10 | P | Seven imports reach out of the Core package by relative path | `Core/MarkdownPM/Engine/docScan.ts, Core/MarkdownPM/warmSeam.ts, Core/Session/pageDetailCache.ts` |
| R-69 | 10 | P | Naming canon is broken four ways, one of them created by the filing pass itself | `listed in evidence` |
| R-70 | 10 | D | Three parallel vocabularies for one entity taxonomy | `Core/Nexus/identityMark.ts, Core/Paths/paths.ts, Core/Nexus/folderKind.ts` |
| R-71 | 10 | P | Two hand-rolled modal scrims with no shared primitive | `Core/Interface/Confirm/ConfirmationWindow.tsx, Core/Assets/ImagePicker.tsx` |
| R-72 | 10 | P | Coverage and dead-code measurements, recorded so they are not re-litigated | `` |
| R-38 | 11 | Dt | Three narrow questions still answered with wide reads | `Core/Views/loadValues.ts, Core/Nexus/folderKind.ts, Desktop/FileWatch/watcher.ts` |
| R-39 | 11 | Dt | The connection title map is rebuilt wholesale on every real tree change | `Core/Nexus/treeIndex.ts, Core/MarkdownPM/Links/connectionsApi.ts, Core/Nexus/liveTree.ts` |
| R-41 | 11 | Dt | Every scroll frame re-resolves every visible connection and re-sorts every decoration | `Core/MarkdownPM/decorations.ts` |

#### Appendix B: Corrections Made During Reconciliation

Nothing was denied outright by the reconciler. Four findings had a sub-claim denied and thirteen were downgraded; each is carried above in corrected form. The ones that matter:

- **TableView is not untested.** Two suites render the real view host, which renders TableView, so it has 1,330 lines of interaction tests. Cards, Sidebar, and SettingsWindow genuinely have none.
- **The lenient registry read doesn't strand Context references.** Context keys begin with `<`, which the property-name validator refuses, so the rename cascade never touches them. What it strands is link-valued property values.
- **Desktop is 2,027 lines, not 10,000.** The brief's initial count included build output.
- **Path-scoped churn is unmeasurable.** The top-level folders only exist since 09-05-2026, so any per-folder churn figure measures two days.
- **Context keys were already indexed.** The audit said Context keys were outside the content index; `page_values` already held them at key level. Membership at value level was what was missing, and it now exists.
- **Two findings fell to manual test or intent.** ⌘-click on a table title opens a new tab; Interface Scale and Webpage Zoom syncing is intended design.

#### Appendix C: Doc Drift Summary

Thirty-eight documentation corrections remain, of which the ones that hide a real finding are:

- **DesktopPM** describes the file lock as cross-process; it's in-process. This makes the single-writer problem look solved.
- **DesktopPM** and **CorePM** attribute the atomic write to a Core file that only forwards to the host. This makes the atomicity contract look declared.
- **DesktopPM** and **ConfigurationPM** disagree on where Use Native Menus and pane widths live. ConfigurationPM is right.
- **CorePM** and **ConfigurationPM** count persistence tiers as four, two, or three. There are five, and browser storage appears in none of them. The placement rule replaces all three descriptions.
- **SymbolsPM** says nothing arrives by wildcard. One static import does.
- **MarkdownPM** says links come from one intent stream. They don't, and the doc describes the design the code should reach.
- **ContextsPM** and **PagesPM** contradict each other on whether losing a tag re-dates a page. PagesPM is right.
- **Editor-Internals** says atomic ranges never rebuild; that is now true of both providers.
- **The project CLAUDE.md** cites `Surface` as the glass boundary (it's `GlassSurface`), says Node is called only from Desktop (true for production, not tests), and describes the Contract as the only host relationship (the host also runs the engine half directly, which is correct and should be stated).
- **CorePM** calls itself the map and covers 11 of 22 Core folders; `Core/Session` appears in no Features doc at all.

#### Appendix D: Method

Nine Opus auditors, dispatched in parallel with one shared brief. Six owned a directory slice and applied all eleven lenses: Foundations, Content Model, Views, Shell, MarkdownPM, UIX. Three were cross-cutting: Duplication and Asymmetry, Filing and Taxonomy, and Mechanical Sweeps. A tenth Opus agent merged the nine into 72 findings, re-opened every ranked claim against the code, and produced a corrections section so nothing disappeared silently. The eight findings most likely to land above the fold were independently traced before the first consolidation. The fixes that followed were each dispatched to one agent with the finding's file pointers and the full gate, and each diff was read before its finding was removed. Remaining process documents: `State Placement — Implementation Plan.md` (topic 1, ruled) and `Corpus Walk Deferrals — Scope.md` (topic 11).
