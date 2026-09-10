## Handoff — Pommora

> **User Prompt:** Execute `.claude/Planning/Block Menu — Implementation Plan.md` (ratified 09-09-2026): orchestrate only, Opus agents implement and review, one writer on the tree, per phase implement → simplify → attack → fix → commit, Gate 2 a declared stop with a manual check list; no comments from any agent; MarkdownPM never imports the store. At the stop Nathan redirected the layout (width knob, a Link section, Divider, phantom-toned query, caret seats, title matching, no initial highlight) and then closed it: run a targeted attack on footnotes, every transformation, caret placement, and cross-feature edges, defer nothing, write History "MarkdownPM Block Menu", reconcile the Codebase Audit report and republish its artifact in Pommora's theme, sweep MarkdownPM.md for accuracy, reconcile Context and Handoff retiring the states and menu-system focuses and keeping glances, point the upcoming focus at the Codebase Report's remaining items, and push to origin.

#### Current Focus

**Session ID:** 6b0e857e-d460-45bc-a39a-8b796e042333
**Dates:** 09-09-2026 → 09-10
**Model:** Fable 5.1 supervising, Opus 5 implementing and reviewing

**The MarkdownPM Block Menu, closed.** The session opened on a ratified three-phase plan for a `/` pane and ran it end to end: Phase 1 built the React-free catalog in `Core/Actions/blockMenu.ts`, made `selectedLines` admit a caret-only blank line, and shared the caret geometry and key guard between the two editor panes; Phase 2 built the trigger over the cached scan, the hook, the pane, its jsdom flow test, and the mount in `MarkdownEditor.tsx`; Phase 3 wrote the record. Every gate ran simplify → attack → fix, and the finds were real: a bare `>` line took its marker glued to the prefix, a whitespace-only line became a nested bullet, and — the one High before the stop — a pane held through its exit animation kept the closed render's click handlers, so a click on the fading pane applied a block against a stale range. The `[[` pane had carried that hole since before the plan; both picks now refuse unless the shared ctl reads open.

**Nathan's stop redirected the surface.** He asked for a width knob (`BLOCK_MENU_WIDTH` at the top of `BlockMenu.tsx`, 140 at close), a Link section (Connection, Markdown Link alias-first, External Link URL-first through a new `linkText` inline format), `Divider` for the horizontal rule, the typed `/query` in the `[[` pane's phantom tones, a divider and a quote that seat the caret where a writer expects, the filter matching section titles so `/link`, `/embed`, and `/list` keep a whole section, and no row highlighted until an arrow key moves it. All of it landed as Task 5b across seven commits, each reviewed. The Gate 2b simplifier folded the fence/math/table refusal into one `inSealedBlockAt` that `embedSeatAt` reads too, and one `useMenuCtl` cursor that both panes share; its attacker found a Divider written directly under a paragraph reading as a setext heading in every other Markdown reader, fixed by giving the divider the table's leading blank.

**The closeout found two more Highs, both fixed.** A neutral verifier held every requirement; Nathan's targeted attack ran all nineteen rows across nine contexts with one undo each (133 live cells correct) and found that a pre-existing `/word` line became a live menu when the caret landed at its end — its pick unrecoverable — and that Internal Page and Webpage threw `RangeError` on a document's leading blank line through a hand-rolled twin of the `lineStartAt` guard the plan had already added once. The pane now opens only on a document change, `embedInsert.ts` reads `lineStartAt`, a Footnote written on the anchor line keeps a blank between marker and run, and a Table pick always seats the caret below the table. The final gate stands at typecheck 0, lint 0 with no warnings, 362 files / 4396 tests.

**Verified against assumed.** The flow tests pin every clause of the acceptance criterion and every redirect; the closeout smoke launch over CDP observed every acceptance clause on the real Nexus after Task 5b and caught one layout defect — a section heading's emphasis fragment splitting across its flex row — fixed by keeping headings plain (Nathan saw the pane before the redirect). That launch killed a Pommora instance that had been running since 09-08 with four tabs open and relaunched it with the same tabs; no data loss was found. The one thing this session could not do is rewrite history: an amend meant for Task 6's trailer landed on the audit-report commit an agent had placed above it, so `bedab5188` carries the audit change under Task 6's message and `1c74dccb2` is Task 6; both trees are right, the harness declined the rewrite, and the plan's Deviations record it.

#### Completion Criteria

- [x] Every numbered requirement of the plan traces to a landed task, and the acceptance criterion holds in `blockMenuFlow.test.tsx`.
- [x] Every finding from every review pass fixed or carrying a ruling in the plan's Log; no concern carried.
- [x] MarkdownPM.md, ContextPM.md, HistoryPM.md (PM-134), and the grounding document reconciled; the audit report and its artifact reconciled and restyled.
- [x] Gates green at close with no lint warnings.
- [x] `main` pushed to origin.

#### Next Session

- **Rule D-2**, the external-edit reload policy, from the audit's Where Brainwaves Go table; it gates the concurrency topic and unblocks the most.
- **The cheap audit fixes** beside it: the two registry readers (R-17, R-18) and the ready watch-patch id narrowing (R-38).
- **The audit ledger's count.** The report's Method paragraph says 72 findings were issued and the ledger holds 28 open; the artifact's stat reads 44 closed or withdrawn, corrected from a stale 40 this session. Confirm the 72 against the ledger's history if it matters.
- **Two hand-rolled `lastIndexOf('\n', … - 1)` sites remain**, `Engine/parser.ts:12` and `Menus/gripMenu.ts:50`, both traced safe by their own guards; fold them onto `lineStartAt` when either file is next open.

#### Feedback

- "Looks good. Please assign it a fixed-width line in the file so I can tweak that."
- "Each section should have autocomplete fire on its section name itself."
- "H1 shouldn't be highlighted immediately, it's just the first-in-line, not hovered until the hovering actually happens."
- "**THE STANDARD:** The work is finished when a later review of it finds nothing to correct… Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen."
- "Do another final sweep of the MarkdownPM doc to ensure it's accurate — silence isn't contradiction."

#### Session Pointers

- The plan, its rulings, deviations, closeout claim, and verdict: `.claude/Planning/Block Menu — Implementation Plan.md` (Status: Closed).
- The width knob: `BLOCK_MENU_WIDTH` at the top of `Core/MarkdownPM/Menus/BlockMenu.tsx`.
- The catalog and filter: `Core/Actions/blockMenu.ts`; the trigger: `Core/MarkdownPM/Menus/blockQuery.ts`; the hook: `useBlockMenu.ts` beside it.
- The shared pane plumbing: `caretGeometry`, `whenAcOpen`, `useMenuCtl`, `CLOSED_GEOMETRY` in `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts`.
- The three lessons this arc earned: the tail of `.claude/Guidelines/Editor-Internals.md`.
- The audit page: `https://claude.ai/code/artifact/a9f3a52c-cb0f-45dc-900d-03275fd87e9c`, mirrored from `.claude/Planning/Codebase Audit — Report.md`.

#### Working Notes

- **A pane's `open` must be read live, never captured.** `PickerMenu` holds children ~380 ms through its exit; a row's `onMouseDown` from the last open render is still clickable with that render's state. Both editor panes guard on `ctl.current.open`.
- **`useMenuCtl(count, resetKey, drive, initial)`:** `initial = null` is what gives the block menu no highlight on open; the `[[` pane passes 0. `move` from `null` goes to the first or last row by direction; `pick` reads `index ?? 0`.
- **The filter matches titles.** `filterBlockMenu` keeps a whole section when its title has a word starting with the query, so `/link` shows Connection although "Connection" never matches; a row's `at` is `null` when only the title matched, and `emphasized` renders the plain label then.
- **`format:linkText` exists only for the block menu.** No chord and no context-menu row dispatch it; `toggleInline` seats its caret inside the brackets where `format:link` seats it inside the parentheses.
- **The phantom tone follows the grammar, not the pane**, by ruling: a `/word` line draws in the phantom tones wherever the decorations run, a table cell and a read-only editor included, even though the pane opens only on typing.
- **Biome's `useImportType` warning exits 0.** A type-only import written as `import { type A }` passes `npm run lint`'s exit code and still prints a warning; read the output.
- **`git commit --amend --only` amends whatever HEAD is.** With agents committing on the shared branch, confirm HEAD's hash before an amend; this session mislabeled one commit that way.

**FILES ADDED**

- Core/Actions/blockMenu.ts
- Core/Actions/blockMenu.test.ts
- Core/MarkdownPM/Menus/BlockMenu.tsx
- Core/MarkdownPM/Menus/blockQuery.ts
- Core/MarkdownPM/Menus/blockQuery.test.ts
- Core/MarkdownPM/Menus/useBlockMenu.ts
- Core/MarkdownPM/Menus/blockMenuFlow.test.tsx

**FILES MODIFIED**

- Core/MarkdownPM/Autocomplete/AutocompletePane.tsx
- Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts
- Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx
- Core/MarkdownPM/Citations/citationEdits.ts
- Core/MarkdownPM/Citations/citationCreate.test.tsx
- Core/MarkdownPM/Embeds/embedInsert.ts
- Core/MarkdownPM/Embeds/embedInsert.test.ts
- Core/MarkdownPM/Engine/docScan.ts
- Core/MarkdownPM/Input/edits.ts
- Core/MarkdownPM/Input/edits.test.ts
- Core/MarkdownPM/Input/format.ts
- Core/MarkdownPM/Input/format.test.ts
- Core/MarkdownPM/MarkdownEditor.tsx
- Core/MarkdownPM/Tables/CellEditor.tsx
- Core/MarkdownPM/decorations.ts
- UIX/Menus/menu-index.tsx
- .claude/ContextPM.md
- .claude/HandoffPM.md
- .claude/HistoryPM.md
- .claude/Features/MarkdownPM.md
- .claude/Guidelines/Editor-Internals.md
- .claude/Planning/Block Menu — Implementation Plan.md
- .claude/Planning/Codebase Audit — Report.md

**FILES REMOVED**

- .claude/Planning/Slash Command Menu — Grounding.md

**COMMITS**

- `077b5f222` — fix(markdownpm): a section heading stays one plain label
- `862143a0b` — fix(markdownpm): a divider and a table share one trailing blank and seat the caret below what they wrote
- `534c3cf3f` — docs(plan): the Block Menu plan closes — claim, verdict, rulings, and the lessons routed
- `7d8630b4f` — fix(markdownpm): the block menu opens on typing alone; embeds, footnotes, and tables seat the caret where they should
- `8c30eebc6` — docs(markdownpm): the feature doc reads as the code stands
- `bedab5188` — docs(pommora): the block menu's record — Context, History PM-134, the grounding retired
- `1c74dccb2` — docs(pommora): the block menu's record — Context, History PM-134, the grounding retired
- `182d40369` — fix(markdownpm): a divider keeps a blank line above it; the matched section heading is emphasized
- `da348382b` — feat(markdownpm): the block menu filter matches a section's title and opens with no row highlighted
- `47e2bc5f3` — fix(markdownpm): the block menu's rows follow its width knob
- `3d016ef75` — fix(markdownpm): the block menu's model import is type-only
- `26383fc20` — refactor(markdownpm): the block menu's width knob lives in its pane
- `b94097bd3` — feat(markdownpm): External Link and an alias-first Markdown Link; a caret at 0 starts on line one
- `6d30b72a7` — feat(markdownpm): the block menu's stop refinements — a width knob, a Link section, Divider, phantom-toned query, and a divider and quote that seat the caret
- `7e6ffb293` — fix(markdownpm): a pick refuses while its pane is closing
- `9fec99d90` — refactor(markdownpm): one sealed-block predicate and one menu cursor for both panes
- `d4921077b` — refactor(markdownpm): the trigger reads the fence table directly; the ctl list lives in the mount effect
- `fe04d8532` — feat(markdownpm): the block menu pane, its hook, and its mount
- `f7209dc59` — feat(markdownpm): the block menu trigger reads the cached scan
- `bfdb7b126` — fix(markdownpm): a marker behind a bare quote prefix keeps its space
- `81e192714` — refactor(actions): readonly block menu rows, no empty-query guard, one caret-geometry branch
- `75db3a248` — refactor(markdownpm): one caret geometry and a multi-ctl key guard
- `913ed48f9` — fix(markdownpm): a caret alone on a blank line is a selected line
- `0b0783569` — feat(actions): the block menu model and its filter

#### Handoff Guidelines

- Restate rather than amend; a handled item leaves for Context, History, or the Feature docs with no tombstone.
- §Working Notes holds what a fresh session would trip over; what Context or the Feature docs already say isn't restated.
