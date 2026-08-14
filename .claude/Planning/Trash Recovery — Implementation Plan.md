## Trash Recovery — Implementation Plan

> **Status:** written, pending review · Spec: `Trash Recovery — Decision Log.md` · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A deleted entity becomes findable and recoverable from inside Pommora. Today the `.trash` engine is complete and unreachable: bundles are written, records are gathered, placement is resolved and restore is tested end to end, with no surface that can call any of it — putting something back means moving files by hand in Finder. At the end, the Settings window carries a Trash leaf listing everything the nexus has thrown away, and a right-click puts any of it back or lets it go for good.

The shape follows from one fact: **the engine already exists and is right.** So this is a surface plus two channels, not a feature build. The list borrows the navigation row's styling rather than driving the real table, because the table takes a container node and resolves its own schema, saved view, values and orders from it — feeding it a synthetic Collection would be more code than the list it replaced, and would couple the trash to a property system it has nothing to do with. Where a recorded home no longer exists, restore stops refusing and asks instead, reusing the resolver with its parent substituted so every placement guarantee still comes from the one function that owns them. Ratified by Nathan across the decision log, including the ruling that a relocated entity is reconciled against the schema it lands in rather than the one it left.

Bounded to what the engine already does. This does not prune the trash, preview a trashed page's body, sort the list, surface deleted properties, restore anything out of the operating system's trash, re-mint a colliding identity, or reconstruct a parent that no longer exists.

**Requirements**

1. The renderer can enumerate what `.trash` holds, as rows carrying kind, title, live breadcrumb, deletion time, bundle path, and whether the recorded home still resolves.
2. A new main-side op empties a bundle — artifact to the system trash or erased outright per the switch, spent bundle removed behind it — guarded to `.trash` and to bundles alone.
3. Restore accepts a chosen destination for the kinds that can be homeless, resolved through the existing resolver with its parent substituted.
4. The Settings rail hosts a leaf whose body is a surface rather than a toggle list, bottom-anchored under a divider.
5. The leaf lists rows in the navigation row's styling with a fixed deleted-date lane, under heading rows naming both columns, filtered live by a search field that yields Escape back to the window once empty.
6. Rows carry always-visible checkboxes, local multi-select, and a select-all.
7. A right-click menu offers Restore and Delete for one row and Restore All and Delete All for a checked set, with Restore opening a nested destination submenu where the home is gone.
8. Restore returns an entity to the tree, reachable immediately, without opening it, and drops its row.
9. A **Permanently Delete Files** switch governs what emptying means, defaulting off.
10. Context and Space carry distinct kind glyphs.
11. `SettingsWindow` becomes `NexusSettings`, opening at 850 × 600 with a floor that fits the surface and no phantom rail padding.
12. The search field is one component with four consumers, every existing surface pixel-identical.

**Acceptance — the whole thing working**

Delete a page, a Set holding pages, and a Space from a Context. Open Settings → Trash: all three appear with correct kind glyphs, titles, breadcrumbs and times, newest first. Rename the page's parent Collection, then restore the page — it lands in the renamed parent, is reachable in the sidebar and openable in a tab without reloading the nexus, and does not open by itself. Delete the Set's parent Collection, then restore the Set — its Restore opens a destination submenu, and the pick places it there. Check the remaining rows, Delete All, confirm — they leave the list and appear in the system trash as bare files. Type into the search field — the list narrows on title and breadcrumb; press Escape once and the query clears, again and the window closes. Turn the switch on, delete one more, and it does not reach the system trash at all.

**Forced By**

- The engine ships tested with no caller → this is a surface and two channels; no restore or placement logic is written.
- `.trash` is excluded from the watcher → the list never receives a push; it fetches on open and refetches after every action it takes.
- The bundle's folder name is the only place a deletion timestamp exists → the date is parsed from the stamped leaf, never from a record field or a folder mtime.
- `isReserved` refuses every path under `.trash` for ordinary mutations → emptying is a new op that makes its own guard, and that guard requires a readable record, since `.trash` mirrors the nexus and a user's own folder may wear the bundle suffix.
- `resolveRecord` is not the record's only reader → substituting the parent also redirects the frontmatter reconcile, which is the ruled-on behavior rather than a side effect.
- `store.mutate` refetches the whole tree per op → a batch calls the channel directly and refreshes once; a single action keeps the store path.
- The table's tokens are scoped to the table's own surface and the nav row's inset to the two nav windows → the leaf declares every token scope it borrows, or both surfaces render wrong in silence.
- `menuTemplate` emits a flat row with no nesting → the destination submenu pops through `popReturningMenu`.
- `EntityIconKind` has no `context` member → the glyph change is a hard prerequisite, not a sibling.
- `Personalization` is validated by a hand-written coercer, not a schema → a new key absent from it is invisible forever.
- The write path reads app config and never the nexus settings → main reads the delete switch itself, per operation.

**Inherited Reasoning**

- **Driving the real `TableView` was rejected on inspection**, not principle — it has no row-array entry point in 1955 lines.
- **Reusing `{ op: 'delete' }` for emptying was refused** by the write path's own guard; loosening it for one caller would weaken a deliberate defense.
- **Filling the rail's reserved band with the scan glyph** was the opposite fix and one prop away; rejected because the Settings window has no full-page form to promote into.
- **One destination applied to a whole batch** was dropped rather than deferred: checked rows may be different kinds with incompatible matrices, and even one kind came from different homes.
- **An earlier draft claimed substituting the parent preserved every guarantee.** It does not — it also redirects the reconcile. That behavior was then ratified as intended; the claim was wrong, the outcome is right.

**Grounding** *(re-open these; don't cite them)*

- `Trash Recovery — Decision Log.md` — the ratified spec. Every task cites its decisions.
- `Pommora/src/main/provenance.ts` — `listBundles`, `ListedBundle`, `resolveRecord`, `restoreArtifact`, `REFUSAL_TEXT`, `bundleArtifact`.
- `Pommora/src/main/io/atomicWrite.ts` — `BUNDLE_SUFFIX`, `trashStamp`, `stampedLeaf`; the stamp's encoding.
- `Pommora/src/main/mutate.ts` — `isReserved`, `MutateDeps`, `dispatch`'s switch and its exhaustiveness tail.
- `Pommora/src/main/crud/restoreScrub.ts` — `scrubReturning`, and what the owning Collection argument governs.
- `Pommora/src/shared/bridge.ts` · `src/preload/index.ts` · `src/main/ipc.ts` — the channel contract and its `kind` policies.
- `Pommora/src/main/returningMenu.ts` · `main/cardMenu.ts` · `main/gripMenu.ts` — the nesting menu pattern and its empty case.
- `Pommora/src/renderer/src/Settings/SettingsWindow.tsx` + `settingsWindow.css` — the rail, the body, `DRAG_SURFACES`, `WIN`/`RAIL`.
- `Pommora/src/renderer/src/Navigation/NavList.tsx` + `navList.css` — the row anatomy being cloned.
- `Pommora/src/renderer/src/Detail/Views/Table/Table.css` + `table-tokens.css` — the heading's declarations and the scope they live in.
- `Pommora/src/renderer/src/design-system/symbols/index.tsx` — `ENTITY_ICON_KINDS`, `DEFAULT_ENTITY_ICONS`, `entityIcon`, the curated roster.
- `Pommora/src/main/readNexus.ts` — `readPersonalization`, the coercer a new key must join.
- `.claude/Guidelines/` — read before planning in any of these domains.

**Environment**

- Plan directory: `.claude/Planning/`. Rules directory: `.claude/Guidelines/`.
- Explorer: `Explore`. Research: `general-purpose` with web search.
- Attack reviewer: `build-breaking-agent` (the project's own).
- Code reviewer: no correctness-review agent is designated — **fallback**: `general-purpose` scoped to correctness, or the `/code-review` skill.
- Neutral verifier: `general-purpose`, handed the adjudication question alone.
- Simplification: `code-simplifier` (the project's own), plus `comment-killer-agent` on the diff.
- Gate commands, from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`.

**Shapes:** additive · refactor · fix · user-visible

**Global Constraints (every task inherits these)**

- Gates run from `Pommora/`: `npm run typecheck`, `npm run test`, `npm run lint`. Exit codes read directly. **Never** read an exit code through a pipe; use `set -o pipefail` or read the summary line.
- Lint must end at zero diagnostics of any severity, including `info`.
- Main owns the filesystem. The renderer never touches Node. Every channel is declared once in `src/shared/bridge.ts`; both ends derive from it.
- IPC never throws across the boundary — data channels return the `Result` envelope.
- Never two definitions for one thing. Sweep the design system before authoring any style or mechanism.
- Tokens come from `design-system`; never hand-rolled without explicit direction.
- Comments minimal — only what the code cannot say. Never restate a value a declaration holds.
- Formatting is Biome's via a PostToolUse hook. Never hand-align; an Edit failing on whitespace means Biome reformatted, so re-read and retry.
- Stage explicit paths, never directory-level adds — a parallel session may be writing.
- No keyboard shortcuts without per-shortcut sign-off.
- One tree-touching writer at a time.
- Out of scope everywhere: pruning `.trash`, previewing a trashed body, sorting, deleted properties, surfacing `trashMode`, restoring from the system trash, re-minting identities, reconstructing parents.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| NexusRecordPM | "Every surface — the restore trigger, the trash browser, any compare view. The actions they invoke exist; the surfaces read and call them." | Two of the three arrive | 15 |
| ArchitecturePM | "the restore action is IPC-reachable; no surface browses the trash or invokes it" | Both halves | 15 |
| PommoraPRD | "no surface browses or restores it yet, which makes putting one back a manual move" | Inverts | 15 |
| ConfigurationPM | "Its rows are per-Nexus knobs" | A leaf carries a surface; the window renames and resizes | 15 |
| `provenance.ts` | "Parked, NOT dead code: no bridge channel exposes this" | Task 4 wires it | 4 |
| `shared/mutate.ts` | "the whole restore path is built and tested main-side and has no renderer caller by design" | Task 13 calls it | 13 |
| SidebarPM | names the surface the Settings glyph summons | The rename | 15 |
| ContextPM | carries the trash browser as Current Focus and Immediate Work | It ships | 15 |

**Dead Vocabulary**

- `rg -F "SettingsWindow" Pommora/src` → expect 0, down from 5. Legitimate hits: none.
- `rg -F "entityIcon('space'" Pommora/src` → expect **7** after conversion, down from 13. Legitimate hits: the `treeIndex.ts` and `contextIdentity.ts` space branches, `Sidebar.tsx:567`, `SpaceDropdown.tsx`, `SpaceSettings.tsx`, and two lines in `entityIcon.test.ts` that test the space kind on purpose. Any Context-drawing site remaining is a defect.
- Control: `rg -F "entityIcon(" Pommora/src` → **43** at planning time. Zero here means the search never ran.

**Hazard Window:** Task 4 widens `ENTITY_ICON_KINDS` and converts the six Context sites in the same commit; the window opens and closes inside that task, and **Gate 1 is its closer**. Nothing later is constrained — Task 13 must add a new `entityIcon` call site to draw its rows, and does so against a union that is already correct.

---

### Phase 1 — Clearing the ground

#### Task 1: The stray lint diagnostic

**Requirements:** —

**Why:** The project's rules state lint runs clean, and one redundant fragment in a test file contradicts it. It predates this work and sits outside its diff; a rule contradicted by one character is repaired rather than documented around. → M-6.

**Files:** `src/renderer/src/MarkdownPM/mdLinkTarget.test.tsx`

**Steps:**
- [ ] Remove the redundant fragment.
- [ ] `npm run lint` — expect zero diagnostics of any severity.
- [ ] Commit: `chore(lint): the last diagnostic`

#### Task 2: Fold four search inputs into one component

**Requirement:** 12

**Why:** The same bare input is inlined three times and the trash would be the fourth. It has no dependency on anything else here and its spec says outright that it does not belong in the feature's own commits — so it lands on its own, where a red gate means the refactor and nothing else. → E-8, E-11.

**Files:**
- Create: the shared field, in `src/renderer/src/design-system/components/`.
- Modify: `src/renderer/src/Tabs/NavView.tsx` · `NavWindow/NavWindow.tsx` · `Components/IconPicker.tsx`.

**Survivors:** all three surfaces look **exactly** as they do now. They agree on almost nothing — two are transparent and one is a filled field with a radius and a focus ring, one overrides the type ramp, one autofocuses through a ref, and the wrappers are three unrelated objects. **NavWindow's placeholder has no colour rule and falls to the browser default** where the other two are tertiary; a component that styles placeholders uniformly changes it, which is the one thing this refactor promised not to do. The shared part is the controlled value, the spellcheck, and the chrome reset — nothing a caller disagrees on.

**Failure half:** a caller passing no placeholder → renders none rather than a default; the autofocusing consumer keeping its ref through the seam.

**Steps:**
- [ ] Screenshot all three surfaces at rest and focused.
- [ ] Extract the field; convert the three consumers.
- [ ] Re-screenshot and diff — expect no visible difference, NavWindow's placeholder included.
- [ ] Gate — expect green.
- [ ] Commit: `refactor(design-system): one search field, four consumers`

#### Task 3: Give Context its own kind glyph and move Space to the dashboard

**Requirement:** 10

**Why:** The trash resolves a row's glyph by kind, and `context` is not a member of the icon kind union — building the list first is a compile error, which is why this leads rather than rides along. It also fixes the cause rather than the symptom: six surfaces ask for a Space when they mean a Context and get the right mark by accident of the two being alike, so the moment Space's seed moves, every one of them silently becomes wrong. → L-1, L-2, L-3, L-4, L-10, C-7.

**Files:**
- Modify: `src/shared/types.ts` — `ENTITY_ICON_KINDS` gains `context`.
- Modify: `src/renderer/src/design-system/symbols/index.tsx` — `DEFAULT_ENTITY_ICONS` gains `context: 'layout-grid'`; `space` becomes `'layout-dashboard'`.
- Modify: the six Context-drawing call sites in Derivation.
- Modify: `src/main/crud/contextWrite.ts` and `src/renderer/src/treeMove.ts` — stop stamping the literal icon on a minted Context.
- Test: `src/renderer/src/Detail/Views/pipeline/contextIdentity.test.ts` — asserts the old Space seed.

**Derivation**
- `rg -F "entityIcon('space'" Pommora/src` → **13** at planning time across renderer + tests. Of these, the **six Context-drawing** ones convert: `treeIndex.ts:79`, `Sidebar/Ribbon.tsx:48`, `Sidebar/Sidebar.tsx:584`, `Components/Detail/PagePropertiesPane.tsx:218`, `Detail/Views/pipeline/contextIdentity.ts:51`, `PagePreview/PreviewInspector.tsx:336`. The seven genuine Space sites stay.
- Control: `rg -F "DEFAULT_ENTITY_ICONS" Pommora/src` → **8**. Zero means the search never ran.

**Interfaces**
- Produces: `EntityIconKind` widened to include `'context'`; `DEFAULT_ENTITY_ICONS.context`.
- Assumed by: Task 11 (row glyphs resolve by kind).

**Survivors:** the seven genuine `entityIcon('space', …)` sites keep asking for a Space, because they draw Spaces. An entity's own stored icon and a nexus's `defaultIcons` override both still outrank the seed — this moves a floor, never a choice anyone made (L-6).

**Must agree:** the two gates on an icon name must agree about what is renderable. `readPersonalization` loops `ENTITY_ICON_KINDS`, so widening the union *is* the coercer change and no separate edit exists — but the override and an entity's own icon are gated differently: a nexus default naming an uncurated glyph is rejected and falls to the seed, while an entity's own icon is not gated the same way. One test pins that asymmetry through the real write-and-read round trip, since a test between two consumers of one constant would pass by construction.

**Failure half:** `defaultIcons` absent entirely → seeds; `defaultIcons.context` naming a glyph the registry doesn't hold → seeds rather than rendering a blank; a Context minted before this change, carrying the stored literal → keeps it, since an own icon outranks a seed and that is the ruled behavior.

**Steps:**
- [ ] Re-run the Derivation; confirm 13 and the six Context sites. A divergence rewrites this task.
- [ ] Widen `ENTITY_ICON_KINDS`; run typecheck — expect errors at `DEFAULT_ENTITY_ICONS` naming the missing member.
- [ ] Add the `context` seed; change `space` to `layout-dashboard`. Re-run typecheck — expect clean.
- [ ] Convert the six Context sites to `entityIcon('context', …)`.
- [ ] Stop the two mint sites stamping the literal.
- [ ] Write the override round-trip test (see Must agree).
- [ ] Update `contextIdentity.test.ts` to the new seed.
- [ ] Full gate — expect green.
- [ ] Commit: `feat(symbols): a Context wears its own mark, and a Space takes the dashboard`

#### Gate 1 — the ground is clear and the kinds are distinct
- [ ] Gate commands green, exit codes read directly.
- [ ] Derivation re-run against its control; counts matched or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to the touched paths.
- [ ] Every concern fixed or carrying an explicit ruling in the Log.
- [ ] **Seen running:** the sidebar's Context groups, the Contexts ribbon tab, a Context chip in a table, and a Space row all draw the intended mark and no two kinds share one.
- [ ] Progress hashes filled in.

---

### Phase 2 — Main: enumerate, empty, relocate

#### Task 4: Widen `listBundles` and expose it on a new enveloped channel

**Requirements:** 1

**Why:** The listing is the trash browser's read side and has been waiting for this surface — it is implemented, tested, and self-documented as parked. It cannot be used as-is: it computes each bundle's artifact to decide whether the deletion finished and then discards it, while the artifact's name is the row's only source of a title. Widening the return keeps one enumeration answering both questions. → C-1, C-8, K-5.

**Files:**
- Modify: `src/main/provenance.ts` — `ListedBundle` gains the artifact's basename; `listBundles` stops discarding it; the parked comment goes.
- Modify: `src/shared/bridge.ts` — one `Asks` entry.
- Modify: `src/preload/index.ts` — one dialer.
- Modify: `src/main/index.ts` — one `serveBridge` registration, `kind: 'envelope'`.
- Test: `src/main/provenance.test.ts` — extend `describe('listBundles — what the trash offers')`.

**Interfaces**
- Produces: `ListedBundle { bundlePath, record, artifactName }`; a channel returning `Result<TrashRow[]>`.
- Assumed by: Task 5 (shapes rows), Task 11 (renders them).

**Failure half:** `.trash` absent entirely → empty array, not a throw; a bundle whose record won't validate → skipped, already the behavior; a bundle with a record and no artifact → skipped, already the behavior; no nexus open → the session refusal.

**Steps:**
- [ ] Extend the listing test for the widened shape — expect red.
- [ ] Widen `ListedBundle` and stop discarding the artifact; re-run — expect green.
- [ ] Add the bridge entry, the dialer, the registration.
- [ ] Delete the parked comment; it is now false.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): the trash's contents reach the renderer`

#### Task 5: Shape a bundle into a row

**Requirements:** 1

**Why:** The renderer must never reason about `.deleted` suffixes, stamp encoding, or the six-way record union — so main owns the parse. **The shaper is also where the property kind is excluded.** `listBundles` admits a property bundle deliberately, waiving the artifact requirement that filters every other incomplete deletion, because that bundle is complete — it holds a record and nothing else by design. Left unfiltered it becomes a row with no title, no breadcrumb and no date, which Delete All would then destroy unread. The filter is the record's own discriminator, never the absence of an artifact. The row carries its kind and whether its home still resolves because the menu is built *before* any restore is attempted and cannot learn either by trying; this is the one place both answers are free, since the record and the tree are already in hand. Breadcrumbs resolve from the recorded parent id against the live tree, never from the frozen `.trash` chain, so a renamed ancestor reads true. → C-2, C-3, C-5, H-21, I-1, I-2, I-3, E-6.

**Files:**
- Create: `src/main/crud/trashRows.ts` — the shaper.
- Modify: `src/main/index.ts` — the channel handler calls it.
- Test: `src/main/crud/trashRows.test.ts`

**Interfaces**
- Produces: `TrashRow { bundlePath, kind, title, crumbs, deletedAt, homeResolves }` in `src/shared/types.ts`.
- Assumed by: Tasks 11, 12, 13, 14.

**Must agree:** `homeResolves` and `resolveRecord` must reach the same verdict. The row says a home resolves exactly when the resolver would not refuse with `parent-gone`, `unaddressable` or `cannot-hold` — one test restores a row the shaper called resolvable and asserts it lands without a picker, and one asserts the converse.

**Failure half:** **a `property` record → no row at all**; a record with no id → row still shapes, breadcrumb falls back to the frozen chain; a parent id resolving to nothing → `homeResolves` false, historical breadcrumb; a `context` record, which carries no parent at all → always resolvable; a stamp that won't parse → the row still lists, with no date rather than no row.

**Steps:**
- [ ] Write the shaper's tests: each of the five artifact-bearing kinds, **a property record that must not become a row**, a renamed ancestor, a missing parent, an id-less record, an unparseable stamp — expect red.
- [ ] Implement; sort newest-first. Re-run — expect green.
- [ ] Wire the handler to it; gate — expect green.
- [ ] Commit: `feat(trash): a bundle becomes a row that knows where it came from`

#### Task 6: Read the delete switch main-side

**Requirements:** 9

**Why:** A renderer-supplied flag choosing between *recoverable* and *gone forever* is the most dangerous message this feature could send, so main reads it itself. The write path has no route to personalization today — it reads app config and never the nexus settings — and the precedent for a targeted single-key read that avoids a full walk already exists. Per-operation freshness comes free from where the dependencies are built. → D-9, D-11, D-12, D-16.

**Files:**
- Modify: `src/shared/types.ts` — `Personalization` gains the boolean.
- Modify: `src/main/readNexus.ts` — `readPersonalization` gains its line, or the key is invisible forever.
- Create or modify: `src/main/settings.ts` — a targeted single-key read, sibling to the existing one.
- Modify: `src/main/mutate.ts` — `MutateDeps` gains the flag.
- Modify: `src/main/index.ts` — `mutateDeps()` reads it per call.
- Test: `src/main/settings.test.ts` and the personalization round-trip.

**Interfaces**
- Produces: `MutateDeps.permanentDelete: boolean`.
- Assumed by: Task 7.

**Failure half:** `settings.json` absent → false; the key absent → false; a non-boolean value → false, never truthy-coerced, since the unsafe direction must never be reached by accident.

**Negative control:** a test asserts the switch OFF sends the artifact to the system trash via the injected dependency, and the same test with it ON asserts the dependency is **not** called. One that passes either way proves nothing.

**Steps:**
- [ ] Add the key to the type and to the coercer; write the round-trip test — expect red, then green.
- [ ] Add the targeted read; fold it into `mutateDeps()`.
- [ ] Gate — expect green.
- [ ] Commit: `feat(settings): the delete switch main-side, read per operation`

#### Task 7: The empty op

**Requirements:** 2

**Why:** Emptying cannot reuse `delete` — the write path's reserved guard refuses every path under `.trash`, and that guard is deliberate defense against a hostile or buggy message. The one op that must reach in makes its own assertion, and path plus root plus suffix is not enough: `.trash` mirrors the nexus, so a user's own folder wearing the bundle suffix passes all three while holding real bundles inside it. A bundle is a folder holding a record. → D-3, D-4, D-15, D-16, J-2, J-4.

**Files:**
- Modify: `src/shared/mutate.ts` — the new `MutateRequest` variant with its disk-effect comment.
- Modify: `src/main/mutate.ts` — the case; the exhaustiveness tail makes it mandatory.
- Test: `src/main/mutate.test.ts`

**Interfaces**
- Produces: `{ op: 'emptyBundle'; bundlePath: string }`.
- Assumed by: Tasks 12, 14.

**Negative control:** both halves. A test proves the op *runs* on a genuine bundle, and a second points it at a chain directory wearing the suffix but holding no record and asserts refusal. Disable the record check and the second must go red.

**Failure half:** a path escaping the root → refused; a path inside the nexus but outside `.trash` → refused; a bundle already spent → refused with wording that names a spent row rather than a missing path (J-3); the system-trash handoff rejecting → a fault Result, bundle intact; the bundle removal failing after the artifact left → litter, never an unreachable file (J-4).

**Steps:**
- [ ] Write the tests including both negative-control halves — expect red.
- [ ] Add the variant; typecheck — expect the exhaustiveness tail to demand the case.
- [ ] Implement: guard, read the record, artifact first per the switch, then remove the bundle. Re-run — expect green.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): emptying a bundle, guarded to bundles alone`

#### Task 8: Restore into a chosen destination

**Requirements:** 3

**Why:** Where a recorded home no longer resolves, refusing is a dead end the user can't act on. Substituting the record's parent and re-running the resolver keeps every placement guarantee coming from the one function that owns them — sibling disambiguation, the `.md` strip-and-restore, a Space's collision-free title, and the live-id refusal that outranks everything. It also redirects what the returning content is reconciled against, which is the ratified behavior: values travel, and the destination's configuration decides what survives. Nothing climbs — a page whose Set is gone is never filed into that Set's Collection. → H-1, H-2, H-3, H-4, H-5, H-6, H-7, H-19, H-20, J-1.

**Files:**
- Modify: `src/shared/mutate.ts` — `restore` gains an optional destination.
- Modify: `src/main/provenance.ts` — `restoreArtifact` threads it into `resolveRecord`.
- Modify: `src/main/mutate.ts` — the `restore` case passes it through.
- Test: `src/main/provenance.test.ts`

**Interfaces**
- Produces: `{ op: 'restore'; bundlePath: string; destination?: { kind: 'container' | 'context'; id: string } }`.
- Assumed by: Tasks 12, 13, 14.

**Must agree:** the destination matrix and the write path's existing move admission must reach the same answer about what may hold what. A page or Set lands only in a Collection or a Set; a Space only in a Context. One test crosses both: a destination the move check would refuse must be refused here too.

**Negative control:** a test proves a relocation *lands* on an admitted destination, and a second offers a Space a container id and asserts refusal. Disable the kind check and the second must go red.

**Failure half:** a destination id naming nothing → refused, never falling back to the recorded parent; a destination of the wrong kind → refused; a destination supplied for a kind that can't be homeless → refused rather than silently ignored; `id-live` still refuses regardless of destination.

**Steps:**
- [ ] Write the tests: page → Collection, page → Set, Set → Collection, Space → Context, each refusal, and one crossing the move admission — expect red.
- [ ] Thread the destination through; re-run — expect green.
- [ ] Assert the reconcile behavior explicitly, so the ruling is pinned by a test rather than by memory.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): a homeless entity restores where you choose`

#### Task 9: Hoist the destination tree and widen its node

**Requirements:** 3, 7

**Why:** The destination submenu already exists as the card menu's `Move To ▸` — a recursive walk, and a main-side mapper carrying the convention a native menu requires, where a container repeats its own name as its submenu's first row because a parent item cannot itself be clicked. The walk is pure and sits inside a 1400-line view component only because it had exactly one caller. Restore is id-addressed where the move is path-addressed, so the node carries the id the tree already holds rather than main deriving one from a path — that would reintroduce name-addressing at the one seam built to avoid it. → H-8, H-9, H-10, H-11, J-8.

**Files:**
- Create: a module for the walk, out of `src/renderer/src/Detail/Views/Cards/CardsView.tsx`.
- Modify: `src/shared/cardMenu.ts` — `MoveTarget` gains the id.
- Modify: `CardsView.tsx` — imports rather than declares.
- Test: the walk's own test, plus the card menu's existing assertions unchanged.

**Interfaces**
- Produces: the container walk and the flat Context roster, both as the widened node.
- Assumed by: Task 12.

**Survivors:** the card's `Move To ▸` behaves exactly as it does today. The id is an addition and the hoist is a relocation, not a rewrite — if the card menu changes, the change is wrong.

**Steps:**
- [ ] Hoist the walk unchanged; point `CardsView` at it. Gate — expect green and no behavior change.
- [ ] Widen the node with the id; add the Context roster.
- [ ] Gate — expect green.
- [ ] Commit: `refactor(menus): the destination tree leaves the cards view`

#### Gate 2 — the engine is reachable and can be told where
- [ ] Gate commands green, exit codes read directly.
- [ ] Every negative control's disabled-guard half was observed going red.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/main` and `src/shared`.
- [ ] Every concern fixed or carrying an explicit ruling in the Log.
- [ ] No user-visible surface shipped this phase; the running-thing pass defers to Gate 3.
- [ ] Progress hashes filled in.

---

### Phase 3 — The surface

#### Task 10: Rename the window, fix its chrome, and open the leaf registry

**Requirements:** 4, 11

**Why:** "Settings" names two unrelated things — the app-preferences window and the per-view config dropdown whose stylesheet twenty modules import — so the window takes the unambiguous name. The rail reserves a band for a glyph the window never renders, because the pane only draws it when handed the prop and this window never passes it. And every leaf today is a toggle list, enforced by a total record keyed on the category union: Trash is the first leaf with a body, so the entry becomes a union. It holds a component rather than a render thunk, because a thunk's hooks belong to the host and this leaf owns fetched rows and a selection. → A-2, A-3, A-5, B-1, B-4, B-7, B-8, K-4.

**Files:**
- Rename: `Settings/SettingsWindow.tsx` → `NexusSettings.tsx`; `settingsWindow.css` → `nexusSettings.css`.
- Modify: the component, its inner body, the CSS import, and both the import and the mount in `App.tsx`.
- Modify: `WIN` — default 850 × 600, floor raised to fit the surface.
- Modify: `nexusSettings.css` — the rail's phantom `padding-top` removed; the body's kept.
- Modify: the leaf registry's value type — the entry becomes a discriminated union, a toggle list or a component. The category list itself is untouched here.

**Derivation**
- `rg -F "SettingsWindow" Pommora/src` → **5** matching lines at planning time, across two files; with the two filenames that is seven locations. Legitimate hits: none; all convert.
- Control: `rg -F "settingsOpen" Pommora/src` → **6**. Zero means the search never ran.

**Interfaces**
- Produces: the widened category entry.
- Assumed by: Task 11.

**Survivors:** the CSS class namespace, the geometry-stash id and the rail's `windowId` stay — internal strings with no user-facing effect, whose churn would exceed the ambiguity being fixed (A-5). The existing General and Pages leaves keep rendering exactly as they do.

**Steps:**
- [ ] Re-run the Derivation.
- [ ] Rename the files and identifiers; gate — expect green.
- [ ] Move `WIN`; remove the rail's padding.
- [ ] Widen the category entry to a union; both existing leaves keep their toggle form.
- [ ] Gate — expect green.
- [ ] Commit: `refactor(settings): NexusSettings, and a rail that can hold a surface`

#### Task 11: The Trash leaf and its list

**Requirements:** 4, 5

**Why:** The list borrows the navigation row whole — kind glyph, title, breadcrumb — with a fixed date lane after it, because that row already solves truncation, overflow and hover in the house's idiom. The heading names both columns and implies nothing it can't do: the house heading has never sorted. **The single most likely way this ships broken is token scope** — the table's tunables are scoped to the table's own surface and the nav row's inset to the two nav windows, and an unset custom property with no fallback resolves to its initial value in silence. → A-1, A-4, B-5, B-6, E-1, E-2, E-3, E-4, E-5, E-6, E-7, E-8, E-9, E-10, E-11, E-12, E-13, E-14, E-15, E-16, E-17, E-18, E-19, E-20, J-6, J-7, J-9, C-4, C-6.

**Files:**
- Create: the leaf component and its stylesheet.
- Modify: the category list — the Trash entry; and the rail's render, which today is a flat map with no divider and no anchoring concept and gains both.
- Modify: `src/renderer/src/design-system/symbols/index.tsx` — `clock-fading` joins the roster.
- Modify: the view-embed's two shed heading rules become a modifier both consumers wear, or the leaf restates them (E-16 — decide at implementation and record which).

**Interfaces**
- Consumes: the row channel from Task 4, the row shape from Task 5.
- Assumed by: Tasks 12, 13, 14.

**Failure half:** an empty trash → "Trash is empty."; a row whose breadcrumb resolves to nothing → the historical chain; a fetch that fails → the leaf says so rather than rendering an empty list that reads as an empty trash; **a deletion performed elsewhere while the leaf is open** → the list does not update, since nothing pushes and the leaf only refetches after its own actions. Reopening the leaf recovers it, and that is the accepted behavior rather than an oversight.

**Steps:**
- [ ] Add `clock-fading` to the roster.
- [ ] Build the leaf: fetch on open, rows, headings, the date lane, the empty state.
- [ ] Declare every borrowed token scope on the leaf's root. **Enumerate every custom property the borrowed selectors read and assert each resolves to its intended value — not merely to a value.** A non-zero check passes on the exact damage predicted: an inherited black label is non-zero, and one of the nav inset's two existing declarations is legitimately `0`. The headless-CSS harness that found this renders the same subtree inside and outside the scoping class and diffs them.
- [ ] Keep the leaf's class out of the window's drag surfaces.
- [ ] Claim Escape for the search field when it holds a query.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): the Trash leaf and the list it holds`

#### Task 12: Selection, the menu, and the destination submenu

**Requirements:** 6, 7

**Why:** There is no multi-select anywhere in the app to inherit, so the selection is local to the leaf and dies with it. The menu is a returning one — main pops, the renderer writes — because an owning menu would leave the leaf unable to refresh its own list, and it pops through the primitive that admits nesting rather than the flat model helper, which structurally cannot express a submenu. → F-1, F-2, F-3, F-4, F-5, F-6, G-1, G-2, G-3, G-4, J-5, H-8, H-11.

**Files:**
- Create: the shared menu model, the main-side popper, the bridge entry, the preload dialer, the `serveBridge` registration.
- Modify: the leaf — checkboxes, select-all, local selection, the right-click handler.
- Modify: MarkdownPM's checkbox — an indeterminate state, a glyph swap on the centred mark.

**Interfaces**
- Produces: the menu's action union, including a destination pick.
- Assumed by: Tasks 13, 14.

**Failure half:** a right-click on an unchecked row with others checked → acts on that row alone; a destination submenu with no admissible destinations → the row renders disabled rather than vanishing; a select-all over an empty list → inert.

**Steps:**
- [ ] Add the indeterminate state to the checkbox; test all three states.
- [ ] Build the model, popper, channel, dialer, registration.
- [ ] Wire selection, select-all, row-click-toggles, and the right-click.
- [ ] Build the destination submenu from Task 9's tree, gated on the row's `homeResolves`.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): choosing rows, and the menu that acts on them`

#### Task 13: Restore, single and batch

**Requirements:** 3, 8

**Why:** A single restore rides the store's mutate so its refetch makes the entity reachable without a nexus reload and its failure already reaches the user. A batch cannot: that action refetches the whole tree into the renderer after every op, so five restores would pay five whole-tree refreshes. The batch calls the channel directly and refreshes once. **What this does not save is the main-side walk** — the resolver's contract is a placement against the *current* tree, so `restoreArtifact` reads it per call by necessity; collapsing those into one read would be a batch op resolving N records against one tree, which is a successor rather than this task. → D-1, D-2, D-7, H-12, H-13, H-14, H-15, H-16, H-17, H-18, H-20.

**Files:**
- Modify: the leaf — the restore handlers and the result report.
- Modify: `src/shared/mutate.ts` — delete the "no renderer caller by design" comment; it is now false.

**Failure half:** a batch where every member is homeless → reports restoring none, which is honest; a partial batch → counts both halves; a refusal surviving the picker → a native dialog; a stale row whose bundle is spent → the spent-row wording, not "path not found".

**Steps:**
- [ ] Single restore through the store; confirm the row leaves and the entity is reachable without a reload and does not open.
- [ ] Batch through the channel, one refresh at the end, counts collected.
- [ ] The report: the kind's plural when uniform, "items" when mixed.
- [ ] Delete the false comment.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): putting things back, one at a time or many`

#### Task 14: Emptying, its switch, and its confirms

**Requirements:** 2, 9

**Why:** The action reads "Delete" because it is true in both of the switch's positions — the item leaves the trash either way — and *permanently* belongs to the switch that decides what leaving means. The ordinary delete's confirm cannot be reused: it is a closure inside the sidebar's menu builder that hardcodes one title, runs the delete itself, and promises a destination from the old trash mode, which is wrong in both new positions. A batch gets its own confirm, because confirming a single-item question and losing five things is the failure to prevent. → D-5, D-6, D-8, D-9, D-13, D-14, D-17, G-4.

**Files:**
- Modify: the leaf — the delete handlers, the confirms, the report.
- Modify: the settings registry — the **Permanently Delete Files** row in the General leaf.

**Failure half:** a single delete refused → a dialog; a batch where some fail → counts both halves; the switch flipped between opening the confirm and answering it → main reads it at the operation, so the confirm's wording can disagree with the outcome by a hair. Acceptable and stated.

**Steps:**
- [ ] Add the toggle row with its hint copy verbatim.
- [ ] Single delete: confirm whose explanatory line reads the switch, then the op, then the row leaves.
- [ ] Batch delete: its own confirm naming a count, then the ops, then the report.
- [ ] Gate — expect green.
- [ ] Commit: `feat(trash): letting go, and the switch that says what that means`

#### Gate 3 — the surface works
- [ ] Gate commands green, lint at zero diagnostics of any severity.
- [ ] Derivations re-run against their controls.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD`; `comment-killer-agent` on the diff.
- [ ] Every concern fixed or carrying an explicit ruling in the Log.
- [ ] The hazard window opened at Task 3 is closed.
- [ ] **Seen running:** the acceptance scenario, end to end, against a real nexus. Plus the three converted search fields, side by side with their previous appearance.
- [ ] Progress hashes filled in.

---

### Phase 4 — Reconciliation

#### Task 15: Rewrite what this made false

**Requirements:** all

**Why:** Each document below asserts something this work inverts, and the commit that falsifies a claim is the only moment anyone knows it went false. NexusRecordPM owns the trash browser, because the surface is the record model's reading half; Configuration keeps only the rail and the switch and points at NexusRecord for what the leaf does. → K-1 … K-7.

**Files:** the eight rows of **Made False**, plus `HistoryPM.md` for the record and `ContextPM.md` for the backlog.

**Steps:**
- [ ] Rewrite each claim in the Made False table.
- [ ] Write NexusRecordPM's trash-browser section; narrow its Pending to the compare view.
- [ ] Route the move-path property discrepancy from the log's Found And Reported into ContextPM.
- [ ] Run the Dead Vocabulary sweep against its control.
- [ ] Commit: `docs: the trash browser, and what it made false`

#### Gate 4 — the record is true
- [ ] Every Made False row rewritten.
- [ ] Dead Vocabulary sweep returns its expected counts, control non-zero.
- [ ] Lessons routed to `.claude/Guidelines/`.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — Clearing the ground · base `<commit>`
  - [ ] Task 1 — The stray lint diagnostic · `<commit>`
  - [ ] Task 2 — Four search inputs become one · `<commit>`
  - [ ] Task 3 — Context and Space glyphs · `<commit>`
- [ ] **Phase 2** — Main: enumerate, empty, relocate · base `<commit>`
  - [ ] Task 4 — Widen `listBundles`, expose the channel · `<commit>`
  - [ ] Task 5 — Shape a bundle into a row · `<commit>`
  - [ ] Task 6 — Read the delete switch main-side · `<commit>`
  - [ ] Task 7 — The empty op · `<commit>`
  - [ ] Task 8 — Restore into a chosen destination · `<commit>`
  - [ ] Task 9 — Hoist the destination tree · `<commit>`
- [ ] **Phase 3** — The surface · base `<commit>`
  - [ ] Task 10 — Rename, chrome, leaf registry · `<commit>`
  - [ ] Task 11 — The Trash leaf and its list · `<commit>`
  - [ ] Task 12 — Selection and the menu · `<commit>`
  - [ ] Task 13 — Restore, single and batch · `<commit>`
  - [ ] Task 14 — Emptying and its switch · `<commit>`
- [ ] **Phase 4** — Reconciliation · base `<commit>`
  - [ ] Task 15 — Rewrite what this made false · `<commit>`

### Rulings

- **Property loss on relocation is intended, not a defect.** A relocated entity is reconciled against the schema it lands in; values travel and whatever the destination cannot hold is dropped. Nathan, this session. This departs from an ordinary move, which preserves values — a move relocates a live entity, a restore reconciles a frozen one.
- **`trashMode` stays stubbed and unsurfaced**, waiting on a NexusSettings session where it and the new switch can be shown as the pair they are. Nathan, this session.
- **The `layout-dashboard` overlap with the Gallery view type is accepted.** Nathan, this session.

### Open Against Later Tasks

- **E-16's two shed heading rules** — whether they become a modifier both consumers wear or the leaf restates them is decided at Task 11 and recorded there. Restating means the app carries one rule twice, which the constraints forbid; the modifier touches the view embed.

### Deviations

### Lessons

- A comment naming what a reservation clears can be wrong about which side of the window it clears.
- "It already exists" and "it is reachable" are different findings — three mechanisms here were complete, tested, and callable by nothing.
- A token scope is invisible when it fails: an unset custom property with no fallback resolves to its initial value with no error and no lint.

### Sequenced After

- **Pruning `.trash`** — nothing is ever removed, so the listing walks a directory that only grows. Accepted for this iteration; it is the surface's ceiling.
- **Previewing a trashed page's body** before deciding. The row keeps its bundle path addressable so this isn't foreclosed.
- **Sorting the list.** The rows stay an array the leaf owns rather than a pre-sorted payload.
- **Deleted properties** — the sixth record kind, with no title, path or breadcrumb, whose restore rebuilds a definition rather than moving a file.
- **The move path's property reconcile** — the project's rules now say a moved page drops conflicting values; the restore path does this and the move path does not.

### Closeout
