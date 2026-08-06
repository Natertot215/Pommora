## Handoff — Pommora React

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — embedded pages, brainstorm to shipped, in one continuous arc

**Session ID:** 6dc9212b-b419-4b10-9e15-aa2fb5aedb6e
**Dates:** 08-03-2026 → 08-04-2026
**Model:** Fable 5
**Compactions:** several (best-effort)
**Agents:** Explore (9x — grounding scouts, the drag/autoscroll answer, the 4a verdict) · build-breaking (7x — spec attack, 3 plan rounds, 4 phase gates, the post-plan whole-feature attack) · code-simplifier (6x — per-phase + the post-plan cross-phase pass) · general-purpose (2x — the docs-falsified sweep, the live walkthrough driver)
**Skills:** studio-brainstorm · writing-plans-v2 · code-simplification · build-breaking

**What Started:** Nathan asked for an investigation of embedded pages in MarkdownPM — DRY-hoisted against SurfacePM's tiles, Obsidian's syntax, not-live-preview, nothing hot outside the active tab — with every uncertain assumption surfaced as a question. Three scouts found the ground unusually ready: the Embed Framework had been designed with `![[Embed]]` named as its second consumer, the syntax was already tokenized and fenced off from connections, and the table widget + display math held every precedent the mechanism needed.

**What Happened Along the Way:** The decision log closed over several question rounds (lone-line only; skip-over caret; the shared cache with write-through; one embed per page per document; banner-follows-the-page display-only; native menus; the fencing blanks; the tree-projection mini-phase Nathan mandated explore-first). The plan survived a simplification round then three attack rounds before certification — the simplifier deleted a single-consumer component and a forced fold before the breakers ever saw them, and the breakers' biggest catches were a CSS shorthand split that would have silently killed every SurfacePM tile transition, and a resolution-blind gate that would have shown raw syntax exactly where the deleted-page token belonged.

Execution ran six phases, each gated simplify-then-attack, each attack briefed with the simplifier's flags pre-adjudicated. Every gate earned its keep: Phase 1's attack caught an indented embed tearing list items on drag (fixed at the derivation — leading indent is continuation context); Phase 2's caught the rebuild gate desyncing from the scanner when a fence opened above a tile, plus the chassis border becoming inherited state; Phase 3's caught the banner eating two-thirds of every covered tile; Phase 4's caught the re-aim menu dead exactly for stale tokens — its whole purpose; Phase 5's caught the rename sweep misreading its own code mask on any length-changing rename. The post-plan attack ran a 92-command keymap census and found the four syntax-motion seats the hand-picked test census couldn't see — fixed at the guard, never by chasing commands, and the test rebuilt around the true invariant: every reachable seat, every destructive key, harmless.

The live walkthrough (202 checks by a driver agent against the scratch nexus) then found what only a running app could: a stale warm tab restore silently clobbering the rename cascade's heal on disk (a rename now clears the warm cache whole), a grip-dragged tile blanking because CM adopts widget DOM and the old widget unmounted the root underneath it, and a stray banner click putting the caret one keystroke into the embedded page.

**What It Ended With:** The feature ships whole — tile, guards, chrome, native menus, autocomplete, cache, cascade, nudge — with **typecheck 0 · lint 0 · 2160 tests / 189 files · build + showcase clean**, main pushed throughout (the 169-commit backlog went to origin at the arc's start). Docs are trued: [[MarkdownPM]] carries §II. Embeddings, the falsified-claims catalog is consumed across nine docs and the comment sweep, and the walkthrough doc holds the verdicts plus the NEEDS-NATHAN hand-list.

**Lessons Learned:**

- The one-owner claim predicate is why five consumers never disagreed about a line — protect invariants at the transaction layer, never by chasing motion commands.
- CM hands widget DOM to successor widgets: `destroy(dom)` must treat a still-connected node as adopted.
- A hand-picked command list in a caret-safety test is how an escape ships green; census the installed keymap.
- Same-length rename fixtures cannot see a code-mask misread — regression pins must change lengths.
- `Page.reload` is unsafe verification whenever `src/main` changed; relaunch.

**Next Session:**

1. **Drive the NEEDS-NATHAN list** in [[Embedded Pages — Interaction Walkthrough]] — native menu picks, real-pointer checks, one real ⌘Q, the SurfacePM visual baseline.
2. The `*`-bullet ruling and the option-rename replumb (standing).
