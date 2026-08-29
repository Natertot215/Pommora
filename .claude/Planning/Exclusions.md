## Exclusions — Implementation Plan

> **Status:** written, pending review · Spec: this session's design pass · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A user can exclude folders from Pommora without hand-editing `settings.json`, and can strip what Pommora already wrote into a folder it no longer manages. Settings > Files & Links gains an Exclusions section: an Excluded Directories row carrying the folder count and a Manage button that opens a pane of editable path fields, and a Clear Exclusion Cache row that removes Pommora's bookkeeping from every excluded folder behind a native confirmation.

The shape is dictated by what already exists. `excluded_folders` is a live setting with a complete matching engine (`src/main/exclusion.ts`) already honored by the read walk, the corpus walk, the adoption pass, the content index and the watcher — so no exclusion mechanism is designed, only a writer, a validator and a surface. Every fixture mirrors an existing one: the row copies `AssetDirectoryRow`, the channels copy `assets:setDir` / `assets:chooseDir`, the pane's field rows copy `FilterFrame`'s rule list, the confirmation copies `trash:confirmEmpty`, and the strip copies `deleteProperty`'s governed sweep. The alternative considered and rejected was a per-folder exclusion marker on disk (a dotfile or sidecar key), which would have added a fourth skip predicate to a codebase that deliberately funnels three through one `WatchScope`.

Clear unwraps rather than deletes by default. `<Status>: Doing` becomes `Status: Doing` and `(Projects): [Alpha]` becomes `Projects: [Alpha]`, because a folder leaving Pommora should land in the plain-YAML shape an Obsidian vault already reads, and because unwrapping satisfies Reasonable Legibility better than either leaving the sigils or destroying the values. A `Preserve Properties On Clear` toggle carries the delete-outright behavior for users who want the folder genuinely scrubbed.

Not solved here: globbing or negation in exclusion patterns, per-folder Clear, an undo for Clear, and any exclusion surface outside the Settings window.

**Requirements**

1. An **Excluded Directories** row in a new **Exclusions** section of Files & Links, showing the number of excluded folders and a **Manage** button.
2. The Manage pane: one editable path field per exclusion with a browse action and a remove `×`, an **Add Exclusion** button below the last field, min and max width knobs, field rows inset by `--surface-inset`, and dismissal on Escape or a re-click of Manage only — never on an outside click, a path commit, or a returning folder dialog.
3. Exclusions persist to `excluded_folders` in `.nexus/settings.json`. Adding one removes the folder from the tree and the index without a restart; removing one re-indexes it.
4. A typed path and a browsed path cross the same validator, which is also the refusal a hand-edited `settings.json` meets.
5. A **Clear Exclusion Cache** row with a destructive button behind a native confirmation that, across every excluded folder, deletes **container** sidecars — `_pagecollection.json` and `_pageset.json` only — and Pommora's own frontmatter bookkeeping. Pages the sweep cannot admit are left byte-identical and reported, never silently skipped.
6. A **Preserve Properties On Clear** toggle, default on: governed `<Property>` and `(Context)` keys are unwrapped to bare keys rather than deleted.
7. The documentation claiming exclusions are hand-edited only is rewritten in the commits that falsify it.

**Acceptance — the whole thing working**

With the app running and a folder of pages visible in the sidebar: open Settings > Files & Links > Exclusions, press Manage, browse to that folder, and the folder and its pages leave the sidebar with no restart while the row's count reads `1`; press the field's `×` and they return. Then, with Preserve Properties on, press Clear and confirm — the folder's `_pagecollection.json` is gone, its pages hold no `PageID`, and a page that had `<Status>: Doing` now reads `Status: Doing` with its surrounding comments and key order intact. The pane stayed open throughout, closing only on Escape or a second press of Manage.

**Forced By**

- An in-app settings write is echo-suppressed by `recordWrite`, so the watcher's `sameScope` structural check never fires (`src/main/index.ts` `assets:setDir`, its comment states this) → the set handler must run `confirmSettingsWrite` → `refreshAfterWrite` → `seedContentIndex` → `startWatcher` by hand. **Task 3.**
- `corpusFilesUnder` and `shouldSkipDir` both prune exactly the folders Clear targets, and `listFilesRecursive` has no skip logic at all → Clear needs its own enumerator that deliberately enters an excluded folder. **Task 6.**
- `readNexus.ts` reads the list through `asStringArray`, which is all-or-nothing: one non-string element discards the entire exclusion list → a UI that writes this key must first make the read per-element, as `ribbonOrder` and `favoriteIcons` already are. **Task 1.**
- `sweepGovernedRoots` already carries a `rewriteText` option whose doc comment describes key renaming as its reason for existing → the unwrap needs no new sweep machinery. **Task 6.**
- `PickerMenu` gates BOTH its Escape handler and its click-catching backdrop on the same `onDismiss` prop (`picker-base.tsx:255-263` and `:355-364`) → Escape-without-outside-click is not reachable through the current API, so Requirement 2 costs a design-system change: a `dismissOnOutside` prop that gates the backdrop alone, borrowing `MenuDropdown`'s existing name for the same behavior. **Task 4.**
- `SIDECARS` (`src/main/paths.ts`) holds five filenames, two of which are the Agenda singletons' configs, and an unlinked `_taskconfig.json` has no repair path — `reHomeRegistered` needs a sidecar id to match and `seedAgendaSingletons` never retro-seeds → Clear deletes a container-only set, never `SIDECARS`. **Task 6.**
- `sweepGovernedRoots` refuses a file `sweepAdmits` rejects before `rewriteText` is consulted (`governedSweep.ts:121-125`), and `sweepAdmits` asks `admitContentFile(fm, 'page')` → a Task or Event page in an excluded folder reads `contradicting` and is refused, so Clear cannot strip it → the refused count is reported rather than the gap being hidden. **Tasks 6, 7.**
- `renameFrontmatterKey`'s `KeyCollision` is `'prefer-new' | 'merge'` only, and `foldValues` returns early unless both values are sequences while the caller drops the rival unconditionally (`pageFile.ts:118-137`) → every collision between a governed key and an existing bare key of the same name loses one real value, so the unwrap refuses those keys rather than choosing a casualty. **Task 6.**
- `MenuDropdown`'s trigger is hardwired to a `Segmented` glass button → it cannot wear a settings-row button, so the pane is a `PickerMenu` anchored to a `triggerRef`. **Task 4.**
- `resolveFolderKind` returns `'collection'` for a root folder only when `_pagecollection.json` exists (`sidecarMode` is true for any nexus whose `nexus.json` carries an id) → deleting a top-level sidecar makes that Collection invisible until the next nexus open re-stamps it. **Task 7**, in the confirm copy.
- A `.md` with no identity key is admitted and wears a path-derived synthetic id (`readPageRecord`) → cleared pages reappear immediately on un-exclusion rather than vanishing. **Task 7**, in the confirm copy.
- `PageID` is a durable pointer — surface tiles store `page_id`, and `nexus.db` keys folds, aliases, per-page zoom and citations by it → Clear orphans that state. **Task 7**, in the confirm copy.

**Inherited Reasoning**

- Exclusion by prefix match on normalized segments, root-anchored, no globbing, is settled and pinned by `src/main/exclusion.test.ts`. A pattern language is not in scope.
- The asset root is a separate skip axis that outranks exclusion and stays watched. Clear is the one exception, and it is an explicit one: a nexus may legitimately name its asset root in `excluded_folders` (`watchPatch.test.ts:295` pins that configuration, and the live nexus uses it), so `excludedArtifacts` takes the asset directory and steps around it rather than inheriting the exclusion list's reach.
- Destructive confirmation is native (`dialog.showMessageBox`) throughout this codebase. A React confirmation surface was considered and rejected — building the first one for this feature would be a parallel mechanism.
- Counting *files* under exclusion was considered and rejected by the user in favor of counting folders: the file count needs a recursive walk of arbitrarily large folders and cannot come from the index, which has already forgotten excluded paths.

**Grounding** *(re-open these; don't cite them)*

- `src/main/exclusion.ts` — `WatchScope`, `shouldSkipDir`, `excludedMatcher`, `sameScope`. The engine this feature drives.
- `src/main/index.ts` `assets:setDir` / `assets:chooseDir` — the write and picker handlers this copies, including the manual re-arm chain and its rationale.
- `src/main/settings.ts` — `updateSettings`, `writeAssetDirectory`. Where the new writer lives.
- `src/main/readNexus.ts` — `assetDirRefusal`, `readAssetDirectoryLeaf`, `readSettingsLeaves`. Where the refusal and the hardened read live.
- `src/main/CRUD/governedSweep.ts` — `sweepGovernedRoots`, `SweepScope`, `SweepOptions.rewriteText`. The strip machinery.
- `src/main/IO/pageFile.ts` — `mergeFrontmatter`, `renameFrontmatterKey`. Delete-by-omission and in-place rename.
- `src/renderer/Settings/AssetDirectoryRow.tsx` + `SettingsWindow.tsx` — the row template and the `FRAMES` registry.
- `src/renderer/DesignSystem/Pickers/picker-base.tsx` — `PickerMenu`'s props, its Escape-only dismissal, and `bareSurface`.
- `src/renderer/Frames/FilterFrame.tsx` + `filterFrame.css.ts` — `ruleList` / `ruleRow` / `removeButton`, the repeatable-field-list precedent.
- `.claude/Guidelines/Development-Environment.md` — the gate discipline.

**Environment**

- **Plan directory:** `.claude/Planning`. **Spec input:** this session's design pass, ratified by the user across two rounds of questions.
- **Explorer:** `Explore`. **Code reviewer:** `feature-dev:code-reviewer`. **Attack reviewer:** `build-breaking-agent`. **Neutral verifier:** `general-purpose`. **Simplification:** `code-simplifier`, then `comment-killer-agent`.
- **Rules directory:** `.claude/Guidelines` (four files; `Development-Environment.md` is the load-bearing one here). No research agent needed — nothing external.

**Shapes:** additive · user-visible · migration (Clear rewrites user files in place, irreversibly)

**Declared Stops**

- **Phase 1** — the Manage pane is the feature's whole interaction surface: its width, inset, field behavior and dismissal are the user's to redirect, and finding them wrong after Phase 2 means reworking a pane the Clear row already sits beside.
- **Phase 2** — Clear rewrites real files with no undo. The confirmation copy and the unwrap result both need eyes on a real folder before this is called done.

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read directly and never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`. A piped exit code has masked a red suite here before — `set -o pipefail` or read the summary line.
- Biome is the formatter and a PostToolUse hook formats every TS/CSS/JSON write. Never hand-align. An `Edit` failing on whitespace means Biome reformatted — re-read and retry.
- Comments only where the why cannot be inferred. Near-zero volume; zero in tests. Never state a feature's current status.
- New files in `src/main` follow their neighbors' camelCase (`assetDirValidate.ts`); new renderer files are PascalCase (`AssetDirectoryRow.tsx`).
- Stage explicit file paths, never a directory. Unattributed edits to documentation or styling belong to the user — fold them into the commit at hand, never revert them.
- IPC never throws across the boundary: every new data channel returns the shared `Result` envelope and is declared once in `src/shared/bridge.ts`.
- An emptied value deletes its key rather than storing a blank or an empty array.
- Out of scope everywhere: glob or negation patterns, per-folder Clear, undo for Clear, any exclusion surface outside the Settings window, and any change to `exclusion.ts`'s matching rule.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ConfigurationPM.md:179` | "`excluded_folders`, the anchored Nexus-relative paths … (hand-edited)" | The Manage pane writes them. | 4 |
| `ConfigurationPM.md:189` | "**Knobs without a row** — default icons, the placement keys, and excluded folders are hand-set in `settings.json`" | Excluded folders have a row. | 4 |
| `ArchitecturePM.md:231` | "**Folder-exclusion editing UI** — `excluded_folders` is hand-edited; its Settings surface is deferred." | The surface ships. | 4 |
| `ArchitecturePM.md:93` | §II Folder Exclusion describes exclusion as total and read-only | Clear reaches into excluded folders deliberately; the section owes that exception. | 6 |
| `ConfigurationPM.md` §Personalization | The roster of personalization keys | `preservePropertiesOnClear` joins it. | 5 |
| `DesignSystemPM.md` Components | The `destructive` Button variant has no consumer | The Clear row is its first. | 7 |
| `DesignSystemPM.md` / `InteractionPM.md` | `PickerMenu`'s dismissal, wherever it is described as outside-click-and-Escape | `dismissOnOutside` makes the backdrop optional. | 4 |

**Dead Vocabulary**

- `hand-edited` / `hand-set` as applied to exclusions → expect 0 across `.claude/Features`. Legitimate hits: `commands` and the placement keys, which stay hand-set.
- Control: `asset_directory` across `.claude/Features` → 1. Chosen because no task in this plan moves it; `excluded_folders` (3 hits today) is edited by Tasks 4 and 6 and so cannot serve as its own control. Zero here means the sweep never ran.

**Hazard Window**

Task 6 lands `clearExclusionData` before Task 7 gives it a confirmation dialog. What makes it unreachable meanwhile is the absence of a bridge entry — a main-process function with no channel has no caller surface — so the check is on `src/shared/bridge.ts`, not on a symbol count that cannot go red. While the window is open, `exclusions:clear` must not be declared. Task 7 declares it and its dialog in the same commit; the two may not be split.

---

### Phase 1 — Exclusions can be set from the app

#### Task 1: One refusal for an exclusion path, and a read that survives a bad element

**Requirement:** 3, 4

**Why:** Requirement 4 needs a single rule that a typed path, a browsed path and a hand-edited file all meet, and the reader is where this codebase puts that rule (`assetDirRefusal` is the precedent). The all-or-nothing read is a live defect that a writing UI turns from theoretical into routine: one malformed entry would silently un-exclude every folder at once.

**Now** — `rg -F "excluded_folders" src` → 18. Control: `rg -F "excludedMatcher" src` → 13.

```ts
// src/main/readNexus.ts — inside readSettingsLeaves
excluded: asStringArray(settings.excluded_folders) ?? [],
// asStringArray (src/main/coerce.ts) returns undefined unless EVERY element is a string

// src/main/readNexus.ts — the shape to mirror, immediately above
export function assetDirRefusal(raw: string): string | null
```

**Becomes** — a sibling refusal, and a per-element read:

```ts
// src/main/readNexus.ts
/** Why an exclusion path cannot be written as one, or null. The same refusal the dialog, the
 *  typed field and a hand-edited settings.json all meet. */
export function excludedFolderRefusal(raw: string): string | null
// empty / leading '/' / contains '\' / a '.' or '..' segment → refused
// first segment is .nexus or .trash → refused ("that folder belongs to the app")
// a folder that holds pages is ACCEPTED — unlike the asset root, that is the point

// inside readSettingsLeaves — one bad element drops itself, not the list
excluded: readExcludedLeaf(settings.excluded_folders),
// non-array → [] · each element trimmed, refused ones dropped, survivors as rootSegs().join('/')
```

**Assumed by:** Task 2 (writes what this accepts), Task 3 (returns this refusal's message as the channel's error).

**Verify — automated**

- [ ] Red first in `src/main/readNexus.test.ts` — refusal of empty, absolute, backslash, `..`, `.nexus`; acceptance of a nested path and of a folder holding pages; a list of `['Archive', 42, 'Vault A']` reading as `['Archive', 'Vault A']`. Expect 3 failures, `excludedFolderRefusal` not exported.
- [ ] Disable the per-element filter and the mixed-list case goes red — a filter that passes either way proves nothing.
- [ ] `src/main/exclusion.test.ts` unmoved: the matcher's own rules are untouched by this task.
- [ ] Full gate green, exit codes read directly.

**Verify — user**

- [ ] *(none — no surface ships here.)*

#### Task 2: The settings writer

**Requirement:** 3

**Why:** `excluded_folders` is the one scope key with no writer. Task 3's handler needs somewhere to write that preserves the foreign keys `settings.json` promises to keep.

**Now** — `rg -F "writeAssetDirectory" src` → 3 (definition, handler, test). The one root-level settings writer:

```ts
// src/main/settings.ts
export function writeAssetDirectory(root: string, dir: string): Promise<void> {
  return updateSettings(root, ({ asset_directory: _drop, ...rest }) =>
    dir ? { ...rest, asset_directory: dir } : rest,
  )
}
```

**Becomes** — its sibling, same delete-on-empty contract:

```ts
// src/main/settings.ts
/** The user's excluded folders. An emptied list deletes the key rather than storing `[]` —
 *  absent is what "nothing excluded" means, and the reader answers it either way. */
export function writeExcludedFolders(root: string, folders: string[]): Promise<void>
// [] → the key is removed · otherwise the list is stored as given (Task 3 validated it)
```

**Assumed by:** Task 3.

**Verify — automated**

- [ ] Red first in `src/main/settings.test.ts` — writing two folders then reading them back; writing `[]` removing the key entirely; a foreign top-level key and a sibling `personalization` block surviving both. Expect 3 failures.
- [ ] The empty-list case goes red if the writer stores `[]` instead of deleting — assert the key's absence, never its emptiness.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 3: The set and choose channels

**Requirement:** 3, 4

**Why:** The pane needs a way to commit a list and a way to open a folder dialog, and the app's own write cannot rely on the watcher to notice — the re-index and re-arm this requirement promises have to be performed by the handler.

**Now** — the pair to copy, and the trap stated in its own comment:

```ts
// src/shared/bridge.ts
'assets:chooseDir': { args: [scope?: 'nexus' | 'property', at?: string]; reply: Result<string | null> }
'assets:setDir': { args: [dir: string]; reply: Result<string> }

// src/preload/index.ts
chooseAssetDir: ask('assets:chooseDir'),
setAssetDir: ask('assets:setDir'),

// src/main/index.ts — 'assets:setDir' tail, the chain an in-app scope write owes
await confirmSettingsWrite()
const tree = await refreshAfterWrite(root)
await seedContentIndex(root)
// ... push('nexus:changed', tree); await startWatcher(root, mainWindow)

// src/renderer/Store/CacheSlice.ts
setAssetDirectory: async (dir) => { await window.nexus.setAssetDir(dir) },
```

**Becomes** — two channels, two dialers, one store action:

```ts
// src/shared/bridge.ts
// The whole list crosses at once: the pane edits a list, so add and remove are the same write
// and no ordering question exists between two half-applied edits.
'exclusions:set': { args: [folders: string[]]; reply: Result<string[]> }
// A folder picked from the native dialog, validated by the same refusal a typed path meets.
// `null` is a cancelled dialog, not a failure.
'exclusions:choose': { args: []; reply: Result<string | null> }

// src/preload/index.ts
setExclusions: ask('exclusions:set'),
chooseExclusion: ask('exclusions:choose'),

// src/main/index.ts
'exclusions:set': { kind: 'envelope', ... }
// non-array → fail · each entry trimmed through excludedFolderRefusal, first refusal returned
// duplicates collapse on the CASE-FOLDED form the matcher compares (normalizeSeg), storing the
//   spelling the user gave — the volume is case-insensitive, so `archive` and `Archive` are one
//   folder and storing both would double every count and every enumeration
// then writeExcludedFolders, then the manual chain:
// confirmSettingsWrite → refreshAfterWrite → seedContentIndex → push nexus:changed → startWatcher
'exclusions:choose': { kind: 'window', ... }
// showOpenDialog({ properties: ['openDirectory'], defaultPath: root,
//                  message: 'Choose a folder to exclude' })
// cancelled → ok(null) · outside the root → the refusal's message

// src/renderer/Store/CacheSlice.ts — the tree leaf is what the pane reads, and main patches it
// on the write's own confirm, so a refusal needs no local rollback.
setExclusions: (folders: string[]) => Promise<Result<string[]>>
```

**Assumed by:** Task 4 (calls both), Task 7 (reads `tree.excluded` for Clear's scope).

**Verify — automated**

- [ ] Red first in `src/main/index.test.ts` or the nearest handler suite — a valid list writing and echoing back; a refused entry failing without writing; duplicates collapsing; `[]` clearing the key.
- [ ] A crossing test: a folder set through `exclusions:set` is skipped by `shouldSkipDir` under the scope `readWatchScope` then returns. The channel and the matcher must agree about the same string; two normalizations that disagree is a defect no single-mechanism test can see.
- [ ] The re-arm chain: after a set, `seedContentIndex` has run and the index holds no row under the excluded prefix. Remove `seedContentIndex` from the handler and this goes red.
- [ ] `npm run typecheck` — a channel declared with no handler is a compile error, which is the registration test.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none — no surface until Task 4.)*

#### Task 4: The Excluded Directories row and the Manage pane

**Requirement:** 1, 2, 7

**Why:** This is the feature's whole interaction surface and the reason the three tasks before it exist. It is also the phase's declared stop: its geometry and dismissal behavior are the user's to redirect.

**Now** — the row template, the registry's dispatch, and the repeatable-list precedent:

```tsx
// src/renderer/Settings/AssetDirectoryRow.tsx — the bespoke-row shape, in full
<MenuRowView row={{ kind: 'item', label, caption: hint, trailing: { kind: 'field', children:
  <PathField label={label} value={stored} empty="No folder"
    onCommit={...} onBrowse={...} /> } }} />

// src/renderer/Settings/SettingsWindow.tsx — the Row union (7 kinds) and its exhaustive switch
| (RowText & { kind: 'path' })          // keyless: writes a top-level settings key
case 'path': return <AssetDirectoryRow label={row.label} hint={row.hint} />

// src/renderer/Frames/filterFrame.css.ts — ruleList / ruleRow / removeButton
// src/renderer/styles.css:5 — --surface-inset: 10px

// src/renderer/DesignSystem/Pickers/picker-base.tsx — ONE prop gates both dismissals:
{onDismiss && !closing ? <div className={s.backdrop} ... onClick={onDismiss} /> : null}  // :355
// and the Escape effect at :255 is gated on `onDismiss` too — so today a pane either
// dismisses on outside click AND Escape, or on neither.

// src/renderer/DesignSystem/Menus/menu-base.tsx — the name already in the vocabulary
dismissOnOutside = true,   // MenuDropdown; false = Esc + re-click only (OutlineMenu uses it)
```

**Becomes** — one design-system prop, a new keyless row kind, a new bespoke component, a new section:

```tsx
// src/renderer/DesignSystem/Pickers/picker-base.tsx — the backdrop alone becomes optional,
// under the name MenuDropdown already uses for exactly this behavior. Escape is untouched.
dismissOnOutside?: boolean   // default true — every existing caller keeps its behavior
{onDismiss && !closing && dismissOnOutside ? <div className={s.backdrop} ... /> : null}

// src/renderer/Settings/ExclusionRows.tsx (new) + exclusions.css.ts (new)
export function ExcludedDirectoriesRow({ label, hint }: RowProps): React.JSX.Element
// trailing: { kind: 'field' } holding the count of tree.excluded and a Manage <Button>.
// Manage toggles `open`; the pane is a self-managed PickerMenu on the button's triggerRef,
// bareSurface, dismissOnOutside={false}, style={{ minWidth: PANE_MIN_W, maxWidth: PANE_MAX_W }}.
// Escape and the Manage button are the only ways out, so a path commit, an Add press and a
// returning folder dialog all leave it open.
const PANE_MIN_W = 260 // KNOB — the pane's floor
const PANE_MAX_W = 420 // KNOB — where a long path stops widening it
// rows: one PathField per entry (browse → chooseExclusion) + a removeButton ×,
// laid out in a column at padding: var(--surface-inset); an "Add Exclusion" button below the
// last field appends a blank row that commits on its first non-empty value.

// src/renderer/Settings/SettingsWindow.tsx
| (RowText & { kind: 'exclusions' })    // keyless, like 'path'
case 'exclusions': return <ExcludedDirectoriesRow label={row.label} hint={row.hint} />
// and, appended to the `files` frame's sections:
{ title: 'Exclusions', rows: [{ kind: 'exclusions', label: 'Excluded Directories',
  hint: 'Excluded folders will not be recognized by the app; removing a folder from exclusion will re-index.' }] }
```

**Assumed by:** Task 7 (adds the Clear row to this same section).

**Verify — automated**

- [ ] Red first in `src/renderer/Settings/ExclusionRows.test.tsx` — the row renders the count from a stubbed `tree.excluded`; Manage toggles the pane; a committed path calls `setExclusions` with the whole list; `×` removes one entry; Add appends a blank row.
- [ ] A dismissal test that is the requirement, driving a real `click` and not a bare `pointerdown` — the backdrop stops pointerdown and dismisses on click, so a pointerdown-only test passes over an unmet requirement. With the pane open: a full click outside leaves it mounted, `Escape` closes it, and a second Manage press closes it. Flip `dismissOnOutside` to `true` and the first assertion goes red.
- [ ] Every existing `PickerMenu` caller still dismisses on an outside click — the new prop defaults to `true`, so the design-system suites are the control. `rg -F "PickerMenu" src/renderer` → re-derive; none may need editing.
- [ ] A blank row added by **Add Exclusion** survives a sibling field's commit. That commit pushes `nexus:changed`, which re-renders the pane from `tree.excluded`; a draft row held only in the tree's shape would vanish under the user's cursor.
- [ ] `npm run typecheck` — the `Row` switch is exhaustive with no `default`, so a missing case is a compile error.
- [ ] Full gate green, `npm run lint` clean (the new `.css.ts` included).
- [ ] Docs: `ConfigurationPM.md:179`, `:189` and `ArchitecturePM.md:231` rewritten in this commit. Sweep `rg -n "hand-edited|hand-set" .claude/Features` and confirm no surviving hit refers to exclusions. Control: `rg -F "excluded_folders" .claude/Features` → 2.

**Verify — user**

- [ ] The pane's width at one short path and at one deeply nested path — does the min/max pair hold, and does a long path scroll rather than widen past the max?
- [ ] The field rows' inset against a `MenuSurface` elsewhere in the app — the same `--surface-inset` should read as the same gutter.
- [ ] Add a real folder by browsing and confirm it and its pages leave the sidebar with no restart; remove it and confirm they return.
- [ ] The pane stays open through a commit, an Add, and a returning folder dialog; closes on Escape and on a second Manage press.

#### Gate 1 — exclusions are writable from the app

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] `rg -F "excluded_folders" src` re-run against its control; count matched or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` dispatched against `<base>..HEAD` scoped to this phase's paths; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] No hazard window opened by this phase.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] **Declared stop.** Execution halts until the user closes this phase's **Verify — user** boxes.

---

### Phase 2 — Clear removes what Pommora wrote

#### Task 5: The Preserve Properties On Clear toggle

**Requirement:** 6, 7

**Why:** Task 6's rewrite branches on this, and it is the cheapest row the codebase has — a personalization key needs no channel, no handler and no store action. Landing it first means Task 6 has a real value to read rather than a hardcoded default to replace.

**Now** — the three edits a boolean setting costs, as `permanentDelete` already demonstrates:

```ts
// src/shared/types.ts — the Personalization interface
permanentDelete?: boolean

// src/main/readNexus.ts — readPersonalization
permanentDelete: bool(p.permanentDelete),

// src/renderer/Settings/SettingsWindow.tsx — a row, no key plumbing
{ kind: 'toggle', key: 'permanentDelete', label: 'Permanently Delete Files', hint: '...' }
```

**Becomes** — the same three, defaulting on:

```ts
// src/shared/types.ts
/** Whether clearing an excluded folder keeps its property and Context values by unwrapping their
 *  keys — `<Status>` becomes `Status` — rather than removing the lines outright. Absent = keeps. */
preservePropertiesOnClear?: boolean

// src/main/readNexus.ts
preservePropertiesOnClear: bool(p.preservePropertiesOnClear),

// src/renderer/Settings/SettingsWindow.tsx — in the Exclusions section, below Clear
{ kind: 'toggle', key: 'preservePropertiesOnClear', defaultOn: true,
  label: 'Preserve Properties On Clear',
  hint: 'Clearing keeps the values a page holds, writing them as ordinary frontmatter instead of removing them.' }
// defaultOn: true means returning to the default writes `undefined`, which JSON omits —
// so main reads absent as preserve: `personalization.preservePropertiesOnClear !== false`.
```

**Assumed by:** Task 6 (branches on it), Task 7 (the handler reads it).

**Verify — automated**

- [ ] Red first: `readPersonalization` round-trips `false`, and an absent key reads as `undefined` rather than `false` — the distinction the `!== false` default depends on.
- [ ] Full gate green; `npm run typecheck` covers the `KeyOf<boolean>` narrowing on the new row.
- [ ] Docs: the `ConfigurationPM.md` personalization roster gains the key in this commit.

**Verify — user**

- [ ] *(carried to Task 7 — the toggle has no observable effect until Clear exists.)*

#### Task 6: The excluded-folder enumerator and the strip

**Requirement:** 5, 6, 7

**Why:** This is the only code in the app that deliberately reads inside an excluded folder, and isolating it in one module is what keeps that exception legible. It also holds the codebase's first sidecar deletion.

**Now** — the three enumerators, none of them usable as-is, and the sweep that is:

```ts
// src/main/IO/walk.ts
corpusFilesUnder(root, absDir, scope)   // prunes via excludedMatcher — prunes our targets
listFilesRecursive(dir)                 // no skip logic at all — would enumerate .git, node_modules

// src/main/exclusion.ts
shouldSkipDir(name, relPath, scope)     // the walk's predicate — also prunes our targets

// src/main/CRUD/governedSweep.ts — the machinery that IS reusable
export async function sweepGovernedRoots<C>(
  root: string, scope: SweepScope, rewrite: Rewrite<C>, opts: SweepOptions = {},
): Promise<SweepResult<C>>          // touched / skipped / refused, kept apart
export interface SweepOptions { stamp?: boolean; rewriteText?: RewriteText }
// rewriteText exists precisely because renaming a key in place needs the file's bytes.

// src/main/IO/pageFile.ts
mergeFrontmatter(content, modeled, modeledKeys, body)  // omission from `modeled` = delete
renameFrontmatterKey(content, oldKey, newKey, collision)  // in place, comments and order kept

// Nothing in src/main deletes a sidecar. This task is the first.
```

**Becomes** — one module holding the exception:

```ts
// src/main/exclusionScan.ts (new)
/** Every page and sidecar beneath the excluded folders — the one enumeration that deliberately
 *  enters what the walk, the corpus and the watcher all prune. Convention skips still apply:
 *  a `.git` or `node_modules` under an excluded folder is not ours to touch. */
export async function excludedArtifacts(
  root: string, excluded: string[], assetDir: string,
): Promise<{ pages: string[]; sidecars: string[] }>
// nexus-relative POSIX · dot- and underscore-prefixed dirs and node_modules skipped
// `_`-prefixed .md files ARE pages (the corpus admits them) · `.nexus`/`.trash` never entered
// the asset root is stepped around even when it is itself excluded — a supported configuration
//   the live nexus uses, and the one place Clear must not inherit the exclusion list's reach
// sidecars: `_pagecollection.json` and `_pageset.json` ONLY. Never the SIDECARS set — it also
//   holds `_taskconfig.json` and `_eventconfig.json`, and an unlinked agenda config strands the
//   id in nexus.json with no in-app repair (reHomeRegistered needs a sidecar; seeding is
//   creation-only, deliberately). `_space.json` lives under `.nexus` and is never reached.
// an entry naming a folder that no longer exists contributes nothing, never throws

/** Strip Pommora's bookkeeping from the excluded folders. Sidecars are deleted; a page loses its
 *  identity and modeled keys, and its governed keys either unwrap to bare names or go. */
export async function clearExclusionData(
  root: string, excluded: string[], assetDir: string, preserveProperties: boolean,
): Promise<Result<{ pages: number; sidecars: number; refused: number; collided: string[] }>>
// pages: sweepGovernedRoots(root, { kind: 'files', files }, () => null, { rewriteText })
//   — the raw Rewrite is never called on the rewriteText branch, and `stamp` is never read on it
//     either, so neither is passed. { kind: 'files' } reaches no sidecars; they are unlinked here.
//   rewriteText deletes PageID/TaskID/EventID + icon/created_at/modified_at/cover, then per key:
//     selector — parseGovernedKey(key) names it; a key isGovernedKey accepts but parseGovernedKey
//       cannot (`<Status`, `<>`) is Pommora-shaped garbage and is deleted outright, never renamed
//     preserve on  → renameFrontmatterKey(content, key, name, 'merge')
//     preserve off → omit the key from the merge
//   COLLISION: if the page already holds a bare key of that name, the governed key is LEFT ALONE
//     and the page is reported in `collided`. Neither KeyCollision mode is lossless here — 'merge'
//     folds only when both values are sequences and drops the rival regardless, 'prefer-new'
//     always discards the governed value — so Clear refuses rather than picking a casualty.
// refused: SweepResult.refused, surfaced rather than swallowed. A Task or Event page reads
//   `contradicting` through sweepAdmits and is never rewritten; the caller must be able to say so.
// sidecars: the container filenames found, unlinked. A missing one is done, not an error.
```

**Assumed by:** Task 7 (the handler calls `clearExclusionData` and reports its counts).

**Verify — automated**

- [ ] Red first in `src/main/exclusionScan.test.ts` against a temp nexus holding, under one excluded root: a Collection with `_pagecollection.json`, a nested Set with `_pageset.json`, **a root folder with `_taskconfig.json` registered in `nexus.json`**, a page with `<Status>: Doing` carrying a comment above it, a page with `(Projects): [Alpha]`, **a page holding both `<Status>: open` and a bare `Status: [Revisit]`**, a page with `TaskID`, a page with a malformed `<Status` key, a nested `node_modules` and a nested `.git`, and an `asset_directory` that is itself in the exclusion list.
- [ ] **The agenda config survives.** `_taskconfig.json` is untouched and the folder still resolves through `resolveFolderKind` afterward. Point the deletion at `SIDECARS` instead of the container pair and this goes red — the test corpus exists to make that mistake fail.
- [ ] **The collision page is untouched and reported.** Both `<Status>` and `Status` still hold their own values, and the page appears in `collided`. Substitute either `KeyCollision` mode and this goes red.
- [ ] The asset root is walked past: nothing under it appears in either list, even though it is excluded.
- [ ] `excludedArtifacts` finds the two pages and the two container sidecars, and nothing inside `node_modules`, `.git`, or `.nexus`.
- [ ] A crossing test that can actually fail: **assert the file sets, not the predicate**. Every `.md` under the excluded root that `corpusFilesUnder` would have returned had the folder not been excluded appears in `pages` — run it once with the folder excluded and once without, and compare. Asserting only that `shouldSkipDir` would have pruned each path is vacuous, since the exclusion matcher prunes everything under the root regardless of the skip set.
- [ ] Preserve on: `<Status>: Doing` becomes `Status: Doing`, the comment above it survives, key order is unchanged, `PageID` is gone. Preserve off: the `Status` line is gone entirely.
- [ ] The malformed `<Status` key is deleted, not renamed, and nothing throws — `parseGovernedKey` returns null there and an unguarded deref would abort the sweep half-applied.
- [ ] The `TaskID` page is left byte-identical and counted in `refused`.
- [ ] Idempotence: a second run over the same folder changes no bytes and reports zero pages touched. A migration that double-applies is the defect this catches.
- [ ] Degenerate cases: an empty exclusion list touches nothing; a folder with no sidecar and no frontmatter is left byte-identical; a page whose frontmatter has a syntax error is refused, not corrupted.
- [ ] **Hazard check:** `rg -F "exclusions:clear" src/shared/bridge.ts` → 0. The channel is what makes the function reachable; a symbol count cannot go red here.
- [ ] Full gate green.
- [ ] Docs: `ArchitecturePM.md:93` §Folder Exclusion gains the one exception in this commit — exclusion is total for reading, and Clear is the deliberate reach past it.

**Verify — user**

- [ ] *(carried to Task 7 — nothing reachable until the confirm exists.)*

#### Task 7: The Clear row and its confirmation

**Requirement:** 5, 7

**Why:** This closes the hazard window Task 6 opened, and it is the only place a user can reach an irreversible whole-folder rewrite — so the dialog's copy is the deliverable, not decoration.

**Now** — the confirm pattern, and the button variant with no consumer:

```ts
// src/main/index.ts — 'trash:confirmEmpty', the Cancel-default precedent
const { response } = await dialog.showMessageBox(win, {
  type: 'warning', buttons: ['Delete', 'Cancel'], defaultId: 1, cancelId: 1,
  message: ..., detail: ...,
})
return response === 0

// src/renderer/DesignSystem/Buttons/button-base.css.ts — defined, 0 production uses
destructive: { vars: { '--button-fill': tintAt(error, 'tertiary'), ... } }
```

**Becomes** — one `window` handler that confirms and acts, and the row that calls it:

```ts
// src/shared/bridge.ts
// Confirmation and action are one channel: an unconfirmed reach into a user's folders should
// not be expressible, and a separate confirm channel would make it so.
'exclusions:clear': { args: []; reply: Result<ClearReport | null> }
// ClearReport = { pages: number; sidecars: number; refused: number; collided: string[] }
// ok(null) is a cancelled dialog, not a failure.

// src/main/index.ts
'exclusions:clear': { kind: 'window', ... }
// no excluded folders → ok(null) without a dialog · reads tree.excluded, assetDirectory, the toggle
// buttons: ['Clear', 'Cancel'], defaultId: 1, cancelId: 1     // Cancel defaults, as trash does
// message: `Clear Pommora's data from ${n} excluded folder(s)?`
// detail names, in plain words: the folder's icon, banner, manual ordering, saved views AND the
//   properties it assigns are removed for good; the folder returns as a new one after the next
//   launch; and either that property values are kept as ordinary frontmatter, or that they are
//   removed — read from the toggle at the moment of asking, never assumed.
// on confirm → clearExclusionData(...), then seedContentIndex(root): the sweep re-indexes every
//   page it writes (governedSweep calls indexWrittenPage, and relCorpusPath does not consult the
//   exclusion list — Clear is the first pen to write inside an excluded folder), so the seed's
//   prune is what puts those rows back out. No tree refresh: nothing it touched is in the tree.
// the reply carries refused and collided so the row can say the sweep was thin rather than
//   reporting a clean scrub it did not perform.

// src/renderer/Settings/ExclusionRows.tsx
export function ClearExclusionsRow({ label, hint }: RowProps): React.JSX.Element
// trailing: { kind: 'field' } holding <Button type="destructive" label="Clear" />,
// disabled when tree.excluded is empty, and while a sweep is in flight — the Manage pane
// does not dismiss on confirm by design, so without this a `×` pressed mid-sweep would
// re-admit a half-stripped folder to the tree while the sweep is still stripping it.
// A returned report naming refused or collided pages is surfaced through 'error:show'
// rather than being dropped on the floor.

// src/renderer/Settings/SettingsWindow.tsx — the Exclusions section, in order:
// Excluded Directories · Clear Exclusion Cache · Preserve Properties On Clear
{ kind: 'clear-exclusions', label: 'Clear Exclusion Cache',
  hint: 'Remove existing app data that may have been written onto previously indexed folders.' }
```

**Verify — automated**

- [ ] Red first: the handler returns `ok(null)` with an empty exclusion list and never opens a dialog; a cancelled dialog returns `ok(null)` and writes nothing; a confirmed one calls through and reports counts.
- [ ] The detail string is built from the toggle read at call time — flip the toggle between two invocations and the two strings differ. A dialog that describes the other branch is the failure this catches.
- [ ] `npm run typecheck` — the channel and the `Row` switch both fail closed.
- [ ] **Hazard closed:** `rg -F "clearExclusionData" src` → 3 (definition, test, handler), and the only non-test caller is behind the confirm. Control: `rg -F "excludedArtifacts" src` → 3.
- [ ] Full gate green.
- [ ] Docs: `DesignSystemPM.md`'s Components table records the destructive variant's consumer in this commit.

**Verify — user**

- [ ] The dialog's wording on a real nexus — does it say plainly what is lost and what survives, and does it change when the toggle flips?
- [ ] Clear a real excluded folder with Preserve **on**: sidecars gone, `PageID` gone, `Status:` values intact as plain frontmatter, comments and key order intact.
- [ ] Clear with Preserve **off** on a scratch folder: the property lines are gone.
- [ ] Un-exclude a cleared folder. A top-level Collection whose sidecar was deleted stays invisible until the next launch — its pages included, since nothing renders under a folder that resolves Unknown. After relaunch it returns as a new Collection. Confirm that reads as acceptable rather than as a bug.
- [ ] The destructive button's tone against the rest of the Settings window — this is its first appearance anywhere.

#### Gate 2 — Clear ships behind a confirmation

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] `code-simplifier` then `feature-dev:code-reviewer` dispatched against `<base>..HEAD`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] **Hazard window closed:** `exclusions:clear` is declared, and its handler runs the dialog before `clearExclusionData` in the same commit that declared it.
- [ ] The Agenda singletons survive a Clear over a folder holding one — checked against a real `_taskconfig.json`, not only in the temp-nexus suite.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] **Declared stop.** Execution halts until the user closes this phase's **Verify — user** boxes.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — Exclusions can be set from the app · base `<commit>`
  - [ ] Task 1 — The refusal and the hardened read · `<commit>`
  - [ ] Task 2 — The settings writer · `<commit>`
  - [ ] Task 3 — The set and choose channels · `<commit>`
  - [ ] Task 4 — The row and the Manage pane · `<commit>`
- [ ] **Phase 2** — Clear removes what Pommora wrote · base `<commit>`
  - [ ] Task 5 — The Preserve Properties toggle · `<commit>`
  - [ ] Task 6 — The enumerator and the strip · `<commit>`
  - [ ] Task 7 — The Clear row and its confirmation · `<commit>`

### Rulings

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- **A file count beside the folder count.** Ruled out for this plan: it needs a recursive walk of arbitrarily large folders and cannot come from the index, which has already forgotten excluded paths. `excludedArtifacts` makes it a one-line addition if the folder count proves uninformative in use.
- **Per-folder Clear.** The pane's rows are the natural home for it once the global Clear has been used on a real nexus.

### Closeout

---

## Completion Criteria

*(Written at ratification, ticked at the end. It stands alone — handed to an executing agent with the plan, it is the whole brief.)*

**The directive** *(filled in from this plan; the user copies it and sends it)*

```
Execute .claude/Planning/Exclusions.md. <Unattended overnight | live>.
Live-verify: the Manage pane's geometry and dismissal (Phase 1), and the Clear dialog's
  wording plus one real cleared folder in both toggle positions (Phase 2)
Screenshots: Phase 1 — the Exclusions section and the open Manage pane at a short and a
  deeply nested path. Phase 2 — the confirmation dialog in both toggle positions.
Pings: at each phase's declared stop
Record: History arc "Exclusions"
Also: <anything true for this run only>
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] Clear is unreachable except through its confirmation, and idempotent when re-run.
- [ ] No fourth skip predicate was added: `exclusion.ts`'s matching rule is unchanged, and `exclusionScan.ts` is the only deliberate reach past it.
- [ ] Clear destroyed nothing it did not name: the Agenda configs survive, no collision lost a value, and every page the sweep would not admit was reported rather than counted as scrubbed.
- [ ] `dismissOnOutside` defaults true and no existing `PickerMenu` caller changed behavior.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Simplification then code review over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against this plan's Requirements.
- [ ] Attack review dispatched separately from the claim verification, after it.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass** *(the only thing allowed to be outstanding)*

- [ ] The Manage pane: min/max width at a short and a nested path, the `--surface-inset` gutter against a MenuSurface elsewhere, and dismissal on Escape and re-click only.
- [ ] Adding and removing a real folder, with the sidebar updating and no restart.
- [ ] The Clear dialog's wording in both toggle positions.
- [ ] A real folder cleared with Preserve on and with Preserve off, and the un-exclusion that follows.
- [ ] The destructive button's tone in the Settings window — its first appearance in the app.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them (six rows in Made False).
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed to `.claude/Guidelines`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · what any screenshot showed and what changed because of it · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
