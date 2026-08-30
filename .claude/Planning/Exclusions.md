## Exclusions — Implementation Plan

> **Status:** ratified — in execution · Spec: this session's design pass · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A user can exclude folders from Pommora without hand-editing `settings.json`, and can strip what Pommora already wrote into a folder it no longer manages. Settings > Files & Links gains an Exclusions section: an Excluded Directories row carrying the folder count and a Manage button that opens a pane of editable path fields, and a Clear Exclusion Cache row that removes Pommora's bookkeeping from every excluded folder behind a native confirmation.

The shape is dictated by what already exists. `excluded_folders` is a live setting with a complete matching engine (`src/main/exclusion.ts`) already honored by the read walk, the corpus walk, the adoption pass, the content index and the watcher — so no exclusion mechanism is designed, only a writer, a validator and a surface. Every fixture mirrors an existing one: the row copies `AssetDirectoryRow`, the channels copy `assets:setDir` / `assets:chooseDir`, the pane's field rows copy `FilterFrame`'s rule list, the confirmation copies `trash:confirmEmpty`, and the strip copies `deleteProperty`'s governed sweep. The alternative considered and rejected was a per-folder exclusion marker on disk (a dotfile or sidecar key), which would have added a fourth skip predicate to a codebase that deliberately funnels three through one `WatchScope`.

Clear unwraps rather than deletes by default. `<Status>: Doing` becomes `Status: Doing` and `(Projects): [Alpha]` becomes `Projects: [Alpha]`, because a folder leaving Pommora should land in the plain-YAML shape an Obsidian vault already reads, and because unwrapping satisfies Reasonable Legibility better than either leaving the sigils or destroying the values. A `Preserve Properties On Clear` toggle carries the delete-outright behavior for users who want the folder genuinely scrubbed.

Not solved here: globbing or negation in exclusion patterns, per-folder Clear, an undo for Clear, and any exclusion surface outside the Settings window.

**Requirements**

1. An **Excluded Directories** row in a new **Exclusions** section of Files & Links, showing the number of excluded folders and a **Manage** button.
2. The Manage pane: one editable path field per exclusion with a browse action and a remove `×`, an **Add Exclusion** button below the last field, min and max width knobs, and field rows inset by `--surface-inset`. It dismisses on Escape, a re-click of Manage, or a click outside — but not on a path commit, an Add, or a returning folder dialog, which are actions inside the pane.
3. Exclusions persist to `excluded_folders` in `.nexus/settings.json`. Adding one removes the folder from the tree and the index without a restart; removing one re-indexes it.
4. A typed path and a browsed path cross the same validator, which is also the refusal a hand-edited `settings.json` meets.
5. A **Clear Exclusion Cache** row with a destructive button behind a native confirmation that, across every excluded folder, deletes **container** sidecars — `_pagecollection.json` and `_pageset.json` only — and Pommora's own frontmatter bookkeeping from the pages inside them. The Agenda layer is out of scope entirely: a folder carrying a Task or Event config is skipped whole, configs and pages alike. A file the sweep cannot admit is left byte-identical and reported rather than counted as scrubbed.
6. A **Preserve Properties On Clear** toggle, default on: keys wrapped in `<>` or `()` are unwrapped to bare keys rather than deleted. The scan is by shape alone — the contents are never inspected, so no registry lookup and no name parsing is involved.
7. The documentation claiming exclusions are hand-edited only is rewritten in the commits that falsify it.

**Acceptance — the whole thing working**

With the app running and a folder of pages visible in the sidebar: open Settings > Files & Links > Exclusions, press Manage, browse to that folder, and the folder and its pages leave the sidebar with no restart while the row's count reads `1`; press the field's `×` and they return. Then, with Preserve Properties on, press Clear and confirm — the folder's `_pagecollection.json` is gone, its pages hold no `PageID`, and a page that had `<Status>: Doing` now reads `Status: Doing` with its surrounding comments and key order intact. The pane stayed open throughout, closing only on Escape or a second press of Manage.

**Forced By**

- An in-app settings write is echo-suppressed by `recordWrite`, so the watcher's `sameScope` structural check never fires (`src/main/index.ts` `assets:setDir`, its comment states this) → the set handler must run `confirmSettingsWrite` → `refreshAfterWrite` → `seedContentIndex` → `startWatcher` by hand. **Task 3.**
- `corpusFilesUnder` and `shouldSkipDir` both prune exactly the folders Clear targets, and `listFilesRecursive` has no skip logic at all → Clear needs its own enumerator that deliberately enters an excluded folder. **Task 6.**
- `readNexus.ts` reads the list through `asStringArray`, which is all-or-nothing: one non-string element discards the entire exclusion list → a UI that writes this key must first make the read per-element, as `ribbonOrder` and `favoriteIcons` already are. **Task 1.**
- `sweepGovernedRoots` already carries a `rewriteText` option whose doc comment describes key renaming as its reason for existing → the unwrap needs no new sweep machinery. **Task 6.**
- `PickerMenu` dismisses on Escape and an outside click through one `onDismiss` prop → the pane wears it as-is; Requirement 2's dismissal is the default and costs no design-system change. **Task 4.**
- `SIDECARS` (`src/main/paths.ts`) holds five filenames, two of which are the Agenda singletons' configs, and an unlinked `_taskconfig.json` has no repair path — `reHomeRegistered` needs a sidecar id to match and `seedAgendaSingletons` never retro-seeds → Clear deletes a container-only set, never `SIDECARS`. **Task 6.**
- The Agenda layer stays out of Clear entirely — its configs, its folders and its Task and Event pages → `excludedArtifacts` skips a folder carrying `_taskconfig.json` or `_eventconfig.json` outright, so those pages never enter the sweep's file list and never read as refused. `sweepAdmits`'s existing `admitContentFile(fm, 'page')` gate refuses a stray `TaskID` page anyway, so the policy holds at two levels and `SweepOptions` needs no change. **Task 6.**
- `renameFrontmatterKey`'s `KeyCollision` is `'prefer-new' | 'merge'` only (`pageFile.ts:118-124`) → the unwrap passes `'prefer-new'`: where a page already holds a plain key of that name, Pommora's wrapped one drops rather than overwriting what another tool wrote into a folder that is leaving Pommora. **Task 6.**
- `MenuDropdown`'s trigger is hardwired to a `Segmented` glass button → it cannot wear a settings-row button, so the pane is a `PickerMenu` anchored to a `triggerRef`. **Task 4.**
- `resolveFolderKind` returns `'collection'` for a root folder only when `_pagecollection.json` exists (`sidecarMode` is true for any nexus whose `nexus.json` carries an id) → deleting a top-level sidecar makes that Collection invisible until the next nexus open re-stamps it. **Task 7**, in the confirm copy.
- A `.md` with no identity key is admitted and wears a path-derived synthetic id (`readPageRecord`) → cleared pages reappear immediately on un-exclusion rather than vanishing. **Task 7**, in the confirm copy.
- `PageID` is a durable pointer — surface tiles store `page_id`, and `nexus.db` keys folds, aliases, per-page zoom and citations by it → Clear orphans that state. **Task 7**, in the confirm copy.
- `sweepGovernedRoots` re-indexes each rewritten page through `indexWrittenPage`, whose `relCorpusPath` gate honors only `NON_CORPUS_TOP` and not the exclusion list — its comment states the app's pens never write into excluded folders, which Clear is the first code to falsify → the cleared pages land back in the content index, and the watcher never reconciles them because excluded folders are unwatched. Clear's handler must re-seed the index after the sweep, exactly as Task 3's set handler does. **Task 7.**

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
excluded: asStringArray(settings.excluded_folders) ?? [],

export function assetDirRefusal(raw: string): string | null
```

**Becomes** — a sibling refusal, and a per-element read:

```ts
export function excludedFolderRefusal(raw: string): string | null

excluded: readExcludedLeaf(settings.excluded_folders),
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
export function writeAssetDirectory(root: string, dir: string): Promise<void> {
  return updateSettings(root, ({ asset_directory: _drop, ...rest }) =>
    dir ? { ...rest, asset_directory: dir } : rest,
  )
}
```

**Becomes** — its sibling, same delete-on-empty contract:

```ts
export function writeExcludedFolders(root: string, folders: string[]): Promise<void>
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

**Now** — the pair to copy, in `bridge.ts`, `preload/index.ts`, `main/index.ts` and `CacheSlice.ts`:

```ts
'assets:chooseDir': { args: [scope?: 'nexus' | 'property', at?: string]; reply: Result<string | null> }
'assets:setDir': { args: [dir: string]; reply: Result<string> }

chooseAssetDir: ask('assets:chooseDir'),
setAssetDir: ask('assets:setDir'),

await confirmSettingsWrite()
const tree = await refreshAfterWrite(root)
await seedContentIndex(root)
push(mainWindow, 'nexus:changed', tree)
await startWatcher(root, mainWindow)

setAssetDirectory: async (dir) => { await window.nexus.setAssetDir(dir) },
```

That tail is the chain an in-app scope write owes, and the handler's own comment says why it cannot be skipped.

**Becomes** — two channels, two dialers, one store action:

```ts
'exclusions:set': { args: [folders: string[]]; reply: Result<string[]> }
'exclusions:choose': { args: []; reply: Result<string | null> }

setExclusions: ask('exclusions:set'),
chooseExclusion: ask('exclusions:choose'),

'exclusions:set': { kind: 'envelope', ... }
'exclusions:choose': { kind: 'window', ... }

setExclusions: (folders: string[]) => Promise<Result<string[]>>
```

The whole list crosses at once, so add and remove are the same write and no ordering question exists between two half-applied edits. `set` refuses a non-array outright, puts every entry through `excludedFolderRefusal` and returns the first refusal, and collapses duplicates on the case-folded form `normalizeSeg` compares while storing the spelling the user typed — the volume is case-insensitive, so `archive` and `Archive` are one folder, and storing both would double every count and every enumeration. It then calls `writeExcludedFolders` and runs the chain above by hand.

`choose` opens `showOpenDialog` with `properties: ['openDirectory']` and `defaultPath: root`, answering `ok(null)` on cancel and the refusal's own message for a pick outside the root. The store action only awaits the channel: the tree leaf is what the pane reads, and main patches it on the write's own confirm, so a refusal needs no local rollback.

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

**Now** — the row template in `AssetDirectoryRow.tsx`, the registry's dispatch in `SettingsWindow.tsx`, and `PickerMenu`'s dismissal at `picker-base.tsx:255` and `:355`:

```tsx
<MenuRowView row={{ kind: 'item', label, caption: hint, trailing: { kind: 'field', children:
  <PathField label={label} value={stored} empty="No folder"
    onCommit={...} onBrowse={...} /> } }} />

| (RowText & { kind: 'path' })
case 'path': return <AssetDirectoryRow label={row.label} hint={row.hint} />

{onDismiss && !closing ? <div className={s.backdrop} ... onClick={onDismiss} /> : null}

dismissOnOutside = true,
```

`kind: 'path'` is the keyless row that writes a top-level settings key; the `Row` union holds 7 kinds behind an exhaustive switch. The Escape effect is gated on `onDismiss` too, so today a pane dismisses on outside click *and* Escape, or on neither. The last line is `MenuDropdown`'s prop — the name already in the vocabulary for this exact behavior, which `OutlineMenu` uses. `FilterFrame`'s `ruleList` / `ruleRow` / `removeButton` are the repeatable-list precedent, and `--surface-inset` is 10px at `styles.css:5`.

**Becomes** — one design-system prop, a new keyless row kind, a new bespoke component, a new section:

```tsx
dismissOnOutside?: boolean
{onDismiss && !closing && dismissOnOutside ? <div className={s.backdrop} ... /> : null}

const PANE_MIN_W = 250
const PANE_MAX_W = 500
export function ExcludedDirectoriesRow({ label, hint }: RowProps): React.JSX.Element

| (RowText & { kind: 'exclusions' })
case 'exclusions': return <ExcludedDirectoriesRow label={row.label} hint={row.hint} />
{ title: 'Exclusions', rows: [{ kind: 'exclusions', label: 'Excluded Directories',
  hint: 'Excluded folders will not be recognized by the app; removing a folder from exclusion will re-index.' }] }
```

`dismissOnOutside` defaults to `true`, so every existing caller keeps its behavior, and it gates the backdrop alone — Escape is untouched.

The row's trailing slot is a `kind: 'field'` holding the count of `tree.excluded` and a Manage `<Button>`. Manage toggles `open`; the pane is a self-managed `PickerMenu` on the button's `triggerRef`, `bareSurface`, `dismissOnOutside={false}`, sized by the two knobs. Escape and the Manage button are the only ways out, so a path commit, an Add press and a returning folder dialog all leave it open. Its rows are one `PathField` per entry with a `removeButton` ×, in a column at `padding: var(--surface-inset)`, with an Add Exclusion button below the last field that appends a blank row committing on its first non-empty value. The new row kind is keyless like `'path'`.

**Assumed by:** Task 7 (adds the Clear row to this same section).

**Verify — automated**

- [ ] Red first in `src/renderer/Settings/ExclusionRows.test.tsx` — the row renders the count from a stubbed `tree.excluded`; Manage toggles the pane; a committed path calls `setExclusions` with the whole list; `×` removes one entry; Add appends a blank row.
- [ ] A dismissal test driving a real `click`: with the pane open, a click on the backdrop dismisses it, `Escape` dismisses it, and a second Manage press dismisses it — each read through the trigger's `aria-pressed`, since the pane rides a Bloom-out exit before it unmounts.
- [ ] No existing `PickerMenu` caller changed behavior — the pane adds no prop. `rg -F "PickerMenu" src/renderer` → re-derive; none needed editing.
- [ ] A blank row added by **Add Exclusion** survives a sibling field's commit. That commit pushes `nexus:changed`, which re-renders the pane from `tree.excluded`; a draft row held only in the tree's shape would vanish under the user's cursor.
- [ ] `npm run typecheck` — the `Row` switch is exhaustive with no `default`, so a missing case is a compile error.
- [ ] Full gate green, `npm run lint` clean (the new `.css.ts` included).
- [ ] Docs: `ConfigurationPM.md:179`, `:189` and `ArchitecturePM.md:231` rewritten in this commit. Sweep `rg -n "hand-edited|hand-set" .claude/Features` and confirm no surviving hit refers to exclusions. Control: `rg -F "excluded_folders" .claude/Features` → 2.

**Verify — user**

- [ ] The pane's width at one short path and at one deeply nested path — does the min/max pair hold, and does a long path scroll rather than widen past the max?
- [ ] The field rows' inset against a `MenuSurface` elsewhere in the app — the same `--surface-inset` should read as the same gutter.
- [ ] Add a real folder by browsing and confirm it and its pages leave the sidebar with no restart; remove it and confirm they return.
- [ ] The pane stays open through a commit, an Add, and a returning folder dialog; closes on Escape, a second Manage press, and an outside click.

#### Gate 1 — exclusions are writable from the app

- [x] Gate commands green, exit codes read directly. (typecheck · 3697 tests · lint, all clean)
- [x] Every task's **Verify — automated** list ticked, each against a result just watched.
- [x] `rg -F "excluded_folders" src` re-run against its control; count matched or the divergence rewrote the plan.
- [x] Every task that diverged had its dependents re-derived and rewritten.
- [x] `code-simplifier` then `feature-dev:code-reviewer` dispatched against `ce72c989..HEAD` scoped to this phase's paths; the reports cite files inside it.
- [x] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [x] No hazard window opened by this phase.
- [x] Progress hashes filled in; lessons written into the later tasks they change.
- [x] **Declared stop.** User signed off Phase 1 after a live-verify round (outside-click dismissal restored, Manage filled, folder titles label-control, Add button at the surface-inset gutter).

---

### Phase 2 — Clear removes what Pommora wrote

#### Task 5: The Preserve Properties On Clear toggle

**Requirement:** 6, 7

**Why:** Task 6's rewrite branches on this, and it is the cheapest row the codebase has — a personalization key needs no channel, no handler and no store action. Landing it first means Task 6 has a real value to read rather than a hardcoded default to replace.

**Now** — the three edits a boolean setting costs, as `permanentDelete` already demonstrates:

```ts
permanentDelete?: boolean
permanentDelete: bool(p.permanentDelete),
{ kind: 'toggle', key: 'permanentDelete', label: '...' }
```

**Becomes** — the same three, defaulting on:

```ts
preservePropertiesOnClear?: boolean

preservePropertiesOnClear: bool(p.preservePropertiesOnClear),

{ kind: 'toggle', key: 'preservePropertiesOnClear', defaultOn: true,
  label: 'Preserve Properties On Clear',
  hint: 'Clearing keeps the values a page holds, writing them as ordinary frontmatter instead of removing them.' }
```

The row sits in the Exclusions section below Clear. `defaultOn: true` means returning to the default writes `undefined`, which JSON omits, so main reads absent as preserve: `personalization.preservePropertiesOnClear !== false`.

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
corpusFilesUnder(root, absDir, scope)
listFilesRecursive(dir)

shouldSkipDir(name, relPath, scope)

export async function sweepGovernedRoots<C>(
  root: string, scope: SweepScope, rewrite: Rewrite<C>, opts: SweepOptions = {},
): Promise<SweepResult<C>>
export interface SweepOptions { stamp?: boolean; rewriteText?: RewriteText }

mergeFrontmatter(content, modeled, modeledKeys, body)
renameFrontmatterKey(content, oldKey, newKey, collision)

```

**Becomes** — one module holding the exception; no shared machinery changes:

```ts
export async function excludedArtifacts(
  root: string, excluded: string[], assetDir: string,
): Promise<{ pages: string[]; sidecars: string[] }>

export async function clearExclusionData(
  root: string, excluded: string[], assetDir: string, preserveProperties: boolean,
): Promise<Result<{ pages: number; sidecars: number; refused: number }>>
```

**A known property, not a defect:** the sweep re-serializes each file's frontmatter through `doc.toString({ lineWidth: 0 })`, which rewrites an inline flow collection (`Tags: [x, y]` → `Tags: [ x, y ]`) on keys it never touched. This is how every existing sweep already behaves, and zero of the 122 `.md` files under the live nexus's exclusions use flow syntax. It is not in scope to change.

**A second known property:** unwrapping flattens the property sigil `<>` and the context sigil `()` into one bare namespace, so a page carrying the same inner name under both — `<Status>` the property and `(Status)` the Context group — resolves both to bare `Status`, and the second unwrap meets a rival and drops one value (`renameFrontmatterKey`'s `'prefer-new'`, `pageFile.ts:166`). No clean automatic resolution exists: the two values may be different types, so `'merge'` cannot fold a scalar into a sequence either. The precondition is a user naming a Context group identically to a property and holding both on one page — legal but uncommon, and none of the seeded defaults collide. The values that survive are whichever unwrapped first. Accepted rather than solved, on the same footing as the reflow.

**Assumed by:** Task 7 (the handler calls `clearExclusionData` and reports its counts).

**Verify — automated**

- [ ] Red first in `src/main/exclusionScan.test.ts` against a temp nexus holding, under one excluded root: a Collection with `_pagecollection.json`, a nested Set with `_pageset.json`, **a root folder with `_taskconfig.json` registered in `nexus.json`**, a page with `<Status>: Doing` carrying a comment above it, a page with `(Projects): [Alpha]`, **a page holding both `<Status>: open` and a bare `Status: [Revisit]`**, a page holding both `<Status>: open` and `(Status): [Home]` (same name, both sigils), a page with `TaskID`, a page with a malformed `<Status` key, a nested `node_modules` and a nested `.git`, and an `asset_directory` that is itself in the exclusion list.
- [ ] **The agenda config survives.** `_taskconfig.json` is untouched and the folder still resolves through `resolveFolderKind` afterward. Point the deletion at `SIDECARS` instead of the container pair and this goes red — the test corpus exists to make that mistake fail.
- [ ] **The collision page keeps its plain key.** `Status: [Revisit]` survives untouched and `<Status>: open` is gone. Swap the mode to `'merge'` and this goes red — merge drops the plain key instead.
- [ ] The asset root is walked past: nothing under it appears in either list, even though it is excluded.
- [ ] `excludedArtifacts` finds the two pages and the two container sidecars, and nothing inside `node_modules`, `.git`, or `.nexus`.
- [ ] A crossing test that can actually fail: **assert the file sets, not the predicate**. Over an **agenda-free** excluded root, every `.md` that `corpusFilesUnder` would have returned had the folder not been excluded appears in `pages` — run it once with the folder excluded and once without, and compare. The root must be agenda-free because `corpusFilesUnder` is agenda-blind (it prunes only `NON_CORPUS_TOP`, asset and excluded, never a `_taskconfig.json` folder), while `excludedArtifacts` withholds agenda pages by design — comparing the two over the agenda root would fail the identity for a correct implementation. Asserting only that `shouldSkipDir` would have pruned each path is vacuous, since the exclusion matcher prunes everything under the root regardless of the skip set.
- [ ] Preserve on: `<Status>: Doing` becomes `Status: Doing`, the comment above it survives, key order is unchanged, `PageID` is gone. Preserve off: the `Status` line is gone entirely.
- [ ] The malformed `<Status` key is left exactly as it was — it is not `<…>`-shaped, and a shape scan has no opinion about it.
- [ ] The same-name-both-sigils page does not crash the sweep and ends with exactly one bare `Status` key — the documented drop, locked so it can't silently become a crash or a doubled key.
- [ ] **The Agenda folder is untouched end to end.** `_taskconfig.json` is byte-identical, the `TaskID` page inside it is byte-identical, neither appears in `pages` or `sidecars`, and the folder still resolves through `resolveFolderKind`. Remove the folder skip and the config assertion goes red.
- [ ] `sweepGovernedRoots` is called exactly as its existing callers call it — no new option, no change to `CRUD/governedSweep.ts`. `git diff --stat` for this task names no file under `CRUD/`.
- [ ] A file whose frontmatter cannot round-trip is left byte-identical and counted in `refused`.
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
const { response } = await dialog.showMessageBox(win, {
  type: 'warning', buttons: ['Delete', 'Cancel'], defaultId: 1, cancelId: 1,
  message: ..., detail: ...,
})
return response === 0

destructive: { vars: { '--button-fill': tintAt(error, 'tertiary'), ... } }
```

**Becomes** — one `window` handler that confirms and acts, and the row that calls it:

```ts
'exclusions:clear': { args: []; reply: Result<ClearReport | null> }

'exclusions:clear': { kind: 'window', ... }

export function ClearExclusionsRow({ label, hint }: RowProps): React.JSX.Element

{ kind: 'clear-exclusions', label: 'Clear Exclusion Cache',
  hint: 'Remove existing app data that may have been written onto previously indexed folders.' }
```

On a confirmed clear the handler awaits `clearExclusionData` and then runs `seedContentIndex(root)`, because the sweep re-indexes every page it rewrites (`indexWrittenPage` cannot tell an excluded path from a corpus one) and the watcher never corrects it — the re-seed drops the cleared pages back out of the index in the same act, so the row's promise that excluded folders are not recognized holds without a relaunch. This mirrors the re-arm Task 3 already performs; the index is the only stale surface, so the full scope chain is not owed.

**Verify — automated**

- [ ] Red first: the handler returns `ok(null)` with an empty exclusion list and never opens a dialog; a cancelled dialog returns `ok(null)` and writes nothing; a confirmed one calls through and reports counts.
- [ ] After a confirmed clear the index holds no row under the cleared folder's prefix. Remove the `seedContentIndex(root)` call and this goes red — the sweep's own `indexWrittenPage` re-inserts the rows it just rewrote.
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

- [x] Gate commands green, exit codes read directly. (typecheck · 3707 tests · lint)
- [x] Every task's **Verify — automated** list ticked, each against a result just watched.
- [x] Every Now count re-run against its control; counts matched or the divergence rewrote the plan.
- [x] Every task that diverged had its dependents re-derived and rewritten.
- [x] `code-simplifier` then `comment-killer-agent` then `feature-dev:code-reviewer` dispatched against `94ea5116..HEAD`; the reports cite files inside it.
- [x] Every concern fixed (Gate 2 review Critical folded), or carrying an explicit user ruling recorded in the Log.
- [x] **Hazard window closed:** `exclusions:clear` is declared, and its handler runs the dialog before `clearExclusionData` in the same commit (`912b853f`) that declared it.
- [x] The Agenda layer survives a Clear over a folder holding it — config and pages both — checked against a real `_taskconfig.json` in the temp-nexus suite. (The real-nexus pass is a Verify — user box.)
- [x] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] **Declared stop.** Execution halts until the user closes this phase's **Verify — user** boxes.

---

## Implementation Log

### Progress

- [x] **Phase 1** — Exclusions can be set from the app · base `ce72c989`
  - [x] Task 1 — The refusal and the hardened read · `25469f0a`
  - [x] Task 2 — The settings writer · `0c639fa4`
  - [x] Task 3 — The set and choose channels · `0e6caac4`
  - [x] Task 4 — The row and the Manage pane · `63908f1c` (+ Gate 1 `092aff56`, live-verify `a25ab028` `26cad679` `94ea5116`)
- [ ] **Phase 2** — Clear removes what Pommora wrote · base `94ea5116`
  - [x] Task 5 — The Preserve Properties toggle · `bb51bc91`
  - [x] Task 6 — The enumerator and the strip · `ddbb43af` (hazard window OPEN until Task 7)
  - [x] Task 7 — The Clear row and its confirmation · `912b853f` (hazard window CLOSED)

### Rulings

- **Task 1 — `excludedFolderRefusal` shares one rule with `assetDirRefusal`.** The two are byte-identical (a valid, writable, nexus-relative folder path that is not app-owned), so the shape rule is extracted once as `nexusFolderRefusal` and both names alias it; the DRY rule forbids the verbatim twin the plan's fences implied. `assetDirRefusal`'s two consumers are untouched. Either alias can be promoted to its own function if the domains ever diverge.
- **Round-2 attack, Finding 1 (Medium) — folded into Task 7.** The sweep's `indexWrittenPage` re-inserts every page Clear rewrites, and the watcher never corrects an excluded folder, so Clear's handler re-seeds the index after `clearExclusionData`. Mirrors Task 3's re-arm; only the index is stale, so the full scope chain is not owed.
- **Round-2 attack, Finding 2 (Medium) — folded into Task 6's crossing test.** `corpusFilesUnder` is agenda-blind, so the file-set identity holds only over an agenda-free excluded root; the crossing test names that constraint.
- **Gate 2 review, Critical (IPC throw on the destructive path) — fixed.** `exclusions:clear` is a `window` handler, which `ipc.ts` does not wrap in the throw-to-`fail` net (only `envelope` is), so an unguarded `rm`/`seedContentIndex` throw would reject across the boundary — the "IPC never throws" hard rule. Fixed both layers: the handler body is wrapped in try/catch → `fail(errText)`, matching sibling `exclusions:choose`, and the sidecar `rm` is now best-effort (a locked or sync-placeholder sidecar is skipped and counted out, so the page sweep still runs rather than aborting the pass).
- **Gate 2 simplify — two changes, verified.** `clearRewrite` parses each governed key once via `flatMap`, and a doc-comment the `ClearReport` insertion had orphaned was reattached to `TrashRow`.
- **Gate 2 comment pass.** exclusionScan.ts trimmed to the header (sole-reach + Agenda-out) and the one shape-governance why; the handler keeps only the re-seed rationale; test narration cut to zero.
- **Phase 1 live-verify — outside-click dismissal restored (reverses the original spec).** The user asked that a click outside the pane also dismiss it. That is `PickerMenu`'s default, so the `dismissOnOutside` prop added in Task 4 is removed entirely — no caller needs it, and a dead prop is worse than none. The pane now closes on Escape, a re-click of Manage, or an outside click; a path commit, an Add, and a returning folder dialog are actions inside the pane and leave it open. The `DesignSystemPM` note and the Made False row for it are reverted with the code.
- **Gate 1 review, Critical 1 — fixed.** The Manage pane was mounted conditionally (`open ? <PickerMenu> : null`), which skips PickerMenu's Bloom-out exit and trips its DEV guard. Now mounted persistently and rides `open`, as the primitive requires.
- **Gate 1 review, Critical 2 — fixed.** The row discarded the `setExclusions` Result, so a typed path the validator refused vanished with no feedback and the draft row closed anyway. Now surfaces the refusal via `window.nexus.showError` (the `RenameSlice` pattern) and keeps the draft open on failure.
- **Gate 1 review, below-bar race — fixed preemptively.** Rows are keyed and edited by folder value, not row index, so a concurrent list reorder can't land a commit against a neighbor. Cheap and closes the race.
- **Round-2 attack, Finding 3 (Low) — accepted and documented in Task 6.** Two same-named keys under different sigils flatten to one bare key and one value drops; no clean auto-resolution exists and the precondition is uncommon. Documented as a known property, on the same footing as the flow-reflow. Reversible if the user rejects it.

### Open Against Later Tasks

### Deviations

- **Task 7 — the DesignSystemPM destructive row needed no edit.** The Made False table expected a "destructive variant has no consumer" claim to rewrite, but the Button Types table only lists the type and never asserted that, so it stays accurate as written. The confirm copy was extracted to `clearConfirmCopy` (like Task 3's sanitizer) so the toggle-branch wording is unit-testable; the handler's dialog/branch flow is covered by the Phase 2 live-verify.
- **Task 3 — the set handler's pure core is extracted to `exclusionInput.ts`.** The plan placed the valid/refused/dedup/`[]` tests in `index.test.ts`, but no handler suite exists — `index.ts` is electron-coupled and no handler is unit-tested (mirroring why `assetDirValidate.ts` factors the asset validator out). `sanitizeExclusions` holds refuse-normalize-dedup and is tested directly, including the matcher-crossing check via `shouldSkipDir`. The re-arm chain (`confirmSettingsWrite` → `refreshAfterWrite` → `seedContentIndex` → `startWatcher`) stays in the handler and is covered by Task 4's live-verify — adding and removing a real folder with no restart exercises the whole chain.
- **Task 4 — a ResizeObserver no-op joined the shared test setup.** jsdom lacks it and a portalled `PickerMenu` observes its pane, so any suite opening one crashed in a layout effect. Added beside the existing `elementFromPoint`/`Range` stubs in `Testing/setup.ts` — the correct shared place, benefiting every future picker test.
- **Task 3 — refuse before normalize.** Normalizing with `rootSegs().join('/')` first strips a leading `/`, so an absolute path slipped the refusal; the red test caught it. Both the sanitizer and the choose handler now refuse the raw trimmed input, then normalize — matching `readExcludedLeaf`.

### Lessons

### Sequenced After

- **A file count beside the folder count.** Ruled out for this plan: it needs a recursive walk of arbitrarily large folders and cannot come from the index, which has already forgotten excluded paths. `excludedArtifacts` makes it a one-line addition if the folder count proves uninformative in use.
- **Per-folder Clear.** The pane's rows are the natural home for it once the global Clear has been used on a real nexus.

### Closeout

---

## Completion Criteria

*(Written at ratification, ticked at the end. It stands alone — handed to an executing agent with the plan, it is the whole brief.)*

**The directive** *(paste-ready; assumes no prior session context)*

```
Execute the Exclusions plan at .claude/Planning/Exclusions.md, in the Project Pommora repo.
Read it whole before touching anything — it is written to be picked up cold, and its
Global Constraints and Completion Criteria are the brief.

Status: ratified. Begin at Phase 1, Task 1.

Before Task 1, run one attack round on the plan itself (build-breaking-agent, plan-review
mode, briefed with the plan's Inherited Reasoning as the do-not-re-raise list). One round
already ran and its findings are folded; this one covers the revisions made after it.
Verify every finding against the code yourself before folding it, present anything that
changes the work, then proceed.

Gates, from Pommora/, exit codes read directly and never through a pipe:
  npm run typecheck · npm run test · npm run lint

Declared stops — execution HALTS at both, and no agent ticks a Verify — user box:
  Phase 1 gate: the Manage pane is the feature's whole interaction surface.
  Phase 2 gate: Clear rewrites real files with no undo.

Live-verify (mine alone):
  Phase 1 — the pane's min/max width at a short and a deeply nested path, the
    --surface-inset gutter against a MenuSurface elsewhere, dismissal on Escape and a
    re-click of Manage only, and adding/removing a real folder with no restart.
  Phase 2 — the confirm dialog's wording in both toggle positions, one real folder cleared
    with Preserve on and with Preserve off, and the destructive button's tone (its first
    appearance in the app).

Screenshots:
  Phase 1 — the Exclusions section, and the open Manage pane at a short and a nested path.
  Phase 2 — the confirmation dialog in both toggle positions.

Pings: at each declared stop.
Record: History arc "Exclusions"; reconcile Context and Handoff at closeout.

Everything else is the Standard in the plan's Completion Criteria.
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
- [ ] Clear destroyed nothing it did not name: the Agenda layer is untouched end to end, every collision left the plain key standing, and files the sweep could not admit were reported rather than counted as scrubbed.
- [ ] No existing `PickerMenu` caller changed behavior; the pane rides the default dismissal.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Simplification then code review over the full implementation, in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against this plan's Requirements.
- [ ] Attack review dispatched separately from the claim verification, after it.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass** *(the only thing allowed to be outstanding)*

- [ ] The Manage pane: min/max width at a short and a nested path, the `--surface-inset` gutter against a MenuSurface elsewhere, and dismissal on Escape, a re-click, and an outside click.
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
