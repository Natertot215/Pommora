## Project Pommora – Active Context

### Current Focus

**Footnotes are built and have been verified against the running application.** MarkdownPM reads and writes GFM reference footnotes end to end: every gate green, a correctness review, a neutral verification, an attack pass, a closing duplication-and-bloat review and an interaction pass driven against the live nexus each answered, and both flagged decisions ruled on. Every claim the feature makes is stated in [[Footnotes — Implementation Plan]] §Interaction Pass with the one observation that would falsify it, and the result observed. The Verification Checklist in that document is the reader's own walkthrough, and the native right-click menu's pop is the one behavior a driven pass cannot reach. 

Two rulings settled it on 08-21. A change that would strand text after the citations section is **relocated** to the end of the body rather than shaped into continuation form, because the scan refuses any line a block construct starts and a list marker parses at any indent — the only shaping that holds is escaping characters the reader wrote, and a pasted footnote collapses to one paragraph for the same reason. And the setting keeps the name it shipped with, **Show Footnotes By Default**.

The one construct the Subfield still counts as source is a Markdown table, and the reason is worth remembering: the counter computes its own document scan because it only ever receives a string. The editor already keeps one cached per document version, and the day those meet, the gap closes for free.

### Immediate Work


Two tracks run in parallel:

- [ ] **The next feature focus** — chosen from §Next-Feature Candidates, or wherever the day points; the footnotes Verification Checklist walk (plan document, eighteen lines) is still owed an eyeball.
- [ ] The architecture-audit cleanup at [[Codebase-Cleanup-Checklist]] — session bundles carrying the audit's verified findings, the Boring Work items, and the cohesion queue's remainder, each with its own verification and the documentation entries it retires. Bundle 1 landed 08-21; Bundle 2a is next unblocked. The evidence sits in [[Architecture Audit — Full-Codebase Report]].

### Pending Focuses

#### II. Open Against The Web Layer

- [ ] **A guest's scripted popups ride the open-link chain with no user-gesture gate** — acceptable for trusted embeds, ungated by decision pending Nathan's ruling.
- [ ] **Retention's two bounds.** A tile scrolled far enough loses its widget to the editor's viewport recycling regardless of the cap, and a retained guest keeps playing audio by design — whether scroll-out should mute is a product call.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **Cards has no loading or empty state**, where Table returns both; a blank grid is indistinguishable from broken. Loading versus empty versus error is a real distinction and wants one decision in `ViewRenderer` rather than one per renderer.
- [ ] **Two retention budgets act on the same guests and neither knows it.** Parked page surfaces cap at 2 tabs, hidden web guests at 5, and parking routes every tile inside a parked surface through the hidden-guest path — two parked tabs holding four web tiles each already exceeds the guest cap, so the LRU tears down the live sessions parking exists to preserve. One budget with tiers, or the numbers chosen together.
- [ ] **`QuickCapturePM.md` opens with a build-status banner** — the only document that does, and the shape the placeholder rule pushes against. Defensible for a wholly unbuilt feature, which is why it's a call.

#### II. The Boring Work

The structural moves — each a session of its own, each verified by something a typecheck cannot supply. The session-sized work rides [[Codebase-Cleanup-Checklist]]; what a sweep re-derives wrongly is [[Cohesion-Rulings]].

- [ ] **Table hoisting.** Eighteen modules outside `Detail/Views/Table/` import from it — the navigation list uses the table's drag module — and `Table.css` loads globally from `main.tsx`, so a table-scoped refactor reaches the nav gallery and the settings panes. A shared `design-system/tables` is the wrong destination: the two table implementations share nothing, correctly so, and what leaks out is a color token, a property-value renderer, property display helpers, a checkbox glyph, and a drag module — four homes, not one. The import cycle is closed — `pickView` and `resolveContainerSchema` sit in `Views/pipeline/` and nothing under `Cards/` reaches into `Table/` any more — so what remains is the CSS and the four homes. Splitting `Table.css` needs screenshot verification of the nav gallery, both settings leaves, the preview inspector, and the properties panes.
- [ ] **The `main/index.ts` split.** Roughly 110 channel implementations share a file containing window creation, protocol registration, and application lifecycle, which makes it the one file every parallel session collides on. The bridge seam itself is excellent and is not what moves: `serveBridge` already takes a plain object, so the channels become per-domain partial maps spread into one. The first step is carving out the context they all close over — the shared refusals, the path resolvers, the confirm-and-push helpers, and the window reference itself — since every domain map needs it and none of them can own it.
- [ ] **Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns contains around 18,000 elements, and every pipeline re-run reconciles them all. Group bands complicate it, so the scoped version virtualizes the flat, ungrouped case first, where the win is largest and the band machinery is absent.
- [ ] **Per-tab page state is modelled as global singletons.** One `pageStatus`/`pageDetail`/`pageError` describes whichever tab is active, and `DetailPane` now carries a comment explaining that a parked surface must read its page from its own tab's target rather than the selection. Keying page state by tab makes `PageView({ tabId })` the whole signature, and it is what raising `WARM_TABS`, split view, and the committed multi-window seams all wait on. Best taken with the store split below.
- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature, rather than as a standalone ceremony.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.
- [ ] **Files & Assets:** Rework the `assets` directory to become user-definable, and allow its content to be stored as cross-compatible `[[connection]]` formatting; asset-designated folders would be used for banners and be the default for immediate file-embedding location from an external source; file as a property type would then be given a per-property directory option for where those would be stored. Any asset-designated directory would need exclusion *outside* the primary exclusions list. 

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
- [ ] **The decoration build emits the whole document.** Line-level chrome is assembled and allocated for every line on every keystroke, arrow key, and scroll — measured at roughly 7ms on a twenty-thousand-line page, before the document's derivations collapsed to one cached scan. Scoping it to `view.viewport` (never `visibleRanges` — the viewport is what CM renders, and it already carries a thousand-pixel margin) needs only a line index on the cached rails and one line of overlap either side for the box first/last flags; the atomic ranges stay whole-document, since they drive caret motion rather than paint.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] Connection suggestions omit the page the connection is being written into. The `[[` autocomplete drops the host page's own title from its candidates, so a page cannot be pointed at itself from its own body.
- [ ] A Markdown table's pipes and delimiter row count as prose in the Subfield. The editor replaces a table's source with a widget, so a four-column table over-counts its words by well over half. Every other construct the editor draws differently now reads through the editor's own detectors; a table is the exception, because reading its regions needs a parse per candidate on a path that runs at every edit. It closes for free the day the Subfield can read the editor's cached document scan instead of computing its own.
- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 

### Recent Work

#### PM-111 || Footnotes

MarkdownPM reads and writes GFM reference footnotes: markers in the body, a trailing run of citations at the document's end, plain GFM left on disk. The section's boundary is derived once and read by every layer that needs it, which is what lets a marker draw the number its position earns rather than the label it carries, and lets the counter exclude a section the editor is drawing. The section hides behind a per-page override that the Subfield's control and the divider both write, and every creation and deletion ends on one dispatch that renumbers the labels, reorders the rows and reverts whole on one undo. A transaction-layer guard relocates any change that would leave text standing after the section, that being the one edit which turns every citation on the page back into literal text; whitespace alone is refused rather than relocated. The section's disclosure is one page-keyed state that the Subfield's control, the divider, a marker jump, the floating preview and a hover card all resolve and write, so a page draws the same way wherever it is shown.

#### PM-110 || A Link Property Reaches A Page

A Link property can now name a page, not just a web address. Pasting `[[Title]]` — what Copy Link puts on the clipboard — or a markdown link whose target resolves to a page commits as that connection under the page's own capitalization, aliases carried through, while a title no page answers to is refused as a malformed address is; the value then reads in the connection color and clicks through to the page rather than a browser, the three link formats standing down. The rename cascade was widened to match: it rewrites connections held in frontmatter alongside those in bodies, and the content index records what frontmatter names, so a page whose only inbound reference is a property value is reachable at all. Travelling with it, the link right-click menu left main's inline template-building for one shared model that the editor, table cells, card values and both inspector panes now pop — an address gaining Open Preview and Open Browser, an open item dropping where its own surface already shows that page, and a property surface closing on Clear while Remove stays on the property rather than the value it holds.

#### PM-109 || The Color Ramp

The chip palette became a grid: `tokens/ramp.ts` owns what a color is — eight families of eight steps, dark to light, with greyscale reading the app's own surface tokens. Every legacy spectrum solid resolves to its exact cell through one accessor, so nothing on disk was migrated or rewritten. The picker that assigns them is an 8×8 grid where clicking the ringed cell clears, and links and checkboxes take that grid without its greyscale row — whose dark end is the window substrate itself — except where a value already lives there, since hiding a row would hide the only way to clear it. Appearance sets the accent, the internal link color, and the external link color from that ramp; each clears to what it inherits, so a cleared control reads as *follow* rather than *none*.

#### PM-108 || Webpage Integration

The editor embeds live websites the way it embeds Pages. A markdown link on its own line, with an explicit scheme, renders as a live tile in the shared embed framework — the bytes remain plain CommonMark, and formatting waits until the selection leaves the line. One main-process module governs every guest (the attach validator, the popup router that opens no OS window, the navigation scheme gate, and the zoom sync), and one renderer adjudicator decides where every external link opens, guest popups included. A guest is live only while its tile is fully visible, because a partially clipped webview paints outside its own box; a clipped tile keeps its last captured frame, and scrolled-out guests hide under a capped retention rather than unmounting. The in-app browser is a flavor of the floating preview window, and a dwell on a website link raises the shared hover card as a live render of the site that takes no clicks but scrolls, its wheel replayed into the guest from the main process. All surfaces share one persistent partition, so a sign-in anywhere authenticates everywhere per machine — there is no management surface by decision; the session simply remembers.

#### PM-107 || Settings' Scaffolding

The Settings window gained the foundation settings that accumulate into: one roster replacing the rail list and body map that were keyed by the same name, where a leaf declares its label, glyph, foot placement, and either named sections of rows or a surface of its own — never both, enforced at compile time. The rail seats General, Interface, Navigation, Appearance, Files & Links, Properties, Pages & Editor, Automations and Shortcuts, with Trash anchored below its separator; Appearance, Properties and Automations are seated and empty. Two settings joined the personalization block — `dateFormat`, the live fallback every date renders through unless its column names one, entering at `defaultStyleFor` where the `url` arm already reads a setting rather than a constant; and `timeFormat`, relocated out of the settings file's top level, which retired the tree's own copy once its readers moved to the store slice. Underneath, the shared floating window learned to carry a pane on either edge at once and to move its own edge outward by that pane's width when one opens, so a second pane never squeezes what the first left.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.[^1]
