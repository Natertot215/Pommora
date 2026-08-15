## Link Formatting — Session Prompt

Paste this into a fresh session to pick the work up cold.

---

You're implementing pasted-link formatting in Pommora. The design is settled and the plan is written, reviewed, and ratified — your job is to execute it, not to redesign it.

### Read these before touching anything

1. `.claude/Planning/Link Formatting — Implementation Plan.md` — the plan. Read it whole, including the Implementation Log at the bottom, which is where the current state actually lives.
2. `.claude/Planning/Link Formatting — Decision Log.md` — the spec behind it. Every decision is tagged `[confirmed]`; the Considered & Rejected section lists approaches already ruled out, and retrying one of them is a defect, not an idea.
3. `.claude/Guidelines/Editor-Internals.md` and `.claude/Guidelines/Build-Gotchas.md` — in-domain traps.

The plan's **Grounding** section lists the files to re-open. Open them; don't trust the plan's citations, and don't trust this prompt's either. Four of the plan's derivation counts were wrong on the first pass, so re-run every `rg` before editing the files it points at.

### What the feature is

Pasting a URL into MarkdownPM turns it into a markdown link in one of three forms — **Full Link** (`[url](url)`), **Short Link** (the bare domain), **Page Title** (the fetched `<title>`) — chosen by a per-Nexus setting and changeable per link by right-click. Plus a `Paste As >` menu for choosing per paste.

The load-bearing insight, and the reason the plan is shaped the way it is: **almost none of this is new machinery.** `linkDomain` is Short Link. The `linkTitles` fetcher, its main-side cache and its renderer resolver are Page Title, already shipped for URL property cells. `PickerControl` is the three-option double-chevron. `linkDisplayText` is the formatter. You are wiring existing mechanisms onto one vocabulary. If you find yourself writing a second URL parser, a second domain-stripper, or a second menu surface, stop — the thing already exists and you missed it.

### Environment, non-negotiable

- Gates, run from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`. **Read exit codes directly.** Never pipe a gate into `tail` or `head` — you get the pipe's status, and that has masked a red suite for a whole session before.
- Launch the GUI with `env -u ELECTRON_RUN_AS_NODE npm run dev`. This environment sets that variable, and with it set Electron runs as plain Node and the app crashes on startup.
- Biome owns formatting through a PostToolUse hook. Never hand-align, never run Biome yourself. An Edit failing on whitespace means Biome reformatted the file — re-read and retry.
- Keep the app in dev mode with HMR so Nathan sees changes immediately. Don't ⌘Q his session.

### Per task

1. **Re-derive** every count and citation the task names. A diverging count rewrites the plan; it does not get quietly fixed.
2. **Read the task's Why**, the Global Constraints, and the Inherited Reasoning. If the Why doesn't justify what you're about to write, the task is wrong — say so rather than building it.
3. **Write the failing test first**, run it, watch it fail for the right reason.
4. **Implement.** One writer on the tree at a time.
5. **If the real shape departed from the written one** — a changed signature, a moved file, a renamed export — find every later task that assumed it, rewrite them, and record it under Deviations *before* committing.
6. **Run the full gate.** Never claim a result you didn't just watch happen.
7. **Commit the work and tick the task's boxes in the same commit.** Stage explicit paths — never `git add -A`, never a directory.

### Per phase, at its gate

- Dispatch `code-simplifier` and `comment-killer-agent` against the phase's commit range, scoped to its paths. A reviewer given no range reads an empty working tree and the gate ticks green having looked at nothing.
- **Every concern is fixed or carries Nathan's explicit ruling.** A flagged concern is unfinished work; don't launder it into a note.
- Fill in the commit hashes in Progress. Re-assess the later tasks against what actually landed.
- **Then stop and hand it to Nathan to test.** See below.

### Live testing — when to stop and ask

The rule: **nothing is called working until Nathan has seen it work.** Gates green is where verification starts.

At each checkpoint, tell him plainly what to try, what he should see, and whether the app needs a restart or just a reload. Then wait. Don't proceed to the next phase on your own verdict.

| Checkpoint | What he tests | Reload needed |
| --- | --- | --- |
| **Before Phase 1** | Two read-only observations on the app as it stands today: right-click a rendered markdown link in a page body — does the prose menu also appear behind it? And right-click `[Example](https://example.com)` inside a table cell — does any link menu appear at all? Both answers change Tasks 8 and 10. | none |
| **After Phase 1** | A URL property's new Format picker in all three modes; a Wikipedia link with parens in a page rendering un-truncated and clicking through correctly. | ⌘R |
| **After Phase 2** | The Settings window, unchanged. This phase is a refactor — General shows 6 rows, Pages shows 3, every label and default exactly as before. Nothing new should be visible. | ⌘R |
| **After Phase 3** | **The big one.** Every cell of the paste matrix, in a page body *and* a table cell: settings off → literal URL; on → the chosen form; selection + wrap on → the selection becomes the label. Page Title showing the domain then swapping to the real title. Two ⌘Z presses removing a swapped paste. The Default Format row appearing and hiding with its toggle. | ⌘R (extension changes don't HMR) |
| **After Phase 4** | `Format >` on a link cycling all three forms. `Paste As >` on prose offering the right options for a URL, a `[[Connection]]`, and a non-link clipboard. ⌘⇧V doing the inverse of ⌘V. All of it in a page, a cell, a block, and an embed. | **full dev restart** — `src/main` and `src/preload` don't HMR and aren't picked up by ⌘R |

### What "confirmed operational" means

Not "the test passes." Not "it should work." For every action this feature adds:

- **The settings actually govern the paste.** Flip each toggle and confirm the paste behavior changes with it — including the off state, which must leave a pasted URL as literal text. A test that passes with the settings gate deleted proves nothing; the negative control is part of the task.
- **The Format menu actually changes the link.** All three forms, on a real link, with the document text changing to match.
- **Every action has its inverse.** Undo works and is reversible. A form you switched to can be switched back.
- **It works in every surface**, not just the page body. Table cells have their own editor with its own extension array — a change mounted once is half-done.

### Simply, cleanly, no bloat

The project's rules that bite hardest here:

- **DRY is hard.** Never two definitions or two writers for the same thing. If you find one, report it.
- **Fix causes, not symptoms.** The parenthesized-URL fix is the model: the grammar was wrong, so the grammar got fixed once for all four of its consumers rather than encoded around at the writer.
- **Comments are minimum and why-only.** Never restate a value the declaration already holds. Never label state or status — those rot. `KNOB` and `(Nathan's call)` markers are functional; leave them.
- **Simplification comes before build-breaking review**, not after.
- **Docs land in the commit that falsifies them.** The plan's Made False table says which, and when.
- **Ask before designing.** Anything visual or interactive that the plan doesn't already specify — stop and ask. Don't guess at how it looks or behaves.

### The one thing to escalate

If a task is wrong as specified, **stop and say so.** Never satisfy a criterion by weakening it, narrowing an assertion, or editing the test until it passes. Reporting a task impossible is a success; a green gate reached by moving the gate is a failure that hides itself.
