## Creation Affordances — Decision Log

### Frame
- **Purpose:** In-view page creation, TableView first — the group-band "+" made real, New Page Above / Below on table rows and sidebar pages, and later a hover ghost row. Every trigger runs the same single act.
- **Core Value:** Creating a page never leaves the view — the new row appears where the gesture happened, ready to name.
- **Success Criteria:** Band-add, row-menu add, and sidebar-menu add all produce a correctly-placed, correctly-stamped page whose title field opens empty with the caret in it, resolving to Untitled on any exit without a name.

### The Model

Every creation affordance runs one act: on click, the page exists — created on disk as Untitled, immediately and completely, with no intermediate state of any kind. The view shows it as an ordinary row, and its title cell opens as an ordinary uncommitted rename whose field is empty with the caret placed. Confirming names the page; leaving any other way — click-off without typing, Esc, a collapse, a view switch — leaves an Untitled page exactly as it was created. The row lands where the gesture happened not because anything holds it there, but because the creation stamps the values and writes the order that make the pipeline itself put it there.

### Sources
- [[TableViewPM]] — the hover "+" on structural set headers, affordance alone; inline-edit rules (Enter = confirm · click-out = save · Esc = revert); band seam law and gutter.
- [[ViewsPM]] — the pure pipeline (columns → filter → group → sort); Pending §Group-band creation ("waits on the creation design" — this log is that design).
- `Pommora/src/renderer/src/Detail/Views/GroupBand.tsx` + `cardsBand.ts` — the "+" renders with no `onClick`; the seam is an `onAdd` prop; `bandShowsAdd(kind) => kind === 'structural-set'` gates it, shared with Cards.
- `Pommora/src/renderer/src/Detail/Views/Table/reassign.ts` — `groupKeyToValue(groupKey, type)` maps a band to a `PropertyValue` (status/select/checkbox; date buckets excluded).
- `Pommora/src/renderer/src/store.ts` — the optimistic create ships (`insertCreatedInTree` + `onCreated`, firing before the confirming reload so the rename field mounts instantly). `createPage` currently writes identity keys only — the IPC arm drops the writer's options bag.
- `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — `values` loads per-container with `valueOverride` as its optimistic patch layer; both order writers exist (`viewOrders.set` for sorted/property-grouped, full-array same-parent `movePage` for structural).
- `Pommora/src/renderer/src/Detail/Views/pipeline/sort.ts` — `viewOrders` is the lowest-priority tiebreaker; a row absent from it ranks last; unknown select/status rank last, absent numbers/dates first.
- `Pommora/src/renderer/src/Detail/Views/PropertyEditing/PropertyEditor.tsx` — the table's title editor (controlled, autoFocus, unmount-flush, Escape → cancel); the sidebar renames through `RenamableLabel`/`EditableInput` off `renamingPath`.
- `Pommora/src/main/crud/page.ts` — creates auto-disambiguate (`createDisambiguated`); plain renames reject a colliding target.
- `Pommora/src/renderer/src/design-system/interactions/autoscroll.ts` — `scrollGlide` with a per-frame re-read destination; interrupts on window-level `wheel`/`touchstart`/`keydown`, no target filter.
- `Pommora/src/renderer/src/Detail/Views/Table/Table.css` — borders descendant-scoped off `.table-grid.no-borders`; `.cell-active` is the borderless editing ring.
- `Pommora/src/shared/pageMenu.ts` — `pageMetaMenuItems` feeds the table title-cell and card menus; both routers are if/else chains with no default, so an unrouted action renders live but inert.
- `Pommora/src/main/contextMenu.ts` — the sidebar page menu, hand-rolled and main-side; `ContextTarget` carries no sibling order. Its create path already ends in the rename field (`begin-rename` → `renamingPath`).
- `Pommora/src/main/order.ts` + `main/crud/reorder.ts` — `page_order` resolves in array order; absent ids land in an alphabetical tail, so every order write must carry the full array.
- Label census — "Open in New Tab": `shared/pageMenu.ts`, `main/contextMenu.ts`, `main/navRowMenu.ts`, pinned by `cellMenu.test.ts` + `cardMenu.test.ts` (and a `tabsModel.test.ts` description). "Open in Preview": `main/contextMenu.ts`, `main/navRowMenu.ts`, `main/connMenu.ts`. Docs carrying the wording: NavigationPM, PagePreviewPM, ConnectionsPM.

### Decisions

#### A — The Creation Act
- **A-1:** [confirmed] Immediate and complete — a real page in the Collection/Set, titled Untitled, an ordinary row from frame one. Views never modify their source; "created in the view" means created in the container with the values that make the view show it.
- **A-2:** [assumed] One write — `createPage` widens to carry the seed values (main resolving the definitions the way the `setProperty` arm does), so a page is never created unstamped. The structural order write rides the same mutate where it can — two separate mutates each fire a full reload, so the row would visibly sit at the alphabetical tail for a beat before jumping to its slot.
- **A-3:** [assumed] The row appears through the optimistic create that already ships; its `onCreated` hook is where the rename field opens. Nothing parallel gets built.
- **A-4:** [confirmed] A colliding name — at creation or in the first commit — auto-disambiguates the way every create does. The typed name is part of the creation, so the rename path's error-and-reject never fires here.
- **A-5:** [assumed] The rename session carries an opened-by-create flag — a property of the UI session, not a page state. It is the one bit that drives everything the first commit does differently: the empty field (C-1), the auto-disambiguation (A-4), and skipping the rename's nexus-wide link cascade — a just-created page has no inbound links, and an unguarded cascade keyed on the literal "Untitled" could rewrite unrelated `[[Untitled]]` links. The rename reply widens to return the landed name, so the tree patch and any cascade consume what actually landed rather than what was requested.

#### B — Placement
- **B-1:** [confirmed] The birth context stamps the page: a band-add creates inside that Set; New Page Above / Below inherits its anchor's group value and its anchor's values on the active sort criteria (skipping multi-value properties and non-user criteria like Title and Modified); a filter's clean implications stamp too.
- **B-2:** [confirmed] The filter and the group both apply their matched properties to the new page. A filter rule implies a stamp when it names a single unambiguous value on a user property; metadata is never changed to satisfy a filter, and where a filter implication would contradict the gesture's own context, the gesture wins. The exact rule matrix is planning's to pin.
- **B-3:** [confirmed] Under a non-derivable filter — title contains, creation dates, and their kin — the page creates and the filter excludes it immediately: no row, no in-view rename. The Obsidian behavior, accepted.
- **B-4:** [confirmed] Band-add lands at the pipeline's own end of the group — the bottom under the default order, wherever an absent value ranks under an in-group sort (top, for an ascending number or date). The autoscroll targets the row's resolved position, never an assumed bottom. A band-add on a collapsed band discloses the band as part of the add.
- **B-5:** [assumed] The order writes land at creation through the writers that already exist — the gesture slot into `viewOrders` for a sorted or property-grouped view, the full `page_order` array through the same-parent `movePage` for structural or flat — with two corrections the code demands: the `viewOrders` write also updates the renderer's local copy (the one cache with no round-trip; today's drag path goes session-stale for the same reason), and every order array builds from the container's full membership, never the view's visible rows — an array built post-filter permanently re-ranks every row the filter was hiding.
- **B-6:** [assumed] Seeds also patch the renderer's value cache through the existing `valueOverride` layer — a stamp that only reaches disk resolves blank in the view until the next values load.
- **B-7:** [confirmed] After the rename confirms, any movement is just the pipeline reacting to the new title — a title sort re-placing it, a title filter's verdict. No settle machinery exists.
- **B-8:** [confirmed] Above/Below under a Title or Modified primary sort — nothing sensible to seed, so the new row lands wherever "Untitled" sorts, rename field riding along. Accepted: the items always work, the pipeline always places, and renaming re-places the row live.

#### C — The Rename Field
- **C-1:** [confirmed] The field opens genuinely empty with the caret placed (drawn by `nativeCaret.ts`) — never "Untitled" pre-filled or highlighted; the page's title is still literally "Untitled" until it's changed on disk.
- **C-2:** [confirmed] Enter and click-out save the typed text; an empty commit, Esc, or any other exit leaves the page Untitled. Esc is the standing inline-edit revert, unchanged.
- **C-3:** [confirmed] The band-add autoscroll and typing don't fight — the title editor stops propagation on every keydown before the window-level glide interrupt can hear it. No shape to pick.
- **C-4:** [confirmed] The empty-field style applies everywhere page creation ends in a rename — the sidebar container menu's New Page and the subfield "+" convert from their prefilled select-all, the `begin-rename` channel carrying the style. One creation feel across every surface.

#### D — Menus
- **D-1:** [confirmed] The row's drag grip gets its own right-click menu on MarkdownPM's grip interaction model (right-press defaulted away, [[Editor-Internals]]; `main/gripMenu.ts` the pattern). Order: Open Preview · Open New Tab — Rename · Change Icon — New Page Above · New Page Below — Delete. This replaces the current bubble-to-cell behavior on the grip.
- **D-2:** [confirmed] Sidebar page rows gain New Page Above / New Page Below, writing into the sidebar's manual `page_order`; the sidebar menu otherwise keeps its own shape (Reveal in Finder, the native delete confirm).
- **D-3:** [confirmed] The in-drop label renames land at every live site — "Open in New Tab" → "Open New Tab", "Open in Preview" → "Open Preview" (the connection hover menu included), tests and doc mentions riding along. A completion condition, noted in the History entry.
- **D-4:** [assumed] The grip menu composes from a parameterized `pageMetaMenuItems` (an explicit item set per consumer) rather than a second hand-rolled list; the title-cell and card menus keep their current shape, so their routers gain nothing inert.
- **D-5:** [assumed] The sidebar pair routes through the renderer's `store.mutate` (the `createFromMenu` shape) — `ContextTarget` carries no sibling order to compute a position with, and every `page_order` write carries the full array.

#### E — Scope & Surfaces
- **E-1:** [confirmed] The band "+" is structural-only this arc; the property-bucket "+" is a Prospect, and the identical Cards glyph stays inert (unchanged from today) rather than half-wiring the shared gate.
- **E-2:** [confirmed] The new row's border follows the table's bordered/borderless state as-is — no state token minted; `.cell-active` is the existing borderless editing cue.
- **E-3:** [confirmed] Cards creation is secondary, but the stamping and placement layer lives view-agnostic so the card chrome drops in later; only the affordance is per-renderer.

### Execution Verification (owned by the executor, CDP-driven — never Nathan)
- The on-disk create's watcher echo: the open rename field survives the write-echo beat under the live caret.
- The pre-focus gap: a keystroke landing between the band-add glide starting and the field taking focus neither stops the glide short nor vanishes.

### Blast Radius (docs this design makes stale)
- [[TableViewPM]] — the grip's right-click behavior, the band "+" prospect resolving, the in-birth rename.
- [[ViewsPM]] — Pending §Group-band creation resolves into this design.
- [[SidebarPM]] — the page menu's new pair.
- [[NavigationPM]] · [[PagePreviewPM]] · [[ConnectionsPM]] — the label renames they carry in prose.
- [[PagesPM]] — creation entry points, if it enumerates them.

### Core (must-have)
- Band-add on TableView creating stamped, placed, autoscrolled-to pages.
- The in-line row with empty-title caret entry and the Untitled fallback.
- The grip right-click menu with New Page Above / Below.
- Sidebar-menu New Page Above / Below.
- The in-drop label renames, everywhere applicable.

#### Final Phase (fenced — built only after the core proves)
- **Hover-dwell ghost row** — dwelling on a row extends a ghost-styled "New Page" row below it at the inactive state. The ghost is pure chrome — pixels only, no page until the click, which runs the same immediate-create act as every other trigger. Mints the pending `--state-inactive` token (the ride-along debt item).

#### Prospects (allowed later, not now)
- **The property-bucket "+"** — Status/Select/Checkbox bands creating at a ruled location with the band's value pre-filled; date buckets stay affordance-less. Don't-foreclose: the `onAdd` seam and the stamping layer are the same ones this arc builds.
- **CardView creation affordances** — same engine, card-shaped chrome; un-inerts the Cards band glyph the shared gate already renders.

#### Out of Scope (won't do)
- A dedicated per-view creation button — layout-level work the hover ghost row exists to obviate.

#### Considered & Rejected
- **Any intermediate "draft" state** (pipeline-exempt, pinned, inert, or renderer-only rows) — the act is atomic: page first, rename second. Placement belongs to the pipeline reading real seeds, not to machinery holding a row.
- **Select-all "Untitled"** — the field opens empty; Untitled is the fallback, never the pre-filled text.
- **Esc deleting the page** — creation already happened; Esc is just the rename's revert. No deletion-record noise for a page that was never named.
- **Seeding filter-implied values from every rule shape** — Any-groups, negatives, and metadata rules have no single answer; the match applies only where it's clean.
- **A second optimistic-create layer or hand-rolled menu list** — the store's optimistic create and `pageMetaMenuItems` already exist; both get extended, never duplicated.

#### Lessons
- A `[confirmed]` product call doesn't confirm its mechanism — the adversarial round found stamps that never reach the renderer's value cache and a tiebreaker that ranks absent rows last. Check the renderer's caches (`values`, `viewOrders`, the tree), not just the disk write.
- Two explorers can disagree — one reported "no optimistic create exists" over the exact lines where it ships. Agent findings are hypotheses until the cited lines are opened firsthand.
- When Nathan's framing sounds like it implies a state machine, ask what the words mean before modeling — "ghost" meant a visual style, and a whole draft-state design got built and torn down on that one word.
