## Project Pommora – Active Context

### Current Focus

- [ ] None yet

### Immediate Work

- [ ] None yet

### Pending Focuses

#### II. The Boring Work

- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature rather than as its own ceremony.
- [ ] **The re-walk — acknowledged and queued, to be taken once the Fable 5 limit resets.** Every change the tree can see re-reads the nexus from disk, with `stabilize` keeping unchanged parts identical, which is correctness by brute force and fast enough at current sizes. It is also the future ceiling — at several thousand pages, every mutation paying a full re-read becomes the felt lag. Two costs ride the same absence: the rename cascade opens and parses every markdown file in the tree to find what links the old title, and the write-side sweeps state their own skip rule rather than the walk's, so a folder excluded from Pommora is still read on every rename and still rewritten if it holds real pages.
- [ ] **A journal behind the property cascades.** A property rename commits the registry then sweeps the new key across every page, and a delete scrubs values off every page; neither records that the sweep is owed, so a crash partway leaves the registry saying one thing and half the pages another. The rename's outcome is recoverable — the values go invisible and renaming back returns them — where the delete's is not, which is the half that earns the work. The Context rename's journal and its open-time replay are the pattern to reuse, and the one decision to make first is whether that single-record journal becomes a list or the cascades get their own: nothing today stops a Context rename and a schema write being in flight at once, so folding both into one record invents a collision that doesn't exist.
- [ ] **`mutate.ts` organization.** Every change funnels through a single dispatcher in the file-owning process, which is deliberate: a single entry point means a single place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. Next-Feature Candidates

- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **MarkdownPM Links:** First, being able to link to a specific heading within a page across the nexus, with auto-complete for in-page headings and a 'Copy Link' menu option on the drag-chevron. Second, paste-aware auto-link syntax for URLs pasted into the editor, with an optional auto-title fetch feature based on its to-be-determined complexity. Full-on MarkdownPM block linking is a near-term consideration. 
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.

#### II. The Identity Arc

- [ ] **The seed slot's second writer.** Seeding runs only at nexus creation and rejects a folder name that already exists on disk, which correctly protects a user's own Tasks/notes. Filling that slot afterward requires adding a second writer to the registration record, plus a product call on whether to adopt the user's folder or disambiguate. Belongs to the Agenda work.
- [ ] **The NexusRecord's three rulings.** The plan's Log holds three judgment calls made without Nathan, each carrying its reasoning: when an ambiguous mark is spent, how the drop-evidence rule approximates a gone path more widely than the spec's letter, and the birth-time duplicate pick that filesystems without birth time can't honor. None blocks anything; each wants a read and a ruling.

### Important Information

- **`aliasPickerOnCommit` is a personalization key with no switch behind it.** It governs whether accepting a page from the connection picker opens its alias slot when that page already has names worth offering, and it defaults on. This is intentionally invisible because the language used to describe the toggle on the settings surface hasn't been decided yet — do this sooner rather than later. 
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **CodeMirror asks a block widget how tall to assume it is, on every edit inside its range.** Answering "unknown" means one line, so the document's height lies until the next measure — the cause of a block widget's surface jerking the scroll while it is typed in. It hands `destroy(dom)` the node so per-node resources can be released, and calls it only when the node is truly dropped; a widget replaced over a reused DOM is never destroyed.
- **A parse given a fragment answers about the fragment.** The editor tokenizes a slice, so anything whose meaning depends on the lines above it — fence parity, list indentation — comes out wrong unless the slice opens somewhere unambiguous.
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
- [ ] The "File" property icon gets clipped by its vertical row padding on the PropertiesPane.
- [ ] The link-rename field shows a leading empty space — the shared field recipe's horizontal padding surviving the TextPicker input override, with the pane gutter adding to it. A visual inset rather than a stored character (deprioritized).
- [ ] How MarkdownPMs headings are given their top-bottom padding is still unclear; what's standard paragraph → heading spacing on Obsidian collapses on Pommora where the block above the heading doesn't seem to have any additional padding, or it's at least extremely minimal compared to the padding that headings have below them. 
- [ ] The CardView banner-type toggle should likely be within the SettingPane rather than the LayoutPane; it makes more sense to group the two toggles together, though non-blocking.

### Recent Work

#### PM-100 || Trash Surface V1

The deletion record gained its reading half: `.trash` had been complete and unreachable, and a leaf at the foot of the Nexus Settings rail now lists every bundle as a row carrying its kind's glyph, its title, a breadcrumb resolved live from the recorded parent id, and the time read back out of the bundle's own folder stamp. Restore returns an entity to the tree and to reach at once, and where its recorded home is gone it opens instead into the places that kind may legally land. Delete spends the bundle the other way, handing the artifact to the operating system's trash or erasing it per a new **Permanently Delete Files** switch that main reads for itself at each operation. 

#### PM-099 || Ghost Creation, Page Icons & One Page Menu

Typing in a table stopped throwing the page's scroll: the block was reporting one line's height on every keystroke because the widget never answered CodeMirror's height question. The hover-born creators — the New Page row, card and sidebar leaf — became one shared effect, which a New Option slot in the property editors now rides, seating where the pointer rests rather than at the list's end. A page's actions gained one definition wherever it is right-clicked, with Copy Link, Copy Path and Reveal Location joining them, and a page's own header began drawing the icon it has always stored.

#### PM-098 || Page Alias' V1

A connection's visible words became the author's to choose: `[[Title|Alias]]` renders as its alias while resolving on title, the connection menu authors and repoints one, a page remembers every name it has been given and offers them back with a × that forgets for good, and `[Title](Page)` reaches a page beside the wikilink form — one grammar, one resolver, one rename sweep. A link now says what it is as it is written, wearing a `link-2` glyph in front of its target when revealed.

#### PM-097 || CardView Creation Affordance
**DATE:** 08-11-2026 → 08-12-2026

Creation reached Cards and the sidebar on two extracted hooks the table refit onto — `useViewCreation` (seeds, order writes, create-then-name) and `useGhostAnchor` (dwell/grace, suppression, the pointerdown stand-down). The ghost card grows flow-after as the card's own skeleton with its neighbors FLIPed aside on the drag shift's feel; the sidebar ghost rides the row chrome at its own longer dwell. The rename slot gained an owner fence (a live set-band double-mount bug died with it, and an unclaimed session self-heals), Cards' naming unified onto the inline field, and the order-settle law now covers creates, cross-location drops, and the set-card reply gap alike. 

#### PM-096 || TableView Creation Affordance
**DATE:** 08-11-2026

In-TableView page creation shipped whole: `createPage` carries seeds and a full-membership order slot in one write, a just-created page's first naming disambiguates like a create and skips the link cascade, and every trigger — the band "+", the grip menu's New Page Above/Below, the sidebar pair, and the hover ghost row on the shared disclosure motion — opens an empty naming field over a page already real on disk. `--state-inactive` joined the opacity ramp and `--state-disabled` died into it, and the in-drop label renames landed everywhere: Open New Tab · Open Preview.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
