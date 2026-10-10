## Links Cleanup — Shared Scout Brief

### Context

Pommora is an Electron + React + TypeScript app (repo: `~/The Studio/Projects/Project Pommora`). Pages are Markdown files; MarkdownPM is its CodeMirror 6 editor (`Core/MarkdownPM/`). Nathan (the owner) is planning **the complete cleanup of how Pommora and MarkdownPM handle links** — reading, rendering, clicking, hovering, menus, typing, pasting, Paste As, copying, opening, title fetching, rename rewriting, Link property values, embeds, and citations wherever they read or write link syntax. The goal is one source of truth per rule, no odd-ones-out behavior, no confusing names, and no machinery that exists only because an earlier shape made it look necessary.

**Vocabulary (Nathan's ruling, supersedes the bullets below where they differ):** a **connection** is any link to a page or heading, whichever syntax wrote it (`[[Page]]`, `[[#H]]`, `[x](Page)`, `[x](#H)`); a **weblink** is the code's name for any link to a URL (docs call it a "link"). The `'wikiLink'` token kind keeps its name.

**What counts as a link:**

- **Connection:** `[[Title]]`, `[[Title#Heading]]`, `[[Title|Alias]]`, `[[#Heading]]` — content ↔ content links resolved against an in-memory title map. The token kind is `'wikiLink'` in code; prose says "connection."
- **Markdown link:** `[label](target)` — target may be a page, a same-page heading, a web address, or nothing.
- **Embed:** `![[…]]` page embeds and image embeds.
- **Bare addresses / autolinks**, **Link property values** (a typed property holding a page or an address), and **`§` citation runs** where they behave like links.

**The mandate, in Nathan's words:** "A single source of truth for how this works. No odd-ones-out behavior. No confusing names, complexity that only exists because previous and right-now architecture makes it 'look' correct, and nothing that doesn't end up reading totally intentional and simple." The new system may look different from what's there and may be a major refactor, deletion, or behavioral change. "What we do may not reflect the current codebase, but the outcome may ensure the codebase is reflective as a whole on the broader level as a result." **Target:** a net reduction of 200-400 production lines, measured on top of the Link Gestures work below. Remove spaghetti and "fancy systems" that fulfill self-induced responsibilities a coherent approach wouldn't need.

### In-Flight Work: Link Gestures

Another session is executing the ratified plan `.claude/Planning/Link Gestures — Implementation Plan.md` in this same working tree right now (uncommitted; commits in ~1-2 hours). Treat its end state as the baseline. Its changes:

- `Links/connectionClicks.ts` is deleted; `linkPointer` in `Links/linkClicks.ts` is the one pointer handler for both link kinds.
- `drawnRaw`/`drawnRawAt` become `drawnLinkAt` in `decorations.ts` (the link token the last draw produced at a position); `linkTokenAt` now takes a `Token[]`.
- `tokenMenuTarget` is added in `Links/connectionsApi.ts` (one menu rule for body and resting cell).
- `Guards/aliasGuard.ts` is deleted; `inAliasAt` lives in `Input/edits.ts`.
- `pasteLink.ts`'s two guards become `literalAt`.
- Phase 3 (still landing): `linkAddress` in `Engine/tokens.ts` replaces `linkHalves`; `mdLinkClass` in `decorations.ts` is one markdown-link look for both renderers; `stripBlockMarkers` and the `data-conn-title` attribute go.

**Update — landed:** Link Gestures committed at `75c3bcb9c` on `active`; that commit is the baseline, and every file is citable as `path:line`. Since the list above: `linkInCode(scan, at)` in `Input/edits.ts` makes Enter, `slotNear`, and `inAliasAt` treat any connection that code touches as text, and `tokenMenuTarget`'s `editable` reads `edit !== undefined`. (Scouts 1-5 ran while it was in flight and cited its files by function name.)

### Already Known

`.claude/Planning/Pommora Codebase Audit.md` holds the codebase audit. Its link-relevant findings: W6 (F-033 through F-043), F-054, F-062, F-079, F-080, F-094, F-098, F-099, F-114. Link Gestures resolves F-033, F-034, F-036, F-037, F-038, F-039, and F-068. Treat the audit as what's already known and go **underneath** it: the findings are symptoms; the mandate is the shape that produced them. Audit "Fix" proposals are not settled decisions.

### Principles (Nathan's, verbatim)

- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and fit within the existing codebase naturally.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly.
- Design what's necessary without making sacrifices or being negligent, but don't overcomplicate or "bulletproof" things when its maintainability and complexity outweigh the actual purpose.
- Consider various perspectives, multiple alternatives, and potentially relevant opportunities before deciding upon an approach or isolating options.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- **Net Simplification Is the Bar:** "Ensure we're not adding anything more compared to what's being collapsed or removed. The codebase must be simplified and more easy to understand as a result — unambiguously and without any need to understand what this session touched." A change that relocates complexity, adds indirection, or passes the problem forward fails however correct it is.
- **Never a Half-Fix:** A finding is resolved at its cause, never patched around one caller while the shape that produced it stays.
- **Readable Over Clever:** Prefer the approach that leaves readable code alone and fixes what feeds it over a denser form.
- **Source Over Patch:** One definition per rule, placed with the code that reads it; a second copy of a mechanism is a defect even while both copies work.
- **Follow the New Input:** When a function starts reading something new, check whatever decides when it runs.
- **Removal Earns Its Place:** Delete defensive fallbacks, optional props only tests need, flags guarding states production never produces, and channels that restate another channel. Before calling a safeguard removable, establish what produces the state it guards — "this is a no-op downstream" is often true only for the canonical case.
- **Simplest thing that works wins. Reuse before invention. YAGNI.**

### Project Rules That Bind Any Design

- Core reaches the machine only through `Core/Platform`; Desktop (`Desktop/`) is the only caller of Node/Electron; `Core/Contract/bridge.ts` declares every interface ↔ host channel once, answered with a `Result` envelope.
- The host-run half of Core imports no React (`Core/Contract/engineGraph.test.ts`, `Desktop/hostGraph.test.ts` enforce it). The MarkdownPM Engine (`Core/MarkdownPM/Engine/`) can't import `Links/`. UIX imports nothing outside itself.
- Finite states are unions + switch. Read paths are read-only. No O(N) or allocating work on a high-frequency trigger (keystroke, caret move, pointer move), and no full rebuild where an incremental one works.
- Comments aren't authoritative: a constraint a comment claims isn't a law.
- `.claude/Features/MarkdownPM.md`, `ConnectionsPM.md`, `PropertiesPM.md`, `WebviewPM.md`, and `.claude/Guidelines/Editor-Internals.md` describe current behavior; they may be wrong.

### Rules for Scouts

- **Read-only.** No edits, no git state changes, and **don't run tests, the type checker, or the app** — another session is mid-edit in this tree. Use `git grep -n` (skips `node_modules`), `git show`, `wc -l`, and reading.
- **Review, don't confirm.** Report what's actually there. A claim without `file:line` (or a function name, for the in-flight files) evidence doesn't go in the report. Distinguish "verified by reading" from "inferred."
- **Findings name a mechanism.** "This could break" without the path that breaks it is a hypothesis; leave it out.
- **Go beyond your surface** where a rule crosses it — follow every caller and every sibling that does the same job elsewhere. Your surface is where you start, not a fence.
- **Measure line counts** with `wc -l` (production files only; exclude tests) for every file you propose shrinking, merging, or deleting.

### Report

Write your report to the path your task names, as Markdown, in this shape. Be dense; skip anything that doesn't change a decision.

1. **Surface Map:** each production file in your surface — measured lines, the rule(s) it owns, who reads it (`file:line`), and why it exists separately from its neighbors.
2. **Duplicated or Parallel Rules:** each rule written more than once — every copy with evidence, how the copies differ, and whether the difference is genuinely correct or drift.
3. **Odd-Ones-Out:** behavior, naming, or types that differ from their siblings — the evidence, and whether the difference earns itself.
4. **Self-Induced Machinery:** mechanisms that exist only to compensate for another shape — what produces the need, and what removing the cause deletes.
5. **Confusing Names:** names that mislead, collide, or say different things for the same concept (or one thing for different concepts), with every site.
6. **Approaches:** 1-3 candidate restructurings for your surface, each with its estimated net production-line delta (show the arithmetic), what's deleted, what's added, behavior changes a user would notice, and what it depends on outside your surface. Every approach must be net negative or explain why a small addition removes more elsewhere.
7. **Would Go False:** docs, comments, and tests each approach would make false (`file:line`).
8. **Traps:** things that look removable or mergeable but aren't — with the path that produces the state they handle.

When done, reply with only: the report path, its approximate length, and your top three findings in one line each.
