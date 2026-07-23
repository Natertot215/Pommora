## Context — Pommora React

### Current Focus

The React rebuild of the Swift paradigm reached its finish line at v0.5.0 — Page Previews and the Subfield unification pulled React past where the SwiftUI build ever got. That's the baseline the roadmap counts forward from, not a target still to hit, and it's mostly my own live drive from here.

**Cards is on `main`** — the renderer, the drag rework, and the certified cleanup campaign all merged, so v0.6.0 counts forward from a two-renderer pipeline (Table + Cards; Gallery, List, Calendar, and Timeline are still just names).

**The active build is the Contexts & Spaces redesign**, on `contexts-spaces`. The fixed three tiers become user-manageable **Contexts** (groups) holding **Spaces** (members) — a `contexts.json` registry carries the ids while member files speak quoted bracketed title keys (`"[Projects]": [Pommora]`), because raw-file legibility beat the rename-cascade cost the option-value precedent already pays. Each Space is a SurfacePM block surface with its own color, settings, and cross-Context relations.

Where it stands: the whole main-process side and the renderer pipeline are done and committed — registry IO, the walk resolving links onto each entity's own node, the setContext write family with per-file repair, the journaled crash-safe rename cascade, the idempotent migration, and the default-OFF context columns over one identity seam. What remains is the surface work: the tail of the selection/nav sweep, the settings surfaces (now toolbar panes — the floating settings window was cut), the legacy strip, and a surgical doc sweep. Nothing on the branch has been live-driven yet, and the first real-nexus launch runs the one-way migration — a copy or `~/test` goes first.

### Recent Work

#### Contexts & Spaces — the registry model, data + pipeline (07-22)

The three-tier taxonomy was the last fixed thing in an otherwise user-defined system, so it became a registry: Contexts are entries in `.nexus/contexts.json` (the seeded three keep reserved `_tierN` ids so legacy ULIDs keep resolving), Spaces live as folders under `.nexus/contexts/<Context>/<Space>/`, and membership is a bracketed title key at every entity root. Validation is registry-membership at read — an outside edit with a valid title registers, a typo sits inert until the file's next real write repairs the case-class misses and drops the unknowns, never guessing.

The dangerous parts got their own machinery: renames cascade titles across all three file scopes under a pending-rename journal that replays on open (a crash forward-completes instead of letting the repair pass eat valid tags), the migration bumps its version last so a kill re-runs the remainder, and every sidecar RMW goes through one strict read chokepoint that fails rather than clobbers a transiently-unreadable file. An adversarial pass caught the one real hole — the write-side world load read sidecars leniently, which would've let the repair strip a Space's tags whenever its sidecar was briefly unreadable — now strict. Phases 0–3 are on `contexts-spaces`; the surface phases are next. → [[Contexts & Spaces — Decision Log]] · [[Contexts & Spaces — Implementation Plan]].

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

The page window and the NavWindow are the same thing under the hood: one chrome, one tab-motion layer, one side-pane, one warm seam. Each origin page remembers its opened tabs across sessions in a synced `page-previews.json`. → [[PagePreview]] · `History.md`.

#### Multi-Tab Nexus (07-14 → 07-16)

The nav model had a fork sitting open for around a month — replace the pane, stack top-bar tabs, or split panes — and it mostly came down to the perf hard-rule: N live tables would wreck scroll, so tabs keep one view mounted and cache the rest per-tab.

Pinned tabs ARE the pin set, never a second stored copy; the whole set travels across devices through a synced `tabs.json`, and every tab carries its own Back/Forward. The empty state became NavView, the full-window recents gallery. It's on `nav-gallery-pins`. → [[Navigation]] §II · `History.md`.

#### SurfacePM — Block Surfaces (07-10 → 07-13)

The composable dashboard layer — a mosaic of draggable, resizable tiles over an in-house tessellation engine, with the Homepage as the removable dev host. It works host-agnostic on purpose, so it exists before any real host does, and it repairs rather than rejects at every level: a foreign or broken tile entry renders inert instead of crashing the surface.

A page embed IS the CM6 editor, flipped read-only in place. View embeds, the geometry locks, and the link-graph host are the pieces still left. → [[SurfacePM]] · `History.md`.

#### Navigation Surface + Auto-Scroll (07-14)

A per-nexus nav-state layer — recents, pins, favorites, all resolved live against the tree so a moved entry follows and a dead one just drops on render — feeding a store and client-side fuzzy search behind the NavPane command surface.

Alongside it, every drag's edge-scroll collapsed onto one shared primitive across seven surfaces, resolving its scroller once at drag start rather than chasing the pointer each frame. → [[Navigation]] · [[PommoraDND]] §II · `History.md`.

### Pending Focuses

- Cards a11y pass — the `noStaticElementInteractions` stubs still want real roles/keyboard. → [[CardView]].
- The NavPane toolbar dropdown is still a blank placeholder — what a compact nav dropdown holds versus the fuller NavWindow is an open call before building into it.
- User Sections CRUD — collections render user sections but there's no way to actually make one (`mutate.ts` has no section ops); its own brainstorm → plan → build. → `Sidebar.md`.
- The flattened-mode bundle — "None"/flat grouping plus Flatten and Hide Location — is deferred; the `flat` GroupConfig kind stays reserved. → [[Views]].
- Perf debt: no row virtualization yet (every row mounts, which bites at thousands), and an external value edit doesn't live-refresh an open table. The one-view-mounted multi-tab design deliberately dodges needing table virtualization.
- Canvas — the spec sits at `Planning/6-26 - Canvas Spec.md`, pending adversarial review → plan → build.
- iCloud-sync readiness (future) — `serializeOnFile` can't coordinate with the iCloud daemon under LWW, `.nexus/index.db` needs sync-exclusion, and the walk has to skip `.icloud` placeholders.
- Mobile iOS companion — parked, spec at `.claude/Mobile/MobileSpec.md`, no build commitment.
- Editor deep cut (post-scan-cache): the per-caret line/rail loop still walks every line — the full StateField split (doc-keyed line chrome mapped through changes + a selection-scoped reveal plugin) is the remaining step; needs live-editor verification.
- NotchedPane rebuilds its beak path per frame while a pane animates height, and PickerMenu + NotchedPane each run their own ResizeObserver on the same pane — consolidate to one measurement owner passing size down.
- `useExitPresence`'s default exit window is a raw constant decoupled from the motion tokens — derive it from `duration.slow` + slack or menus flash on close if the tokens are ever retuned.
- IPC error envelopes come in two shapes (`mutate`'s structured PommoraError vs ~20 handlers' bare `error: string`) — one `Result<T>` envelope everywhere removes a consumer-confusion class, net-negative.
- `useDismiss` coordinates with picker portals via per-event DOM queries (`closest`/`querySelector` on `[data-picker-portal]`) — a shared open-picker counter removes the DOM handshake.
- The Toolbar aims its dropdown beaks with hard-coded trio fractions (5/6, center) — any trio change silently misaims them; derive from measured trigger rects like PickerMenu.
- The preview window fetches the same page twice (PageEmbed's body load + PreviewInspector's frontmatter fetch) — lift one `openPage` result to the window and pass both halves down.
- PageView and PreviewWindow each rebuild the full connections index (`buildPageIndex(flattenPages(tree))`) per tree change — a shared hook (routing injected) halves the walk and the copy-paste.
- AutocompletePanel is a hand-rolled body portal that PickerMenu's beak-less surface could host; and when a third boolean-dropdown consumer appears, extract the `useMenuPresence` (open + dismiss + exit-presence) bundle — two consumers today made it indirection, not DRY.
- `group.tsx`'s `cellAt` rebuilds the zone's column model per item per over-flip — hoist lefts/stride/cols to a per-zone computation.
- `sidebarDnd`'s collection/context branch re-filters the sibling set per pointermove — snapshot it at activation (invariant mid-drag).
- View format/grouping/banner saves still trigger a full vault walk (`viewMint`'s non-`skipRefetch` path) — an optimistic view-slice patch skips it; `submitPropertyRename`'s walk wants the same targeted-patch treatment.
- The sidebar mode cross-fade renders two full trees, each building its own DnD index — share the tree-keyed index memo across the exit/enter layers.
- Id-keyed inline renames (ViewPane's view rename, the property-rename channel) each re-roll the 10-line `EditableInput` wrapper `RenamableTitle` provides for path-keyed rows — a state-driven `RenamableLabel` twin unifies them.
- The rest of the gesture family (`sidebarDnd`, the table column drag, `useOptionReorder`/`useStatusReorder`, MarkdownPM's `listDrag`/`blockDrag`, SurfacePM's `pointerDrag`) still hand-roll the skeleton `gesture.ts` now owns — migrate each onto `usePointerGesture()` opportunistically as its file is next touched.
- Latent: TableView's drag-visual memo indexes `columns[colDrag.from]` with a render-time array — a watcher shrinking the columns mid-column-drag is an OOB; bound-check or key by id.
- Latent: `setIcon` on the OPEN page updates the tree node but not `pageDetail.frontmatter.icon` (stale until reselect) — pre-existing; a targeted `pageDetail` patch closes it.
- The group-band "+" (structural Set bands) is a deliberate visual stub awaiting Nathan's creation-affordance design — `createFromMenu` + the optimistic insert now make wiring it trivial once designed.

### Hard Rules

- The dev app runs against the real Nexus, so CDP opens and Escs only unless authorized — and the editor gets driven only on a throwaway page, since typing into a live one autosaves straight to real data.
- Stage explicit paths, never `git add -A` — parallel sessions and Nathan's own uncommitted edits share the tree.
- Never allow planning, brainstorming, or session-specific references to make it into code or documentation. 

### Lessons

- Two-writers-for-one-fact is the defect class the tab and nav work kept breeding — `tab.target` versus the navStack cursor, the tab set versus the pin set, the capture marker versus the thumbnail file. Every real bug reduced to it, and the fix was always one writer or a lockstep rule.
- HMR only goes so far: CSS and React Fast-Refresh work, but CM6 extension code needs ⌘R, `src/main` and preload need a full dev-process restart, a vanilla-extract `*.css.ts` can serve stale (a plain restart heals it, ⌘R never does), and a component's focus-effect / handler / attribute change often gets skipped by Fast-Refresh.
- CDP has two quirks that keep biting: synthetic clicks work on tabs/rows/buttons but never fire PickerMenu items (drive those via `el.click()` in `Runtime.evaluate`), and a non-integer dpr (1.7 on this machine) throws off screenshot clip math — crop the full-frame PNG with PIL instead.
- Where the recent code lives: Multi-Tab under `Tabs/` (`tabsModel.ts` pure with its own tests, `warmCache.ts` for the session LRU, every tab-bar visual knob in `tabBar.css`'s `.tab-bar` block); `select` is the single nav entry point; the New Tab `+` rides a shared `--toolbar-swallow` var on `.app-toolbar`; and the pin toggle shared between list rows and gallery cards is `NavPinButton` in `NavList.tsx`.
- A whole-surface drag handle steals its own children's clicks: the drag engine `setPointerCapture`s on pointerdown, retargeting the derived click to the drag node, so any interactive descendant (a value picker, an add surface) has to stop pointerdown — a container only on its own empty space, so the title still drags. Two smaller ones from the same run: Zod 4's `z.number()` already rejects Infinity/NaN where Zod 3 didn't (a `.catch` codec defaults them for free), and native Electron menus are OS-level — CDP can't screenshot or drive them, so their pure models get unit-tested and the popup needs a human.
- The Cards renderer lives in `Detail/Views/Cards/` with its pure seams unit-tested (`cardsOrder`, `cardValueInput`, `cardsBand`); the cell/card right-click model is single-sourced in `@shared/cellMenu.ts` + `@shared/cardMenu.ts` + `@shared/pageMenu.ts`; cards flatten via **Group By: None** (the `flat` kind, rendered headerless) and order via a **Sort By: Location** entry (reserved `LOCATION_SORT`, Order Location/Custom, resolved through `locationFlat` for its filesystem order), gated on `flattenStructural` so neither can touch a table.
- The context machinery splits cleanly: pure resolution in `src/shared/contexts.ts` + `contextResolve.ts`, the write family in `src/main/crud/contextWrite.ts`, the cascade/journal/replay in `crud/contextCascade.ts` + `contextJournal.ts`, the migration in `src/main/migrateContexts.ts`, and every renderer surface resolving identity through `Detail/Views/pipeline/contextIdentity.ts` — nothing re-derives icon/color/title from the tree on its own. Context columns are default-OFF: absence from a view's `property_order` IS hidden, which is why creating a Context can never change an existing view.

### Fix Log

- `.nexus/activeViews.json` and its per-machine siblings (`folds`, `viewOrders`, `tableHeadingColumns`, `linkTitles`) aren't gitignored — using the switcher on a fresh container creates a would-sync file. They need adding to the Nexus `.gitignore`; `tabs.json` does not, since it's synced on purpose.
- The "File" property icon gets clipped by its vertical row padding on the ViewPane.
- The link-rename field shows a leading empty space — a visual inset, not a stored character (deprioritized).
- Blockquotes inside of codeblocks are unstable and need proper debugging.
- Block-math drag corrupts the doc: a multi-line `$$…$$` span with a blank line inside parses as two halves with orphaned `$$`, and block-dragging it corrupts the document (`blockModel.ts`, test-pinned but unguarded).
- A single-word bullet that wraps drops the word below the marker — only the `line-height` cap made it in so far. → [[MarkdownPM]].
- The Set-Card drag flash (drop snaps back, then jumps on reload) should now be settled by the optimistic reorder patch in `store.mutate` — needs one live confirmation before the Fix Log drops it. → [[CardView]].
