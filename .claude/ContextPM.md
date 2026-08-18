## Project Pommora – Active Context

### Current Focus

- [ ] None. The abstract-plumbing arc is complete — live tree, content index, and the property-cascade journal all shipped; a crash mid-cascade now forward-completes at the next open instead of stranding pages against the registry.

### Immediate Work

- [ ] None — the standing menu below is the field.

### Pending Focuses

#### II. The Boring Work

- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature, rather than as a standalone ceremony.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.
- [ ] **MarkdownPM Footnotes:** Auto-ordered footnotes. 
- [ ] **Settings UI:** Proper scaffolding of the configuration UI. 

### Important Information

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

- [ ] **Table perf ceilings.** Tables render every row with no virtualization, so a very long collection will eventually feel it; and a value edited outside the app doesn't live-refresh an open table.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 
- [ ] The CardView banner-type toggle should likely be within the SettingPane rather than the LayoutPane; it makes more sense to group the two toggles together, though non-blocking.

### Recent Work

#### PM-106 || The Property-Cascade Journal

The schema cascades gained a crash record — the final piece of the abstract-plumbing arc. Every op that writes to both the registry and pages (property rename, global delete, option rename, option removal) states its intent in `.nexus/property-cascade.json` before the work and deletes it after; a record surviving a crash replays at the next open, forward-completing the interrupted sweep against current disk through the content index's key-holder query. The replay's one law: act only on the state the record exactly maps, identity-checked by id, and clear on every other — so a stale record can never merge two properties' values or strip a value the user re-set. Skips hold the record: a cascade that cannot read one holder keeps its journal and the next open finishes the job; a stranded record is never displaced or cleared by a later op. Clearing an option's values and the per-Collection Remove stay unjournaled on the same razor — their residue disagrees with nothing. 

#### PM-105 || The Live Tree & The Content Index

Main stopped re-deriving the nexus tree: one walk at open builds it, every mutation and watcher event patches it in place, and the same push that always carried trees now confirms every write channel — the renderer's load-after-write reloads died app-wide. Alongside it, `nexus.db` gained the content index (mentions + property values per page), so a rename or property sweep opens only the files it will actually change: a rename that once read every markdown file opened exactly its four mentioners on the acceptance nexus, and a table cell edit costs zero walks and zero pushes. One corpus enumeration now defines what every pen can reach, making `excluded_folders` a total exclusion — unread, unindexed, unswept, unrewritten — while un-adopted folders stay fully reachable. The closing pass folded nine duplications and surfaced two real defects: a case-sensitive `.md` check diverging from the walk's case-insensitive admit, and a per-folder enumeration paying a whole-nexus readdir on every container open, both fixed at the cause.

#### PM-104 || Menu & Surface Consolidation

Menus and pickers stopped being bubbles. `PickerMenu` gave up its beak and became the app's one rectangular pane — worn by every picker, grid, calendar, hover card and fixed-option menu — while `MenuSurface` keeps the beak for the toolbar dropdown that hangs off a named button, and is now the only surface drawing its own outline by hand. Dropping the beak dropped its scaffolding: the shell fell from 204 lines to 109, and mounting the glass material directly restored the border, lighting and shadow that hand-drawn outline had been suppressing. Underneath, glass gained honest tiers — `GlassWindow` and `GlassSurface` had been byte-identical, so they merged under the name describing the app's fixed chrome, and `GlassWindow` was rebuilt as the pane's chrome carrying a body, with four spellings of "darken this" collapsed into one `SOLID_FILL`. The material later gained `--glass-outline`, the tinted edge a tier wears while its surface is being driven.

Rows then settled into two tiers: a menu row reads body text, a picker's rows the control ramp, stated once as a variable the picker's pane sets and every row inherits. A pane's pinned header and footer became `ActionRow` and are available to any picker through new header and footer slots. The exit motion was finished as well — the retract had withdrawn by eight percent where the open bloomed from half scale, and seven surfaces had been mounting their picker conditionally, so a dismissal tore the pane out before it could retract at all.

The second half made a list menu something the operating system can draw. `ActionItem` in `src/shared` is the one row model both renderers read, collapsing ten hand-restatements; one channel serves every list menu; and placement converts renderer pixels to popup coordinates through the window's zoom in a single helper. **Use Native Menus** is a device-local preference in `nexus.db` — the fixed-option control routes all fourteen of its call sites through it at once, and the surface tile's menu reads the same model as its pane, with its drills as submenus and its source page's name as an inert header.

#### PM-103 || AutoLink & Table Fixes

An address pasted into any editor surface can now become a link rather than literal text, in whichever of three forms a per-Nexus default names, and that default settled a vocabulary: `link-full`, `link-short` and `link-title` name the same three forms wherever a link reads — a URL property's Format, a view column's, or a link in a page body — replacing two older sets that disagreed about how many forms there were. The markdown-link grammar widened to CommonMark's balanced-parenthesis destination, Page Title writes the domain and swaps the fetched title in against an anchored range, and a link's right-click menu grew from Copy Link alone into Rename · Edit Link · Copy Link · Format ▸ with Remove Link and Delete below a separator. ⌘⇧V does the inverse of whatever ⌘V is set to do, while `Paste As` and `Insert Link` cover what a default cannot. A markdown table's resting cell — which is not an editor and draws its links as plain spans — carries the whole of a link's behavior now, through one decision about what a right-clicked link is offered.

#### PM-102 || Interaction & Outline Work

The Subfield breadcrumb stopped collapsing on the way back up, tracing the whole path to the deepest node visited on it and holding that tail across a click that switches to a tab already showing its target. The Page Outline dropdown became a working surface rather than a viewer: it holds open until Escape or a re-press, a right-click renames a heading inline, and a heading row drags to move its whole section. The editor's fold chevron picked up its own menu — Rename, Size, and a Delete that drops the heading line alone — riding the one shared hot-line list the grip menu already reads.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
