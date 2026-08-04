## Context — Pommora React

### Current Focus

**Embedded pages shipped whole; what's left is Nathan's hands.** `![[Title]]` is live in MarkdownPM end to end — the tile, the guards, the menus, the autocomplete, the cache, the rename sweep — with every gate green and the interaction walkthrough driven headlessly. What no headless driver can honestly produce is collected as the NEEDS-NATHAN list in [[Embedded Pages — Interaction Walkthrough]]: the native menu picks, the real-pointer feel checks, one real ⌘Q mid-debounce, and the SurfacePM visual baseline. Driving that list is the arc's last mile.

**The NexusRecord is finished as a mechanism, and now it needs a surface.** Every in-app delete produces one bundle in `.trash` — the artifact under the name it always had, plus a record of what it was and where it belonged, by id rather than by path — written before anything is destroyed, and restore spends it against the *current* tree, reconciled so it can't reintroduce a tag or a value nothing stands behind. The mechanism's full story is [[NexusRecordPM]]'s; what's open is reach: `listBundles` has no IPC channel and no caller, so everything here is addressable only from tests. The trash browser is what turns it into something usable, and its first task is one bridge entry.

Below that: a no-op option rename still re-dates every page holding the option — the fix is moving the option cascade onto the governed sweep's change detection, a replumb of the cascade's call sites rather than a patch; the record's three flagged rulings (Pending, below); and pushing main.

**Identity is kind-first** — the model itself is canonized in ClaudeMD. What the ledger adds is the half that isn't obvious from the model: an ID-less file is the *opposite* of Unknown and stays fully live — it adopts at open and is still swept, because identity decides whether a value can be handed back, never whether it may be cleared. One resolver owns folder classification at any depth, and an agenda config counts only where the nexus records its sidecar ID, which is what makes a hand-made or relocated config inert without a rule enforcing it. The old agenda architecture is gone rather than adapted — what replaces it starts from the settled identity model and an empty schema, because the shape both kinds carried was Apple's, never re-chosen.

### Recent Work

#### Embedded Pages (08-03 → 08-04)

The Embed Framework's second consumer finally arrived: typing `![[Title]]` on its own line in a page turns it into a live tile of that page — Obsidian's own syntax, so a Nexus keeps reading outside Pommora. The build leaned on what already existed at every seam: the tile chrome became one shared chassis both SurfacePM and the editor key onto, the panel rides the shared pane surface, the crumbs the preview already wore became the tile's hover breadcrumb, and the rename cascade sweeps embeds through a parallel pattern beside connections — an embed is deliberately never a link-graph edge.

The mechanism Nathan called early — a real editor line, not a table-style block replace — held up under every round: an atomic absorb hops the caret over the tile, and the lone-line guard makes every reachable caret seat harmless, proven by a census of all 92 bound editor commands after a hand-picked four let one escape ship green. The claim (resolved, first-per-title) has exactly one owner read by five consumers, which is what kept the layers from ever disagreeing about a line. Six phases, each gated simplify-then-attack; the gates paid for themselves every single round. → [[MarkdownPM]] §II. Embeddings · History.md.

#### Group Hiding (08-02)

A grouped view could collapse a band but never make it leave — hiding a group meant authoring a filter that only approximated it. Now every group row in the Grouping pane carries the Visibility pane's eye: option chips, sub-chips, and date buckets wear it ghosted at rest, folder rows reveal theirs on hover, and a hidden row pins its eye so nothing hidden is ever unreachable. The state is one view-level key list sharing the collapse vocabulary, filtered once at resolution — a hidden Set leaves the tree with its whole subtree, a sub-group bucket hides globally by value, and a stale key under a different grouping hides nothing — so every renderer present and future inherits it with no per-view code.

Two things came along because the feature exposed them: date grouping's middle region, always empty before, became the list of buckets the container's values actually produce — which is what made date bands hideable at all — and Hide Empty Groups finished its half-implementation, becoming a Switch above Ungrouped and moving view-level to cover every grouping kind rather than property ones alone. Verified live against a scratch nexus across the whole matrix.

#### The NexusRecord (08-01)

Deleting something was answered only by the trash's mirrored folder chain — a path that rots the moment a parent gets renamed — and a Finder-copied file shared its twin's id forever. The record closes both with two small memories that share a module boundary and nothing else: a provenance record riding inside each deletion's own bundle, holding ids instead of paths, and a per-machine baseline of what each open saw, which doubles as the adjudicator deciding which duplicate is the original.

The bundle shape exists because the record must write itself *before* the destruction it describes: record first, artifact in last, so the artifact's presence is the settle marker — a bundle without one is a deletion that never finished, kept as evidence rather than pruned — and a record that can't be written faults the delete before anything is gone. Restore is a pure resolver plus a mover that branches on nothing: final titles are the resolver's, membership re-applies through the one shared spend-per-landed-write loop, and everything refuses rather than guesses — only what still validates comes back, so a deleted select option or a since-gone page just doesn't return. That rule is also what made the property delete's recovery snapshot spendable at all; it had been a promise nothing could redeem. Actions only — every surface is deliberately sequenced after. 

#### The Record Survey (08-01)

Five agents read the whole record at once, each on its own lens, asked one question — what can be removed without losing anything — and came back with more defects than duplication. That ratio is the interesting part: a survey scoped as cleanup paid for itself in bugs.

The worst was a single page with unparseable frontmatter taking every nexus-wide sweep down *partway through the destruction* — tags stripped from the pages already reached, then a throw, registry entry intact, a raw parser error naming a bystander file. Around it: restore stricter about Space titles than the live tree, restored Contexts handing back sidecars tagging Contexts that no longer existed, a hidden-prefix Context unrestorable, and a duplicated Collection's saved view selection pointing at the original's view. Each fixed at its source, one commit apiece, every one negative-controlled. Then the sweeps became one walk — clearing a property, unlinking a Context or Space, and reconciling a returning artifact were five copies of the same five steps, and the copies had already drifted; the decision stays the caller's, and only genuinely different things ride as parameters.

#### Identity Rebuilt Kind-First (07-31)

The universal question inverted: it used to be *what is this entity's id*, and it is now *what is this* — the folder's sidecar — *and then what is its id*, under the key that names the kind. That single reordering is what makes a mislocated file recognisable at all.

Three divergent folder-classification checks became one depth-aware resolver, closing the hole where a nested agenda config read as an ordinary Set; registration by sidecar id replaced "any folder carrying an agenda config is a singleton"; six nexus-wide write sweeps gained an admission gate. The live migration renamed 171 real files and stripped 8 hand-authored slug ids so they re-adopted fresh, which made the migration its own end-to-end adoption test. A Swift-remnant sweep ran alongside — `_type`/`_status`, `parent_id` and its whole write path, `ConnectionEdge`, `reverse_name`/`reverse_icon`, `accept`, `default_sort`, `rootsOf` — each traced to the Swift build and removed rather than re-justified. No id-valued cross-entity foreign key exists on disk any more, which is precisely why the kind key can be the only in-file classification input.

#### The Erasure Campaigns (07-29 → 07-30)

Asking why tabs, pins, and favorites were "needlessly spread" found the consolidation mostly already done — but surfaced what was actually rotten: 19 KB of dead Swift-era keys in `state.json`, a pins folder of per-file tombstones engineering *around* the locked most-recent-wins philosophy, and stored paths as the one duplicate identity left, with real repair scaffolding tending it.

Two campaigns ran back-to-back on that finding. Swift parity came out wholesale — the settings seed, the date shim, the color exchange maps, the legacy view vocabulary, every Swift-citing comment, and the on-disk residue across both real nexuses, with zero migration code written. Navigation then collapsed onto one contract with one validation boundary: seven IPC channels became a read and a write, and stored tabs and previews dropped their paths to hydrate at restore through the one owner that prunes dead refs, mints paths, and recomputes the history pointer. The design's adversarial review flipped recents back to the db row on moving-parts arithmetic; the post-build review caught an ungated banner pointer feeding a file delete and a patch-writer reading through the lenient reader — both closed the same night, and the banner gate now guards every replaced-image delete in the app. 

#### The Band-Seam Law (07-30)

Every disclosure-band seam in Table and Cards reads two shoulders of the view's content rhythm, state-free, owned once in the shared GroupBand chrome behind a per-view `--band-clearance` binding — collapsed heads shed their dead clearance, a band opening a disclosure leads by a single shoulder, embedded cards gained their tail seam, and the menu/pane disclosure surfaces were audited as rightly unique. 

#### The Hardening Campaign & Its Inverse (07-29)

A ten-lens state-of-the-app pass ranked the systemic risks, and three got root-cause fixes rather than patches. Every read-modify-write now goes through one strict primitive under one law — absent is a fact, unreadable is ignorance, and a write may act on a fact, never on ignorance — closing the class where a transiently-unreadable file got silently replaced by a default. Glyph resolution collapsed to one rule (`entityIcon`), and the nexus walk went parallel with a stat-gated per-page cache, so an untouched file costs no read at all.

Then the inverse pass: an audit of guards defending against states that can't occur, traced path-by-path. Around thirty-four lines came out, and the audit's own tracing surfaced one real bug worth having. → `History.md`.

#### The HOIST Consolidation (07-29)

Two HOIST markers in the icon picker turned into a design-system pass: the outlined-box border six surfaces hand-rolled became `--border-cell` beside `--border-heading`, the accent-tint active stroke four surfaces restated became `--accent-stroke` (color only — the weights genuinely differ per surface), the picker's hand-rolled focus ring moved onto the house `fieldRing` channel, and the virtualizer's cell size single-sourced out of its silent-drift pair. → [[DesignPM]].

#### One Syntax For Every Pommora-Owned Key (07-28 → 07-29)

Properties keyed values by ULID inside a nested map while Contexts keyed theirs by name at the root — exact mirror images, each paying the cost the other refused. Legibility had already won once when Contexts were designed; this was the other half of that call. A page now carries `<Status>: Complete` at its root and Contexts moved to parentheses, both reading one module that owns the glyphs, the key build and parse, and every refusal message — the glyphs picked mechanically, since neither opens a YAML flow collection, so a key writes plain and unquoted.

Naming the key removed the reason four different decoders existed, and they became one that reads the declared type instead of guessing from bytes; a title is unique nexus-wide because the title *is* the key its values write under. → [[PropertiesPM]] · [[ContextsPM]] · `History.md`.

**Deferred:** definitions into `nexus.db` + SavedViews into `nexus.db` + an inline field-error surface + duplicate property names.

#### Contexts & Spaces + Closing the tierN Era (07-22 → 07-29)

The three-tier taxonomy was the last fixed thing in an otherwise user-defined system, so it became a registry: Contexts are entries in `.nexus/contexts.json` with ordinary minted ULIDs, Spaces live as folders under `.nexus/contexts/<Context>/<Space>/`, and membership is a parenthesized title key at every entity root — validated by registry membership at read. Renames cascade under a pending-rename journal that replays on open, and a Space is the second BlockHost, owning its own block document.

With both nexuses on the registry shape, the entire backward-compatibility surface came out rather than staying dormant. **A compatibility path is a liability once its last consumer is gone** — it can never again be exercised against real input. The stated consequence: a nexus left at the old shape can no longer be opened. → [[ContextsPM]].

#### The Feature Run Behind It (07-10 → 07-27)

The stretch that built the surfaces everything above hardens, each with its record in its Features doc: **SurfacePM** (the tile dashboard layer) → [[SurfacePM]]; the **Navigation surface and Multi-Tab Nexus** → [[NavigationPM]]; **Page Previews** on the NavWindow's chassis → [[PagePreviewPM]]; the **Unified Subfield** → [[SubfieldPM]]; the **Cards renderer and its drag rework** → [[CardViewPM]]; **PreviewPane** as the one floating-window chassis, which made the Settings window cheap → [[PagePreviewPM]] · [[ConfigurationPM]]; the **FilterPane rebuild** that made `PickerMenu` the second shared chassis and gave the design system `--field-ring` and the `stack.ts` z-ladders → [[ViewsPM]] · [[DesignPM]]; and the **lint + accessibility campaign** → [[Lint-And-Accessibility]]. The audit passes that closed this stretch re-grounded every Features doc against real code and established the standing shape: a fact with two sources is a defect — remove the second source, never reconcile the two.

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
- **PagePreview hover.** Unbuilt, self-contained, no dependencies.
- **Cross-location card reordering** in views — scoped and mechanical.
- **Canvas** — the spec sits at `Planning/6-26 - Canvas Spec.md`, unbuilt.

#### Open Questions

- **Is a Context's folder worth what its rename costs?** A Space's membership is inferred from which Context folder it sits in, and that folder is named by the Context's title — so a Context rename is the most complex write in the codebase: journal, folder rename, cascade through every member file, registry commit, settle, crash-replay. A `context_id` on `_space.json` would collapse it to one registry write plus the frontmatter cascade. The counter-argument is the reason it's built this way: `contexts/Projects/Pommora/` tells an agent what it is without opening a single JSON file, and that legibility is a core construct. Parked — it's a data-model change, and the journal only stops being worth it if the complexity starts biting.

- **Redundant identity sources.** Anywhere "what this is" resolves from more than one place. The exemplar: `PropertyValue.kind` is a runtime copy of `def.type`, and the picker *constructs* the tag from the very type it's nominally independent of — so a bare status value would have rendered as a select chip with no error anywhere. The sweep for these hasn't run and the suspicion is that more are hiding.

- **The NavPane toolbar dropdown** is a blank placeholder — what a compact nav dropdown holds versus the fuller NavWindow is an open call before building into it.

#### Debt & Ride-Alongs

- `schema:changeType` is fully built in main, exposed in preload, and has no renderer call site — only test mocks, which read as coverage it doesn't have.
- NOR filters are hand-authoring only — the mode lives on disk and in the evaluator; the pane offers All and Any, and a hand-authored NOR decodes as `locked`.
- `bounds` and `scanLabel` on PreviewPane have no caller yet; hard-coding them would force the first new consumer to edit the component instead of configuring it.
- Four affordances whose features haven't arrived are `disabled` rather than wired to a no-op — the Space pane's actions ellipsis, the ViewPane's More menu, the ViewSettings icon picker, and the Page Preview's own Settings button.
- The flattened-mode bundle is half-built: `flat` grouping and Hide Location are live for Cards, while the grouping pane offers "None" only under Cards and the pipeline refuses `flat` structurally for tables. The table half plus a separate Flatten control is what remains. → [[ViewsPM]].
- Perf debt: no row virtualization yet (every row mounts, which bites at thousands), and an external value edit doesn't live-refresh an open table. The one-view-mounted multi-tab design deliberately dodges needing table virtualization.
- iCloud-sync readiness (future) — `serializeOnFile` can't coordinate with the iCloud daemon under LWW, `.nexus/nexus.db` needs sync-exclusion, and the walk has to skip `.icloud` placeholders.
- Mobile iOS companion — parked, spec at `.claude/Mobile/MobileSpec.md`, no build commitment.
- Eight renderer sites repeat `if (!res.ok) showError(res.error.message)` — one `reportIfFailed(res)` helper collapses them when a ninth appears.
- `SessionState.error` and `pageError` hold strings while the wire carries `PommoraError` whole — widening them is near-zero churn whenever a surface wants to branch on `code`.
- **The kind key is a DELIBERATE second identity source — do not consolidate it away.** The file's kind key and its folder's sidecar declare the same thing on purpose: their *disagreement is the detection signal* that makes a mislocated file recognisable at all. A checksum, not the two-writers defect — the one place that lesson does not apply.
- `useExitPresence`'s default exit window is a raw constant decoupled from the motion tokens — derive it from `duration.slow` + slack or menus flash on close if the tokens are ever retuned.
- `useDismiss` coordinates with picker portals via per-event DOM queries — a shared open-picker counter removes the DOM handshake.
- The preview window fetches the same page twice (PageEmbed's body load + PreviewInspector's frontmatter fetch) — lift one `openPage` result to the window and pass both halves down.
- When a third boolean-dropdown consumer appears, extract the `useMenuPresence` bundle — at two consumers it is indirection, not DRY.
- `group.tsx`'s `cellAt` rebuilds the zone's column model per item per over-flip — hoist lefts/stride/cols to a per-zone computation.
- `sidebarDnd`'s collection/context branch re-filters the sibling set per pointermove — snapshot it at activation (invariant mid-drag).
- View format/grouping/banner saves still trigger a full vault walk — an optimistic view-slice patch skips it; `submitPropertyRename`'s walk wants the same targeted-patch treatment.
- The sidebar mode cross-fade renders two full trees, each building its own DnD index — share the tree-keyed index memo across the exit/enter layers.
- Id-keyed inline renames (ViewPane's view rename, the property-rename channel) each re-roll the `EditableInput` wrapper `RenamableTitle` provides for path-keyed rows — a state-driven `RenamableLabel` twin unifies them.
- The rest of the gesture family (`sidebarDnd`, the table column drag, `useOptionReorder`/`useStatusReorder`, MarkdownPM's `listDrag`/`blockDrag`, SurfacePM's `pointerDrag`) still hand-roll the skeleton `gesture.ts` owns — migrate each onto `usePointerGesture()` opportunistically as its file is next touched; a click-or-drag surface waits on the skeleton growing a sub-threshold-release hook.
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

- One unreproduced renderer crash during a programmatic scroll jump toward a table inside an embed tile — black window, no crash log, no console errors, clean on replay and under gradual scrolling. On watch, no repro.

- The "File" property icon gets clipped by its vertical row padding on the ViewPane.
- The link-rename field shows a leading empty space — a visual inset, not a stored character (deprioritized).
- A bare `>` separator line splits a quote or callout into three blocks — `isBlockquoteLine` wants whitespace after the `>`, so the standard blank-inside-a-quote line reads as a paragraph, growing a mid-quote grip and drop slot (`blockModel.ts`).
- `*` and `•` bullets render as plain text while the drag layer parses them as list markers — `LIST_MARKER_RE` accepts `[-*+•]` but no construct branch renders them, and `* [ ]` *does* render as a checkbox; whether `*` becomes a rendered bullet or the parser narrows is Nathan's call. 
- The Set-Card drag flash (drop snaps back, then jumps on reload) — the optimistic moveSet order patch is in; wants one live drag before this line drops. 
