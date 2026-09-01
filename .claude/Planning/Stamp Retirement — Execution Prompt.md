## Stamp Retirement — Execution Prompt

You are executing an approved implementation plan in Project Pommora. Read this whole document before touching anything, then follow the plan in order. This prompt governs process and judgment; the plan governs what changes.

#### Read First

- `.claude/Planning/Stamp Retirement — Implementation Plan.md` — the plan, whole, including Rulings, Made False, Dead Vocabulary, and Closeout. Approved by Nathan on 09-01-2026.
- `.claude/CLAUDE.md` (the project's), `.claude/Guidelines/Development-Environment.md`, `.claude/Features/PropertiesPM.md`, `PagesPM.md`, `ViewTypesPM.md`.
- `git log --oneline -15` and `git status` — a parallel session is running a comment-reduction plan on this tree. Its untracked files (`.claude/Planning/Comment Reduction — Implementation Plan.md`, `.claude/scripts/comment-*`) are never yours to stage.

#### The Arc In One Paragraph

`created_at` and `modified_at` leave the on-disk format. "Last Modified" becomes the file's mtime; "Creation Time" becomes the instant decoded from the `PageID` ULID. Both reach every view through the value batch a container already loads (`Record<pageId, PageValues>`, `PageValues = { frontmatter, createdAt, modifiedAt }`) and sit on `ViewRow`. `created_time` joins `last_edited_time` as a property type so every type-dispatched switch treats the two stamps as one date shape. Every writer that existed to keep a stamp current is deleted. The closeout strips the keys from the NexusOS vault once, by hand, with Nathan present.

#### Order of Execution

1. **Baseline.** From `Pommora/`: `set -o pipefail; npm run typecheck && npm run test && npm run lint`. Record the Vitest file/test counts, the lint `Found N warnings` line, and HEAD in the plan's Progress section. Record Task 0's control baselines (`rg -F "KNOB" src`, `rg -F "(Nathan" src`). Record, for every file Task 0 names, its non-comment non-test line count — this is the baseline the closeout report starts from.
2. **Phase 0 — Task 0.** Dispatch `comment-killer-agent` with the brief in the plan (single-handed: "no sub-agents, no worktree; the tree is shared and not clean; touch only the listed files; stage nothing"). Verify its work yourself: `git diff --stat`, the three zero-greps, the two control greps, `git worktree list`, the gates. Commit explicit paths.
3. **Phases 1–3, task by task.** For each task: re-derive every citation before editing (line numbers are landmarks, symbols are truth) → write the red test named in Verify and watch it fail → implement Becomes exactly → run every Verify line and read its result → gates → commit that task's paths with its heading as the message, doc edits from Made False in the same commit.
4. **Each phase gate.** Gates, then `code-simplifier` over that phase's diff only (`<last commit before the phase>..HEAD`), dual-briefed: simplify without behavior change, and separately report any non-simplicity bug it sees. Every finding is fixed or carries a written ruling in the plan. A fix re-runs the gates and lands as its own commit. No attack review at a phase gate.
5. **Gate 3, then the whole arc.** Phase 3 gets its own simplification pass exactly like Phases 1 and 2. Only after that pass is folded: the full diff `<baseline>..HEAD` gets `code-simplifier` → `comment-killer-agent` (single-handed) → `build-breaking-agent` (≤ 3 rounds), in that order. Simplification always precedes attack; comments are stripped before the attacker reads them.
6. **Declared Stop.** Gate 3 ends the unattended run. The closeout vault pass touches Nathan's live vault and proceeds only on his per-item go. Present the census, the information-loss check, the skip list, the backup path, and the dry-run diffs; then wait.
7. **Closeout.** On his go: the vault pass as written. Then History, Context, Handoff, the neutral verifier's Delivery Claim, and the target-file report (baseline → finish, per file and total, comments and tests excluded, created and deleted files listed apart).

#### Judgment Standards

- **The plan is the spec; the code is the truth.** When a Becomes fence and the code disagree because the tree moved under the plan, the fence's intent wins and its detail is re-derived. When a Becomes fence is wrong on its own terms — it wouldn't typecheck, it double-defines something, it contradicts a Ruling — stop, write the Deviation in the plan with the reason, and take the shape that satisfies the Requirement. Never silently improvise.
- **A green gate is where verification starts.** Every Verify line is run and its output read. A grep with a zero and no non-zero control didn't run. `| tail` on a gate is a masked failure. Lint's warning count lives in its text, not its exit code.
- **A reviewer's finding is a claim.** Reproduce it against the code before folding it. A finding that's real but out of scope goes to Sequenced After; a finding that's wrong gets a one-line ruling saying why; a finding that's right gets fixed now, never deferred and never laundered into a "concern."
- **A concern is unfinished work.** DONE_WITH_CONCERNS is not a completion state. Fix it, or write the ruling that makes it not a concern, with Nathan named as the adjudicator if it's genuinely his call.
- **Layer discipline.** "The column is blank" and "the stamp isn't loading" look identical from the surface. Confirm which layer an issue lives on — the batch, the row, the resolver, the cell — before changing anything.
- **Nothing is too large to change** if the result is more cohesive. Nathan's standing rule: the app is his, and only the final result's cohesion, consistency, and complexity reduction are in scope. A cleaner shape that touches more files beats a narrower shape that leaves a seam.

#### Behavior — What Cohesion Means Here

- **One definition, one writer.** If you find a second source for anything this arc touches — a label, a stamp, a type table, a width — that's a defect to report and collapse, not a pattern to match. `STAMP_TYPE` is the one place an id becomes a stamp type; `RESERVED_LABEL` is the one place a reserved id gets a label; `idTime`/`idAt` are the one ulidx seam.
- **Delete before you add.** A special-case branch the carrier makes unnecessary is removed in the same commit the carrier lands, never left "for safety." The type gate enumerates callers for you — delete the declaration and read the errors.
- **Search before authoring.** Before writing any helper, predicate, or style, sweep the owning folder and its Features doc. What you need usually exists. A hand-rolled parallel to an existing mechanism is the most common avoidable defect in this codebase.
- **Comments carry a why or nothing.** At most one load-bearing why per change. Never restate a value, never narrate a step, never claim a state ("now handles…", "no longer…"). The plan's fences carry a few explanatory comments for you — do not transcribe them into shipped code.
- **No evidence of the journey.** When a first attempt is replaced, the replacement reads as if it were always intended. No commented-out code, no "previously", no residue of a correction.
- **Naming matches the codebase.** New files PascalCase; recipe-family parts kebab. Match the idiom of the file you're in over the idiom of the plan.
- **Tests are behavior, not ceremony.** A test asserts the contract in Becomes. It goes red without the change (watch it). Inverted tests replace the old assertion — they don't sit beside it.
- **Docs are rewritten, not amended.** A Made False row means the sentence is replaced with the true one. No "as of", no "previously", no supersede notes.
- **Formatting is Biome's.** Never hand-align. An Edit failing on whitespace means the hook reformatted — re-read and retry. Shell-driven edits get `npm run format` before the gate.
- **Labels and copy are Title-Case for actions**, sentence case for prose. The two stamp labels are ratified: "Creation Time", "Last Modified".

#### Coordination With the Parallel Session

- Never `git stash`, `git checkout .`, `git clean`, or `git reset`. Stage explicit paths; never `git add -A` or a directory.
- Commit each task the moment its gate is green. An uncommitted edit on this tree can be rolled back by the other session's revert.
- A surprise failure is attributed to the other session's dirty set first: `git status`, `git diff --stat`, read what's theirs before assuming it's yours.
- After every agent pass: `git worktree list` shows only the main tree.
- `src/main` and `src/preload` don't hot-reload. Tasks 1, 2, 5, 6, 8 touch main; restart the dev process before any live verification. Don't launch the GUI unless a verification needs a live instance, and kill what you launch.

#### Stop Policy

Stop and wait for Nathan when:

- Gate 3 is reached (the Declared Stop).
- A Becomes fence can't be honored without a design or interaction decision the plan doesn't settle.
- Any action would write to `~/NexusOS` outside the closeout pass.
- The parallel session's changes make a task's premise false in a way the Requirement doesn't resolve.
- An attack finding is real, in scope, and its fix would change a Ruling.

Everything else — a reviewer's simplification, a count correction, a citation re-derivation, a red-green adjustment — proceeds without asking and is recorded in Deviations or Rulings.

#### Reporting

Per task, one short block: what landed, the commit hash, every Verify line with its observed result, and any Deviation. Per gate: the gate output, the reviewer's findings with fixed/ruled beside each. At the Declared Stop: the closeout presentation. No narration of steps, no restating the plan, no line counts until the closeout report.
