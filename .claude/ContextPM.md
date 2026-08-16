## Project Pommora – Active Context

### Current Focus

- [ ] The closeout of the AutoLink & Table Fixes arc, and the planning of the `PickerMenu` ↔ `PopoutMenu` merge and disambiguation. 

### Immediate Work

- [ ] Rework the `PickerMenu` for double-chevron consumers to an edited version of the autocomplete's existing surface; the new component replaces it with a Popout menu that inherits the PickerMenu glass and surface but removes the notch in favor of the autocomplete's native-like, faster-revealing motion and rectangular shape. Additionally, PickerMenu's styling and functionality being closer to native OS menus opens the door for a "Use Native Menus" configuration option in settings. 

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
- **CodeMirror asks a block widget how tall to assume it is, on every edit inside its range.** Answering "unknown" means one line, so the document's height lies until the next measure — the cause of a block widget's surface jerking the scroll while it is typed in. It hands `the node to destroy(dom), so per-node resources can be released, and calls it only when the node is truly dropped; a widget replaced over a reused DOM is never destroyed.
- **A parse given a fragment answers about the fragment.** The editor tokenizes a slice, so anything whose meaning depends on the lines above it — fence parity, list indentation — comes out wrong unless the slice opens somewhere unambiguous.
- **A renderer `preventDefault` cannot suppress main's `context-menu` event.** Any editable target pops main's own editor menu regardless, so a surface that wants its own menu there has to be the only claimant — which is why the table widget reports non-editable and why two menus over one field is the recurring symptom.
- **A table cell settles when its editor demotes, and a resting cell has no editor to demote.** Anything that writes to a cell without entering it must settle the table itself, or the edit lands in the document and the widget keeps drawing what was there before.
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
- [ ] `ActionItem<A>` is defined in `main/returningMenu.ts` while three shared menu models re-type its shape by hand; it is Electron-free and belongs in `shared/pageMenu.ts`, which `src/shared` can import and `src/main` can read back.
- [ ] View format, grouping, and banner saves still trigger a full vault walk, as does `submitPropertyRename`; both want an optimistic targeted patch.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined.
- [ ] The "File" property icon gets clipped by its vertical row padding on the PropertiesPane.
- [ ] The link-rename field shows a leading empty space — the shared field recipe's horizontal padding surviving the TextPicker input override, with the pane gutter adding to it. A visual inset rather than a stored character (deprioritized).
- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 
- [ ] The CardView banner-type toggle should likely be within the SettingPane rather than the LayoutPane; it makes more sense to group the two toggles together, though non-blocking.
- [ ] Selection highlighting and caret placement in MarkdownPM lists don't properly recognize list placement.
- [ ] The editor's heading grip-drag likely compounds a trailing blank line on repeated reorders — `blockMoveChanges` is handed a section range that includes it. The outline's own path was trimmed against this; the editor's was not.

### Recent Work

#### PM-103 || AutoLink & Table Fixes

An address pasted into any editor surface can now become a link rather than literal text, in whichever of three forms a per-Nexus default names, and that default settled a vocabulary: `link-full`, `link-short` and `link-title` name the same three forms wherever a link reads — a URL property's Format, a view column's, or a link in a page body — replacing two older sets that disagreed about how many forms there were. The markdown-link grammar widened to CommonMark's balanced-parenthesis destination, Page Title writes the domain and swaps the fetched title in against an anchored range, and a link's right-click menu grew from Copy Link alone into Rename · Edit Link · Copy Link · Format ▸ with Remove Link and Delete below a separator. ⌘⇧V does the inverse of whatever ⌘V is set to do, while `Paste As` and `Insert Link` cover what a default cannot. A markdown table's resting cell — which is not an editor and draws its links as plain spans — carries the whole of a link's behavior now, through one decision about what a right-clicked link is offered.

#### PM-102 || Interaction & Outline Work

The Subfield breadcrumb stopped collapsing on the way back up, tracing the whole path to the deepest node visited on it and holding that tail across a click that switches to a tab already showing its target. The Page Outline dropdown became a working surface rather than a viewer: it holds open until Escape or a re-press, a right-click renames a heading inline, and a heading row drags to move its whole section. The editor's fold chevron picked up its own menu — Rename, Size, and a Delete that drops the heading line alone — riding the one shared hot-line list the grip menu already reads.

#### PM-101 || PommoraDND Dragging Fixtures

Two drag surfaces living outside the shared layer moved onto it. The gesture skeleton had no answer for a press that can mean two things, so `onTap` now fires on a sub-threshold release and on no other ending — a cancel, an Escape, a window blur and a lost release all stay aborts — which is what MarkdownPM's drags need, since the glyph that doesn't drag toggles a checkbox and the grip that doesn't drag folds its section. `listDrag` and `blockDrag` handed their lifecycles over and kept only their geometry, and `EditorGesture`'s `ViewPlugin` gave a CodeMirror extension the unmount abort a React component gets for free.

#### PM-100 || Trash Surface V1

The deletion record gained its reading half: `.trash` had been complete and unreachable, and a leaf at the foot of the Nexus Settings rail now lists every bundle as a row carrying its kind's glyph, its title, a breadcrumb resolved live from the recorded parent id, and the time read back out of the bundle's own folder stamp. Restore returns an entity to the tree and to reach at once, and where its recorded home is gone it opens instead into the places that kind may legally land. Delete spends the bundle the other way, handing the artifact to the operating system's trash or erasing it per a new **Permanently Delete Files** switch that main reads for itself at each operation. 

#### PM-099 || Ghost Creation, Page Icons & One Page Menu

Typing in a table stopped throwing the page's scroll: the block was reporting one line's height on every keystroke because the widget never answered CodeMirror's height question. The hover-born creators — the New Page row, card and sidebar leaf — became one shared effect, which a New Option slot in the property editors now rides, seating where the pointer rests rather than at the list's end. A page's actions gained one definition wherever it is right-clicked, with Copy Link, Copy Path and Reveal Location joining them, and a page's own header began drawing the icon it has always stored.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
