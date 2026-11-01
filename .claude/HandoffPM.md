## Handoff — Pommora

> **User Prompt:** Run `batch-issues` on MarkdownPM's hot paths, the editor work that re-reads a whole page, block, or table on every keystroke, caret move, or selection change, starting from I-016.

#### Current Focus

**Dates:** 10-31-2026
**State:** The Trash & Archive Restructure is complete and filed under `.claude/Planning/Completed/`, and its remaining limits are I-076 through I-082. Pommora's open issues are the focus, gravest first; Sync's issues wait on its rework, which leaves I-016 the gravest.

#### CONTEXT

MarkdownPM is Pommora's CodeMirror 6 editor under `Core/MarkdownPM`. Area A2 of the Issues index holds its known lag sources, which share one shape: a trigger firing per keystroke, caret move, selection change, or pointer move does work in proportion to the page, block, or table rather than to the edit, the lag source the Hard Rules name. The entries were filed against bases well behind HEAD, so each claim and estimate is re-read at HEAD before it's trusted.

- **SOURCE:** `.claude/IssuesPM.md` › *§A2 • MarkdownPM*
- **SOURCE:** `.claude/Features/MarkdownPM.md`, `.claude/Guidelines/Editor-Internals.md`
- **SOURCE:** `.claude/scripts/editor-parity/README.md`, the before-and-after check of render, behavior, and per-keystroke latency on a 2,500-line page
- **SOURCE:** `.claude/Guidelines/Development-Environment.md`

#### MANDATE

Take A2's hot-path slice through `batch-issues`: re-verify each entry at HEAD, present the batch with recommended approaches and its estimated delta, and on approval implement, close out, reconcile the index, and commit. Where entries share a cause, such as the footer's figures or a table's re-read, the fix lands once at the shared point rather than issue by issue.

#### The Batch

- **Whole-Page Work:** I-016 (the footer's figures re-tokenize the page past about 8,000 lines), I-018 (those figures are a second reading of what the editor draws), I-017 (lands after I-016), and I-021 (each keystroke re-allocates everything carried below the edit).
- **Block Work:** I-026 (an unclosed raw-HTML opener re-scans to the end; its estimate was typed together with I-027), I-040 (code-block coloring re-parses its block), I-023 (a caret move re-measures every visible language tag), and I-022 (a caret move rebuilds the tile ranges).
- **Table Work:** I-013 (a cell's keystroke re-reads its table), I-015 (an entered cell parses twice), I-014 (a drag redraws the table per mouse move), and I-048 (lands with or after I-013, in the same loop).

Twelve entries is the upper bound. When re-verification shows the slice outgrowing one session, the presented batch takes the first two groups and leaves Table Work for the next.

#### GUIDELINES

- **Verification:** each fix is proven by `editor-parity` between a before and an after build, with its latency row improved and its render and behavior unchanged, beside a test pinning the incremental behavior.
- **Live Checks:** an agent's CDP drive from a worktree build on its own port and userData. The main checkout never launches the app or runs `npm install`, and ports 9333 and 5173 belong to Nathan's live instance.
- **Placement:** a new file's home is Nathan's approval.
- **Commits:** `git commit --only -- <paths>` with past-tense messages; a hook refuses a personal name or the home path in any git command; searches use `git grep`, since `grep -r` reaches `Desktop/out/`.
- **Leave Alone:** `Core/Sync/` and `Sync/`.

#### INSIGHTS

- A claim that no longer holds at HEAD is reconciled in the index, rewritten or removed, rather than implemented around; MarkdownPM's documentation was rewritten on 10-26, after most of these entries were filed.
