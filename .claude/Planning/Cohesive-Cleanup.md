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

Ten items landing moved the figure by sixteen lines. That is the honest number and the reason to
read this queue as a cohesion exercise rather than a size one: roughly five hundred lines of new
shared homes replaced roughly the same in duplicates, and what was bought is that each fact has one
place to be wrong instead of two. The four that remain are worth about two hundred more.

### I. The Queue

**Ten of these landed on 08-20-2026 (→ PM-111), and their entries are struck from below.** What
remains is the four that did not: the view host, the drag adapters' frame, Table's column readers,
and the derived state held as state. Each still wants the app open rather than a typecheck.

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
  does not — the same page, two menus, one of them a row short.

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
