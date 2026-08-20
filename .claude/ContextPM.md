## Project Pommora – Active Context

### Current Focus

**The web layer is delivered, its follow-ons are in, and it awaits a walkthrough.** PM-108 shipped websites embedded in Page bodies, an in-app browser, one remembered session, and live hover previews, all under one main-process guest governor and one renderer open-link adjudicator; a round of live direction then landed on top of it — the webpage preferences gathered under Interface, a typeable webpage scale, scrollable hover previews, tab surfaces that park instead of reloading, and an Edit Link that edits in the line. Every gate has run, including a closing fresh-context review that found the arc at its floor. What stands between it and finished is what only Nathan can do: see it running, prove a sign-in survives a relaunch, and settle the browser chrome's resting band. The plan's own §Known Issues records the one thing that shipped short of its reference, and why it can't be reproduced literally over a webview.

**Populating Settings continues underneath it.** The rail is seated in the order it will keep and Appearance now holds working color controls. Properties and Automations are seated against features that do not exist yet — Automations especially, since settings cannot be designed before the thing they configure — and Shortcuts has three bindings in code and no way to rebind them. The open question in front of the next piece is which of these earns a control next, and what the empty categories are actually for.

### Immediate Work

- [ ] **Walk the web layer.** The tile lifecycle, the grip's Edit Link, the browser, hover previews and their scroll, a tab flip on a page holding a live site, and the settings placement; plus ⌘± zoom stamping and trackpad feel, neither of which is drivable headlessly, and a sign-in that survives a relaunch. Everything else is verified.
- [ ] **Finish Appearance.** The three color controls are built; default icons still need the Icon Picker per kind, and the default view scale a slider. Both write through the existing `setPersonalization` — no new plumbing.

### Pending Focuses

#### II. Open Against The Web Layer

- [ ] **The browser chrome's Safari treatment.** The strip holds its band above the page and paints nothing; the reading Nathan wants — the page's own color showing through the bar — can't be reproduced literally over a webview, since a guest scrolls internally and a backdrop filter can't sample its pixels. Candidates: painting the strip with the guest's sampled top-edge color, or revisiting once a guest can report its scroll position.
- [ ] **Site hovers in resting table cells.** A static cell arms page hovers but not site hovers — it reads `data-conn-title` only, so the site route needs URL derivation at the wrap-delegated hover site. The same link previews in the body.
- [ ] **A guest's scripted popups ride the open-link chain with no user-gesture gate** — acceptable for trusted embeds, ungated by decision pending Nathan's ruling.
- [ ] **Retention's two bounds.** A tile scrolled far enough loses its widget to the editor's viewport recycling regardless of the cap, and a retained guest keeps playing audio by design — whether scroll-out should mute is a product call.
- [ ] **A re-aimed tile takes the default height.** Edit Link edits in the line now, so a tile pointed at a new address no longer carries its remembered height across; a migration at formation is the fix if it reads wrong in use.

#### II. What Comes Off The Cohesion Pass

The cohesion pass's dusting and its main-process costs are closed (→ PM-110); the catalog and
where every finding stands are in [[Cohesion-Audit]]. Three scoped sessions come off it, in this
order.

- [ ] **MarkdownPM cleanup.** The remaining editor costs and divergences the first pass left alone
      because they need the editor's full attention. The headline is the line-decoration rebuild,
      which is not viewport-scoped — the largest cost left in the editor, and the one that touches
      atomic ranges and caret motion, so pinned tests come before any change to it. With it:
      unifying `connections.ts` and `links.ts` behind one parameterized factory taking a hit-tester,
      since the first pass closed the three behaviors that had diverged but left the two
      implementations standing and free to diverge again; the resize hit-strip token; the drop-line
      DOM factory; and an internal pass over `Styles.css`, 1,084 lines the audit never opened.
- [ ] **Table hoisting.** Eighteen modules outside `Detail/Views/Table/` import from it — the
      navigation list uses the table's drag module — and `Table.css` loads globally from `main.tsx`,
      so a table-scoped refactor reaches the nav gallery and the settings panes. A shared
      `design-system/tables` is the wrong destination: the two table implementations share nothing,
      correctly so, and what leaks out is a color token, a property-value renderer, property display
      helpers, a checkbox glyph, and a drag module — four homes, not one. The first step is the
      import cycle: `pickView` and `resolveContainerSchema` move out of `TableView` into
      `Views/pipeline/`, which is zero behavior change and unblocks the rest. Splitting `Table.css`
      needs screenshot verification of the nav gallery, both settings leaves, the preview inspector,
      and the properties panes — a typecheck proves nothing there.
- [ ] **The `main/index.ts` split.** Roughly a hundred and ten channel implementations share a file
      with window creation, protocol registration, and application lifecycle, which makes it the one
      file every parallel session collides on. The bridge seam itself is excellent and is not what
      moves: `serveBridge` already takes a plain object, so the channels become per-domain partial
      maps spread into one. The first step is carving out the context they all close over — the
      shared refusals, the path resolvers, the confirm-and-push helpers, and the window reference
      itself — since every domain map needs it and none of them can own it.
- [ ] **§II's helper deduplication.** `parentOf`, `clamp`, `persistViewOrder`, and move-an-item-in-
      an-array each exist in several spellings. Half of them live in `TableView.tsx` and
      `CardsView.tsx`, so this lands immediately before the Table session rather than on its own —
      otherwise those two files get opened twice.

#### II. The Boring Work

- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature, rather than as a standalone ceremony.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.
- [ ] **MarkdownPM Footnotes:** Auto-ordered footnotes. 

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

- [ ] **Table perf ceilings.** Tables render every row with no virtualization, so a very long collection will eventually feel it; and a value edited outside the app doesn't live-refresh an open table.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `revealPageOffset` sleeps for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 
- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 

### Recent Work

#### PM-109 || The Color Ramp

The chip palette became a grid: `tokens/ramp.ts` owns what a color is — eight families of eight steps, dark to light, with greyscale reading the app's own surface tokens. Every legacy spectrum solid resolves to its exact cell through one accessor, so nothing on disk was migrated or rewritten. The picker that assigns them is an 8×8 grid where clicking the ringed cell clears, and links and checkboxes take that grid without its greyscale row — whose dark end is the window substrate itself — except where a value already lives there, since hiding a row would hide the only way to clear it. Appearance sets the accent, the internal link color, and the external link color from that ramp; each clears to what it inherits, so a cleared control reads as *follow* rather than *none*.

#### PM-108 || Webpage Integration

The editor embeds live websites the way it embeds Pages. A markdown link alone on its own line carrying an explicit scheme renders as a live tile on the shared embed framework — the bytes stay plain CommonMark, and formation waits until the selection leaves the line. One main-process module governs every guest (the attach validator, the popup router that opens no OS window, the navigation scheme gate, and the zoom sync), and one renderer adjudicator decides where every external link opens, guest popups included. A guest is live only while its tile is fully visible, because a partially clipped webview paints outside its own box; a clipped tile keeps its last captured frame, and scrolled-out guests hide under a capped retention rather than unmounting. The in-app browser is a flavor of the floating preview window, and a dwell on a website link raises the shared hover card as a live render of the site that takes no clicks but scrolls, its wheel replayed into the guest from the main process. All surfaces share one persistent partition, so a sign-in anywhere authenticates everywhere per machine — there is no management surface by decision; the session simply remembers. The preferences sit together in Interface ▸ Webpages, where the scale offers its steps and takes any percent typed into it.

Retention reaches across tab switches: the detail pane holds page surfaces per tab and parks the unshown ones off screen rather than tearing them down, so their sites pause and resume with their sessions instead of reloading, and a flip costs about a quarter of what rebuilding the surface did. A tile's Edit Link re-aims its address in the line like every other Edit Link — the tile returns to raw text with the address selected, and only re-forms, and reloads, when the selection leaves.

#### PM-107 || Settings' Scaffolding

The Settings window gained the foundation settings accumulate into: one roster replacing the rail list and body map that were keyed by the same name, where a leaf declares its label, glyph, foot placement, and either named sections of rows or a surface of its own — never both, enforced at compile time. The rail seats General, Interface, Navigation, Appearance, Files & Links, Properties, Pages & Editor, Automations and Shortcuts, with Trash anchored below its separator; Appearance, Properties and Automations are seated and empty. Two settings joined the personalization block — `dateFormat`, the live fallback every date renders through unless its column names one, entering at `defaultStyleFor` where the `url` arm already reads a setting rather than a constant; and `timeFormat`, relocated out of the settings file's top level, which retired the tree's own copy once its readers moved to the store slice. Underneath, the shared floating window learned to carry a pane on either edge at once and to move its own edge outward by that pane's width when one opens, so a second pane never squeezes what the first left.

#### PM-106 || The Property-Cascade Journal

The schema cascades gained a crash record — the final piece of the abstract-plumbing arc. Every op that writes to both the registry and pages (property rename, global delete, option rename, option removal) states its intent in `.nexus/property-cascade.json` before the work and deletes it after; a record surviving a crash replays at the next open, forward-completing the interrupted sweep against current disk through the content index's key-holder query. The replay's one law: act only on the state the record exactly maps, identity-checked by id, and clear on every other — so a stale record can never merge two properties' values or strip a value the user re-set. Skips hold the record: a cascade that cannot read one holder keeps its journal and the next open finishes the job; a stranded record is never displaced or cleared by a later op. Clearing an option's values and the per-Collection Remove stay unjournaled on the same razor — their residue disagrees with nothing. 

#### PM-105 || The Live Tree & The Content Index

Main stopped re-deriving the nexus tree: one walk at open builds it, every mutation and watcher event patches it in place, and the same push that always carried trees now confirms every write channel — the renderer's load-after-write reloads died app-wide. Alongside it, `nexus.db` gained the content index (mentions + property values per page), so a rename or property sweep opens only the files it will actually change: a rename that once read every markdown file opened exactly its four mentioners on the acceptance nexus, and a table cell edit costs zero walks and zero pushes. One corpus enumeration now defines what every pen can reach, making `excluded_folders` a total exclusion — unread, unindexed, unswept, unrewritten — while un-adopted folders stay fully reachable. The closing pass folded nine duplications and surfaced two real defects: a case-sensitive `.md` check diverging from the walk's case-insensitive admit, and a per-folder enumeration paying a whole-nexus readdir on every container open, both fixed at the cause.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
