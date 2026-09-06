## Task 15 — Kill-List Inventory

Built by re-deriving every candidate against the tree at `eba69eda`, not by trusting the audits: most of A02/A08/A10/A12/A14/A16's high-confidence lists had already landed in Tasks 3–14 and in the whole-tree simplification pass.

### Bucket A — Dead regardless (deleted)

| Item | Where | Lines |
| --- | --- | --- |
| `allStructuralIds` | `Core/Views/Bands/bandDndModel.ts` | 13 |
| `skipTopLevel` option | `Core/IO/walk.ts` | 5 |
| `openSettings` store action | `Core/Interface/layoutSlice.ts` | 2 |
| `setNavOverride` store action | `Core/Interface/Windows/windowSlice.ts` | 2 |
| `setProfileSubtitle` op (union member, dispatch arm, confirm arm) | `Core/Pages/mutateRequest.ts`, `Core/Nexus/mutate.ts`, `Core/Nexus/mutatePatch.ts` | 12 |
| the nav search `extras` / "can't be opened" path + `splitSearch` + `SearchResult` | `Core/Navigation/useNavData.ts`, `NavList.tsx` | 28 |
| `containerOf` (≡ `parentOf`) | `Core/Nexus/valuesChanged.ts` | 3 |
| `reorderTopInTree` (≡ `reorderChildrenInTree(tree, '')`) | `Core/Nexus/treePatch.ts` | 4 |
| the `capture`/`C` generic on the governed sweep (zero producers) + `sweepContextRoots` adapter | `Core/Properties/governedSweep.ts`, `Core/Contexts/contextCascade.ts` | 22 |
| 11 zero-reader bridge CSS vars + 2 zero-reader button height vars | `UIX/Theme/theme-vars.css.ts`, `UIX/Buttons/button-base.css.ts` | 13 |
| 178 dead `export` keywords narrowed (no line delta) | tree-wide | 0 |

### Bucket B — Dead by standing rule (defensive-branch sweep)

| Item | Where | Lines |
| --- | --- | --- |
| 7 catches on envelope channels that cannot reject (`serveIpc` wraps every handler) | `Core/Session/nexusSlice.ts` | 10 |
| `scopeSet`'s `typeof key !== 'string'` guard on a `string` parameter | `Core/Interface/handlers.ts` | 1 |
| the no-nexus guard at 19 handler sites → one `withRoot` combinator | eleven `Core/*/handlers.ts` + `Core/Contract/handlers.ts` | 30 |

Swept and **kept**, with the reason: a compiler-driven pass (TS type checker, `??` and `?.` whose left side the type proves present) over all four projects found 71 candidates. Nearly every one is an indexed read of a `Record`/array — TypeScript types those as present without `noUncheckedIndexedAccess`, but they are genuinely absent at runtime, so removing the guard would introduce a bug. Also kept: `treeIndex.walk`'s `?? []` (pinned by `containerTargets({} as NexusTree)`), `window.matchMedia?.` (jsdom does not implement it), the `localStorage` try/catch pair (a renderer partition can refuse storage).

### Bucket C — Presumed shape, confirmed before touching

Confirmed live and left alone (each with the control that proved it):

- `.tabs-compact` — ruling; `WindowTabStrip.tsx:110` applies it.
- `--disclosure-indent` — the audit called it unread; `UIX/Table/table-tokens.css:10-12` reads it through a Biome-wrapped `var()`. The wrap is exactly the blind spot the brief names.
- `splitAtTile` / `tileIds` / `validateLayout` — production-dead but the construction and invariant primitives the whole `Core/Tiles/Layout` suite is written against (27 references in `ops.test.ts` alone). Deleting them means rewriting the suite; kept, logged.
- `closeSession` — production-dead, 18 test files use it as the session reset. Kept as the test escape hatch, logged.
- `sessionDb()` / `sessionVersionsDb()` — zero production consumers, 21 test files reach raw SQL through them. Kept as the test escape hatch, logged.
- `decorationsFor` (A10 H1) and `parseTable` (H2) — the byte-equivalence oracles their tests pin. Kept per the brief's H1/H2 clause.
- `PickerMenu`'s non-self-managed branch — `picker-base.test.tsx` drives it and two Showcase leaves use it; not unreachable.
- Dead CSS classes: a selector-vs-reader scan over all 573 declared classes found 24 with no literal reader, every one template-generated (`md-h${n}`, `resize-edge-${grip}`, `window-panel-${side}-${mode}`). None dead.
- Orphan-file scan: no source file is unreachable.
- Dependencies: all 17 workspace dependencies have importers. The six dead ones left at Task 1.
- Dead build config: `rg "Pommora/"` over every root and workspace config is clean; the one hit is a user-agent string.

### Never-delete list, checked

`.claude/**` untouched · `Showcase/**` untouched · every test whose subject survives kept · `VIEW_TYPES`' four unbuilt entries, the inert picker tiles, `AgendaMode.tsx` and its plumbing, the two empty Settings frames, `NavMenu`, `createdAt`, `list-rounded`, `chart-gantt`, the asset-directory migration, the Glass Controls/Segment pair, `.tabs-compact` — all present and untouched. `KNOB` / `LOAD-BEARING` / `(Nathan's call)` / `// PLACEHOLDER` markers byte-for-byte. The ratified mobile `--safe-*` pre-paving in `Core/Interface/styles.css` kept as scaffolding rather than cut.
