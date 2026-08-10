## Project Pommora – Active Context

### Current Focus

**Sidebar + DND Consolidation & Bug Fixes.** The scoping half is closed: every flagged drag note was verified against the code, four survey lenses swept the layer and surfaced defects nobody had flagged — the grouping pane's wrong-target commit the worst of them — and the whole of it is ratified into `Planning/Drag Layer — Implementation Plan.md`: eighteen tasks in six phases, staleness fixes first, reviewed through a citation pass and a build-breaking attack with every finding folded, the click-suppression ruling settled skeleton-side. No code has moved. What's open is execution, and the plan's Gate 6 + Closeout checklist defines done — the handoff carries that list as this focus's Completion Criteria.

### Immediate Work

- Execute the drag layer plan, in order, opening at Phase 1 (the three stale-slot fixes). The plan is this focus's sole task list; its Implementation Log holds the rulings and the open notes, and closing it out includes the breaker + simplifier passes, the History entry, the doc reconciliation, and routing Tier-5 and the deferred items into this document before the plan retires from Planning.

### Pending Focuses

#### II. The Boring Work

- [ ] **The store split.** Renderer state — active tab, selection, pins, the open preview, the page being edited — composes into domain slice files that build the same single store. The shared room is what lets features react to each other and what killed a whole class of two-copies bugs, so the shape stays and only the file boundary moves. Best taken immediately before the next store-heavy feature rather than as its own ceremony.
- [ ] **The tree reload's escape path.** Every change re-reads the nexus from disk, with `stabilize` keeping unchanged parts identical, which is correctness by brute force and fast enough at current sizes. It is also the future ceiling — at several thousand pages, every mutation paying a full re-read becomes the felt lag. The replacement arrives with the content index, so this is a constraint passed to the Pages-in-DB session rather than a task in its own right.
- [ ] **`mutate.ts` organization.** Every change funnels through one dispatcher in the file-owning process, which is deliberate: one entry point means one place for safety policy. Early operations used tidy crud// modules, where later ones were written inline, and each arm moves when its file is next touched.

#### II. The Identity Arc

- [ ] **The seed slot's second writer.** Seeding runs only at nexus creation and rejects a folder name that already exists on disk, which correctly protects a user's own Tasks/notes. Filling that slot afterward requires adding a second writer to the registration record, plus a product call on whether to adopt the user's folder or disambiguate. Belongs to the Agenda work.
- [ ] **The NexusRecord's three rulings.** The plan's Log holds three judgment calls made without Nathan, each carrying its reasoning: when an ambiguous mark is spent, how the drop-evidence rule approximates a gone path more widely than the spec's letter, and the birth-time duplicate pick that filesystems without birth time can't honor. None blocks anything; each wants a read and a ruling.

#### II. Next-Feature Candidates

- [ ] **Aliases**, the PageMenu's last unbuilt leaf. Its vocabulary collides with the `[[Title|alias]]` prospect — the display text authored in the linking page's body — and the two sit at opposite ends of a single link, so one of them has to be renamed before the leaf can be specified.
- [ ] **The trash browser.** The deletion record's restore path ships and is tested end to end; what's missing is enumeration, since `listBundles` has no bridge entry and no non-test caller. A UI build plus one channel on a finished engine.
- [ ] **The main pane's Inspector.** Its toggle, slide, resizable edge, persisted width and glass shell are built and its body is empty. The Page Preview's frontmatter inspector is a portable body already doing that job for another host.
- [ ] **An unresolved `[[Link]]` is inert** — no colour, no click, no way to create the page it names. Writing a forward reference and filling it in later is the loop that makes inline linking worth using. Adjacent to Aliases; both sit on the connection layer.
- [ ] **In-view page creation.** Sparse across every surface and the item that would be felt daily; wants a brainstorm loop rather than a patch.
- [ ] **Cross-location card reordering** in views — scoped and mechanical.
- [ ] **Canvas** — the spec sits at `Planning/6-26 - Canvas Spec.md`, unbuilt.
- [ ] **Subfield reorder.** The store action and persistence are fully built (`setSubfieldOrder` has zero callers) — the entire feature is a missing drag UI, a three-item horizontal `SortableZone` in the Ribbon's shape. The readiest feature in the app.
- [ ] **Tab ⇄ pin by drag.** The tab strip and the pinned zone are two independent SortableZones; pinning is context-menu-only. The board engine's cross-zone shape serves it, with one commit decision — pins key on `res.key`, tabs on `tab.id`.
- [ ] **Cards group-band drag.** The table's bands reorder and reparent; Cards renders the same `GroupBand` with no `dragHandle`. The band engine is view-agnostic and the prop seam exists.
- [ ] **Outline section drag.** The Outline dropdown is click-to-reveal only while the editor already drags whole sections by heading grip — dragging a heading *in the outline* to move its section is a write-coupling design call on ready mechanisms.
- [ ] **Recents → pins by drag** is a commented deliberate refusal in `NavList` (`canReassign={false}`); revisit only if wanted — the mechanism is one flag plus a commit.

#### II. Open Questions

- [ ] **Is a Context's folder worth what its rename costs?** A Space's membership is inferred from which Context folder it sits in, so a Context rename is the most complex write in the codebase — journal, folder rename, cascade through every member file, registry commit, settle, crash-replay. A `context_id` on `_space.json` would collapse it to one registry write plus the frontmatter cascade, at the cost of the legibility that lets `contexts/Projects/Pommora/` say what it is without opening a file. Parked as a data-model change.
- [ ] **What heals an interrupted cascade?** A property rename commits the registry then sweeps the new key across every page, and nothing replays if the process dies mid-sweep — those values go invisible rather than lost, and renaming the property back brings them home. The thin answer is knowing a sweep is owed; the wider one is an open-time check for any wrapped key the registry doesn't hold, which would catch this and every other way a key is orphaned.
- [ ] **How Pages and their data are stored in the DB.** Wants a dedicated session. The content index is the adjacent question; this one is the Page storage model itself, with property definitions and SavedViews the two other candidates deferred from the property-syntax arc.

### Important Information

- **The kind key is a second identity source by design.** A file's kind key and its folder's sidecar declare the same thing on purpose, since their disagreement is what makes a mislocated file recognisable — a checksum rather than the two-writers defect.
- **The inert affordances render at full weight while their features are built.** The unimplemented view tiles swallow their click and the group-band "+" on structural Set bands carries an `aria-label` with no handler; both read as live controls and wait on the work behind them.
- **The `ViewPane` "more" button and the NavPane's toolbar dropdown are the same shape** — a stub and a blank surface at a fixed ceiling, each holding its place while what it opens is decided.
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A native menu collides with the one main pops for editable targets.** The file-owning process opens its own editor menu over any input or contenteditable and the renderer cannot suppress it, which is a correctness argument for the in-app picker rather than a stylistic one.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A parse given a fragment answers about the fragment.** The editor tokenizes a slice, so anything whose meaning depends on the lines above it — fence parity, list indentation — comes out wrong unless the slice opens somewhere unambiguous.
- **Two rules any future in-app window must respect**, both learned on PreviewPane: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

- [ ] NOR filters are hand-authored only — the mode lives on disk and in the evaluator while the pane offers All and Any.
- [ ] The flattened-mode bundle is half-built: `flat` grouping and Hide Location are live for Cards only. The pipeline is view-type-agnostic, so what remains is the table half plus a separate Flatten control.
- [ ] Perf debt: no row virtualization, and an external value edit doesn't live-refresh an open table.
- [ ] iCloud-sync readiness — `serializeOnFile` can't coordinate with the iCloud daemon under LWW, `nexus.db` needs sync-exclusion, and the walk has to skip `.icloud` placeholders.
- [ ] Two prospects from the property-syntax arc: an inline field-error surface, and what a duplicate property name should do.
- [ ] `SessionState.error` and `pageError` hold strings while the wire carries `PommoraError` whole — widening them is near-zero churn.
- [ ] `pageEditor` and `ConnectionHoverCard` reach the editor by CSS selector; the registered-handle pattern that replaces it is already established in `sidebarDnd`, `paneDnd`, and `useOptionReorder`.
- [ ] `revealPageOffset` sleeps on a duration to wait out a fold animation while `folding.ts` owns the real completion signal.
- [ ] The `Creator` shape is stated three times — the named type in `shared/mutate.ts`, and inline in `shared/bridge.ts` and `store.ts`.
- [ ] `useDismiss` coordinates with picker portals via per-event DOM queries; a shared open-picker counter removes the handshake.
- [ ] The preview window's two halves share a path-keyed detail cache but neither dedupes an in-flight fetch, so navigating with the inspector already open still calls `openPage` twice.
- [ ] `group.tsx` rebuilds geometry on every pointermove — `rowsOf` runs inside the hit-test and `cellAt` allocates beside it, both deriving from values invariant mid-drag. Caching against the rects array's identity retires both.
- [ ] `sidebarDnd`'s collection/context branch re-filters the sibling set per pointermove; snapshot it at activation.
- [ ] View format, grouping, and banner saves still trigger a full vault walk, as does `submitPropertyRename`; both want an optimistic targeted patch.
- [ ] The sidebar's contexts↔collections cross-fade renders two full trees for the transition's length, each building its own DnD index.
- [ ] Four surfaces still hand-roll what `gesture.ts` owns — `sidebarDnd`, the data-view column drag, and `useOptionReorder`/`useStatusReorder`. Migrate each onto `usePointerGesture()` as its file is next touched, once the skeleton is hardened. `SurfacePM/pointerDrag`, `engine.tsx`, and `group.tsx` stay hand-rolled by design, each adding something the skeleton lacks.
- [ ] MarkdownPM's `listDrag`/`blockDrag` are the one migration worth declining: both are nine-tenths CodeMirror domain logic, and both are click-or-drag surfaces the skeleton can't serve until it can report a release before activation. That `onTap(e)` is a handful of additive lines and lands with the migration that consumes it.

### Known Issues

- [ ] On menu rows where property values are expected to be positioned horizontally rather than stacked vertically, there isn't currently a constraint on how far indented relative to its properties label itself; this makes multi-value property rows have its values land its left-side padding tight against the property label; its right-side overflow scroll is properly done, however the lack of left-side padding against the value itself makes the menus cramped. Multiple CSS tries have been applied and reverted; a pane-width-relative max-width that these values can take on the left side of its field needs to be determined.
- [ ] The "File" property icon gets clipped by its vertical row padding on the PropertiesPane.
- [ ] The link-rename field shows a leading empty space — the shared field recipe's horizontal padding surviving the TextPicker input override, with the pane gutter adding to it. A visual inset rather than a stored character (deprioritized).
- [ ] Extending a line on MarkdownPM directly above a codeblock jumps into the codeblock rather than creating a new line. Tables answer the same hazard with a boundary guard on Enter; fences have no counterpart in that chain. Nathan is unsure whether this has been fixed already; reconcile when appropriate.
- [ ] The Set-Card drag flash — the drop snaps back, then jumps on reload.
- [ ] Clicking the settings button on the sidebar ribbon doesn't close it once it's been opened.
- [ ] MarkdownPM's drag-handle context menu shows 'Embed Page' when it shouldn't; a 'List Type' switcher would be the natural replacement.

### Recent Work

#### PM-089 || The Write Path Converges On One Lock 
**DATE:** 08-08-2026

Every writer of a container sidecar came onto one lock key built in `main/paths.ts`, replacing three different keys and several call sites that held none — a read-merge-write that had read before a sibling's write landed could revert a view save or a page move with no error. A relocate now runs under the source path's own key, closing a rename race that left a ghost file at the vacated path holding newer content than the renamed one. The JSON read-modify-write primitive took the same treatment, and the seven callers that had supplied that lock by hand came out in the same commit. All of it is process state, so the app now holds a single-instance lock and a relaunch raises the window that already exists.

#### PM-088 || Dropdown Shell & Menu Consolidation 
**DATE:** 08-08-2026

`MenuDropdown` took the open state, outside-dismiss, retract beat, and mounted-pane branch that the three toolbar dropdowns had each carried separately, and the stylesheet named for one of them was renamed for all three. `containerCreators` became the single rule for what a Collection or a Set offers on creation, correcting a sidebar menu that gave a Set only New Page and two creator labels written as literals. Two constants describing a reach the menu layer never had were corrected rather than made true.

#### PM-087 || One Shared Pass Over Fenced Code
**DATE:** 08-08-2026

A fenced block's marker-run length became part of its identity, so a closer requires a run at least as long as its opener and a longer fence holds shorter ones as literal content. The fence grammar moved into one shared module read by the detector, the folding scan, the subfield statistics, and the write-side mask — the mask's disagreement had left a `[[Title]]` inside a code sample reachable by a rename cascade. On a 941-line body a keystroke now costs roughly a quarter of what it did, the saving scaling with document length.

#### PM-086 || The Page Outline
**DATE:** 08-08-2026

A page carries its own table of contents: a toolbar dropdown listing its headings as a nested tree and traveling to whichever one is chosen, opening any collapsed section on the way. The derivation shares the editor's heading scan rather than adding a second one. Three shared mechanisms were corrected underneath it, each latent until a consumer with no row icons and arbitrarily long labels arrived — nested rows never truncated, the default-open state had no seam, and the auto-pair gate read only behind the caret. The interaction layer gained its first animated scroll, a distance-proportional glide that re-reads its destination each frame.

#### PM-085 || The PageMenu & Picker Consolidation
**DATE:** 08-07-2026

A Page's Settings dropdown had rendered nothing; it now opens on the Page's identity and drills into a Properties leaf listing the Contexts and property values that Page holds. The leaf is an arrangement rather than a new mechanism, since every value is entered through the same primitives the table, cards, and preview inspector compose. The in-app picker became the default for a row's context menu on two grounds: it costs no round-trip through the file-owning process, and it cannot collide with the editor menu that process pops over any editable target. Two defects surfaced underneath — a missing caret on the inline title, and a hairline down every drilled pane's leading edge.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
