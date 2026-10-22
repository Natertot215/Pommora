## Properties Restructure — Morning Report

**DATE:** 10-22-2026
**STATUS:** The plan is complete and awaits ratification.

### Where It Stands

*Properties Restructure — Implementation Plan* holds 21 phases and 140 tasks. Every code change in it applies mechanically: `plan-replay` applies 2,400 changes with no mismatches, and skips 7 that land only if a speed measurement fails. Execution runs lean. One agent per phase applies each task with the tool, finishes what the tool can't, and proves the phase with the type check, tests, lint, and the click-through drive. Two reviewers each read Phases 6, 8, 11B, 12, 16B, and 17; a neutral check runs after Phase 12 and at the end; one final review covers everything.

### The Numbers

- **About −834 production lines** if every speed measurement passes. If F3 fails, the figure is about −767; if all three fail, about −711. The count is the execution measure's own, taken on formatted code.
- **Below zero after every phase.** The closest point is about −81, after Phase 12, and only if F3 fails.
- **Seven phases add lines:**
  - P4B (+11), P6 (+18), P10 (+11), P11A (+92), P11B (+94), and P12 (+105) each land a ruling or a repair that no existing code performs.
  - P15 adds +7, and only if its speed check fails.

  Each phase's reason is in *Planning Findings › §The Ledger*.

### What the Checks Found

- **Wave one's two reviewers:** 114 findings. 103 were applied, 5 were rejected with reasons, 5 became Last Calls, and 1 was replaced by a different fix. The data-layer reviewer judged the direction right and the plan as first written not clearly better, and the fold answers that. The interface reviewer judged that the folded work leaves the codebase better.
- **Replaying the plan in order** showed later phases written against today's code, not the code earlier phases leave behind. Two correction passes fixed every such step. Along the way they found 48 defects that would have broken a phase, such as a removed import still in use, a function's body left behind, or a duplicate declaration.
- **The dry run** applied the whole plan in a throwaway copy and type-checked every phase end. Phase 1 compiles clean. From Phase 2 on, each phase end shows new errors: about 120 in app code and more in tests.
  - Most come from steps the plan states in words, like rewriting a test.
  - Some are mistakes in the plan's code, such as an import left out.

  Under *Lean Execution*, execution fixes these in the real code, where each phase's gates prove the fix. The plan's text isn't patched first. The plan's rule that every phase leaves a working state is therefore true at execution, not yet on paper.

### Your Calls

1. **Ratify or redirect** *Decisions & Intention* and the plan.
2. **Last Calls LC-1 to LC-64** (*Planning Findings › §Last Calls*): each is a behavior reading with a recommendation. Ruling them is what lets the phases that depend on them run as written.
3. **Nathan's Calls NC-1 to NC-3:** the same document, *§Nathan's Calls*.
4. **"Date" or "Date & Time":** the plan names the type "Date", while Pommora's CLAUDE.md says "Date & Time". Say which name stands.
5. **The Issues renumbering:** when Phase 18 closes three entries, the index script renumbers the rest, so I-076 and I-077 become I-073 and I-074.
6. **The Open Items** (*Implementation Plan › §Open Items*).

### The Walkthrough

*Properties Restructure — Walkthrough* gives what each phase does, and what the work changes against what's true now, in plain English.
