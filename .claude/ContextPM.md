## Project Pommora – Active Context

### Current Focus

**The Renderer Rework is active — the exploration is reported, and execution is proceeding through directed cleanups.** [[]] is the one document: filing rules, target tree, the rulings a sweep must not re-derive, the checklist of moves, the open rulings, and the exploration. Twelve read-only perspectives (Reducer priority) plus a Skeptic pass ran against the renderer 08-28; the load-bearing findings were verified at the line and captured in a synthesis (scratchpad `explore/`, and the published artifact). Rather than wait on a ratified framework, Nathan is directing targeted moves against the findings — dead vars to literals, one-place table-head type, `WarmCache`→`Store/TabState`, the banner/divider consolidation, `Interface/Banner/` dissolved (`content-banner.css` + `content-title.css`), `tile-chassis`→`Blocks/`, `AssetImage`+`assetUrl`→`Assets/`, and `DesignSystem/Components/` dissolved (Pickers/Controls/Fields/SidePane at the design system's top level, `useDismiss`→`Interactions/`). This latest pass landed the checkbox consolidation (`Controls/checkbox.css` owns `.checkbox`, out of the Labels domain), the button size scale (into `Buttons/button-base.css.ts`, `size.control` retired, segmented runs one clipped pill), a ⌘⇧T dev scratchpad (`Utilities/iteration-window`), the `Showcase` move to `renderer/Showcase`, and the doc infrastructure — CLAUDE.md's Testing Conventions, the Resources dismantling, and Guidelines collapsed to four. Each lands gated with its LOC and the map crossed off; §6 Working Rules governs the ledger.

**Where it stands.** The value editing and visual tuning are mostly done; the design-system consolidations are in. What remains on the rework is the larger folder moves (`Core/`, `Interface/` absorbing `Sidebar/`, the tile world, the casing renames) and the collapse/split rows, then the framework. Nathan's lean is the next feature asap — the structural rows resume when the rework is picked back up.

**Where the tree stands.** The dependency order reads `DesignSystem ← Properties ← Tables ← Views`, with `Cards/`, `Windows/`, and `Frames/` standing on the design system alone; `DesignSystem/Glass/` is the material in four tiers and `DesignSystem/Menus/` the menu recipe in kebab parts. The five words — Window, Pane, Menu, Frame, Picker — name every floating or sliding surface. The rulings taken so far are in the atlas's Settled list.

### Immediate Work

- [ ] **Where does the floating identity label live?** Embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element or NavTrail absorbing the webpage case.

### Pending Focuses

#### One — Inline Page Properties

- [ ] **A property surface attached to the page itself**, rather than only inside the Settings dropdown's Properties leaf, so a page's values are visible and editable where the page is. The frame, the sources, and the decisions taken so far are in `// Planning`'s Decision Log; it runs parallel to the two arcs below and shares no files with them.

#### Two — The Renderer Rework

The whole-renderer organizational and stylistic arc, being shaped — see §Current Focus. [[RendererRework]] is its one document: the rules, the checklist, the open rulings, and the exploration; [[DesignSystemPM]] keeps the vocabulary. Nothing about the arc lives anywhere else.

#### Three — The Codebase Cleanup

The behavioral half — correctness, performance, and the structural moves inside the processes. Each is a session of its own, each verified by something a typecheck cannot supply, and none of it is visible from the interface. The session-sized work rides [[Codebase-Cleanup-Checklist]].

- [ ] **The `main/index.ts` split.** Roughly 110 channel implementations share a file containing window creation, protocol registration, and application lifecycle, which makes it the one file every parallel session collides on. The bridge seam itself is excellent and is not what moves: `serveBridge` already takes a plain object, so the channels become per-domain partial maps spread into one. The first step is carving out the context they all close over — the shared refusals, the path resolvers, the confirm-and-push helpers, and the window reference itself — since every domain map needs it and none of them can own it.
- [ ] **Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns contains around 18,000 elements, and every pipeline re-run reconciles them all. Group bands complicate it, so the scoped version virtualizes the flat, ungrouped case first, where the win is largest and the band machinery is absent.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Open Against The Web Layer

- [ ] **A guest's scripted popups ride the open-link chain with no user-gesture gate** — acceptable for trusted embeds, ungated by decision pending Nathan's ruling.
- [ ] **Retention's two bounds.** A tile scrolled far enough loses its widget to the editor's viewport recycling regardless of the cap, and a retained guest keeps playing audio by design — whether scroll-out should mute is a product call.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **A failed `loadValues` paints "No pages here"**, since the view host decides loading and empty but has no error state; a third root state at the seat, once the refused-write silence ruling is revisited.
- [ ] **Two retention budgets act on the same guests and neither knows it.** Parked page surfaces cap at 2 tabs, hidden web guests at 5, and parking routes every tile inside a parked surface through the hidden-guest path — two parked tabs holding four web tiles each already exceeds the guest cap, so the LRU tears down the live sessions parking exists to preserve. One budget with tiers, or the numbers chosen together.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **TokenField — a typed value becomes a Label:** an InputField holding a run of labels beside a bare caret, where Enter turns the draft into a segment resolved against the field's picker (a Set title into an EntityIcon segment, a free string into a FileLabel) and Backspace on an empty caret removes the last. The pieces exist apart — `EditableInput` names an option chip in place, `SegmentRun` holds a field's values, the Filter pane's Location run is pick-only — and the showcase's capped field already sketches the shape. Its consumers are every location-shaped input: the Location filter, file properties, Context assignment.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.
- [ ] **Property Translation:** The ability to have Pommora recognize foreign properties and validate values against Pommora’s own stored registry; value-writes landing on both app-wrapped and non-wrapped properties. 

### Important Information

- **A personalization key has to take its readers with it.** A surface left reading the tree's copy of a setting sees a value that only refreshes on a disk round-trip, which presents as a settings row that doesn't work — the store slice is what updates live.
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide, and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A renderer `preventDefault` cannot suppress main's `context-menu` event.** Any editable target pops main's own editor menu regardless, so a surface that wants its own menu there has to be the only claimant — which is why the table widget reports non-editable and why two menus over one field is the recurring symptom.
- **Glass comes in three frost tiers, and the names mean them.** `GlassPane` is the chrome pane — sidebar, inspector, side slots, the anchored surfaces — brightest and clear; `GlassSurface` is a Menu floating over it a step dimmer; `GlassWindow` is that surface carrying the shared body. One `SOLID_FILL` sits behind every darkened surface, and a menu opening over another surface asks `GlassSurface` for `solid` rather than writing a background. Only `MenuSurface` still wears a beak, and it is the only shell drawing its own outline.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **Two rules any future in-app window must respect**, both learned on the WindowBase: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

Known shortcuts, none broken today. Each is cheap on its own and best taken when its owning file is next touched — or swept together as one batch session.

- [ ] **Fire-and-forget writes have no seam.** Sixty-three channels return the `Result` envelope and the renderer checks `.ok` at thirty-two sites. The gap is a coherent family — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown` and nine more — every one called as `void window.nexus.x(…)` with the failure discarded, so a locked file or a full disk shows the new fold state, column widths and tile heights and persists none of them until restart. One `persist()` helper makes handling the default; the pattern has been copied sixteen times. Whether silence is acceptable for this class is an Open Call above.
- [ ] **Table perf ceilings.** Tables render every row without virtualization, so a very long collection will eventually feel it, and a value edited outside the app doesn't live-refresh an open table.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] MarkdownPM Tables have autocorrect blocked, likely due to their inactive-until-entry design; numbered lists also have their periods flagged as incorrect by an autocorrect. 

### Recent Work

#### PM-120 || The Single ViewHost

Both view renderers now mount through one seat. `Views/useViewHost.ts` owns everything a renderer needs before it can draw — the value stack and override layer, schema and active view, manual order, the optimistic order/hidden/style and band layers, collapse, the pipeline invocation and its lookups, the writers, the persist fold, and the creation engine — and `Views/ViewHost.tsx` seats it, decides loading and empty once, and passes a single `host` object; `TableView` keeps its column machinery and gestures, `CardsView` its grid and pickers, and each contributes a five-field seam. The four observable drift defects between the two files closed by construction, Cards adopting Table's documented side of each. A new renderer (List, Gallery, Calendar, Timeline) mounts the host and writes presentation only. `Properties/Editing/` is `Properties/Assignment/`.


#### PM-115 || The ImagePicker

The crop surface widened past the nexus icon into one design-system component every image-bearing seat frames through. A crop is a focal point and a zoom, never a pixel rectangle, kept in `shared/cropGeometry.ts` — the one producer of a framed image's paint, so the editor and every seat render through `coverStyle` and cannot disagree, and one framing reads correctly at any aspect. It rides `.nexus/crops.json` as a tree leaf keyed by the image, so a framing serves every surface the picture appears on, follows the nexus to another device, and never touches the file or the note. `AssetImage` replaced the ten hand-rolled `<img>` seats, gated on a crop existing: with none it stays a plain `<img>` and loads no aspect, with one it paints the `coverStyle` box, observing its own size for the fill axis. The nexus photo joined the same path-and-crop model every banner already followed, and the data-URL pipeline that baked a PNG and shipped bytes over IPC is gone. `ImagePicker` frames a stored image as a circle or a rect cut to its seat, panning on the app's one gesture primitive and zooming out onto a color drawn from the image; Edit reaches it from the banner menu, the card menu, and the icon menu, and the footer re-picks by dialog or paste. This completes the three-part file-based arc.

#### PM-114 || File Properties

The `file` property type is complete — the tenth and last. A value is a bare array of `[[Basename.ext]]` wikilinks resolved in the asset map's basename domain, which puts file names in their own namespace and keeps them structurally outside the rename cascade: the scanner and the rewriter both read string frontmatter and skip arrays, so neither knows what a file property is. Each property names a **Directory** its files land in, validated for containment and for indexability — a contained folder the map would never walk is a write whose own reference can never resolve. The value's area adds and a chip replaces, both through the OS dialog opened at a folder, so revealing where a file lives and swapping it are one gesture and nothing opens a file in-app. Adoption is one exported seam carrying every guard that makes it safe, and a removed reference never deletes bytes: the seam dedups, so two pages can share one file.

#### PM-112 || Variable Asset Directories

The nexus asset directory became a folder the user picks, and a stored image became an ordinary named file in it. A banner keeps whatever name it had on disk and is named from Pommora by `[[That File.png]]`, which is the same reference Obsidian writes — so one folder serves both applications and neither owns it. Resolution is renderer-side against a map main patches from watch events and pushes, which is what makes a file arriving in a synced folder repaint what names it without a walk; nothing is persisted about an asset but its filename, so a sync eviction and re-download is a non-event and an external rename phantoms rather than being chased. The live nexus migrated: every reference the old writer minted moved out of `.nexus/assets`, byte-identical copies collapsed to one, invented `banner-<token>` names were replaced by their owners', and the folder was emptied through the trash. A replace now deletes only what Pommora minted under its own root — the configured folder is the user's, and a file there may be referenced from a note this app cannot see.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
