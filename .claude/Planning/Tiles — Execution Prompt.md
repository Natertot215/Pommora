## Tiles — Execution Prompt

Paste after `/compact` or into a fresh session once the Menu Recipe has landed on `main`.

---

Execute `.claude/Planning/Tiles.md` — the Tiles implementation plan, reviewed and approved by Nathan. Its spec is `.claude/Planning/Tiles — Decision Log.md`; read both whole before touching anything, then `ContextPM.md`, `Guidelines/Editor-Internals.md`, `Guidelines/Cohesion-Rulings.md`, and `Guidelines/Lint-And-Accessibility.md`.

Preconditions, verified before Phase 1 opens: `git log --oneline -5` shows the Menu Recipe's closing commit — that hash is Phase 1's base and goes in the Log's Progress tree first, and the plan's Status header flips to `ratified — in execution` in that same first commit. `git status` is clean. `npm run typecheck`, `npm run lint`, `npx vitest run` are green from `Pommora/`; write the test count into the Baseline invariant. The D-6 ruling (Task 12) is in the Log's Rulings — if it isn't, ask Nathan before Phase 2 opens, and take the declined branch the plan writes if he says no.

Discipline, per task: re-derive every command-backed count before editing and rewrite the plan if a number moved; `git mv` for moves; explicit-path `sed` only (never a bare `Components/` substitution — `DesignSystem/Components/` shares the word); stage explicit paths, never a directory; gates with exit codes read directly, never through a pipe; one commit per task, the task's boxes ticked in the same commit; no `Tiles/index.ts`; no `block` → `tile` rename; nothing in `Links/` beyond one import; KNOB and `(Nathan's call)` comments travel verbatim. If a task is wrong as specified, stop and say so — never edit a gate to pass it.

Per phase, at its gate: dispatch `code-simplifier` then `comment-killer-agent` against `<base>..HEAD` scoped to the phase's paths, then `feature-dev:code-reviewer` on the same range; verify every finding against the code yourself before folding; fix every concern or get Nathan's ruling into the Log; run the phase's running-app pass (the plan names each); fill Progress hashes; re-assess later tasks against what landed and rewrite them before moving on. Phase 1's gate is behavior-zero except the grey-cell outline Task 4 changes on purpose.

Closeout (Task 15) is the `/closeout` discipline over the whole range: write the Delivery Claim; dispatch a neutral `general-purpose` verifier with the claim, the spec, the plan, and the range — "is this true?"; only after a clean yes, dispatch `build-breaking-agent` against the landed code; then the Acceptance paragraph performed literally against the running app; the Dead Vocabulary sweep against its control; History PM-117 with the LOC diff; ContextPM, RendererRefactor, RendererAtlas rows closed; lessons routed to `Guidelines/`. Report the final LOC reading against 2699 and the ± code diff.

Nathan is not watching in real time. Proceed on the plan's own authority; stop only for a destructive action the plan doesn't name, the D-6 ruling if missing, or a task that is wrong as written.
