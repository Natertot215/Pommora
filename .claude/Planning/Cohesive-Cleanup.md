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

The queue's realistic total is about 450 lines — under one percent. That is the honest number and
the reason to read the queue as a cohesion exercise rather than a size one: the value is that each
fact has one home, and the line count is what falls out of that.

### I. The Queue

Ordered by value per unit of risk. The first four are mechanical and prove themselves with a
typecheck; the rest want the app open.

#### II. One Properties Pane, Not Two

`Components/Detail/PagePropertiesPane.tsx` (373 lines) and `PagePreview/PreviewInspector.tsx` (366
lines) share 170 identical statements — the same context-registry derivation, the same value-commit
path, the same editing state machine, the same row rendering. They draw one surface in two windows.

Three things genuinely differ, and all three stay:

- **Where the page comes from.** The pane reads the active selection; the inspector takes a
  `PreviewTarget` and fetches its own detail through the warm cache.
- **The frame.** The pane sits in a `MenuScrollFrame` with a header and vanilla-extract styles; the
  inspector is a plain `pgpreview-insp` block with an edge fade.
- **Whether an unfilled Context row pre-shows.** Property rows follow one rule in both — visible once
  they hold a value or were added this session. Context rows do not: the pane shows every Context
  until it is explicitly set aside, so a Page states what it could be filed under before it is; the
  inspector shows a Context only once it holds a value. That is the whole of the behavioral
  difference, and `setAside` exists only in the pane because only the pane can hold an empty
  Context row worth dismissing.

The shape is a shared row component plus a `usePropertyRows` hook taking the page and one flag for
the Context pre-show rule; each host keeps its own frame and its own page source. Roughly 150 lines
leave — less than a full merge would take, and it costs no behavior change.

**Verification:** both surfaces side by side — every property type, an edit committed in each, a
rename reconciled, and an unfilled Context row present in the pane and absent in the inspector.

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

#### II. Two Counting Bugs In The Subfield

Both live in `Detail/Subfield/subfieldStats.ts` and both are one-line fixes.

**The fence inflates the character count.** `stripFences` replaces each masked line with a single
space, and `computeStats` strips only newlines before counting — so a hundred-line fenced block adds
a hundred characters. The line count is taken from the raw body and is unaffected, which is why the
three numbers disagree. Replacing the masked line with an empty string is the fix; the join's
newline already supplies the word boundary the space was there for.

**A page embed counts as prose.** The image rule matches `![alt](url)` only, so an `![[Page]]` embed
loses its brackets to the wikilink rule and leaves its `!` behind as a word. Letting the wikilink
rule see an optional leading `!` and blanking the whole match when it is present fixes it in place.

**Verification:** a page holding a long fence and a page embed; all three numbers agree.

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
