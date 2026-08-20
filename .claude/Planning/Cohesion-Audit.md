## Codebase Cohesion Audit

An eight-agent read-only sweep of `Pommora/src` (121k lines, 829 files) and `.claude // Features`, run 08-19-2026. All three gates were green at audit time — typecheck clean, Biome clean across 845 files, 2,957 Vitest tests passing — so nothing below is breakage. It is cohesion debt.

Every finding cited here was re-opened and confirmed against the file before it was written down.

### Reconciliation

Session One landed across six commits (`d9765a55` … `a3cd989e`) and Session Two's first half across
five (`c8c8cf3d` … `30c4fdc7`). What follows records where every finding stands; the sections below
are left as they were written, so this is the one place to read for status.

**Done.** §I in full, except as noted below. §III's eight scoped MarkdownPM fixes. §IV's deletions,
token swaps, shared-shape extractions, and named constants. §V's main-process costs, except the one
corrected below. The documentation set: broken markup, build-status text, the four
implementation-note sections, and the batch pass.

**Done, and larger than the finding described.** The icon ladder now mirrors the type ramp one for
one, and every call site names a step — the finding asked only that the ladder hold a step for each
scale in use. The native-menu arc under *Beyond a Session* is partly done: the model-to-native
conversion has one implementation rather than three, and the table, view embed, and view button
menus keep their labels in `shared/`. A registry write costs no sidecar read at all rather than the
narrowed set the finding asked for: the def edits move no assignment list, so re-pointing the tree's
embedded defs is a pure transform, and only the four ops that touch one container's sidecar name it.
The watcher's settle window also stopped stat-sweeping the corpus after walks nothing in the corpus
caused, and `node_modules` joined its ignore list, where the walk's own rule had always put it.

**Corrected by the implementation.** Four claims did not survive contact with the code, and the
prose above has been left in place rather than rewritten, since the reasoning is still worth reading:

- The two card families share **two** declaration-identical rule pairs, not six. Four more shared
  most of a rule while differing meaningfully; the shared chassis was drawn from what genuinely
  matched.
- The 1px pane divider has **one** shipped consumer. The other seven are the Interaction Lab, a
  dev-facing surface with its own visual language. A token for one caller is ceremony.
- Neither comment about `.open-btn`'s hover was wrong. The tokens read exactly as documented — hover
  is the lighter of the two — and only the button consumed them backwards.
- `Carets.css`'s "only two literal easings" are `ease-in-out` keywords, not literals.
- `trash:list` costs what the trash holds and no more. It walks to each bundle and stops there,
  reading one small record per deletion, and the pane asks for it on open and after each action —
  every one of which changed `.trash`. A memo would need invalidating from every trash write, which
  is a second writer for the same fact, and would hit on almost nothing.
- The fifteen property and schema handlers are ten, not fifteen. Four clearing or removing an
  option, two retitling one, and four narrowing a payload onto a def edit share a shape and now
  state it once; the rest differ in payload and arity, and a combinator over them would cost more
  than it saves.

**Deliberately not done, with reason.**

- `shared/pageMenu.ts`'s leading-separator drop stays. A test asserts the *model* drops it, which is
  a contract on the model rather than an artifact of how a menu happens to be drawn.
- Cross-document restatement stays. `ViewsPM` already owns the shared mechanisms, and the
  per-surface documents defer to it explicitly while describing what their own surface dresses it
  in — that is behavior a reader of `CardViewPM` needs.
- `gripMenu`, `trashMenu`, and `contextMenu` keep their main-side shape. The first resolves object
  actions through an arbitrary-depth pick tree that `ActionItem` cannot express; the second already
  keeps its labels in `shared/` and pops through the nesting primitive; the third runs its writes
  inline rather than resolving an action, so it is a different chassis rather than a model.
- The heading-convention split and `QuickCapturePM`'s status banner are open calls.

**Found by the pass, not by the audit.** Three CSS vars in `tabBar.css` were declared and never
consumed. The editor's six formatting chords were declared in two spellings with nothing tying them
together, so the menu could advertise a shortcut the editor never bound — the same shape §II
describes, now fixed. The heading ladder and the list-marker names were each written twice. The
CalendarPicker drew a second checkmark over the one its picker rows already draw, and the block
handle's Style and Scale lists had lost their left alignment.

**Deferred to a named session.** §III's line-decoration viewport scoping and the
`connections.ts`/`links.ts` factory unification, plus `Styles.css`, go to the MarkdownPM session.
§VI's import cycle and the pieces leaking out of `Table/` go to the Table session. §II, the rest of
§VI, and the arcs under *Beyond a Session* are unstarted; `ContextPM` carries their ordering. The
`main/index.ts` split is one of them and wants its own session: the file's shared refusals,
resolvers, and confirm helpers all close over the window it also creates, so the per-domain maps
want that context carved out first.

### Session One — The Dusting

#### I. Deletions and One-Liners

Nothing here needs thought. Roughly forty-five minutes for the batch.

| Item                          | Where                                                                                 | Change                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three unimported dependencies | `package.json:37,63,64`                                                               | `npm rm react-markdown remark-gfm pngjs` — zero import sites in `src`, `scripts`, or configs. Update the stack line in StudioMD's Pommora entry, which still lists the first two.                         |
| Dead export                   | `design-system/components/menu/menu.css.ts:25`                                        | `TITLE_X_TWISTY_ONLY` has exactly one occurrence in the repo: its own declaration. Delete.                                                                                                                |
| Dead token                    | `styles.css:6`                                                                        | `--row-h: 28px` is referenced nowhere. Delete, or wire it to the row surfaces that restate their own heights.                                                                                             |
| Dead rule                     | `Sidebar/Sidebar.css:272-280`                                                         | `.section-header` has no consumer and names a `SectionHeader` component that does not exist. Delete the rule and its comment.                                                                             |
| Duplicate rule                | `Detail/Detail.css:125-131`                                                           | Byte-identical to `.state-detail` in `styles.css:209-215`. Use `.state-detail` in `PageView.tsx:118` and delete.                                                                                          |
| Lone hardcoded opacity        | `Navigation/navList.css:118`                                                          | `opacity: 0.55` is the only one in the shipped renderer, and it equals `--state-inactive` — whose comment names this exact case. Swap to the token.                                                       |
| Literal easing                | `Carets.css:56,111`                                                                   | The only two literal easings in shipped CSS. Swap to `var(--ease-in-out)`.                                                                                                                                |
| Magic z-index                 | `design-system/components/CalendarPicker/calendarPicker.css.ts:68`                    | `zIndex: 30` belongs to no ladder in `stack.ts`; `local` tops at 20 and `top` starts at 999. The rule describes a portalled list inside a portalled menu, which is `stack.top.menuOverlay`.               |
| Duplicated easing constant    | `design-system/interactions/feel.tsx:5`                                               | `EASE_OUT` copies `motion.ts:16`'s literal instead of importing `easing.out`. Import it.                                                                                                                  |
| Raw icon imports              | `Components/Detail/SettingsPane.tsx:2-11`, `PageMenu.tsx:2`                           | The only two raw `lucide-react` imports outside the registry, both in files that already import `Icon`. Seven of the glyphs are the documented View Settings table. Swap to `<Icon name=… />`.            |
| Rope re-join                  | `MarkdownPM/Tables/widget.tsx:317`                                                    | `doc.toString()` where every other call site in the file uses the cached `docString`, which the module already imports. One-line.                                                                         |
| Hand-rolled focus             | `MarkdownPM/editor/gripMenu.ts:102-104`                                               | Hand-rolls select-and-focus while importing `focusRange` and using it correctly seventy lines later. The hand-rolled form misses `focusRange`'s `assoc` handling for a caret abutting hidden marker text. |
| Separator divergence          | `main/pageMenu.ts:18`                                                                 | Drops a leading separator where its twin `rowMenu.ts:50` guards with `template.length > 0`. Latent today; bites the first model that starts with a separator. Add the guard.                              |
| Stale comments                | `Detail/InspectorPanel/InspectorPanel.tsx:6`, `Tabs/tabBar.css:109`, `package.json:4` | A pending-state comment, a comment naming a class that no longer exists (`.group-add`), and a package description reading "Phase 1: window + glass sidebar scaffold."                                     |

#### II. One Definition Per Thing

The recurring shape: a canonical helper exists in `shared/` or `main/`, `main/` imports it, and the renderer spells it out again.

**`parentOf` — five hand-rolled re-spellings.** `shared/treePatch.ts:24` carries a comment warning that "a bare `slice(0, lastIndexOf)` would eat the name's last character," and five renderer sites use precisely that form: `useViewCreation.ts:196`, `CardsView.tsx:658,662`, `TableView.tsx:1396,1421`, plus a sixth guarded variant at `pageMenuActions.ts:13` and a seventh in `store.ts:180`. The paths in play always contain a slash today, so this is drift risk rather than a live bug — but it is a documented trap with a canonical fix already exported. Import `parentOf`; delete the local forms.

**`clamp` — five identical definitions.** `PhotoCropModal.tsx:12`, `MarkdownPM/Tables/operations.ts:6`, `interactions/FloatingWindow.tsx:29`, `SidePane/SidePane.tsx:22`, `SurfacePM/core/ops.ts:291`. All byte-for-byte `(v, lo, hi) => Math.max(lo, Math.min(hi, v))`, and the only exported one lives in the Markdown table module. One export in the design system; five import swaps.

**The option-bearing property predicate — six sites.** `type === 'select' || type === 'multi_select'` at `main/crud/optionOps.ts:29`, `main/properties/schema.ts:35`, `main/crud/registryProperty.ts:29`, `Components/Detail/PropertiesPane.tsx:422`, with `context` added at `valueClick.ts:34` and `shared/cellMenu.ts:98`. A third option-bearing type means finding all six. One `hasSelectOptions(type)` in `shared/properties.ts`.

**Heading grammar — three regexes that disagree.** `MarkdownPM/detect/index.ts:388` uses `[ ]{0,3}` while `:402` and `input/format.ts:138` use `\s{0,3}`. They disagree on a tab-indented `#`, so `isHeadingLine` rejects what `headingParts` accepts for the same line. The file's own comment calls itself "the one heading-shape regex." One indent fragment, three consumers.

**`titleFromPath` — three implementations, one case-divergent.** `shared/connections.ts:19` and `main/coerce.ts:15` both strip `/\.md$/i`; `Sidebar/sidebarDnd.tsx:392` uses case-sensitive `endsWith('.md')`, so a `.MD` file keeps its extension in the title — and `main/io/walk.ts:16` lowercases before its check, so `.MD` files are genuinely admitted as pages.

**Path constants with no owner.** `main/paths.ts` claims to be "the one place that knows the on-disk layout" and does not own: `.trash` (hardcoded at nine sites including a write refusal, a watcher ignore rule, and a recents filter), `.nexus` (eight sites, one of which mixes a literal with an imported constant in a single template at `watchPatch.ts:123`), `.nexus/assets/` (four spellings, two of which are security gates), or the two journal filenames (`contextJournal.ts:12`, `propertyJournal.ts:14`). Add `TRASH_DIRNAME`, `NEXUS_DIRNAME`, the asset helpers, and both journals to `NEXUS_CONFIG_FILES`.

**`.nexus/contexts/<Title>` — built by hand at seven sites** despite `CONTEXTS_DIR_REL` existing at `paths.ts:41` and being imported by only two callers. The renderer cannot import `main/`, which is why it re-spells the template — so the helper belongs in `shared/contexts.ts`, which already owns the registry contract and is importable by both processes.

**Smaller twins.** `pad(n)` three times (`formatValue.ts:46`, `CalendarPicker.tsx:78`, `pipeline/group.ts:117`). `persistViewOrder` byte-identical in both view renderers (`TableView.tsx:1096`, `CardsView.tsx:641`). Two LRU-trim implementations where the second names the duplication in its own comment (`Tabs/warmCache.ts:25`, `Embeds/webRetention.ts:26`). Three `unknown → clamped number` coercions opening with the same guard (`shared/types.ts:169,180,195`). "Move an item within an array" four times (`navRecents.ts:38`, `cardsOrder.ts:5`, `tabsModel.ts:232`, `engine.tsx:488`).

**Editor format chords declared in both processes.** Six chords exist as Electron accelerators (`main/editorMenu.ts:130-170`) and again as CM6 keybindings (`MarkdownPM/editor/formatKeymap.ts:13-18`). Both files acknowledge the split in comments; nothing enforces it, so changing one makes the menu display a lie. One `Record<action, chord>` in `shared/`, formatted by each side — the pattern `shared/bridge.ts` already models for IPC.

#### III. MarkdownPM — Divergence and Cost

The drag story came back healthy: every editor drag rides the shared `beginPointerGesture` skeleton, autoscroll is the shared singleton, and the `mousedown`-swallow discipline is uniform. The divergence is in pointer policy and per-frame cost.

**The block drag re-parses the whole document every autoscroll frame.** `MarkdownPM/editor/blockDrag.ts:32-37` opens `collectCands` with `view.state.doc.toString()` then `blockStarts(doc)`, which is a full-document parse of fences, tables, maths, callouts, and list membership. `EditorGesture.ts` wires window scroll to `remeasure`, and autoscroll's `scrollBy` fires a native scroll every rAF frame — so an edge-autoscrolling block drag pays a rope join plus a full-doc parse plus a forced-layout sweep, sixty times a second. Its sibling `listDrag.ts:55-63` does it correctly with the cached `docString` and iteration scoped to `view.visibleRanges`. Hoist `doc` and `starts` into `startBlockDrag`; only the geometry needs re-reading on scroll.

**`↔` is re-scanned on every build.** `decorations.ts:406-411` runs `text.slice(from, to).matchAll(/↔/g)` on every caret move, keystroke, focus flip, and scroll — while the far more expensive tokenize eight lines above is memoized per doc version by the helper this could reuse.

**`[[Connection]]` and `[text](target)` have drifted apart.** `connections.ts` and `links.ts` independently implement the same five handlers with the same mousedown-record trick, the same right-press claim, and the same edge clamp. Three things exist on one side only:

- **⌘-click bypass** — `connections.ts:190` routes it; `links.ts` has no `metaKey` branch at all, while `Tables/TableView.tsx:163` implements it for the same markdown link in a resting cell. So ⌘-clicking a page-naming link opens in place in the body and bypasses in a table cell.
- **Post-menu preview suppression** — `connections.ts` carries `actedOnLink` with a comment explaining why cancelling once isn't enough: a native menu takes the pointer and hands it back over the same link, and the re-entry blooms a preview behind the menu. `links.ts` has no equivalent, so right-clicking a markdown link reproduces the exact bug the connection path was hardened against.
- **Hover-card dismissal** — `Tables/TableView.tsx:141` pairs `intent.cancel()` with `closeActiveHoverCard()`, commented as "the pair every gesture that replaces the pointer's meaning owes it." Both body handlers call only the first, so an already-open card survives a right-click.

Each is a small addition to `links.ts`. The larger fix is one parameterized factory taking a hit-tester, which makes the next drift impossible.

**Three resizes, three activation policies.** The editor's table column resize takes the default 5px activation (`MarkdownPM/Tables/TableView.tsx:344`), while the Detail table and the embed edge both use `activation: 0`. A resize has no click meaning to protect, so the 5px gate buys nothing and reads as lag. Leave the reorder grip at the default — it has a click alternative.

#### IV. CSS Cohesion

Color hygiene came back clean: zero raw hex or `rgba()` in any shipped stylesheet outside the token files. What follows is shape duplication and token bypass.

**Hover dims the Open button.** `.open-btn` rests at `--state-selected` (5%) and drops to `--state-hover` (2.5%) on hover — inverted relative to all thirty-plus other `--state-*` call sites, which rest transparent and rise. Separately, `theme-vars.css.ts:56` comments "hover lighter than selected" while `color.css.ts:64-65` defines hover as the *dimmer* of the two; one of them is wrong.

**Two card families duplicate their rules verbatim.** `design-system/card-tokens.css` exists to hold "the geometry the two card families agreed on," but only the variables were lifted. Six class pairs across `CardsView.css` and `navGallery.css` are declaration-for-declaration identical, and they have already drifted — `CardsView.css:205` carries a `padding-block: 1px` descender fix its twin lacks.

**The collapsible footer bar exists twice.** `previewPane.css:231-279` and `subfield.css:125-177` are the same reveal plus the same riding chevron, differing in four numbers. Already drifted: the preview's reveal set includes `:focus-visible`, the subfield's does not — so the subfield toggle is keyboard-reachable and invisible when focused.

**Four copies of the invisible edge-drag resize strip** (`Sidebar.css:257`, `inspector-panel.css:27`, `previewPane.css:174-188` twice), all `width: 9px` at a `-3px` back-off, while `sidePane.css:12-14` already holds a `.sidepane-resize` stub that sets only the cursor.

**Unnamed shared constants.** The off-screen park clearance `14px` is written out at four sites. The floating-window close-button clearance `30px` at two, with a comment cross-referencing the other instead of a variable. The banner shadow geometry `0 1px 4px` at four sites despite `--banner-shadow` tokenizing only its color. The container-title size `20px` four times inside the one file whose comment declares it DRY. The 1px pane divider is the app's most-repeated border and the only unweighted one — the other three weights are all tokenized.

**Token bypasses.** The band rename field hand-rolls `1px solid var(--accent)` where `--accent-stroke` exists and its documentation names the parallel field as a consumer (`GroupBand.css:78-85`). The ribbon divider paints in `--fill-secondary` — a card-and-chip tone — where every other hairline uses a separator tone, and at exactly `--border-heading`'s width. Two 32×32 icon buttons in `Sidebar.css` disagree on radius, cursor, and whether they transition at all, one of them claiming to match a bundle whose radius is 12px.

**Two mechanism gaps behind the bypasses.** Only three of seven type-ramp steps are bridged to CSS vars, so a plain stylesheet needing `body`, `headline`, `callout`, `control`, or `footnote` has no var to reach for — thirteen hardcoded `font-size`s follow from that. And the control bundles are never bridged at all, so `button-large`'s height is restated at five sites, one of them commenting that it "matches the button-large row" it cannot actually reference.

### Session Two — The Cabling

#### V. Main-Process Cost

**Every registry write re-reads every Collection sidecar.** `mutatePatch.ts:227-229` loops all collections calling `patchContainerFromDisk`, which does a fresh read plus a full node rebuild per collection — and bypasses the walk's own parse cache, so nothing is stat-gated. This fires from `confirmRegistryWrite`, which has twenty-one call sites in `index.ts`: setting a property icon, recoloring a checkbox, renaming an option. Pass the edited property id in and patch only the collections that assign it.

**`settings.json` has eight independent full-file readers** while a decoded copy is already live on the tree and the watcher keeps it current. `readPermanentDelete` runs on *every* mutate and every context-menu pop (`index.ts:552-560`); `applyDefaultZoom` parses the file twice per call, on two lifecycle events. Serve these from `getLiveTree()?.personalization` with the disk read as fallback. The exception worth doing properly: `excluded_folders` is decoded and then dropped rather than landing on the tree, which is why the index seed re-reads the file on every cascade scan.

**Every corpus enumeration walks `.trash` before filtering it out.** `io/walk.ts:81` uses Node's recursive `readdir`, which has no filter hook, so the OS walk covers everything and exclusions are applied to the result. `.trash` is never pruned by design and grows monotonically. This also quietly contradicts the documented claim that nothing under an excluded folder is read — it isn't read, but it is walked. The read path already does this correctly via `shouldSkipDir`.

**A folder created in Finder costs a full walk plus a full-corpus stat sweep.** `watcher.ts:145-153` classifies `addDir`/`unlinkDir` as unconditional full-refresh, and settle then runs both `refreshAfterWrite` and `seedContentIndex` — two independent enumerations back to back that share neither the walk nor the stats.

**`excludedMatcher` is recompiled per directory entry.** It is explicitly "curried so per-event callers compile the list once," and both hot callers defeat that: `exclusion.ts:18-21` builds a fresh closure for every directory the walk touches, and `watchPatch.ts:115` builds one per watch event.

**`trash:list` re-walks and re-parses everything on every call**, against a directory that only grows and that nothing watches. `record.ts:32`'s WeakMap is the existing pattern for memoizing exactly this.

#### VI. Renderer Lifting

**Break the import cycle first.** `useActiveView.ts:6` imports `pickView` from `Table/TableView`, and `TableView.tsx:34` imports `useActiveView` — a genuine module cycle. Four unrelated modules drag the entire 1,951-line Table component, its pickers, its CSS, and its DnD into their graph to reach two pure functions. Move `pickView` and `resolveContainerSchema` into `Views/pipeline/`. Zero behavior change.

**`Table/` has become the shared module for the whole renderer.** Eighteen modules outside it import `Cell`, `resolveContext`, `columnStyles`, `columnLabel`, `solidColor`, `checkboxLook`, and `tableDnd` — the navigation list uses the table's drag module — and `Table.css` loads from `main.tsx` as global app CSS. A table-scoped refactor silently reaches the nav gallery and the settings trash pane. Promote the shared pieces into `pipeline/` or the design system and leave genuinely table-shaped code behind.

**Cards patches over the wrong identity key.** `CardsView.tsx:154,168` uses `effectiveValues[row.id] ?? { id: row.id }` where the canonical fallback is keyed `PageID`. The lookup is also redundant — `row.frontmatter` *is* that expression by construction, which is what Table uses. Two lines, then lift both commit paths into one shared function since they are otherwise identical.

**Every card re-renders on every tree push.** `PageCard` is memoized with carefully identity-stabilized props, and then `CardsView.tsx:1305` subscribes each card to `s.tree` — the most frequently replaced value in the store — for a value only a click handler reads. The file already uses `getState()` for exactly this two hundred lines later.

**Table resolves column style, width, and align twice per column per render.** `alignByCol`/`styleByCol` are memoized precisely because resolution allocates; `colStyle()` and `colAlign()` survive as unmemoized twins, and `colWidth()` calls `colStyle()` on every invocation — at least three times per column per render, on a component that re-renders on selection, hover, editing, every column-drag slot flip, and every tree push.

**Three copies of the page-meta action router, already disagreeing.** The menu *models* are correctly shared; the routers are three hand-written if/else chains over the same union with no exhaustiveness check. The grip menu handles `title:preview`, the cell menu doesn't, the card menu handles neither it nor `title:newabove`. Adding a variant compiles clean and silently no-ops wherever it wasn't added. One `switch` over the union makes it a compile error.

**Duplicated state and gates across the two renderers.** Both hand-roll the same container-session state — `values`, `valueOverride`, `effectiveValues`, `viewOrders`, the load effect, the epoch mount, a byte-identical `persistViewOrder` — and their reset rules have already drifted. Both re-derive the same drag-capability gate chain, and there too they disagree: Cards gates on `isLocationFsOrder`, Table doesn't, about which `shared/views.ts:308-310` says outright "both must read the same predicate: when they disagree, one honors a key the other doesn't."

**Derived state stored beside its inputs.** `pinnedTabs` is a pure function of `pinned` and `tree`, written by four call sites plus two initializers, with a diff guard at `store.ts:855` compensating for the fact that it can disagree with its own inputs. `previewTarget` is `deriveTarget(preview)` stored next to `preview`, set at six sites and nulled by hand at two more. Both should be selectors.

**`applyTree` runs the full reconcile twice per mutation** — once optimistically, once on main's confirming push — including an IPC round trip for the system accent. Split it into a `setTree` the optimistic path calls and a `hydrateNexusChrome` only the push path needs.

**Five fields model one finite page-load state.** `pageStatus`/`pageDetail`/`pageError` plus two orthogonal flags, where `{status: 'ready', detail: null}` is representable, written as a four-field tuple in seven places. This is the house rule's own example — model finite states as a union.

### Beyond a Session

These are arcs, not cleanup. Listed because each one gets more expensive with every feature built on top of it.

**The view host is copied per view type, and four more are declared.** `shared/views.ts:12` names six view types; two exist. `TableView` and `CardsView` share roughly two hundred lines of identical preamble — state, load effects, schema resolution, the view merge, the context memo, the set-name/icon/path trio. `useValuesEpoch` and `useActiveView` are partial extractions of exactly this, which is proof the instinct was right and stopped short. Every future view type pays those two hundred lines, and every fix to a shared behavior lands in N places or diverges in N−1. One `useViewHost(source)` hook turns List, Gallery, Calendar, and Timeline into "render this row model."

**Per-tab page state is modeled as global singletons.** `store.ts:256-259` holds one `pageStatus`/`pageDetail`/`pageError` describing whichever tab is active. The last two commits before HEAD are both consequences: one invented parked hosts, the other fixes the confusion the singleton causes, and `DetailPane.tsx:88-92` now carries a five-line comment explaining that a parked surface must read its page from its own tab's target rather than the selection. `PageView` takes an optional `detail` prop and then subscribes to the store three times in order to ignore it. Keying page state by tab makes `PageView({ tabId })` the whole signature, and it is what raising `WARM_TABS`, split view, and the committed multi-window seams all wait on.

**`main/index.ts` is a 1,330-line handler literal bolted to window lifecycle.** The bridge seam itself is excellent and should not be touched — every channel declared once, both sides derived, a mismatch is a compile error. What is wrong is that ~110 channel implementations share a file with `createWindow`, protocol registration, and app lifecycle. Every feature that adds a channel edits this file, which makes it a permanent collision point for the parallel sessions this project runs. `serveBridge` already takes a plain object: split into per-domain partial maps and spread them. Fifteen of the property and schema handlers also repeat the same six-line ceremony, and six of the option operations are byte-identical apart from an imported function name — one combinator plus a table collapses roughly 250 lines to 60.

**Sixteen native menus hand-build templates a shared model already describes.** `shared/menuModel.ts` states the row shape once and says the point out loud. Five shared modules emit `ActionItem[]` and are unit-tested; on the main side only `propertyMenu.ts` converts through `rowTemplate`. The other sixteen push Electron options by hand with the label logic inline — `main/navRowMenu.ts:28` computes a Pin/Unpin label in Electron code that its shared sibling computes in a tested pure function. That split is also what produced the separator divergence in §I. The native-versus-in-house *distinction* is settled and correct; the debt is that the model-to-native conversion has three implementations.

**Fire-and-forget writes have no seam.** Sixty-three channels return the `Result` envelope; the renderer checks `.ok` at thirty-two sites. The gap is a coherent family — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown` and nine more — every one called as `void window.nexus.x(…)`, every failure discarded. A locked file or a full disk produces a UI showing the new fold state, the new column widths, the new tile heights, and persisting none of it, silently, until restart. The error path already exists and is used at eight other call sites. One `persist()` helper makes failure handling the default rather than something to remember; the pattern has already been copied thirteen times.

**Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns mounts around 18,000 elements, and every pipeline re-run reconciles all of them — the extensive memoization in both files is buying per-row bailout on a list that shouldn't be mounted. Group bands complicate it, so the scoped version is to virtualize the flat, ungrouped case first, where the win is largest and the band machinery is absent.

### Documentation

Staleness is not this set's problem. Every token table, geometry constant, spectrum hex, personalization key, and symbol id spot-checked against source was accurate, and all twenty-six documents are free of marketing voice, first-person, and references to sessions or planning. Voice, structure, and a handful of broken sentences are the whole of it.

**Visibly broken markup, fix first.** `PagesPM.md:59` has an unclosed wiki-link mid-sentence and a lead paragraph ending without a period. `ViewsPM.md:74` renders `**Properties**Visibility**` as garbage in the doc describing the most-used surface. `ArchitecturePM.md:87` ends on the ungrammatical "The record and restore model are the NexusRecords." `PropertiesPM.md:83` has a YAML example that does not parse — in the document whose point is that values stay legible to any YAML tool — plus an orphan YAML block at `:149-154` restating the prose directly above it. `StructurePM.md:25` links `[[ContextPM]]`, which does not exist.

**Build-status text standing in for content.** `CardViewPM.md:98` is an empty `### Pending` heading with a table-of-contents entry. `ConfigurationPM.md` ships three empty tables under the words "Seated and empty." and one "not yet documented here," in the document a reader opens first to learn what is configurable. `ConfigurationPM.md:143` marks a row "— unimplemented" inside a table cell.

**Implementation-note voice.** `ArchitecturePM.md` §The IPC Bridge and §The Device-Local Database, and `PommoraDND.md` §The Seam, are both unparseable without codebase knowledge — module names, function signatures, file paths, SQL fragments. `PagePreviewPM.md` §The Token Contract is pure CSS wiring. The token documents already solve this with a `**SOURCE:**` line; these three should do the same and keep only the behavioral claims.

**One factual self-contradiction.** `InteractionPM.md:32` and `:91` describe the `out` easing token as having consumers; the table at `:112` and Pending at `:169` say it is defined with none. Verified: `--ease-out` is published at `theme-vars.css.ts:165` and consumed by zero CSS rules, while `autoscroll.ts:255` carries a deliberate JS mirror of the curve. The table and Pending are right. Note that fixing `feel.tsx` (§I) does not change this — that file duplicates the raw literal rather than consuming the CSS var.

**Cross-document restatement.** The hover-ghost mechanism is re-derived in full three times (`CardViewPM`, `TableViewPM`, `SidebarPM`) where `ViewsPM` should own it. The page-creation act appears in four documents where `PagesPM` should own it. The alias record's storage rationale is stated three times. The page-preview hover card is described at comparable length in both `PagePreviewPM` and `WebviewPM`.

**Batch pass.** Seven headings missing a preceding blank line, two table-of-contents mismatches, two omitted sections in `DesignSystemPM`'s contents, four missing spaces before inline code in `MarkdownPM`, and about twenty-eight trailing-whitespace lines across sixteen files.

Clean and needing nothing: `CollectionsPM`, `PageSetsPM`, `SubfieldPM`, `TypographyPM`, `NavigationPM`, `TableViewPM`, `NexusRecordPM`, `ContextsPM`.

### Open Calls

Findings where the correct answer is not established in the codebase. These are design and product decisions, not cleanup.

**The icon size ladder does not match how icons are actually used.** The ladder defines 12/14/16/18/20. The renderer passes a raw number at 147 call sites, and the single most common size is **13px** — used 39 times, and absent from the ladder entirely. Next are 12 (37) and 14 (32). One consumer has already built a parallel semantic ladder of its own in `settingsPane.css.ts:53`. Either 13 joins the ladder as a real step, or those 39 sites move to 12 or 14. A ladder that cannot absorb the app's most common value is decorative, and it will stay bypassed until this is settled. *This is the largest single consistency question in the design system.*

**`cursor: default` versus `cursor: pointer` has no rule.** The split is roughly twenty sites each, with design-system components consistently on `default` and feature surfaces mixed. Two identical icon buttons in one Sidebar file disagree. Pick one convention for clickable non-link controls and the sweep is mechanical.

**Cards has no selection highlight; Table does.** Navigating back into a Cards view gives no indication of which page you came from. The same nexus state is visible in one renderer and invisible in the other. Either selection is a view-level concern and belongs above both renderers, or it is deliberately table-only and `CardViewPM` should say so — right now it reads as an omission.

**Cards has no loading or empty state.** Table shows "Loading…" while resolving and "No pages here" when empty. Cards paints a blank grid for both, which is indistinguishable from broken. The house rule says an unbuilt surface is simply blank — but *loading* versus *empty* versus *error* is a real distinction, and the answer should be one decision made once in `ViewRenderer` rather than per renderer.

**A wiki-link goes inert inside a focused table cell; a markdown link doesn't.** In a resting cell and in the body, `[[Connection]]` follows, previews, and menus. Enter the cell and all three stop, while `[text](target)` keeps working. `MarkdownPM.md` commits explicitly to the markdown-link case and is silent on the wiki form. Intentional, or an omission? The fix is one line either way — an extension added, or a sentence in the doc.

**A card drag and a row drag produce different on-disk results.** Dragging in an unsorted structural view writes the canonical `page_order` from the Table and a per-machine `viewOrders` tiebreaker from Cards. Same view, same gesture, different file. One of these is right; the other is a bug, and which is which is a call about whether card ordering is meant to be portable.

**Card column-style changes wait for the round trip.** Right-clicking a Status value and choosing Pill feels instant in a table and laggy on a card, from the same menu — Table applies an optimistic override, Cards does not and the code calls this "v1-acceptable." Six lines to fix if it should feel the same.

**Persisted-write failures are silent by design or by accident.** Thirteen preference and UI-state writes discard their `Result`. The options: surface failures through the existing `showError` path, add a quieter indicator in the subfield, or accept silence for this class deliberately and write that down. The current state is the third option without the writing-down, and it is the shape every future persisted preference will copy.

**Two retention budgets act on the same guests and neither knows it.** Parked page surfaces cap at 2 tabs; hidden web guests cap at 5. Parking works by moving the surface off-screen, which routes every tile inside it through the hidden-guest path. Two parked tabs holding four web tiles each already exceeds the guest cap, so the LRU evicts — and the live sessions parking exists to preserve get torn down anyway. Either one budget with tiers (parked guests get a reserved floor, scroll-hidden guests compete for the rest), or the numbers get chosen together with the interaction understood.

**`SavedView` is declared twice — a ~32-field interface and a ~32-field zod codec, with nothing enforcing agreement.** Inferring the type from the schema is the fix and matches what `shared/properties.ts` already does, but the doc comments currently live on the interface and would move onto the zod fields. Worth confirming that trade before doing it; the alternative is a `satisfies` assertion that catches drift at compile time while leaving both in place.

**`schema:changeType` is the only unconsumed IPC channel of 118.** Fully wired through bridge, preload, and handler, with an `opts.dropConflictingValues` argument that the handler explicitly discards. The channel may be deliberate scaffolding for the assign-surface work its own comment names — the discarded parameter is not. Keep the channel and drop the parameter, or remove all three ends.

**The feature docs are split on their own heading convention.** Five documents use bare `#### Section`; three use the `#### II. Section` prefix the convention calls for. Five-to-three against the stated rule. Either the three shed the prefix or the five gain it, but it should not stay split.

**`QuickCapturePM.md` opens with a build-status banner** — the only document in the set that does, and precisely the shape the placeholder rule pushes against. Defensible for a wholly unbuilt feature, which is why it is a call rather than a finding. It is otherwise the cleanest-written document of the twenty-six.

**Two zoom ceilings exist and neither comment names the other.** `webGuests.ts` allows 0.25–5 for host-level zoom; `shared/types.ts` caps guest zoom at 2. Almost certainly deliberate — one is Chromium's visual range, the other the settings picker's — but confirm before anyone "fixes" the mismatch, and add a line to each comment either way.
