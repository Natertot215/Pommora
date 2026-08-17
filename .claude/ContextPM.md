## Project Pommora – Active Context

### Current Focus

- [ ] None. PM-104 closed with the menu arc and its native option both landed; the next focus is whichever one is chosen.

### Immediate Work

- [ ] **Decide what to work on.** Nothing is owed. The Boring Work and the Next-Feature Candidates below are the standing menu, and the Known Issues are each small enough to take on their own.

### Pending Focuses

#### II. The Boring Work

- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature, rather than as a standalone ceremony.
- [ ] **The re-walk — acknowledged and queued, to be taken once the Fable 5 limit resets.** Every change the tree can see re-reads the nexus from disk, with `stabilize` keeping unchanged parts identical, which is correctness by brute force and fast enough at current sizes. It is also the future ceiling — at several thousand pages, every mutation paying a full re-read becomes the felt lag. Two costs ride the same absence: the rename cascade opens and parses every markdown file in the tree to find what links the old title, and the write-side sweeps state their own skip rule rather than the walk's, so a folder excluded from Pommora is still read on every rename and still rewritten if it holds real pages.
- [ ] **A journal behind the property cascades.** A property rename commits the registry, then sweeps the new key across every page, and a delete scrubs values off every page; neither records that the sweep is owed, so a crash partway leaves the registry saying one thing and half the pages another. The rename's outcome is recoverable — the values go invisible and renaming back returns them — where the delete's is not, which is the half that earns the work. The Context rename's journal and its open-time replay are the pattern to reuse, and the one decision to make first is whether that single-record journal becomes a list or the cascades get their own: nothing today stops a Context rename and a schema write being in flight at once, so folding both into one record invents a collision that doesn't exist.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.

### Important Information

- **`aliasPickerOnCommit` is a personalization key with no switch behind it.** It governs whether accepting a page from the connection picker opens its alias slot when that page already has names to offer, and it defaults to on. This is intentionally invisible because the language used to describe the toggle on the settings surface hasn't been decided yet — do this sooner rather than later. 
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide, and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A renderer `preventDefault` cannot suppress main's `context-menu` event.** Any editable target pops main's own editor menu regardless, so a surface that wants its own menu there has to be the only claimant — which is why the table widget reports non-editable and why two menus over one field is the recurring symptom.
- **Frost comes in three tiers, and the names finally mean them.** `GlassSurface` is the app's fixed chrome (brightest, clear), `GlassPane` floats over it a step dimmer, and `GlassWindow` is that pane carrying the shared body. One `SOLID_FILL` sits behind every darkened surface, and a pane opening over another pane asks `GlassPane` for `solid` rather than writing a background. Only `MenuSurface` still wears a beak, and it is the only shell drawing its own outline.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **Two rules any future in-app window must respect**, both learned on PreviewPane: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

- [ ] `feel.tsx`'s animation context is not provided anywhere outside the showcase, so both engines always read the default, while SurfacePM delivers the same value as a prop — wrap the shell in a provider or delete the context; a product call.
- [ ] NOR filters are hand-authored only — the mode lives on disk and in the evaluator while the pane offers All and Any.
- [ ] Perf debt: no row virtualization, and an external value edit doesn't live-refresh an open table.
- [ ] `SessionState.error` and `pageError` hold strings while the wire carries `PommoraError` whole — widening them is near-zero churn.
- [ ] `pageEditor` and `ConnectionHoverCard` reach the editor by CSS selector; the registered-handle pattern that replaces it is already established in `sidebarDnd`, `paneDnd`, and `useOptionReorder`.
- [ ] `revealPageOffset` sleeps on a duration to wait out a fold animation while `folding.ts` owns the real completion signal.
- [ ] The `Creator` shape is stated three times — the named type in `shared/mutate.ts`, and inline in `shared/bridge.ts` and `store.ts`.
- [ ] `useDismiss` coordinates with picker portals via per-event DOM queries; a shared open-picker counter removes the handshake.
- [ ] The preview window's two halves share a path-keyed detail cache but neither dedupes an in-flight fetch, so navigating with the inspector already open still calls `openPage` twice.
- [ ] View format, grouping, and banner saves still trigger a full vault walk, as does `submitPropertyRename`; both want an optimistic targeted patch.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined. 

- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 
- [ ] The CardView banner-type toggle should likely be within the SettingPane rather than the LayoutPane; it makes more sense to group the two toggles together, though non-blocking.
- [ ] The editor's heading grip-drag likely compounds a trailing blank line on repeated reorders — `blockMoveChanges` is handed a section range that includes it. The outline's own path was trimmed against this; the editor's was not.

### Recent Work

#### PM-104 || Menu & Surface Consolidation

Menus and pickers stopped being bubbles. `PickerMenu` gave up its beak and became the app's one rectangular pane — worn by every picker, grid, calendar, hover card and fixed-option menu — while `MenuSurface` keeps the beak for the toolbar dropdown that hangs off a named button, and is now the only surface drawing its own outline by hand. Dropping the beak dropped its scaffolding: the shell fell from 204 lines to 109, and mounting the glass material directly restored the border, lighting and shadow that hand-drawn outline had been suppressing. Underneath, glass gained honest tiers — `GlassWindow` and `GlassSurface` had been byte-identical, so they merged under the name describing the app's fixed chrome, and `GlassWindow` was rebuilt as the pane's chrome carrying a body, with four spellings of "darken this" collapsed into one `SOLID_FILL`. The material later gained `--glass-outline`, the tinted edge a tier wears while its surface is being driven.

Rows then settled into two tiers: a menu row reads body text, a picker's rows the control ramp, stated once as a variable the picker's pane sets and every row inherits. A pane's pinned header and footer became `ActionRow` and are available to any picker through new header and footer slots. The exit motion was finished as well — the retract had withdrawn by eight percent where the open bloomed from half scale, and seven surfaces had been mounting their picker conditionally, so a dismissal tore the pane out before it could retract at all.

The second half made a list menu something the operating system can draw. `ActionItem` in `src/shared` is the one row model both renderers read, collapsing ten hand-restatements; one channel serves every list menu; and placement converts renderer pixels to popup coordinates through the window's zoom in a single helper. **Use Native Menus** is a device-local preference in `nexus.db` — the fixed-option control routes all fourteen of its call sites through it at once, and the surface tile's menu reads the same model as its pane, with its drills as submenus and its source page's name as an inert header.

#### PM-103 || AutoLink & Table Fixes

An address pasted into any editor surface can now become a link rather than literal text, in whichever of three forms a per-Nexus default names, and that default settled a vocabulary: `link-full`, `link-short` and `link-title` name the same three forms wherever a link reads — a URL property's Format, a view column's, or a link in a page body — replacing two older sets that disagreed about how many forms there were. The markdown-link grammar widened to CommonMark's balanced-parenthesis destination, Page Title writes the domain and swaps the fetched title in against an anchored range, and a link's right-click menu grew from Copy Link alone into Rename · Edit Link · Copy Link · Format ▸ with Remove Link and Delete below a separator. ⌘⇧V does the inverse of whatever ⌘V is set to do, while `Paste As` and `Insert Link` cover what a default cannot. A markdown table's resting cell — which is not an editor and draws its links as plain spans — carries the whole of a link's behavior now, through one decision about what a right-clicked link is offered.

#### PM-102 || Interaction & Outline Work

The Subfield breadcrumb stopped collapsing on the way back up, tracing the whole path to the deepest node visited on it and holding that tail across a click that switches to a tab already showing its target. The Page Outline dropdown became a working surface rather than a viewer: it holds open until Escape or a re-press, a right-click renames a heading inline, and a heading row drags to move its whole section. The editor's fold chevron picked up its own menu — Rename, Size, and a Delete that drops the heading line alone — riding the one shared hot-line list the grip menu already reads.

#### PM-101 || PommoraDND Dragging Fixtures

Two drag surfaces living outside the shared layer moved onto it. The gesture skeleton had no answer for a press that can mean two things, so `onTap` now fires on a sub-threshold release and on no other ending — a cancel, an Escape, a window blur and a lost release all stay aborts — which is what MarkdownPM's drags need, since the glyph that doesn't drag toggles a checkbox and the grip that doesn't drag folds its section. `listDrag` and `blockDrag` handed their lifecycles over and kept only their geometry, and `EditorGesture`'s `ViewPlugin` gave a CodeMirror extension the unmount abort a React component gets for free.

#### PM-100 || Trash Surface V1

The deletion record gained its reading half: `.trash` had been complete and unreachable, and a leaf at the foot of the Nexus Settings rail now lists every bundle as a row carrying its kind's glyph, its title, a breadcrumb resolved live from the recorded parent id, and the time read back out of the bundle's own folder stamp. Restore returns an entity to the tree and to reach at once, and where its recorded home is gone it opens instead into the places that kind may legally land. Delete spends the bundle the other way, handing the artifact to the operating system's trash or erasing it per a new **Permanently Delete Files** switch that main reads for itself at each operation. 

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
