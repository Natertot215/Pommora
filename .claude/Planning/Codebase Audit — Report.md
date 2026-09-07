## Codebase Audit (09-07-2026)

Nine read-only auditors each covered a slice of the tree or a cross-cutting lens, a tenth merged their reports and re-checked every ranked claim against the code, and the result was spot-checked again before consolidation. Planning documents, the context document, history, handoff, and all code comments were excluded as evidence. Features docs were read only as statements of intent, and every place a doc and the code disagree is recorded as a finding with a ruling on which side is right.

**Tree audited:** 76,468 lines of non-test source across 688 files — Core 61,612, UIX 12,829, Desktop 2,027. Mobile and Sync are empty package shells. **Gates at audit time:** typecheck clean, lint clean, 339 test files and 4,121 tests passing.

#### The Verdict

**The codebase is workable and foundational.** This isn't a soft yes. The claims the project makes about itself were tested rather than assumed, and they hold:

- **The host boundary is real and machine-verified.** Core contains zero Node or Electron imports outside tests. The module graph the main process loads is 156 files, zero of them React, with three external dependencies. A second host is a bounded job, not a rewrite.
- **The read path is read-only.** No read channel writes.
- **Mechanical debt is near zero.** Dead exports are about 33 in 2,710. Zero raw colors across 44 Core style files. One dead CSS selector out of 631. Zero assertion-free tests. Textual duplication is 0.41% of tokens. Every declared folder exists under exactly its declared name, and there are zero orphan files.
- **The best code is in the places that matter most.** The view pipeline, the tile layout model, the navigation reference model, the pure editor engine, the pointer harness, the property value model, and the connections grammar were each independently called the strongest code in their slice. They should not be touched.

**What isn't foundational is a set of decisions, not a set of bugs.** Every one of them was the correct call for one machine, and none was taken with a second machine in view:

1. Where a given piece of state is written, and whether it travels.
2. Who wins when two writers meet, and whether an open page ever learns its file changed.
3. Whether a menu can be drawn without the operating system.

Those three are cheap now. They get more expensive with every feature built on top of them, because each new surface silently re-decides them.

**Is what already exists flawless? No.** Eight things were wrong on one machine with no sync involved at audit time (a ninth, the ⌘-click table item, was denied by manual test). The six small ones are fixed as of 09-07-2026; the property-restore overwrite and the heading-column toggle remain. Two are data-shaped: re-assigning a removed property overwrites whatever a page holds now, and the table heading-column toggle is keyed by table position, so inserting a table above moves it. Both are reproducible without a second device.

**Does continuing to build undermine the foundations?** Not the foundations themselves. The boundary holds by construction and won't erode from feature work. What erodes is the *cost of the undecided policies*: every new stateful feature picks its own storage home, every new hover control lengthens the touch backlog, every new menu is native-only, every new view kind is written a third time. Deferral has a linear price.

#### Where Brainwaves Go

Nathan's scarce resource is decisions; the implementation is Claude's. The honest split for the next cycle:

| Share | Category | What it actually is |
| --- | --- | --- |
| **The first sitting** | Decisions | Nine rulings, listed under Decisions below. Five of them gate everything else. This is the only part that genuinely needs Nathan's attention, and it's a single sitting, not a project. |
| **~20%** | Behind-the-wall fixes | The nine live bugs, the boundary guards, the four policy inconsistencies. Small, mechanical, unblocked today. |
| **~45%** | Decision-driven foundation work | Implementing whatever the five gating decisions resolve to: state homes, the reload path, the menu presenter, the boundary test. Plus the Table/Cards engine before a third view kind exists. |
| **~35%** | Building | Free to build, with a strong lean toward the creative openings that pay twice: the reverse index that closes three pending features *and* a performance finding in one stroke. |

**Sequenced, not interleaved.** Fixes first because they're cheap and independently verifiable. Decisions second because nothing in the foundation tier can start without them. Building third, and building on the openings that already have their plumbing done.

#### Grounding: What Actually Matters

Everything below is grouped by what happens if it's left alone.

**Matters for cross-device reliability.** A second host or a sync layer runs into these on day one:

- `Core/Platform` and `Core/Contract`: the whole second-host contract. Solid, with one envelope hole.
- `Core/Files`, `Core/Nexus`, `Core/Paths`, `Core/Index`: atomicity, the walk, identity re-minting, the rename cascade, and one locale-sensitive string fold.
- `Core/Contexts` and `Core/Properties`: title-keyed Context membership is the single largest structural commitment in the model. The value model beside it is excellent.
- `Core/Session` and `Core/Navigation`: identity-first references are exactly what sync needs. Session is also where the external-edit reload has to land, and it appears in no Features doc.
- `Core/Actions`: portable menu models. The half that already works for a second host.
- `Desktop/Platform`, `Desktop/Store`, `Desktop/Bridge`, `Desktop/FileWatch`: where every safety guarantee actually lives. Desktop is 2,027 lines, readable end to end in an afternoon, which is good news.
- `UIX/Interactions`, `UIX/Symbols`, `UIX/Theme`: one harness to keep, two engines to fold, no touch awareness, an icon barrel in the critical path.
- `Core/MarkdownPM/Engine` and `Core/MarkdownPM/Links`: the pure engine is the asset that ports. Links holds a contract that belongs in Connections.

**Matters for the product.** Shapes what the app can do; can be reworked freely with no cross-device consequence:

- `Core/Views/Pipeline`: finished work. `Core/Views/Table` and `Core/Views/Cards`: two prototypes past 1,300 lines each, a rework target, not a risk.
- `Core/Tiles`: the layout model is sync-ready; the surfaces have one hotspot.
- `Core/Interface`, `Core/Settings`, `Core/Pages`, `Core/Assets`, `Core/Trash`, `Core/Web`: ordinary accumulation, no findings above hygiene except an empty inspector waiting for its panel.

**Cosmetic.** Naming canon and filing hygiene only:

- `UIX/Glass`, `UIX/Menus`, `UIX/Pickers`, `UIX/Cards`, `UIX/Fields`, `UIX/Labels`, `UIX/Controls`, `UIX/Elements`, `UIX/Animations`, `UIX/Windows`, `UIX/Table`, `UIX/Utilities`: one of each, adopted, no divergence.
- `Showcase`: out of scope by standing rule.

#### Topics, In Priority Order

Twelve lines of effort, ranked by foundation risk first, then live bugs, then debt that compounds, then hygiene. Each carries the lenses it spans, whether it gates Mobile or Sync, and what would be deleted if it were done. Finding IDs point into the ledger in the appendix.

##### 1. Where Persisted State Lives

**Lenses:** Foundation risk, Decision, Filing, Asymmetry, Duplication. **Gates Mobile/Sync:** Yes, entirely. **Effort:** Medium to large. **Deletes:** about 90 lines and 8 storage scopes once the rule lands.

Pommora writes state to five different places: the user's Markdown and JSON files under `.nexus/` (which travel with the nexus), the `nexus.db` database (which by design never travels and is deleted outright on a schema bump), the app-level `pommora.json`, the browser's own storage, and, for floating-window geometry, plain in-memory maps that die on reload. Which place a thing goes to was decided one piece at a time, and several landed wrong.

Eight of the sixteen things in the never-travels database are decisions a person made about a page or a collection, not facts about a machine: a page's alternate link names, the hand-sorted order of a board, which saved view a container opens on, how tall each embedded tile was dragged. On a second device every one of those is empty. Dragging a row writes to two different homes depending on whether the view happens to be sorted, so the same gesture sometimes syncs and sometimes doesn't. And pane widths bypass the host entirely into browser storage, for a stated reason the call site refutes. **Findings:** R-01, R-02, R-04, R-05, R-06. R-03 was withdrawn by ruling: Interface Scale and Webpage Zoom syncing is intended design.

##### 2. The Concurrency Model Is Single-Process

**Lenses:** Foundation risk, Decision, Asymmetry, Separation, Under-adoption, Tests. **Gates Mobile/Sync:** Yes, entirely. **Effort:** Large. **Deletes:** about 400 lines if Context tags move to ids; otherwise nothing, this topic is additive.

Every story in the codebase about two things writing at once is a story about one process on one machine, and it's told well: careful locks, a snapshot before every overwrite, an incremental walk, and the app quits a second instance to keep the reasoning honest. None of it survives a sync daemon or a second host, because the lock is a map in memory, the all-or-nothing write guarantee lives in one npm package the interface never declares it needs, and the "which duplicate is the original" judge reads a database that doesn't travel and then rewrites the loser's ID into a file that does.

The most reachable piece: **when a file changes outside Pommora, the open page never finds out.** The tree updates, the search index updates, and the editor keeps showing the old text. The next keystroke writes that old text back over the file. The overwritten version is snapshotted, but into a store that never leaves the machine. "Most recent wins" is currently implemented as *the most recent write to disk wins*, not *the most recent version reaches the reader*. The plumbing to fix it already exists as three calls; the missing part is one push channel and a policy for dirty tabs.

Two smaller items ride here because they're the same shape: re-assigning a removed property writes the cached value back without checking whether the page has since acquired one (a three-line fix), and Context membership being keyed by *title* means a governed write silently drops a tag whose Space can't be found, while the on-open repair sweep, using the same reconcile, refuses to do the same thing. The codebase already disagrees with itself about whether that's repair or loss. **Findings:** R-07 through R-12.

##### 3. The Engine/Renderer Boundary Inside Core

**Lenses:** Foundation risk, Separation, Filing, Tests. **Gates Mobile/Sync:** Yes, these are the guards. **Effort:** Small. **Deletes:** a dead interface method, two manifest lines, ~20 lines of handler self-catching, and 18 Desktop imports out of Core's tests.

Core is really two programs sharing one folder tree: a host-side engine of about 156 files and a renderer of about 536, overlapping in about 52. The split is real and clean. Nothing declares it, nothing checks it, the main-process typecheck would accept a DOM-touching engine file, and Core's own test suite inverts the layering by installing Desktop's machine implementation. So the portability that makes a second host a bounded project is accidental, and it will erode silently. The guard is one Vitest file that walks the import graph, an in-memory machine in `Core/Testing`, and four manifest lines: Core declares a Node filesystem package it never imports and omits four editor packages it does. This is the cheapest topic in the report and the one that makes topics 1 and 2 safe to work on. **Findings:** R-13 through R-16.

##### 4. Registry Read Policy And Locale-Dependent Keys

**Lenses:** Asymmetry, Duplication, Foundation risk, Decision. **Gates Mobile/Sync:** Yes, and cheap. **Effort:** Small to medium. **Deletes:** about 60 lines.

Four small policy inconsistencies in the write path. Two functions with the same name read the two nexus-wide registry files with opposite ideas of what an unreadable file means, and the lenient one hands back "no properties" for a file that's momentarily mid-sync, after which a rename half-lands and page creation skips the collection's schema. Three functions fold a user-visible name into a comparison key three different ways, one of them using the machine's language setting, so the same nexus matches different folders on a Turkish laptop. Seven sorts read the host locale, including the one that decides a folder's order when nothing explicit is saved. And one read-modify-write helper exists with four longhand copies that each re-decide what a failed read means. The codebase already knows this hazard class and handles it correctly for dates; the discipline just wasn't carried to strings. **Findings:** R-17 through R-20.

##### 5. Menus And Shortcuts Have Two Homes

**Lenses:** Duplication, Under-adoption, Foundation risk, Asymmetry, Decision, Tests. **Gates Mobile/Sync:** Yes, Mobile has no menus otherwise. **Effort:** Medium. **Deletes:** either ~150 lines plus 126 test lines (native-only), or ~200 lines of a hand-built menu pane (revive), depending on the decision.

Every right-click menu is drawn by the operating system. The models behind them are portable and well-factored: one action tree per menu, built in Core, with the Electron template derived from it. But there's exactly one renderer. An in-app renderer for the same models was built, is still mounted in the running app, still has tests, and nothing can reach it. The preference switch that sounds like it governs this doesn't. The one menu that needed the in-app path (the tile handle menu) is written twice in one file because it had nowhere else to go. Separately, a keyboard shortcut can live in any of four places, two of which can't see each other, while the correct pattern already exists and works for formatting chords. **Findings:** R-21 through R-24.

##### 6. Small Live Bugs

**Lenses:** Asymmetry, Duplication, Under-adoption. **Gates Mobile/Sync:** No. **Effort:** Small each. **Deletes:** about 60 lines total.

Six things that were wrong on one machine, each an afternoon. All six are fixed as of 09-07-2026; the ⌘-click item originally listed here was denied by manual test. Kept for the record:

- The Automations and Shortcuts settings pages printed "Nothing to set here yet," the one thing the placeholder rule forbids. Fixed 09-07-2026.
- Two asset-name resolvers disagree about ambiguity, so a banner renders but can't be reframed.
- The Markdown table's cell sweep hand-rolls pointer listeners four lines below importing the shared harness, and leaks on cancel.
- Two personalization keys can't round-trip to unset.
- One dead CSS rule targeting a misspelled CodeMirror class.
- A column-widen animation drops under StrictMode (development only, recorded so it isn't triaged as shipping).

**Findings:** R-26 through R-31. R-25 was withdrawn by manual test.

##### 7. The Table/Cards View Engine

**Lenses:** Duplication, Asymmetry, Debt hotspot, Performance, Separation, Tests, Decision. **Gates Mobile/Sync:** No, but it doubles every future view's cost. **Effort:** Large. **Deletes:** about 230 lines of duplicated interaction layer, 40 lines of view-kind lists, and two mounted pickers per card.

The data half of views is finished, excellent, and shouldn't be touched: one filter, one sorter, one grouper, one pure pipeline, one real host that owns every writer. The renderer half is two prototypes that both grew past 1,300 lines and write the same interaction layer twice: band drops, relocation, reorder, page opening, hover glance, menu dispatch, the ghost lifecycle. They aren't copy-paste duplicates, which is exactly why they drift; each pair is the same idea with one policy detail changed, which is the shape that drifts. Neither renderer virtualizes. Cards mounts two closed picker components and six store subscriptions per card, where Table already does it correctly with one picker at the root. Cards has one smoke assertion against Table's 1,330 lines of interaction tests. And six view kinds are registered, two render, and the other four silently render as tables, because there's no registry, only "is it cards, else table" across twelve places. **Findings:** R-32 through R-36.

##### 8. Full-Corpus Walks And Per-Trigger Rebuilds

**Lenses:** Performance, Asymmetry, Duplication. **Gates Mobile/Sync:** Indirectly; a synced nexus churns more. **Effort:** Small to medium. **Deletes:** about 50 lines net; mostly work replaced rather than removed.

The "never on every X" rule is mostly honored. Six places escaped it, each answering a narrow question with a wide walk when the narrow answer sits two lines away: Context cascades sweep the whole nexus while property cascades ask the index; one channel returns every saved view's order to use one entry; the connection title map is rebuilt wholesale on every real tree change; one editor provider rebuilds a whole-document range set on every arrow key; every scroll frame re-resolves every visible connection; and the tab set re-serializes and writes on every activation while every other writer debounces. None is a crisis on a small nexus. All grow in proportion to nexus size and sync churn. The Context cascade fix is the same index extension three pending features are waiting on. **Findings:** R-37 through R-42.

##### 9. MarkdownPM Filing And The Widget Layer

**Lenses:** Filing, Separation, Foundation risk, Under-adoption, Duplication, Performance, Decision. **Gates Mobile/Sync:** Partly. **Effort:** Small to large. **Deletes:** about 300 lines, plus 300 relocated.

The most carefully built directory in the codebase. The pure engine is settled and would survive a second host intact. Two things are unfinished. First, filing: the app's page-resolution contract, what a page *is* when something links to it, is written inside the editor's folder and imported by the nexus index; the engine imports upward into the widget layer in two files; and the editor reaches past its own host object to open a web link, the single exception to an otherwise complete injection boundary. Second, the React widget layer (tables, page tiles, webpage tiles) grew three independent answers to sizing, dismissal, and selection, and the link surfaces grew six independent answers to "what link is at this offset," two of which tokenize the entire document on ⌘B. Links and connections also never enter the intent stream, so the resting table cell had to re-implement their rendering by hand. The right order is one small filing pass, one small correctness pass, then a deliberate widget consolidation before more table or embed features land. **Findings:** R-43 through R-51.

##### 10. UIX: Engines, Bundle, Touch, Filing

**Lenses:** Asymmetry, Duplication, Foundation risk, Performance, Under-adoption, Separation, Filing, Decision, Tests. **Gates Mobile/Sync:** Yes for the icon barrel and touch. **Effort:** Small to large. **Deletes:** about 450 lines of the second reorder engine, the whole Lucide set from every non-picker bundle, 60 lines of small duplications, 490 relocated.

The strongest-built part of the codebase, and the numbers aren't soft: one pointer harness every drag surface funnels through, one picker base, one menu vocabulary, zero raw colors, a hard import boundary that holds. Three things would resist a second host. The entire Lucide icon library sits in the critical path of every icon because a fallback resolver is imported statically, defeating the curated registry by construction; the fix is one dynamic import. Nothing in the kit ever asks what kind of pointer is driving it, in a kit whose reveal affordances are all hover-gated, so on a touch device a class of controls is simply absent. And reordering by dragging is implemented twice behind one façade, the larger version serving exactly one screen, carrying no keyboard support, and having no tests. Alongside: the design kit carries Pommora's application vocabulary in four files (the property-assignment drop model, the on-disk color names), and the drawn caret is split across three packages with UIX styling CodeMirror's classes directly. **Findings:** R-52 through R-58.

##### 11. Shell Debt

**Lenses:** Duplication, Separation, Filing, Decision, Debt hotspot, Under-adoption, Tests. **Gates Mobile/Sync:** No. **Effort:** Small to medium. **Deletes:** about 180 lines of a second tab model, 80 of a hand-written decoder, 50 of a fourth warm cache, 75 of a hand-rolled rename.

The navigation and session core is better than its size suggests and shouldn't be touched. On top of it sits ordinary accumulation: "a tab" is defined twice in two folders with types crossing both ways; four "remember this editor's state" caches where one helper exists and two use it; a new user-facing setting needs three edits and only two are compiler-checked; `Sidebar.tsx` and `SettingsWindow.tsx` are both ~930 lines, one of which is a data table and the other of which buries a genuinely intricate 218-line component that can't be tested from anywhere; five places find interface parts by searching the whole document for a CSS class; and the view tile hand-rolls an inline rename 250 lines above the shared component it also uses. **Findings:** R-59 through R-64.

##### 12. Filing, Naming, Taxonomy, And Coverage Hygiene

**Lenses:** Filing, Duplication, Separation, Asymmetry, Tests. **Gates Mobile/Sync:** No. **Effort:** Small each. **Deletes:** about 110 lines plus 20 renames.

The declared taxonomy is accurate and the recent restructure was carried through, not abandoned. What's left: "parent path" implemented three times; the nexus-wide mutation contract filed under Pages while thirteen folders import it; test scaffolding in four homes, two of them production folders that ship fixtures in the renderer bundle; seven imports reaching out of Core by counting `../` instead of the package alias; naming canon broken four ways, one of which the restructure itself created; three parallel vocabularies for the entity taxonomy; two hand-rolled modal scrims with no shared primitive; and the coverage numbers, recorded so nobody spends a week on them. **Findings:** R-65 through R-72.

#### Decisions Only Nathan Can Make

Ordered by how much later work each gates. Each is a choice the code is currently straddling. The recommendation is stated where the audit supports one.

**D-1: Which class does a piece of state belong to?** The single highest-leverage decision, because every other state question resolves from it. Options: (i) write one rule, content and user intent go to `.nexus/` files, per-machine chrome goes to `nexus.db` through the Platform layer, nothing goes to browser storage, and move the misfiled pieces to match; (ii) keep current placements and accept that a second device starts with no aliases, no manual order, no active view, and no embed sizing; (iii) make `nexus.db` survive schema bumps, which fixes half the problem on one device and none of the cross-device half. **Recommendation:** (i). It's the only option that survives Mobile, and it also satisfies Reasonable Legibility, since none of the misfiled state is visible on disk today.

**D-2: What does "most recent wins" mean for a reader?** Options: (i) reload the page body silently when the tab is clean and prompt when it's dirty; (ii) always reload and rely on file history for recovery; (iii) leave it and accept that Pommora quietly overwrites external edits. **Recommendation:** (i). The plumbing exists; this is a day of work plus a UI ruling on the dirty case.

**D-3: Does Pommora accept more than one writer per nexus?** *Ruled 09-07-2026: a one-writer rule is not adopted as policy, since a future shared nexus may want something else; the atomicity contract still gets declared; the cross-process story stays open until Sync is designed.* Options: (i) one nexus, one writer, stated as a rule: keep the in-process lock, declare the atomicity contract on the machine interface with a conformance test any host must pass, and make the sync layer's job "never write while the app has it open"; (ii) an on-disk lock file and a real cross-process protocol, which is what a background sync daemon actually needs. Riding on this: whether the crash journals stay in the synced `.nexus/` directory, and whether identity re-minting moves to a synced, hand-editable conflict ledger. **Recommendation:** (i) now, as the stated contract, with (ii) reconsidered when Sync is designed. Declaring the contract is cheap and makes the current state honest.

**D-4: Are Context tags keyed by title or by id?** *Ruled 09-07-2026: titles. Ids in frontmatter would violate Reasonable Legibility; only the five-line reconcile fix lands.* Options: (i) move to Space ids with titles as display-only: deletes about 400 lines, makes a rename a registry edit plus a folder rename with no page rewriting at all, removes the cross-device loss path, and closes the full-nexus cascade sweep in the same stroke; (ii) keep titles and make the two reconcile consumers agree about deletion, about five lines. **Recommendation:** (i). It's the biggest single simplification available anywhere in the audit. The cost is a legibility tradeoff: a page's frontmatter would carry a Space id rather than its title. That tradeoff should be weighed against the Locked Decisions before committing.

**D-5: Does a menu have to be drawn by the operating system?** *Ruled 09-07-2026: the right-click menu system is reworked as one coherent system; `popRowMenu` is the single door, honors the preference, both renderers draw from one model, and the tile handle menu becomes an ordinary consumer.* Options: (i) revive the in-renderer presenter and let the preference switch genuinely choose; costs nothing to delete, unblocks Mobile, and makes the twice-written tile menu free; (ii) commit to native-only and delete about 150 lines plus tests, accepting that a second host writes a menu layer from scratch. **Recommendation:** (i). There's no third option where the current state is fine, because the current state is a dead second implementation rotting unexercised.

**D-6: Four unbuilt view kinds, drop them or build the registry?** Options: (i) trim the union to the two that render; (ii) build a view-kind registry now and make an unimplemented kind explicitly blank per the placeholder rule. Today they're selectable and silently render as tables, which is the one option nobody chose. **Recommendation:** (ii) if a third view kind is planned within the next few cycles, otherwise (i).

**D-7: Does the design kit get touch?** Options: (i) decide Mobile is a WebView host and add coarse-pointer branches now, before more hover-revealed controls are built; (ii) decide Mobile gets its own interaction layer and let UIX stay desktop-only. The cost of deferring is linear in how many hover affordances get built meanwhile.

**D-8: How long may a Pommora page be?** Not a fix, a measurement and then a ruling. Every whole-document editor derivation is linear in length with no incremental route and no recorded ceiling. Measure at 1k, 5k, and 20k lines, then either accept a stated ceiling or invest in a line-range-invalidating scan.

**D-9: Smaller rulings, each one edit once decided.** Which slot a page lands in when moved across bands (Table appends, Cards lands at the drop slot, neither documented as intentional). Whether an unreadable sidecar inside a bulk sweep is a skip or a stop. Whether the two property-pane drop resolvers' differing refusals are a rule or a coincidence. Which of the two widget unmount disciplines is correct. Whether the two tab models' three differences become parameters. Whether session-only floating-window geometry is intentional. Whether Showcase keeps a public surface in the design kit.

#### Creative Openings

Places where the code is visibly reaching toward something and the remaining work is the cheap part.

- **The reverse query three features are waiting on.** Backlinks, a Context view, and Linked-From each need the content index to answer "which entities mention X." It already records mentions for the rename cascade. Extending it to Context keys also fixes the full-nexus Context cascade sweep. The single best return-on-effort item in the audit.
- **The main window's inspector is a live empty pane, and the panel built for it already works.** The inspector opens, slides, resizes, remembers its width, and shows nothing, while the property panel is already mounted in the Page Window and the NavWindow. Wiring it behind a page selection is a handful of lines against machinery that exists.
- **Agenda is threaded through the whole navigation layer with no surface at the end of it.** Tasks and Events are first-class in the data model, admitted into navigation references, and refused at every use. The plumbing is ahead of the surface, which makes the surface the cheap part. The three-vocabulary question in topic 12 should be settled first.
- **A read-only mobile viewer is a bounded project against today's Core.** The interface a host implements is small and enumerated: 15 machine methods, 19 store methods across three optional stores that all degrade gracefully, 17 host-context members, 4 dialer members, about 60 lines of watcher wiring. The blockers aren't architectural; they're D-1, D-2, D-3, D-5, and touch.
- **Async drop rejection.** The drag doc describes it, a `pending` state exists in the union, nothing sets it, and the Cards view's refusal path already resolves in the place it would go.

#### Solid, Leave Alone

The parts several auditors independently called the strongest, recorded so nobody "improves" them:

- **`Core/Views/Pipeline`:** one pure compose of columns, filter, group, sort; a three-valued filter that's correct at every depth; comparators built once. A view embed and a full page run it verbatim.
- **`Core/Tiles/Layout`:** a pure split-tree model with an invariant checker, no DOM anywhere, five test files. Sync-ready as written.
- **`Core/Navigation`'s reference model:** everything durable is a bare kind-plus-id; every title, icon, and path re-derives at use time; unresolvable rows are render-pruned, never storage-pruned; the reconcilers are reference-preserving so an echo push writes nothing. Exactly the shape a sync layer needs.
- **`Core/MarkdownPM/Engine`:** pure functions over strings, no DOM, no React, no CodeMirror. The asset that ports.
- **`Core/Properties`' value model and journal slot:** definition-first decode, one refusal for every writer, one blank-means-delete, one slot factory serving both journals.
- **`Core/Connections`:** one grammar, one rewriter, one scanner, no duplication found at all.
- **`UIX/Interactions/gesture.ts`:** one live gesture with every failure path routed to the same teardown. Every drag surface in both packages funnels through it.
- **Token discipline:** every literal color in the tree lives in one file; every duration goes through one motion module.
- **Single-process concurrency:** the epoch/slot single-flight, the root pin during patch, the re-check after every await, the re-entrant lock refusal, the debounced save scheduler awaited before a nexus flip. This is the work of someone who was bitten and fixed it.

#### Rulings Log

**09-07-2026, first pass.** Rulings Nathan made on the audit's action lists before any further work. Withdrawn: R-03 (Interface Scale and Webpage Zoom syncing is intended design) and R-25 (⌘-click on a table title opens a new tab; verified by hand). Ruled: floating-window and side-pane geometry persist per machine in `nexus.db` and do not sync (R-04); Context tags stay title-keyed and only the reconcile fix lands (D-4); the one-writer rule is not adopted as policy (D-3); the right-click menu system is reworked as one coherent system with `popRowMenu` as the single door (D-5). Approved: the in-memory test machine, the envelope on the nine unguarded channels, deleting `writeRaw`, the dismissal-stack fold, and the property-restore guard. Held pending explanation: routing pane widths and sidebar disclosure through the device-preferences store (R-02), and the single shortcut table (R-23). Fixed the same day: R-26, R-27, R-28, R-29, R-30, R-31, and topic 8's index extension (R-37; one correction to the audit, Context keys were already indexed at key level and membership at value level was what was missing), and four of its narrowings (R-38 (c), R-40, R-42, the Grouping pane memo). Deferred as design calls: R-38 (d), the folder classifier's existence check is true for a malformed sidecar where the parse returns nothing, so carrying the parsed map alone would misclassify a broken config; and R-38 (e), the three watch-batch consumers classify different tree states, so one shared classification changes the refresh outcome. 8.3, 8.6, and 8.8 stay deferred. The process is in `Index Extension — Process.md`. Also withdrawn from the creative openings: the page outline is surfaced as a dropdown already.

#### Appendix A: Finding Ledger

Every reconciled finding, its status after verification, and where it lands. Kind: **FR** foundation risk, **D** decision, **Dt** debt, **P** polish. Status: **C** confirmed, **Dn** downgraded.

| ID | Topic | Kind | Status | Finding | Where |
| --- | --- | --- | --- | --- | --- |
| R-01 | 1 | D | C | Page and container authoring decisions live in the database that never syncs and is deleted on a schema bump | `Core/Platform/localState.ts`, `Desktop/Store/open.ts`, `Core/Views/Host/useViewOrders.ts` |
| R-02 | 1 | Dt | C | Browser storage is a fifth persistence backend with no host boundary; the stated per-frame-IPC reason doesn't hold | `Core/Session/layoutSlice.ts`, `Core/Interface/Sidebar/disclosureState.ts` |
| R-04 | 1 | D | C | Floating-window and side-pane geometry live in module-scope maps nothing persists | `UIX/Windows/window-base.tsx`, `UIX/Windows/window-panel.tsx` |
| R-05 | 1 | D | C | File History exists only on the machine that made the edit, and is the sole record of an overwritten external change | `Core/Pages/fileHistory.ts`, `Desktop/Store/versionsDb.ts` |
| R-06 | 1 | FR | C | The heading-column toggle is keyed by table ordinal, so inserting a table above moves it | `Core/MarkdownPM/Tables/widget.ts` |
| R-07 | 2 | FR | C | An external edit never reaches an open page; the next keystroke writes over it | `Core/Session/nexusSlice.ts`, `Core/Nexus/watchPatch.ts`, `Core/Pages/PageView.tsx` |
| R-08 | 2 | FR | C | Atomicity and single-writer are host obligations the interface neither declares nor enforces | `Core/Files/atomicWrite.ts`, `Core/Platform/machine.ts`, `Desktop/Platform/fileLock.ts` |
| R-09 | 2 | FR | C | Identity re-minting is judged from non-syncing device state and file birth time, then written into files that sync | `Core/Nexus/remint.ts`, `Core/Nexus/remintLedger.ts` |
| R-10 | 2 | FR | C | Re-assigning a removed property overwrites whatever the page holds now | `Core/Properties/removeProperty.ts`, `Core/Nexus/page.ts` |
| R-11 | 2 | D | C | A governed write drops a Context key whose Space it can't find; the on-open sweep refuses to | `Core/Contexts/contextResolve.ts`, `Core/Properties/repairSweep.ts` |
| R-12 | 2 | Dt | C | One 26-line file decides which filesystem events are real, and nothing tests it | `Core/Files/writeEcho.ts` |
| R-13 | 3 | FR | C | The engine/renderer split is real, unnamed, and unguarded | `Core/Contract/serve.ts`, `Desktop/tsconfig.node.json` |
| R-14 | 3 | FR | C | The layering inverts under test: Core depends on Desktop | `Core/vitest.setup.ts`, 17 test files |
| R-15 | 3 | Dt | C | Core's manifest declares a Node package it never imports and omits four it does | `Core/package.json`, `Core/MarkdownPM/codeHighlight.ts` |
| R-16 | 3 | Dt | Dn | About a fifth of the bridge answers off-envelope; nine channels are genuinely unguarded (two cited examples denied) | `Core/Contract/bridge.ts`, `Desktop/Bridge/ipc.ts` |
| R-17 | 4 | FR | Dn | Two registries, opposite corruption policies; the lenient one half-lands a rename (casualty corrected to link-valued property values) | `Core/Properties/propertiesRegistry.ts`, `Core/Contexts/contextsRegistry.ts` |
| R-18 | 4 | D | C | Two registry machineries, two foreign-field strategies, one colliding name, one reader that writes | same two files |
| R-19 | 4 | FR | C | Case folding and title collation read the host's language setting | `Core/Paths/exclusion.ts`, `Core/Connections/connections.ts`, `Core/Nexus/order.ts` |
| R-20 | 4 | Dt | C | One read-modify-write helper, four longhand copies, one bypass that bumps every tile's timestamp | `Core/Files/atomicWrite.ts`, `Core/Tiles/tilesFile.ts` |
| R-21 | 5 | FR | C | Every menu goes native; the in-renderer presenter is mounted, tested, and unreachable | `Core/Actions/nativeMenus.ts`, `Core/Interface/Menus/RowMenuHost.tsx` |
| R-22 | 5 | Dt | C | The tile handle menu is the one menu defined twice | `Core/Tiles/TileHandleMenu.tsx` |
| R-23 | 5 | D | C | A keyboard shortcut can live in any of four places, two of which can't see each other | `Desktop/Actions/appMenu.ts`, `Core/Actions/commands.ts`, `Core/Interface/App.tsx` |
| R-24 | 5 | Dt | C | Two dismissal disciplines: an ordered stack, and six layers coordinating by `defaultPrevented` | `UIX/Interactions/dismissalStack.ts` and six bypasses |
| R-26 | 6 | P | fixed 09-07 | Two asset-name resolvers disagree about ambiguity | `Core/Assets/assetUrl.ts`, `Core/Assets/assetMap.ts` |
| R-27 | 6 | Dt | fixed 09-07 | The Markdown table's cell sweep is hand-rolled and leaks on cancel | `Core/MarkdownPM/Tables/MarkdownTable.tsx` |
| R-28 | 6 | P | C | Empty settings frames announced that they were empty (doc is right; fixed 09-07-2026) | `Core/Settings/SettingsWindow.tsx` |
| R-29 | 6 | P | fixed 09-07 | Two personalization keys can't round-trip to unset | `Core/Settings/codec.ts` |
| R-30 | 6 | P | fixed 09-07 | One dead CSS rule, a misspelled CodeMirror class | `Core/MarkdownPM/markdown-pm.css` |
| R-31 | 6 | P | fixed 09-07 | Column-widen diff writes a ref during render (development-only under StrictMode) | `Core/Views/Table/TableView.tsx` |
| R-32 | 7 | Dt | C | Table and Cards write the same interaction layer twice (semantic, not textual, duplication) | `Core/Views/Table/TableView.tsx`, `Core/Views/Cards/CardsView.tsx` |
| R-33 | 7 | Dt | C | Neither renderer virtualizes; every card carries six subscriptions and two mounted pickers | `Core/Views/Cards/CardsView.tsx`, `UIX/Pickers/IconPicker.tsx` |
| R-34 | 7 | D | C | Six view kinds registered, two render, adding a third touches twelve places | `Core/Views/views.ts`, `Core/Views/Settings/LayoutFrame.tsx` |
| R-35 | 7 | Dt | Dn | Cards gets one smoke assertion; Table gets 1,330 lines of tests (claim that Table is untested denied) | `Core/Views/Host/useViewHost.test.tsx` |
| R-36 | 7 | Dt | C | The Cards ghost reads every card's rect twice per hover dwell and re-flattens the group tree | `Core/Views/Cards/CardsView.tsx` |
| R-37 | 8 | Dt | fixed 09-07 | Context cascades sweep the whole nexus; property cascades ask the index | `Core/Contexts/contextCascade.ts` |
| R-38 | 8 | Dt | (c) fixed 09-07; (d) (e) deferred | Five narrow questions answered with wide reads (one remedy corrected: narrow with the index, confirm from disk) | `Core/Views/loadValues.ts`, `Core/Properties/keyHolders.ts`, `Core/Nexus/folderKind.ts` |
| R-39 | 8 | Dt | C | The connection title map is rebuilt wholesale on every real tree change | `Core/Nexus/treeIndex.ts` |
| R-40 | 8 | Dt | fixed 09-07 | One atomic-range provider rebuilds a whole-document set on every caret motion (parse is cached; the walk isn't) | `Core/MarkdownPM/Guards/calloutAtomic.ts` |
| R-41 | 8 | Dt | C | Every scroll frame re-resolves every visible connection and re-sorts every decoration | `Core/MarkdownPM/decorations.ts` |
| R-42 | 8 | Dt | fixed 09-07 | The tab and window sets re-serialize and write on every activation | `Core/Session/navigationSlice.ts` |
| R-43 | 9 | Dt | Dn | The page-resolution contract lives inside the editor (runtime edge is one module, not eight) | `Core/MarkdownPM/Links/connectionsApi.ts` |
| R-44 | 9 | FR | C | The editor reaches past its own host to open a web link | `Core/MarkdownPM/Links/linkClicks.ts` |
| R-45 | 9 | Dt | C | The engine imports upward into the widget layer; the rename cascade imports an editor internal | `Core/MarkdownPM/Engine/detect.ts`, `Core/Connections/rewrite.ts` |
| R-46 | 9 | Dt | C | Links never enter the intent stream, so the table cell re-implements them (doc describes the right design) | `Core/MarkdownPM/Engine/intents.ts`, `Core/MarkdownPM/Tables/cellStatic.tsx` |
| R-47 | 9 | Dt | Dn | Three widget kinds re-implement sizing, dismissal, and selection (churn justification dropped; duplication stands) | `Core/MarkdownPM/Embeds/embedWidget.tsx`, `Core/MarkdownPM/Tables/` |
| R-48 | 9 | Dt | C | Six "which link token is at this offset" queries, two of which parse the whole document | `Core/MarkdownPM/Input/format.ts` and five others |
| R-49 | 9 | P | C | `detect.ts` carries a whole citation subsystem and a scoring heuristic | `Core/MarkdownPM/Engine/detect.ts` |
| R-50 | 9 | D | C | Two unmount disciplines on one widget chassis; one persistence contract under three names | `Core/MarkdownPM/Widgets/reactWidget.ts` |
| R-51 | 9 | D | C | Two "move this range" implementations; no incremental path for the whole-document derivation | `Core/MarkdownPM/Engine/listDragModel.ts`, `Core/MarkdownPM/Engine/docScan.ts` |
| R-52 | 10 | Dt | C | Two reorder engines behind one façade, the larger serving one screen | `UIX/Interactions/engine.tsx`, `UIX/Interactions/group.tsx` |
| R-53 | 10 | FR | Dn | The entire Lucide library ships in the icon critical path (size figure unverified; mechanism confirmed) | `UIX/Symbols/index.tsx`, `UIX/Symbols/allSymbols.ts` |
| R-54 | 10 | FR | C | Zero coarse-pointer awareness in a kit whose reveals are all hover-gated | `UIX/Interactions/HoverRemove.tsx` and four others |
| R-55 | 10 | Dt | C | The drawn caret is split across three packages, and UIX styles CodeMirror | `UIX/Theme/caret.css`, `Core/MarkdownPM/caret.ts` |
| R-56 | 10 | Dt | C | Pommora's application vocabulary sits inside the design kit | `UIX/Interactions/frameDndModel.ts`, `UIX/Theme/colors.ts` |
| R-57 | 10 | P | C | Two spellings for one glass state; a hand-maintained token republish missing five; a documented API that doesn't exist | `UIX/Pickers/picker-base.tsx`, `UIX/Theme/theme-vars.css.ts` |
| R-58 | 10 | D | C | The tile grid is a justified third drop treatment (doc should say so); the tab bar hand-rolls the harness | `Core/Tiles/TileGrid.tsx`, `Core/Navigation/TabBar.tsx` |
| R-59 | 11 | D | C | Two tab models in two folders, types crossing both ways | `Core/Navigation/tabsModel.ts`, `Core/Interface/Windows/windowTabs.ts` |
| R-60 | 11 | Dt | Dn | Four warm caches, one shared helper, two adopters (counts corrected) | `Core/Interface/Windows/windowCache.ts` and three others |
| R-61 | 11 | Dt | C | A new setting needs three edits, only two compiler-checked | `Core/Settings/codec.ts` |
| R-62 | 11 | Dt | C | `Sidebar.tsx` and `SettingsWindow.tsx`: one is long, one is complex; neither is tested | both files |
| R-63 | 11 | Dt | C | The shell reaches into the interface by global CSS-class selector | `Core/Navigation/useNavThumbnails.ts` |
| R-64 | 11 | Dt | C | The view tile hand-rolls an inline rename above the shared one it also uses | `Core/Tiles/Surfaces/ViewTile.tsx` |
| R-65 | 12 | P | C | "Parent path" three times, three unrelated `findContainer`s | `Core/Nexus/treePatch.ts`, `Core/Paths/posix.ts` |
| R-66 | 12 | Dt | C | The nexus-wide mutation contract is filed under Pages | `Core/Pages/mutateRequest.ts` |
| R-67 | 12 | P | C | Test scaffolding in four homes, two of them production folders | `Core/Views/pageValues.ts`, `Core/Views/propsAtRoot.ts` |
| R-68 | 12 | P | C | Seven imports reach out of Core by relative path | `Core/MarkdownPM/Engine/docScan.ts` and six others |
| R-69 | 12 | P | C | Naming canon broken four ways, one created by the restructure | `UIX/Windows/window-bounds.ts` and ~20 others |
| R-70 | 12 | D | C | Three parallel vocabularies for one entity taxonomy | `Core/Nexus/identityMark.ts`, `Core/Paths/paths.ts`, `Core/Nexus/folderKind.ts` |
| R-71 | 12 | P | C | Two hand-rolled modal scrims with no shared primitive | `Core/Interface/Confirm/ConfirmationWindow.tsx`, `Core/Assets/ImagePicker.tsx` |
| R-72 | 12 | P | C | Coverage and dead-code measurements, recorded so they aren't re-litigated | tree-wide |

**Adjudicated without their own entry:** the property panel re-implements a three-line context resolver verbatim (topic 12, small); `PropertyFrame.tsx` holds fourteen near-identical IPC wrappers and a seven-arm ternary router (topic 11, ~65 lines); nothing tests the IPC handler layer and its validators come in three strengths (pairs with R-16); Table's band reassign reads pre-edit frontmatter for its optimistic patch (folds into R-32); the Grouping pane re-walks the container on every render (topic 8, a four-line memo); one dead machine method every future host would have to implement (topic 3, five lines); the menu model/presenter pattern is applied to three menus of twenty-odd, with two files on the wrong side (topics 5 and 12).

#### Appendix B: Corrections Made During Reconciliation

Nothing was denied outright. Four findings had a sub-claim denied and thirteen were downgraded; each is carried above in corrected form. The ones that matter:

- **TableView is not untested.** The mechanical sweep called four monoliths untested by the test "does any test file name this path." Two suites render the real view host, which renders TableView, so it has 1,330 lines of interaction tests. Cards, Sidebar, and SettingsWindow genuinely have none.
- **The lenient registry read doesn't strand Context references.** Context keys begin with `<`, which the property-name validator refuses, so the rename cascade never touches them. What it strands is link-valued property values.
- **The browser-storage rationale came from a comment.** The call site shows the write happens once on drop, not per frame.
- **Desktop is 2,027 lines, not 10,000.** The brief's initial count included build output. Desktop is small enough to read in an afternoon, which makes the host-side fixes cheaper than they first looked.
- **Path-scoped churn is unmeasurable.** The top-level folders only exist since 09-05-2026, so any per-folder churn figure measures two days. The MarkdownPM churn ranking was dropped; its findings stand on the duplication alone.

#### Appendix C: Doc Drift Summary

Forty-one distinct items. Two are code bugs where the doc is right (R-28, now fixed, and R-40) and are handled as bugs; the ⌘-click item was denied by manual test. The rest are documentation corrections, of which the ones that hide a real finding are:

- **DesktopPM** describes the file lock as cross-process; it's in-process. This makes the single-writer problem look solved.
- **DesktopPM** and **CorePM** attribute the atomic write to a Core file that only forwards to the host. This makes the atomicity contract look declared.
- **DesktopPM** and **ConfigurationPM** disagree on where Use Native Menus and pane widths live. ConfigurationPM is right.
- **CorePM**, **ConfigurationPM** count persistence tiers as four, two, or three. There are five, and browser storage appears in none of them.
- **SymbolsPM** says nothing arrives by wildcard. One static import does.
- **MarkdownPM** says links come from one intent stream. They don't, and the doc describes the design the code should reach.
- **ContextsPM** and **PagesPM** contradict each other on whether losing a tag re-dates a page. PagesPM is right.
- **The project CLAUDE.md** cites `Surface` as the glass boundary (it's `GlassSurface`), says Node is called only from Desktop (true for production, not tests), and describes the Contract as the only host relationship (the host also runs the engine half directly, which is correct and should be stated).
- **CorePM** calls itself the map and covers 11 of 22 Core folders; `Core/Session` appears in no Features doc at all.

#### Appendix D: Method

Nine Opus auditors, dispatched in parallel with one shared brief. Six owned a directory slice and applied all eleven lenses: Foundations, Content Model, Views, Shell, MarkdownPM, UIX. Three were cross-cutting: Duplication and Asymmetry (with a textual clone scan plus a semantic pass), Filing and Taxonomy, and Mechanical Sweeps (numbers only, every claim backed by a command). Each produced a ranked report with quoted evidence. A tenth Opus agent merged the nine into 72 findings, re-opened every ranked claim against the code, and produced a corrections section so nothing disappeared silently. The eight findings most likely to land above the fold were then independently traced against the code before this document was written. The raw reports and the reconciled ledger are session working files and were not filed in the repository.
