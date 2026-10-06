### Navigation Improvements — Design Specification

**DATE:** 09-22-2026
**STATUS:** Part 1 Completed
**SESSION:** 7a396da7-59c3-4941-b458-dcb4a28f9ff6
**CONCEPTS:**

- **View Search:** A container view's in-line title offering a "Search" hint on a hover dwell, narrowing the view's own rows by title under its existing filter and grouping.
- **Container View:** The detail-level view of a Collection, a Set, or a Sub-Set, as it opens in the main pane.
- **Folder:** A Sub-Set — any Set nested below a Set (`isDepth1Set` false). It opens as a container view, carries a banner, and takes every search surface a Collection or Set does.
- **SearchWindow:** A floating window summoned from a Collection, Set, or folder's right-click "Search" row, scoped to it: a hierarchy rail, a search field, and results.
- **Scope:** The Collection, Set, or folder a SearchWindow is searching, held by id and resolved live against the tree.
- **Folder Band:** A disclosable band in the SearchWindow's main frame heading one Set or folder below the scope, holding its contents.

#### Context

Finding something inside a container means scrolling its view or typing a Nexus-wide nav search, and folders are reached only by that nav search, since a folder's sidebar row only toggles its disclosure. Navigation Improvements adds two searches narrowed to one container: View Search inside the container view that is already open, and the SearchWindow for any container from its right-click menu.

#### Overview

The work ships as two parts, planned and built in order:

1. **Part 1 — View Search** applies to every detail-level container view — every Collection, Set, and Sub-Set — and comes first.
2. **Part 2 — Search Window** follows as its own plan.

The parts share no new mechanism: View Search narrows a view's own resolved rows, and the SearchWindow searches a container's subtree through the navigation index. Part 2 depends on nothing Part 1 builds, and Part 1 ships complete without Part 2.

---

### Part 1 — View Search

#### Overview

View Search lives on the in-line title of every container view — every Collection, Set, and Sub-Set opened at the detail level. Hovering the title for the ghost-create dwell slides a "Search" hint out to its right while the title stays; clicking the hint or the title turns it into a type-to-search field over the rows the view already shows, under the view's own filter and grouping. The search is title-only, holds per tab for the session, and ends on Escape, on its X button, or when the field is left empty.

- **Entry Points:** The title's hover hint, a click on the title, the "Search" row atop the title and banner menus, and the rebindable Search command (⌘F).
- **Not Included:** View tiles, property-value matching, and a saved or persisted query.

#### Architecture

View Search holds `{ key, query }` in a per-tab session field keyed by tab id, dropped once that tab shows another entity. `useViewHost` applies it as a `shownGroups` memo over the resolved groups — using `matchScore` as a predicate against titles folded once — and feeds its derived maps (`rowById`, `rowBand`, `paintOrder`) and the Subfield count from that memo, so a keystroke runs one linear scan and never re-runs the pipeline. Row and band drag are disabled while a query is active. The title's hint and field ride `DetailTitleHeader`, the dwell is `useHoverDwell`, and the menu row is prepended at the `Banner` call site so the shared title and banner builders stay unchanged.

#### A — Scope & Entry Points

- **A-1:** [CONFIRMED] View Search applies to every detail-level container view — every Collection, Set, and Sub-Set — in the main pane.
- **A-2:** [CONFIRMED] View tiles are out of scope; a tile's title already owns a hover dwell and click-to-rename.
- **A-3:** [CONFIRMED] Hovering the in-line title runs the ghost-create dwell (`useHoverDwell`), sliding a `label-tertiary` "Search" hint, led by a `border-strong` segment, out to the title's right on the title-level reveal while the title stays.
- **A-4:** [CONFIRMED] Clicking the hint or the title — plainly, with ⌘, or with ⇧ — starts type-to-search; from the hint the title slides away as the field takes its place, and from anywhere else the field replaces it at once.
- **A-5:** [CONFIRMED] A rebindable `search` command, default ⌘F, starts View Search on a focused container view and does nothing elsewhere.
- **A-6:** [CONFIRMED] Right-clicking the in-line title or its banner puts "Search" at the top of both menus, starting View Search. The row is prepended at the `Banner` call site, gated on a Collection or Set owner under detail chrome, so Space, Context, and window-tab menus built from the shared builders stay unchanged.

#### B — Search Behavior

- **B-1:** [CONFIRMED] A headline-sized X clear button (`button-base`, `label-secondary`, the `x` icon every other clear and close button uses) fades in on the first typed character at the view's far right, anchored to the side inset, with a long query scrolling the title and field short of it, and stays while text remains; its fade is `titleActionFade`, the fade a view tile's lock shares.
- **B-2:** [CONFIRMED] Escape, the X, or an abandoned empty search slides the in-line title back.
- **B-3:** [CONFIRMED] Enter does nothing beyond the field.
- **B-4:** [CONFIRMED] Matching is title-only and respects the view's filter and grouping; every group with no match hides while a query is active.
- **B-5:** [INFERRED] Matching uses the shared `matchScore` as a predicate, keeping the view's own order.
- **B-6:** [CONFIRMED] A collapsed group holding a match expands for the query's duration, never saved.
- **B-7:** [CONFIRMED] Row and band drag are disabled while a query is active; Set Card reordering stays.

#### C — State & Performance

- **C-1:** [INFERRED] The query lives in a per-tab session field keyed by tab id: never written to the saved view, kept across a tab switch and across the tab's pin or unpin, cleared when that tab navigates.
- **C-2:** [INFERRED] The query applies in `useViewHost` as a `shownGroups` memo that feeds the host's derived maps and the Subfield count; a keystroke never re-runs the pipeline or re-lowercases titles.

#### D — Reconciliation

- **D-1:** [INFERRED] Docs that go false or gain a home: `ViewTypesPM.md` (View Search), `ConfigurationPM.md` (the `search` command), and `InterfacePM.md` (the in-line title's hint and menu row).
- **D-2:** [INFERRED] Tests that change or join: `commands.test.ts`, the view host's tests for the query and group expansion, and a title-header test for the hint and X.

#### Sources & Reasoning

- `Core/Interface/Header/DetailTitleHeader.tsx` — the in-line title span; its only handler is its right-click, so a click is free for A-4.
- `Core/Interface/Header/Banner.tsx` + `Core/Actions/identityMenus.ts` — the container view's title header and menus; the title and banner builders are shared with Space, Context, and window-tab menus, which is why A-6 gates at the call site.
- `Core/Views/Host/useViewHost.ts` + `ViewHost.tsx` — the derived maps and the Subfield count come from `groups`, and `ViewHost` remounts per container. C-2 places the query here and C-1 keeps it outside.
- `Core/Views/Pipeline/resolveView.ts` — filter → group → sort; View Search sits after it.
- `Core/Paths/caseFold.ts` — `matchScore`, reused as B-5's predicate; `rankMatches`'s score ranking and the nav search's 50-result cap don't fit a view's own order.
- `Core/Actions/commands.ts` — the rebindable command table; nothing holds ⌘F today.
- `Core/Tiles/Surfaces/ViewTile.tsx` — a tile's title already dwells for the band peek and lock and clicks to rename, which is why A-2 stands.
- `UIX/Interactions/hoverDwell.ts` — `useHoverDwell`, the ghost-create dwell A-3 reuses.

---

### Part 2 — Search Window

#### Overview

The SearchWindow is the NavWindow's folder-scoped counterpart rather than its replacement. A "Search" row under Open on every container's right-click menu summons it, taking the one window slot the Page Window, NavWindow, and Matrix window already share. Its rail mirrors the scope's tree, rooted at the scope itself and behaving as the sidebar does; its main frame holds a search field over results drawn in one of two modes — **Location**, the scope's contents in disclosable folder bands, or **Recents**, the global Recents and Pinned — and in List or Gallery. The Subfield states the scope's path and the result count, and its crumbs re-scope the window to an ancestor.

- **Entry Points:** Container right-click menus everywhere they appear — the sidebar, NavView and NavWindow rows and cards, main-bar tabs, and a view's Set group bands.
- **Not Included:** Filtering, sorting, and advanced options; the SearchWindow as a tab type.

#### Architecture

The SearchWindow is a fourth window kind on the singleton `pageWindow` slot, carrying its scope inside the window state as a `scopeId` only the search kind sets, so every change to the slot replaces it with no second flag to clear. The scope resolves by id on every render, so a rename or move follows it; `reconcileWindow` closes a search-kind window once its scope stops resolving. The window keeps no tab set and persists no window record. `openWindowTab`'s guard becomes a positive match on the tabbed kinds (`page`, `nav`), so any Page Window summon overtakes a standing SearchWindow the way it overtakes the Matrix window today, and one slice action carries F-4's hand-off to the NavWindow — `openNav` then `openWindowTab`. `NavList` takes an `onPreview` prop and `showEntityMenu` a preview override, so every Preview inside the SearchWindow routes to the hand-off.

The NavWindow's window-local glue — frozen recents, the recents reorder, and the query/recents switch — hoists into a hook both windows use; `NavList`, `NavGallery`, and `SearchField` are already shared, and `NavBanner` is parameterized by value and owner so it can draw a container's banner. The rail is the sidebar's tree rows extracted into a shared tree host that both the Sidebar and the rail mount: it owns the ghost-create and DnD providers and the commit's peek signalling, takes a root and an indent offset separate from real depth, and declares its host, with `'rail'` joining `RenameHost` (ranked below `sidebar`) and the icon hosts so a rename or icon edit opens in the rail; `Disclosure` compares a rename's host against its tree host's own rather than the literal `'sidebar'`, so a create inside a closed rail folder unfolds it. Subtree matching projects index entries through `NodeRecord.parents` into a per-tree, per-scope memo in `treeIndex.ts`, and calls `filterNav` without its 50-result cap. Folder bands draw on the shared presentational `GroupBand`, their disclosure held in session memory. Window crumbs gain a select-and-rule seam in `subfieldCrumbs`, making every ancestor clickable in the SearchWindow.

#### E — Menus

- **E-1:** [CONFIRMED] A "Search" row sits directly below Open in the first section of every Collection, Set, and folder right-click menu: the sidebar, NavView and NavWindow rows and cards, main-bar tabs, and a view's Set group bands. The Homepage, Spaces, and the Matrix carry none, and the Matrix's own entity menu withholds it from its Collection and Set nodes.
- **E-2:** [INFERRED] Where a menu has no Open row — an unpinned container tab, a view's Set group band — Search leads the first section.
- **E-3:** [CONFIRMED] Search is absent for a container holding no pages and no folders; the menu contexts (`EntityMenuTarget`, `NavRowMenuContext`, `TabMenuContext`) carry a `searchable` flag their callers compute.
- **E-4:** [CONFIRMED] Delete moves into its own divided section at the foot of every Collection, Set, and folder entity menu; every other row, Open and the create rows included, keeps its place.
- **E-5:** [CONFIRMED] Search on a folder band's right-click re-scopes the standing SearchWindow to that folder.
- **E-6:** [INFERRED] The Search action resolves its Set by path (`findContainerWhere`), so a view's group band keeps its id-less target and its Open-less menu.

#### F — The Window

- **F-1:** [CONFIRMED] `SearchWindow.tsx` in `Core/Interface/Windows/` is its own component rather than a scoped NavWindow: the NavWindow's map tab is its return path, and a SearchWindow has none.
- **F-2:** [CONFIRMED] It is a fourth `WindowKind` on the singleton `pageWindow` slot; a summon overtakes any standing window, and any Page Window summon overtakes it.
- **F-3:** [CONFIRMED] It keeps no tab set or window record and is not a tab type; its only state is the `scopeId` inside its window state.
- **F-4:** [CONFIRMED] A Preview from it hands off to the NavWindow — the SearchWindow closes and the entity opens as a NavWindow tab. Recents rows, Location rows, and a rail page in a page-preview Collection all route to it.
- **F-5:** [CONFIRMED] The scan glyph opens the scope's view in the main pane and closes the SearchWindow, for a Collection, a Set, or a folder alike.
- **F-6:** [CONFIRMED] A Collection, Set, or folder with a banner draws it across the main frame under **Show Banner In Navigation Window**, the setting that governs the NavWindow's own banner.
- **F-7:** [INFERRED] The NavWindow's frozen-recents, recents-reorder, and query/recents glue hoists into a hook both windows use, and `NavBanner` is parameterized by value and owner.
- **F-8:** [INFERRED] The scope resolves by id on every render; a rename or move follows it, and a search-kind window closes when its scope is deleted.

#### G — Rail

- **G-1:** [CONFIRMED] The rail mirrors the scope's hierarchy with the scope itself as its root row, pages included.
- **G-2:** [CONFIRMED] A rail row click does what the same click does in the sidebar, except that a page in a page-preview Collection hands off per F-4; it never re-scopes the search.
- **G-3:** [CONFIRMED] A reorder in the rail writes the real order the sidebar shows.
- **G-4:** [CONFIRMED] Below the root, the rail's disclosure is the sidebar's per-entity disclosure state — no new store or cache.
- **G-5:** [INFERRED] The root row always shows its children and carries no disclosure or drag, so a collapsed or locked folder never opens the window onto a single row.
- **G-6:** [CONFIRMED] The rail stands in both modes; under Recents it is the only rendering of the scope's hierarchy.
- **G-7:** [CONFIRMED] Rail rows carry the sidebar's full row behavior — right-click menus, rename, icon edit, drag, and ghost-create — through a shared tree host that declares `'rail'` as its rename and icon host and indents from the root rather than the Nexus.

#### H — Results & Modes

- **H-1:** [CONFIRMED] Two toggles sit side by side at the rail's foot: List / Gallery, and Location / Recents.
- **H-2:** [CONFIRMED] Location draws the scope's contents in folder bands; Recents draws the global Recents and Pinned in their global order.
- **H-3:** [CONFIRMED] Recents is the default mode, and the mode is one choice for every SearchWindow rather than per folder.
- **H-4:** [INFERRED] The mode and the List / Gallery choice persist per machine as the SearchWindow's own `DevicePrefs` keys, beside `navWindowGallery` and `navViewGallery`; no new channel.
- **H-5:** [CONFIRMED] Folder bands draw in both List and Gallery, and their disclosure is held in memory for the session only.
- **H-6:** [INFERRED] A query matches titles in the scope's subtree through `filterNav` over a memoized subtree projection, uncapped.
- **H-7:** [CONFIRMED] A query's results obey the mode: under Location they fall into their folder bands, and every band with no match hides; under Recents they draw flat, per H-11.
- **H-8:** [CONFIRMED] V1 carries no filtering, sorting, or advanced options.
- **H-9:** [CONFIRMED] Location lists the scope's own pages at the top, unbanded; each Set or folder below follows as a band, its own pages at the top and deeper folders nesting inside by indent.
- **H-10:** [CONFIRMED] A result or Location row's click opens it, closing the window under **Close Navigation On Select**; a Location row's right-click is the entity menu, while Recents rows keep the nav row menu.
- **H-11:** [CONFIRMED] Under Recents, a query's pinned matches lead, then recent matches in the global order, then the rest by score.
- **H-12:** [CONFIRMED] Location renders uncapped and unvirtualized in V1.
- **H-13:** [CONFIRMED] Rename, Edit Icon, and New Page from a Location row or folder band's menu act on that row or band in place — its name field, its icon picker, and a new page where the menu places it.
- **H-14:** [CONFIRMED] Under Location, a band shows when it or any descendant matches, and a folder whose own title matches shows its band with every row.

#### I — Subfield

- **I-1:** [CONFIRMED] The Subfield reads `Path > Path | Results` — the scope's NavTrail and the count of results on show.
- **I-2:** [CONFIRMED] A crumb click re-scopes the SearchWindow to that ancestor; the NavTrail is the way back from a band's re-scope. `subfieldCrumbs` takes a select-and-rule seam so every ancestor is clickable here.

#### J — Reconciliation

- **J-1:** [INFERRED] Docs that go false: `NavigationPM.md` (the SearchWindow; row and tab menus); `InterfacePM.md` (the window roster's count, the overtake, window crumbs, the container menu); `ConfigurationPM.md` (`navViewModes`, and **Close Navigation On Select** and **Show Banner In Navigation Window** now governing both windows).
- **J-2:** [INFERRED] Tests that change: `entityMenu.test.ts`, `navRowMenu.test.ts`, `tabMenu.test.ts`, `Core/Views/Table/bandCommits.test.tsx`, and the window slice and window tab tests for the fourth kind.
- **J-3:** [INFERRED] Sidebar tests move with the extracted tree host, and the crumb seam and subtree projection gain tests of their own.

#### Sources & Reasoning

- `Core/Interface/Windows/NavWindow.tsx` — the rail, search field, List / Gallery, banner, scan, and Subfield count. Its window-local glue is what F-7 hoists, and its map-tab model is why the two stay separate components.
- `Core/Session/windowSlice.ts` — one `pageWindow` slot; `openWindowTab` treats every non-Matrix kind as tabbed (`:149`), and `reconcileWindow` walks only tabs. F-2's guard change and F-8's scope reconcile land here.
- `Core/Interface/Windows/windowRecord.ts` + `windowTabs.ts` — `WindowKind` is `page | nav | matrix`, and `WindowState` carries no payload today. The search kind's `scopeId` joins it.
- `Core/Navigation/navSearch.ts` + `Core/Nexus/treeIndex.ts` — `filterNav` sorts by score and caps at 50; `NodeRecord.parents` makes a subtree projection memoizable for H-6.
- `Core/Actions/entityMenu.ts` + `Core/Interface/Menus/entityMenuActions.ts` — the container menu and its one door, shared by the sidebar, a view's Set group bands, and the Matrix. Search and Delete's move land once here.
- `Core/Views/Bands/ViewGroupBand.tsx` + `GroupBand.tsx` — the band pops the entity menu with no `id`; `GroupBand` is the presentational band folder bands reuse.
- `Core/Actions/navRowMenu.ts` + `Core/Actions/tabMenu.ts` — the nav row and tab menus; unpinned tabs carry no Open, and neither menu carries Delete.
- `Core/Navigation/NavBanner.tsx` — NavView's banner, drawn in the NavWindow under **Show Banner In Navigation Window**; F-6 parameterizes it.
- `Core/Interface/Sidebar/Sidebar.tsx`, `sidebarRows.tsx`, `sidebarDnd.tsx`, `Disclosure.tsx` — rows hardwire the sidebar host, the ghost and DnD providers live inside `Sidebar()`, drop lines indent by Nexus depth, and disclosure reads `devicePrefs.disclosure` by id with a lock that selects instead of unfolding. G-5 and G-7 answer each.
- `Core/Session/editSlice.ts` — `RenameHost` is `detail | sidebar | matrix`; G-7 adds `'rail'`.
- `Core/Interface/Subfield/crumbs.ts` + `Subfield.tsx` — only the Collection and depth-1 Set crumbs navigate up the spine, and `inert` only strips handlers. I-2's seam answers both.
- `Core/Settings/devicePrefs.ts` — H-4 adds the SearchWindow's keys to `DevicePrefs`.

---

#### Constraints

- One linear scan per keystroke over precomputed lowercase titles; no index or pipeline rebuild.
- The database stays a regenerative index; folder-band disclosure lives in session memory.
- Neither part adds a host channel.

#### Rejected

- **A scoped NavWindow** — the NavWindow's map tab is its return path, which a SearchWindow has no use for.
- **Search opening the container's real view in a window tab** — Search opens the window alone, never the full detail.
- **The title fading into "Search In [X]"** — the hint slides out beside the title so the title stays readable.
- **Folder-scoped Recents** — the SearchWindow shares the global Recents order with every other surface.
- **Per-folder mode** — one mode applies to every SearchWindow.
- **Search inside the shared title and banner builders** — it would leak into Space, Context, and window-tab menus.
- **A separate SearchWindow banner setting** — the NavWindow's banner setting governs both windows.

#### Open Items

1. None.

#### Prospects

- View Search on view tiles.
- Creating during a query — a page created from inside the view showing as the query's exception, so it mounts and its rename lands.
- Sub-Set multi-saved views — the ViewMenu for adding, switching, and deleting a folder's views; today a folder adopts one saved view on its first edit.
- A rail behavior setting — re-scoping on click, pages hidden, or disclosure of its own.
- Per-machine folder-band disclosure in `devicePrefs`, with its cost of a recorded entry per folder weighed first.
- Filtering, sorting, and advanced options in the SearchWindow.
- Virtualized Location rendering for large Collections.

#### Next Steps

1. Nathan's sign-off.
2. Plan Part 2 — Search Window as the second plan.
