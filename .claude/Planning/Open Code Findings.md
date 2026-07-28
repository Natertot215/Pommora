# Open Code Findings

Verified findings surfaced by the doc sweep and the filter investigation, minus everything that has
since landed. Each entry carries the `file:line` it was confirmed at — re-ground it before acting;
several entries in the first pass had already been fixed by the time they were read.

## Live defects

**The sidebar's mode-exit overlay mounts a second Agenda list.**
`Sidebar/Sidebar.tsx:732` renders `layerFor(exit.mode)` under an epoch key, and `layerFor` builds a
fresh `<AgendaMode />` (`:697`). `AgendaMode` fetches its own data on mount
(`Sidebar/AgendaMode.tsx:15-23`), so leaving Agenda paints "No tasks or events" over the outgoing
list for the whole sweep and fires a second `agenda:list`. The Collections and Contexts layers are
immune — they render from already-computed nodes.

Fix at the source: lift the fetch out of the component so both the active layer and the exit overlay
render one set of data. Caching inside the component works around the cause instead of removing it.

**A generic rename of a Space or Context skips its membership cascade.**
`main/mutate.ts:236` routes every non-page kind to a bare `renameFolderEntity`, under a comment
asserting contexts are "referenced by stable id". Membership is keyed by the bracketed TITLE, so that
is false — the dedicated `renameContextOp` / `renameSpaceOp` (`crud/contextCascade.ts:186,249`) are
what actually unlink and relink. Latent only because the renderer dispatches the dedicated ops
(`store.ts:1667,1671`). The `delete` case immediately below DOES branch on `kind === 'space'`; rename
should be symmetric with it rather than silently taking the wrong path.

## Latent

- **`deleteAgendaItem` ignores the user's trash mode.** `crud/agendaEntity.ts:87` hardcodes
  `trashWithTimestamp`, so the "system trash" setting won't apply once the agenda write path is wired.
  Test-only callers today.

- **`trashMode` has no renderer writer.** Live in main (it routes deletes), settable only by
  hand-editing `pommora.json`, and absent from Settings.

- **The SQLite index rebuilds cold on every mutation with no in-flight guard.** Two rapid edits race
  and the second's delete can land under the first's build. The index has no query consumer yet, so
  nothing reads the damage.

- **`PommoraError.code` flattens to a bare string at the IPC boundary** across ~47 handlers, which
  makes the closed error union unreachable from the renderer.

- **`TableView.tsx:1466`** back-solves the zoom factor from `getBoundingClientRect().width / width`
  during a resize — the exact layout-read anti-pattern the file names at `:1099-1101`. One
  `resolvedZoom(gridEl)` closes it.

## Adjudication needed

- **Building the agenda's built-in Status is not a one-line seed.** `main/properties/schema.ts:64`
  rejects any reserved id at add-time, so `addAgendaProperty` would refuse `_status`. Needs a seed
  path past the validator plus a guard in the delete path.

- **Icon Picker key collision.** The picker cell draws from `ALL_ICONS` (`IconPicker.tsx:222`) while
  `Icon` resolves curated-first (`symbols/index.tsx:215`), so picking Lucide's Table or Lock renders
  Pommora's glyph instead of the one shown.

- **Sub-Set openability.** The sidebar says expand-only; search, Back-nav and DetailPane all open a
  Sub-Set as a full container view. Either close the hole in the nav and resolve indexes, resolve a
  Sub-Set hit to its depth-1 ancestor, or ratify what it already does.

- **The colour-ordering line cut from DesignPM** ("fills heaviest, strokes lighter, text-washes
  lightest") contradicts the token opacities — separators sit above the top fill step. Deleted rather
  than restated; confirm whether that ordering is real intent expressed another way.

## Code-tree docs

These sit inside `src/` and no feature-doc pass could reach them.

- `design-system/symbols/Symbols.md` — the registry's own mirror doc. Line 17 still says "Context
  tiers (Area/Topic/Project)"; line 19 assigns circle-dashed to Status (it is progress-check); line 44
  gives link-2 a "Context/Relation property type" that does not exist.

- `design-system/components/README.md` — states the one-folder-per-component rule absolutely (ruled
  deferred intent, not a held rule) and claims an `index.ts` barrel plus an `@/design` alias, neither
  of which exists.

## Resolved — do not re-flag

`ENTITY_ICON_KINDS` no longer ships area/topic/project. `SectionHeader.onAdd` and the stranded
`.section-add` rule are gone. The filter pane's first row carries its clear-×. Empty structural bands
prune under an active filter. The pane's fields hover-scroll on the shared `OverflowScroll`. A move
and a property-value write both stamp `modified_at`. A `[[link]]` inside code survives a rename. A
pipe can't be a title and an alias rides through the cascade. `.trash` mirrors the folder chain a
delete came from.
