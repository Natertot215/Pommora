## Live Tree & Index — Execution Brief

The gating prompt for the executing session. Paste it verbatim to start execution, and re-read it after every compaction. It defers to the plan on all content questions.

---

You are executing a ratified implementation plan in Project Pommora. Your sole authority is:

`.claude/Planning/Live-Tree-And-Index — Implementation Plan.md`

Read it in full before touching anything — every word, including the Implementation Log. The plan survived three adversarial review rounds; its wording is load-bearing. Do not re-derive, second-guess, or "improve" its decisions: the Rulings section lists what Nathan ratified, and the Inherited Reasoning and killed-candidates lists record what was already checked and found sound — re-litigating any of it is wasted work.

**After any context compaction: stop, re-read the plan and this brief from disk, and locate yourself in the Log's Progress tree before the next action. Never trust a summary's memory of a task over the plan file.**

#### Execution Gates — all hard

1. **Phases in order, tasks in order.** Record the phase's base commit in Progress when the phase opens.
2. **Re-derive before editing.** Every Derivation command re-runs against its control before its task starts. A diverged count rewrites the plan (and its dependent tasks) before any edit — it never gets quietly absorbed.
3. **Gates are `npm run typecheck` && `npm run test` && `npm run lint` from `Pommora/`, exit codes read directly — never through a pipe.** A task is not done until all three are green; lint includes Biome formatting.
4. **One tree-touching writer at a time.** No parallel implementer agents. Research may fan out; implementation never does.
5. **Divergence protocol:** if a task's real shape departs from its written one (signature, file, mechanism), search the plan for every later task assuming the old shape, rewrite them, and record it in Deviations — before the commit that caused it.
6. **The escape hatch is mandatory:** a task that is wrong as specified stops execution and reports. Never satisfy a criterion by weakening it. Reporting a task impossible is a success.
7. **Tick boxes in the same commit as the work.** Progress hashes fill in at the phase gate.
8. **Made False rewrites ride the falsifying commit** — the table names the task; the doc edit lands in that task's commit, not later.
9. **Phase-gate ritual, every phase:** dispatch `code-simplifier` and a correctness review against `<base>..HEAD` scoped to the phase's paths; verify every finding against the code yourself before folding; every concern is fixed or carries Nathan's explicit ruling in the Log. Manual/user-visible passes named by the gate happen against the running app (`env -u ELECTRON_RUN_AS_NODE npm run dev`).

#### Environment Facts

- `ELECTRON_RUN_AS_NODE` is set in this environment — the GUI only launches with it **unset**.
- A Nathan-authored hook auto-stages his doc edits; commit them along with your work. Never reset them out.
- Main-process and preload changes need a full dev-process restart; ⌘R covers renderer only; CM6 extensions need ⌘R, not HMR.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `KNOB` and `(Nathan's call)` markers survive every pass. Comments carry only uninferable whys.

#### The Zero-Residue Standard

Execution is not complete until ALL of the following hold — nothing pending, nothing deferred, no laundry unfolded:

- [ ] Every task ticked with its commit hash in Progress; every phase gate's boxes ticked.
- [ ] Every temporary instrument (walk counters, cascade logs, debug output) removed — grep-verified, not remembered.
- [ ] No TODO, placeholder, commented-out code, or trial-and-error residue introduced anywhere in the range.
- [ ] Dead Vocabulary sweep at 0 against its live control (`allCollectionFolders` gone; `readNexus` control nonzero).
- [ ] Every Made False row's rewrite verified landed in its named commit — including the ContextPM backlog entry, the ArchitecturePM sections, the SidebarPM/PommoraDND "confirming re-walk" phrasing, the viewMint comment, the schema.ts header, and FrameworkPM's queue.
- [ ] Feature docs (ArchitecturePM, ConnectionsPM, PropertiesPM) describe the shipped system in encyclopedic present tense — no history, no "now", no reference to this plan.
- [ ] `comment-killer-agent` and `code-simplifier` passes run over the full range; verified findings folded.
- [ ] The acceptance criterion executed end-to-end on the dev build and its observations logged — including the excluded-folder untouched check, the un-adopted-folder rewrite check, the nexus-rename-then-page-rename check, and the ⌘R stabilize-identity drift check.
- [ ] Delivery Claim written; neutral verifier (general-purpose) adjudicates it against the plan's Requirements; only after a clean yes, `build-breaking-agent` attacks the shipped range; its findings fixed or Nathan-ruled.
- [ ] HistoryPM entry written per `History-Format.md`; lessons routed to `.claude/Guidelines`; Closeout written in the Log.
- [ ] Line-count delta reported, code only (comments and tests excluded).
- [ ] The working tree is clean, gates green, and the ONLY open item anywhere is the property-cascade journal named in Sequenced After — next session's work, not this one's. If anything else remains open, execution is not done.

Begin by reading the plan, then open Phase 1.
