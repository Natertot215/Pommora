## Handoff — Pommora

> **User Prompt:** *"come up with core focuses and themes that also consider the design coherence report … a complete fresh audit of everything under render … a multi-agent protocol … a legible document that gives nathan the full picture, and CLEAR framework for what the most simple and effective outcome of any work following would be"* — then: *"go — but this must replace the existing doc + remove the relevant cleanup bundles so info is clearly visible in its true source. Super in-depth, multi part doc"*, *"design calls are absolutely essential and feedback has no bounds"*, and *"it's your job to make sense of all of this into an executive summary, and also lightly rewrite the doc once all lenses are in."*

#### Current Focus

**Session ID:** 14cb88d4-ef66-4a6d-a7c7-18bd37efbbaa
**Dates:** 08-25-2026 → 08-26
**Model:** Opus 5 (1M context) → Fable 5

**The Renderer Atlas.** The session's first half was the settings pair and the reorganization recorded in History; the second half produced the one document the Refactoring arc runs on. Three audit reports already agreed the renderer was healthy and misfiled, and none of them drew the target or wrote the test. The atlas does both: seven read-only lenses keyed on the file path — Cartographer, Boundary, Stylist, Semantic, Recipe, Lexicographer, Archivist — joined into a map as it is, eight grep-testable rules, a target tree with every one of 453 files placed under a rule, 219 token verdicts, twenty-six decisions with recommendations, and the ruling roster that lets a future sweep read instead of re-derive. Every claim that places a file or sets a verdict was opened at its cited line; the corrections log records what was withdrawn.

**What the atlas replaced.** The Design Coherence Report is deleted; its §VIII decisions, §IX standing calls, §X corrections and process notes, and §XI slices all live in the atlas's Parts V, VI, and VII as current truth. The Codebase-Cleanup Checklist lost Bundles 6a and 6b and its Design Arm section — the organizational work — and keeps 6c (the view host, now Bundle 6) as behavioral. ContextPM's Refactoring arc is two bullets pointing at the atlas, and the Immediate Work item became "rule on §V." Cohesion-Rulings gained a design-layer section holding the two process notes and a pointer at the atlas's roster. Six stale code citations across four documents were repointed to `Properties/`.

**Where it stands.** The atlas is written, ~800 lines, uncommitted alongside the retirements. It is a Planning document and deliberately so — the tree it draws will be wrong in detail at three times the code; the rules will not be. Its Part V is the gate: the structural decisions D-A through D-I block the ledger's non-mechanical rows, and nothing else in the arc can be sequenced until they are stamped. The one behavioral finding in the whole exercise — `Blocks/ViewEmbedBlock.tsx:88` drops `cellPaint().outline`, so a grey-celled view embed draws an invisible stroke — is a one-identifier fix and is not made here.

#### Completion Criteria

- [x] **Every file accounted for** — 453 rows in the ledger, zero unmatched; 228 move, 225 stay.
- [x] **Every rule testable** — each of the eight carries the grep that checks it.
- [x] **Every load-bearing claim opened at its line** before entering the document; withdrawals in §VII.
- [x] **The rulings survive** — the Design Report's settled calls and the Cohesion rulings are rostered in §VI as current truth, no tombstones.
- [x] **The superseded sources are gone or repointed** — the Design Report deleted, 6a/6b/Design Arm removed, ContextPM and Cohesion-Rulings pointing at the atlas, stale citations fixed.
- [ ] **The Space dropdown is eyeballed** — carried from 08-25: icon, editable title, lock footer, the two pickers, with the trio's Settings button blank behind it. The one visible behavior change of the committed reorganization, unconfirmed.
- [ ] **The atlas is committed.**
- [ ] **Part V is ruled** — D-A through D-I first; the token verdicts marked `call` in IV.4 after.

#### Next Session

1. **Read the atlas's Executive Summary and Part V, then rule.** Twenty-six decisions, each with a recommendation. The structural nine (D-A to D-I) gate the ledger; the rest can be taken in any order.
2. **Fix the one bug** — `Blocks/ViewEmbedBlock.tsx:88` → `cellRing(key)`. One line; it does not wait for a ruling.
3. **The lint rule (D-B)** can land before the reaches close: `noRestrictedImports` from `DesignSystem/**` with an allowlist of the three files.
4. **Eyeball the Space dropdown** — still owed from 08-25.
5. **Inline Page Properties** runs parallel and shares no files with any of this.

#### Feedback

- "design calls are absolutely essential and feedback has no bounds — all of your CLAUDE.md's should make that clear." Every lens was briefed to state its taste rather than abstain; Part IV's verdicts carry a column saying which rows are calls, and Part V recommends on every decision.
- "it must replace the existing doc + remove the relevant cleanup bundles so info is clearly visible in its true source." The Design Report is deleted rather than pointed at; the checklist keeps only its behavioral bundles.
- "process-irrelevant, the 'clean kitchen' goals or final structure is the priority; and should also be inherently scalable." Part III is the tree and the ledger with no sequencing; Part II's rules are what file the next 900 files.

#### Session Pointers

- `.claude/Planning/RendererAtlas.md` — the document. Executive Summary first; Part III.1 for the tree; Part V for what needs a ruling; Part IV.4's ranked list for the first token edits.
- The seven lenses' tables — `cartographer.csv`, `boundary.csv`, `stylist-*.csv`, `semantic-*.csv`, `recipe-verdicts.csv`, `lexicographer-*.csv`, `archivist-*.csv` — and `ledger.py`, which generated the file-placement ledger from the Cartographer's graph, sit in this session's scratchpad under `atlas/`. They are working files, not part of the repo.
- `.claude/Planning/Codebase-Cleanup-Checklist.md` — Bundles 4, 5, 6 (the view host), 7, 8 remain; the header and ordering constraints point at the atlas.
- `Pommora/src/renderer/src/DesignSystem/Tokens/theme-vars.css.ts` — the three seam shorthands (`--border-heading`/`-cell`/`-segment`) the first mint publishes widths beside.

#### Working Notes

- A per-lens split joins on filename; a per-folder split produces reports that agree and do not compose. The join is what lets one sentence say "a piece that reaches the store and declares three vars outside Tokens under a lowercase name."
- A relocation script must resolve specifiers against the pre-move layout and rewrite only the ones that point at something that moved; re-deriving every relative import normalizes correct ones into `../x/index`.
- Semantic and Recipe are different jobs: one judges a read against the token's purpose, the other judges the token against its readers. A token with thirty wrong reads is a recipe defect, not thirty consumer defects.
- Recipe overruled three earlier findings by reading the line rather than the count — a comment naming the element, a value that was 40% not 15%, a literal that was owned but not centralized. Counts propose; lines decide.
- The `--safe-*` vars have two lenses saying keep and one ruling row saying delete; the atlas rules keep and records it in VI.1 so the fourth re-derivation does not happen.

**FILES ADDED**

- `.claude/Planning/RendererAtlas.md`

**FILES MODIFIED**

- `.claude/ContextPM.md` — the Refactoring arc points at the atlas; Immediate Work is "rule on §V"
- `.claude/Planning/Codebase-Cleanup-Checklist.md` — Bundles 6a and 6b and the Design Arm removed; header, ordering constraints, and the closing paragraph repointed; 6c renumbered 6
- `.claude/Guidelines/Cohesion-Rulings.md` — a design-layer section; two citations repointed to `Properties/`
- `.claude/Planning/Inline Page Properties — Decision Log.md` · `.claude/Planning/Documentation Audit — Report and Plan.md` — citations repointed to `Properties/`
- `.claude/HandoffPM.md`

**FILES REMOVED**

- `.claude/Planning/Design-Coherence-Report.md` — retired into the atlas

**COMMITS**

- `3f926099` — feat(settings): Interface Scale takes a row of its own
- `991f4199` — feat(picker): a typed value keeps the unit it is read in
- `c0fe1a4c` — docs(planning): the inline page properties decision log replaces three settled plans
- `e815fb06` — chore(ledger): line counts through the Interface Scale picker
- `ddc0ee9e` — refactor(renderer): the property surface, two elements, and the gallery find their own folders
- `cd36b8e6` — docs: the handoff for the settings pair, and Context turns toward The Refactoring

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run rather than accumulating passes.
- A handled item leaves for Context, History, or the Feature docs — no tombstone.
- Nathan's own guidelines in this document are preserved.
