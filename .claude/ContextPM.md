## Project Pommora – Active Context

### Current Focus

**The cohesion queue's session-sized half is closed, and Footnotes is unblocked.** Four surfaces stopped being written twice — the two option-reorder hooks, the two option rows, the two properties panes' engine, and the two view resolvers that had been living inside a 1,943-line component — and seven live defects closed with them, five found by reading rather than reported. Three action vocabularies now reach the code that spends them, so a menu row that nothing handles fails the build instead of popping and doing nothing. Every seam the [[Footnotes — Decision Log]] named as a prerequisite remains in place, and the editor's last import cycle is gone with the resolvers.

The one construct the Subfield still counts as source is a Markdown table, and the reason is worth remembering: the counter computes its own document scan because it only ever receives a string. The editor already keeps one cached per document version, and the day those meet, the gap closes for free.
![[Footnotes — Decision Log]]
### Immediate Work

- [ ] MarkdownPM Footnotes → Plan & Execution. The decision log at [[Footnotes — Decision Log]] is the settled contract, every entry confirmed. Every seam it named is in place, and the editor's cleanup is closed, so nothing blocks it.
- [ ] What is left of the cohesion queue at [[Cohesive-Cleanup]] — the view host under Table and Cards, the drag adapters' remaining frame, Table's column readers, and the derived state held as state. Ten of its items closed; these four did not, and none of them touches MarkdownPM's core. What is structural rather than session-sized sits in §The Boring Work.

### Pending Focuses

#### II. Open Against The Web Layer

- [ ] **A guest's scripted popups ride the open-link chain with no user-gesture gate** — acceptable for trusted embeds, ungated by decision pending Nathan's ruling.
- [ ] **Retention's two bounds.** A tile scrolled far enough loses its widget to the editor's viewport recycling regardless of the cap, and a retained guest keeps playing audio by design — whether scroll-out should mute is a product call.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **Cards has no loading or empty state**, where Table returns both; a blank grid is indistinguishable from broken. Loading versus empty versus error is a real distinction and wants one decision in `ViewRenderer` rather than one per renderer.
- [ ] **A card drag and a row drag write different files.** The same gesture in the same unsorted structural view writes the canonical `page_order` from Table and a per-machine `viewOrders` tiebreaker from Cards. One is right; which one is a call about whether card ordering is meant to be portable.
- [ ] **Card column-style changes wait for the round trip** while Table applies an optimistic override — the same menu feels instant in one and laggy in the other. Six lines, if it should feel the same.
- [ ] **Persisted-write failures are silent.** Surface them through the existing `showError` path, add a quieter subfield indicator, or accept silence for this class deliberately and write that down. The current state is the third option without the writing-down, and it is the shape every future persisted preference copies.
- [ ] **Two retention budgets act on the same guests and neither knows it.** Parked page surfaces cap at 2 tabs, hidden web guests at 5, and parking routes every tile inside a parked surface through the hidden-guest path — two parked tabs holding four web tiles each already exceeds the guest cap, so the LRU tears down the live sessions parking exists to preserve. One budget with tiers, or the numbers chosen together.
- [ ] **`QuickCapturePM.md` opens with a build-status banner** — the only document that does, and the shape the placeholder rule pushes against. Defensible for a wholly unbuilt feature, which is why it's a call.
- [ ] **Two zoom ceilings exist and neither comment names the other** — `webGuests.ts` allows 0.25–5 for host zoom, `shared/types.ts` caps guest zoom at 2. Almost certainly deliberate, but confirm before someone "fixes" the mismatch, and add a line to each comment either way.

#### II. The Boring Work

The structural moves — each a session of its own, each verified by something a typecheck cannot supply. The session-sized cohesion queue that runs beside other work is [[Cohesive-Cleanup]]; what a sweep re-derives wrongly is [[Cohesion-Rulings]].

- [ ] **Table hoisting.** Eighteen modules outside `Detail/Views/Table/` import from it — the navigation list uses the table's drag module — and `Table.css` loads globally from `main.tsx`, so a table-scoped refactor reaches the nav gallery and the settings panes. A shared `design-system/tables` is the wrong destination: the two table implementations share nothing, correctly so, and what leaks out is a color token, a property-value renderer, property display helpers, a checkbox glyph, and a drag module — four homes, not one. The import cycle is closed — `pickView` and `resolveContainerSchema` sit in `Views/pipeline/` and nothing under `Cards/` reaches into `Table/` any more — so what remains is the CSS and the four homes. Splitting `Table.css` needs screenshot verification of the nav gallery, both settings leaves, the preview inspector, and the properties panes.
- [ ] **The `main/index.ts` split.** Roughly a hundred and ten channel implementations share a file with window creation, protocol registration, and application lifecycle, which makes it the one file every parallel session collides on. The bridge seam itself is excellent and is not what moves: `serveBridge` already takes a plain object, so the channels become per-domain partial maps spread into one. The first step is carving out the context they all close over — the shared refusals, the path resolvers, the confirm-and-push helpers, and the window reference itself — since every domain map needs it and none of them can own it.
- [ ] **Neither renderer virtualizes.** `@tanstack/react-virtual` is installed and used only by the icon picker. A 2,000-page Collection with eight columns mounts around 18,000 elements, and every pipeline re-run reconciles all of them. Group bands complicate it, so the scoped version virtualizes the flat, ungrouped case first, where the win is largest and the band machinery is absent.
- [ ] **Per-tab page state is modelled as global singletons.** One `pageStatus`/`pageDetail`/`pageError` describes whichever tab is active, and `DetailPane` now carries a comment explaining that a parked surface must read its page from its own tab's target rather than the selection. Keying page state by tab makes `PageView({ tabId })` the whole signature, and it is what raising `WARM_TABS`, split view, and the committed multi-window seams all wait on. Best taken with the store split below.
- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature, rather than as a standalone ceremony.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
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
- [ ] **The decoration build emits the whole document.** Line-level chrome is assembled and allocated for every line on every keystroke, arrow key, and scroll — measured at roughly 7ms on a twenty-thousand-line page, before the document's derivations collapsed to one cached scan. Scoping it to `view.viewport` (never `visibleRanges` — the viewport is what CM renders, and it already carries a thousand-pixel margin) needs only a line index on the cached rails and one line of overlap either side for the box first/last flags; the atomic ranges stay whole-document, since they drive caret motion rather than paint.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] A Markdown table's pipes and delimiter row count as prose in the Subfield. The editor replaces a table's source with a widget, so a four-column table over-counts its words by well over half. Every other construct the editor draws differently now reads through the editor's own detectors; a table is the exception, because reading its regions needs a parse per candidate on a path that runs at every edit. It closes for free the day the Subfield can read the editor's cached document scan instead of computing its own.
- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 

### Recent Work

#### PM-110 || A Link Property Reaches A Page

A Link property can now name a page, not just a web address. Pasting `[[Title]]` — what Copy Link puts on the clipboard — or a markdown link whose target resolves to a page commits as that connection under the page's own capitalization, aliases carried through, while a title no page answers to is refused as a malformed address is; the value then reads in the connection color and clicks through to the page rather than a browser, the three link formats standing down. The rename cascade was widened to match: it rewrites connections held in frontmatter alongside those in bodies, and the content index records what frontmatter names, so a page whose only inbound reference is a property value is reachable at all. Travelling with it, the link right-click menu left main's inline template-building for one shared model that the editor, table cells, card values and both inspector panes now pop — an address gaining Open Preview and Open Browser, an open item dropping where its own surface already shows that page, and a property surface closing on Clear while Remove stays on the property rather than the value it holds.

#### PM-109 || The Color Ramp

The chip palette became a grid: `tokens/ramp.ts` owns what a color is — eight families of eight steps, dark to light, with greyscale reading the app's own surface tokens. Every legacy spectrum solid resolves to its exact cell through one accessor, so nothing on disk was migrated or rewritten. The picker that assigns them is an 8×8 grid where clicking the ringed cell clears, and links and checkboxes take that grid without its greyscale row — whose dark end is the window substrate itself — except where a value already lives there, since hiding a row would hide the only way to clear it. Appearance sets the accent, the internal link color, and the external link color from that ramp; each clears to what it inherits, so a cleared control reads as *follow* rather than *none*.

#### PM-108 || Webpage Integration

The editor embeds live websites the way it embeds Pages. A markdown link on its own line, with an explicit scheme, renders as a live tile in the shared embed framework — the bytes remain plain CommonMark, and formatting waits until the selection leaves the line. One main-process module governs every guest (the attach validator, the popup router that opens no OS window, the navigation scheme gate, and the zoom sync), and one renderer adjudicator decides where every external link opens, guest popups included. A guest is live only while its tile is fully visible, because a partially clipped webview paints outside its own box; a clipped tile keeps its last captured frame, and scrolled-out guests hide under a capped retention rather than unmounting. The in-app browser is a flavor of the floating preview window, and a dwell on a website link raises the shared hover card as a live render of the site that takes no clicks but scrolls, its wheel replayed into the guest from the main process. All surfaces share one persistent partition, so a sign-in anywhere authenticates everywhere per machine — there is no management surface by decision; the session simply remembers.

#### PM-107 || Settings' Scaffolding

The Settings window gained the foundation settings that accumulate into: one roster replacing the rail list and body map that were keyed by the same name, where a leaf declares its label, glyph, foot placement, and either named sections of rows or a surface of its own — never both, enforced at compile time. The rail seats General, Interface, Navigation, Appearance, Files & Links, Properties, Pages & Editor, Automations and Shortcuts, with Trash anchored below its separator; Appearance, Properties and Automations are seated and empty. Two settings joined the personalization block — `dateFormat`, the live fallback every date renders through unless its column names one, entering at `defaultStyleFor` where the `url` arm already reads a setting rather than a constant; and `timeFormat`, relocated out of the settings file's top level, which retired the tree's own copy once its readers moved to the store slice. Underneath, the shared floating window learned to carry a pane on either edge at once and to move its own edge outward by that pane's width when one opens, so a second pane never squeezes what the first left.

#### PM-106 || The Property-Cascade Journal

The schema cascades gained a crash record — the final piece of the abstract-plumbing arc. Every op that writes to both the registry and pages (property rename, global delete, option rename, option removal) states its intent in `.nexus/property-cascade.json` before the work and deletes it after; a record surviving a crash replays at the next open, forward-completing the interrupted sweep against current disk through the content index's key-holder query. The replay's one law: act only on the state the record exactly maps, identity-checked by id, and clear on every other — so a stale record can never merge two properties' values or strip a value the user re-set. Skips hold the record: a cascade that cannot read one holder keeps its journal and the next open finishes the job; a stranded record is never displaced or cleared by a later op. Clearing an option's values and the per-Collection Remove stay unjournaled on the same razor — their residue disagrees with nothing. 

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
