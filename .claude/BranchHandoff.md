## Branch Handoff — Contexts & Spaces

The pre-merge record for `contexts-spaces`: 90 commits covering the Contexts registry rewrite, two shared-surface extractions, a lint and accessibility campaign, a documentation truing pass, the FilterPane rebuild, a three-part adversarial verification, and the cleanup that closed everything it found.

Read it as standing truth, not as a diary. Where a decision changed mid-branch, only the decision that survived is stated; reversals are recorded once, under their own heading, because the reasoning still governs.

### The Arc

The branch set out to replace the fixed three-tier context model with a **user-defined registry**, and everything else followed from how far that reached. Contexts became ordinary registry entries — Areas, Topics and Projects are seeded rows, not types — which meant every consumer that had hard-coded three tiers had to be rewritten: the walk, the index, the sidebar, selection, navigation, table resolution, column labels, the DnD model. Spaces then needed surfaces of their own, which surfaced a second problem: the app had three near-identical floating windows and no shared chassis. Extracting that chassis pulled in the Page Preview and the NavWindow, and made a real Settings window cheap enough to build. Shipping Settings falsified a batch of documentation, which triggered an audit that found the docs had been describing an architecture that was never built. The FilterPane returned last, and its rebuild became the branch's second design-system contributor.

### Contexts — The Registry Model

**The shape.** A Context is a registry entry holding Spaces. No Context contains or parents another; an entity tags whichever Spaces fit. The registry is identity — a Space's id, title, icon, colour and display order all live there — and registry position *is* display order. Membership is expressed in an entity's front-matter as a **bracketed title key**, resolved against the registry at assembly.

**The read path.** The walk retains raw context keys and resolves them at assembly rather than during traversal, so resolution has the whole registry available and a key that resolves to nothing survives as data instead of being dropped. `NexusTree.contexts` is a required field (`[]` on a raw or unmigrated tree), which lets the index's legacy-link resolution key on emptiness.

**Writes.** Registry CRUD runs under a lock, with a **journal** and a three-scope title cascade: renaming a Space rewrites every member's key, and the cascade is journaled so an interrupted rename resumes rather than half-applying. Every context write funnels through `reconcileWriteRoot`, and `isGovernedContextKey` is the single predicate naming which root keys the Contexts layer may rewrite. All JSON reads pass a **strict chokepoint** — a transiently unreadable sidecar fails the write instead of clobbering identity and relations to empty.

**Migration.** `tierN` → registry migration is idempotent and runs inside `adoptNexus`, before the index opens or the watcher starts. Its re-entry signal is the **version alone**, never the presence of tier directories — step 2 consumes those, so a crash between the folder move and the version bump would otherwise seal a half-migrated nexus. An unreadable tier sidecar withholds the bump so the next open retries.

**Case folding.** The filesystem is case-insensitive, so a case-variant Context twin would silently share one folder. Create and rename uniqueness folds through the value-coercion normalizer — while a case-only rename of the entity *itself* (`Projects` → `PROJECTS`) passes rather than colliding with its own folder.

**Pipeline.** Context values resolve per node. Context columns default **OFF**, and resolution runs through an identity seam so a user-defined Context is offered on exactly the same footing as a seeded one.

### Spaces — Surfaces

A Space is the second **BlockHost**: `_space.json` carries its block document, tiles live in its folder, and the host resolves through the write-side world load. Space doc writes ride `rmwJsonStrict`. The link-graph walk enumerates the homepage plus every Space.

`SpaceView` renders a Space's banner scaffold over its block surface, keyed per Space so a session never carries across a host swap, and the doc load keys on **host identity, not kind**. Board locks generalised to host-keyed: the homepage flag plus a per-Space lock map seeded from each doc load.

The sidebar renders every registry Context as its own disclosure of Space rows. Creation is scoped — an in-group right-click offers `New <Singular>`, the group header pops a native menu, and background right-click in the Contexts mode offers New Context. Every create lands directly in its rename field. Group headers drag to reorder, committing `reorderContexts`.

### Shared Surfaces

**PreviewPane** is the floating-window chassis every in-app window mounts: glass, geometry, the dismissal contract, a three-slot overlay toolbar, two side-pane slots (overlay *or* in-flow), a collapsing footer, and the glass tint as a prop. The Page Preview and the NavWindow both migrated onto it and `FloatingPane` was retired. Verified against a captured pre-refactor baseline: 15/15 states pixel-identical, every recorded rect unchanged, both FLIP keyframes and the `--io` shield intact.

Two rules a future window must respect, both learned the hard way:
- **Openness drivers stay declared per-window**, because they inherit — a driver declared once at app level leaks into every consumer.
- **A FLIP measures from the surface root**, via a real ref, never by walking `parentElement`.

**`PickerMenu`** became the second shared chassis, gaining four capabilities the FilterPane needed and every picker now has:
- **`origin`** (`right | center | left`) — which edge the pane pins to, and therefore which way it grows. Replaced the old `center` boolean; all seven consumers migrated to the one prop. `NotchedPane` gained the mirror `notchInsetLeft`.
- **`maxHeight`** — routed through the shared `MenuScrollFrame`, so the cap, the single overflow region and the edge-fade all come from one place.
- **`width`** — a fixed content width, for a pane whose content resizes.
- **`optionRing`** — the selected-row ring, with run-merging built in.

**Channels, not shadows.** `--field-ring` (extracted mid-branch from the Space colour work) is the input layer's one outline contract: consumers set the colour, never the shadow. `fieldRing()` and `focusRing()` express its two recipes, and live in a plain module rather than a stylesheet — vanilla-extract permits a `.css.ts` to export only plain values, so a helper that *builds* a declaration must sit beside the stylesheet, not inside it.

**The layer scale.** `stack.ts` names every z-index the app uses, in three ladders — `shell` for the in-flow chrome, `local` for a component's own internal ordering, `top` for the portal and caret layers. Raw layer numbers are gone from the design system; a new surface picks a rung rather than a number.

### Behaviour Changes A User Would Notice

- Contexts are user-defined. Areas, Topics and Projects are seeded entries, renameable, recolourable, reorderable and deletable like any other.
- Context columns arrive **off** by default.
- A Context selection renders nothing — a Context is a disclosure, not a destination.
- Spaces are managed from the toolbar pane. There is no floating settings window.
- The ribbon's Settings glyph, a documented no-op since the ribbon was built, now summons a real Settings window.
- The tab strip eclipses an overflowing label instead of hard-cutting it, and compacts out from under an open side pane.
- Renaming a page to a leading-underscore name is refused instead of silently making it disappear.
- Every non-button click surface activates on Enter and Space through one shared primitive, and a keyboard-opened menu paints a house focus ring rather than Chromium's default outline.
- The filter authoring pane returns: per-row sizing, Location as a disclosable Set tree with a fixed-width picker, an All/Any footing carrying no label, and an on/off switch independent of the rules.

### Consolidations

Each replaced two or more implementations with one:

- `FloatingPane` → **PreviewPane**; both floating windows plus Settings mount the one surface.
- Hand-rolled outline rings → the **`--field-ring`** channel; its ring and focus recipes → `fieldRing()` / `focusRing()`, collapsing three verbatim copies (two in a single file).
- The trailing button pair both windows declared identically → one component.
- The fixed-three context struct → the **registry** as the single context shape.
- The governed-key predicate → **`isGovernedContextKey`**.
- Sort and filter target vocabularies → shared builders in **`PropertyTypes`**.
- Four hand-assembled checkbox boxes → **`CheckboxGlyph`**.
- Two `twisty` definitions on different motion beats → one in **`menu.css.ts`**, with the beat as a `--twisty-beat` channel so a surface can pin its chevron to its own unfold. The sidebar's Hide-Chevrons layout re-keys on a `data-twisty` attribute, because a plain stylesheet cannot name a hashed class.
- The disclosure **rail** → `menu.css.ts`, out of the Grouping pane.
- Three statements of "anchored below its trigger" → **`dropdownAnchor`**, one base taking a placement and a stack rung.
- Disclosure state and the recursive Set-tree row, written twice → **`useDisclosureSet`** plus **`DisclosureRow`**, which takes the row's action as a seam. It renders a Fragment rather than a wrapper, because the selection ring merges runs across real siblings.
- Two `ResizeObserver`s over one pane → **`NotchedPane` as the single measurement owner**, publishing its box to whoever needs the same numbers.
- Raw z-indexes from 1 to 1100 → the **`stack.ts`** ladders.
- Three hand-rolled Space glyph fallbacks → the **identity seam**.
- `activeRow` → **`optionRing`**.
- `PICKER_MAX_HEIGHT` → out of `Blocks/` into the design system.
- The chip's reveal-gated remove → **`ChipRemoveButton`**, now used by non-chip surfaces.
- The multi-select toggle → the existing **`toggleValue`**.
- The `tier` and `context` filter arms, byte-identical → one fall-through.

### Fixes Worth Remembering

- **A rename could permanently vanish a page.** `invalidName` rejected separators, dot dirs and managed extensions but not a leading underscore, while the walk skips `_`-prefixed files. `_Draft` wrote a real file and dropped it from the tree — indistinguishable from a delete, with no error and no way back.
- **A settings knob that never round-tripped.** `connectionsOpenInPreview` was consumed in three places but never parsed on read, so its toggle applied live and reverted on relaunch.
- **The toolbar pair chased its pane.** A reveal nudge and the side-pane swallow shared one element, so `transition: transform` annexed a transform derived from the interpolating `--io`; every frame retargeted a fresh transition and overshot. A settled-state pixel diff could not see it.
- **Two hot editor paths bypassed `docCache`**, re-joining the whole rope per keystroke.
- **The filter's abstain guarantee stopped at the leaf.** A fully-unauthored nested group voted `true`, which the parent's abstain filter cannot strip — so `(A and B) or C` with A and B blank suppressed C's filtering entirely, and blanked the view under NOR. Groups now abstain too.
- **Filter writes rebuilt from a render snapshot.** A ref write does not re-render, so the second write in one gesture re-serialised a pre-save row list: a blur-committed value dropped by the click that caused it, a removal resurrected by the next removal. Every mutator now re-reads the last-written rows at call time.
- **A text field's flush read a dead DOM node.** The input is keyed on its value, so each commit swaps the element; a node captured at mount went stale, and leaving via Back — which suppresses pointerdown to protect focus and fires no blur — silently saved nothing.
- **A picker could park off-screen.** The collision flip is decided once per open, but the reset was keyed on unmount, and reopening inside the 380ms exit window cancels it. On shared-anchor hosts the pane inherited the previous placement.
- **A locked embed reported success while dropping the write.** The config seam returned `ok` on a refused write, so the caller's optimistic state stood until remount. It now refuses explicitly.
- **The Toolbar's dropdown beaks were hard-coded fractions** of a width they did not own, and were already aimed wrong. They measure the trigger now.

### Reversals

- **The floating Settings window was built, iterated across roughly eight commits, then removed entirely** — component, CSS, store slice, preload push-back and native-menu entries. A *different* Settings window later shipped for app personalization on the PreviewPane surface; the two are unrelated, and only the second exists.
- **Per-Context singular editing was built and then removed end-to-end.** Seeded Contexts keep their singulars for create labels; user-minted Contexts read a flat `New Space`.
- **The legacy `tierN` read path was defended, then deleted.** The claim that migration never rewrote page front-matter was wrong — `reconcileWriteRoot` resolves each `tierN` array, writes the bracketed key and deletes the tier field, and migration step 4 runs it over every entity root. The conversion stays, so a stray legacy root still repairs itself on its next governed write.
- **Resize strips were given `aria-valuenow`, then stripped of all roles** — the values promised keyboard resize that does not exist.
- **The filter's `none` (NOR) mode was built, then withdrawn from the pane.** It survives on disk and in the evaluator; the pane offers All and Any only, and a hand-authored NOR decodes as `locked`.
- **The FilterPane's Location chips became segments**, and the segment's × went through an eclipse fade before landing on a collapsing slot: the × occupies a zero-width grid track at rest and the segment elongates on hover. The grid *item* has to zero its own `min-width` — `0fr` resolves to `minmax(auto, 0fr)`, and the `auto` floor is the item's min-content width.

### Self-Corrections On Record

Kept because the reasoning still guards something:

- The a11y pass shipped **three regressions its own gates could not see**: Space could not be typed in any inline rename; keyboard drag-reorder was silently killed at four sites by re-declaring `role`/`tabIndex`/`onKeyDown` after a props spread; and several suppression comments asserted things that were not true.
- Biome's `noConfusingVoidType` autofix was **wrong** here — rewriting a callback's `void` return to `undefined` breaks assignability.
- The documentation audit found the docs asserted **an architecture that was never built**: a SwiftUI manager layer with a DI graph, a live SQLite query engine with a facade, and Connections resolving through SQLite. None existed.
- The `twisty` hoist treated a deliberate override as a duplicate, desyncing the Properties pane's chevron from its own unfold by 100ms and deleting the comment that recorded the constraint. The beat is now a channel and the reasoning is back in the code.
- Two shared helpers were exported as functions from a `.css.ts`, which typecheck and lint cannot see and only the vanilla-extract plugin rejects.
- A whole-tree `git stash` run by one implementation agent swept up three siblings' in-flight files mid-write. Nothing was lost, and the hazard is now recorded in `Guidelines/Design-Sources.md` — agents that write share one tree, so whole-tree git operations are forbidden in their briefs and a clean baseline means a worktree.

### Verification

Three read-only adversarial passes ran against the finished tree — CSS/styling, behaviour/model, interaction/events — each scoped to soundness, parked-versus-dangling, and DRY. Every finding was re-verified against the code before being acted on, and every fix below is folded into the tree above.

They produced **six real defects**, four of them introduced by this branch's own final session: the group-abstain hole, the stale-snapshot writes, the detached-node flush, the stranded picker direction, the E-8 desync, and the `.css.ts` function exports. Two more were latent: a keyboard-focusable chip × that could never fire (its Enter opened the host picker instead), and an unguarded `onTransitionEnd` on a component that genuinely nests.

Two shipped tests were found to **certify guarantees they never tested** — a blur-survives test that clicked a different axis, and abstain tests that only ever used flat rules. Both were widened, and each new test was checked by reverting its fix and confirming it fails.

The eight items the passes parked were then closed in three waves, each dispatched to its own agent and each result re-verified against the code rather than taken from the report.

### Deliberately Parked

Inert by choice, not half-wired:

- **The SQLite index has no query consumer.** It is built and maintained; nothing reads it, and every mutation cold-rebuilds it. Writing the query facade is the open architectural task, gating Linked-From, backlinks and search.
- **`tierN` read-healing on write** — a stale device that writes `tierN` is repaired rather than rejected.
- **NOR filters are hand-authoring only.**
- **`bounds` and `scanLabel` on PreviewPane** have no caller yet; hard-coding them would force the first new consumer to edit the component instead of configuring it.
- **Four affordances whose features have not landed** — the Space pane's actions ellipsis, the ViewPane's More menu, the ViewSettings icon picker, and the Page Preview's own Settings button — are `disabled` rather than live buttons wired to a no-op. `AccessoryButton` gained a real disabled state to make that expressible, and `InlineEditHeader`'s icon handler became optional.
- **The group-band "+"** is a visual stub awaiting a creation-affordance design.
- **Grids have no keyboard navigation, and drag handles are pointer-only** — recorded as real gaps, not lint failures.

### Open Rulings

Two items are open because they need a decision, not an implementation:

- **A locked embed's BODY still writes silently.** The config panes are frozen and the seam now refuses, but `TableView` and `CardsView` write view config from the table itself — column resize/reorder/align, hide column, card style, group collapse. They carry optimistic overrides, so they look applied until remount. Freezing them needs a ruling on which in-table gestures a config lock owns; group collapse in particular reads as "how I'm looking at it" rather than authoring, yet it persists into view config.
- **Right-clicking Change Color in the Space settings pane closes the pane.** Not reproduced. Every renderer-side path was eliminated: no blur or focus listener exists, `setPanel(null)` has one caller whose ref contains the dropdown, and the picker's portals are spared by both dismissal checks. The residual mechanism is a pointer event delivered after the native menu returns input. Two guards landed that are correct regardless — `useDismiss` ignores non-primary buttons, and the header yields the gesture over an editable target, which also closes a proven two-native-menu collision. Confirm with a capture-phase `pointerdown` log during one right-click.

### Merge

The branch was rebased onto `origin/main`, replaying all 90 commits with no conflicts — the one commit it was behind (`9ba2e53e`) touched `.gitignore` and `.claude/settings.json`, which this branch never opened. `origin/main` is an ancestor, so the merge is a true fast-forward.

**Gates, re-run on the rebased tip:** `typecheck 0` (both configs) · `lint 0` · `1904 tests / 187 files` · build clean · working tree clean.
