## Codebase Cohesion Audit

What an eight-agent read-only sweep found and what of it is still standing. Sections close and leave
the document as they land, so everything below is open work, a ruling that governs future work, or a
correction a later reader would otherwise re-derive wrongly.

### What Landed

**Session One — the dusting** (`d9765a55` … `a3cd989e`, seven commits). Every deletion and one-liner.
The icon ladder, rebuilt to mirror the type ramp name for name, with every call site naming a step.
The CSS shape duplication: the card chassis, the reveal bar, the edge-drag resize strip, the sidebar's
icon button, and the named constants behind them. The menu model: one native template, and the six
editor formatting chords spelled once for both processes. Eight scoped MarkdownPM fixes. The
documentation set — broken markup, build-status text, the four implementation-note sections, and the
batch pass.

**Session Two — main-process cost** (`c8c8cf3d` … `30c4fdc7`, five commits). A registry write patches
its defs in place and opens at most one sidecar. The settings leaves are served from the live tree.
The corpus prunes what it will not read, and the exclusion matcher compiles once per list. A walk owes
the content index a stat sweep only when the corpus could have moved. Ten property channels state
their ceremony once.

### Corrections

Claims that did not survive contact with the code. Recorded because the reasoning behind each still
reads as plausible, and a later reader would otherwise reach the same wrong conclusion.

- The two card families shared **two** declaration-identical rule pairs, not six. Four more shared
  most of a rule while differing meaningfully.
- The 1px pane divider has **one** shipped consumer. The other seven are the Interaction Lab, a
  dev-facing surface with its own visual language. A token for one caller is ceremony.
- Neither comment about `.open-btn`'s hover was wrong. The tokens read exactly as documented — hover
  is the lighter of the two — and only the button consumed them backwards.
- `Carets.css`'s "only two literal easings" are `ease-in-out` keywords, not literals.
- `trash:list` costs what the trash holds and no more. It walks to each bundle and stops there,
  reading one small record per deletion, and the pane asks for it on open and after each action —
  every one of which changed `.trash`. A memo would need invalidating from every trash write, which
  is a second writer for the same fact, and would hit on almost nothing.
- The fifteen property and schema handlers were ten. Four clearing or removing an option, two
  retitling one, and four narrowing a payload onto a def edit shared a shape; the rest differ in
  payload and arity, and a combinator over them would cost more than it saves.

### Standing Rulings

Decisions taken during the pass. Each needs a reason to reopen, not merely a fresh reading.

- `shared/pageMenu.ts`'s leading-separator drop stays. A test asserts the *model* drops it, which is
  a contract on the model rather than an artifact of how a menu happens to be drawn.
- Cross-document restatement stays. `ViewsPM` already owns the shared mechanisms, and the per-surface
  documents defer to it explicitly while describing what their own surface dresses it in — that is
  behavior a reader of `CardViewPM` needs.
- `gripMenu`, `trashMenu`, and `contextMenu` keep their main-side shape. The first resolves object
  actions through an arbitrary-depth pick tree that `ActionItem` cannot express; the second already
  keeps its labels in `shared/` and pops through the nesting primitive; the third runs its writes
  inline rather than resolving an action, so it is a different chassis rather than a model.
- The icon ladder question is settled: 13px joined as a real step, and the ladder now absorbs every
  size the app uses.
- `schema:changeType` is live scaffolding with a keep-ruling, not a dead channel.

### II. One Definition Per Thing

The recurring shape: a canonical helper exists in `shared/` or `main/`, `main/` imports it, and the
renderer spells it out again. The editor's format chords are done; everything below stands.

**`parentOf` — five hand-rolled re-spellings.** `shared/treePatch.ts:24` carries a comment warning
that "a bare `slice(0, lastIndexOf)` would eat the name's last character," and five renderer sites use
precisely that form: `useViewCreation.ts:196`, `CardsView.tsx:658,662`, `TableView.tsx:1396,1421`,
plus a sixth guarded variant at `pageMenuActions.ts:13` and a seventh in `store.ts:180`. The paths in
play always contain a slash today, so this is drift risk rather than a live bug — but it is a
documented trap with a canonical fix already exported.

**`clamp` — five identical definitions.** `PhotoCropModal.tsx:12`, `MarkdownPM/Tables/operations.ts:6`,
`interactions/FloatingWindow.tsx:29`, `SidePane/SidePane.tsx:22`, `SurfacePM/core/ops.ts:291`. All
byte-for-byte `(v, lo, hi) => Math.max(lo, Math.min(hi, v))`, and the only exported one lives in the
Markdown table module. One export in the design system; five import swaps.

**The option-bearing property predicate — six sites.** `type === 'select' || type === 'multi_select'`
at `main/crud/optionOps.ts:29`, `main/properties/schema.ts:35`, `main/crud/registryProperty.ts:29`,
`Components/Detail/PropertiesPane.tsx:422`, with `context` added at `valueClick.ts:34` and
`shared/cellMenu.ts:98`. A third option-bearing type means finding all six. One `hasSelectOptions(type)`
in `shared/properties.ts`.

**`titleFromPath` — three implementations, one case-divergent.** `shared/connections.ts:19` and
`main/coerce.ts:15` both strip `/\.md$/i`; `Sidebar/sidebarDnd.tsx:392` uses case-sensitive
`endsWith('.md')`, so a `.MD` file keeps its extension in the title — and `main/io/walk.ts:16`
lowercases before its check, so `.MD` files are genuinely admitted as pages.

**Path constants with no owner.** `main/paths.ts` claims to be "the one place that knows the on-disk
layout" and does not own: `.trash` (hardcoded at nine sites including a write refusal, a watcher
ignore rule, and a recents filter), `.nexus` (eight sites, one of which mixes a literal with an
imported constant in a single template at `watchPatch.ts:123`), `.nexus/assets/` (four spellings, two
of which are security gates), or the two journal filenames (`contextJournal.ts:12`,
`propertyJournal.ts:14`).

**`.nexus/contexts/<Title>` — built by hand at seven sites** despite `CONTEXTS_DIR_REL` existing at
`paths.ts:41` and being imported by only two callers. The renderer cannot import `main/`, which is why
it re-spells the template — so the helper belongs in `shared/contexts.ts`, which already owns the
registry contract and is importable by both processes.

**Smaller twins.** `pad(n)` three times (`formatValue.ts:46`, `CalendarPicker.tsx:78`,
`pipeline/group.ts:117`). `persistViewOrder` byte-identical in both view renderers
(`TableView.tsx:1096`, `CardsView.tsx:641`). Two LRU-trim implementations where the second names the
duplication in its own comment (`Tabs/warmCache.ts:25`, `Embeds/webRetention.ts:26`). Three
`unknown → clamped number` coercions opening with the same guard (`shared/types.ts:169,180,195`).
"Move an item within an array" four times (`navRecents.ts:38`, `cardsOrder.ts:5`, `tabsModel.ts:232`,
`engine.tsx:488`).

The heading-grammar divergence that sat here is now phase 1 of [[MarkdownPM-Plan]]. `parentOf`,
`clamp`, `persistViewOrder`, and the move-an-item twins land immediately before the Table session,
since half of them live in `TableView.tsx` and `CardsView.tsx`.

### VI. Renderer Lifting

The import cycle and the pieces leaking out of `Table/` belong to the Table session, which
[[ContextPM]] scopes. What follows is the rest.

**Cards patches over the wrong identity key.** `CardsView.tsx:154,168` uses
`effectiveValues[row.id] ?? { id: row.id }` where the canonical fallback is keyed `PageID`. The lookup
is also redundant — `row.frontmatter` *is* that expression by construction, which is what Table uses.
Two lines, then lift both commit paths into one shared function since they are otherwise identical.

**Every card re-renders on every tree push.** `PageCard` is memoized with carefully identity-stabilized
props, and then `CardsView.tsx:1305` subscribes each card to `s.tree` — the most frequently replaced
value in the store — for a value only a click handler reads. The file already uses `getState()` for
exactly this two hundred lines later.

**Table resolves column style, width, and align twice per column per render.** `alignByCol`/`styleByCol`
are memoized precisely because resolution allocates; `colStyle()` and `colAlign()` survive as
unmemoized twins, and `colWidth()` calls `colStyle()` on every invocation — at least three times per
column per render, on a component that re-renders on selection, hover, editing, every column-drag slot
flip, and every tree push.

**Three copies of the page-meta action router, already disagreeing.** The menu *models* are correctly
shared; the routers are three hand-written if/else chains over the same union with no exhaustiveness
check. The grip menu handles `title:preview`, the cell menu doesn't, the card menu handles neither it
nor `title:newabove`. Adding a variant compiles clean and silently no-ops wherever it wasn't added.
One `switch` over the union makes it a compile error.

**Duplicated state and gates across the two renderers.** Both hand-roll the same container-session
state — `values`, `valueOverride`, `effectiveValues`, `viewOrders`, the load effect, the epoch mount,
a byte-identical `persistViewOrder` — and their reset rules have already drifted. Both re-derive the
same drag-capability gate chain, and there too they disagree: Cards gates on `isLocationFsOrder`,
Table doesn't, about which `shared/views.ts:308-310` says outright "both must read the same predicate:
when they disagree, one honors a key the other doesn't."

**Derived state stored beside its inputs.** `pinnedTabs` is a pure function of `pinned` and `tree`,
written by four call sites plus two initializers, with a diff guard at `store.ts:855` compensating for
the fact that it can disagree with its own inputs. `previewTarget` is `deriveTarget(preview)` stored
next to `preview`, set at six sites and nulled by hand at two more. Both should be selectors.

**`applyTree` runs the full reconcile twice per mutation** — once optimistically, once on main's
confirming push — including an IPC round trip for the system accent. Split it into a `setTree` the
optimistic path calls and a `hydrateNexusChrome` only the push path needs.

**Five fields model one finite page-load state.** `pageStatus`/`pageDetail`/`pageError` plus two
orthogonal flags, where `{status: 'ready', detail: null}` is representable, written as a four-field
tuple in seven places. This is the house rule's own example — model finite states as a union.

### Beyond a Session

Arcs, not cleanup. Each gets more expensive with every feature built on top of it. The `main/index.ts`
split and the MarkdownPM work have both been scoped out of here — see [[ContextPM]].

**The view host is copied per view type, and four more are declared.** `shared/views.ts:12` names six
view types; two exist. `TableView` and `CardsView` share roughly two hundred lines of identical
preamble — state, load effects, schema resolution, the view merge, the context memo, the
set-name/icon/path trio. `useValuesEpoch` and `useActiveView` are partial extractions of exactly this,
which is proof the instinct was right and stopped short. Every future view type pays those two hundred
lines, and every fix to a shared behavior lands in N places or diverges in N−1. One `useViewHost(source)`
hook turns List, Gallery, Calendar, and Timeline into "render this row model."

**Per-tab page state is modeled as global singletons.** `store.ts:256-259` holds one
`pageStatus`/`pageDetail`/`pageError` describing whichever tab is active. The last two commits before
the pass began are both consequences: one invented parked hosts, the other fixes the confusion the
singleton causes, and `DetailPane.tsx:88-92` now carries a five-line comment explaining that a parked
surface must read its page from its own tab's target rather than the selection. `PageView` takes an
optional `detail` prop and then subscribes to the store three times in order to ignore it. Keying page
state by tab makes `PageView({ tabId })` the whole signature, and it is what raising `WARM_TABS`,
split view, and the committed multi-window seams all wait on.

**The model-to-native menu conversion is down to one implementation, and the labels are not.** Five
shared modules emit `ActionItem[]` and are unit-tested; the table, view embed, and view button menus
now keep their labels in `shared/` alongside them. What remains is the rest of the main-side menus
pushing Electron options by hand with their label logic inline — `main/navRowMenu.ts:28` computes a
Pin/Unpin label in Electron code that its shared sibling computes in a tested pure function. The
native-versus-in-house *distinction* is settled and correct.

**Fire-and-forget writes have no seam.** Sixty-three channels return the `Result` envelope; the
renderer checks `.ok` at thirty-two sites. The gap is a coherent family — `folds.set`, `viewOrders.set`,
`personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown` and nine more — every one called as
`void window.nexus.x(…)`, every failure discarded. A locked file or a full disk produces a UI showing
the new fold state, the new column widths, the new tile heights, and persisting none of it, silently,
until restart. The error path already exists and is used at eight other call sites. One `persist()`
helper makes failure handling the default rather than something to remember; the pattern has already
been copied thirteen times. Whether silence is acceptable for this class is the open call below.

**Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon
picker. A 2,000-page Collection with eight columns mounts around 18,000 elements, and every pipeline
re-run reconciles all of them — the extensive memoization in both files is buying per-row bailout on a
list that shouldn't be mounted. Group bands complicate it, so the scoped version is to virtualize the
flat, ungrouped case first, where the win is largest and the band machinery is absent.

### Open Calls

Findings where the correct answer is not established in the codebase. Design and product decisions,
not cleanup.

**`cursor: default` versus `cursor: pointer` has no rule.** The split is roughly twenty sites each,
with design-system components consistently on `default` and feature surfaces mixed. Pick one convention
for clickable non-link controls and the sweep is mechanical.

**Cards has no selection highlight; Table does.** Navigating back into a Cards view gives no indication
of which page you came from. The same nexus state is visible in one renderer and invisible in the
other. Either selection is a view-level concern and belongs above both renderers, or it is deliberately
table-only and `CardViewPM` should say so — right now it reads as an omission.

**Cards has no loading or empty state.** Table shows "Loading…" while resolving and "No pages here"
when empty. Cards paints a blank grid for both, which is indistinguishable from broken. The house rule
says an unbuilt surface is simply blank — but *loading* versus *empty* versus *error* is a real
distinction, and the answer should be one decision made once in `ViewRenderer` rather than per renderer.

**A card drag and a row drag produce different on-disk results.** Dragging in an unsorted structural
view writes the canonical `page_order` from the Table and a per-machine `viewOrders` tiebreaker from
Cards. Same view, same gesture, different file. One of these is right; the other is a bug, and which is
which is a call about whether card ordering is meant to be portable.

**Card column-style changes wait for the round trip.** Right-clicking a Status value and choosing Pill
feels instant in a table and laggy on a card, from the same menu — Table applies an optimistic override,
Cards does not and the code calls this "v1-acceptable." Six lines to fix if it should feel the same.

**Persisted-write failures are silent by design or by accident.** The options: surface failures through
the existing `showError` path, add a quieter indicator in the subfield, or accept silence for this class
deliberately and write that down. The current state is the third option without the writing-down, and it
is the shape every future persisted preference will copy.

**Two retention budgets act on the same guests and neither knows it.** Parked page surfaces cap at 2
tabs; hidden web guests cap at 5. Parking works by moving the surface off-screen, which routes every
tile inside it through the hidden-guest path. Two parked tabs holding four web tiles each already
exceeds the guest cap, so the LRU evicts — and the live sessions parking exists to preserve get torn
down anyway. Either one budget with tiers, or the numbers get chosen together with the interaction
understood.

**`SavedView` is declared twice** — a ~32-field interface and a ~32-field zod codec, with nothing
enforcing agreement. Inferring the type from the schema is the fix and matches what
`shared/properties.ts` already does, but the doc comments currently live on the interface and would
move onto the zod fields. Worth confirming that trade before doing it; the alternative is a `satisfies`
assertion that catches drift at compile time while leaving both in place.

**The feature docs are split on their own heading convention.** Five documents use bare
`#### Section`; three use the `#### II. Section` prefix the convention calls for. Five-to-three against
the stated rule. Either the three shed the prefix or the five gain it, but it should not stay split.

**`QuickCapturePM.md` opens with a build-status banner** — the only document in the set that does, and
precisely the shape the placeholder rule pushes against. Defensible for a wholly unbuilt feature, which
is why it is a call rather than a finding. It is otherwise the cleanest-written document of the set.

**Two zoom ceilings exist and neither comment names the other.** `webGuests.ts` allows 0.25–5 for
host-level zoom; `shared/types.ts` caps guest zoom at 2. Almost certainly deliberate — one is
Chromium's visual range, the other the settings picker's — but confirm before anyone "fixes" the
mismatch, and add a line to each comment either way.
