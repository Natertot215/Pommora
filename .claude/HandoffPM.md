## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** d2aff109-72c2-4191-89cd-dc2721762020
**Dates:** 08-10-2026
**Model:** Fable 5 (1M context)

**Creation affordances — planned, awaiting the go.** The brainstorm converged through two adversarial rounds into a zero-open decision log, and the plan is written at `Planning/Creation Affordances — Plan.md` — five phases: the creation engine (seeds + order in one `createPage` write, the create-origin rename that disambiguates and skips the cascade), the table surfaces (band-add, grip menu, Above/Below), sidebar + the uniform empty field + the label renames, the hover-dwell ghost row with `--state-inactive` minted, and the docs/purge/closeout phase. The model is deliberately simple: no draft state of any kind — the page exists on click, the pipeline owns placement through seeds and creation-time order writes, and the rename field is an ordinary uncommitted edit that opens empty.

The pipeline Nathan set: plan → simplify (done) → review (build-breaker attacking the plan) → his explicit go → **unattended overnight execution that stops only when fully done**. Review findings get verified firsthand before folding — both earlier rounds proved agents wrong about lines they cited.

#### Completion Criteria

- [ ] The plan survives its breaker review (findings folded or rejected with reasons), and Nathan ratifies it with an explicit go.
- [ ] Every phase lands: implement → code-simplifier on the phase diff → typecheck/lint/test green by summary line → CDP verification where the phase names it → explicit-path commit.
- [ ] Every decision-log entry is implemented, or its deviation is recorded in the plan's Log and surfaced in the report.
- [ ] The blast radius is fully reconciled — Feature docs trued, atlas green, PM-096 written (noting the dropped "in" per Nathan), ContextPM's resolved lines removed.
- [ ] The purge is clean, the final build-breaker's findings are fixed (DONE_WITH_CONCERNS means fix), and the gates are green after the fixes.
- [ ] Nathan's full in-chat report is delivered: What Changed · Along the Way · Immediate Work · Final LOC (code-only) · verification evidence.
- [ ] The only pending item anywhere is Nathan's live confirmation — nothing else survives as "later."

#### Next Session

- If execution hasn't started: fold the plan-review findings, present for the go.
- If execution ran: verify its report against the tree firsthand (never consolidate the run's claims blindly), then walk Nathan through live confirmation.

#### Feedback

- "You didnt actually ask me the other questions you said you did." — narrated questions aren't asked questions; put them to Nathan explicitly.
- "You've likely over-complicated it, applied guards, and all things based on an unaligned idea of what 'ghost' meant." — when Nathan's framing sounds like a state machine, ask what the word means before modeling; reframe the artifact around what he's actually asking rather than patching it.
- "This plan must take care of absolutely everything and only leave live confirmation as pending... we do the laundry, pick up socks that may be dropped, AND make sure the dryer is cleaned of any lint or trace that anything ever happened." — the run's completion standard, verbatim intent: zero residue, zero deferred scraps.

#### Session Pointers

- `Planning/Creation Affordances — Plan.md` — the execution artifact: phases, standards, the overnight protocol, and the final-report template.
- `Planning/Creation Affordances — Decision Log.md` — the ratified spec the plan cites entry-by-entry; its Sources section is the grounded file:line map.
- The retired documentation-normalization session archives whole at `Sessions/Session - 08-09 > 08-10.md`.

#### Working Notes

- The transcribe script's `meta["cwd"]` takes the last raw-file-order entry's cwd rather than the canonical path's, and `ListAgents` has no action-vocabulary line — two known gaps its agents worked around by hand.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Context's § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs to know, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.

---

### Session Transcript

`````

*The session's prior arcs (PM-090 through PM-095 and the documentation normalization) are archived at `.claude/Sessions/Session - 08-09 > 08-10.md`. The transcript below opens on the creation-affordances arc.*

`````
