## Project Pommora – Active Context

### Current Focus

**The three-part file-based arc is complete.** Part 3, the ImagePicker, is one design-system surface framing every image the nexus shows — banners, card covers, a page cover, the nexus photo — by a focal point and a zoom stored in `.nexus/crops.json` beside the nexus and keyed by the image, so one framing serves every seat and never touches the file or the note. Part 2 completed the `file` property type, the tenth and last, so a page holds named files legible on disk and reachable in the OS's own browser from the value that names them. Part 1 is what both rest on: the asset directory is the user's to choose, and a stored image is named the way Obsidian names one, resolved renderer-side against a filename map main holds and pushes. With that, the file layer is finished and no feature work is waiting on it. Two smaller settings additions sit beside it: Interface Scale, a picker in Settings → Interface over the `defaultViewScale` key that already existed, applied the moment it is picked; and a typed unit on every scale picker, so a value written out keeps the percent sign it is read with.

**The theme that has replaced it is the renderer's own organization.** The code works; where it lives increasingly doesn't make sense. `Detail/` holds the main-window interface alongside `Views/`, which has nothing to do with the detail pane. `Components/` is the pre-design-system shared-bits folder and its `Detail/` subfolder was a catch-all for the view-settings panes, every property editor, two general controls and a DnD binding. A Space had two toolbar surfaces, one of them blank. `NavGallery` sat in `NavWindow/` while every part it is built from sat in `Navigation/`. The design system owns pieces that are genuinely shared and also owns things it arguably shouldn't — Pickers being the clearest case — so the boundary between "the pieces" and "the surfaces that use them" is not currently drawn anywhere. None of this is a defect; it is accumulated filing, and it is what the next arc addresses.

**The Refactoring is active.** Four of the atlas's moves are executed: `Views/` sits at the renderer root; the card chassis is `Cards/`, worn by the Navigation gallery and CardView alike; the tabular chrome is `Tables/`, worn by TableView and the Trash; and the property value layer — resolution, formatters, the cell, the pickers — is `Properties/`, so the dependency order reads `DesignSystem ← Properties ← Tables ← Views`. The Inline Page Properties work runs parallel on its own Decision Log. The Codebase Cleanup is the behavioral half — correctness, performance, and the structural moves inside the processes — and follows once the moves that would otherwise reshuffle its files are done.

### Immediate Work

- [ ] **Rule on [[RendererAtlas]]'s open decisions.** Each section carries its calls with a recommendation; the structural ones gate the tree's non-mechanical moves.
- [ ] **Unwind the toolbar's `.app-toolbar button` tone rule** (`Toolbar/toolbar.css:98`) in the atlas's order — delete the colliding `color` first, then walk the `&&` doubles down with the app open. A Button inside a toolbar pane still needs a local pin until then (the field's trailing slot carries one).
- [ ] **The Settings window's rows join the menu row primitive.** `Settings/SettingsRow.tsx` and `nexusSettings.css` hand-roll the row that `MenuItem` already is — label, hint, and a trailing control — so the two drift on padding and tone.
- [ ] **`PropertiesPane`'s per-column Style radios** are a view-settings section inside the Properties pane (the one `Properties → Views`/`Tables` edge); lifting them beside the other view-settings panes closes it.
- [ ] **Eyeball the Space dropdown** — carried from 08-25: icon, editable title, lock footer, the two pickers, with the trio's Settings button blank behind it.

### Pending Focuses

#### One — Inline Page Properties

- [ ] **A property surface attached to the page itself**, rather than only inside the Settings dropdown's Properties leaf, so a page's values are visible and editable where the page is. The frame, the sources, and the decisions taken so far are in `// Planning`'s Decision Log; it runs parallel to the two arcs below and shares no files with them.

#### Two — The Refactoring

The whole-renderer organizational arc: moves and merges rather than behavior, broken into single-session phases. Its one source is [[RendererAtlas]] — the map as it is, the eight rules that decide where anything goes, the target tree with every file placed under a rule, the token verdicts, and the decisions the tree cannot make. A session takes rows from the atlas's ledger; nothing about the arc lives anywhere else.

- [ ] **The rulings the atlas waits on** — its open decisions, each with a recommendation: the design system's three upward reaches and the lint rule that keeps them closed; the floating family's name and the chassis's; the spacing and radius scales; the toolbar selector's unwinding order; the cursor convention.
- [ ] **The remaining moves** — `Detail` → `Interface`, `Core/`, `Windows/`, `Connections/`, the Showcase out of the design system, and the renames. Any row can be taken in isolation; the typecheck catches every miss.
- [ ] **The one ruled upward edge** — `PropertiesPane`'s per-column Style radios read the active view and `useStyleFor`; lifting that section beside the other view-settings panes would close it.

#### Three — The Codebase Cleanup

The behavioral half — correctness, performance, and the structural moves inside the processes. Each is a session of its own, each verified by something a typecheck cannot supply, and none of it is visible from the interface. The session-sized work rides [[Codebase-Cleanup-Checklist]]; what a sweep re-derives wrongly is [[Cohesion-Rulings]].

- [ ] **The `main/index.ts` split.** Roughly 110 channel implementations share a file containing window creation, protocol registration, and application lifecycle, which makes it the one file every parallel session collides on. The bridge seam itself is excellent and is not what moves: `serveBridge` already takes a plain object, so the channels become per-domain partial maps spread into one. The first step is carving out the context they all close over — the shared refusals, the path resolvers, the confirm-and-push helpers, and the window reference itself — since every domain map needs it and none of them can own it.
- [ ] **Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns contains around 18,000 elements, and every pipeline re-run reconciles them all. Group bands complicate it, so the scoped version virtualizes the flat, ungrouped case first, where the win is largest and the band machinery is absent.
- [ ] **Per-tab page state is modelled as global singletons.** One `pageStatus`/`pageDetail`/`pageError` describes whichever tab is active, and `DetailPane` now carries a comment explaining that a parked surface must read its page from its own tab's target rather than the selection. Keying page state by tab makes `PageView({ tabId })` the whole signature, and it is what raising `WARM_TABS`, split view, and the committed multi-window seams all wait on. Best taken with the store split below.
- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature, rather than as a standalone ceremony.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Open Against The Web Layer

- [ ] **A guest's scripted popups ride the open-link chain with no user-gesture gate** — acceptable for trusted embeds, ungated by decision pending Nathan's ruling.
- [ ] **Retention's two bounds.** A tile scrolled far enough loses its widget to the editor's viewport recycling regardless of the cap, and a retained guest keeps playing audio by design — whether scroll-out should mute is a product call.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **Cards has no loading or empty state**, where Table returns both; a blank grid is indistinguishable from broken. Loading versus empty versus error is a real distinction and wants one decision in `ViewRenderer` rather than one per renderer.
- [ ] **Two retention budgets act on the same guests and neither knows it.** Parked page surfaces cap at 2 tabs, hidden web guests at 5, and parking routes every tile inside a parked surface through the hidden-guest path — two parked tabs holding four web tiles each already exceeds the guest cap, so the LRU tears down the live sessions parking exists to preserve. One budget with tiers, or the numbers chosen together.
- [ ] Where Checkboxes' styling is actually defined. 

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **TokenField — a typed value becomes a Label:** an InputField holding a run of labels beside a bare caret, where Enter turns the draft into a segment resolved against the field's picker (a Set title into an EntityIcon segment, a free string into a FileLabel) and Backspace on an empty caret removes the last. The pieces exist apart — `EditableInput` names an option chip in place, `SegmentRun` holds a field's values, the Filter pane's Location run is pick-only — and the showcase's capped field already sketches the shape. Its consumers are every location-shaped input: the Location filter, file properties, Context assignment.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.

### Important Information

- **A personalization key has to take its readers with it.** A surface left reading the tree's copy of a setting sees a value that only refreshes on a disk round-trip, which presents as a settings row that doesn't work — the store slice is what updates live.
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide, and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A renderer `preventDefault` cannot suppress main's `context-menu` event.** Any editable target pops main's own editor menu regardless, so a surface that wants its own menu there has to be the only claimant — which is why the table widget reports non-editable and why two menus over one field is the recurring symptom.
- **Frost comes in three tiers, and the names finally mean them.** `GlassSurface` is the app's fixed chrome (brightest, clear), `GlassPane` floats over it a step dimmer, and `GlassWindow` is that pane carrying the shared body. One `SOLID_FILL` sits behind every darkened surface, and a pane opening over another pane asks `GlassPane` for `solid` rather than writing a background. Only `MenuSurface` still wears a beak, and it is the only shell drawing its own outline.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **Two rules any future in-app window must respect**, both learned on PreviewPane: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

Known shortcuts, none broken today. Each is cheap on its own and best taken when its owning file is next touched — or swept together as one batch session.

- [ ] **Fire-and-forget writes have no seam.** Sixty-three channels return the `Result` envelope and the renderer checks `.ok` at thirty-two sites. The gap is a coherent family — `folds.set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `blocks.writeMarkdown` and nine more — every one called as `void window.nexus.x(…)` with the failure discarded, so a locked file or a full disk shows the new fold state, column widths and tile heights and persists none of them until restart. One `persist()` helper makes handling the default; the pattern has been copied sixteen times. Whether silence is acceptable for this class is an Open Call above.
- [ ] **Table perf ceilings.** Tables render every row with no virtualization, so a very long collection will eventually feel it; and a value edited outside the app doesn't live-refresh an open table.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] MarkdownPM Tables have autocorrect blocked, likely due to their inactive-until-entry design; numbered lists also have their periods flagged as incorrect by an autocorrect. 

### Recent Work

#### PM-115 || The ImagePicker

The crop surface widened past the nexus icon into one design-system component every image-bearing seat frames through. A crop is a focal point and a zoom, never a pixel rectangle, kept in `shared/cropGeometry.ts` — the one producer of a framed image's paint, so the editor and every seat render through `coverStyle` and cannot disagree, and one framing reads correctly at any aspect. It rides `.nexus/crops.json` as a tree leaf keyed by the image, so a framing serves every surface the picture appears on, follows the nexus to another device, and never touches the file or the note. `AssetImage` replaced the ten hand-rolled `<img>` seats, gated on a crop existing: with none it stays a plain `<img>` and loads no aspect, with one it paints the `coverStyle` box, observing its own size for the fill axis. The nexus photo joined the same path-and-crop model every banner already followed, and the data-URL pipeline that baked a PNG and shipped bytes over IPC is gone. `ImagePicker` frames a stored image as a circle or a rect cut to its seat, panning on the app's one gesture primitive and zooming out onto a colour drawn from the image; Edit reaches it from the banner menu, the card menu, and the icon menu, and the footer re-picks by dialog or paste. This completes the three-part file-based arc.

#### PM-114 || File Properties

The `file` property type is complete — the tenth and last. A value is a bare array of `[[Basename.ext]]` wikilinks resolved in the asset map's basename domain, which puts file names in their own namespace and keeps them structurally outside the rename cascade: the scanner and the rewriter both read string frontmatter and skip arrays, so neither knows what a file property is. Each property names a **Directory** its files land in, validated for containment and for indexability — a contained folder the map would never walk is a write whose own reference can never resolve. The value's area adds and a chip replaces, both through the OS dialog opened at a folder, so revealing where a file lives and swapping it are one gesture and nothing opens a file in-app. Adoption is one exported seam carrying every guard that makes it safe, and a removed reference never deletes bytes: the seam dedups, so two pages can share one file.

#### PM-112 || Variable Asset Directories

The nexus asset directory became a folder the user picks, and a stored image became an ordinary named file in it. A banner keeps whatever name it had on disk and is named from Pommora by `[[That File.png]]`, which is the same reference Obsidian writes — so one folder serves both applications and neither owns it. Resolution is renderer-side against a map main patches from watch events and pushes, which is what makes a file arriving in a synced folder repaint what names it without a walk; nothing is persisted about an asset but its filename, so a sync eviction and re-download is a non-event and an external rename phantoms rather than being chased. The live nexus migrated: every reference the old writer minted moved out of `.nexus/assets`, byte-identical copies collapsed to one, invented `banner-<token>` names were replaced by their owners', and the folder was emptied through the trash. A replace now deletes only what Pommora minted under its own root — the configured folder is the user's, and a file there may be referenced from a note this app cannot see.

#### PM-111 || Footnotes

MarkdownPM reads and writes GFM reference footnotes: markers in the body, a trailing run of citations at the document's end, plain GFM left on disk. The section's boundary is derived once and read by every layer that needs it, which is what lets a marker draw the number its position earns rather than the label it carries, and lets the counter exclude a section the editor is drawing. The section hides behind a per-page override that the Subfield's control and the divider both write, and every creation and deletion ends with a single dispatch that renumbers the labels, reorders the rows, and reverts the whole on one undo. A transaction-layer guard relocates any change that would leave text standing after the section, that being the one edit which turns every citation on the page back into literal text; whitespace alone is refused rather than relocated. The section's disclosure is one-page-keyed: the Subfield's control, the divider, a marker jump, the floating preview, and a hover card all resolve and write, so a page draws the same way wherever it is shown.

#### PM-110 || A Link Property Reaches A Page

A Link property can now name a page, not just a web address. Pasting `[[Title]]` — what Copy Link puts on the clipboard — or a markdown link whose target resolves to a page commits as that connection under the page's own capitalization, aliases carried through, while a title no page answers to is refused as a malformed address is; the value then reads in the connection color and clicks through to the page rather than a browser, the three link formats standing down. The rename cascade was widened to match: it rewrites connections held in frontmatter alongside those in bodies, and the content index records what frontmatter names, so a page whose only inbound reference is a property value is reachable at all. Travelling with it, the link right-click menu left main's inline template-building for one shared model that the editor, table cells, card values and both inspector panes now pop — an address gaining Open Preview and Open Browser, an open item dropping where its own surface already shows that page, and a property surface closing on Clear while Remove stays on the property rather than the value it holds.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
