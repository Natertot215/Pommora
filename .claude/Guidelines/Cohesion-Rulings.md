## Cohesion Rulings

What a cohesion sweep would otherwise re-derive wrongly, and what it should stop re-proposing. Every
entry here was reached by reading the code, and each one contradicts a conclusion that reads as
plausible from the outside. Reopen any of them with a reason, not with a fresh reading.

### Claims That Did Not Survive The Code

- The two card families share **two** declaration-identical rule pairs, not six. Four more share most
  of a rule while differing meaningfully.
- The 1px pane divider has **one** shipped consumer. The other seven are the Interaction Lab, a
  dev-facing surface with its own visual language. A token for one caller is ceremony.
- Neither comment about `.open-btn`'s hover is wrong. The tokens read exactly as documented — hover
  is the lighter of the two — and only the button consumed them backwards.
- `Carets.css`'s "only two literal easings" are `ease-in-out` keywords, not literals.
- `trash:list` costs what the trash holds and no more. It walks to each bundle and stops there,
  reading one small record per deletion, and the pane asks for it on open and after each action —
  every one of which changed `.trash`. A memo would need invalidating from every trash write, which
  is a second writer for one fact, and would hit on almost nothing.
- The property and schema handlers are ten, not fifteen. Four clearing or removing an option, two
  retitling one, and four narrowing a payload onto a def edit share a shape and are served by three
  combinators; the rest differ in payload and arity, and a combinator over them would cost more than
  it saves.
- The editor's `zoom` prop is passed — from a board tile and from a page embed — so neither half of
  the zoom module is unreachable.
- The two relocate drags' edge readers are not one function. The block drag reads a block's outer
  bottom above a gap; the list drag reads a line's inner right edge inside a box. Different edges,
  different conditions.
- `.trash` and `.nexus/` are spelled at **9** and roughly **30** code sites, not 71 and 94. The
  larger counts include every doc comment naming the folder, which is prose about the layout rather
  than a second spelling of it.
- No shared tested function computes a Pin/Unpin label — `shared/navRowMenu.ts` is types only. The
  toggle wording that *did* have a shared home and a hand-rolled twin was Open / Open New Tab, and
  the icon toggle's two spellings ran over opposite predicates.
- `SavedView`'s interface and its zod codec are not an unguarded duplication, and a field on one
  and not the other is **not** dropped on read — `z.looseObject` passes undeclared keys straight
  through, which is what makes foreign keys survive a rewrite. The narrow real exposure is that an
  interface field the codec never declares reads back unvalidated and without its `catch` default.
- `parentOf` has one definition and had five callers written by hand; the bare
  `slice(0, lastIndexOf('/'))` those used eats a root-level name's last character, which no live
  path reaches only because pages always sit inside a Collection.

### Decisions Taken

- `shared/pageMenu.ts`'s leading-separator drop stays. A test asserts the *model* drops it, which is
  a contract on the model rather than an artifact of how a menu happens to be drawn.
- Cross-document restatement stays. `ViewsPM` owns the shared mechanisms and the per-surface
  documents defer to it explicitly while describing what their own surface dresses it in — that is
  behavior a reader of `CardViewPM` needs.
- `gripMenu`, `trashMenu`, and `contextMenu` keep their main-side shape. The first resolves object
  actions through an arbitrary-depth pick tree that `ActionItem` cannot express; the second already
  keeps its labels in `shared/` and pops through the nesting primitive; the third runs its writes
  inline rather than resolving an action, so it is a different chassis rather than a model.
- 13px joined the icon ladder as a real step, and the ladder absorbs every size the app uses.
- `schema:changeType` is live scaffolding with a keep-ruling, not a dead channel.
- The full-weight view tiles and the group band's `+` stay as they are. They are not house-rule
  violations and do not want dimming.
- `Tables/codec.ts`'s `parseTable` is production-dead on purpose: it is the reference implementation
  `modelFromRegion` is pinned against in `Tables/regions.test.ts`. Production-dead is not dead.
- `GlassWindow`, `GlassSurface` and `GlassControls` are deliberate semantic slots, not duplication.
- The autocomplete panel's row does not adopt the shared menu-row primitive. Taking its metrics
  changes how the panel looks, which is a design decision rather than a consolidation.
- `PageHeader` stays driven rather than store-reading. A floating preview draws a page that is not
  the active one, so a header reading the active page would draw the wrong title.
- The insert-an-id-at-an-index idiom stays written out. Its four sites differ in whether the id was
  already removed and in whether the list is being built or replaced, so a shared helper would take
  a flag for each — where `moveItem`'s five callers differ only in the lookup that produces their
  indices, which is why that one earned a definition.
- `Tables/operations.ts`'s `splice` helper is not `moveItem`. It is a mutable insert-and-delete over
  a table's cells, arity included; the shared one lifts a single item immutably.
- `SavedView` keeps its hand-written interface, and `shared/views.ts` keeps the header rule that
  contradicts `properties.ts` and `schemas.ts`. Those three files genuinely want different things:
  a loose codec's inferred type carries an index signature, so deriving `SavedView` from
  `savedView` would cost excess-property checking on a thirty-two-field object the whole renderer
  writes — proven by a probe where the interface rejected a stray key and the inferred type
  accepted it. The other files' shapes are small or internal enough not to pay that.
- Table's row-selection tint is an editing mechanism — it marks the row you are inside — and does
  not carry over to Cards (Nathan's call, 08-20). Cards wanting a came-from marker is a separate
  question nobody has asked for.
- `embedWidget.tsx` is not split. The split is a move rather than a reduction, and the construct that
  would have reused its generic half — a document's footnotes section — is a fold region rather than
  a block widget.

- `assetRoots.ts`'s `startsUnder` and `assetSubfolder` stay two functions. Both case-fold a root
  prefix and they differ only by strictness and by what they return, which is why a sweep proposes
  merging them — it has now been proposed twice. `startsUnder` is the security predicate running
  ahead of `resolveUnderRoot`; `assetSubfolder` answers a display question. Sharing a helper puts
  the boundary check behind an abstraction serving a position lookup, which is the same reason the
  earlier ruling kept it apart from `exclusion.ts`'s `prefixMatcher`.
- `FileLabel` and `FileChip` are two recipes on purpose. A name inside a FIELD is that field's
  content and takes no chrome — a box around it is a box in a box; a file property's VALUE stands
  beside other values in a cell and takes a box the way they do. They render the same string and
  mean different things, which is why they differ in TREATMENT over one shape rather than in shape.

### The Exhaustiveness Sweep

A read-only sweep found twenty-two dispatch sites where a shared action union survives to the
consumer but nothing enforces that the consumer handles it. None is a live defect: every one covers
its union today. They are recorded rather than opened, because retrofitting working handlers is
churn, and because the codebase's dominant style is deliberately to rely on a non-nullable return
type instead of a `default` arm — TypeScript enforces exhaustiveness on a `switch` only when the
enclosing function returns a real, non-nullable value, and menu dispatch almost always sits in a
`void` promise callback.

Take these first if the sweep is ever opened:

- **`Toolbar/ViewPane.tsx:128` and `Blocks/ViewEmbedBlock.tsx:437`** — two chains over one
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

Two things the sweep must not produce. There is no `assertNever` helper and one should not be
added: the house idiom is an inline `const _exhaustive: never = x` in a braced `default:`, and it
exists at exactly two sites, both main-process. And where a partial dispatch is deliberate — the
connection menu's `format:*` members, which its page branch cannot produce — the answer is a
narrowed type, not a `never` arm.

### Closed By The Cohesion Audit

Each of these was claimed open and is closed in the code as of `d5c4413d` — a later sweep
re-deriving any of them is reading stale claims:

- Cards keys its optimistic patches on `row.id` throughout and commits through one path,
  `applyValueAtRoot`.
- `PageCard` no longer exists; no card subscribes to `s.tree`.
- The system accent is cached per Nexus and read once, not carried on every reconcile.
- `armAutoScroll` is one call; no drag adapter arms its own edge-scroll.
- One `FooterLockButton` serves the board, the Space, and the tile.
- "A duplicated container-session state whose reset rules have drifted" names no construct in the
  codebase under that vocabulary or any near it.
