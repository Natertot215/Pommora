## Handoff — Pommora

> **User Prompt:** *"Every action must be confirmed operational."*

#### Current Focus

**Session ID:** 7ff23352-9a5e-4972-be78-cf28011a0315
**Dates:** 08-15-2026
**Model:** Opus 5

**Pasted links, then the table cells nobody had reached.** The session ran a ten-task plan to its end and then kept going through four rounds of live feedback. The plan's own arc was the paste path: the markdown-link grammar widened to CommonMark's balanced-parenthesis destination (one edit at the grammar, not an encoding around it at four consumers), one `link-full` / `link-short` / `link-title` vocabulary replaced two disagreeing sets, three settings landed under Pages, and Page Title learned to write the domain immediately and swap the fetched title in against a range anchored through every edit since. Phase 4 added the menus — a link's own right-click menu, the ⌘⇧V inverse chord taken from Paste and Match Style, and `Paste As ▸` on the prose menu.

**Then the feedback.** Gate 4 sent back four corrections that mattered more than they looked: `Edit Link` had only ever been offered to a link naming a *page*, so the one form whose target can't be renamed through anything else had no way to be edited; the paste block wanted Paste → Paste As → Paste Without Formatting; and a resting table cell — which is not an editor and draws its links as plain spans — had no link menu at all, so Task 8's `CellEditor` mount only ever reached a cell already entered. That last one became its own piece of work: the actions that only rewrite text commit against the cell without entering it, while Rename and Edit Link enter it with their half already selected, with the span arithmetic hoisted out of both editor appliers so the two paths cannot diverge. A url column's Style menu then turned out to be offering two of three link forms in words nothing else used, writing a `look` no renderer read.

**What is verified:** every gate green on the final state — typecheck 0, lint 0 **diagnostics**, 2732 tests across 235 files. Gates 1–4 were driven live by Nathan and confirmed. Three simplification passes ran, and every finding was checked against the code before folding: one found a real second writer (the "is a title still owed" verdict had drifted into three copies while the link text stayed consolidated) and one found a real defect (Paste As composed its label unescaped, so a page titled `Notes [WIP] final` produced a link the grammar reads back as nothing). **What is assumed:** nothing outstanding — the last live pass came back clean.

#### Completion Criteria

- [x] **The grammar reads balanced parentheses two levels deep**, so a parenthesized address survives however it was authored.
- [x] **One `LinkDisplay` vocabulary** across URL properties, view columns, the editor and the nexus-wide default; the old `link-url` gone but for two migration tests that prove it falls back.
- [x] **Three per-Nexus settings under Pages**, clean-file, with Default Format disclosed only while auto-format is on.
- [x] **The paste path in both editors** — the page body and a table cell — honoring the inverse rule.
- [x] **Page Title defers to the fetch** against an anchored range, declining once those words have changed hands.
- [x] **A link's menu: Rename · Edit Link · Copy Link · Format ▸**, then Remove Link · Delete below a separator.
- [x] **⌘⇧V does the inverse of ⌘V**; Paste and Match Style keeps its act as **Paste Without Formatting**, without the accelerator.
- [x] **`Paste As ▸` on the prose menu**, and **`Insert Link`** over a selected address.
- [x] **Links in table cells, resting and active, both syntaxes** — menu, follow, hover preview.
- [x] **A url column's looks are the link forms**, defaulting to the property's own Format.
- [x] **A saved view row pops the OS menu its siblings pop** — the view pane's rows and the embed's segments, off one shared model.
- [x] **Gates green; three simplification passes folded after verification; the PopoutMenu scope written.**

#### Next Session

- **The pickers.** `PopoutMenu — Scope.md` is written and two of its four decisions are ruled: every double-chevron picker moves, the block Scale picker stays. The migration unit is `PickerControl` itself — repointing its one menu moves all twenty-five consumers together — and two decisions remain open: whether PopoutMenu subsumes `PointMenu`, and whether `PickerControl` keeps its `solid` prop.
- **The autocomplete panel is the piece that makes the component real** rather than a rename. It needs point anchoring, no focus management, a left origin, its own exit presence, and a stacking rung of its own — each of those is why it isn't already a `PickerMenu`.
- **The Page Outline dropdown still has no feature doc** — carried from the previous session, still awaiting Nathan's call.

#### Feedback

- "Every action must be confirmed operational." — standing; each gate was handed over for a live pass rather than claimed.
- "a url cell on a markdown table does; TableView doesn't" — the two surfaces hold different things: a markdown cell holds a *link*, a view cell holds a property *value* whose form is its column's.
- "only number + link should use Format for their headers on the View styling, the rest keep Style" — a status's Pill and a checkbox's Switch are looks, not formats.
- "that violates the on-every-x rule and should be simplified" — a keydown path may not allocate; a shortcut spec is parsed once and kept.
- "Do the menu reversal without listing it here as its what was always supposed to be done in the first place" — a correction to obvious is written as though the right way was always intended.

#### Session Pointers

- `Pommora/src/shared/PasteLink.ts` — `decidePaste` is the pure decision; `linkPaste` answers both halves of what a formatted link is (its markdown, and whether a title is still owed) so no writer can answer either differently.
- `Pommora/src/renderer/src/MarkdownPM/editor/PasteLink.ts` — deciding is separate from writing so the paste event is claimed on the decision alone; `pasteAs` and the ⌘⇧V chord share `writeLink`.
- `Pommora/src/renderer/src/MarkdownPM/editor/PendingTitle.ts` — the anchored range Page Title swaps into, mapped with inward assoc and pruned the moment the text there stops reading as what was written.
- `Pommora/src/renderer/src/MarkdownPM/editor/linkFormat.ts` — `linkActionText` and `linkHalves` are the pure span math the editor and a resting table cell both perform.
- `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — a resting cell's own link menu; `still()` re-reads the cell when an action is chosen, since a native menu stands open as long as it likes.
- `Pommora/src/shared/columnStyles.ts` — a url column's default look is its property's Format, which is why `defaultStyleFor` takes the definition.
- `.claude/Planning/Link Formatting — Implementation Plan.md` — the Implementation Log at the bottom holds the rulings, observations and deviations; several things that look like defects are decisions.

#### Working Notes

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.
