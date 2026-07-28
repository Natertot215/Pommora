## Context — Pommora React

### Current Focus

The React rebuild of the Swift paradigm reached its finish line at v0.5.0 — Page Previews and the Subfield unification pulled React past where the SwiftUI build ever got. That's the baseline the roadmap counts forward from, not a target still to hit, and it's mostly my own live drive from here.

**Contexts & Spaces is on `main`.** The registry model, the shared floating-window chassis, the Settings window, the lint and accessibility campaign and the FilterPane rebuild all merged, so the build counts forward from a user-defined context layer over a two-renderer pipeline. Both nexuses run the registry shape, and with every one migrated the `tierN` era is closed in code: no migration, no read-healing, no legacy recognition. A nexus left at the old shape can no longer be opened — the conversion is gone, not dormant.

**A full cleanup pass closed out the merge.** Every feature doc was audited against real code, the retired Context vocabulary left the source, the whole tree had its comments cut to what a reader couldn't reconstruct, and the repeated shapes across the IPC layer collapsed to one owner each. A dozen defects were found and fixed along the way — most present before the session started, none of them reported.

**Nothing is mid-flight.** The next focus is open, and the list below is what came to mind rather than a mandate — if something else matters more, take that instead.

- **In-view page creation.** Creating a page from inside a view is sparse across every surface. The one on this list that would be felt daily; wants a brainstorm loop, not a patch.
- **PagePreview hover.** Unbuilt, self-contained, no dependencies.
- **Cross-location card reordering** in views — scoped and mechanical.

Behind those sit two smaller knowns: the IPC boundary flattens its structured error to a bare string at thirty-one sites, so the closed error union can't reach the renderer; and a property type-change flow is built end-to-end in main with no way in.

### Recent Work

#### The cleanup pass (07-27)

The merge's aftermath, audited rather than built on. Every feature doc was re-grounded against real code, which surfaced a run of defects — most live before the session and none reported. The behavioural outcomes are in the feature docs; what's durable here is the shape they shared.

**A fact with two sources is a defect.** An order key read by two sites with opposite defaults, a Context column named one thing in one layer and another below it, two page-value writers governing different frontmatter keys, a code mask the editor applied three ways and the write side not at all. Each read as an inconsistency and each was live. The fixes remove the second source rather than reconcile the two — narrow a type until the wrong call can't be written, delete the duplicate, route both callers through one owner. A guard that catches the bad case leaves the bad case reachable.

That ran forward as construction: the repeated shapes across the IPC layer collapsed to single owners, with every channel verified identical across the change. The tree also lost its plan-task tags and the comments that only restated the code beneath them. → [[Views]] · [[Connections]] · [[Pages]].

#### Contexts & Spaces — the registry model (07-22 → 07-27)

The three-tier taxonomy was the last fixed thing in an otherwise user-defined system, so it became a registry: Contexts are entries in `.nexus/contexts.json`, each carrying an ordinary minted ULID whether seeded or user-created, Spaces live as folders under `.nexus/contexts/<Context>/<Space>/`, and membership is a bracketed title key at every entity root. Validation is registry-membership at read — an outside edit with a valid title registers, a typo sits inert until the file's next real write repairs the case-class misses and drops the unknowns, never guessing.

The dangerous parts got their own machinery: renames cascade titles across all three file scopes under a pending-rename journal that replays on open (a crash forward-completes instead of letting the repair pass eat valid tags), the migration bumps its version last so a kill re-runs the remainder, and every sidecar RMW goes through one strict read chokepoint that fails rather than clobbers a transiently-unreadable file. Migration re-entry keys on the **version alone**, never on the presence of tier directories, because an earlier step consumes those.

A Space became the second BlockHost — it owns a block document, tiles live in its folder, and the doc load keys on host identity rather than kind. The sidebar renders every registry Context as its own disclosure of Space rows, with scoped creation landing directly in a rename field and group headers dragging to reorder. → [[Contexts]].

#### Closing the tierN era (07-27)

With both nexuses confirmed on the registry shape, the entire backward-compatibility surface came out rather than staying as dormant weight — the migration, the read-healing, the legacy key modelling, the tier helpers. The seeded Contexts took ordinary minted ULIDs, so nothing is named after the model that replaced it. **A compatibility path is a liability once its last consumer is gone:** it can never again be exercised against real input, and every future edit has to reason about a shape that no longer exists on disk. The stated consequence is that a nexus left at the old shape can no longer be opened.

**A Context column's vocabulary followed.** The pipeline resolved one as a `tier` sentinel while the property type it renders is `context`, so surfaces translated between the two and the filter carried them as separate arms. It is one name now.

#### The Docs Meet the Code (07-27)

Every feature doc was rewritten against the source, each claim opened at the code before it survived. The durable lesson is the *shape* of doc error: Architecture carried the most because it described machinery at a distance. **Docs drift hardest where they restate mechanism instead of naming it** — which is why the passes cut on sight and restated only what a reader couldn't infer. Icons became **SymbolsPM** and absorbed the registry's own hand-kept mirror, which had already gone stale: the registry is the roster, and a doc duplicating it is a second source that can only diverge.

#### PreviewPane — the shared floating-window chassis (07-24 → 07-25)

The app had three near-identical floating windows and no shared chassis. `PreviewPane` is now the one surface every in-app window mounts: glass, geometry, the dismissal contract, a three-slot overlay toolbar, two side-pane slots (overlay *or* in-flow), a collapsing footer, and the glass tint as a prop. The Page Preview and the NavWindow both migrated onto it and `FloatingPane` was retired, verified against a captured pre-refactor baseline at 15/15 states pixel-identical. Standing that chassis up made a real Settings window cheap enough to build, so the ribbon's Settings glyph — a documented no-op since the ribbon was built — now summons one.

Two rules a future window must respect, both learned the hard way: **openness drivers stay declared per-window**, because a driver declared once at app level leaks into every consumer; and **a FLIP measures from the surface root** via a real ref, never by walking `parentElement`. → [[PagePreview]] · [[Configuration]].

#### The lint and accessibility campaign (07-25)

The a11y backlog was closed and lint now runs clean. Every non-button click surface activates on Enter and Space through one shared primitive, and a keyboard-opened menu paints a house focus ring rather than Chromium's default outline. The campaign's own lesson is the durable part: it shipped **three regressions its gates could not see** — Space could not be typed in any inline rename, keyboard drag-reorder was silently killed at four sites by re-declaring `role`/`tabIndex`/`onKeyDown` after a props spread, and several suppression comments asserted things that were not true. Biome's `noConfusingVoidType` autofix was also wrong here: rewriting a callback's `void` return to `undefined` breaks assignability. → [[Lint-And-Accessibility]].

#### The FilterPane rebuild + the picker chassis (07-26 → 07-27)

The filter engine had shipped with no authoring UI on either door. The pane returns with per-row sizing, Location as a disclosable Set tree with a fixed-width picker, an All/Any footing carrying no label, and an on/off switch independent of the rules. Its needs made `PickerMenu` the second shared chassis, which gained four capabilities every picker now has: `origin` (which edge the pane pins to, replacing the old `center` boolean across all seven consumers), `maxHeight` routed through one `MenuScrollFrame`, a fixed content `width`, and `optionRing` with run-merging.

Alongside it the design system gained two contracts. `--field-ring` is the input layer's one outline channel — consumers set the colour, never the shadow — and `stack.ts` names every z-index in three ladders, so a new surface picks a rung rather than a number. → [[Views]] · [[DesignPM]].

#### Cards View — complete renderer + hardening (07-19 → 07-20)

The first v0.6.0 renderer, taken from ratified plan through a full hardening campaign. The renderer itself: the shared container/embed seam, a draggable Set Cards row, flattened disclosure bands, Sort-by-Location flatten, per-value interaction on the table's cell leaves, the two-stage add menu (now "everything not currently shown; picking reveals" — hidden tiers/contexts pane through the context picker), and the native card + banner menus. The hardening: the compact ×-steal value-loss class killed (the × is inert until hover-revealed; the drop gate keys on embed zoom), the link seam made alias-preserving, the number Bar look gated by one divisor predicate across all four surfaces, and the Bloom law made structural — the value/calendar/add pickers live at ONE grid-level host (`CardPickerHost`) that row churn can't tear, with PickerMenu dev-erroring on any mid-open unmount. The settings panes got real floating drag ghosts (the missing chip read as "dragging behind the glass") and their label-primary titles back. → [[CardView]] · [[Cards View — Decision Log]].

#### Card drag rework + shared move/disclose mechanisms (07-20)

The card drag felt "very finicky," and two exploration agents plus a build-breaker traced why: the cross-zone drag engine had reintroduced every problem the proven single-zone engine already solved. So it was rebuilt — row-bucketed hysteresis (the index used to flip-flop across top-aligned unequal-height cards, which was the finicky), a cached-bounds model instead of a `getBoundingClientRect` every pointer-move, a synchronous per-band-entry pad replacing a per-move effect that had left frozen rects a row stale, plus a stranded-drag guard for a release outside the window. The lifted card became a faithful full card rather than a title glyph, by extracting one `CardFace` both the live card and the drag overlay render, inside a `.cards-view`-classed carrier so its size vars resolve; whole-card drag came from moving the engine off pointer capture to window listeners so a tap still clicks.

Three capabilities came out of that base and reach past cards. Group headers spring open when a drag dwells over them for about half a second — engine-agnostic, so cards and the table both get it. A row or card dropped into another folder-band now moves the page (`movePage`) rather than doing nothing. And a shared optimistic tree-move (`treeMove.ts`, unit-tested) patches the in-memory tree the instant any move's write lands — so cross-folder drag and the sidebar's reparent both reflect immediately, and the vault re-walk just confirms. → [[CardView]] · [[Navigation]].

#### Unified Subfield + Scan-Promote (07-17)

The floating preview and the full-pane detail had drifted into two copies of the same footer, so this collapsed them. The Subfield takes one optional scope prop now — a scoped instance (the floating preview) describes its own page off a body it owns, never the single shared live-count slot, because a second writer there would evict the main pane's count.

NavView also picked up the List/Gallery toggle the detail pane already had, plus its own persisted view mode kept separate from the NavWindow's, and the scan on the nav/map side promotes the whole NavWindow into a NavView tab. This is the work that closed the rebuild. → [[Subfield]] · [[Navigation]] · `History.md`.

#### Page Previews (07-16 → 07-17)

Directly advancing on the Multi-Tab Nexus momentum, a parked `open_in` value became a real floating, editable preview window — wiki-clicks open dedup-focused tabs beside the origin instead of a back-only peek, and it stays neutral to the app's own tabs.

The page window and the NavWindow are the same thing under the hood: one chrome, one tab-motion layer, one side-pane, one warm seam. Each origin page remembers its opened tabs across sessions, per machine. → [[PagePreview]] · `History.md`.

#### Multi-Tab Nexus (07-14 → 07-16)

The nav model had a fork sitting open for around a month — replace the pane, stack top-bar tabs, or split panes — and it mostly came down to the perf hard-rule: N live tables would wreck scroll, so tabs keep one view mounted and cache the rest per-tab.

Pinned tabs ARE the pin set, never a second stored copy; the unpinned set is per-machine, and every tab carries its own Back/Forward. The empty state became NavView, the full-window recents gallery. → [[Navigation]] §II · `History.md`.

#### SurfacePM — Block Surfaces (07-10 → 07-13)

The composable dashboard layer — a mosaic of draggable, resizable tiles over an in-house tessellation engine, with the Homepage as the removable dev host. It works host-agnostic on purpose, so it exists before any real host does, and it repairs rather than rejects at every level: a foreign or broken tile entry renders inert instead of crashing the surface.

A page embed IS the CM6 editor, flipped read-only in place. View embeds, the geometry locks, and the link-graph host are the pieces still left. → [[SurfacePM]] · `History.md`.

#### Navigation Surface + Auto-Scroll (07-14)

A per-nexus nav-state layer — recents, pins, favorites, all resolved live against the tree so a moved entry follows and a dead one just drops on render — feeding a store and client-side fuzzy search behind the NavPane command surface.

Alongside it, every drag's edge-scroll collapsed onto one shared primitive across seven surfaces, resolving its scroller once at drag start rather than chasing the pointer each frame. → [[Navigation]] · [[PommoraDND]] §II · `History.md`.

### Pending Focuses

**Backlinks and full-text.** Linked-From, backlinks, ContextView and body search are the features with no route off the in-memory tree, and they are what a content index would be *for*. The previous one was deleted rather than repaired: it had no query consumer, and its only entry point was a full nexus re-walk on every mutation, which no amount of tuning makes cheap. Whatever replaces it gets written alongside the code that reads it and updates a row at a time — the primitives (`nexus.db`, the driver seam, the version handshake) are already in place. Full-text needs an FTS table and a body column, neither of which has ever existed.

- `schema:changeType` is fully built in main, exposed in preload, and has no renderer call site — only two test mocks, which read as coverage it doesn't have. Its `lossy-change-requires-confirmation` code exists to drive a confirm-then-retry dialog that nothing can reach.
- The IPC envelope flattens the structured error contract: `PommoraError.code` is dropped at ~47 handler tails into a bare string, and no renderer anywhere reads `.code`. Either propagate it or delete the unreachable `ErrorCode` members — the middle state is what costs.
- Cards a11y — the grid still wants roving tabindex and real grid semantics; the shared activation primitive and the card-shell roles landed, the grid half didn't. Grids having no keyboard navigation and drag handles being pointer-only are recorded as real gaps, not lint failures. → [[CardView]].
- The NavPane toolbar dropdown is still a blank placeholder — what a compact nav dropdown holds versus the fuller NavWindow is an open call before building into it.
- NOR filters are hand-authoring only — the mode lives on disk and in the evaluator; the pane offers All and Any, and a hand-authored NOR decodes as `locked`.
- `bounds` and `scanLabel` on PreviewPane have no caller yet; hard-coding them would force the first new consumer to edit the component instead of configuring it.
- Four affordances whose features haven't landed are `disabled` rather than wired to a no-op — the Space pane's actions ellipsis, the ViewPane's More menu, the ViewSettings icon picker, and the Page Preview's own Settings button.
- User Sections CRUD — collections render user sections but there's no way to actually make one (`mutate.ts` has no section ops); its own brainstorm → plan → build. → `Sidebar.md`.
- The flattened-mode bundle is half-landed: `flat` grouping and Hide Location are live for Cards, while the grouping pane offers "None" only under Cards and the pipeline refuses `flat` structurally for tables. The table half plus a separate Flatten control is what remains. → [[Views]].
- Perf debt: no row virtualization yet (every row mounts, which bites at thousands), and an external value edit doesn't live-refresh an open table. The one-view-mounted multi-tab design deliberately dodges needing table virtualization.
- Canvas — the spec sits at `Planning/6-26 - Canvas Spec.md`, pending adversarial review → plan → build.
- iCloud-sync readiness (future) — `serializeOnFile` can't coordinate with the iCloud daemon under LWW, `.nexus/nexus.db` needs sync-exclusion, and the walk has to skip `.icloud` placeholders.
- Mobile iOS companion — parked, spec at `.claude/Mobile/MobileSpec.md`, no build commitment.
- Editor deep cut (post-scan-cache): the per-caret line/rail loop still walks every line — the full StateField split (doc-keyed line chrome mapped through changes + a selection-scoped reveal plugin) is the remaining step; needs live-editor verification.
- `useExitPresence`'s default exit window is a raw constant decoupled from the motion tokens — derive it from `duration.slow` + slack or menus flash on close if the tokens are ever retuned.
- IPC error envelopes come in two shapes (`mutate`'s structured PommoraError vs ~20 handlers' bare `error: string`) — one `Result<T>` envelope everywhere removes a consumer-confusion class, net-negative.
- `useDismiss` coordinates with picker portals via per-event DOM queries (`closest`/`querySelector` on `[data-picker-portal]`) — a shared open-picker counter removes the DOM handshake.
- The preview window fetches the same page twice (PageEmbed's body load + PreviewInspector's frontmatter fetch) — lift one `openPage` result to the window and pass both halves down.
- Four surfaces each rebuild the full connections index (`buildPageIndex(flattenPages(tree))`) per tree change — PageView, PreviewWindow, NavWindow and BlockSurface — where a shared hook with routing injected would collapse the walk and the copy-paste.
- AutocompletePanel is a hand-rolled body portal that PickerMenu's beak-less surface could host; and when a third boolean-dropdown consumer appears, extract the `useMenuPresence` (open + dismiss + exit-presence) bundle — two consumers today made it indirection, not DRY.
- `group.tsx`'s `cellAt` rebuilds the zone's column model per item per over-flip — hoist lefts/stride/cols to a per-zone computation.
- `sidebarDnd`'s collection/context branch re-filters the sibling set per pointermove — snapshot it at activation (invariant mid-drag).
- View format/grouping/banner saves still trigger a full vault walk (`viewMint`'s non-`skipRefetch` path) — an optimistic view-slice patch skips it; `submitPropertyRename`'s walk wants the same targeted-patch treatment.
- The sidebar mode cross-fade renders two full trees, each building its own DnD index — share the tree-keyed index memo across the exit/enter layers.
- Id-keyed inline renames (ViewPane's view rename, the property-rename channel) each re-roll the 10-line `EditableInput` wrapper `RenamableTitle` provides for path-keyed rows — a state-driven `RenamableLabel` twin unifies them.
- The rest of the gesture family (`sidebarDnd`, the table column drag, `useOptionReorder`/`useStatusReorder`, MarkdownPM's `listDrag`/`blockDrag`, SurfacePM's `pointerDrag`) still hand-roll the skeleton `gesture.ts` now owns — migrate each onto `usePointerGesture()` opportunistically as its file is next touched.
- Latent: TableView's drag-visual memo indexes `columns[colDrag.from]` with a render-time array — a watcher shrinking the columns mid-column-drag is an OOB; bound-check or key by id.
- Latent: `setIcon` on the OPEN page updates the tree node but not `pageDetail.frontmatter.icon` (stale until reselect) — pre-existing; a targeted `pageDetail` patch closes it.
- **The full-weight inert affordances are adjudicated KEEP — never re-flag them.** The four unimplemented view tiles (List, Gallery, Calendar, Timeline) render at full weight and swallow the click, and the group-band "+" for structural Set bands carries an `aria-label` with no handler. Both read as live controls and do nothing on purpose; they wait on their features, not on a dimming pass. The "+" still wants Nathan's creation-affordance design, and `createFromMenu` plus the optimistic insert make wiring it trivial once that lands.

### Open Rulings

- **Right-clicking Change Color in the Space settings pane closes the pane.** Not reproduced, and every renderer-side path is eliminated — no blur or focus listener exists, `setPanel(null)` has one caller whose ref contains the dropdown, and the picker's portals are spared by both dismissal checks. The residual mechanism is a pointer event delivered after the native menu returns input; confirm with a capture-phase `pointerdown` log during one right-click. Two guards landed that are correct regardless.

### Hard Rules

- The dev app runs against the real Nexus, so CDP opens and Escs only unless authorized — and the editor gets driven only on a throwaway page, since typing into a live one autosaves straight to real data.
- Stage explicit paths, never `git add -A` — parallel sessions and Nathan's own uncommitted edits share the tree. Agents that write share that one tree too, so whole-tree git operations are forbidden in their briefs; a clean baseline means a worktree. → [[Design-Sources]].
- Never allow planning, brainstorming, or session-specific references to make it into code or documentation. 

### Lessons

- Two-writers-for-one-fact is the defect class the tab and nav work kept breeding — `tab.target` versus the navStack cursor, the tab set versus the pin set, the capture marker versus the thumbnail file. Every real bug reduced to it, and the fix was always one writer or a lockstep rule.
- HMR only goes so far: CSS and React Fast-Refresh work, but CM6 extension code needs ⌘R, `src/main` and preload need a full dev-process restart, a vanilla-extract `*.css.ts` can serve stale (a plain restart heals it, ⌘R never does), and a component's focus-effect / handler / attribute change often gets skipped by Fast-Refresh.
- CDP has two quirks that keep biting: synthetic clicks work on tabs/rows/buttons but never fire PickerMenu items (drive those via `el.click()` in `Runtime.evaluate`), and a non-integer dpr (1.7 on this machine) throws off screenshot clip math — crop the full-frame PNG with PIL instead.
- Where the recent code lives: Multi-Tab under `Tabs/` (`tabsModel.ts` pure with its own tests, `warmCache.ts` for the session LRU, every tab-bar visual knob in `tabBar.css`'s `.tab-bar` block); `select` is the single nav entry point; the New Tab `+` rides a shared `--toolbar-swallow` var on `.app-toolbar`; and the pin toggle shared between list rows and gallery cards is `NavPinButton` in `NavList.tsx`.
- A whole-surface drag handle steals its own children's clicks: the drag engine `setPointerCapture`s on pointerdown, retargeting the derived click to the drag node, so any interactive descendant (a value picker, an add surface) has to stop pointerdown — a container only on its own empty space, so the title still drags. Two smaller ones from the same run: Zod 4's `z.number()` already rejects Infinity/NaN where Zod 3 didn't (a `.catch` codec defaults them for free), and native Electron menus are OS-level — CDP can't screenshot or drive them, so their pure models get unit-tested and the popup needs a human.
- The Cards renderer lives in `Detail/Views/Cards/` with its pure seams unit-tested (`cardsOrder`, `cardValueInput`, `cardsBand`); the cell/card right-click model is single-sourced in `@shared/cellMenu.ts` + `@shared/cardMenu.ts` + `@shared/pageMenu.ts`; cards flatten via **Group By: None** (the `flat` kind, rendered headerless) and order via a **Sort By: Location** entry (reserved `LOCATION_SORT`, Order Location/Custom, resolved through `locationFlat` for its filesystem order), gated on `flattenStructural` so neither can touch a table.
- A vanilla-extract `.css.ts` may export only plain values, so a helper that *builds* a declaration sits beside the stylesheet rather than inside it. Neither typecheck nor lint can see the violation — only the plugin rejects it, which makes it a build-time surprise.
- **A defaulted parameter that resolves identity is a silent-failure switch.** A column labeller took the tree as `= null`, so two call sites omitted the only argument that turns a Context id into its title and rendered the raw id instead — no error, no type complaint, just a header reading as an opaque string. The default is what hid it: required, the compiler names every caller that can't resolve. Where an argument is the difference between a value and a plausible-looking wrong one, don't give it a fallback.
- A bug's visibility and its severity are independent. That same labeller printed `_tier1` for months and read as a slightly odd internal name; printing a ULID for the identical reason read as data corruption. What changes urgency is how wrong the output *looks*, not how wrong it is.
- The context machinery splits cleanly: pure resolution in `src/shared/contexts.ts` + `contextResolve.ts`, the write family in `src/main/crud/contextWrite.ts`, the cascade/journal/replay in `crud/contextCascade.ts` + `contextJournal.ts`, and every renderer surface resolving identity through `Detail/Views/pipeline/contextIdentity.ts` — nothing re-derives icon/color/title from the tree on its own. Context columns are default-OFF: absence from a view's `property_order` IS hidden, which is why creating a Context can never change an existing view.

### Fix Log

- **A rename rewrites `[[links]]` inside fenced code blocks.** The editor excludes bracketed titles in code three separate ways, but the main-side scanner and rewriter carry no code mask — so a page documenting a link in a code sample has that sample silently altered when an unrelated page is renamed, and the same body indexes a phantom edge. The fix is one shared mask both layers read.
- The "File" property icon gets clipped by its vertical row padding on the ViewPane.
- The link-rename field shows a leading empty space — a visual inset, not a stored character (deprioritized).
- Blockquotes inside of codeblocks are unstable. The cause is an ordering one in `decorations/intent.ts`: the blockquote branch runs before the fence lookup and never consults it, so it sets a prefix length that the fence branch then hides. That stripping is correct for a fenced block nested *inside* a blockquote and wrong for a `>` line that is merely code content, and one `base` serves both with nothing distinguishing them — the line ends up carrying both the blockquote and code-block classes while a literal `>` is erased. → [[MarkdownPM]].
- Block-math drag corrupts the doc: a multi-line `$$…$$` span with a blank line inside parses as two halves with orphaned `$$`, and block-dragging it corrupts the document (`blockModel.ts`, test-pinned but unguarded).
- A single-word bullet that wraps drops the word below the marker — only the `line-height` cap made it in so far. → [[MarkdownPM]].
- The Set-Card drag flash (drop snaps back, then jumps on reload) should now be settled by the optimistic reorder patch in `store.mutate` — needs one live confirmation before the Fix Log drops it. → [[CardView]].
