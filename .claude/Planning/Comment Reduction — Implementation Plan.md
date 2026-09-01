## Comment Reduction — Implementation Plan

> **Status:** written, pending review · Execute units in order.
> Every count in this plan is machine-derived from `.claude/scripts/comment-baseline.json`. Re-derive with `node .claude/scripts/comment-ledger.mjs --verify` before editing.

**Goal**

Cut the app's TypeScript comment mass by at least 30% of its character count, leaving a codebase whose remaining comments each carry something the code cannot say for itself. StudioMD already sets the law — comments are kept to their absolute minimum and reserved for *why*s that cannot be inferred — and 766,493 characters across 7,160 comments is what accumulated in spite of it. This is the pass that collects the debt.

The shape is fourteen sequential units, each a single comment-killer agent handed an explicit file list, a character budget, and the deletion law below. Units are sized by comment mass rather than by directory, because a literal per-directory run is 48 dispatches where 34 of them are under 5,000 characters. The two directories too large for one unit — `MarkdownPM/Editor` at 111,494 and `main/` root at 87,199 — split by file, and the thirty small leaves merge into three sweep units. Agents run one at a time on one working tree; comment edits are file-disjoint by directory but the recorded failure mode is a fanned-out comment-killer working off a stale base, and serial dispatch is what forecloses it.

This is not a code change. The token-stream check in the ledger is what makes that a proven property rather than an intention: a file whose non-trivia token stream moves fails the gate, and whitespace never enters the hash, so Biome reformatting cannot mask a real edit. Nothing in scope alters behavior, signatures, or tests' assertions. CSS is out of scope — its pass already ran.

**Requirements**

1. Total TypeScript comment characters fall from 766,493 to **536,545 or fewer** — a cut of at least 229,948 characters, 30% of the baseline.
2. Every one of the 926 tracked files ends the run with a token stream identical to its baseline hash.
3. The three gates — `npm run typecheck`, `npm run test`, `npm run lint` — pass at every unit boundary.
4. `biome-ignore` (79 occurrences) and `KNOB` (83 occurrences) survive at their exact baseline counts.
5. Every comment that survives satisfies the preservation list; every comment that does not is shortened or deleted.
6. Where two or more comments state the same truth, exactly one statement of it remains, and the resolution adds no characters.

**Acceptance — the whole thing working**

`node .claude/scripts/comment-ledger.mjs --verify` reports a reduction of 30.0% or greater, prints `token streams identical — comments only`, and exits 0; the three gates pass on the same tree; and `biome-ignore` and `KNOB` grep at 79 and 83.

**Forced By**

- Biome's PostToolUse hook reformats every TS write → a diff-line count cannot prove "comments only"; the token-stream hash is the only check immune to it. Binds every unit gate.
- `biome-ignore` suppressions are load-bearing and lint only re-fires where the underlying rule still triggers → grep is the sole catch for a deleted suppression whose rule has since stopped firing. Binds every unit gate.
- `KNOB` markers (81 lines, 83 occurrences) are hand-tuning addresses with no compiler or linter behind them → their removal is silent and permanent. Binds every unit gate.
- A comment-killer agent fanned out to sub-agents and one batch ran in a worktree off an ancient base → every brief says no sub-agents, no worktree, and `git worktree list` is checked after each unit.
- Nathan's auto-stage hook pre-stages his own documentation edits → units commit explicit paths and carry any pre-staged doc edits along rather than resetting them out.

**Inherited Reasoning**

- The CSS pass already ran. `.css.ts` files carry style tokens rather than prose and are not re-swept.
- A salvage ledger — harvesting deleted architectural prose into a scratch file for later folding into `.claude/Features` — was raised and struck. Architectural truth is a preservation category instead: it stays in the code, compressed rather than removed.
- `shared/types.ts`, `bridge.ts`, `result.ts`, and `schemas.ts` take the identical treatment as everything else. A lighter touch on the contract files was raised and struck: the contract is expressed by its types, and a comment restating a field name rots there exactly as it does anywhere else.

**Grounding**

- `.claude/scripts/comment-baseline.json` — per-file comment characters, comment count, and non-trivia token hash for all 926 files, taken at `53b5d903`.
- `.claude/scripts/comment-units.json` — the fourteen units and their exact file lists; every file assigned once, none twice.
- `.claude/scripts/comment-ledger.mjs` — the measurement and the proof. `--snapshot` records, `--unit N` prints a unit's brief, `--verify [N]` re-measures and fails on any moved token stream.
- StudioMD, *Comments* — the standing law this pass enforces.
- `.claude/CLAUDE.md`, *Testing Conventions* — the three gate commands, verbatim.

**Environment**

- Plan directory: `.claude/Planning` · Implementer: `comment-killer-agent` · Simplification: `code-simplifier` · Attack: `build-breaking-agent`.
- No spec input; this plan's Grounding is the discovery pass, and its shape was ratified by Nathan directly.
- Gate commands, read from `Pommora/package.json`: `npm run typecheck` · `npm run test` · `npm run lint`.

**Shapes:** refactor · removal

**Global Constraints (every unit inherits these):**

- Gates run from `Pommora/`, exit codes read directly. `set -o pipefail` on anything piped — `vitest | tail` exits with tail's status and has masked a red suite.
- One tree-touching writer at a time. No parallel implementer agents, no sub-agents, no worktrees.
- `git add` names explicit paths. Never `-A`, never a directory.
- Out of scope everywhere: `.css.ts` and `.css` files · any change to code, types, signatures, test assertions, or JSX structure · any new file · any comment addition that is not a shortening of one already there.

---

### The Deletion Law

Every unit applies this and nothing else. It is the whole brief; the file list and the budget are the only things that differ between units.

**Delete outright:**

- Any comment restating what the line below it already says — a name, a type, a token, a literal value. A comment naming the number or token its own declaration holds rots the instant that value moves.
- Section banners, dividers, and file-header summaries of what the file obviously contains.
- Narration of inferable steps: "loop over the rows", "early return when empty", "then render".
- JSDoc whose `@param` and `@returns` lines restate the signature.
- Historical notes — what this used to be, what was tried, when it changed. Git holds that.
- Any comment on a test that restates the test's own name or its assertion.
- Any comment whose removal an agent reading the surrounding code cold would not notice.

**Shorten, don't delete:**

- A paragraph whose first sentence carries the load and whose remainder elaborates: keep the first sentence, cut the tail.
- A why stated in four sentences that fits in one. The truth survives at its shortest expression — compression counts toward the budget exactly as deletion does.
- A block comment above a function whose value is one clause buried in it: hoist the clause, drop the rest.

**Preserve — the survivors, and the only ones:**

1. **Functional directives.** `biome-ignore`, `@ts-*`, and any pragma a tool reads. These are code.
2. **`KNOB` markers and Nathan's-call annotations.** Hand-tuning addresses and deliberate decisions marked so nobody "fixes" them.
3. **Stubs and deliberate dead-looking code.** Anything that would read as unused, unreachable, or deletable without the comment saying otherwise.
4. **Architectural truth.** A constraint, invariant, or ordering rule that governs beyond the lines it sits above and is not stated by the code — why main owns this write, why this cache is invalidated here and not there, why this runs before that. This stays. It may still be compressed to its shortest true form, and a truth already stated elsewhere in the same file is a duplicate rather than a second instance of this category.
5. **Non-inferable external behavior.** A workaround for a library, platform, or browser quirk, where deleting the note invites someone to undo the workaround.

The test for every borderline comment: *would an agent reading this code cold, without the comment, reach the wrong conclusion?* If it can resolve the context from the code alone, the comment falls under the rules above. Uncertainty is not a preservation reason — the categories are, and a comment that fits none of the five goes.

**Cross-comment conflict.** Where two comments state the same truth, or state it differently, the resolution is net-zero in characters: keep the shorter, delete the other; or if neither is right alone, replace both with one statement no longer than the shorter of the two. Where they contradict, the code is the arbiter — state what the code does, once, or delete both if the code speaks for itself. A merge that grows the total is not a merge.

---

### Per-Unit Task

Every unit is this task against a different file list. Fourteen of them, in order.

**Why:** Each unit is one agent's working set — sized so the whole file list fits comfortably in one context, so the agent judges every comment in a file against its neighbors rather than in isolation, and so a failed unit is re-run at a cost of one unit rather than the whole codebase.

**Now** — the unit's own brief, printed rather than recalled:

```
node .claude/scripts/comment-ledger.mjs --unit <N>
```

**Becomes** — the same file list, the same token streams, fewer comment characters:

```
node .claude/scripts/comment-ledger.mjs --verify <N>
# reports cut ≥30% for the unit · prints "token streams identical — comments only" · exits 0
```

**Ordered steps**

1. `node .claude/scripts/comment-ledger.mjs --unit <N>` — the file list and the budget.
2. Dispatch one `comment-killer-agent`, briefed with: the Deletion Law verbatim, the exact file list, the unit's character floor, and the Global Constraints. Explicitly: **no sub-agents, no worktree, no code changes, no new files.** Tell it to report the per-file characters it cut.
3. `git worktree list` → expect one entry. More than one means the agent fanned out; the extra tree's work is discarded, not merged.
4. Run the unit's Verify block.
5. Commit the unit's files by explicit path, carrying any pre-staged documentation edits along.

**Verify — automated**

- [ ] `node .claude/scripts/comment-ledger.mjs --verify <N>` — cut ≥30%, exits 0, prints `token streams identical — comments only`.
- [ ] `npm run typecheck` · `npm run test` · `npm run lint` from `Pommora/`, exit codes read directly, all green.
- [ ] From `Pommora/`: `grep -ro 'biome-ignore' --include='*.ts' --include='*.tsx' src | wc -l` → 79, and the same for `KNOB` → 83. Occurrences rather than lines, because two lines carry two `KNOB`s each. Both are whole-tree counts, so a unit that removed one from a file outside its own list still fails here.
- [ ] `git worktree list` → one entry.
- [ ] No file in the unit gained comment characters; the ledger names any that did.

**Verify — user**

- [ ] *(none — nothing user-visible ships in any unit.)*

---

### The Units

| # | Unit | Files | Chars | Floor |
| --- | --- | --- | --- | --- |
| 1 | Editor — the twelve densest | 12 | 54,730 | 16,419 |
| 2 | Editor — the remaining fifty-eight | 58 | 56,764 | 17,030 |
| 3 | Shared — the contract core | 7 | 52,448 | 15,735 |
| 4 | Shared — the remaining seventy-six | 76 | 49,763 | 14,929 |
| 5 | Main root — the sixteen densest | 16 | 44,846 | 13,454 |
| 6 | Main root — the remaining ninety | 90 | 42,353 | 12,706 |
| 7 | Main CRUD | 58 | 49,986 | 14,996 |
| 8 | MarkdownPM root and Tables | 51 | 55,568 | 16,671 |
| 9 | Design System — Interactions, Tokens, Fields | 59 | 55,976 | 16,793 |
| 10 | Views | 53 | 51,675 | 15,503 |
| 11 | Store, Frames, Interface | 68 | 52,960 | 15,888 |
| 12 | SurfacePM and Properties | 90 | 52,715 | 15,815 |
| 13 | Main IO and the MarkdownPM leaves | 53 | 54,467 | 16,341 |
| 14 | Design System remainder and the renderer leaves | 235 | 92,242 | 27,673 |
| | **Total** | **926** | **766,493** | **229,948** |

The floor is a per-unit expectation, not the contract. The contract is the global 30%. A unit that lands short states why in the Log and its shortfall is carried onto the running total; a unit that overshoots relieves the ones after it. The running cut after each unit is `--verify` with no unit argument.

**Order.** Units 1–7 are the dense, prose-heavy core and run first: they hold 351,000 characters, so a systematic problem with the Deletion Law surfaces early and cheaply. Unit 14 runs last because its 235 files are the leaves, where a stripped comment costs least if the law needs adjusting.

---

### Gate — after every unit

- [ ] The unit's **Verify — automated** list ticked, each against a result just watched.
- [ ] The running whole-tree total recorded in Progress.
- [ ] Any comment the agent preserved on category 4 or 5 that a re-read finds inferable is cut before the commit.
- [ ] Commit made, explicit paths, hash written into Progress.

### Gate — after units 7 and 14

- [ ] `code-simplifier` dispatched against the range, scoped to the units' paths, briefed that this is a comments-only pass and that any code change it proposes is out of scope and belongs in a finding rather than an edit.
- [ ] `build-breaking-agent` dispatched against the same range, asked the one question that matters: which surviving comment is now the only thing preventing a wrong conclusion, and which deleted one was?
- [ ] Every finding fixed, or carrying an explicit ruling in the Log.

---

## Implementation Log

### Progress

- [ ] **Unit 1** — Editor, the twelve densest · base `53b5d903`
- [ ] **Unit 2** — Editor, the remaining fifty-eight
- [ ] **Unit 3** — Shared, the contract core
- [ ] **Unit 4** — Shared, the remaining seventy-six
- [ ] **Unit 5** — Main root, the sixteen densest
- [ ] **Unit 6** — Main root, the remaining ninety
- [ ] **Unit 7** — Main CRUD
- [ ] **Gate** — simplification and attack over units 1–7
- [ ] **Unit 8** — MarkdownPM root and Tables
- [ ] **Unit 9** — Design System: Interactions, Tokens, Fields
- [ ] **Unit 10** — Views
- [ ] **Unit 11** — Store, Frames, Interface
- [ ] **Unit 12** — SurfacePM and Properties
- [ ] **Unit 13** — Main IO and the MarkdownPM leaves
- [ ] **Unit 14** — Design System remainder and the renderer leaves
- [ ] **Gate** — simplification and attack over units 8–14

### Rulings

- Architectural truth is preserved rather than harvested — it stays in the code, compressed. *(Nathan, at ratification.)*
- The contract files take the same aggression as everything else. *(Nathan, at ratification.)*
- Units are batched by comment mass rather than one-per-directory. *(Nathan, at ratification.)*

### Open Against Later Units

### Deviations

### Lessons

### Sequenced After

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/Comment Reduction — Implementation Plan.md.
Live-verify: nothing — no unit ships a user-visible surface.
Screenshots: none.
Pings: at each of the two gates, and at completion.
Record: a History arc entry for the run.
Everything else is the standard below.
```

**The Standard**

- **The bar.** A future review of this arc finds no comment that should have gone, and none missing that shouldn't have.
- **Only the global percentage may move.** No concerns carried, no deferrals, no "a later pass can get the rest."
- **Ambiguity:** take the simplest reading, record it under Rulings, continue. Execution does not stop for input.
- **Per unit:** dispatch → verify → gates, exit codes read directly and never piped → commit → record the running total.
- **Never satisfy the budget by deleting a preserved comment.** A unit that cannot reach its floor within the law reports short. The floor is an expectation; the law is the constraint.

**Then tick these.**

**The deliverable**

- [ ] `--verify` reports ≥30.0% and exits 0.
- [ ] Token streams identical across all 926 files.
- [ ] `biome-ignore` at 79, `KNOB` at 83.
- [ ] The three gates green on the final tree.

**The passes**

- [ ] Simplification and attack dispatched at both gates, over real commit ranges.
- [ ] Every finding fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] Nathan reads a sample from three units — one dense, one leaf, one contract file — and confirms the survivors are the right ones.

**The record**

- [ ] Context and Handoff current; the History entry written to its format.
- [ ] The final baseline re-snapshotted so the next pass measures from the new floor.

**The report**, in plain English — the final percentage and character count, per unit · what the law got wrong and how it was adjusted · anything preserved that was a close call · every gate's real output · what Nathan should look at.
