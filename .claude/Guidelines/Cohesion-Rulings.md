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
