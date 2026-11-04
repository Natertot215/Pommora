### 1 — The Switch — Scout Report

**BASE:** `cd813afdd`

Probes ran through `vite-node` against the real modules (`setList`, `setListKind`, `landEdit`, `blockAt`, `subBlockAt`); every "→" output below is observed, not inferred. Inferences are marked **Inferred**.

#### What's True

1-T1. There are two list-type writers. `setList` (Lists ▸ and `/`, via `editFor`'s `list:` case) rewrites every selected line's body as `pad + indent + marker + inner`, writes every sequenced marker as `1. `/`A. `, and returns `relist: true` so the renumber filter counts them — `Core/MarkdownPM/Input/format.ts:174-175`, `:299-314`. `setListKind` (the grip's Type ▸) rewrites only the marker span of every marker line in the range and numbers them itself with per-level counters — `format.ts:340-352`.

1-T2. There are therefore two numbering definitions. `setListKind` counts by `marker.level` (`counters.length = level + 1`, `format.ts:344-345`); `renumberRun` counts runs keyed by the exact indent string and kind, carrying deeper lines and unquoted blanks — `Core/MarkdownPM/Engine/listDragModel.ts:159-209`. They disagree on observed input:
- mixed tabs and spaces: `- a\n\t- x\n  - y` → grip `1. a\n\t1. x\n  2. y`; the same edit through the renumber → `  1. y`.
- deeper than level 3 (`indentLevel` caps at `MAX_NESTING_LEVEL`, `Engine/detect.ts:522-529`): `- a\n\t\t\t- b\n\t\t\t\t- c\n\t\t\t- d` → grip numbers c as `2.` and d as `3.`; the renumber gives c `1.` and d `2.`.
So the next Enter or Tab in a grip-switched list can silently recount what the grip just wrote.

1-T3. The grip bypasses the renumber entirely: it dispatches `setListKind`'s changes with `userEvent: 'input'` — `Core/MarkdownPM/Menus/gripMenu.ts:164-166` — where every other edit goes through `applyEdit`, which derives the event from `relist` (`Input/applyEdit.ts:26`, `Input/listRenumber.ts:9-11`). The heading branch of the same file already uses `applyEdit` (`gripMenu.ts:114`). The counters in `setListKind` exist only because of this bypass.

1-T4. `setList`'s toggle-off: `lines.every((l) => l.kind === kind) ? '' : listMarkerText(kind)` — `format.ts:302`. Observed side effects beyond "turn items back into lines":
- `1. a\n3. b` → Numbered → `a\nb` (a gapped run gets its markers stripped rather than repaired).
- `- [x] a\n- [ ] b` → Checklist → `a\nb`.

1-T5. `setListKind` writes `listMarkerText(kind)` wherever the marker text differs, so re-picking Checklist unchecks: `- [x] a\n- [ ] b` → `- [ ] a\n- [ ] b` (`format.ts:347-349`, `listMarkerText` returns a fixed `- [ ] ` at `format.ts:227-228`). It also rewrites `+` bullets to `-` on a Bulleted re-pick.

1-T6. The grip's block is `blockAt`'s `list` span, which ends at a blank line (`Engine/blockModel.ts:44-59`, `:139-145`), while the renumber treats items a blank apart as one loose list (`listDragModel.ts:167-169`). Observed: `1. a\n\n2. b` → `blockAt` = `{0,4}`; grip Bulleted → `- a\n\n2. b`. `- a\n\n- b\n- c` → grip Numbered → `1. a\n\n- b\n- c`.

1-T7. `blockAt` resolves quoted and callout lines as `blockquote`/`callout` before `list` (`blockModel.ts:74-79`), so `contextFor` offers Type ▸ only on unquoted lists (`gripMenu.ts:69-72`). Observed: `> - a\n> - b` → `blockquote`; `> [!note] T\n> - a` → `callout`. `setListKind`'s quote-aware parse (`listMarkerLines`, `format.ts:316-328`) is effectively reachable only from its own test (`Input/format.test.ts:253-255`); the one production path that meets a quoted line through it is a list block that runs into one (1-T8).

1-T8. The grip's range is not fence-aware: `- a\n  \`\`\`\n  - b\n  \`\`\`\n- c` → grip Numbered → `1. a\n  \`\`\`\n  1. b\n  \`\`\`\n2. c` (rewrites a marker inside code). A list block also runs into a following quoted line: `- a\n> - b` → `blockAt` = `{0,9}` `list`.

1-T9. `setList` treats a wrapped continuation as a plain line: `- a\n  wrapped\n- b` selected → Numbered → `1. a\n  1. wrapped\n2. b`. It writes a marker into a callout head: `> [!note] T` → Bulleted → `> [!note] - T`.

1-T10. The renumber's relist pass only pushes the run below a changed line when the *new* marker is sequenced — `Input/listRenumber.ts:28-38`. Observed: `- p\n\t1. a\n\t2. b\n\t3. c` → Lists ▸ Bulleted on `b` → `- p\n\t1. a\n\t- b\n\t3. c` (c keeps `3.`; by run rules it should read `1.`). The gate is deliberate for new lines: `'continuing a bullet leaves the numbered list below it alone'` — `Input/listRenumber.test.ts:82-84`.

1-T11. Placeholder writes plus the relist pass already produce Decision 15's counts for partial switches (observed via `landEdit(..., 'input.list')`):
- B and E under A rewritten to `1. ` → `\t1. B … \t2. E`, C and D untouched.
- `- A\n\t1. B\n\t- X\n\t1. E`, X → `1. ` → `1. B / 2. X / 3. E`.
- `5. a\n- b\n- c`, b and c → `1. ` → `5. a\n6. b\n7. c` (a settled row anchors a top-level base, `listDragModel.ts:197-201`).

1-T12. `/` never reaches an existing item. The block query opens only on a line that reads exactly `/query` from column 0 — no indent, quote, or marker — `Core/MarkdownPM/Menus/blockQuery.ts:17-18`; `pick` deletes the query and runs the action at that now-empty plain line — `Menus/useBlockMenu.ts:41-50`. Its list rows are always the "plain line becomes an item" case.

1-T13. No keyboard chord writes a list type: `FORMAT_ACTIONS` keeps only `format:` commands — `Input/formatKeymap.ts:8-10`.

1-T14. Lists ▸'s check reads the clicked line's own marker kind alone — `Input/formatState.ts:37`, `Actions/editorMenu.ts:119-120`. The grip's check reads `listKindOf` over the block — `gripMenu.ts:70`, `format.ts:330-337`.

1-T15. Setting plumbing as it stands: `SETTINGS` holds `outlinerLines: flag(false)` — `Core/Settings/personalization.ts:147`; the Pages & Writing first section lists Editor Scale, Outliner Lines, Show Icon In Title — `Core/Settings/frames.ts:710-724`; values reach the editor only through `EDITOR_SETTING_KEYS` → `editorSettingsOf` → `host.settings()` — `Core/MarkdownPM/api.ts:87-111`, `:129-150`. `outlinerLines` is not an editor key; it's applied as a CSS class (`Settings/applyPersonalization.ts:56`). `editFor` takes no settings — `format.ts:155-160`. Both of its callers hold a host: `Menus/menu.ts:22` (`view.state.facet(editorHost)`) and `Tables/cellStatic.tsx:512` (`host`).

1-T16. The text right-click acts on the *live* selection at reply time — `menu.ts:17`, `:22` — while the request was built from the click (`menu.ts:33-36`, whose comment says the browser seats the word under a right-click after the handler). The resting cell instead carries its computed `[from, to]` into the reply — `cellStatic.tsx:512`, `:520-535`.

1-T17. In cells, `format.ts`'s line reader strips a quote prefix (`splitPrefix` → `quotePrefix`, `format.ts:237-242`) although a cell reads `>` as literal text (`detect.ts:509`) and the cell editor parses unprefixed (`Tables/CellEditor.tsx:60-63`); `edits.ts` uses the scope-aware `blockPrefix(line, scope)` instead (`Input/edits.ts:78`).

#### What's Reusable

1-R1. `listMarkerText(kind)` with its default `n = 1` is already the placeholder writer the renumber expects — `format.ts:222-234`.

1-R2. `relist: true` → `editEvent` → `listRenumber` is the one numbering path, working on pages, live cells (installed by `surface.ts:26-31` for both scopes), and resting cells (`cellStatic.tsx:438-440` → `landEdit`) — `listRenumber.ts:11-44`.

1-R3. `renumberRun`'s backward and forward walk (`listDragModel.ts:168-196`) already *is* the sibling definition: a line at the same indent with a marker belongs, a line nested under the indent or (outside a quote) blank carries, anything else ends it. It filters to one kind; dropping that filter yields "the group", and the run becomes "the contiguous same-kind slice of the group around this item". Quote prefixes are part of the indent string because it reads `parseListMarkerPrefixed` (`detect.ts:626-629`), so quoted and callout-body lists are addressed with no extra rule, and a callout head ends the walk (its body isn't a marker).

1-R4. `selectedLines` (`format.ts:259-296`) is the shared line reader for `setHeading` and `setList`; it holds a nested item's indent when a plain line becomes an item. It walks a contiguous range, so it serves the range path's plain lines while the addressed items come from `scan.markers` (1-A1).

1-R5. `listKindOf`'s "one kind or null" fold (`format.ts:330-337`) is Decision 14's check verbatim, once it reads the addressed lines rather than a raw range.

1-R6. `inSealedLine(scan, i)` (`Engine/docScan.ts:384-391`) is the existing "no list counting in code, math, or tables" rule the renumber applies (`listRenumber.ts:40-41`); the switch should skip the same lines.

1-R7. Pure writers in `edits.ts` take `settings: Personalization = {}` and read it with `settingOf` (`Input/edits.ts:128-130`, `:426-434`), with callers passing `host.settings()` (`Input/markdownInput.ts:51`, `:86-90`). That's the shape for `editFor`. **Tripped over:** the parameter is typed `Personalization`, while what's handed in is `EditorSettings`. It works because the editor keys are a subset of the setting keys.

1-R8. `subBlockAt` (`listDragModel.ts:35-54`) computes an item plus its continuation and nested branch; observed on the Decisions example for B → `\t- B\n\t\t- C\n\t\t- D`. **Inferred:** the off rule doesn't need it, because the sibling walk's forward pass already spans every nested line through the last sibling's branch.

1-R9. Not reusable: `railIntents` (`Engine/intents.ts:374-433`) keeps only a per-level kind stack for drawing (`railKind[level]`, `:400`) and exposes no parent or sibling lines; `outlineTree` (`Engine/outlineTree.ts:6-19`) is heading-typed.

#### What Contradicts the Decisions

1-C1. Decision 18 vs. the code: the grip and Lists ▸ run through different writers with different numbering (1-T1, 1-T2, 1-T3). Making them one switch also means one numbering definition — the renumber's — which changes the grip's output on mixed-whitespace and deeper-than-3 lists (1-T2) and keeps a top-level base it currently resets.

1-C2. Decision 8 vs. the grip's repair: `setListKind` documents and tests "picking Numbered over a broken sequence repairs it" (`format.ts:339`, `Input/format.test.ts:261-263`). If picking the applied type changes nothing, a re-pick over `1. a\n1. b` no longer repairs it. The renumber acts only on `input.list` and `delete` edits (`listRenumber.ts:17-18`), so a broken run can arise in the editor too: a paste (`input.paste`, `Links/pasteLink.ts:88`, `Tables/cellStatic.tsx:498`) or hand-typed `1.` markers leave it as written, as does a file written elsewhere. Once the repair goes, the remaining repair is an Enter, Tab, Shift+Tab, or line deletion inside that run, and no menu fixes it directly. **Inferred:** Decision 8 should still win, but the trade-off is real.

1-C3. Decision 13 vs. what "whole block" means: the grip's block stops at a blank line while numbering reads one loose list across it (1-T6). A grip switch on a loose list leaves the far half on the old type, and with one numbering path a top-level run then keeps the base its untouched half holds. The decision isn't wrong, but "block" and "list" disagree in the code and the glyph menu's top-level group (see 1-Q2) has to pick one of them.

1-C4. Decision 11's `/` clause is satisfied by construction and adds nothing: `/` only opens on a bare column-0 line, never on an item (1-T12). The rule that matters for `/` is "a plain line still becomes an item".

1-C5. Decision 17 vs. the reply path: the text right-click acts on whatever selection exists when the reply lands (1-T16). If the platform seats the clicked word, the switch receives a one-word selection and applies the selected-items rule (that item alone) instead of the group rule. The write path can't tell Nathan's selection from a seated word; the menu side has to pass the range it computed, as the resting cell already does. (Scout 2's ground, flagged here because it decides which rule the switch receives.)

1-C6. Decision 2's "share its type" vs. the run concept: the renumber's run is *contiguous* same-kind siblings, while "items in its group that share its type" reaches past a differently-typed sibling (B bullet, X numbered, E bullet → B and E). That's a deliberate, workable difference, but it means "group" isn't "run" — see 1-Q3.

1-C7. `.claude/Features/MarkdownPM.md:24` ("Type ▸ … counting from 1 or A", "Lists ▸ … removing the marker only when every selected line already has one") describes both behaviors the decisions remove.

#### What Could Be Removed or Consolidated

1-X1. `setListKind` and its counters go; the grip calls the one switch over its block range through `applyEdit` like its heading branch. `format.ts:339-352` (−14), `gripMenu.ts:165-166` → one `applyEdit` line (−1).

1-X2. `listMarkerLines` goes; addressing reads `scan.markers` (already parsed with the prefix, `docScan.ts:83`). `format.ts:316-328` (−13).

1-X3. The toggle-off goes: `format.ts:302` becomes the skip-if-same-kind test inside the write loop (≈0).

1-X4. `renumberRun`'s walk is hoisted into one sibling walk that both numbering and addressing read — one definition of "which items belong together" instead of a numbering rule plus a separate addressing rule. Estimated +5 for the hoist's signature and return.

1-X5. `listKindOf` is kept and re-pointed at the addressed lines; the grip's `current` and the glyph menu's check share it (≈0 to +2).

1-X6. `editFor`'s `list:` case is the only list-type entry; the glyph menu reuses the existing `list:<kind>` action at the glyph's line rather than adding a `listKind:` twin. Whether the grip's `listKind:` action type (`Actions/gripMenu.ts:20`, `:74`) then also folds into `list:` is a menu-model call for Scout 2; the write side doesn't need two action names.

#### Approaches

1-A1. **One Switch, Addressed by Range:** `setList(scan, from, to, kind, settings)` becomes the only list-type writer. A caret (`from === to`) on an item, or on a continuation line (resolved to its owning item), addresses its group: on → the siblings sharing its kind; off → every marker line from the first sibling through the last sibling's branch. A range addresses each touched item (continuations resolve to their item), turns each plain non-blank line into an item, and skips callout heads; the grip passes its block range and so gets "every item in the block" with no mode of its own. Because on-mode targets aren't contiguous (B and E, skipping C and D), addressing yields a set of line indices read from `scan.markers`, and the write loop rewrites each marker span; `selectedLines` stays only for the range path's plain lines (and `setHeading`). Every addressed line already of the picked kind is skipped, sequenced markers are written as `1. `/`A. `, sealed lines are skipped, and `relist: true` lets the renumber count. The setting reaches it as `editFor(action, scan, from, to, settings: Personalization = {})`, which `setList` reads with `settingOf`, the shape `edits.ts`'s transforms already take (`Input/edits.ts:128-130`) with callers passing `host.settings()` (`Input/markdownInput.ts:51`). A list-only boolean on the generic dispatcher would be an odd one out, and the default keeps every other `editFor` caller and test unchanged. Adds: the caret-group branch and the line-set writer (≈+15), continuation-to-owner lookup (≈+5), the sibling-walk hoist (≈+5), `settings` through `editFor` and two callers (≈+3), the setting (personalization +1, frames row +6, `EDITOR_SETTING_KEYS` +1), the renumber fix (≈+2). Removes: `setListKind` (−14), `listMarkerLines` (−13), the toggle, the grip's custom dispatch (−1), and the second numbering definition. Estimated net ≈ +10 (±10). Trade-offs: the grip loses its broken-sequence repair (1-C2) and changes output on mixed-whitespace and deeper-than-3 lists (1-T2), in exchange for one numbering rule everywhere.

1-A2. **Reach Enum:** the same writer takes an explicit `reach: 'block' | 'group' | 'branch' | 'selection'`, with each caller naming its reach. Adds a union, a switch, and a fourth caller-visible concept, ≈+15 over 1-A1. Removes the same. Net ≈ +20. Trade-offs: explicit at call sites, but the grip's "block" and the selection's "touched items" are the same computation over a range, so two of the four arms are one thing stated twice. It fails *One Way*.

1-A3. **Keep `setListKind`, Retarget It:** keep the counting writer and point the glyph menu at it with a computed range; Lists ▸ keeps `setList` minus its toggle. Smallest diff (≈+15 for addressing), but it leaves two writers and two numbering definitions, with the glyph menu inheriting the grip's unchecking (1-T5), fence (1-T8), and level-counting divergence (1-T2). Net ≈ +15, and nothing consolidates.

**Recommendation:** 1-A1. It's the only shape where Decision 18 holds without a mode argument: the five entry points differ only in the `from`/`to` they pass, the grip loses its private writer and counters, and numbering has one owner (`listRenumber`) and one sibling definition shared with the switch's own addressing. The line count is roughly neutral; the justification is two writers → one and two numbering rules → one, plus four observed bugs closed by construction (1-T4 gapped-run stripping, 1-T5 unchecking, 1-T8 fence rewrite, 1-T9 continuation conversion). The renumber fix (1-T10) is a must-do under any approach, because every entry point can now take an item out of a numbered run.

Sketch of the renumber fix, at `listRenumber.ts:35`: also count a line as sequenced when its marker in `tr.startState` was (`docScan(tr.startState.doc)` is cached), so leaving a numbered run recounts the run below while a brand-new bullet line, with no prior marker, still leaves it alone (keeps `listRenumber.test.ts:82-84`).

#### Edge Cases

1-E1. **Quoted list (`> - a`):** On, off, and selection behave as unquoted, because the sibling indent carries the `> ` prefix (1-R3). A `>` blank line ends a quoted group, as it ends a quoted run (`listDragModel.ts:168-169`). Today no grip Type ▸ exists there (1-T7), so the glyph menu becomes the first group-level switch reachable inside a quote; the switch needs no extra code for it.

1-E2. **Callout body:** It's addressed like a quoted list, and the head ends the walk. A range across the head should skip the head line rather than writing `> [!note] - T` (1-T9); `setBlock`'s callout case already refuses on `isCalloutHead` (`format.ts:388`), and the switch's range loop should do the same (+1).

1-E3. **Loose list (`- a\n\n- b`):** Under the shared walk, a top-level group spans the blank (numbering's rule), so the glyph menu reaches both halves while the grip (block range) reaches one (1-T6, 1-C3, 1-Q2). In a quote, the blank ends the group.

1-E4. **Wrapped continuation:** With a caret on it, it acts on its owning item. In a range, it resolves to its item and isn't turned into an item (fixes 1-T9). The grip's block range then never converts continuations, matching `setListKind`'s pinned "leaves wrapped continuation lines alone" (`format.test.ts:249-251`).

1-E5. **Table cell (`scope === 'cell'`):** The cell's own text is a separate doc, so the group is computed inside the cell, and the renumber runs on both cell surfaces (1-R2). Quote prefixes are the wrinkle (1-T17): the line reader treats `> ` as a prefix in a cell, where it's literal text. It's harmless for addressing (a `> -` line never shares an indent with a drawn item), but `Lists ▸` on `> a` in a cell still writes `> - a`, which the cell draws as prose. That bug predates the feature and lives in the switch's line reader; resolve it by giving `splitPrefix` the scope, or record it.

1-E6. **Mixed whitespace siblings (`\t- x` / `  - y`):** Both draw at level 1, but the indent strings differ, so under the shared walk they're separate groups (as they're separate runs today). On: right-clicking x leaves y. A level-based group would merge them but contradict how they number (1-T2, 1-Q4).

1-E7. **Deeper than level 3:** `indentLevel` caps at 3, so a level-based rule would treat `\t\t\t` and `\t\t\t\t` as siblings. The indent-string walk keeps them apart, as the renumber does. **Inferred:** `subBlockAt`'s `lm.level <= head.level` break (`listDragModel.ts:49`) has the same cap, so a level-3 item's drag branch omits deeper items. That's drag's domain; record it.

1-E8. **Checked checklist re-pick:** Skipped as the same kind, so `[x]` survives under every rule (fixes 1-T5). Switching *to* another kind drops the box, as today.

1-E9. **`+` bullets and `- []`:** `+` is `bullet` kind and is skipped on a Bulleted pick (today the grip rewrites it). `- [] a` parses as `bullet` with an empty box (`detect.ts:603`), so it's skipped on Bulleted and rewritten on Checklist.

1-E10. **Leaving a numbered run:** On, off, or selection, numbered → bullet on a middle item needs the renumber fix (1-T10).

1-E11. **Top-level item, off:** The group is every top-level sibling plus all nesting, which equals the grip's reach except across blank lines (1-E3).

1-E12. **Code inside a list:** Sealed lines are skipped (fixes 1-T8). In cells, `scanDoc` still detects a literal fence, so an item below a cell's literal triple-backtick line would be skipped. It's rare; record it alongside 1-E5.

1-E13. **Undo:** `input.list` isn't in CodeMirror's joinable set (`/^(input\.type|delete)($|\.)/`, `node_modules/@codemirror/commands/dist/index.js:471`), so the switch plus its renumber is one undo step of its own (Decision 9 holds).

#### Questions for Nathan

1-Q1. **The grip's sequence repair (1-C2):** Today, re-picking Numbered on a list that reads `1. 1. 1.` fixes it to `1. 2. 3.`. Under "picking the type already applied changes nothing", that repair goes away. Broken numbering does happen inside the app: pasting a list or typing `1.` by hand isn't recounted. Afterward, the only fix is pressing Enter, Tab, or deleting a line inside that list, which recounts it. **Recommended:** let it go; Decision 8 is simpler and holds everywhere. If a menu fix for broken numbering matters to you, it's better as its own explicit action than as a side effect of re-picking a type.

1-Q2. **What's the group of a top-level item (1-C3, 1-E3)?** Items a blank line apart already count as one list for numbering, but the grip treats each blank-separated chunk as its own block. **Recommended:** a top-level group is the whole list, blank lines included, the same rule numbering uses. Separately, should the grip's Type ▸ also reach across blank lines? **Recommended:** no. Keep the grip at its block, as 1-A1 has it, since the grip is drawn per block and Decision 13 says "block". A loose list switched from one chunk's grip can then end up half-switched, and the glyph menu with the setting off is the one-pick way to switch all of it. The alternative is having the grip act as an off-mode pick on its first item. That covers loose lists, but it misses items when a block's first line is indented deeper than the lines after it (a list block can start at an indented line, `Engine/blockModel.ts:44-59`), which the block range handles.

1-Q3. **Same-type siblings across a different-type sibling (1-C6):** With the setting on and B bulleted, X numbered, and E bulleted under A, should right-clicking B change B and E (skipping X), or only B, since X breaks the run? **Recommended:** B and E, as Decision 2 reads.

1-Q4. **Siblings indented differently (1-E6):** Two items can look like the same level while one is indented with a tab and the other with two spaces. Numbering already treats them as separate lists. **Recommended:** the switch agrees with numbering and treats them as separate groups, so there's one definition of "together".

1-Q5. **Lists ▸'s check (1-T14):** Today it marks the clicked line's own type. Should it follow Decision 14 (marking the type every addressed item shares) the way the glyph menu will? **Recommended:** yes. It's the same addressed set through the same `listKindOf`, and the menu request would then need the setting. That's Scout 2's wiring.

#### Tests and Docs Touched

1-D1. `'re-applying the same kind clears it'` — toggle-off; becomes "re-applying changes nothing" — `Core/MarkdownPM/Input/format.test.ts:165-167`.
1-D2. `'clears only where every line already reads that way'` — toggle-off; the mixed half stays — `format.test.ts:186-191`.
1-D3. `setList(doc, …)` call signature (doc → scan) across the `setList` describe — `format.test.ts:158-212`; `Core/MarkdownPM/Input/listRenumber.test.ts:93-96`; `Core/MarkdownPM/regressionPins.test.ts:173-177`.
1-D4. The `setListKind` describe is re-expressed as `setList` over a range; `'repairs a broken ordered sequence'` is deleted (1-Q1) — `format.test.ts:234-264`, `:261-263`. `'numbers per indent level'` (`:245-247`) still holds through the renumber, as does `'finds a quoted marker'` (`:253-255`).
1-D5. The `listKindOf` describe's signature changes (range → addressed lines) — `format.test.ts:214-232`.
1-D6. Grip flow pins stay green by expectation (same outputs for these inputs), now through `applyEdit` — `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:81-97`, `:187-192`. `Core/Actions/gripMenu.test.ts:51-60` is unaffected.
1-D7. Cell Lists ▸ pins stay green (plain lines) — `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx:246-260`.
1-D8. One new pin earns its place: "switching a numbered item out of its run recounts the run below", the 1-T10 fix — `Input/listRenumber.test.ts` beside `:82-84`. It's defined behavior that every entry point newly reaches.
1-D9. Doc: the last sentence of the Lists bullet is rewritten in one sentence — `.claude/Features/MarkdownPM.md:24`. The grip table row stays as is (`:138`).
1-D10. Doc: one new settings-table row under Outliner Lines — `.claude/Features/ConfigurationPM.md:151`.

#### Comment Ledger

1-L1. Removed: `/** Read prefixed, matching the resolver … */` with `listMarkerLines` — `Core/MarkdownPM/Input/format.ts:316`.
1-L2. Removed: `/** A marker that already reads as it should yields no edit, so picking Numbered over a broken sequence repairs it. */` with `setListKind` — `format.ts:339`.
1-L3. Rewritten in place (count unchanged): `setList`'s doc comment states the addressing (a caret takes its group, a range takes what it touches) — `format.ts:298`.
1-L4. Moved with the hoisted walk (count unchanged): `renumberRun`'s run-rule comment — `Core/MarkdownPM/Engine/listDragModel.ts:167`.
1-L5. Reworded in place (count unchanged) if the sequenced gate changes: `listRenumber`'s header — `Core/MarkdownPM/Input/listRenumber.ts:13`.
Net: −2.
