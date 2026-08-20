## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** fdc9f63a-48b6-48d3-a4fe-7196177e67bd
**Dates:** 08-19-2026
**Model:** Fable 5

**Two coordinated lines of work, and this document is the shared record for both.** Line one is the Cohesion pass's MarkdownPM leg, running in a parallel session; line two is Footnotes, whose brainstorm this session completed. Nathan set the order explicitly: the MarkdownPM cohesion work finishes first with nothing left behind, the easy-win definition duplications fold next (the Cohesion-Audit's §One Definition Per Thing, its first bullet — `parentOf` — included), the design-splits across Tables, Cards, and their kin park as a pending focus in the cohesion pass rather than being built, then Footnotes gets planned and built, and only then does the rest of the cohesion arc complete.

**This session produced the Footnotes decision log, from a blank slate.** The prior decision log had been deleted, so the brainstorm ran fresh off Nathan's spec message: three read-only explorers grounded the editor internals, the persistence/stats/settings plumbing, and the design tokens; parser behavior was verified by executing probes against the installed `micromark-extension-gfm` rather than recalled. The log then converged through several decision rounds and two adversarial review rounds — seventeen findings in round one, six in round two, every one resolved or explicitly accepted, the round-one High root being that the section boundary was defined twice in prose and never against the parser.

**The design that settled:** GFM reference footnotes — atomic, never-revealing markers displaying positional numbers; label-binding (case-folded, GitHub-identical) with gesture-owned numeric labels and user-owned word labels; a hidden-by-default citations section whose boundary is the parser-defined trailing run, guarded at the transaction layer; visibility as a Default Visibility setting plus a per-page `nexus.db` override written by both the divider and the Subfield footnotes toggle; three creation doors (Insert ▸, Paste As ▸, the typed auto-seed, all normalizing); copy-paste as the sharing mechanism; and a Pages & Editor ▸ Footnotes settings trio. Mid-review, Nathan renamed the entity: every footnote "definition" is a **Citation**, in docs, code identifiers, and UI labels — "Definition" is reserved for a future, independent feature.

**The log is fully tagged and converged, two `[assumed]` entries short of sign-off:** A-5b's two tail-guard repairs (Enter-on-empty-trailing-line exits the section; a plain ⌘V inside a citation lands as continuation lines) and C-3's clear-on-default (toggling a page to the value the default already gives clears the override row). Both were presented and await Nathan's word; everything else in the log carries his explicit confirmation.

**The parallel line stands mid-flight.** The cohesion pass's first two sessions are closed and recorded in the audit (the dusting; the main-process costs); the MarkdownPM leg was actively committing while this session ran (`9fd6da98`, `ab6ac262` among today's). Its plan and evidence live in [[MarkdownPM-Plan]] and [[MarkdownPM-Scoping]] — phase 7, the fold model's key widening, is the specific thing Footnotes blocks on.

#### Completion Criteria

- [ ] **The MarkdownPM cohesion leg is finished with nothing left behind** — every phase of [[MarkdownPM-Plan]] landed, including phase 7's fold-key widening, gates green, docs reconciled.
- [ ] **The easy-win definition duplications are folded** — Cohesion-Audit §One Definition Per Thing, `parentOf` (the first bullet) through the smaller twins, each collapse verified by the gates.
- [ ] **The design-splits are parked, not built** — the renderer-lifting and view-host arcs across Tables, Cards, and siblings recorded as a pending focus in the cohesion pass with nothing half-started.
- [ ] **Footnotes' two `[assumed]` entries carry Nathan's word** — A-5b's repairs and C-3's clear-on-default blessed or amended before the plan is written.
- [ ] **Footnotes is planned, ratified, built, and closed out** — the decision log handed to the planning skill, the plan approved by Nathan before any code, the build through `/closeout` clean.
- [ ] **The remaining cohesion arcs complete after Footnotes** — Table hoisting, the `main/index.ts` split, and the parked design-splits, per the audit.

#### Next Session

- **Finish the MarkdownPM cohesion leg first.** If the parallel session is still writing, do not open a second tree-touching writer — confirm its tree has settled before taking the leg over.
- **Fold the §One Definition Per Thing easy wins**, first bullet included, right behind it.
- **Park the design-splits** (Cohesion-Audit §Renderer Lifting and the view-host arc) as a pending focus — a recording task, not a build.
- **Then Footnotes:** get the two `[assumed]` entries blessed, hand the decision log to the planning skill, and check the reviewer's two live-layout unknowns during planning — whether the Subfield's hover rail admits a second control beside the collapse chevron, and whether disclosing the section flickers the toggle's at-bottom visibility condition.
- **Leftover from the retired web-layer session:** Nathan's own pass over its five changes (settings placement, typed zoom, hover scroll, a live tab flip, inline Edit Link) — unverified unless he's since done it.

#### Feedback

- "Finish the MarkdownPM part of the Cohesion pass, leave nothing behind -> then fold the easy-win definition duplications -> park the design-splits across the Tables, Cards Ect... as pending focus in the cohesion pass. Eliminate the first bullet of the cohesion pass alongside the remaining easy wins. Then build Footnotes. Then complete the rest."
- "review solidifies the mandate rather than the method" — reviews against a decision log attack cohesion and coverage, and leave implementation discovery to planning.
- "Definitions across docs and codebase need to be called Citations to make room for a future Definitions feature that may exist independently from Footnotes."

#### Session Pointers

- `.claude/Planning/Footnotes — Decision Log.md` — the brainstorm's sole artifact and the planner's contract: Frame (with the Citations vocabulary rule), Sources (the re-grounding list, parser probes included), every decision tagged, Core vs Prospects split. The two `[assumed]` entries are A-5b and inside C-3.
- `.claude/Planning/Cohesion-Audit.md` — the cohesion catalog: §One Definition Per Thing is the easy-win list; §Renderer Lifting and §Beyond a Session are what parks; §Open Calls need Nathan.
- [[MarkdownPM-Plan]] + [[MarkdownPM-Scoping]] — the in-flight leg's plan and evidence; phase 7 (fold-key widening) is Footnotes' prerequisite.
- `.claude/ContextPM.md` §Immediate Work — carries the same ordering this document details.

#### Working Notes

- **Footnotes' parse is already free** — the installed `micromark-extension-gfm` emits `footnoteReference`/`footnoteDefinition` today; the extensions are transitive, not direct deps. GFM's lazy continuation (an unindented next line joins the citation above) is the trap the whole boundary design answers — re-verify it before trusting any scan.
- **The footnote marker will be the editor's first mid-line atomic range** — every existing `atomicRanges` provider is line-prefix or block-scope; the callout guard's transaction-repair pattern is the delete-protection model.
- **A new `local_state` scope must join `COPY_SCOPES` in `main/remint.ts`** or a copied page silently loses the flag — `headingIcon` already sits in that hole.
- **`footnote` and `definition` are both banned identifier names for the feature** — the first collides with the typography scale step, the second is reserved by the vocabulary rule.
- **The cohesion session and this one shared the tree politely** — explicit-path staging only; the staged `ContextPM.md`/`Cohesion-Audit.md` in status are the parallel session's, riding Nathan's auto-stage hook into its commits.

#### Changes

**FILES ADDED**

- None.

**FILES MODIFIED**

- `.claude/Planning/Footnotes — Decision Log.md` — rewritten whole from this session's brainstorm (the prior log was deleted before the session opened).
- `.claude/HandoffPM.md` · `.claude/ContextPM.md` — this document and the Context sweep.
- *(Not this session's: `.claude/Planning/Cohesion-Audit.md`, `Pommora/src/renderer/src/MarkdownPM/Styles.css`, and ContextPM's staged edits belong to the parallel cohesion session.)*

**COMMITS**

- None by this session. The parallel cohesion line landed today's `f0c94fe0` · `8e5b2e7c` · `30c4fdc7` · `454180ba` · `9fd6da98` · `ab6ac262`.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
