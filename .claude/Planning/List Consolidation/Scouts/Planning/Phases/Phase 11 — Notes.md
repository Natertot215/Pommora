### Phase 11 — Notes

**Commit:** `43ff98c3f` on `lc-docs3`, over `b380728f4`, touching five `.claude/` documents: +52 / -56. No code, no tests, no comments. *Phase 11 — Docs and Issues.patch* is this commit's diff.

**Line numbers** below are each document's lines before the edit, at `b380728f4`.

#### Editor-Internals

| Line | Edit | What Made It False |
|---|---|---|
| `:18` | Left whole, with the stray blank line under it | A surface's scan holds what it reads, so a cell's model stopped being page-shaped; `itemAt` is gone |
| `:26`, the grip entry | States the two seats: `mousedown`'s caret, which preventing the menu can't stop, and `contextmenu`'s word, which it does, with `selectstart` as the refusal a surface keeping the menu uses (`keepSeatedSelection`) | Omitted the Menu Seat (5-T39, 5-T5, 5-T41) |
| `:40` | Rewritten whole, from the *Engine Stack.patch* hunk | See below |
| `:24`, `:37` | Unchanged | Read against the tree: `openerOf` reads `spanAt(scan.maths)`, and `assembleLineIntents` still pushes rails after every line intent |

**`:40`:** the writers' re-pick and base rules left, since `listRenumber` no longer infers either. The new entry states the paste, deletion, and keystroke-over-a-selection gate (a numbered line made or unmade, a line break added or removed), a blank line ending a list, the one sweep, the start rule, `openerOf`, the scan as what the walks, keys, menus, and rails ask, leaving `checkboxToggleChange` out since it parses its own line, `readsListsIn` and `lineMarker` in place of `readsFrom`, the block's edge, the drag's stated exception in `dropChanges`' terms, and the stale compare in `beginRelocateDrag`.

**One Wording Differs From the Hunk:** the hunk says `ridesList` is read by the walks, the block model, and the rails. `git grep` finds it in `blockModel.ts` and `intents.ts` alone; `rolesAgainst` calls `openerOf` and `continuesList` itself. The entry says so.

#### MarkdownPM.md

| Line | Edit | What Made It False |
|---|---|---|
| `:10` | "or the format menu" left | `menus.format` was optional at `b7f2f17a5` and Phase 9 made it required (`api.ts:191`) |
| `:10` | Scope line: a pane reads what a cell reads; only a Markdown block reads anything in code | A pane reads `'lists'`; "none applying inside a fence pair" fell with the cell's fences (row 34) |
| `:22` | "inside code" became "inside inline code" | **Missed by the List:** a paint in a fence now writes (probed: `==foo==`, `=🔴foo=`), and only an inline code span refuses |
| `:24` | `+` is a bullet, the box rule, a blank line ending a list, paste, the start rule, the split and merge, Preserve for a glyph, a caret, and a selection inside one line, the grip's Format ▸ over its whole block, mixed blocks checking no row | `+`, "one indent zone", loose lists, the start rule, the Preserve clause, Type ▸, and "recounts … from 1 or A" |
| `:25` | "dash bullets" became "bullets" | `+` takes a bullet's rail |
| `:32` | A reshaped numbered list recounts in the same undo | **Missed by the List:** "land exactly as copied" contradicted row 20 |
| `:88` | The shorthand writes `- [ ] ` whichever bullet typed it; `-[]` and `->` work at a line's start in a Markdown code block | "canonicalizes" named no space or bullet; C-6 was unstated |
| `:105` | The pane's lists, keys, Enter, and Escape; the grip offers Format ▸ | Named a cell alone; "the list's type" read Type ▸ |
| `:130` | The list inset also serves a Text value's pane | The pane holds no gutter and a grip. Its file citations stand, since no cited file moved |
| `:138`, `:258` | Format ▸ | D-3 |
| `:142` | `/num` leaves Numbered, each type answering to its one name | **Missed by the List:** `/hea` leaves six headings and Alphabetical, not five. Probed: `/task`, `/bullet list`, and `/numbered list` find nothing |
| `:146` | One range, the seat's color and clearing, the page's caret after a dismissal, the short menu, rows writing into code, letters or digits on both sides, the riding quote | Each as the List names it. "Its Pommora items" became "The menu's", since the sentence before it changed |
| `:153` | Bulleted, Numbered, Alphabetical, Checklist, Arrowed | D-6 |
| `:257` | `+` left the pending rails entry | `+` has its rail |

**Read Whole:** the rest of the file holds no other false sentence I could find. The seat's CSS name, `mdpm-seat`, stayed out, since a feature document describes what the app does and Phase 9's note offered it as a fact rather than a requirement.

#### PropertiesPM.md and ConfigurationPM.md

- **`PropertiesPM.md:60`:** a pane's lists, Enter and Escape, the first line alone with its `…`, a resting box taking no press, a click opening the field, and a YAML list reading as its lines.
- **`ConfigurationPM.md:152`:** the row keeps the setting's caption and adds the grip's exception, since "Leave … other types unchanged" is false for a grip. See *§Concerns*.

#### CLAUDE.md, ContextPM.md, FrameworkPM.md

Unchanged. `ContextPM.md` and `FrameworkPM.md` were read whole and `CLAUDE.md` against the tree, and nothing false turned up. `.claude/scripts/README.md` stays out, as briefed.

#### IssuesPM.md

| Issue | Edit | Why |
|---|---|---|
| I-073 | Closed: block, row, and footnote gone | The two patterns are one rule with the drag's stated exception |
| I-073, new | Option+Up, Option+Down, and dragged text, in the slot the closed issue left | *§Calls Taken*. Probed on this tree with `listRenumber` mounted: `1. a`, `2. b` moved up lands `2. b`, `1. a`; `moveLineDown` and a `move.drop` edit recount nothing either |
| I-036 | Title, row, body, solution, and footnote recounted to **15 compares across 10 files and 3 defaults**, with `readsLists` the one capability switch, and `checkboxToggleChange`'s, `lineBodyBefore`'s, and `opensLine`'s sentences gone, since each reads the scan or left | Read by `git grep` at this tree |
| I-016 | The `- [] hello` example and its test left | Probed: it counts 8 characters, which is what the editor now draws, so the two agree. The long paragraph's disagreement stands |
| I-068 | Unchanged | Its fix didn't land: `regions.ts` and `parser.ts` aren't in the work's diff |
| I-072 | Footnote: `joins` became `contractions` | `joins` left; the file's only `joins` is a comment's verb |

**I-036's Other Removals:** the fence-pair paragraph left, since a cell's scan holds no fences, so no pair exists for `listLineAt` to ignore. `blockDrag`'s divergence left, since `blockShape` reads the surface's scan. `blockPrefix` is gone, so its two helpers are named. `tablePasteGuard` left the unscoped readers, since it reads `scan.markers`. Its `MarkdownPM.md:105` citation left with the paragraph that needed it.

**Re-Anchored Citations:** footnotes 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 34, 36, 37, 38, 39, 51, 57, 72, and 73, each read against its symbol at this tree. Footnote 21's `Editor-Internals.md` cite now reads `:29`, the fold entry. Footnote 34 and footnote 57's `cellStatic` line had drifted before this work; they sit in touched files, so they moved too.

**`index-issues.py`:** ran on the worktree's file and reported already reconciled. Totals stay 73, with 38 Low, since one Low closed and one Low arrived. The file itself doesn't direct the script; `c/batch-issues` does.

#### Verification

- `node .claude/scripts/check-atlas.mjs` exits 0: 17 tables agree.
- The brief's `git grep` prints nothing.
- A scan of every backticked identifier in `.claude/Features`, `.claude/Guidelines`, and the three top-level documents, against the words of `b7f2f17a5` and this head, finds none the work removed.
- Every probe ran as a temporary test in the worktree and was deleted before the commit.

#### Calls Taken

- **15 Compares:** read by `git grep`, as the brief says. The sites are in the footnote.
- **I-036's Title:** "cell behavior" became "non-page behavior", since a pane now shares that branch.
- **I-036's Scale:** "+37 to +75" stands. It's a past measure with fewer sites to change now, and I had nothing to replace it with.
- **The New Issue's Base:** `b7f2f17a5` rather than `3469266d1`, since `active` holds it and a replay gives the stack new hashes. Neither event passes the filter's gate at either commit.
- **The New Issue's Origin:** Parallel Build, since two movers stand beside the list drag.
- **The New Issue's Number:** I-073 directly. `index-issues` would close the gap to the same number. Older commits and the planning log say I-073 for the closed issue.
- **No New Codeblocks Bullet:** `:10` and `:88` carry code-block lists, and `:146` the rows. A *§Codeblocks* entry would be the fuller home, but nothing there is false, so it's a suggestion.

#### Concerns

- **Issue Bar:** `c/batch-issues` wants a new issue reviewed by someone other than its finder. Nobody has reviewed this one.
- **`/task`:** a person who thinks of task lists finds nothing in the `/` menu. The document states the one-name rule; Phase 7's concern stands for the morning report.

#### By Hand

- **The In-App Caption:** `Core/Settings/frames.ts:729` still reads "Leave indented lists and other types unchanged when adjusting a list's format.", which a grip's menu contradicts, while `ConfigurationPM.md:152` now states the exception. The caption is the odd one out and wants the same clause, as a code change this docs-only phase didn't make.

#### Missed by the Reconciliation List

- `MarkdownPM.md:10`, the optional format menu.
- `MarkdownPM.md:22`, a paint inside a fence.
- `MarkdownPM.md:32`, a paste landing "exactly as copied".
- `MarkdownPM.md:142`, `/hea`'s five headings, false before this work.
- I-072's footnote, naming `joins`.
- I-036's fence-pair paragraph and its `blockDrag`, `blockPrefix`, and `tablePasteGuard` claims.
