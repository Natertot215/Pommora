## Cohesive Cleanup

The cohesion queue — work whose whole purpose is that the app states each thing once. Every entry
here was read in the code rather than inherited from a catalog, and each is sized to fit inside a
session beside other work. Nothing here adds a capability; the successful outcome is fewer lines
doing what the same lines do today.

Structural work that changes where whole subsystems live — the `main/index.ts` split, Table
hoisting, virtualization, the store split — is not in this document. It sits in `ContextPM`'s
Boring Work, because each of those is a session of its own with its own verification.

### I. Measuring It

The app is 62,543 real code lines at `d5c4413d` — TypeScript, TSX and CSS with comments, blanks,
tests, type shims and the deployed showcase excluded. `.claude/scripts/loc.py` produces that figure
per area, and `--history` walks the branch one sample per day.

The page that reads it is `.claude/scripts/Line-Ledger.html`, published at
https://claude.ai/code/artifact/9172cda5-707d-4b69-aaed-d154dd2dd485. To refresh it after a cleanup
session: re-run `loc.py --history`, replace the JSON blob in the page's trailing `<script
id="data">` tag, and republish to that same URL. The page's `baseline` field is frozen at
`d5c4413d`, so its Removed column is what the queue below has actually taken off.

The queue's realistic total is about 480 lines — under one percent. That is the honest number and
the reason to read the queue as a cohesion exercise rather than a size one: the value is that each
fact has one home, and the line count is what falls out of that.

### I. The Queue

Ordered by value per unit of risk. The first four are mechanical and prove themselves with a
typecheck; the rest want the app open.

#### II. One Properties Pane, Not Two

`Components/Detail/PagePropertiesPane.tsx` (373 lines) and `PagePreview/PreviewInspector.tsx` (366
lines) share 170 identical statements — the same context-registry derivation, the same value-commit
path, the same editing state machine, the same row rendering. They draw one surface in two windows.

**Eight things differ, and all eight stay.** An early reading of this entry claimed one; a sweep
against the code found the rest, two of them live bugs.

- **Where the page comes from.** The pane reads the active selection and can only show the open page;
  the inspector takes a `PreviewTarget` and resolves any path through the warm cache.
- **The frame.** `MenuScrollFrame` with a header and vanilla-extract styles, versus a plain
  `pgpreview-insp` block with an edge fade.
- **Whether an unfilled Context row pre-shows.** Property rows follow one rule in both. Context rows
  do not: the pane shows every Context until explicitly set aside, so a Page states what it could be
  filed under before it is; the inspector shows one only once it holds a value.
- **Chip hover-×.** The pane passes `remove` to `Cell`, so multi-select and Context chips are
  individually removable. The inspector does not.
- **The add-picker's Context remainder.** On a fresh page the pane offers zero Contexts (only ones set
  aside this session); the inspector offers all of them.
- **The add-picker's click gesture.** The inspector reveals the row *and* opens its value picker; the
  pane only un-sets-aside it, leaving the user to click.
- **The Add button's visibility.** On a page whose Collection has no schema and where nothing was set
  aside, the pane's button never appears at all; the inspector's always does.
- **Value chrome.** The inspector gives values a hover fill, a pointer cursor and a 65% width cap, and
  fixes its label column at 40%; the pane sizes both to content and has no value hover.

Five of those are visible product decisions, so one shared component would force a choice per
difference. Only the non-visual engine moves — four memos, both commit paths, `editRow`,
`revealAndEdit`, `editingDef`, and (once the `Clear` bug below is fixed) `rowMenu`, several of them
byte-identical across the two files. Rendering, visibility and chrome stay per-pane, and the Context
rule is parameterised with a comment naming it a standing design decision. Roughly 100 lines leave.

**Two live bugs sit inside this domain**, each fixed on its own rather than folded into the
extraction. `Clear` in `PagePropertiesPane` returns early without re-revealing the row, so the row
vanishes and Clear becomes indistinguishable from Remove — contradicting the comment three lines
above it and the contract in `shared/propertyMenu.ts`. And the pane resets its session state on any
tree identity change, so committing a Space — which writes tree data — closes the Context picker that
is meant to stay open for multi-toggle.

**Verification:** both surfaces side by side, with each of the eight differences checked
individually.

#### II. One Option-Reorder Hook

`Components/Detail/useOptionReorder.ts` (172 lines) and `useStatusReorder.ts` (208) share 102
identical lines, including a 47-line `onRowPointerDown` near-verbatim down to its comments.
`useOptionReorder` is the single-group case of `useStatusReorder`; the only real difference is that
`locate` partitions on a group axis first. No visual surface at all, and the pure model functions
underneath already cover the behavior — the highest line-count-per-risk item in the queue.

**Verification:** reorder in both editors, including across groups in Status and to both ends in
Select.

#### II. One Reorderable Option List

`Components/Detail/OptionEditor.tsx` (189) and `StatusEditor.tsx` (218) share 83 identical
statements, including the drag row's full JSX and its lint suppression. A Status option is a Select
option carrying a group; the list around it is the same list. One row component and one reorder host
serve both, leaving each editor its own option model. Roughly 90 lines leave.

**Verification:** reorder in both editors, add and remove an option in each, and confirm the Status
groups still band correctly.

#### II. The View Pipeline's Two Functions Leave The Table

`pickView` and `resolveContainerSchema` are exported from `Detail/Views/Table/TableView.tsx`, a
1,943-line component, and imported by `Components/Detail/SettingsPane.tsx`,
`Detail/Views/useActiveView.ts`, `Detail/Views/Cards/CardsView.tsx`, and
`Detail/Views/ViewRenderer.tsx`. Cards importing from Table is the import cycle. Both functions are
pure and belong in `Detail/Views/pipeline/`.

Line-neutral, zero behavior change, and it is the first step Table hoisting waits on.

**Verification:** typecheck.

#### II. One Page-Meta Router

`shared/pageMenu.ts` declares `PageMetaAction` as a union. Four places consume it by hand —
`Detail/Views/Table/TableView.tsx` twice (the cell menu and the row-grip menu),
`Embeds/connectionMenu.ts`, and `main/contextMenu.ts` — as `if / else if` chains with no
exhaustiveness check. The two chains inside `TableView` already disagree: the grip menu handles
`title:preview`, the cell menu does not, so a title cell offered Open Preview would silently do
nothing.

One `runPageMetaAction(action, ctx)` over a `switch` with a `never` default. Each host supplies the
handful of callbacks it can serve. Roughly 40 lines leave, and adding a menu row becomes a compile
error until it is handled.

**Verification:** every row of the cell menu, the grip menu, the connection menu, and the native page
menu, exercised once each.

#### II. `editFor` Takes A Typed Action

`MarkdownPM/editor/menu.ts`'s `editFor` takes the action as a bare `string`, splits it on `:`, and
casts each half. A row added to `main/editorMenu.ts` typechecks, reaches `setBlock`'s exhaustive
switch, returns `undefined`, and is swallowed — the same silent-no-op hole as the page-meta routers.
`FORMAT_ROWS` is already typed against the shared declaration; the block actions are not.

Line-neutral. The value is that the hole closes.

**Verification:** typecheck, plus the six formatting chords.

#### II. The Idle Page State Is One Fact

`store.ts` writes `pageStatus: 'idle'`, `pageDetail: null`, `pageError: undefined` as a three-line
block at nine sites. One exported `IDLE_PAGE` constant spread at each site removes about twenty
lines and makes the reset impossible to write partially.

This is the cheap half of the per-tab page-state work in Boring Work; taking it now does not
conflict with that, and makes it smaller.

**Verification:** typecheck and the store suite.

#### II. The Subfield Counts What The Editor Renders

`Detail/Subfield/subfieldStats.ts` hand-rolls nine markdown regexes that all exist canonically
elsewhere, and is wrong in five ways as a result. `MarkdownPM/detect/index.ts` says of one of them:
*"The single list-marker parser. Every layer reads markers through this — never its own regex."*
This file never inherited any of them.

Measured against the current code:

| Input | Today | Correct |
| --- | --- | --- |
| a three-line fence | `chars=4` | `chars=0` |
| `x \`code\` y` | `chars=5` | `chars=3` |
| `a ![alt](u) b` | `chars=5` | `chars=3`, and the `!` counts |
| `a\n---\nb` | `chars=3` | `chars=2` |
| `![[Page]]` | `words=1` | `words=0` |
| `- [ ] task` | `words=3` | `words=1` |
| `→ item` | `words=2` | `words=1` |
| `>> text` | `words=2` | `words=1` |

Two causes. **The placeholders:** four substitution sites replace something with a single space
meaning "nothing", and the character count strips only newlines — so every one inflates it. The
spaces are load-bearing for the word count, so the two measurements have to run against differently
substituted strings. **The regexes:** the private copies miss the `(?<!!)` guard that
`pageLinkPattern` carries, miss checkbox and arrow list markers, miss nested quote runs, and let
inline code span newlines — a stray backtick pair forty lines apart silently deletes the prose
between them.

One further divergence runs the other way: there is no image token anywhere in the editor, so an
inline `![alt](url)` shows its `!` as literal prose while the counter strips the whole thing.

**Verification:** a page holding a fence, a page embed, a task item, an arrow list and a nested
quote; all three numbers agree with each other and with what is on screen.

#### II. One View Host Under Table And Cards

`TableView.tsx` (1,943) and `CardsView.tsx` (1,469) hold roughly sixty identical statements of host
setup between them: values loading and its epoch, the optimistic value override, collapsed-group
state and its toggle, band ordering and its drop handler, `persistView`, schema resolution, the set
name/icon/path maps, `useActiveView`, `useViewOrders`, and `flattenContainer`. `useValuesEpoch`,
`useActiveView` and `useViewOrders` are partial extractions of exactly this — the instinct was right
and stopped short.

One `useViewHost(source)` returning a row model plus the persist handles. Roughly 150 lines leave,
and List, Gallery, Calendar and Timeline become "render this row model" rather than a fourth and
fifth copy of the host.

This is the largest item here and the one most likely to want its own session. It is also what makes
`shared/views.ts` naming six view types stop being a promissory note.

**Verification:** both renderers, grouped and ungrouped, with a band drag, a collapse, a value edit,
and a view switch in each.

#### II. The Drag Adapters' Remaining Frame

Arming the edge-scroll is one call now. What still repeats across the eight adapters built on
`usePointerGesture` — `paneDnd`, `BandDnd`, `tableDnd`, `OutlineDnd`, `groupingDnd`, `sidebarDnd`,
`useOptionReorder`, `useStatusReorder` — is the frame around it: tracking `lastPoint` on every move,
the `announce` on pickup, and the `teardown` that stops the scroll and nulls its handle. What differs
is the drop model and the announcement's wording, which is what should be the argument.

A wrapper over `usePointerGesture` rather than anything structural. Each adapter drives a
user-visible gesture, so this wants the app open.

#### II. Table's Column Readers Resolve Three Times Per Column

`colStyle`, `colAlign` and `colWidth` in `TableView.tsx` are plain functions called from the header,
the grid template, the reflow width, and each cell — `colStyle` at eleven sites. Memoizing them per
render against their actual inputs is a contained change with a measurable result.

#### II. Derived State Stored As State

`pinnedTabs` and `previewTarget` are held in the store beside the inputs they are pure functions of
(`derivePinnedTabs`, `deriveTarget`), which gives each a second writer to keep in step. Both become
selectors. Contained, but it touches tab restore and preview open, so it wants the app.

### II. The Exhaustiveness Sweep

A read-only sweep found twenty-two dispatch sites where a shared action union survives to the
consumer but nothing enforces that the consumer handles it. None is a live defect: every one covers
its union today. They are recorded rather than opened, because retrofitting working handlers is
churn, and because the codebase's dominant style is deliberately to rely on a non-nullable return
type instead of a `default` arm.

The rule that separates them: TypeScript enforces exhaustiveness on a `switch` only when the
enclosing function returns a real, non-nullable value. Menu dispatch almost always sits in a `void`
promise callback, which is why the shape is so widespread.

Take these first if the sweep is ever opened:

- **`Detail/Views/ViewPane.tsx:129` and `Blocks/ViewEmbedBlock.tsx:437`** — two chains over one
  union, each carrying an explicit `default: return` that silences the compiler *and* the bug. The
  suppression is the finding.
- **`MarkdownPM/editor/gripMenu.ts:107` and `:170`** — two switches over one union, each
  intentionally partial, neither saying so.
- **`Components/Detail/PropertiesPane.tsx:365` and `:374`, `PagePropertiesPane.tsx:167`,
  `PagePreview/PreviewInspector.tsx:199`** — four un-linked partial chains over `PropertyMenuAction`,
  each handling two of its five members.
- **`Detail/Views/Cards/CardValue.tsx:115`** — handles only the `cell:*` half of `CellMenuAction`. A
  title column reaching it would pop the full nine-row page-meta menu with none of it handled; the
  only thing preventing that is a `kind !== 'title'` filter in `cardValueInput.ts:37`.
- **`Detail/Views/Table/TableView.tsx:975`** — the cell-menu chain omits `cell:hide`, dead only
  because `hideable` is passed `false` at `:961`.

Two things this sweep must not produce. There is no `assertNever` helper and one should not be
added: the house idiom is an inline `const _exhaustive: never = x` in a braced `default:`, and it
exists at exactly two sites, both main-process. And where a partial dispatch is deliberate — the
connection menu's `format:*` members, which its page branch cannot produce — the answer is a narrowed
type, not a `never` arm.

### II. Blocked On A Decision

Cheap once decided, and wrong to guess at.

- **A `persist()` helper for fire-and-forget writes.** Sixteen call sites discard the `Result` of a
  persisting channel — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`,
  `blocks.writeMarkdown`, `embedHeights.set`, `tableHeadingColumns.set`, `aliases.set`,
  `headingIcon.set`, `hoverCard.save`, `nav.write`, `tabs.save` and the rest — so a locked file or a
  full disk shows the new state and persists none of it until restart. The helper is line-neutral;
  what it needs first is the ruling on whether silence is acceptable for this class, which is an Open
  Call in `ContextPM`.
- **`cursor: default` versus `cursor: pointer`.** Roughly twenty sites each, design-system components
  consistently on `default` and feature surfaces mixed. Pick the convention and the sweep is
  mechanical.
- **Whether a title cell's menu should offer Open Preview.** The grip menu does and the cell menu
  does not. The one-router item above makes the divergence visible; it does not decide it.

### II. What The Audit Retired

Recorded so a later sweep does not re-derive them. Each was claimed as open and is closed in the
code as of `d5c4413d`:

- **Cards patching over the wrong identity key with a redundant lookup.** `CardsView` keys its
  optimistic patches on `row.id` throughout.
- **Cards' two commit paths.** There is one, through `applyValueAtRoot`.
- **`PageCard` subscribing every card to `s.tree`.** The file no longer exists.
- **`applyTree` carrying the accent IPC on every reconcile.** The system accent is cached per Nexus
  and read once.
- **The eight drag adapters each arming their own edge-scroll.** `armAutoScroll` is one call.
- **The settings footer's lock button written three times.** One `FooterLockButton` serves the board,
  the Space, and the tile.

One claim could not be confirmed and is not restated anywhere: a "duplicated container-session state
whose reset rules have drifted" names no construct in the codebase under that vocabulary or any near
it.
