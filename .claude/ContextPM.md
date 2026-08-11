## Project Pommora – Active Context

### Current Focus

**Documentation normalization — closed.** Every Feature doc, Versioning, and the PRD read to one standard ([[HistoryPM]] §PM-095): product-documentation register, one owner per fact with pointers everywhere else, tails running Known Issues → Pending → Prospects, and a codemap table of contents opening each spec. The atlas stayed checker-verified through the pass, with PM-094's minted tokens captured. The next session opens on a fresh pick — §Pending Focuses holds the standing options, with the identity/order-persistence arc and the subfield reorder the two nearest doors.

### Immediate Work


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
- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for SurfacePM embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Canvas** — the spec sits at `Planning/6-26 - Canvas Spec.md`, unbuilt.
- [ ] **Subfield reorder.** The store action and persistence are fully built (`setSubfieldOrder` has zero callers) — the entire feature is a missing drag UI, a three-item horizontal `SortableZone` in the Ribbon's shape. 
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
- **The `ViewPane` "more" button and the NavPane's toolbar dropdown are stubs** — a stub and a blank surface at a fixed ceiling, each holding its place while what it opens is decided.
- **The reachability razor cuts guards, never structure.** Before defending against a state, name who produces it — nobody means no guard. The recurring failure is over-applying it: an unreached code path is dead weight the razor says nothing about.
- **A whole-surface drag handle steals its own children's clicks.** The drag engine captures the pointer on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags.
- **A caret that doesn't appear belongs to `nativeCaret.ts`, never to the field.** The browser's own caret is hidden app-wide and the drawn replacement is positioned by JS, so a working I-beam cursor beside a missing caret points at the overlay rather than at focus.
- **A native menu collides with the one main pops for editable targets.** The file-owning process opens its own editor menu over any input or contenteditable and the renderer cannot suppress it, which is a correctness argument for the in-app picker rather than a stylistic one.
- **A lock key is a fact, and two spellings of one file are two locks.** Any file more than one surface rewrites whole needs its key built in the path module rather than assembled per call site, the read has to sit inside the lock beside the write, and a relocate holds the lock of the path it is leaving.
- **A parse given a fragment answers about the fragment.** The editor tokenizes a slice, so anything whose meaning depends on the lines above it — fence parity, list indentation — comes out wrong unless the slice opens somewhere unambiguous.
- **Two rules any future in-app window must respect**, both learned on PreviewPane: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

- [ ] The gesture spec wants an `onTap(e)` fired on a release-before-activation — the additive piece that unblocks migrating MarkdownPM's `listDrag`/`blockDrag` and the CalendarPicker's range drag; it lands with the migration that consumes it.
- [ ] Two more spec folds the drag work exposed, each a four-site bracket today: an `onDisclose` hook owning the `beginDragDisclose`/`endDragDisclose` pair the way `onWindowScroll` owns its listener, and an autoscroll resolve-and-start helper that skips cleanly when no scroller resolves.
- [ ] MarkdownPM's drags and SurfacePM stay announcement-silent, no surface announces a cancel, and repeated identical pickup text may not re-speak on some screen readers — the a11y phrasing pass owns all three.
- [ ] A mid-drag column hide/show or watcher view-push is silently reverted by a column drop's persist (`reorderColumn` reads grab-time state) — reachable only by mutating columns while holding a drag; a ref-read at commit fixes it if it's ever felt.
- [ ] `feel.tsx`'s animation context is provided nowhere outside the showcase, so both engines always read the default while SurfacePM delivers the same value as a prop — wrap the shell in a provider or delete the context; a product call.
- [ ] NOR filters are hand-authored only — the mode lives on disk and in the evaluator while the pane offers All and Any.
- [ ] The flattened-mode bundle is half-built: `flat` grouping and Hide Location are live for Cards only. The pipeline is view-type-agnostic, so what remains is the table half plus a separate Flatten control.
- [ ] Perf debt: no row virtualization, and an external value edit doesn't live-refresh an open table.
- [ ] iCloud-sync readiness — `serializeOnFile` can't coordinate with the iCloud daemon under LWW, `nexus.db` needs sync-exclusion, and the walk has to skip `.icloud` placeholders.
- [ ] Two prospects from the property-syntax arc: an inline field-error surface, and what a duplicate property name should do.
- [ ] Mint the inactive state token: the six empty-state text sites read `--label-tertiary` as an interim (each marked `Awaiting proper inactive state token`), and the token that names that state joins the `--state` family when its value is ruled.
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
- [ ] The Set-Card drag flash — the drop snaps back, then jumps on reload.

### Recent Work

#### PM-095 || Documentation Normalization
**DATE:** 08-10-2026

Every Feature doc, Versioning, and the PRD rewrote to one documentation standard — product register, one owner per fact with pointers elsewhere, canonical tails, and codemap tables of contents — ratified in `Planning/Documentation Normalization.md` and closed by a two-agent residue review. MarkdownPM's Non-Obvious traps now live in `Guidelines/Editor-Internals.md`, and the atlas stayed checker-green throughout.

#### PM-094 || One Owner Per Repeated Value
**DATE:** 08-10-2026

The reconnaissance's fix list worked through. Three tokens replaced literals — `--radius-full` over nine hand-spelled pill radii, opening the radius scale; `--state-drag` for the dim a card wears while its lifted clone floats; `--state-disabled` rebased so its four sites adopt it unchanged. The two card families merged into one shared geometry, which forced a knob whose value had never reached the screen and settled it at what had always rendered. The auto-scroll defaults, written twice and free to drift, came onto one map the `:root` block generates from; `separator.line` died into the bridged name it duplicated. The notch's raw shadow, the mixes outside the tint ladder, and the comments that had drifted from their values were all restated against the code.

#### PM-093 || The Token Atlas
**DATE:** 08-10-2026

The design docs now state token literals under SOURCE-tagged tables — the one sanctioned exception to docs-name-exacts, chartered in `DesignSystemPM.md` (renamed from DesignPM) and enforced by `scripts/check-atlas.mjs`. Families landed with their owners: the editor's scoped pockets in MarkdownPM, the type ramp in TypographyPM, motion + caret/edge-fade/autoscroll in InteractionPM, chips in PropertiesPM, cards in CardViewPM, the table sheet in TableViewPM, the `--ppane-*` contract described in PagePreviewPM. Design-Sources retired into the atlas charter and Build-Gotchas; the recon's fix list routed to `Planning/CSS Duplication Report.md`.

#### PM-092 || One Grip Menu, And The List's Type
**DATE:** 08-10-2026

Every block grip's right-click resolves through one kind-keyed menu: Delete on all of them, "Type ▸" on a list, "Page Source ▸" on an embed tile. The callout's separate grip-menu writer — its own handler, channel, and contract — became one arm of that union, and one delete rule now serves every kind, which took the doubled blank line the callout's own delete used to leave. Embed Page left the grip entirely; the page's own menu already carried Insert ▸ Page. A list block switches all four marker kinds at every level of its nesting, ordered runs counting per level, through a writer beside the per-line format toggle — the shape the codeblock's language switch follows.

#### PM-091 || CSS Token Organization
**DATE:** 08-10-2026

The shared drag chrome — insertion line, dot, host, and ghost — moved into `design-system/interactions` under honest names, the ghost's glass became the `GHOST_FROST` materials recipe, and `--shadow-lift`, `--drop-line-inset`, and `--state-disabled` joined the tokens. The `--drag-muted` alias died and its out-of-scope consumers (tab strip, pins, nav rows) got their silently-missing drag fade back. Footer chrome, `iconOption`, and the NavPane anchor each moved to their one owner; the banner/title and nav-list spreads were adjudicated as the theming contract working and kept.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
