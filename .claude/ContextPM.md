## Context — Pommora React

### Current Focus

The active stretch is MarkdownPM. Embedded pages are complete end to end — the tile, the guards, the menus, the autocomplete, the warm cache, and the rename sweep — followed by the typed codeblocks, the table append strips, and, most recently, the connection hover previews: resting on a resolved `[[Connection]]` opens a compact read-only preview of the target page, anchored to the link, resizable to one per-machine remembered size, with a Settings ▸ Pages linger slider and the same trigger in resting table cells.

What remains on the stretch is hand verification: the embedded-pages checks that a headless driver can't honestly produce — the native menu picks, the real-pointer feel checks, one real ⌘Q mid-debounce, and the SurfacePM visual baseline. The local commit batch on `main` is unpushed until then.

### Recent Work

#### Hover Previews (08-05)

The connection hover card received its body: resting on a resolved `[[Connection]]` opens a compact read-only preview of the target page through the shared embed framework, without its banner or inline title. The card anchors to the live link with the pane's beak following it, resizes from its right edge, bottom edge, and corner to a single per-machine remembered size, and holds glance-only interaction — content scrolls, headings fold on click, and the caret never enters. A Settings ▸ Pages slider sets how long the card lingers after hover-off, and resting table cells raise the same card on the shared intent delay. The build also consolidated the hover lifecycle: one card exists app-wide, a click consumes a pending intent, and navigation closes an open card. → [[MarkdownPM]] §II. Hover Previews · HistoryPM.md

#### MarkdownPM Tweaks (08-04)

The editor's polish batch. Fenced code gained a curated typed-language set whose tokens color as spectrum pastels — a bare fence stays plain mono by design — with a per-nexus line-count setting opening the new Settings ▸ Pages tab, and editor-style wrapping. Tables grew hover append strips on their right and bottom edges, appending at the end so the caret never moves. Embeds picked up their follow-ups: Insert ▸ Page drops a ready `![[]]` with the autocomplete open, a tile's scroll, caret, and undo survive host interactions through a session warm cache, and tiles took a bottom-edge resize persisted per host and target.

#### Embedded Pages (08-03 → 08-04)

The Embed Framework's second consumer finally arrived: typing `![[Title]]` on its own line turns it into a live tile of that page — Obsidian's own syntax, so a Nexus keeps reading outside Pommora. The build leaned on what already existed at every seam: the shared tile chassis, the shared pane surface, the preview's crumbs as the tile's hover breadcrumb, and the rename cascade sweeping embeds beside connections — an embed is deliberately never a link-graph edge. The mechanism Nathan called early — a real editor line, not a table-style block replace — held up: an atomic absorb hops the caret over the tile, the lone-line guard makes every reachable caret seat harmless, and the embed claim has exactly one owner read by every consumer, which is what kept the layers from ever disagreeing about a line. → [[MarkdownPM]] §II. Embeddings.

#### Group Hiding (08-02)

A grouped view could collapse a band but never make it leave — hiding a group meant authoring a filter that only approximated it. Now every group row in the Grouping pane carries the Visibility pane's eye, and hiding is one view-level key list filtered once at resolution — a hidden Set leaves the tree with its whole subtree, a sub-group bucket hides globally by value — so every renderer present and future inherits it with no per-view code. Date grouping's empty middle region became the real bucket list, which is what made date bands hideable at all, and Hide Empty Groups finished its half-implementation view-level.

#### The NexusRecord (08-01)

Deleting something was answered only by the trash's mirrored folder chain — a path that rots the moment a parent gets renamed — and a Finder-copied file shared its twin's id forever. The record closes both with two small memories sharing a module boundary and nothing else: a provenance record riding inside each deletion's own bundle, holding ids instead of paths, and a per-machine baseline of what each open saw, which doubles as the adjudicator deciding which duplicate is the original.

The bundle shape exists because the record must write itself *before* the destruction it describes — record first, artifact in last, so the artifact's presence is the settle marker, and a record that can't be written faults the delete before anything is gone. Restore is a pure resolver plus a mover that branches on nothing: only what still validates comes back, so a deleted select option or a since-gone page just doesn't return. Actions only — every surface is deliberately sequenced after.

The closing survey — several agents on one system, each with its own lens, asked what could be removed — returned more defects than duplication, the worst being a single unparseable page taking nexus-wide sweeps down mid-destruction. Each was fixed at its source, and the governed-key sweeps became one walk with the decision left to the caller.

#### Identity Rebuilt Kind-First (07-31)

The universal question inverted: it used to be *what is this entity's id*, and it is now *what is this* — the folder's sidecar — *and then what is its id*, under the key that names the kind. That single reordering is what makes a mislocated file recognisable at all. Folder classification became one depth-aware resolver, registration by sidecar id replaced "any folder carrying an agenda config is a singleton," and the nexus-wide write sweeps gained an admission gate. The live migration doubled as its own end-to-end adoption test, and a Swift-remnant sweep left no id-valued cross-entity foreign key on disk — which is precisely why the kind key can be the only in-file classification input.

#### The Erasure Campaigns (07-29 → 07-30)

Swift parity came out wholesale — the settings seed, the date shim, the color exchange maps, the legacy view vocabulary, and the on-disk residue across both real nexuses — because a compatibility path whose last consumer is archived can never again be exercised against real input. Navigation persistence then collapsed onto one contract with one validation boundary: pinned and favorites as bare refs in `navigation.json`, tabs and previews as device-local rows that drop their paths and hydrate at restore through the one owner that prunes dead refs, mints paths, and recomputes the history pointer.

#### The Band-Seam Law (07-30)

Every disclosure-band seam in Table and Cards reads two shoulders of the view's content rhythm, state-free, owned once in the shared GroupBand chrome behind a per-view `--band-clearance` binding — collapsed heads shed their dead clearance, a band opening a disclosure leads by a single shoulder, embedded cards gained their tail seam, and the menu/pane disclosure surfaces were audited as rightly unique. A shared ActionBand component was also established; it's currently only in use by SurfacePM embeddeds for view selection and the per-view settings button, although future use-cases are intended.

#### The Hardening Campaign & Its Inverse (07-29)

A ten-lens state-of-the-app pass ranked the systemic risks, and three got root-cause fixes rather than patches: every read-modify-write rides one strict primitive under one rule — absent is a fact, unreadable is ignorance, and a write may act on a fact, never on ignorance — glyph resolution collapsed to one rule, and the nexus walk went parallel with a stat-gated per-page cache. The inverse pass then removed the guards defending states nothing can produce, and its own tracing surfaced one real bug worth having.

#### The HOIST Consolidation (07-29)

Two HOIST markers in the icon picker turned into a design-system pass: the outlined-box border six surfaces hand-rolled became `--border-cell` beside `--border-heading`, the accent-tint active stroke became `--accent-stroke` (color only — the weights genuinely differ per surface), the picker's hand-rolled focus ring moved onto the house `fieldRing` channel, and the virtualizer's cell size single-sourced. → [[DesignPM]].

#### One Syntax For Every Pommora-Owned Key (07-28 → 07-29)

Properties were changed to key their values under wrapped title syntax — a page carries `<Status>: Complete` at its root — with Contexts using parenthesized titles; this replaced the previous split where Properties keyed by ULID inside a nested map and Contexts by name at the root. Both syntaxes read one module that owns the glyphs, the key build and parse, and every refusal message. Naming the key removed the reason four different decoders existed, and a title is unique nexus-wide because the title is the key its values write under. → [[PropertiesPM]] · [[ContextsPM]].

**Deferred:** definitions into `nexus.db` + SavedViews into `nexus.db` + an inline field-error surface + duplicate property names.

#### Contexts & Spaces + Closing the tierN Era (07-22 → 07-29)

The three-tier taxonomy was the last fixed thing in an otherwise user-defined system, so it became a registry: Contexts are entries in `.nexus/contexts.json` with ordinary minted ULIDs, Spaces live as folders under `.nexus/contexts/<Context>/<Space>/`, and membership is a parenthesized title key at every entity root — validated by registry membership at read. Renames cascade under a pending-rename journal that replays on open, and a Space is the second BlockHost. With both nexuses on the registry shape, the entire backward-compatibility surface came out rather than staying dormant — a compatibility path is a liability once its last consumer is gone. The stated consequence: a nexus left at the old shape can no longer be opened. → [[ContextsPM]].

#### The Feature Run Behind It (07-10 → 07-27)

The stretch that built the surfaces everything above hardens, each with its record in its Features doc: **SurfacePM** (the tile dashboard layer) → [[SurfacePM]]; the **Navigation surface and Multi-Tab Nexus** → [[NavigationPM]]; **Page Previews** on the NavWindow's chassis → [[PagePreviewPM]]; the **Unified Subfield** → [[SubfieldPM]]; the **Cards renderer and its drag rework** → [[CardViewPM]]; **PreviewPane** as the one floating-window chassis, which made the Settings window cheap → [[PagePreviewPM]] · [[ConfigurationPM]]; the **FilterPane rebuild** that made `PickerMenu` the second shared chassis → [[ViewsPM]] · [[DesignPM]]; and the **lint + accessibility campaign** → [[Lint-And-Accessibility]]. The audit passes that closed this stretch re-grounded every Features doc against real code and established the standing shape: a fact with two sources is a defect — remove the second source, never reconcile the two.

### Pending Focuses

#### The Boring Work

Architectural cleanups with no user-visible payoff and permanent editing payoff — deliberately separate from the feature backlog. None is broken; each is a shape that taxes every future edit, and each entry keeps its reasoning so it's never lost.

**The Store — One Giant Notebook.** The renderer keeps everything the app "knows" — active tab, selection, pins, the open preview, the page being edited — in one shared memory object every part of the UI reads and writes. The criticism isn't the notebook; it's that every one of its rules lives in a single file long past the point anyone can hold it in their head. It got this way honestly: each feature needed to react to the others, and one room is the cheapest way to let them see each other — it also killed a whole class of two-copies bugs. Splitting it into domain files (tabs, nav, previews, pages) composing into the same one notebook changes nothing about behavior and everything about how safely anyone can *edit* it. Do it right *before* the next store-heavy feature, not as its own ceremony.

**The Tree Reload — Repainting the Whole Wall.** Any change re-reads the *entire* nexus from disk; `stabilize` keeps unchanged parts identical so the UI only repaints what moved. This is correctness by brute force — always rebuilding from the files means never being out of sync with them, the whole religion of a files-canonical app — and the parallel walk + cache keep it fast enough at current sizes. But it's the future ceiling: at several thousand pages, every mutation paying a full re-read becomes the app's felt lag. The escape path is half-built (most mutation ops patch surgically and let the full read merely confirm; value-only ops skip the walk), and the real version arrives with the content index. Not a task — a constraint to hand the Pages-in-DB session.

**`mutate.ts` — The Counter With Some Clerks and Some Piles.** Every change funnels through one dispatcher in the file-owning process. The funnel is deliberate and good — one entry point means one place for safety policy; the inconsistency is archaeology: early ops got tidy `crud//` modules, later ops got written inline where the author was standing. Purely organizational — move the inline arms out so "where do I edit the banner logic" stops depending on when banner logic was written. Cheap; do it opportunistically as each arm is next touched.

**Sequencing:** the store split is the one remaining dedicated session — it de-risks every future feature. The mutate cleanup rides along with whatever next touches an arm, and the tree reload is a constraint for the Pages-in-DB session queued below.

#### Open From The Identity Arc

**A taken seed slot never registers.** Seeding runs only at nexus creation and refuses a folder name already on disk — which correctly protects a user's own `Tasks/` of notes — but nothing fills that slot afterwards. Correct-and-incomplete rather than broken: filling it needs a second writer to the registration record plus a product call (adopt the user's folder, or disambiguate?). **Belongs to the Agenda work.**

**The NexusRecord's three flagged rulings.** The plan's Log holds three judgment calls made in my absence, each with its reasoning: an ambiguous mark is spent the session its path answers again rather than deferring forever; the drop-evidence rule approximates "path gone" through the walk, wider than the spec's letter around `excluded_folders`; and the no-evidence duplicate pick goes by birth time, which filesystems without birth time can't honor. None blocks anything — read and rule.

#### Next-Feature Candidates

- **Revisit how Pages and their data are stored in the DB** — wants a dedicated session. The content index is the adjacent question; this one is the Page storage model itself.
- **In-view page creation.** Sparse across every surface — the item that would be felt daily; wants a brainstorm loop, not a patch.
- **Cross-location card reordering** in views — scoped and mechanical.
- **Canvas** — the spec sits at `Planning/6-26 - Canvas Spec.md`, unbuilt.

#### Open Questions

- **Is a Context's folder worth what its rename costs?** A Space's membership is inferred from which Context folder it sits in, and that folder is named by the Context's title — so a Context rename is the most complex write in the codebase: journal, folder rename, cascade through every member file, registry commit, settle, crash-replay. A `context_id` on `_space.json` would collapse it to one registry write plus the frontmatter cascade. The counter-argument is the reason it's built this way: `contexts/Projects/Pommora/` tells an agent what it is without opening a single JSON file, and that legibility is a core construct. Parked — it's a data-model change, and the journal only stops being worth it if the complexity starts biting.

- **Redundant identity sources.** Anywhere "what this is" resolves from more than one place. The exemplar: `PropertyValue.kind` is a runtime copy of `def.type`, and the picker *constructs* the tag from the very type it's nominally independent of — so a bare status value would have rendered as a select chip with no error anywhere. The sweep for these hasn't run and the suspicion is that more are hiding.
- **The NavPane toolbar dropdown** is a blank placeholder — what a compact nav dropdown holds versus the fuller NavWindow is an open call before building into it.

#### Debt & Ride-Alongs

- `schema:changeType` is intentional pre-scaffolding — fully built in main, exposed in preload, no renderer call site by design; it stays until the type-change surface is built properly, never removed as dead code. Its only references are test mocks, so a green suite there isn't coverage.
- NOR filters are hand-authoring only — the mode lives on disk and in the evaluator; the pane offers All and Any, and a hand-authored NOR decodes as `locked`.
- `bounds` and `scanLabel` on PreviewPane have no caller yet; hard-coding them would force the first new consumer to edit the component instead of configuring it.
- Four affordances whose features haven't arrived are `disabled` rather than wired to a no-op — the Space pane's actions ellipsis, the ViewPane's More menu, the ViewSettings icon picker, and the Page Preview's own Settings button.
- The flattened-mode bundle is half-built: `flat` grouping and Hide Location are live for Cards, while the grouping pane offers "None" only under Cards and the pipeline refuses `flat` structurally for tables. The table half plus a separate Flatten control is what remains. → [[ViewsPM]].
- Perf debt: no row virtualization yet (every row mounts, which bites at thousands), and an external value edit doesn't live-refresh an open table. The one-view-mounted multi-tab design deliberately dodges needing table virtualization.
- iCloud-sync readiness (future) — `serializeOnFile` can't coordinate with the iCloud daemon under LWW, `.nexus/nexus.db` needs sync-exclusion, and the walk has to skip `.icloud` placeholders.
- Mobile iOS companion — parked, spec at `.claude/Mobile/MobileSpec.md`, no build commitment.
- Eight renderer sites repeat `if (!res.ok) showError(res.error.message)` — one `reportIfFailed(res)` helper collapses them when a ninth appears.
- `SessionState.error` and `pageError` hold strings while the wire carries `PommoraError` whole — widening them is near-zero churn whenever a surface wants to branch on `code`.
- The NexusRecord's reach is tests-only: `listBundles` has no IPC channel and no caller, so the trash browser's first task is one bridge entry.
- **The kind key is a DELIBERATE second identity source — do not consolidate it away.** The file's kind key and its folder's sidecar declare the same thing on purpose: their *disagreement is the detection signal* that makes a mislocated file recognisable at all. A checksum, not the two-writers defect — the one place that lesson does not apply.
- `useDismiss` coordinates with picker portals via per-event DOM queries — a shared open-picker counter removes the DOM handshake.
- The preview window fetches the same page twice (PageEmbed's body load + PreviewInspector's frontmatter fetch) — lift one `openPage` result to the window and pass both halves down.
- When a third boolean-dropdown consumer appears, extract the `useMenuPresence` bundle — at two consumers it is indirection, not DRY.
- `group.tsx`'s `cellAt` rebuilds the zone's column model per item per over-flip — hoist lefts/stride/cols to a per-zone computation.
- `sidebarDnd`'s collection/context branch re-filters the sibling set per pointermove — snapshot it at activation (invariant mid-drag).
- View format/grouping/banner saves still trigger a full vault walk — an optimistic view-slice patch skips it; `submitPropertyRename`'s walk wants the same targeted-patch treatment.
- The sidebar mode cross-fade renders two full trees, each building its own DnD index — share the tree-keyed index memo across the exit/enter layers.
- Four surfaces still hand-roll the skeleton `gesture.ts` owns — `sidebarDnd`, the data-view column drag, and `useOptionReorder`/`useStatusReorder`, the last two being near-duplicates of each other that a merge would collapse. Migrate each onto `usePointerGesture()` opportunistically as its file is next touched. `SurfacePM/pointerDrag`, `engine.tsx`, and `group.tsx` stay hand-rolled by design: each adds something the skeleton lacks (rAF coalescing, a lost-capture abort, a deliberate no-capture policy), and those hoist into the skeleton only if a second surface ever wants them.
- MarkdownPM's `listDrag`/`blockDrag` are the one migration worth declining: both are roughly nine-tenths CodeMirror domain logic, so the skeleton would absorb about a tenth of each file, and both are click-or-drag surfaces the skeleton can't yet serve — it has no way to say "released without activating," so a cancelled press would toggle a checkbox or fold a heading. The unblocking piece is an `onTap(e)` on the spec, fired on release-before-activation and silent on Escape or cancel; it is a handful of additive lines and should land with the migration that consumes it, not before.
- **The full-weight inert affordances are adjudicated KEEP — never re-flag them.** The four unimplemented view tiles render at full weight and swallow the click, and the group-band "+" for structural Set bands carries an `aria-label` with no handler. Both read as live controls and do nothing on purpose; they wait on their features, not on a dimming pass.

### Lessons

- **A feature's last defects live in the crossings between individually-correct mechanisms.** The identity arc's late defects and all five of the record's closeout findings were this shape. Per-phase review structurally can't see them; the pass that finds them is an attack briefed to *interleave* mechanisms (delete → rename → restore, copy → re-mint → restore), run after everything is individually green.
- **The reachability razor cuts guards, never structure — and mind both edges.** Before defending against a state, name who actually produces it: a user doing something ordinary, an agent making a plausible mistake, the machine, the OS. Nobody → no guard — a guard nothing trips is permanent complexity paid for an event that never comes. The recurring failure is over-applying it: the razor adjudicates *guards against states*, and an unreached *code path* — a speculative parameter, a scope arm with no call site — is dead weight it says nothing about. Both misses repeat: guards nothing produces, and speculative structure waved through because "the razor passed it."
- The record splits cleanly: `shared/record.ts` holds the tuple + diff, `main/record.ts` the projection/latch/open pass, `main/remint.ts` the adjudication + writes, `main/provenance.ts` the record schema, resolver, mover and listing, `crud/reconcile.ts` the shared spend loop. The delete and `restore` arms live in `main/mutate.ts`, `io/atomicWrite.ts` owns the bundle primitives, and the open wiring rides `main/index.ts` behind the `latchRecord` opt-out. The clearing law has two owners: `crud/governedSweep.ts` is the one walk under every sweep, and `crud/standing.ts` the one predicate answering whether a value still stands.
- **A survey scoped as cleanup is worth running for the bugs.** Several agents on one system, each on its own lens, found more real defects than consolidations — and the worst was invisible to every per-feature review that had already passed. Brief them to report what should *stay* apart as well as what merges; that section catches more than the merge list.
- **An agent that found a defect is the right one to size its fix.** Resumed with their reasoning intact, they correct their own surveys, refuse adjacent fixes that are disguised features, and talk you out of instinct repairs. Ask each for the load-bearing unknown it can't answer from memory — that's where the real work is.
- Two-writers-for-one-fact is the defect class the tab and nav work kept breeding — every real bug reduced to it, and the fix was always one writer or a lockstep rule. The navigation consolidation made it structural: one validation boundary, one strip (`toNavRef`), one hydrator owning restore lockstep, one keeper owning the active pointer.
- HMR only goes so far: CSS and React Fast-Refresh work, but CM6 extension code needs ⌘R, `src/main` and preload need a full dev-process restart, a vanilla-extract `*.css.ts` can serve stale (a plain restart heals it, ⌘R never does), and a component's focus-effect / handler / attribute change often gets skipped by Fast-Refresh.
- CDP has two quirks that keep biting: synthetic clicks work on tabs/rows/buttons but never fire PickerMenu items (drive those via `el.click()` in `Runtime.evaluate`), and a non-integer dpr throws off screenshot clip math — crop the full-frame PNG with PIL instead.
- Where the navigation code lives: `Tabs/` (`tabsModel.ts` pure with its own tests; `warmCache.ts` for the session LRU; every tab-bar visual knob in `tabBar.css`'s `.tab-bar` block); `main/io/navigationFile.ts` is the one persistence owner; `select` is the single nav entry point; the pin toggle shared between list rows and gallery cards is `NavPinButton` in `NavList.tsx`.
- A whole-surface drag handle steals its own children's clicks: the drag engine `setPointerCapture`s on pointerdown, so any interactive descendant has to stop pointerdown — a container only on its own empty space, so the title still drags. Also: Zod 4's `z.number()` already rejects Infinity/NaN where Zod 3 didn't, and native Electron menus are OS-level — CDP can't screenshot or drive them, so their pure models get unit-tested and the popup needs a human.
- Two rules any future in-app window must respect, both learned the hard way on PreviewPane: **openness drivers stay declared per-window** (a driver declared once at app level leaks into every consumer), and **a FLIP measures from the surface root** via a real ref, never by walking `parentElement`.
- A vanilla-extract `.css.ts` may export only plain values, so a helper that *builds* a declaration sits beside the stylesheet rather than inside it. Neither typecheck nor lint can see the violation — only the plugin rejects it, which makes it a build-time surprise.
- **A defaulted parameter that resolves identity is a silent-failure switch.** Where an argument is the difference between a value and a plausible-looking wrong one, don't give it a fallback — required, so the compiler names every caller that can't resolve.
- **The compiler goes blind exactly where a format change does its damage.** Anywhere a type is erased at an IO seam (`splitFrontmatter` returning loose `Json` is the standing example), the gate has to be a named step, never the typecheck.
- **A `$`-leading token inside shell double quotes is an end-of-line anchor.** Sanity-check any grep gate against a token you know is present before trusting a clean exit — and `\'` doesn't escape inside single quotes either.
- **One failed static derivation is the limit for cross-zoom alignment — then measure.** Load the BUILT css into headless Chrome over a minimal DOM harness and read `getBoundingClientRect` across a block-zoom sweep; compare the glyphs users see, never container edges, and know that a drift *tracking* zoom fingerprints a zoomed-space offset. A live-session screenshot is not evidence while `*.css.ts` changes are in flight — stale-serve stacks old rules under new.
- **A mechanical sweep across test files needs its own verification pass.** Dry-run the pattern and read what it would touch before letting it write — one regex nearly rewrote `[[Beta]]` wikilinks; another under-matched a multi-line fixture and failed three steps from its cause.
- **The syntax module is the one place a glyph is written down.** `src/shared/governedKeys.ts` owns the pair, the build and parse, the governed-key predicate, the reserved leading `$` and every refusal string. Changing a sigil is one line there, and the tests derive their fixtures from `wrapKey` so a swap retargets them.
- **Recognizing a key isn't resolving one.** A wrapped key is Pommora's — safe to sweep, safe for Sapphire to hide — but only a registry title match makes it a live value. Resolution runs definition-first: walk the schema, build each key from its name, read that key.
- **Most of the live nexus is Obsidian's frontmatter, and Pommora is right to ignore it.** Dozens of pages carry bare `Projects:` / `Status:` keys Obsidian wrote, so their columns render empty on purpose — the check is whether the key is wrapped, and converting them is a per-page call Nathan owns, never automated. Worth knowing before anyone diagnoses an empty table as broken.
- The context machinery splits cleanly: pure resolution in `src/shared/contexts.ts` + `contextResolve.ts`, the write family in `crud/contextWrite.ts`, the cascade/journal/replay in `crud/contextCascade.ts` + `contextJournal.ts`, and every renderer surface resolving identity through `pipeline/contextIdentity.ts`. Context columns are default-OFF: absence from a view's `property_order` IS hidden, which is why creating a Context can never change an existing view.

### Fix Log

- The "File" property icon gets clipped by its vertical row padding on the ViewPane.
- The link-rename field shows a leading empty space — a visual inset, not a stored character (deprioritized).
- The Set-Card drag flash (drop snaps back, then jumps on reload) — the optimistic moveSet order patch is in; wants one live drag before this line drops. 
