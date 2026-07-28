## Feature-Doc Audit — Open Rulings

What survives of a full audit of all 26 feature docs against the code: one agent per doc, each
finding re-verified by an adversarial pass that reopened every cited `file:line`.

The findings themselves are spent — the docs they corrected have been rewritten, and the code
findings were either fixed or moved to `Open Code Findings.md`. What's left is the part that still
needs Nathan: the questions the code cannot answer on its own.

Answers land in the feature doc each question governs, and the question leaves this list. No
tombstones.

## Decisions For Nathan

Consolidated from all 27 audits; the doc fix depends on the answer. Decisions the code has since settled are gone from this list rather than marked — each one's answer now lives in the feature doc it governed.

1. **Built-in non-deletable Status on Tasks/Events** — build the seed + a `deleteProp` reserved guard, or restate Properties.md and Agenda.md as pending. *(Properties, Agenda)*
2. **Card drag under Group By: Location + Sort By: Location** — keep the cross-band move armed, or gate the whole drag on `!locationFsOrder`. *(CardView)*
3. **Sub-Set openability** — amend the doc, close the hole in nav/resolve indexes, or resolve a Sub-Set hit to its depth-1 ancestor. *(PageSets)*
4. **Adoption-on-open vs. "leave a foreign vault alone"** — eager is the contract, make stamping lazy, or gate a never-opened folder behind an explicit Adopt action. *(Pages)*
5. **Fenced-code copy button** — delete the claim, move it to Deferred, or treat it as a regression. *(MarkdownPM)*
6. **`--io` content-inset reflow** — register the inset so it rides the progress, or narrow the doc's claim to what `--io` genuinely carries. *(Interaction)*
7. **Menu type authority** — Figma or code? Correcting the code shrinks every menu and sidebar row app-wide and discards the macOS-content-size rationale. *(Typography)*
8. **Page Property Panel** — does the shipped `PreviewInspector` close the Pending item, rescope it to the main pane + Agenda, or does PagePreview.md own it outright? Interacts with the trailing inspector's Claude-chat reservation. *(Properties, Inspector, Pages)*
9. **Subfield top divider** — lighter footer seam is deliberate (fix doc + `subfield.css:16` comment), consume `--border-heading`, or add a footer-seam token. *(Subfield)*
10. **Quick Capture scope** — Page-only, or the agenda write path as a named prerequisite. *(QuickCapture)*
11. **Compact card styling sign-off** — close it, or name the exact unsigned surface. *(CardView)*
12. **Homepage as BlockHost** — permanent first-class host, still removable (and what replaces it as the landing surface), or demoted to a dev surface. *(SurfacePM, Structure)*
13. **Insertion-line drag family** — a permanent peer treatment alongside the sort engines, or transitional pending an engine insertion-line mode. *(PommoraDND)*
14. **Mobile-Readiness Invariants** — a record (strip the two unbuilt items), a spec (retitle as prospective), or build the delay activation + `touchmove` hedge. *(PommoraDND, Interaction)*
15. **View-embed config lock ↔ geometry** — one key with the coupling documented and the button relabeled, a separate config-only key, or document the freeze as intentional. *(SurfacePM)*
16. **The ~120ms reveal beat** — add a `quick` token below `fast`, or normalize all three literals onto `fast`. *(Interaction)*
17. **`table`/`lock` curated keys shadow real Lucide ids** — the picker shows one glyph and the app renders another. Rename the curated keys with a read alias, filter shadowed ids from the picker, or accept and document. *(Icons)*
18. **NavWindow vs preview tint** — `NavWindow.tsx:187` passes 90, `PreviewWindow.tsx:203` passes 85, and the morph is supposed to read as one window. Pick one, or rewrite the comment + doc. *(PagePreview)*
19. **Space-to-Space tagging** — cross-Context only (add the guard) or any Space (drop "other"). *(Contexts)*

### Open Questions

Each needs a ruling before the affected doc can be rewritten. Questions the code has since settled are gone from this list rather than marked — the answer lives in the feature doc it governed.

Fifteen closed that way: the trash preserves its source path; the agenda extension IS the kind discriminator; the open path seeds the Contexts registry explicitly; the alias parses and survives a rename while a pipe can't be a title; a user-minted Context's Spaces read the flat "New Space"; the one-folder-per-component rule was deferred intent, not a held rule; `EdgeLensGlass` went with the dead code; `parent_id` is a create-time breadcrumb that folder position supersedes; the entity-icon kinds no longer ship the retired three; the per-type width caps stay; and "no roll-up" means no rollup *property type* — a Collection's view aggregates its whole subtree, which `flattenContainer` has always done.

#### Q1 — Agenda

**Question:** Is the built-in, non-deletable Status property on Tasks and Events still the design — and if so, should the seed and the delete guard be built now, or should all three doc lines be restated as pending until the agenda write surface lands?

**Conflict:** Agenda.md:28 ("The seed is one built-in, non-deletable Status property") and Properties.md:59 + :124 ("Status is built-in and non-deletable on Tasks and Events"; "`_status` on the Task and Event schemas is non-deletable") all assert it as a live rule. The code implements neither half: no production path writes `property_definitions`, so an agenda config is created empty (Pommora/src/main/crud/folderEntity.ts:37), and `deleteProp` removes any id handed to it with no built-in check (Pommora/src/main/crud/schema.ts:191-209) — `isReservedPropertyId` gates adds only (Pommora/src/main/properties/schema.ts:64).

- Build it: seed `_status` when an agenda config folder is created, and reject a reserved id in `deleteProp`. Docs stay as written.
- Restate: mark the seed and the non-deletable rule as pending in Agenda.md and Properties.md, landing with the agenda write surface. No code changes.
- Drop it: Status becomes an ordinary user-added property on agenda configs like any other, and all three doc assertions come out.

#### Q4 — CardView

**Question:** Under location grouping with Sort By: Location (Order: Location), should a card still be draggable for a cross-band move, or should the computed filesystem order retire the card drag entirely?

**Conflict:** CardView.md line 48 states the intent — "Sort By: Location on its filesystem Order disables it (the order is computed)" — while Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx:392-393 retires only the within-band reorder and leaves the drag armed whenever `canRelocate` (structural grouping) holds, so a card can still be lifted and dropped into another Set's band as a real move.

- Doc is wrong, code is right: the computed order only kills the reorder — a cross-band move is a filesystem write, so it stays available. Rewrite line 48 accordingly.
- Code is wrong, doc is right: gate `cardDragEnabled` on `!locationFsOrder` so the whole drag goes inert under a computed order, and drop the cross-band path there too.
- Split it explicitly: keep the drag armed but make the same-band drop visibly refused (no landing preview) so the two behaviours read as intentional rather than as a half-disabled drag.

#### Q5 — CardView

**Question:** Is the Compact card styling signed off, or is there a specific Compact surface still awaiting your review?

**Conflict:** CardView.md's Pending list parks "Compact styling" as a build-then-sign-off pass, but the build has landed — the tightened band rhythm and imageless two-row reserve (Pommora/src/renderer/src/Detail/Views/Cards/CardsView.css:31-47) and the flow packing rules (:212-225) all render today; a separate Compact card behaviour is already recorded as signed off.

- Signed off: delete the Pending entry and let the Card Anatomy / Layouts sections carry Compact as current.
- Not signed off: keep the entry but name the exact unsigned surface (flow density? imageless reserve height? footing clearance?) so it's actionable rather than a standing placeholder.
- Partially: move the reviewed parts into the Features body and leave only the unreviewed knob in Pending.

#### Q10 — Contexts

**Question:** Is a Space allowed to tag Spaces inside its own Context (including itself), or is Space-to-Space strictly cross-Context?

**Conflict:** The doc says a Space "tags Spaces in *other* Contexts via its own sidecar keys." The code enforces no such restriction: `setSpaceContext` accepts any `contextId` and `targetTitles` resolves any Space id in the world, including the writing Space's own Context and the Space itself (src/main/crud/contextWrite.ts:196-215, 102-110).

- Doc is right, add the guard — reject a target in the source Space's own Context (or at minimum reject self-tagging) in `setSpaceContext`.
- Code is right, drop the word "other" — a Space tags whichever Spaces fit, same as any entity, and self-tagging is a user's problem.
- Allow same-Context tagging but reject self-reference only, which is the one case that can never mean anything.

#### Q13 — Icons

**Question:** Two curated keys (`table` and `lock`) are also real Lucide ids for completely different glyphs, and the curated registry wins — so picking Lucide's Table or Lock in the Icon Picker renders Pommora's grid / solid-lock instead of the glyph the picker cell showed. Do we rename the curated keys off the collision, hide shadowed ids from the picker, or accept it and say so in the doc?

**Conflict:** Icons.md:70 asserts "A picked id is stored as its bare Lucide kebab id, the same convention as the curated names, so the two sources render through one path." The code contradicts the "one path" premise: symbols/index.tsx:143 maps `table` → Grid3x2 and :148 maps `lock` → LockSolid (a custom glyph), while lucide-react ships its own `table.mjs` and `lock.mjs` — both of which appear as pickable cells because AllSymbols.ts:28-38 enumerates the full Lucide set. Icon (symbols/index.tsx:215) resolves the curated registry FIRST, so the stored id renders the curated glyph, not the picked one. IconPicker.tsx:222 draws the cell from the full-set component, so the grid and the result disagree.

- Rename the curated keys to non-colliding ids (`grid-3x2`, `lock-solid`) and alias the old ids on read — view sidecars persist icon ids, and viewIcon.ts already carries a legacy `'tablecells'` read path, so the alias pattern exists.
- Filter ids that the curated registry shadows out of ALL_ICONS so the picker never offers a cell it can't honor — smallest change, but it silently removes two real Lucide glyphs from the user's reach.
- Accept the shadowing as intentional (Pommora's vocabulary outranks the library) and correct Icons.md to state that a curated key wins over a full-set id of the same name.

#### Q14 — Icons

**Question:** Does Connections actually get `link-2` as its glyph, or should the reservation be dropped? Nothing in the app renders it, and the two docs that assign it disagree about what it's for.

**Conflict:** Icons.md:64-66 assigns `link-2` to Connections and reserves it for the `[[Title]]` surface. The registry's own mirror, symbols/Symbols.md:44, assigns `link-2` to the "Context/Relation property type · Connections" — but there is no relation property type (the project CLAUDE.md states content ↔ content relational properties don't exist), and the Context type is `layout-grid` per PropertyTypes.tsx:27. The code settles neither reading: `link-2` appears exactly once in the whole renderer, at symbols/index.tsx:130, with no consumer.

- Keep the reservation, mark it plainly unwired in Icons.md, and fix Symbols.md:44 to read "Registered, held for the Connections surface" — the same phrasing its other unassigned keys use.
- Drop `link-2` from the registry and from both docs until a connections surface actually needs a glyph; re-add it then.
- Wire it now — give the connections surface (autocomplete rows / hover card) the `link-2` lead so the assignment stops being a claim about nothing.

#### Q15 — Inspector

**Question:** When the Page Property Panel ships for the main pane, does it reuse the existing front-matter inspector component in a side pane — which means the trailing inspector either gives up its Claude-chat reservation or the shell grows a second side slot — or does it mount inline with the page content, leaving the trailing inspector Claude-only and rendering properties two different ways in the main pane versus the preview?

**Conflict:** `Features/Inspector.md:5` says the trailing pane is reserved for the Claude chat and that properties "live with the content." `Features/Properties.md:132` files the Page Property Panel as Pending — "a panel attached to the content… there's no UI to view or edit them on an entity." But `Features/PagePreview.md:39` documents a fully built front-matter inspector ("properties only"), and the code confirms it: `PreviewInspector.tsx:201` renders the context and property groups with Add/Remove, while `PageView.tsx:69` renders no property surface at all. So the shipped component that does this job is an inspector-shaped side pane, and the main shell's inspector-shaped side pane is reserved for something else. Correcting the doc's properties sentence requires knowing which way this resolves.

- Trailing inspector stays Claude-only; the Page Property Panel mounts inline in the page (a collapsible front-matter strip beneath the title/banner). Costs: the main pane and the preview render the same data through two different surfaces.
- Trailing inspector becomes a two-mode pane (Properties | Claude chat) hosting the existing PreviewInspector component. Costs: one property surface everywhere and no new chrome, but the Claude chat no longer owns the slot outright.
- Keep properties preview-only for now and say exactly that in both docs — no page-attached panel in the main pane, and the Inspector doc drops the "they live with the content" claim entirely rather than pointing at an unbuilt surface.

#### Q16 — Interaction

**Question:** Should the inspector's content-inset reflow actually be derived from `--io`, or should the doc be corrected to describe the independent per-surface padding transitions the code has today?

**Conflict:** The doc's Principles bullet states the law — "One progress variable drives a coordinated multi-element move (the `--io` shell) rather than N independent transitions that can desync" (Interaction.md) — and the `--io` section lists the content-inset reflow as one of its passengers. The code does the opposite: `styles.css:151` flips `--content-inset-right` as a plain unregistered custom property (it snaps), and `Detail/Detail.css:31`, `MarkdownPM/Styles.css:50` and `Detail/Subfield/subfield.css:19` each run their own `padding` transition. They share the base token, so they look synced, but they are exactly the N independent transitions the principle forbids.

- Treat it as a code defect: register `--content-inset-right` (or express the insets as `calc()` off `--io`) so the reflow genuinely rides the one progress, then leave the doc as written.
- Treat it as intended: the insets are layout, not the inspector's motion, so document them as siblings on the same token and narrow the `--io` claim to the slide, the trio ride and the glass void.
- Split the principle: `--io` owns everything that must be frame-exact against the pane's own edge; anything merely landing on the same beat is allowed its own transition, and the doc says so explicitly.

#### Q17 — Interaction

**Question:** Is the ~120ms reveal beat (sidebar section "+", callout grip, table grip) an intentional step that deserves its own motion token, or drift that should be normalized onto `fast`?

**Conflict:** The doc asserts both halves of a contradiction: the Sidebar catalog says "Row and section hovers run a step faster than the rest of the sidebar's chrome" (reads as a deliberate faster beat), while Timing Sources says "A hardcoded duration in a permanent surface is a bug." The code has the literal in three permanent surfaces — `Sidebar/Sidebar.css:313`, `MarkdownPM/Styles.css:791`, `MarkdownPM/Tables/widget.css:50` — and the sibling grips in that same shared recipe (`MarkdownPM/Styles.css:236`, `:248`) already use `--duration-fast`.

- Add a `quick` step to `motion.ts` below `fast`, point all three at it, and keep the doc's "a step faster" language as a real token relationship.
- Normalize all three onto `--duration-fast`, delete the "a step faster" claim, and keep the duration scale at five steps.
- Keep the literals but document them as deliberate exceptions in Timing Sources alongside the drag-feel presets — weakest option, since it dilutes the rule the section exists to state.

#### Q18 — MarkdownPM

**Question:** Is the fenced-code copy button still wanted? The doc says it ships; nothing in the codebase implements it. Should I delete the claim outright, or move it to Deferred as work you still want?

**Conflict:** The doc (Constructs → Code) states "fenced gets a copy button." The code has no copy affordance anywhere in MarkdownPM — the fenced-code branch in `Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts:259` emits only a line class and marker hides, and a case-insensitive grep for "copy" across the whole module returns nothing.

- Delete the claim — a copy button was never part of the design, and the Code bullet reads correctly without it.
- Move it to Deferred ("**fenced-code copy button** — not built") because you still want it, and leave the Constructs bullet describing only what renders today.
- Treat it as a regression: the doc is right, the button was lost, and it should be rebuilt rather than documented away.

#### Q20 — Navigation

**Question:** Is the NavWindow rail as built — the Favorites list with the List / Gallery toggle beneath it — the intended rail, or a stand-in still pending your design call? And does the shipped hover pin marker count as settled, leaving only the current-item marker open?

**Conflict:** Navigation.md line 23 describes the rail as a built surface ("A glass rail (a Favorites sidebar) beside a main frame") and the code matches it exactly — NavWindow.tsx:202-216 renders the favorites NavList plus the Style toggle. But Navigation.md line 59's Pending section lists "the pin/current-item row marker, and the rail content" as open design work. Rows likewise already carry the pin marker (NavList.tsx:176 with navList.css:21-41), while list rows carry no current-item treatment even though gallery cards do (NavGallery.tsx:131).

- Rail is done — strike "the rail content" from Pending and keep only the Figma gallery form + the current-item row marker as open.
- Rail is a placeholder — keep it in Pending, and change line 23 to present the Favorites list as the current stand-in rather than the spec.
- Split it — rail composition is settled (favorites) but the toggle's placement inside the rail is still open; say exactly that in Pending.

#### Q21 — PagePreview

**Question:** Should the NavWindow adopt the floating preview's tint so the flavor morph really does carry one background, or should the doc (and the code comment) stop claiming the two match and accept a small opacity step through the morph?

**Conflict:** PagePreview.md §The NavWindow Flavor says "The window paints the floating preview's tint," and NavWindow.tsx:186's comment says "The preview window's tint verbatim — the flavor swap keeps ONE background, no opacity jump." But NavWindow.tsx:187 passes tintOpacity 90 while PreviewWindow.tsx:203 passes 85 (SettingsWindow.tsx:83 also sits at 90, and the PreviewPane default is 85). Neither window restyles `--ppane-bg`, so the fills differ only in opacity and the morph does step. I can't tell from the code which value is the intended one — the doc and comment agree on parity, the code disagrees with both, and picking a side is a visual decision.

- Bring the NavWindow down to the preview's tint — honors the stated "one background" intent; the nav window becomes slightly more transparent than it is today.
- Bring the preview up to the value the NavWindow and Settings window share — parity holds from the other side, and the floating preview becomes slightly more opaque.
- Keep both values and rewrite the doc plus the NavWindow comment to say the nav window sits a step more opaque than the preview, accepting the opacity step through the morph.

#### Q22 — PageSets

**Question:** Should a Sub-Set (depth-2+) be openable at all outside the sidebar, or is the expand-only rule meant to hold everywhere — and should I fix the doc or fix the code?

**Conflict:** PageSets.md § Selection + Navigation says Sub-Sets "are expand-only … and they have no detail view." The code says otherwise on every non-sidebar path: `navSearch.ts:33` indexes every Set at any depth as a selectable target, `useNavData.ts:95-108` selects whatever it's handed, and `DetailPane.tsx:49-58` renders a full `ContainerView` for any `set` selection. `Scope.ts:73-79` shows this is knowing tolerance, not an oversight — "a reparent + Back-nav replay can surface one as a `set` selection, so the view paths test this rather than trusting 'depth-1 by construction'."

- Keep the code, amend the doc — Sub-Sets are sidebar-expand-only but openable from search / pins / Back-nav, where they render the container view without the view switcher.
- Close the hole so the doc stands as written — exclude depth-2+ Sets from `buildNavIndex` and `buildResolveIndex`, and have `DetailPane` route a non-depth-1 `set` selection to its owning depth-1 ancestor.
- Middle path — keep Sub-Sets findable in search (they're real folders a user will type the name of) but have the click resolve to the nearest depth-1 ancestor rather than opening the Sub-Set itself.

#### Q24 — Pages

**Question:** Is eager adoption-on-open the intended contract, or is stamping a ULID into every un-adopted `.md` the moment a folder is opened a violation of the "leave a foreign vault alone" promise this doc states?

**Conflict:** The doc (Features/Pages.md § Adoption) asserts a design goal: "The loader never writes back … opening a folder that's also an Obsidian vault leaves notes byte-identical until touched." The code does the opposite by construction: src/main/index.ts:555-567 runs `stampAdopted` on every open path, and src/main/adopt.ts:29-35 rewrites each `.md` lacking an `id`. The main-process comment at index.ts:552-553 states the eager stamp as deliberate — "so the index + every later write capture a stable id, not a transient `adopted-` placeholder" — so this is two intents disagreeing, not an oversight. It also collides with the project's Obsidian-compatibility framing in CLAUDE.md.

- Code is right, doc is wrong: rewrite § Adoption to describe eager adoption-on-open as the intended contract — a foreign vault gets `id:` stamped into every page on first open, with foreign keys/comments/body preserved.
- Doc is right, code is wrong: make stamping lazy — keep the `adopted-<hash>` read id and mint a real ULID only on the first write to a given page. Costs the index a stable key for never-edited pages.
- Split the difference: keep eager stamping for a nexus Pommora created or has already adopted, and gate a never-before-opened foreign folder behind an explicit "Adopt this folder" action, so pointing Pommora at an Obsidian vault to look around genuinely changes nothing.

#### Q25 — PommoraDND

**Question:** Is the bespoke insertion-line family (sidebar tree, table rows, table bands, the property panes — all on `gesture.ts`) a permanent second treatment that sits alongside the sort engines as a peer, or a transitional state that should eventually fold into the engine seam?

**Conflict:** The doc says two different things. "Sidebar Tree (The App's Chosen Behavior)" presents the insertion-line treatment as a deliberate, chosen design ("because its drop feel is an Apple-style insertion line, not displacement"), which reads permanent. "Verification Harness" then frames engine adoption as the trajectory — "The sidebar tree is adopted; the main list / view rows remain a later, deliberate integration" — which reads transitional. The code supports neither reading cleanly: the engine seam is consumed by seven app surfaces (`TabBar.tsx:201`, `Ribbon.tsx:80`, `NavGallery.tsx:59`, `IconPicker.tsx:160`, `PreviewTabStrip.tsx:112`, `ViewEmbedBlock.tsx:452`, `CardsView.tsx:459` + `:474`) while four more run entirely on `gesture.ts` with their own models, snapshots, and drop chrome. Which one the doc should describe as the system's shape is a design call, not a code fact.

- Declare two permanent, named treatments — "displacement" (engine-backed: pills, tabs, cards, galleries) and "insertion line" (bespoke: trees, table rows, bands, panes) — and rewrite the doc around that split, with `gesture.ts` documented as the second family's shared skeleton rather than a helper.
- Declare the insertion-line family transitional and name the target: the sort engines grow an insertion-line drop mode, and the bespoke surfaces migrate onto it. The doc then keeps an explicit, dated-free Pending section for that migration.
- Keep the current framing but scope it honestly: state that engine adoption is complete for the surfaces that displace, and that the insertion-line surfaces are out of scope for adoption by design.

#### Q26 — PommoraDND

**Question:** Are the "Mobile-Readiness Invariants" a record of what's built, or a spec of what a future touch pass must hold to?

**Conflict:** The section reads present-tense and factual ("the sensor and collision layers keep a future touch UX viable: … delay+tolerance activation, a non-passive `touchmove` hedge …"), but two of its six items don't exist: activation is a pure travel-distance threshold with no timer (`gesture.ts:92`, `engine.tsx:221`), and there is no `touchmove` listener anywhere in the renderer. The other four (`touch-action: none`, `pointercancel` handling, a separable keyboard sensor, size-agnostic collision math) do hold. Correcting the doc and correcting the code are different jobs, and which one is wanted depends on whether touch is a real near-term target.

- Treat it as a record: strip the two unbuilt items so the section states only what holds today (my suggested rewrite in falseClaims).
- Treat it as a spec: retitle to make it prospective — an explicit "what a touch pass must add" list — and keep the delay activation and `touchmove` hedge in it as unbuilt requirements, clearly marked.
- Build the two: add an optional press-delay to `PointerGestureSpec` alongside the travel threshold, and a non-passive `touchmove` preventDefault hedge on active drags — then the section becomes true as written.

#### Q27 — Properties

**Question:** Is the built-in, non-deletable Status property on Tasks and Events a shipped guarantee that regressed, or a design decision that was never built? Should I build the seed + the delete guard, or restate both docs as prospective?

**Conflict:** Properties.md §Status ("Status is built-in and non-deletable on Tasks and Events") and §Validation ("`_status` on the Task and Event schemas is non-deletable") both assert it, and Agenda.md §Schema + Status repeats it ("The seed is one built-in, non-deletable **Status** property"). The code does neither: `createFolderEntity` writes only `{ id, ...extra }` to a `_taskconfig.json` / `_eventconfig.json`, so no Status def is ever seeded (main/crud/folderEntity.ts:23-38); `deleteProp` carries no reserved-id guard, so a `_status` def would delete like any other (main/crud/schema.ts:191-209); and `RESERVED_PROPERTY_ID.status` has no reference anywhere outside its own declaration (shared/properties.ts:140).

- Build it — seed `defaultStatusSeed()` into a new agenda config's `property_definitions` and add a reserved-id guard to the Agenda delete/changeType paths; leave both docs as written.
- Restate — move the built-in Status to Pending in both Properties.md and Agenda.md, and drop the non-deletable line from §Validation until the guard exists.
- Split — keep the seed as the intended design in Agenda.md (it's an EventKit contract), and mark only the non-deletable enforcement as unbuilt in Properties.md §Validation.

#### Q28 — Properties

**Question:** Does the shipped Page Preview front-matter inspector close the "Page Property Panel" Pending item, or is a second panel still planned for the main window's page surface (and for Tasks / Events)?

**Conflict:** Properties.md Pending says "there's no UI to view or edit them on an entity," and §Where Properties Live closes with "the Page Property Panel is Pending." But PreviewInspector ships exactly that surface — it lists a page's Context rows and assigned properties, edits them through the table's own Cell / PropertyPicker / CalendarPicker / PropertyEditor primitives, reveals empties via "+ Add Property," and offers Remove on right-click (renderer/src/PagePreview/PreviewInspector.tsx:48-230), mounted in both PreviewWindow.tsx:227 and NavWindow.tsx:226. PagePreview.md §The Inspector documents it as shipped. Separately, Inspector.md states the main window's inspector body renders nothing and that properties deliberately live with the content.

- Close it — delete the Pending entry, and change §Where Properties Live to point at the Page Preview inspector (→ PagePreview.md) as the entity-level value surface alongside table cells.
- Rescope it — keep the Pending entry but narrow it to what's genuinely missing: the same panel on the main detail pane's page surface, and any property panel for Tasks / Events.
- Relocate it — treat the inspector as PagePreview.md's to own, and have Properties.md carry only a cross-reference plus the Agenda gap.

#### Q29 — QuickCapture

**Question:** Does Quick Capture ship Page-only, or does the agenda write path get built as a prerequisite so Tasks and Events can capture on day one?

**Conflict:** QuickCapture.md says capture covers 'Pages, Tasks, and Events' and 'reuses the same create operations … as the main app' — but the code has no Task/Event write path reachable from the app at all: `MutableKind` (Pommora/src/shared/mutate.ts:14) has no task or event member, `agenda:list` (Pommora/src/main/index.ts:351) is the only agenda IPC channel and is read-only, and the agenda CRUD in Pommora/src/main/crud/agendaEntity.ts is imported only by tests. Correcting the doc means choosing what Quick Capture's scope actually is, which the code can't answer.

- Scope the doc to Page capture and move Task/Event capture down into Pending alongside the agenda write path
- Keep all three kinds in scope and name the agenda write path (mutate ops + IPC + container creation) as an explicit prerequisite in Pending
- Treat wiring the agenda write path as its own piece of work that lands first, and leave the doc's three-kind claim standing as the post-prerequisite design

#### Q34 — Subfield

**Question:** The Subfield's top divider is a hand-rolled hairline, lighter than the app's shared heading seam token. Is the lighter footer seam the intended design (doc gets corrected), or is this drift that should consume the shared token (code gets corrected)?

**Conflict:** Subfield.md line 18 says "The top divider is the shared title-divider hairline." The code hand-writes `border-top: 1.25px solid var(--separator-border)` at Pommora/src/renderer/src/Detail/Subfield/subfield.css:17, while the app-wide heading/title seam is the `--border-heading` token defined at Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts:44 (a heavier rule) and consumed by the banner title header at Pommora/src/renderer/src/Detail/Banner/Banner.css:131. CLAUDE.md's design rule says tokens must be pulled from their sources, never hand-rolled.

- Deliberate: keep the code, rewrite the doc as "a hairline on the shared separator colour, set lighter than the app's heading seam."
- Drift: change subfield.css to `border-top: var(--border-heading)` and keep the doc's "shared" wording — the seam under the footer becomes visibly heavier.
- Third weight: add a footer-seam token at the current weight in the token file, have subfield.css read it, and let the doc name that token.

#### Q35 — SurfacePM

**Question:** Should locking a view embed's *configuration* also freeze the tile's position and size — and if so, should the SettingsPane's footer button still read "Lock view configuration"?

**Conflict:** The doc and the scope contract both define this lock as config-only: SurfacePM.md says "The lock freezes **configuration**, not reading," and src/renderer/src/Embeds/ViewEmbedScope.tsx:25-27 says "Frozen: view config + view CRUD. Live: data drags, value edits, and view state." But the SettingsPane footer writes the same `locked` key that src/renderer/src/Blocks/BlockSurface.tsx:433 feeds into `isTileStatic`, so pressing "Lock view configuration" also makes the tile un-draggable and un-resizable — geometry neither source claims it touches.

- Keep one key and accept the coupling — the doc then states plainly that any per-tile lock is a geometry lock too, and the SettingsPane footer is relabeled ("Lock Tile") so the button matches what it does.
- Split the concerns — the view embed gets a config-only key that leaves drag/resize live, and only the handle menu's footer lock freezes geometry; the doc keeps its current "configuration, not reading" wording.
- Keep both the key and the label, and document the geometry freeze as an intentional part of the config lock ('a locked tile is settled — nothing about it moves').

#### Q36 — SurfacePM

**Question:** Is the Homepage now a permanent first-class BlockHost, or is it still slated for removal once Spaces are the only hosts?

**Conflict:** SurfacePM.md calls it "the removable dev host until the real hosts land," and src/renderer/src/Detail/HomepageView.tsx:8-12 still calls homepage.json "the G-12 dev host; removable behind the BlockHost seam." Against that, Spaces have landed as real hosts (BlockHostRef's `space` kind, `_space.json` docs, seeded starter boards, a routed detail view with its own board lock) while the Homepage is simultaneously the app's home route with its own banner, heading-icon toggle, and board lock in the settings scaffold. The code can't say which of those two futures is intended.

- Permanent — rewrite both the doc and the HomepageView comment to describe two first-class hosts (the Homepage singleton and any Space), and drop 'dev host' entirely.
- Still removable — keep the framing but say in the doc what replaces the Homepage as the landing surface, so the removal isn't an unexplained loose end.
- Demote — keep the Homepage reachable but state it as a developer surface, and make a Space (or a chosen default Space) the real landing host.

#### Q38 — Typography

**Question:** For menu and dropdown rows, which is authoritative — the Figma text styles this doc mirrors, or the code's deliberate choice? The doc says row titles are Callout/Standard and headings are Headline/Standard; the code ships Body/Standard and Headline/Emphasized, with a rationale baked in ("Composes Body/Standard so the title is 13px, the macOS standard content size"). Do I correct the doc to match the code, or is the code the thing that drifted from Figma?

**Conflict:** Typography.md "Where Each Style Goes" says menu/dropdown item titles → Callout/Standard and Menu Headings → Headline/Standard, and the doc names the Figma "Pommora - React" library as the source of truth for sizes. The code disagrees on both: src/renderer/src/design-system/components/menu/menu.css.ts:15 composes text.body.standard for the row, and :98 composes text.headline.emphasized for the heading — and menu.css.ts:11-12 carries an explicit macOS-standard-content-size justification for the Body choice.

- Correct the doc: menu rows are Body/Standard, menu headings are Headline/Emphasized. Nothing in the app changes; the doc stops disagreeing with the one row primitive every menu and the sidebar share.
- Correct the code to the doc: drop the row to Callout/Standard and the heading to Headline/Standard. This shrinks every menu row and sidebar row in the app by one ramp step and lightens every menu heading — a visible, app-wide change, and it discards the macOS-content-size rationale currently in the code.
- Re-pull the Figma menu component's text styles first and let that settle it, then fix whichever side is wrong.

#### Q39 — Views

**Question:** The Grouping pane's structural **Order** picker and the cards Sorting pane's **Location Order** picker are documented as two independent controls, but they read and write the same `structural_order_mode` key — with opposite defaults. Should the doc state that they're one stored field (and that the two Orders shadow each other on a cards view that groups structurally), or should the cards Location sort get its own order key so the two stay genuinely independent?

**Conflict:** Views.md describes them separately — "per-kind **Order** pickers (Location: Custom / Location …)" in the Grouping pane bullet, and "whose Order picker is Location / Custom" in the Sorting pane bullet — with no note that they share storage. The code has both writing `structural_order_mode` (GroupingPane.tsx:311-313 reads it defaulting to 'custom'; SortingPane.tsx:262-272 reads it defaulting to 'location'), and the pipeline reads it under two different defaults in one function (resolveView.ts:35 defaults 'location' for the cards sort; resolveView.ts:52 treats absent as 'custom' for band order). On a cards view that groups structurally AND sorts by Location, setting one Order silently retargets the other.

- Document the sharing: state that structural band order and the cards Location sort are one per-view order mode, and that the pairing the doc already prescribes (Sort By: Location with Group By: None) is what keeps them from colliding.
- Give the cards Location sort its own order key so the two controls are independent, and correct the doc to describe two fields.
- Gate the Sorting pane's Location Order row out whenever the view groups structurally, so only one surface can write the key at a time, and say so in the doc.
