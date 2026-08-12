## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** b45012c4-669d-4a39-a8de-49177ae474c5
**Dates:** 08-12-2026
**Model:** Opus 5 (1M context)

**Alias-V1 — specified, planned, twice adversarially reviewed, and awaiting Nathan's go. No implementation code has been written.** The arc gives a connection's visible words to its author: `[[Title|Alias]]` renders as its alias while still resolving on title, two menu actions author and edit that alias, a page remembers the aliases it has worn so they can be offered back and forgotten, and `[Title](Page)` resolves internally beside `[[ ]]`. The ratified spec is `Planning/Alias-V1 — Decision Log.md`; the executable plan is `Planning/Alias-V1 — Plan.md` at 14 tasks across 5 phases.

**The session's defining move was a scope reversal.** Duplicate-title disambiguation entered as an answer to a good question — a path in a link breaking the tie — grew through two review rounds into path qualification, a path-keyed tiebreak, a move-cascade gate, a prefix-preserving rewrite, a main-side title index, and a crash journal, and was then cut whole by Nathan on the grounds that the arc is about aliases. That single ruling killed five of the first review round's seven High findings by deleting their subject matter, and took the 1024 bracket cap and the journal hardening with it, since both existed only to absorb risks path qualification created. The design survives intact in §G of the decision log, explicitly Sequenced After, and the rename cascade's known non-atomicity returns to being a pre-existing issue this arc neither worsens nor fixes.

**Two adversarial rounds and two DRY sweeps materially changed what gets built.** Round one caught that the alias display would have resolved by *alias* rather than title in the live editor while the cross-site test passed — `visibleInlineTokens` rebuilds every token field-by-field, so a new optional field vanishes silently. Round two caught that `useConnectionAutocomplete`'s `commit()` — which appeared in no task's Files — destroys an alias regardless of the strip toggle, making the whole setting unobservable, and that the `contentRange` census was five consumers rather than the three claimed. Both sweeps found the project already owned what the plan proposed to write: `titleFromPath`, `normalizeSeg`, the `{load, save}` per-page seam, `ChipRemoveButton`, `codeMask`, `focusAt`, and `treeIndex`'s projection rule. Three of the plan's own derivation counts were fabricated from memory and are now measured.

**Two late investigations reshaped the grammar work.** Nathan questioned whether brackets in titles are genuinely a problem; testing against the real tokenizer proved they are not — brackets are legal, unbanned, and work in every position except a title *ending* in `]` in the bare `[[Title]]` form, which both of this arc's new syntaxes resolve. It also proved the fix the reviewer proposed and this session nearly wrote — escaping as `\]` — **does not work**, because `markdownLinkRegex` has no escape provision while its sibling `MD_LINK` does. That two-patterns disagreement is now a task of its own.

#### Completion Criteria

- [ ] The plan is ratified by Nathan's explicit go, and its Status header is rewritten to "ratified — in execution" in Phase 1's base commit.
- [ ] Every phase lands its tasks in order: implement → `code-simplifier` on the phase diff → typecheck / lint / test green read by summary line, never through a pipe → the phase gate's running-thing pass → explicit-path commit.
- [ ] The hazard window opened by Task 2 is closed by Task 4 before any interactive verification of connections is trusted.
- [ ] Every numbered requirement traces to a landed task, and every task's Why traces to the Goal.
- [ ] Every derivation is re-run against its control before its task edits anything; a divergent count rewrites the plan rather than being quietly corrected.
- [ ] Every guard ships both halves of its negative control — the guarded path provably ran, and the test goes red with the guard disabled.
- [ ] The end-to-end acceptance criterion holds, observed against the running app rather than inferred from green tasks.
- [ ] Every row of the Made False table is rewritten in the commit that falsifies it, the Dead Vocabulary sweep returns zero against its control of 14, and the atlas checker is green.
- [ ] The Delivery Claim is checked by a neutral verifier against the *decision log*, not the plan alone; only then does the attack pass run, and its findings are fixed rather than filed.
- [ ] Nothing is left pending but Nathan's own visual and feel passes.

#### Next Session

- **Nathan's go, then Phase 1.** Nothing else is blocking; every open decision in the log is closed.
- The one policy left unstated inside the plan rather than before it: whether an escaped-label markdown link renders its backslashes visibly (accepted) or hides them as marker ranges (deferred).
- After the arc: the `{{ }}` open question — whether claiming it as syntax costs titles the right to contain it, the way `|` was lost to the alias delimiter.

#### Feedback

- "The plan should use explore agents to ground it so that it's grounded in what already exists — remember DRY principles; and pommora has existed for a while so there's likely existing things to use, double-check EVERY added logic or code against what may already exist, you'd be surprised at what you might find." — vindicated immediately and repeatedly; the sweeps found six existing mechanisms the plan was about to duplicate.
- "my call is to rewrite the plan WITHOUT the path-affordance. Today, connections dont do any of this. The plan is about alias' not duplicate titles." — the scope instinct was right where mine had drifted; a feature that arrives as an answer to a good question is still a separate feature.
- "Please look into this -- im unsure and need investigation." — his uncertainty was better grounded than the reviewer's confidence; the investigation invalidated a fix about to be written on the reviewer's word.
- "tldr" / "explain it simply" — asked twice in one session. Reports were running long enough to stop being read.

#### Session Pointers

- `Planning/Alias-V1 — Plan.md` — the executable plan. Read its Forced By block first; it holds every mechanism fact the tasks depend on.
- `Planning/Alias-V1 — Decision Log.md` — the ratified spec. §G is cut scope preserved as design, under a banner saying so; a `[confirmed]` tag inside it records a settled design, never settled scope.
- The two DRY sweep results are folded into the plan's task steps by citation rather than kept as separate reports.
- `Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts` — holds both the pattern to mirror (the `link` block) and the projection that silently drops new token fields.
- The scratchpad probes that settled the bracket questions bundle the real tokenizer through esbuild; the same harness re-runs any grammar claim in about ten seconds.

#### Working Notes

- **The plan is not a patch target.** Both review rounds found that its failures were compositional — features correct alone colliding where they met — so a finding folded as a one-line edit is usually a finding half-folded.
- **A green test proved nothing twice this session.** The cross-site agreement test would have passed with the editor broken; the alias-survives-Return test would have passed with the toggle dead. Both times the missing coverage was a *writer* nobody censused, not a reader.
- **`markdownLinkRegex` and `MD_LINK` describe one syntax and disagree about escapes.** Until Task 12c lands, any claim about what a markdown link tokenizes to must name which pattern it means.
- **`invalidName` is a filesystem-basename rule enforced in main at CRUD time.** It has nothing to say about a keystroke, so "refuse this character" in the editor means `inputHandler` or a `transactionFilter` — and paste routes through neither.
- **A caret can be placed inside a hidden marker region**; `hideMarker` is never registered atomic, and atomic ranges don't block a programmatic dispatch anyway. Set `assoc` explicitly or the drawn caret fails to render.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs to know, remove what it doesn't.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.
- If additional guidelines appear here that aren't in the handoffs template, it means they've been user-added and should be preserved.

---

### Session Transcript

`````

*The Cards creation-affordance arc (PM-096, PM-097) is archived in `.claude/Sessions/`. This transcript opens on the Alias-V1 arc.*

`````
